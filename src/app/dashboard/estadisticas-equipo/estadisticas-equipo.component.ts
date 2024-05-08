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
Chart.register(...registerables);


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
    setTimeout(() => {
      this.graficaUnica(this.partidos.map(partido => partido.golesAFavor), 'Goles a favor', 'Goles');
      this.graficaPrimera();
    }, 100);

    /*setTimeout(() => {
      this.cargarMinutosGraficoBarras();
      this.cargarGolesGraficoBarras();
    }, 100);*/
    this.graficasEquipo = true;
    this.datosCargados = false;
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
        data = this.partidos.map(partido => partido.golesAFavor);
        text = 'Goles a favor';
        label = 'Goles';
        break;
      case "2":
        data = this.partidos.map(partido => partido.golesEnContra);
        text = 'Goles en contra';
        label = 'Goles';
        break;
      case "3":
        data = this.partidos.map(partido => partido.disparosAFavor);
        text = 'Disparos a favor';
        label = 'Nº de disparos';
        break;
      case "4":
        data = this.partidos.map(partido => partido.disparosEnContra);
        text = 'Disparos en contra';
        label = 'Nº de disparos';
        break;
      case "5":
        data = this.partidos.map(partido => partido.faltasRecibidas);
        text = 'Faltas a favor';
        label = 'Nº de faltas';
        break;
      case "6":
        data = this.partidos.map(partido => partido.faltasCometidas);
        text = 'Faltas en contra';
        label = 'Nº de faltas';
        break;
      case "7":
        data = this.partidos.map(partido => partido.cornersAFavor);
        text = 'Corners a favor';
        label = 'Nº de corners';
        break;
      case "8":
        data = this.partidos.map(partido => partido.cornersEnContra);
        text = 'Corners en contra';
        label = 'Nº de corners';
        break;
      case "9":
        data = this.partidos.map(partido => partido.llegadasPeligroAFavor);
        text = 'Llegadas con peligro a favor';
        label = 'Nº de llegadas con peligro';
        break;
      case "10":
        data = this.partidos.map(partido => partido.llegadasPeligroEnContra);
        text = 'Llegadas con peligro en contra';
        label = 'Nº de llegadas con peligro';
        break;
      case "1":
        data = this.partidos.map(partido => partido.penaltisAFavor);
        text = 'Penaltis a favor';
        label = 'Nº de penaltis';
        break;
      case "12":
        data = this.partidos.map(partido => partido.penaltisEnContra);
        text = 'Penaltis en contra';
        label = 'Nº de penaltis';
        break;
      case "13":
        data = this.partidos.map(partido => partido.tarjetasAmarillas);
        text = 'Tarjetas amarillas';
        label = 'Nº de tarjetas';
        break;
      case "14":
        data = this.partidos.map(partido => partido.tarjetasRojas);
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
    const labels = this.partidos.map(partido => partido.matchPreparation.rivalName);

    // Asignar colores consistentes basados en el playerId
    const backgroundColors = this.partidos.map(partido => this.getEquipoColor(partido.postPartidoId, 0.2));
    const borderColors = this.partidos.map(partido => this.getEquipoColor(partido.postPartidoId, 1));

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
            'rgba(75, 192, 192, 0.5)',
            'rgba(255, 99, 132, 0.5)',
            'rgba(169, 169, 169, 0.5)'
          ],
          borderColor: [
            'rgba(75, 192, 192, 1)',
            'rgba(255, 99, 132, 1)',
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

}
