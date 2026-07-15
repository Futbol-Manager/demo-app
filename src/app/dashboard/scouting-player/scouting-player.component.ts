import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { Subscription } from 'rxjs';
import { ScoutingPlayer } from 'src/app/core/services/player/player.model';
import { PlayerService } from 'src/app/core/services/player/player.service';
import { TrainingService } from 'src/app/core/services/training/training.service';
import { Response } from 'src/app/core/services/models/response.model';
import { LoginService } from 'src/app/core/services/login/login.service';
import { TutorialService } from 'src/app/core/services/tutorial/tutorial.service';
import { environment } from 'src/environments/environment';
import { Chart, registerables } from 'chart.js/auto';

Chart.register(...registerables);

@Component({
  selector: 'app-scouting-player',
  templateUrl: './scouting-player.component.html',
  styleUrls: ['./scouting-player.component.scss']
})
export class ScoutingPlayerComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('radarCanvas', { static: false }) radarCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barEstadisticasCanvas', { static: false }) barEstadisticasCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barAsistenciaCanvas', { static: false }) barAsistenciaCanvas!: ElementRef<HTMLCanvasElement>;

  playerId = 0;
  teamId = 0;
  datosCargados = false;
  imageBaseUrlUser = environment.images + 'user/';

  scoutingPlayer: ScoutingPlayer = new ScoutingPlayer({});
  userId = 0;

  // Estadísticas de partidos (como en "Ver info" > Información deportiva)
  partidosJugados = 0;
  minutosJugados = 0;
  goles = 0;
  tarjetasAmarillas = 0;
  tarjetasRojas = 0;
  numTitulares = 0;
  listAsistencia: any[] = [];

  // Jugador enriquecido del equipo (para radar: habilidadConBalon, pase, etc.)
  playerFromTeam: any = null;
  radarChart: Chart | null = null;
  chartEstadisticas: Chart | null = null;
  chartAsistencia: Chart | null = null;
  profileImageError = false;
  activeTabGraficas: 'estadisticas' | 'asistencia' = 'estadisticas';
  private subs = new Subscription();

  get profileImageUrl(): string | null {
    if (this.scoutingPlayer?.imagenPerfil) {
      return 'https://appsphairatech.com/images/imgScoutingPlayer/' + this.scoutingPlayer.imagenPerfil;
    }
    if (this.playerFromTeam?.picturePlayer) {
      return this.imageBaseUrlUser + this.playerFromTeam.picturePlayer;
    }
    return null;
  }

  /** Nombre para mostrar: scouting o nombre + apellido del equipo */
  get displayName(): string {
    if (this.scoutingPlayer?.nombre) {
      return this.scoutingPlayer.nombre;
    }
    if (this.playerFromTeam) {
      return [this.playerFromTeam.nombre, this.playerFromTeam.apellido].filter(Boolean).join(' ') || 'Jugador';
    }
    return 'Jugador';
  }

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private playerService: PlayerService,
    private trainingService: TrainingService,
    private loginService: LoginService,
    private tutorialService: TutorialService
  ) {}

  ngOnInit(): void {
    setTimeout(() => this.tutorialService.start('scouting-player', true), 600);
    this.subs.add(this.route.params.subscribe(params => {
      this.playerId = +params['playerId'] || 0;
    }));
    this.subs.add(this.route.queryParams.subscribe(q => {
      this.teamId = q['teamId'] ? +q['teamId'] : 0;
    }));

    this.subs.add(this.loginService.usuarioActual.subscribe(user => {
      this.userId = user?.userId ?? 0;
    }));

    this.cargarForm();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.cargarGraficoRadar();
      this.cargarGraficoEstadisticas();
      this.cargarGraficoAsistencia();
    }, 200);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    [this.radarChart, this.chartEstadisticas, this.chartAsistencia].forEach(c => {
      if (c) c.destroy();
    });
  }

  cargarForm(): void {
    this.playerService.getscoutingplayerbyplayerid(this.playerId, this.userId).subscribe({
      next: (response: Response) => {
        if (response.data != null) {
          this.scoutingPlayer = response.data;
        } else {
          this.scoutingPlayer.playerId = this.playerId;
        }
        this.datosCargados = true;
        this.cargarEstadisticasYRadar();
      },
      error: () => {
        this.scoutingPlayer.playerId = this.playerId;
        this.datosCargados = true;
        this.cargarEstadisticasYRadar();
      }
    });
  }

  private cargarEstadisticasYRadar(): void {
    if (this.teamId && this.playerId) {
      this.playerService.getDatosPlayer(this.teamId, this.playerId).subscribe({
        next: (res: Response) => {
          if (res?.data) {
            this.partidosJugados = res.data.partidosJugados ?? 0;
            this.minutosJugados = res.data.minutosJugados ?? 0;
            this.goles = res.data.goles ?? 0;
            this.tarjetasAmarillas = res.data.tarAmarillas ?? 0;
            this.tarjetasRojas = res.data.tarRojas ?? 0;
            this.numTitulares = res.data.numTitulares ?? 0;
          }
          setTimeout(() => { this.cargarGraficoRadar(); this.cargarGraficoEstadisticas(); }, 150);
        }
      });
      this.trainingService.getListsAsistenciaByTeamYPlayer(this.teamId, this.playerId).subscribe({
        next: (res) => {
          if (res?.data) this.listAsistencia = res.data;
          setTimeout(() => this.cargarGraficoAsistencia(), 200);
        }
      });
      this.playerService.getPlayers(String(this.teamId)).subscribe({
        next: (res) => {
          if (res?.data) {
            const data = res.data as { players?: any[]; [k: string]: any };
            const list = Array.isArray(data.players) ? data.players : Array.isArray(data) ? data : [];
            this.playerFromTeam = list.find((p: any) => p.playerId === this.playerId) || null;
            setTimeout(() => this.cargarGraficoRadar(), 300);
          }
        }
      });
    } else {
      setTimeout(() => this.cargarGraficoRadar(), 100);
    }
  }

  cargarGraficoRadar(): void {
    const p = this.playerFromTeam || this.scoutingPlayer;
    if (!this.radarCanvas?.nativeElement || (!p && !this.scoutingPlayer.nombre)) return;
    if (this.radarChart) this.radarChart.destroy();
    const ctx = this.radarCanvas.nativeElement.getContext('2d');
    if (!ctx) return;
    const labels = ['Habilidad con balón', 'Pase', 'Tiro', 'Defensa', 'Físico', 'Mentalidad'];
    let data = [
      parseInt(p.habilidadConBalon, 10) || 0,
      parseInt(p.pase, 10) || 0,
      parseInt(p.tiro, 10) || 0,
      parseInt(p.defensa, 10) || 0,
      parseInt(p.fisico, 10) || 0,
      parseInt(p.mentalidad, 10) || 0
    ];
    let labelsRadar = [...labels];
    const esPortero = (p.posicion || p.posicionPrincipal || '') === 'Portero';
    if (esPortero) {
      labelsRadar = [...labels, 'Portero'];
      data = [...data, parseInt(p.portero, 10) || 0];
    }
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(49, 178, 112, 0.35)');
    gradient.addColorStop(0.6, 'rgba(49, 178, 112, 0.15)');
    gradient.addColorStop(1, 'rgba(49, 178, 112, 0.05)');
    this.radarChart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: labelsRadar,
        datasets: [{
          label: '',
          data,
          backgroundColor: gradient,
          borderColor: 'rgba(0, 80, 40, 0.95)',
          borderWidth: 2.5,
          pointBackgroundColor: '#31b270',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: { duration: 800 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0, 44, 64, 0.9)',
            titleFont: { size: 12, weight: 600 },
            bodyFont: { size: 13 },
            padding: 10,
            cornerRadius: 8
          }
        },
        scales: {
          r: {
            min: 0,
            max: 100,
            angleLines: { color: 'rgba(0, 44, 64, 0.1)' },
            grid: { color: 'rgba(0, 44, 64, 0.06)' },
            pointLabels: {
              font: { size: 10, family: "'Archivo', sans-serif", weight: 600 },
              color: 'rgba(255, 255, 255, 0.95)'
            },
            ticks: {
              display: true,
              stepSize: 25,
              color: 'rgba(255, 255, 255, 0.5)',
              font: { size: 9 }
            }
          }
        }
      }
    });
  }

  /** Gráfica de barras: estadísticas de partidos */
  cargarGraficoEstadisticas(): void {
    if (!this.barEstadisticasCanvas?.nativeElement) return;
    if (this.chartEstadisticas) this.chartEstadisticas.destroy();
    const ctx = this.barEstadisticasCanvas.nativeElement.getContext('2d');
    if (!ctx) return;
    const labels = ['Partidos', 'Minutos', 'Goles', 'Titularidades', 'Tarj. amarillas', 'Tarj. rojas'];
    const values = [
      this.partidosJugados,
      Math.min(this.minutosJugados, 999),
      this.goles,
      this.numTitulares,
      this.tarjetasAmarillas,
      this.tarjetasRojas
    ];
    const baseColors = [
      { top: '#31b270', bottom: '#228b5a' },
      { top: '#1f8f8a', bottom: '#167a75' },
      { top: '#0d9488', bottom: '#0f766e' },
      { top: '#14b8a6', bottom: '#0d9488' },
      { top: '#f59e0b', bottom: '#d97706' },
      { top: '#ef4444', bottom: '#dc2626' }
    ];
    const bgColors = baseColors.map((c, i) => {
      const g = ctx.createLinearGradient(0, 0, 0, 250);
      g.addColorStop(0, c.top);
      g.addColorStop(1, c.bottom);
      return g;
    });
    this.chartEstadisticas = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Valor',
          data: values,
          backgroundColor: bgColors,
          borderColor: baseColors.map(c => c.bottom),
          borderWidth: 1,
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: { duration: 600 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0, 44, 64, 0.92)',
            titleFont: { size: 12, weight: 600 },
            bodyFont: { size: 13 },
            padding: 12,
            cornerRadius: 10,
            displayColors: true
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              font: { size: 11 },
              color: '#64748b'
            },
            grid: { color: 'rgba(0, 44, 64, 0.05)' },
            border: { display: false }
          },
          x: {
            grid: { display: false },
            ticks: {
              font: { size: 11 },
              color: '#64748b'
            },
            border: { display: false }
          }
        },
        datasets: {
          bar: {
            barPercentage: 0.7,
            categoryPercentage: 0.85
          }
        }
      }
    });
  }

  /** Agrupa asistencia por mes para la gráfica. Devuelve { labels, asistencias, faltas } */
  getAsistenciaPorMes(): { labels: string[]; asistencias: number[]; faltas: number[] } {
    const byMonth: Record<string, { asistencias: number; faltas: number }> = {};
    for (const p of this.listAsistencia || []) {
      const fecha = p.fecha;
      if (!fecha) continue;
      let key: string;
      if (typeof fecha === 'string' && fecha.includes('-')) {
        key = fecha.substring(0, 7);
      } else if (typeof fecha === 'string' && fecha.includes('/')) {
        const parts = fecha.split('/');
        key = parts.length >= 3 ? `${parts[2]}-${parts[1]?.padStart(2, '0')}` : fecha;
      } else {
        key = String(fecha).substring(0, 7);
      }
      if (!byMonth[key]) byMonth[key] = { asistencias: 0, faltas: 0 };
      if (p.asistencia === 1) byMonth[key].asistencias++;
      else byMonth[key].faltas++;
    }
    const keys = Object.keys(byMonth).sort();
    const labels = keys.map(k => {
      const [y, m] = k.split('-');
      const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
      return meses[parseInt(m, 10) - 1] + ' ' + (y || '');
    });
    const asistencias = keys.map(k => byMonth[k].asistencias);
    const faltas = keys.map(k => byMonth[k].faltas);
    return { labels, asistencias, faltas };
  }

  /** Gráfica de barras: asistencia vs faltas por mes */
  cargarGraficoAsistencia(): void {
    if (!this.barAsistenciaCanvas?.nativeElement) return;
    if (this.chartAsistencia) this.chartAsistencia.destroy();
    const { labels, asistencias, faltas } = this.getAsistenciaPorMes();
    if (labels.length === 0) return;
    const ctx = this.barAsistenciaCanvas.nativeElement.getContext('2d');
    if (!ctx) return;
    const gradAsist = ctx.createLinearGradient(0, 0, 0, 250);
    gradAsist.addColorStop(0, '#31b270');
    gradAsist.addColorStop(1, '#228b5a');
    const gradFaltas = ctx.createLinearGradient(0, 0, 0, 250);
    gradFaltas.addColorStop(0, '#f87171');
    gradFaltas.addColorStop(1, '#dc2626');
    this.chartAsistencia = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Asistencias',
            data: asistencias,
            backgroundColor: gradAsist,
            borderColor: '#228b5a',
            borderWidth: 1,
            borderRadius: 6,
            borderSkipped: false
          },
          {
            label: 'Faltas',
            data: faltas,
            backgroundColor: gradFaltas,
            borderColor: '#b91c1c',
            borderWidth: 1,
            borderRadius: 6,
            borderSkipped: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: { duration: 600 },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 16,
              font: { size: 12, weight: 600 },
              color: '#002c40'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 44, 64, 0.92)',
            titleFont: { size: 12, weight: 600 },
            bodyFont: { size: 13 },
            padding: 12,
            cornerRadius: 10
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              font: { size: 11 },
              color: '#64748b'
            },
            grid: { color: 'rgba(0, 44, 64, 0.05)' },
            border: { display: false }
          },
          x: {
            grid: { display: false },
            ticks: {
              font: { size: 11 },
              color: '#64748b'
            },
            border: { display: false }
          }
        },
        datasets: {
          bar: {
            barPercentage: 0.75,
            categoryPercentage: 0.8
          }
        }
      }
    });
  }

  setTabGraficas(tab: 'estadisticas' | 'asistencia'): void {
    this.activeTabGraficas = tab;
    setTimeout(() => {
      if (tab === 'estadisticas') this.cargarGraficoEstadisticas();
      else this.cargarGraficoAsistencia();
    }, 50);
  }

  get tieneDatosAsistenciaParaGrafica(): boolean {
    const { labels } = this.getAsistenciaPorMes();
    return labels.length > 0;
  }

  goBack(): void {
    this.location.back();
  }
}
