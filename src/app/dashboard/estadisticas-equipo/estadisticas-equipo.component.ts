import { Component, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PlayerService } from 'src/app/core/services/player/player.service';
import { Response } from 'src/app/core/services/models/response.model';
import { PostPartido } from 'src/app/core/services/models/match.model';
import { TrainingService } from 'src/app/core/services/training/training.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { HttpClient } from '@angular/common/http';
import { Chart, registerables } from 'chart.js/auto';
import { GolPostPartido } from 'src/app/core/services/team/team.model';
import { Location } from '@angular/common';
Chart.register(...registerables);
import * as $ from 'jquery';
import 'datatables.net';

const CHART_COLOR_PRIMARY = '#31b270';
const CHART_COLOR_NIGHT = '#002c40';

interface DatasetIF {
  label: string;
  data: number[];
  backgroundColor: string;
}


@Component({
  selector: 'app-estadisticas-equipo',
  templateUrl: './estadisticas-equipo.component.html',
  styleUrls: ['./estadisticas-equipo.component.scss']
})
export class EstadisticasEquipoComponent implements OnInit, OnDestroy {
  datosCargados: boolean = false;
  nombreEquipo: string = '';
  team: any;
  teamId!: number;
  partidos: any[] = [];
  partidosReverse: any[] = [];
  showModalPostPartido: boolean = false;
  postPartido: PostPartido = new PostPartido({});

  private pieChartResultados: Chart | null = null;
  private lineChartPuntos: Chart | null = null;

  resumentotales: any = {
    equipo: '',
    partidos: 0,
    victorias: 0,
    empates: 0,
    derrotas: 0,
    gf: 0,
    gc: 0,
    dg: 0,
    puntos: 0,
    ultimos: []
  };


  graficasEquipo: boolean = false;
  barChartPrimera: Chart | null = null;
  barChartSegunda: Chart | null = null;
  barCharttercera: Chart | null = null;
  barChartCuarta: Chart | null = null;
  barChartQuinta: Chart | null = null;
  barChartSexta: Chart | null = null;
  barChartSeptima: Chart | null = null;

  totalGoals: number = 20;
  nameRivals: string[] = ['Rival 1', 'Rival 2', 'Rival 3', 'Rival 4', 'Rival 5'];
  goalsData: number[] = [5, 10, 15, 7, 12];

  golTypes = [
    {
      "name": "En propia",
      "subcategories": []
    },
    {
      "name": "Jugada combinativa",
      "subcategories": [
        {
          "name": "Banda Izquierda",
          "options": [
            "Tiro a portería",
            "Remate de cabeza",
            "Otra parte del cuerpo"
          ]
        },
        {
          "name": "Banda Derecha",
          "options": [
            "Tiro a portería",
            "Remate de cabeza",
            "Otra parte del cuerpo"
          ]
        },
        {
          "name": "Zona interior",
          "options": [
            "Tiro a portería",
            "Remate de cabeza",
            "Otra parte del cuerpo"
          ]
        },
        {
          "name": "Dentro del área",
          "options": [
            "Tiro a portería",
            "Remate de cabeza",
            "Otra parte del cuerpo"
          ]
        },
        {
          "name": "Fuera del área",
          "options": [
            "Tiro a portería",
            "Remate de cabeza",
            "Otra parte del cuerpo"
          ]
        }
      ]
    },
    {
      "name": "Pérdida/Recuperación",
      "subcategories": [
        {
          "name": "Banda Izquierda",
          "options": [
            "Tiro a portería",
            "Remate de cabeza",
            "Otra parte del cuerpo"
          ]
        },
        {
          "name": "Banda Derecha",
          "options": [
            "Tiro a portería",
            "Remate de cabeza",
            "Otra parte del cuerpo"
          ]
        },
        {
          "name": "Zona interior",
          "options": [
            "Tiro a portería",
            "Remate de cabeza",
            "Otra parte del cuerpo"
          ]
        },
        {
          "name": "Dentro del área",
          "options": [
            "Tiro a portería",
            "Remate de cabeza",
            "Otra parte del cuerpo"
          ]
        },
        {
          "name": "Fuera del área",
          "options": [
            "Tiro a portería",
            "Remate de cabeza",
            "Otra parte del cuerpo"
          ]
        }
      ]
    },
    {
      "name": "Córner",
      "subcategories": [
        {
          "name": "Izquierda",
          "options": [
            "Saque en corto",
            "Primer palo",
            "Punto de penalti",
            "Segundo palo"
          ]
        },
        {
          "name": "Derecha",
          "options": [
            "Saque en corto",
            "Primer palo",
            "Punto de penalti",
            "Segundo palo"
          ]
        }
      ]
    },
    {
      "name": "Falta disparo directo",
      "subcategories": []
    },
    {
      "name": "Falta",
      "subcategories": [
        {
          "name": "Banda Izquierda",
          "options": [
            "Tiro a portería",
            "Remate de cabeza",
            "Otra parte del cuerpo"
          ]
        },
        {
          "name": "Banda Derecha",
          "options": [
            "Tiro a portería",
            "Remate de cabeza",
            "Otra parte del cuerpo"
          ]
        },
        {
          "name": "Zona Interior",
          "options": [
            "Tiro a portería",
            "Remate de cabeza",
            "Otra parte del cuerpo"
          ]
        },
        {
          "name": "Dentro del área",
          "options": [
            "Tiro a portería",
            "Remate de cabeza",
            "Otra parte del cuerpo"
          ]
        },
        {
          "name": "Fuera del área",
          "options": [
            "Tiro a portería",
            "Remate de cabeza",
            "Otra parte del cuerpo"
          ]
        }
      ]
    },
    {
      "name": "Saque de banda",
      "subcategories": [
        {
          "name": "Banda Izquierda",
          "options": [
            "Tiro a portería",
            "Remate de cabeza",
            "Otra parte del cuerpo"
          ]
        },
        {
          "name": "Banda Derecha",
          "options": [
            "Tiro a portería",
            "Remate de cabeza",
            "Otra parte del cuerpo"
          ]
        },
        {
          "name": "Zona interior",
          "options": [
            "Tiro a portería",
            "Remate de cabeza",
            "Otra parte del cuerpo"
          ]
        },
        {
          "name": "Dentro del área",
          "options": [
            "Tiro a portería",
            "Remate de cabeza",
            "Otra parte del cuerpo"
          ]
        },
        {
          "name": "Fuera del área",
          "options": [
            "Tiro a portería",
            "Remate de cabeza",
            "Otra parte del cuerpo"
          ]
        }
      ]
    },
    {
      "name": "Penalti",
      "subcategories": []
    }
  ]

