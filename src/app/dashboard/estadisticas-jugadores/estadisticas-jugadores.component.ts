import { Component, ElementRef, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PlayerService } from 'src/app/core/services/player/player.service';
import { Response } from 'src/app/core/services/models/response.model';
import { PostPartido } from 'src/app/core/services/models/match.model';
import { PlayerEstadistica } from 'src/app/core/services/player/player.model';
import * as $ from 'jquery';
import 'datatables.net';
import { HttpClient } from '@angular/common/http';
import { Chart, registerables } from 'chart.js/auto';
import { TrainingService } from 'src/app/core/services/training/training.service';
Chart.register(...registerables);

@Component({
  selector: 'app-estadisticas-jugadores',
  templateUrl: './estadisticas-jugadores.component.html',
  styleUrls: ['./estadisticas-jugadores.component.scss']
})
export class EstadisticasJugadoresComponent implements OnInit {

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

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private playerService: PlayerService,
    private http: HttpClient,
    private trainingService: TrainingService,
    private elementRef: ElementRef) { }

  ngOnInit(): void {
    // Suscribirse a los cambios en los parámetros de la URL
    this.route.params.subscribe(params => {
      // Obtener el valor de teamId de los parámetros
      this.teamId = +params['teamId'];  // El + convierte el valor a número
      console.log('teamId:', this.teamId);
    });
    this.cargarTablaJugadores();
  }

  // Método para navegar a la pantalla de calendario
  navegarACalendario(): void {
    // Puedes ajustar la ruta según tu estructura de rutas
    this.router.navigate(['/dashboard/calendario', this.teamId]);
  }

  cargarTablaJugadores() {
    this.playerService.getListPlayersEstadisticsByTeam(this.teamId.toString()).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response && response.data && Array.isArray(response.data.listDto)) {
          let resp = response;
          let list = (resp.data as { listDto: PlayerEstadistica[] }).listDto;
          // Mapea los datos bajo 'data' a instancias del modelo Team
          this.players = list; //.map((post: PostPartido) => new PostPartido(post));
          this.totalMatchs = resp.data.matchs;
          // Inicializar el DataTable después de cargar los datos
          this.inicializarDataTable();
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
          pageLength: 25,
          searching: true,
          ordering: true,
          order: [[0, 'desc']],
          columnDefs: [
            {
              targets: [0],
              visible: false
            }
          ],
          language: translation
        });
      });
    });

    this.moverElementosDataTable('dataTable');
  }


  moverElementosDataTable(name: string) {
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
        const dataTableElement = document.querySelector('#' + name);

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

  verGraficaPlayers() {
    setTimeout(() => {
      this.graficaUnica(this.players.map(player => player.minTotales), 'Minutos totales de los jugadores', 'Minutos');
    }, 100);

    /*setTimeout(() => {
      this.cargarMinutosGraficoBarras();
      this.cargarGolesGraficoBarras();
    }, 100);*/
    this.graficasPlayers = true;
    this.datosCargados = false;
    this.showGolesForPlayer();
  }

  verTablaPlayers() {
    this.inicializarDataTable();
    this.graficasPlayers = false;
    this.datosCargados = true;

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
    const canvas = document.getElementById('barChartUnica') as HTMLCanvasElement;
    if (!canvas) {
      console.error('No se encontró el elemento canvas');
      return;
    }

    // Antes de crear el nuevo gráfico, destruye el gráfico existente si es necesario
    if (this.barChartUnica) {
      this.barChartUnica.destroy(); // Destruye el gráfico existente
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('No se pudo obtener el contexto del elemento canvas');
      return;
    }

    // Crear arrays de datos y etiquetas desde this.players
    const labels = this.players.map(player => player.nombre);

    // Asignar colores consistentes basados en el playerId
    const backgroundColors = this.players.map(player => this.getPlayerColor(player.playerId, 0.2));
    const borderColors = this.players.map(player => this.getPlayerColor(player.playerId, 1));

    this.barChartUnica = new Chart(ctx, {
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
          this.updateDataTable();
        }
      },
      (error) => {
        console.error('Error en la solicitud:', error);
      }
    );
  }

  seleccionarIndices(event: any): void {
    let playerId = event !== 0 ? event.target.value : "0";
    if (playerId === "0") {
      this.golesAvanzadoAFavor = this.golesTodosAvanzadoAFavor;
    } else {
      this.golesAvanzadoAFavor = this.golesTodosAvanzadoAFavor.filter(gol => gol.playerId.toString() === playerId);
    }

    if(this.graficasPlayers)
      this.updateDataTable();
  } 
  
  updateDataTable(): void {
    const table = $('#dataTableGoles').DataTable();
    if (table) {
      table.clear().destroy();
    }

    this.http.get('assets/dataTable/Spanish.json').subscribe((translation: any) => {
      $(document).ready(() => {
        $('#dataTableGoles').DataTable({
          paging: true,
          pageLength: 10,
          searching: true,
          ordering: true,
          language: translation,
          data: this.golesAvanzadoAFavor,
          columns: [
            { data: null, render: (data, type, row, meta) => meta.row + 1 },
            { data: 'nombreGoleador' },
            { data: 'nombreAsistente' },
            { data: 'postPartido.matchPreparation.rivalName' },
            { data: 'minuto' },
            { data: 'postPartido.matchPreparation.matchDate' },
            { data: 'category' },
            { data: 'subCategory' },
            { data: 'option' }
          ]
        });
      });
    });

    
    this.moverElementosDataTable('dataTableGoles');
  }

  showNamePlayer(playerId: number): string {
    const player = this.players.find(p => p.playerId === playerId);
    return player ? player.nombre : '';
  }

}
