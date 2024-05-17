import { Component, ElementRef, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PlayerService } from 'src/app/core/services/player/player.service';
import { Response } from 'src/app/core/services/models/response.model';
import { PostPartido } from 'src/app/core/services/models/match.model';
import { TrainingService } from 'src/app/core/services/training/training.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import * as $ from 'jquery';
import 'datatables.net';
import { HttpClient } from '@angular/common/http';
import { Chart, ChartType, registerables } from 'chart.js/auto';
import { GolPostPartido } from 'src/app/core/services/team/team.model';
Chart.register(...registerables);

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
export class EstadisticasEquipoComponent implements OnInit {
  datosCargados: boolean = false;
  nombreEquipo: string = '';
  team: any;
  teamId!: number;
  partidos: any[] = [];
  partidosReverse: any[] = [];
  showModalPostPartido: boolean = false;
  postPartido: PostPartido = new PostPartido({});

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

  golAvanzadoAFavor: GolPostPartido = new GolPostPartido({});
  golesAvanzadoAFavor: GolPostPartido[] = [];

  golAvanzadoEnContra: GolPostPartido = new GolPostPartido({});
  golesAvanzadoEnContra: GolPostPartido[] = [];

  datasets: DatasetIF[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private playerService: PlayerService,
    private trainingService: TrainingService,
    private teamService: TeamService,
    private http: HttpClient,
    private elementRef: ElementRef) { }

  ngOnInit(): void {
    // Suscribirse a los cambios en los parámetros de la URL
    this.route.params.subscribe(params => {
      // Obtener el valor de teamId de los parámetros
      this.teamId = +params['teamId'];  // El + convierte el valor a número
      console.log('teamId:', this.teamId);
    });
    this.cargarNombreEquipo();
  }

  // Método para navegar a la pantalla de calendario
  navegarACalendario(): void {
    // Puedes ajustar la ruta según tu estructura de rutas
    this.router.navigate(['/dashboard/calendario', this.teamId]);
  }