  selectedGolTypes: string = '';
  selectedSubGolTypes: string = '';
  listSub: any[] = [];
  listLabels: any[] = [];

  /** Categorías que tienen subcategorías (para el selector de Goles por subcategoría) */
  get golTypesConSubcategorias(): { name: string; subcategories: any[] }[] {
    return this.golTypes.filter(c => c.subcategories && c.subcategories.length > 0);
  }

  golAvanzadoAFavor: GolPostPartido = new GolPostPartido({});
  golesAvanzadoAFavor: GolPostPartido[] = [];

  golAvanzadoEnContra: GolPostPartido = new GolPostPartido({});
  golesAvanzadoEnContra: GolPostPartido[] = [];

  datasets: DatasetIF[] = [];

  tipoPartidoSelected: string = 'Liga';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private playerService: PlayerService,
    private trainingService: TrainingService,
    private teamService: TeamService,
    private http: HttpClient,
    private elementRef: ElementRef,
    private location: Location) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.teamId = +params['teamId'];
    });
    this.cargarNombreEquipo();
  }

  ngOnDestroy(): void {
    const charts: (Chart | null)[] = [
      this.pieChartResultados,
      this.lineChartPuntos,
      this.barChartSegunda,
      this.barChartCuarta,
      this.barChartQuinta,
      this.barChartSexta,
      this.barChartSeptima
    ];
    charts.forEach(chart => {
      if (chart) chart.destroy();
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

  cargarNombreEquipo() {
    this.teamService.getTeamById(this.teamId.toString()).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.team = response.data;
          this.nombreEquipo = this.team.nameCompleteTeam;
          this.getListaPostpartidos('Liga');
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  selectedTipoPartido() {
    this.getListaPostpartidos(this.tipoPartidoSelected);
  }

  getListaPostpartidos(tipoPartido: string) {
    this.playerService.getListPostPartidoByTeam(this.teamId, tipoPartido).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response && response.data && Array.isArray(response.data)) {
          // Mapea los datos bajo 'data' a instancias del modelo Team
          this.partidos = response.data; //.map((post: PostPartido) => new PostPartido(post));
          this.partidosReverse = this.partidos.slice().reverse();
          // Inicializar el DataTable después de cargar los datos
          //this.inicializarDataTable();
          this.datosResumentTotales(this.partidos);
          this.datosCargados = true;
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  // Método para inicializar el DataTable
  inicializarDataTable(): void {
    // Destruir el DataTable si ya existe
    const $dataTable = $('#dataTable');
    if ($dataTable.hasClass('dataTable')) {
      $dataTable.DataTable().destroy();
    }

    this.http.get('assets/dataTable/Spanish.json').subscribe((translation) => {
      $(document).ready(function () {
        $('#dataTable').DataTable({
          paging: true,
          pageLength: 50,
          searching: true,
          ordering: true,
          order: [[0, 'desc']],
          columnDefs: [
            { width: '150px', targets: 3 },
            {
              targets: [0, 1],
              visible: false
            }
          ],
          language: translation
        });
      });
    });

    this.moverElementosDataTable();
  }


  moverElementosDataTable() {
    // **Move buttons outside the table after initialization**
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        const layoutRowElements = this.elementRef.nativeElement.querySelectorAll('.dt-layout-row:not(.dt-layout-table)');
        const buttonDatatableElement = this.elementRef.nativeElement.querySelector('#button_datatable');

        if (layoutRowElements.length >= 2 && buttonDatatableElement) {
          const layoutRowElement = layoutRowElements[1]; // Obtener el segundo elemento
          $(layoutRowElement).appendTo(buttonDatatableElement);
          observer.disconnect(); // Detiene la observación después de encontrar los elementos
        }
      });
    });

    observer.observe(this.elementRef.nativeElement, { childList: true, subtree: true });

    //esto es para agregar una clase
    const textcenter = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        const dataTableElement = document.querySelector('#dataTable');

        if (dataTableElement) {
          dataTableElement.classList.add('text-center');
          textcenter.disconnect(); // Detiene la observación después de encontrar el elemento
        }
      });
    });

    textcenter.observe(document.body, { childList: true, subtree: true });


    //esto es para la parte donde pones las filas a ver
    const length = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        const layoutRowElement = this.elementRef.nativeElement.querySelector('.dt-length');
        const buttonDatatableElement = this.elementRef.nativeElement.querySelector('#dt-length');

        if (layoutRowElement && buttonDatatableElement) {
          $(layoutRowElement).appendTo(buttonDatatableElement);
          length.disconnect(); // Detiene la observación después de encontrar los elementos
        }
      });
    });

    length.observe(this.elementRef.nativeElement, { childList: true, subtree: true });

    //esto es para el input del buscador
    const search = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        const layoutRowElement = this.elementRef.nativeElement.querySelector('.dt-search');
        const buttonDatatableElement = this.elementRef.nativeElement.querySelector('#dt-search');

        if (layoutRowElement && buttonDatatableElement) {
          $(layoutRowElement).appendTo(buttonDatatableElement);
          search.disconnect(); // Detiene la observación después de encontrar los elementos
        }
      });
    });

    search.observe(this.elementRef.nativeElement, { childList: true, subtree: true });
  }

  cerrarModalInfoPostPartido() {
    this.showModalPostPartido = false;
  }

  openInfoPostPartido(id: number) {
    // Obtener la información del partido por su ID
    this.trainingService.getPostPartidoByPostPartido(id.toString()).subscribe(
      (response) => {
        if (response.data) {
          // Asignar los datos del partido al objeto 'partido'
          this.postPartido = response.data;
          this.showModalPostPartido = true;
        }
      },
      (error) => {
        console.error('Error en la solicitud:', error);
      }
    );
  }

  datosResumentTotales(partidos: any[]) {
    let vic = 0;
    let emp = 0;
    let der = 0;
    let gf = 0;
    let gc = 0;
    let dg = 0;
    let pun = 0;

    // Obtener los primeros 5 resultados que realmente son los ultimos
    const ultimosResultados = this.partidos.slice(0, 5).map(partido => partido.resultado).reverse();

    for (let partido of partidos) {
      // Aquí dentro del bucle, puedes acceder a cada elemento de la lista como "partido"
      switch (partido.resultado) {
        case 'V':
          vic++;
          pun = pun + 3;
          break;
        case 'E':
          emp++;
          pun = pun + 1;
          break;
        case 'D':
          der++;
          break;
      }

      gf = gf + partido.golesAFavor;
      gc = gc + partido.golesEnContra;
      dg = gf - gc;
    }


    this.resumentotales = {
      equipo: this.nombreEquipo,
      partidos: this.partidos.length,
      victorias: vic,
      empates: emp,
      derrotas: der,
      gf: gf,
      gc: gc,
      dg: dg,
      puntos: pun,
      ultimos: ultimosResultados //['Ganado', 'Empatado', 'Perdido', 'Ganado', 'Ganado']
    };

  }

  verGraficaEquipo() {
    this.graficasEquipo = true;
    this.datosCargados = false;

    this.trainingService.getListGolesAvanzadoByTeamId(this.teamId).subscribe(
      (resp) => {
        if (resp.data) {
          this.golesAvanzadoAFavor = resp.data.golesAFavor || [];
          this.golesAvanzadoEnContra = resp.data.golesEnContra || [];
        }

        setTimeout(() => {
          this.graficaUnica(this.partidosReverse.map(partido => partido.golesAFavor), 'Goles a favor', 'Goles');
          this.graficaPrimera();
          this.createChart();
          this.createChartCategoryEnContra00();
          this.createChartCategoryEnContra01();
          // Inicializar "Goles por subcategoría" con la primera categoría que tenga subcategorías
          const conSub = this.golTypesConSubcategorias;
          if (conSub.length > 0 && !this.selectedGolTypes) {
            this.selectedGolTypes = conSub[0].name;
            this.createChartCategoryAFavor();
            this.createChartCategoryEnContra();
          }
        }, 100);
      },
      (error) => {
        console.error('Error en la solicitud:', error);
      }
    );
  }

  verTablaPlayers() {
    this.graficasEquipo = false;
    this.datosCargados = true;

  }

  changeGrafic(event: Event) {
    const selectedValue = (event.target as HTMLSelectElement).value;
    let data = [];
    let text = '';
    let label = '';
    switch (selectedValue) {
      case "1":
        data = this.partidosReverse.map(partido => partido.golesAFavor);
        text = 'Goles a favor';
        label = 'Goles';
        break;
      case "2":
        data = this.partidosReverse.map(partido => partido.golesEnContra);
        text = 'Goles en contra';
        label = 'Goles';
        break;
      case "3":
        data = this.partidosReverse.map(partido => partido.disparosAFavor);
        text = 'Disparos a favor';
        label = 'Nº de disparos';
        break;
      case "4":
        data = this.partidosReverse.map(partido => partido.disparosEnContra);
        text = 'Disparos en contra';
        label = 'Nº de disparos';
        break;
      case "5":
        data = this.partidosReverse.map(partido => partido.faltasRecibidas);
        text = 'Faltas a favor';
        label = 'Nº de faltas';
        break;
      case "6":
        data = this.partidosReverse.map(partido => partido.faltasCometidas);
        text = 'Faltas en contra';
        label = 'Nº de faltas';
        break;
      case "7":
        data = this.partidosReverse.map(partido => partido.cornersAFavor);
        text = 'Corners a favor';
        label = 'Nº de corners';
        break;
      case "8":
        data = this.partidosReverse.map(partido => partido.cornersEnContra);
        text = 'Corners en contra';
        label = 'Nº de corners';
        break;
      case "9":
        data = this.partidosReverse.map(partido => partido.llegadasPeligroAFavor);
        text = 'Llegadas con peligro a favor';
        label = 'Nº de llegadas con peligro';
        break;
      case "10":
        data = this.partidosReverse.map(partido => partido.llegadasPeligroEnContra);
        text = 'Llegadas con peligro en contra';
        label = 'Nº de llegadas con peligro';
        break;
      case "11":
        data = this.partidosReverse.map(partido => partido.penaltisAFavor);
        text = 'Penaltis a favor';
        label = 'Nº de penaltis';
        break;
      case "12":
        data = this.partidosReverse.map(partido => partido.penaltisEnContra);
        text = 'Penaltis en contra';
        label = 'Nº de penaltis';
        break;
      case "13":
        data = this.partidosReverse.map(partido => partido.tarjetasAmarillas);
        text = 'Tarjetas amarillas';
        label = 'Nº de tarjetas';
        break;
      case "14":
        data = this.partidosReverse.map(partido => partido.tarjetasRojas);
        text = 'Tarjetas rojas';
        label = 'Nº de tarjetas';
        break;
      default:
        console.log("Opción no reconocida");
        break;
    }

    this.graficaUnica(data, text, label);
  }

  graficaUnica(data: any, text: string, label: string) {
    const canvas = document.getElementById('barChartSegunda') as HTMLCanvasElement;
    if (!canvas) return;
    if (this.barChartSegunda) {
      this.barChartSegunda.destroy();
      this.barChartSegunda = null;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(49, 178, 112, 0.92)');
    gradient.addColorStop(0.6, 'rgba(49, 178, 112, 0.75)');
    gradient.addColorStop(1, 'rgba(0, 44, 64, 0.7)');

    const labels = this.partidosReverse.map(partido => partido.matchPreparation.rivalName);

    this.barChartSegunda = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label,
          data,
          backgroundColor: gradient,
          borderColor: CHART_COLOR_PRIMARY,
          borderWidth: 1,
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 2.2,
        plugins: {
          title: {
            display: true,
            text,
            font: { size: 16, weight: 'bold' },
            color: CHART_COLOR_NIGHT,
            padding: { bottom: 16 }
          },
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0, 44, 64, 0.08)' },
            ticks: { color: CHART_COLOR_NIGHT, font: { size: 11 } }
          },
          x: {
            grid: { display: false },
            ticks: { color: CHART_COLOR_NIGHT, font: { size: 11 }, maxRotation: 45, minRotation: 0 }
          }
        }
      }
    });
  }

  graficaPrimera() {
    if (this.pieChartResultados) {
      this.pieChartResultados.destroy();
      this.pieChartResultados = null;
    }
    const chartLabelsEl = document.getElementById('chartLabels');
    if (chartLabelsEl) chartLabelsEl.innerHTML = '';

    const canvas = document.getElementById('pieChart') as HTMLCanvasElement;
    if (!canvas || !canvas.getContext('2d')) return;

    const colors = [
      'rgba(49, 178, 112, 0.85)',   // victorias - verde
      'rgba(220, 53, 69, 0.85)',   // derrotas - rojo
      'rgba(108, 117, 125, 0.85)'  // empates - gris
    ];
    const borders = ['rgba(49, 178, 112, 1)', 'rgba(220, 53, 69, 1)', 'rgba(108, 117, 125, 1)'];

    const victorias = this.resumentotales?.victorias ?? 0;
    const derrotas = this.resumentotales?.derrotas ?? 0;
    const empates = this.resumentotales?.empates ?? 0;
    const total = victorias + derrotas + empates;

    // Si todos son 0, Chart.js no dibuja segmentos; usamos valores placeholder para que el gráfico se vea
    const dataValues = total > 0
      ? [victorias, derrotas, empates]
      : [1, 1, 1];

    this.pieChartResultados = new Chart(canvas, {
      type: 'pie',
      data: {
        labels: ['Victorias', 'Derrotas', 'Empates'],
        datasets: [{
          data: dataValues,
          backgroundColor: colors,
          borderColor: borders,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 1,
        layout: {
          padding: { top: 8, bottom: 8, left: 8, right: 8 }
        },
        plugins: {
          legend: { position: 'top' },
          title: {
            display: true,
            text: total > 0 ? 'Resultados de partidos' : 'Resultados de partidos (sin datos)',
            font: { size: 16, weight: 'bold' },
            color: CHART_COLOR_NIGHT,
            padding: { bottom: 12 }
          }
        }
      }
    });

    const pieChartLabels = this.pieChartResultados.config.data.labels as string[];
    if (chartLabelsEl && pieChartLabels) {
      if (total > 0) {
        (dataValues as number[]).forEach((value, index) => {
          const percent = Math.round((value / total) * 100);
          const div = document.createElement('div');
          div.textContent = `${pieChartLabels[index]}: ${percent}%`;
          div.style.color = borders[index];
          div.style.marginBottom = '6px';
          div.style.fontWeight = '600';
          chartLabelsEl.appendChild(div);
        });
      } else {
        const div = document.createElement('div');
        div.textContent = 'Sin partidos registrados';
        div.style.color = 'rgba(0, 44, 64, 0.6)';
        div.style.fontWeight = '600';
        chartLabelsEl.appendChild(div);
      }
    }
  }

  getEquipoColor(index: number, alpha: number): string {
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

  createChart() {
    if (this.lineChartPuntos) {
      this.lineChartPuntos.destroy();
      this.lineChartPuntos = null;
    }
    const labels: string[] = [];
    const points: number[] = [];
    let sum = 0;
    for (let index = this.partidos.length - 1; index >= 0; index--) {
      labels.push(this.partidos[index].matchPreparation.rivalName);
      if (this.partidos[index].resultado === 'V') sum += 3;
      else if (this.partidos[index].resultado === 'E') sum += 1;
      points.push(sum);
    }
    const canvas = document.getElementById('myChart') as HTMLCanvasElement;
    if (!canvas || !canvas.getContext('2d')) return;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(49, 178, 112, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 44, 64, 0.1)');

    this.lineChartPuntos = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Puntos acumulados',
          data: points,
          backgroundColor: gradient,
          borderColor: CHART_COLOR_PRIMARY,
          borderWidth: 2,
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 2,
        plugins: {
          title: {
            display: true,
            text: 'Puntos por partido',
            font: { size: 16, weight: 'bold' },
            color: CHART_COLOR_NIGHT,
            padding: { bottom: 12 }
          },
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0, 44, 64, 0.08)' },
            ticks: { color: CHART_COLOR_NIGHT, font: { size: 11 } }
          },
          x: {
            grid: { display: false },
            ticks: { color: CHART_COLOR_NIGHT, font: { size: 11 }, maxRotation: 45, minRotation: 0 }
          }
        }
      }
    });
  }

  onSelectGolTypes(event: any): void {
    const value = event?.target?.value ?? event ?? '';
    if (value === 'Falta disparo directo' || value === 'Penalti' || value === 'En propia' || value === '') {
      this.selectedGolTypes = value || '';
      this.selectedSubGolTypes = '';
      this.destroySubcategoriaCharts();
    } else {
      this.selectedGolTypes = value;
      this.selectedSubGolTypes = '';
      this.createChartCategoryAFavor();
      this.createChartCategoryEnContra();
    }
  }

  hasSubcategorias(categoryName: string): boolean {
    const cat = this.golTypes.find(c => c.name === categoryName);
    return !!(cat?.subcategories?.length);
  }

  getSubcategoriaEmptyMessage(): string {
    if (!this.selectedGolTypes) return 'Selecciona una categoría para ver goles por subcategoría.';
    const cat = this.golTypes.find(c => c.name === this.selectedGolTypes);
    if (cat && (!cat.subcategories || cat.subcategories.length === 0))
      return 'Esta categoría no tiene subcategorías.';
    return 'Selecciona una categoría para ver goles por subcategoría.';
  }

  private destroySubcategoriaCharts(): void {
    if (this.barChartCuarta) {
      this.barChartCuarta.destroy();
      this.barChartCuarta = null;
    }
    if (this.barChartQuinta) {
      this.barChartQuinta.destroy();
      this.barChartQuinta = null;
    }
  }

  onSelectSubGolTypes(event: any): void {
    this.selectedSubGolTypes = event.target.value;
  }

  getSubGolTypes(): any[] {
    const selectedGolTypes = this.golTypes.find(cat => cat.name === this.selectedGolTypes);
    this.listSub = selectedGolTypes!.subcategories;
    return selectedGolTypes ? selectedGolTypes.subcategories : [];
  }

  /** Obtiene todas las opciones únicas para la categoría seleccionada (desde golTypes y desde datos) */
  private getOpcionesParaCategoria(categoryName: string, goles: GolPostPartido[]): string[] {
    const cat = this.golTypes.find(c => c.name === categoryName);
    const fromSchema = new Set<string>();
    if (cat?.subcategories) {
      cat.subcategories.forEach((sub: any) => {
        (sub.options || []).forEach((opt: string) => fromSchema.add(opt));
      });
    }
    goles.filter(g => g.category === categoryName).forEach(g => {
      if (g.option?.trim()) fromSchema.add(g.option.trim());
    });
    return Array.from(fromSchema).sort();
  }

  /** Paleta de colores para datasets de subcategoría (fallback plano) */
  private readonly SUBCHART_COLORS = [
    'rgba(49, 178, 112, 0.75)',
    'rgba(0, 77, 110, 0.75)',
    'rgba(235, 81, 54, 0.6)',
    'rgba(250, 150, 0, 0.7)',
    'rgba(108, 117, 125, 0.7)',
    'rgba(14, 235, 198, 0.6)',
    'rgba(62, 14, 235, 0.55)',
    'rgba(250, 0, 250, 0.5)',
    'rgba(133, 250, 0, 0.6)',
    'rgba(0, 108, 250, 0.6)',
  ];

  /** Degradados premium [top, bottom] para barras de subcategoría (a favor: verdes/azules) */
  private readonly SUBCHART_GRADIENT_FAVOR: [string, string][] = [
    ['rgba(49, 178, 112, 0.95)', 'rgba(0, 77, 110, 0.85)'],
    ['rgba(72, 195, 140, 0.9)', 'rgba(0, 44, 64, 0.8)'],
    ['rgba(14, 235, 198, 0.85)', 'rgba(0, 77, 110, 0.75)'],
    ['rgba(133, 250, 0, 0.75)', 'rgba(49, 178, 112, 0.7)'],
    ['rgba(0, 108, 250, 0.8)', 'rgba(0, 44, 64, 0.7)'],
    ['rgba(62, 14, 235, 0.7)', 'rgba(0, 44, 64, 0.65)'],
    ['rgba(250, 150, 0, 0.8)', 'rgba(180, 100, 0, 0.7)'],
    ['rgba(108, 117, 125, 0.75)', 'rgba(0, 44, 64, 0.6)'],
    ['rgba(250, 0, 250, 0.55)', 'rgba(120, 0, 120, 0.5)'],
    ['rgba(235, 81, 54, 0.7)', 'rgba(180, 40, 30, 0.65)'],
  ];

  /** Degradados premium para barras de subcategoría (en contra: rojos/oscuros) */
  private readonly SUBCHART_GRADIENT_CONTRA: [string, string][] = [
    ['rgba(220, 53, 69, 0.9)', 'rgba(0, 44, 64, 0.85)'],
    ['rgba(235, 81, 54, 0.85)', 'rgba(140, 30, 20, 0.8)'],
    ['rgba(250, 100, 80, 0.75)', 'rgba(0, 44, 64, 0.7)'],
    ['rgba(180, 80, 100, 0.75)', 'rgba(0, 44, 64, 0.65)'],
    ['rgba(0, 77, 110, 0.7)', 'rgba(0, 44, 64, 0.6)'],
    ['rgba(108, 117, 125, 0.7)', 'rgba(0, 44, 64, 0.6)'],
    ['rgba(250, 150, 0, 0.7)', 'rgba(150, 80, 0, 0.6)'],
    ['rgba(62, 14, 235, 0.6)', 'rgba(30, 0, 100, 0.55)'],
    ['rgba(14, 235, 198, 0.6)', 'rgba(0, 77, 110, 0.55)'],
    ['rgba(49, 178, 112, 0.6)', 'rgba(0, 44, 64, 0.5)'],
  ];

  /** Crea degradado vertical para una barra (estilo premium) */
  private getSubchartBarGradient(
    ctx: CanvasRenderingContext2D,
    context: { element?: { y: number; base: number }; datasetIndex: number },
    gradientStops: [string, string][]
  ): string | CanvasGradient {
    const el = context.element;
    if (!el || typeof el.y !== 'number' || typeof el.base !== 'number') {
      const idx = context.datasetIndex % gradientStops.length;
      return gradientStops[idx][0];
    }
    const gradient = ctx.createLinearGradient(0, el.y, 0, el.base);
    const [top, bottom] = gradientStops[context.datasetIndex % gradientStops.length];
    gradient.addColorStop(0, top);
    gradient.addColorStop(1, bottom);
    return gradient;
  }

  createChartCategoryAFavor() {
    if (this.barChartCuarta) {
      this.barChartCuarta.destroy();
      this.barChartCuarta = null;
    }

    const selectedCat = this.golTypes.find(c => c.name === this.selectedGolTypes);
    if (!selectedCat?.subcategories?.length) return;

    this.listSub = selectedCat.subcategories;
    this.listLabels = this.listSub.map((s: any) => s.name);
    const opciones = this.getOpcionesParaCategoria(this.selectedGolTypes, this.golesAvanzadoAFavor);

    const rawDatasets = opciones.map((opt, idx) => {
      const data = this.listLabels.map(subName => {
        return this.golesAvanzadoAFavor.filter(
          g => g.category === this.selectedGolTypes && g.subCategory === subName && (g.option || '').trim() === opt
        ).length;
      });
      return { label: opt, data, colorIndex: idx };
    });
    const datasets = rawDatasets.filter(ds => ds.data.some(v => v > 0)).map((ds, i) => ({
      label: ds.label,
      data: ds.data,
      backgroundColor: (context: any) =>
        this.getSubchartBarGradient(context.chart?.ctx, context, this.SUBCHART_GRADIENT_FAVOR),
      borderColor: 'rgba(0, 44, 64, 0.2)',
      borderWidth: 1,
      borderRadius: 8,
      borderSkipped: false,
    }));

    const ctx = document.getElementById('barChartCategoria') as HTMLCanvasElement;
    if (!ctx) return;

    this.barChartCuarta = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.listLabels,
        datasets: datasets.length ? datasets : [{
          label: 'Sin datos',
          data: this.listLabels.map(() => 0),
          backgroundColor: 'rgba(0,44,64,0.12)',
          borderRadius: 8,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 1.8,
        plugins: {
          title: {
            display: true,
            text: 'Goles a favor',
            font: { size: 15, weight: 'bold' },
            color: CHART_COLOR_NIGHT,
            padding: { bottom: 12 },
          },
          legend: { position: 'top', labels: { boxWidth: 14, padding: 12, usePointStyle: true } },
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: { color: CHART_COLOR_NIGHT, font: { size: 11 }, maxRotation: 45, minRotation: 0 },
          },
          y: {
            stacked: true,
            beginAtZero: true,
            grid: { color: 'rgba(0, 44, 64, 0.08)' },
            ticks: { color: CHART_COLOR_NIGHT, font: { size: 11 } },
          },
        },
      },
    });
  }

  createChartCategoryEnContra() {
    if (this.barChartQuinta) {
      this.barChartQuinta.destroy();
      this.barChartQuinta = null;
    }

    const selectedCat = this.golTypes.find(c => c.name === this.selectedGolTypes);
    if (!selectedCat?.subcategories?.length) return;

    const listLabels = selectedCat.subcategories.map((s: any) => s.name);
    const opciones = this.getOpcionesParaCategoria(this.selectedGolTypes, this.golesAvanzadoEnContra);

    const rawDatasets = opciones.map((opt, idx) => {
      const data = listLabels.map(subName => {
        return this.golesAvanzadoEnContra.filter(
          g => g.category === this.selectedGolTypes && g.subCategory === subName && (g.option || '').trim() === opt
        ).length;
      });
      return { label: opt, data, colorIndex: idx };
    });
    const datasets = rawDatasets.filter(ds => ds.data.some(v => v > 0)).map((ds, i) => ({
      label: ds.label,
      data: ds.data,
      backgroundColor: (context: any) =>
        this.getSubchartBarGradient(context.chart?.ctx, context, this.SUBCHART_GRADIENT_CONTRA),
      borderColor: 'rgba(0, 44, 64, 0.2)',
      borderWidth: 1,
      borderRadius: 8,
      borderSkipped: false,
    }));

    const ctx = document.getElementById('barChartCategoria2') as HTMLCanvasElement;
    if (!ctx) return;

    this.barChartQuinta = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: listLabels,
        datasets: datasets.length ? datasets : [{
          label: 'Sin datos',
          data: listLabels.map(() => 0),
          backgroundColor: 'rgba(220,53,69,0.12)',
          borderRadius: 8,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 1.8,
        plugins: {
          title: {
            display: true,
            text: 'Goles en contra',
            font: { size: 15, weight: 'bold' },
            color: CHART_COLOR_NIGHT,
            padding: { bottom: 12 },
          },
          legend: { position: 'top', labels: { boxWidth: 14, padding: 12, usePointStyle: true } },
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: { color: CHART_COLOR_NIGHT, font: { size: 11 }, maxRotation: 45, minRotation: 0 },
          },
          y: {
            stacked: true,
            beginAtZero: true,
            grid: { color: 'rgba(0, 44, 64, 0.08)' },
            ticks: { color: CHART_COLOR_NIGHT, font: { size: 11 } },
          },
        },
      },
    });
  }

  createChartCategoryEnContra00() {
    const canvas = document.getElementById('barChartCategoria00') as HTMLCanvasElement;
    if (!canvas) {
      console.error('No se encontró el elemento canvas');
      return;
    }

    // Antes de crear el nuevo gráfico, destruye el gráfico existente si es necesario
    if (this.barChartSexta) {
      this.barChartSexta.destroy(); // Destruye el gráfico existente
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('No se pudo obtener el contexto del elemento canvas');
      return;
    }

    // Crear arrays de datos y etiquetas desde this.players
    const labels = this.golTypes.map(partido => partido.name);
    let gol = 0;
    let goles: any[] = [];
    for (let i = 0; i < this.golTypes.length; i++) {
      gol = 0;
      for (let a = 0; a < this.golesAvanzadoAFavor.length; a++) {
        if (this.golesAvanzadoAFavor[a].category === this.golTypes[i].name)
          gol++;
      }
      goles.push(gol);
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(49, 178, 112, 0.9)');
    gradient.addColorStop(1, 'rgba(0, 44, 64, 0.75)');

    this.barChartSexta = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Nº de goles',
          data: goles,
          backgroundColor: gradient,
          borderColor: CHART_COLOR_PRIMARY,
          borderWidth: 1,
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 2,
        plugins: {
          title: {
            display: true,
            text: 'Goles a Favor',
            font: { size: 16, weight: 'bold' },
            color: CHART_COLOR_NIGHT,
            padding: { bottom: 12 }
          },
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0, 44, 64, 0.08)' },
            ticks: { color: CHART_COLOR_NIGHT, font: { size: 11 } }
          },
          x: {
            grid: { display: false },
            ticks: { color: CHART_COLOR_NIGHT, font: { size: 11 }, maxRotation: 45, minRotation: 0 }
          }
        }
      }
    });
  }

  createChartCategoryEnContra01() {
    const canvas = document.getElementById('barChartCategoria01') as HTMLCanvasElement;
    if (!canvas) {
      console.error('No se encontró el elemento canvas');
      return;
    }

    // Antes de crear el nuevo gráfico, destruye el gráfico existente si es necesario
    if (this.barChartSeptima) {
      this.barChartSeptima.destroy(); // Destruye el gráfico existente
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('No se pudo obtener el contexto del elemento canvas');
      return;
    }

    // Crear arrays de datos y etiquetas desde this.players
    const labels = this.golTypes.map(partido => partido.name);
    let gol = 0;
    let goles: any[] = [];
    for (let i = 0; i < this.golTypes.length; i++) {
      gol = 0;
      for (let a = 0; a < this.golesAvanzadoEnContra.length; a++) {
        if (this.golesAvanzadoEnContra[a].category === this.golTypes[i].name)
          gol++;
      }
      goles.push(gol);
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(220, 53, 69, 0.85)');
    gradient.addColorStop(1, 'rgba(0, 44, 64, 0.7)');

    this.barChartSeptima = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Nº de goles',
          data: goles,
          backgroundColor: gradient,
          borderColor: '#dc3545',
          borderWidth: 1,
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 2,
        plugins: {
          title: {
            display: true,
            text: 'Goles en Contra',
            font: { size: 16, weight: 'bold' },
            color: CHART_COLOR_NIGHT,
            padding: { bottom: 12 }
          },
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0, 44, 64, 0.08)' },
            ticks: { color: CHART_COLOR_NIGHT, font: { size: 11 } }
          },
          x: {
            grid: { display: false },
            ticks: { color: CHART_COLOR_NIGHT, font: { size: 11 }, maxRotation: 45, minRotation: 0 }
          }
        }
      }
    });
  }

  getIcono(resultado: string): string {
    const iconos: { [key: string]: string } = {
      'V': '🟢',
      'E': '🟡',
      'D': '🔴'
    };
    return iconos[resultado] || '❓';
  }

  getIconoTerreno(terreno: string): string {
    const iconos: { [key: string]: string } = {
      'Local': '🏠',
      'Visitante': '✈️'
    };
    return iconos[terreno] || '❓';
  }

}
