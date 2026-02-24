import { Component, Inject, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PlayerService } from 'src/app/core/services/player/player.service';
import { TrainingService } from 'src/app/core/services/training/training.service';
import { LoginService } from 'src/app/core/services/login/login.service';
import { environment } from 'src/environments/environment';
import { Chart, registerables } from 'chart.js/auto';
import { PagocuotasPlayerResponse } from 'src/app/core/services/player/player.model';

Chart.register(...registerables);

export interface PlayerInfoDialogData {
  player: any;
  teamId: number;
  initialTab?: string;
}

@Component({
  selector: 'app-player-info-dialog',
  templateUrl: './player-info-dialog.component.html',
  styleUrls: ['./player-info-dialog.component.scss']
})
export class PlayerInfoDialogComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('radarCanvas', { static: false }) radarCanvas!: ElementRef<HTMLCanvasElement>;

  selectedPlayer: any;
  teamId = 0;
  infoModalActiveTab = 'personal';
  imageBaseUrlUser = environment.images + 'user/';
  edadSeleccionada = '';
  partidosJugados = 0;
  minutosJugados = 0;
  goles = 0;
  tarjetasAmarillas = 0;
  tarjetasRojas = 0;
  numTitulares = 0;
  listAsistencia: any[] = [];
  pagosCuotasData: PagocuotasPlayerResponse | null = null;
  pagosCuotasLoading = false;
  pagosCuotasError = false;
  usuarioActual: any = null;
  consentRequestLoading = false;
  consentRequestSent = false;
  radarChart: Chart | null = null;
  partidos: any[] = [];
  partidos2: any[] = [];
  currentIndex = 0;
  currentIndex2 = 0;
  iconos: { [key: string]: string } = { 'V': '🟢', 'E': '🟡', 'D': '🔴' };

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: PlayerInfoDialogData,
    private dialogRef: MatDialogRef<PlayerInfoDialogComponent>,
    private playerService: PlayerService,
    private trainingService: TrainingService,
    private loginService: LoginService,
    private cdr: ChangeDetectorRef
  ) {
    this.selectedPlayer = data.player;
    this.teamId = data.teamId;
    this.infoModalActiveTab = data.initialTab || 'personal';
  }

  ngOnInit(): void {
    this.loginService.usuarioActual.subscribe(u => this.usuarioActual = u);
    this.edadSeleccionada = this.fechaEnEspañol(this.selectedPlayer?.fechaDeNacimiento || '') + ' (' + this.calcularEdad(this.selectedPlayer?.fechaDeNacimiento || '') + ')';
    this.getInfoAsistencia();
    this.getDatosPlayer();
    if (this.infoModalActiveTab === 'financiera') {
      this.loadPagosCuotasIfNeeded();
    }
    // Cargar datos completos del jugador (desde new-cuotas solo llega objeto reducido).
    // Usamos el mismo endpoint que la pantalla de jugadores (playerlistbyteam) para tener la misma estructura.
    if (this.selectedPlayer?.playerId && this.teamId) {
      this.playerService.getPlayers(String(this.teamId)).subscribe(
        (response) => {
          if (response?.data) {
            const data = response.data as { players?: any[]; [k: string]: any };
            let list = data.players;
            if (!Array.isArray(list) && Array.isArray(data)) list = data;
            const full = Array.isArray(list) ? list.find((p: any) => p.playerId === this.selectedPlayer.playerId) : null;
            if (full) {
              this.selectedPlayer = { ...this.selectedPlayer, ...full };
              this.edadSeleccionada = this.fechaEnEspañol(this.selectedPlayer?.fechaDeNacimiento || '') + ' (' + this.calcularEdad(this.selectedPlayer?.fechaDeNacimiento || '') + ')';
              this.cdr.detectChanges();
              setTimeout(() => this.cargarGraficoRadar(), 100);
            }
          }
        },
        () => {}
      );
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.cargarGraficoRadar(), 150);
  }

  ngOnDestroy(): void {
    if (this.radarChart) this.radarChart.destroy();
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  setInfoModalTab(tab: string): void {
    this.infoModalActiveTab = tab;
    if (tab === 'financiera') this.loadPagosCuotasIfNeeded();
  }

  fechaEnEspañol(fecha: string): string {
    if (!fecha) return '—';
    const partes = fecha.split('-');
    const d = new Date(parseInt(partes[0], 10), parseInt(partes[1], 10) - 1, parseInt(partes[2], 10));
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  calcularEdad(fechaNacimientoString: string): number {
    if (!fechaNacimientoString) return 0;
    const fechaNacimiento = new Date(fechaNacimientoString);
    const hoy = new Date();
    let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
    const mes = hoy.getMonth() - fechaNacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNacimiento.getDate())) edad--;
    return edad;
  }

  getInfoAsistencia(): void {
    if (!this.teamId || !this.selectedPlayer?.playerId) return;
    this.trainingService.getListsAsistenciaByTeamYPlayer(this.teamId, this.selectedPlayer.playerId).subscribe(
      (response) => {
        if (response?.data) this.listAsistencia = response.data;
      },
      () => {}
    );
  }

  getDatosPlayer(): void {
    if (!this.teamId || !this.selectedPlayer?.playerId) return;
    this.playerService.getDatosPlayer(this.teamId, this.selectedPlayer.playerId).subscribe(
      (response) => {
        if (response?.data) {
          this.partidosJugados = response.data.partidosJugados ?? 0;
          this.minutosJugados = response.data.minutosJugados ?? 0;
          this.goles = response.data.goles ?? 0;
          this.tarjetasAmarillas = response.data.tarAmarillas ?? 0;
          this.tarjetasRojas = response.data.tarRojas ?? 0;
          this.numTitulares = response.data.numTitulares ?? 0;
        }
        setTimeout(() => this.cargarGraficoRadar(), 80);
      },
      () => {}
    );
  }

  loadPagosCuotasIfNeeded(): void {
    if (this.pagosCuotasLoading || this.pagosCuotasData !== null) return;
    const playerId = this.selectedPlayer?.playerId;
    if (!playerId || !this.teamId) return;
    this.pagosCuotasLoading = true;
    this.pagosCuotasError = false;
    this.playerService.getPagocuotasPlayer(this.teamId, playerId).subscribe({
      next: (res) => {
        this.pagosCuotasData = res?.data ?? null;
        this.pagosCuotasLoading = false;
      },
      error: () => {
        this.pagosCuotasError = true;
        this.pagosCuotasLoading = false;
      }
    });
  }

  formatearPlazo(plazo: string): string {
    if (!plazo) return '—';
    const d = new Date(plazo);
    return isNaN(d.getTime()) ? plazo : d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  get progresoFinancieroPorcentaje(): number {
    const d = this.pagosCuotasData;
    if (!d) return 0;
    const pagado = parseFloat(d.totalPagado || '0') || 0;
    const pendiente = parseFloat(d.pendiente || '0') || 0;
    const total = pagado + pendiente;
    return total > 0 ? Math.round((pagado / total) * 100) : 0;
  }

  cargarGraficoRadar(): void {
    if (!this.radarCanvas?.nativeElement || !this.selectedPlayer) return;
    if (this.radarChart) this.radarChart.destroy();
    const ctx = this.radarCanvas.nativeElement.getContext('2d');
    if (!ctx) return;
    let labels = ['Habilidad con balon', 'Pase', 'Tiro', 'Defensa', 'Físico', 'Mentalidad'];
    let data = [
      parseInt(this.selectedPlayer.habilidadConBalon, 10) || 0,
      parseInt(this.selectedPlayer.pase, 10) || 0,
      parseInt(this.selectedPlayer.tiro, 10) || 0,
      parseInt(this.selectedPlayer.defensa, 10) || 0,
      parseInt(this.selectedPlayer.fisico, 10) || 0,
      parseInt(this.selectedPlayer.mentalidad, 10) || 0
    ];
    if (this.selectedPlayer.posicion === 'Portero') {
      labels = [...labels, 'Portero'];
      data = [...data, parseInt(this.selectedPlayer.portero, 10) || 0];
    }
    this.radarChart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels,
        datasets: [{
          label: '',
          data,
          backgroundColor: 'rgba(49, 178, 112, 0.25)',
          borderColor: 'rgb(0, 80, 40)',
          borderWidth: 2,
          pointBackgroundColor: 'rgb(0, 80, 40)',
          pointBorderColor: '#fff',
          pointBorderWidth: 1,
          pointRadius: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { title: { display: false }, legend: { display: false } },
        scales: {
          r: {
            min: 0,
            max: 100,
            angleLines: { display: true, color: 'rgba(0, 44, 64, 0.15)' },
            grid: { color: 'rgba(0, 44, 64, 0.12)' },
            pointLabels: { font: { size: 12 }, color: 'rgba(0, 44, 64, 0.9)' },
            ticks: { display: true, stepSize: 25 }
          }
        }
      }
    });
  }

  solicitarConsentimientoIA(): void {
    if (this.consentRequestLoading || this.consentRequestSent) return;
    this.consentRequestLoading = true;
    this.playerService.solicitarConsentimientoIA(this.selectedPlayer.playerId).subscribe({
      next: () => {
        this.consentRequestLoading = false;
        this.consentRequestSent = true;
      },
      error: () => {
        this.consentRequestLoading = false;
      }
    });
  }

  getVisibleItems(): any[] {
    return this.partidos.slice(this.currentIndex, this.currentIndex + 4);
  }
  getVisibleItems2(): any[] {
    return this.partidos2.slice(this.currentIndex2, this.currentIndex2 + 4);
  }
  prev(): void { if (this.currentIndex - 4 >= 0) this.currentIndex -= 4; }
  next(): void { this.currentIndex = Math.min(this.currentIndex + 4, Math.max(0, this.partidos.length - 4)); }
  prev2(): void { if (this.currentIndex2 - 4 >= 0) this.currentIndex2 -= 4; }
  next2(): void { this.currentIndex2 = Math.min(this.currentIndex2 + 4, Math.max(0, this.partidos2.length - 4)); }
}
