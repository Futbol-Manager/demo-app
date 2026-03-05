import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PlayerService } from 'src/app/core/services/player/player.service';
import { Response } from 'src/app/core/services/models/response.model';
import { PlayerEstadistica } from 'src/app/core/services/player/player.model';
import { Chart, registerables } from 'chart.js/auto';
import { TrainingService } from 'src/app/core/services/training/training.service';
import { Location } from '@angular/common';
import { TutorialService } from 'src/app/core/services/tutorial/tutorial.service';
Chart.register(...registerables);

const CHART_COLOR_PRIMARY = '#31b270';
const CHART_COLOR_PRIMARY_DARK = '#1f8f5a';
const CHART_COLOR_NAVY = '#002c40';
const CHART_COLOR_NAVY_MID = '#0a4a6e';
const CHART_FONT_FAMILY = "'Inter', 'Segoe UI', system-ui, sans-serif";

@Component({
  selector: 'app-estadisticas-jugadores',
  templateUrl: './estadisticas-jugadores.component.html',
  styleUrls: ['./estadisticas-jugadores.component.scss']
})
export class EstadisticasJugadoresComponent implements OnInit, OnDestroy {

  @ViewChild('barChartCanvas') barChartCanvasRef: ElementRef<HTMLCanvasElement> | null = null;

  datosCargados: boolean = false;
  graficasPlayers: boolean = false;
  teamId!: number;
  players: any[] = [];
  totalMatchs: number = 0;
  barChartMinutos: Chart | null = null;
  barChartGoles: Chart | null = null;
  barChartUnica: Chart | null = null;

  golesTodosAvanzadoAFavor: any[] = [];
  golesAvanzadoAFavor: any[] = [];

  tipoPartidoSelected: string = 'Liga';

  /* Paginación y filtros tipo Sphaira – tabla jugadores */
  searchPlayer = '';
  pagePlayer = 1;
  pageSizePlayer = 25;
  readonly pageSizesPlayer = [10, 25, 50, 100];