  cargarNombreEquipo() {
    this.teamService.getTeamById(this.teamId.toString()).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.team = response.data;
          this.nombreEquipo = this.team.name;
          this.getListaPostpartidos();
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  getListaPostpartidos() {
    this.playerService.getListPostPartidoByTeam(this.teamId.toString()).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response && response.data && Array.isArray(response.data)) {
          // Mapea los datos bajo 'data' a instancias del modelo Team
          this.partidos = response.data; //.map((post: PostPartido) => new PostPartido(post));
          this.partidosReverse = this.partidos.slice().reverse();
          // Inicializar el DataTable después de cargar los datos
          this.inicializarDataTable();
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
          this.golesAvanzadoAFavor = resp.data.golesAFavor;
          this.golesAvanzadoEnContra = resp.data.golesEnContra;
        }

        setTimeout(() => {
          this.graficaUnica(this.partidosReverse.map(partido => partido.golesAFavor), 'Goles a favor', 'Goles');
          this.graficaPrimera();
          this.createChart();
          this.createChartCategoryEnContra00();
          this.createChartCategoryEnContra01();
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
      case "1":
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
    if (!canvas) {
      console.error('No se encontró el elemento canvas');
      return;
    }

    // Antes de crear el nuevo gráfico, destruye el gráfico existente si es necesario
    if (this.barChartSegunda) {
      this.barChartSegunda.destroy(); // Destruye el gráfico existente
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('No se pudo obtener el contexto del elemento canvas');
      return;
    }

    // Crear arrays de datos y etiquetas desde this.players
    const labels = this.partidosReverse.map(partido => partido.matchPreparation.rivalName);

    // Asignar colores consistentes basados en el playerId
    const backgroundColors = this.partidosReverse.map(partido => this.getEquipoColor(partido.postPartidoId, 0.2));
    const borderColors = this.partidosReverse.map(partido => this.getEquipoColor(partido.postPartidoId, 1));

    this.barChartSegunda = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: label,
          data: data,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: text
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

  graficaPrimera() {
    const ctx = document.getElementById('pieChart') as HTMLCanvasElement;
    const pieChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Victorias', 'Derrotas', 'Empates'],
        datasets: [{
          label: 'Dataset',
          data: [this.resumentotales.victorias, this.resumentotales.derrotas, this.resumentotales.empates],
          backgroundColor: [
            'rgba(27, 255, 0, 0.5)',
            'rgba(255, 45, 0, 0.5)',
            'rgba(169, 169, 169, 0.5)'
          ],
          borderColor: [
            'rgba(27, 255, 0, 1)',
            'rgba(255, 45, 0, 1)',
            'rgba(169, 169, 169, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Resultados de partidos'
          }
        }
      }
    });

    // Agregar etiquetas de porcentaje
    const pieChartData = pieChart.config.data.datasets[0].data;
    const pieChartLabels = pieChart.config.data.labels;

    pieChartData.forEach((value, index) => {
      const percent = Math.round(value / pieChartData.reduce((a, b) => a + b, 0) * 100);
      const label = `${pieChartLabels![index]}: ${percent}%`;

      const div = document.createElement('div');
      div.textContent = label;
      const datasets = pieChart.config.data.datasets;
      if (datasets.length > 0) {
        const backgroundColor = datasets[0].backgroundColor as string[];
        if (backgroundColor && backgroundColor[index]) {
          div.style.color = backgroundColor[index];
        }
      }

      div.style.marginBottom = '5px';

      document.getElementById('chartLabels')!.appendChild(div);

    });
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
    let labels: any = [];
    let points: any = [];
    let sum = 0;
    //for (let index = 0; index < this.partidos.length; index++) {
    for (let index = this.partidos.length - 1; index >= 0; index--) {
      labels.push(this.partidos[index].matchPreparation.rivalName);

      if (this.partidos[index].resultado === 'V') {
        sum = sum + 3;
      } else if (this.partidos[index].resultado === 'E') {
        sum = sum + 1;
      }

      points.push(sum);
    }

    const data = {
      labels: labels,
      datasets: [{
        label: 'Puntos por partido',
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        borderColor: 'rgb(54, 162, 235)',
        borderWidth: 1,
        data: points,
      }]
    };
    const ctx = document.getElementById('myChart') as HTMLCanvasElement;
    new Chart(ctx, {
      type: 'line',
      data,
      options: {
        scales: {
          x: {
            border: {
              color: 'red'
            }
          }
        }
      }
    });
  }

  onSelectGolTypes(event: any): void {
    if (event.target.value === 'Falta disparo directo' || event.target.value === 'Penalti') {
      //no va haber nada mas
      this.selectedGolTypes = '';
      this.selectedSubGolTypes = '';
    } else {
      this.selectedGolTypes = event.target.value;
      this.selectedSubGolTypes = '';
      this.createChartCategoryAFavor();
      this.createChartCategoryEnContra();
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

  createChartCategoryAFavor() {
    // Antes de crear el nuevo gráfico, destruye el gráfico existente si es necesario
    if (this.barChartCuarta) {
      this.barChartCuarta.destroy(); // Destruye el gráfico existente
    }

    const selectedGolTypes = this.golTypes.find(cat => cat.name === this.selectedGolTypes);
    this.listSub = selectedGolTypes!.subcategories;
    this.listLabels = [];
    for (let a = 0; a < this.listSub.length; a++) {
      this.listLabels.push(this.listSub[a].name);
    }

    let uno: number = 0;
    let dos: number = 0;
    let tres: number = 0;
    let unoA: any = [];
    let dosA: any = [];
    let tresA: any = [];
    //necesito saber la categoria, la subcategoria y luego defiir el resultado a la opcion correcta

    for (let e = 0; e < this.listLabels.length; e++) { //5
      for (let f = 0; f < this.golesAvanzadoAFavor.length; f++) { //5
        if (this.golesAvanzadoAFavor[f].category === this.selectedGolTypes) { //3 
          if (this.golesAvanzadoAFavor[f].subCategory === this.listLabels[e]) {
            switch (this.golesAvanzadoAFavor[f].option) {
              case 'Tiro a portería':
                uno++;
                break;
              case 'Remate de cabeza':
                dos++;
                break;
              case 'Otra parte del cuerpo':
                tres++;
                break;

              default:
                break;
            }
          }
        }

      }
      unoA.push(uno);
      dosA.push(dos);
      tresA.push(tres);

      uno = 0;
      dos = 0;
      tres = 0;
    }

    const data = {
      labels: this.listLabels,
      datasets: [
        {
          label: 'Tiro a portería',
          data: unoA,
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
        },
        {
          label: 'Remate de cabeza',
          data: dosA,
          backgroundColor: 'rgba(250, 0, 25, 0.5)',
        },
        {
          label: 'Otra parte del cuerpo',
          data: tresA,
          backgroundColor: 'rgba(62, 14, 235, 0.5)',
        },
      ]
    };

    const ctx = document.getElementById('barChartCategoria') as HTMLCanvasElement;
    this.barChartCuarta = new Chart(ctx, {
      type: 'bar',
      data: data,
      options: {
        plugins: {
          title: {
            display: true,
            text: 'Goles a favor'
          },
        },
        responsive: true,
        scales: {
          x: {
            stacked: true,
          },
          y: {
            stacked: true
          }
        }
      }
    });
  }

  createChartCategoryEnContra() {
    // Antes de crear el nuevo gráfico, destruye el gráfico existente si es necesario
    if (this.barChartQuinta) {
      this.barChartQuinta.destroy(); // Destruye el gráfico existente
    }

    const selectedGolTypes = this.golTypes.find(cat => cat.name === this.selectedGolTypes);
    this.listSub = selectedGolTypes!.subcategories;
    this.listLabels = [];
    for (let a = 0; a < this.listSub.length; a++) {
      this.listLabels.push(this.listSub[a].name);
    }

    let uno: number = 0;
    let dos: number = 0;
    let tres: number = 0;
    let unoA: any = [];
    let dosA: any = [];
    let tresA: any = [];
    //necesito saber la categoria, la subcategoria y luego defiir el resultado a la opcion correcta

    for (let e = 0; e < this.listLabels.length; e++) { //5
      for (let f = 0; f < this.golesAvanzadoEnContra.length; f++) { //5
        if (this.golesAvanzadoEnContra[f].category === this.selectedGolTypes) { //3 
          if (this.golesAvanzadoEnContra[f].subCategory === this.listLabels[e]) {
            switch (this.golesAvanzadoEnContra[f].option) {
              case 'Tiro a portería':
                uno++;
                break;
              case 'Remate de cabeza':
                dos++;
                break;
              case 'Otra parte del cuerpo':
                tres++;
                break;

              default:
                break;
            }
          }
        }

      }
      unoA.push(uno);
      dosA.push(dos);
      tresA.push(tres);

      uno = 0;
      dos = 0;
      tres = 0;
    }

    const data = {
      labels: this.listLabels,
      datasets: [
        {
          label: 'Tiro a portería',
          data: unoA,
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
        },
        {
          label: 'Remate de cabeza',
          data: dosA,
          backgroundColor: 'rgba(250, 0, 25, 0.5)',
        },
        {
          label: 'Otra parte del cuerpo',
          data: tresA,
          backgroundColor: 'rgba(62, 14, 235, 0.5)',
        },
      ]
    };

    const ctx = document.getElementById('barChartCategoria2') as HTMLCanvasElement;
    this.barChartQuinta = new Chart(ctx, {
      type: 'bar',
      data: data,
      options: {
        plugins: {
          title: {
            display: true,
            text: 'Goles en contra'
          },
        },
        responsive: true,
        scales: {
          x: {
            stacked: true,
          },
          y: {
            stacked: true
          }
        }
      }
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

    // Asignar colores consistentes basados en el playerId
    const backgroundColors = this.golesAvanzadoAFavor.map(partido => this.getEquipoColor(partido.golPostPartidoId, 0.2));
    const borderColors = this.golesAvanzadoAFavor.map(partido => this.getEquipoColor(partido.golPostPartidoId, 1));

    this.barChartSexta = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Nº de goles',
          data: goles,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Goles a Favor'
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

    // Asignar colores consistentes basados en el playerId
    const backgroundColors = this.golesAvanzadoEnContra.map(partido => this.getEquipoColor(partido.golPostPartidoId, 0.2));
    const borderColors = this.golesAvanzadoEnContra.map(partido => this.getEquipoColor(partido.golPostPartidoId, 1));

    this.barChartSeptima = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Nº de goles',
          data: goles,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Goles en Contra'
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

}