  /* Paginación y filtros tipo Sphaira – tabla goles */
  searchGol = '';
  pageGol = 1;
  pageSizeGol = 10;
  readonly pageSizesGol = [10, 25, 50];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private playerService: PlayerService,
    private trainingService: TrainingService,
    private elementRef: ElementRef,
    private location: Location,
    private tutorialService: TutorialService) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.teamId = +params['teamId'];
    });
    this.cargarTablaJugadores('Liga');
    setTimeout(() => this.tutorialService.start('estadisticas-jugadores', true), 600);
  }

  ngOnDestroy(): void {
    [this.barChartMinutos, this.barChartGoles, this.barChartUnica].forEach(chart => {
      if (chart) {
        chart.destroy();
      }
    });
  }

  // Método para navegar a la pantalla de calendario
  navegarACalendario(): void {
    // Puedes ajustar la ruta según tu estructura de rutas
    //this.router.navigate(['/dashboard/calendario', this.teamId, 0]);
    this.router.navigate(['/dashboard/menu-entrenador', this.teamId, 0]);
  }

  goBack(): void {
    this.location.back();
  }

  selectedTipoPartido(){
    this.cargarTablaJugadores(this.tipoPartidoSelected);
  }

  cargarTablaJugadores(tipoPartido: string) {
    this.playerService.getListPlayersEstadisticsByTeam(this.teamId, tipoPartido).subscribe(
      (response: Response) => {
        if (response && response.data) {
          const data = response.data as { listDto?: PlayerEstadistica[]; matchs?: number };
          const list = Array.isArray(data.listDto) ? data.listDto : [];
          this.players = list;
          this.totalMatchs = data.matchs ?? 0;
          this.pagePlayer = 1;
          this.searchPlayer = '';
          this.datosCargados = true;
        } else {
          this.players = [];
          this.totalMatchs = 0;
          this.datosCargados = true;
        }
      },
      (error) => {
        console.error('Error al cargar el listado de jugadores', error);
        this.players = [];
        this.totalMatchs = 0;
        this.datosCargados = true;
      }
    );
  }

  /** Texto normalizado para búsqueda (sin acentos, minúsculas). */
  private normalizeText(text: string): string {
    if (!text) return '';
    return String(text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  /** Jugadores filtrados por búsqueda (nombre, posición). */
  get filteredPlayers(): any[] {
    const term = this.normalizeText(this.searchPlayer);
    if (!term) return this.players;
    return this.players.filter(p => {
      const nombre = this.normalizeText(p.nombre || '');
      const posicion = this.normalizeText(p.posicion || '');
      return nombre.includes(term) || posicion.includes(term);
    });
  }

  get totalPagesPlayer(): number {
    const total = this.filteredPlayers.length;
    return total <= 0 ? 1 : Math.ceil(total / this.pageSizePlayer);
  }

  get paginatedPlayers(): any[] {
    const list = this.filteredPlayers;
    const start = (this.pagePlayer - 1) * this.pageSizePlayer;
    return list.slice(start, start + this.pageSizePlayer);
  }

  get paginationInfoPlayer(): string {
    const total = this.filteredPlayers.length;
    if (total === 0) return 'Sin registros';
    const start = (this.pagePlayer - 1) * this.pageSizePlayer + 1;
    const end = Math.min(this.pagePlayer * this.pageSizePlayer, total);
    return `Mostrando ${start}–${end} de ${total}`;
  }

  nextPagePlayer(): void {
    if (this.pagePlayer < this.totalPagesPlayer) this.pagePlayer++;
  }

  prevPagePlayer(): void {
    if (this.pagePlayer > 1) this.pagePlayer--;
  }

  onPageSizePlayerChange(): void {
    this.pagePlayer = 1;
  }

  /** Goles filtrados por búsqueda (goleador, asistente, rival, categoría). */
  get filteredGoles(): any[] {
    const term = this.normalizeText(this.searchGol);
    if (!term) return this.golesAvanzadoAFavor;
    return this.golesAvanzadoAFavor.filter(g => {
      const goleador = this.normalizeText(g.nombreGoleador || '');
      const asistente = this.normalizeText(g.nombreAsistente || '');
      const rival = this.normalizeText((g.postPartido?.matchPreparation?.rivalName) || '');
      const cat = this.normalizeText(g.category || '');
      const sub = this.normalizeText(g.subCategory || '');
      return goleador.includes(term) || asistente.includes(term) || rival.includes(term) || cat.includes(term) || sub.includes(term);
    });
  }

  get totalPagesGol(): number {
    const total = this.filteredGoles.length;
    return total <= 0 ? 1 : Math.ceil(total / this.pageSizeGol);
  }

  get paginatedGoles(): any[] {
    const list = this.filteredGoles;
    const start = (this.pageGol - 1) * this.pageSizeGol;
    return list.slice(start, start + this.pageSizeGol);
  }

  get paginationInfoGol(): string {
    const total = this.filteredGoles.length;
    if (total === 0) return 'Sin registros';
    const start = (this.pageGol - 1) * this.pageSizeGol + 1;
    const end = Math.min(this.pageGol * this.pageSizeGol, total);
    return `Mostrando ${start}–${end} de ${total}`;
  }

  nextPageGol(): void {
    if (this.pageGol < this.totalPagesGol) this.pageGol++;
  }

  prevPageGol(): void {
    if (this.pageGol > 1) this.pageGol--;
  }

  onPageSizeGolChange(): void {
    this.pageGol = 1;
  }

  trackByPlayerId(_index: number, player: any): number {
    return player?.playerId ?? _index;
  }

  verGraficaPlayers() {
    this.graficasPlayers = true;
    this.showGolesForPlayer();
    setTimeout(() => {
      this.graficaUnica(this.players.map(player => player.minTotales), 'Minutos totales de los jugadores', 'Minutos');
    }, 100);
  }

  verTablaPlayers() {
    this.graficasPlayers = false;
    if (this.players.length === 0 && this.teamId) {
      this.cargarTablaJugadores(this.tipoPartidoSelected);
    }
  }

  cargarMinutosGraficoBarras() {
    const canvas = document.getElementById('barrasChartMinutos') as HTMLCanvasElement;
    if (!canvas) {
      console.error('No se encontró el elemento canvas');
      return;
    }

    // Antes de crear el nuevo gráfico, destruye el gráfico existente si es necesario
    if (this.barChartMinutos) {
      this.barChartMinutos.destroy(); // Destruye el gráfico existente
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('No se pudo obtener el contexto del elemento canvas');
      return;
    }

    // Crear arrays de datos y etiquetas desde this.players
    const data = this.players.map(player => player.minTotales);
    const labels = this.players.map(player => player.nombre);

    // Asignar colores consistentes basados en la posición en el array
    const backgroundColors = this.players.map((player, index) => this.getPlayerColor(index, 0.2));
    const borderColors = this.players.map((player, index) => this.getPlayerColor(index, 1));


    this.barChartMinutos = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Nº de minutos',
          data: data,
          backgroundColor: '#22bf63', //backgroundColors,
          borderColor: '#22bf63', //borderColors,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Minutos totales de los jugadores'
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  cargarGolesGraficoBarras() {
    const canvas = document.getElementById('barrasChartGoles') as HTMLCanvasElement;
    if (!canvas) {
      console.error('No se encontró el elemento canvas');
      return;
    }

    // Antes de crear el nuevo gráfico, destruye el gráfico existente si es necesario
    if (this.barChartGoles) {
      this.barChartGoles.destroy(); // Destruye el gráfico existente
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('No se pudo obtener el contexto del elemento canvas');
      return;
    }

    // Crear arrays de datos y etiquetas desde this.players
    const data = this.players.map(player => player.goles);
    const labels = this.players.map(player => player.nombre);

    // Asignar colores consistentes basados en la posición en el array
    const backgroundColors = this.players.map((player, index) => this.getPlayerColor(index, 0.2));
    const borderColors = this.players.map((player, index) => this.getPlayerColor(index, 1));


    this.barChartGoles = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Nº de goles',
          data: data,
          backgroundColor: '#22bf63', //backgroundColors,
          borderColor: '#22bf63', //borderColors,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Goles totales de los jugadores'
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  generateColors(count: number, alpha: number): string[] {
    const colors: string[] = [];
    for (let i = 0; i < count; i++) {
      const r = Math.floor(Math.random() * 256);
      const g = Math.floor(Math.random() * 256);
      const b = Math.floor(Math.random() * 256);
      colors.push(`rgba(${r}, ${g}, ${b}, ${alpha})`);
    }
    return colors;
  }

  getPlayerColor(index: number, alpha: number): string {
    // Aquí puedes implementar lógica para asignar colores basados en la posición en el array
    // Por ejemplo, puedes mapear el índice a colores específicos
    // Aquí hay un ejemplo simple utilizando un conjunto de colores predefinido:
    const colorSet = [
      'rgba(255, 99, 132, ' + alpha + ')',
      'rgba(54, 162, 235, ' + alpha + ')',
      'rgba(255, 206, 86, ' + alpha + ')',
      'rgba(75, 192, 192, ' + alpha + ')',
      'rgba(153, 102, 255, ' + alpha + ')',
      'rgba(255, 159, 64, ' + alpha + ')',
      'rgba(255, 99, 132, ' + alpha + ')',
      'rgba(54, 162, 235, ' + alpha + ')',
      'rgba(255, 206, 86, ' + alpha + ')',
      'rgba(75, 192, 192, ' + alpha + ')',
      'rgba(153, 102, 255, ' + alpha + ')',
      'rgba(255, 159, 64, ' + alpha + ')',
      'rgba(255, 99, 132, ' + alpha + ')',
      'rgba(54, 162, 235, ' + alpha + ')',
      'rgba(255, 206, 86, ' + alpha + ')',
      'rgba(75, 192, 192, ' + alpha + ')',
      'rgba(153, 102, 255, ' + alpha + ')',
      'rgba(255, 159, 64, ' + alpha + ')',
      'rgba(255, 99, 132, ' + alpha + ')',
      'rgba(54, 162, 235, ' + alpha + ')',
      'rgba(255, 206, 86, ' + alpha + ')',
      'rgba(75, 192, 192, ' + alpha + ')',
      'rgba(153, 102, 255, ' + alpha + ')',
      'rgba(255, 159, 64, ' + alpha + ')'
      // Añade más colores si es necesario
    ];

    // Usa el índice para seleccionar un color del conjunto
    const colorIndex = index % colorSet.length;
    return colorSet[colorIndex];
  }

  changeGrafic(event: Event) {
    const selectedValue = (event.target as HTMLSelectElement).value;
    let data = [];
    let text = '';
    let label = '';
    switch (selectedValue) {
      case "1":
        data = this.players.map(player => player.minTotales);
        text = 'Minutos totales de los jugadores';
        label = 'Minutos';
        break;
      case "2":
        data = this.players.map(player => player.goles);
        text = 'Goles totales de los jugadores';
        label = 'Goles';
        break;
      case "3":
        data = this.players.map(player => player.asistencias);
        text = 'Asistencias totales de los jugadores';
        label = 'Asistencias';
        break;
      case "4":
        data = this.players.map(player => player.partidosJugados);
        text = 'Partidos jugados de los jugadores';
        label = 'Nº de partidos';
        break;
      case "5":
        data = this.players.map(player => player.golesPenalti);
        text = 'Goles totales de penalti';
        label = 'Goles de penalti';
        break;
      case "6":
        data = this.players.map(player => player.penaltisFallados);
        text = 'Penaltis fallados de los jugadores';
        label = 'Nº de penaltis fallados';
        break;
      case "7":
        data = this.players.map(player => player.tarAmarilla);
        text = 'Tarjetas amarillas de los jugadores';
        label = 'Nº de tarjetas amarillas';
        break;
      case "8":
        data = this.players.map(player => player.tarRojas);
        text = 'Tarjetas rojas de los jugadores';
        label = 'Nº de tarjetas rojas';
        break;
      default:
        console.log("Opción no reconocida");
        break;
    }

    this.graficaUnica(data, text, label);
  }

  graficaUnica(data: any, text: string, label: string) {
    const canvas = (this.barChartCanvasRef?.nativeElement ?? document.getElementById('barChartUnica')) as HTMLCanvasElement;
    if (!canvas) {
      return;
    }

    if (this.barChartUnica) {
      this.barChartUnica.destroy();
      this.barChartUnica = null;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(49, 178, 112, 0.95)');
    gradient.addColorStop(0.5, 'rgba(49, 178, 112, 0.75)');
    gradient.addColorStop(0.85, 'rgba(31, 143, 90, 0.6)');
    gradient.addColorStop(1, 'rgba(0, 74, 110, 0.5)');

    const labels = this.players.map(player => player.nombre);

    this.barChartUnica = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label,
          data,
          backgroundColor: gradient,
          borderColor: CHART_COLOR_PRIMARY,
          borderWidth: 1.5,
          borderRadius: 10,
          borderSkipped: false,
          hoverBackgroundColor: 'rgba(49, 178, 112, 0.85)',
          hoverBorderColor: CHART_COLOR_PRIMARY_DARK,
          hoverBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 2.2,
        animation: {
          duration: 600
        },
        plugins: {
          title: {
            display: true,
            text,
            font: { size: 17, weight: 'bold', family: CHART_FONT_FAMILY },
            color: CHART_COLOR_NAVY,
            padding: { bottom: 20 }
          },
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: CHART_COLOR_NAVY,
            titleFont: { size: 13, weight: 600, family: CHART_FONT_FAMILY },
            bodyFont: { size: 13, family: CHART_FONT_FAMILY },
            padding: 12,
            cornerRadius: 10,
            displayColors: true,
            callbacks: {
              label: (item) => ` ${item.dataset.label}: ${item.raw}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0, 44, 64, 0.06)', drawTicks: true },
            ticks: {
              color: CHART_COLOR_NAVY,
              font: { size: 11, family: CHART_FONT_FAMILY },
              padding: 6
            },
            border: { display: false }
          },
          x: {
            grid: { display: false },
            ticks: {
              color: CHART_COLOR_NAVY,
              font: { size: 11, family: CHART_FONT_FAMILY },
              maxRotation: 45,
              minRotation: 0,
              padding: 8
            },
            border: { display: false }
          }
        }
      }
    });
  }

  showGolesForPlayer() {
    this.trainingService.getListGolesAvanzadoByTeamId(this.teamId).subscribe(
      (resp) => {
        if (resp.data) {
          this.golesTodosAvanzadoAFavor = resp.data.golesAFavor;
          for (let index = 0; index < this.golesTodosAvanzadoAFavor.length; index++) {
            this.golesTodosAvanzadoAFavor[index].nombreGoleador = this.showNamePlayer(this.golesTodosAvanzadoAFavor[index].playerId);
            this.golesTodosAvanzadoAFavor[index].nombreAsistente = this.showNamePlayer(this.golesTodosAvanzadoAFavor[index].asistencia);
            
          }
          this.golesAvanzadoAFavor = this.golesTodosAvanzadoAFavor;
          this.pageGol = 1;
        }
      },
      (error) => {
        console.error('Error en la solicitud:', error);
      }
    );
  }

  seleccionarIndices(event: any): void {
    const playerId = event !== 0 ? event.target.value : '0';
    if (playerId === '0') {
      this.golesAvanzadoAFavor = this.golesTodosAvanzadoAFavor;
    } else {
      this.golesAvanzadoAFavor = this.golesTodosAvanzadoAFavor.filter(gol => gol.playerId.toString() === playerId);
    }
    this.pageGol = 1;
  }

  showNamePlayer(playerId: number): string {
    const player = this.players.find(p => p.playerId === playerId);
    return player ? player.nombre : '';
  }

}
