import { Component, ElementRef, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { User } from 'src/app/core/models/users/user.model';
import { PlayerService } from 'src/app/core/services/player/player.service';
import { Response } from 'src/app/core/services/models/response.model';
import { Player } from 'src/app/core/services/player/player.model';
import * as $ from 'jquery';
import 'datatables.net';

import { Chart, registerables } from 'chart.js/auto';
import { HttpClient } from '@angular/common/http';
import { TrainingService } from 'src/app/core/services/training/training.service';
// Registra los complementos necesarios
Chart.register(...registerables);


// player.model.ts
export interface Player1 {
  id: number;
  nombre: string;
  apellido: string;
  fechaNacimiento: string;
  posicion: string;
}


@Component({
  selector: 'app-trainer',
  templateUrl: './trainer.component.html',
  styleUrls: ['./trainer.component.scss']
})
export class TrainerComponent implements OnInit {
  datosCargados: boolean = false;
  usuarioActual!: User | null;
  teamId!: number;
  showModal = false;
  mostrarModalInfoJugador = false;
  selectedPlayer: Player = new Player({});
  player: Player = new Player({});
  radarChart: Chart | null = null; // Inicializar la variable radarChart
  mostrarEdad: boolean = false;
  edadSeleccionada!: string;

  players: any[] = [];
  imgPlayer: string = '';
  selectedFile!: File;

  constructor(private playerservice: PlayerService,
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private elementRef: ElementRef,
    private trainingService: TrainingService) { }

  ngOnInit(): void {
    // Suscribirse a los cambios en los parámetros de la URL
    this.route.params.subscribe(params => {
      // Obtener el valor de teamId de los parámetros
      this.teamId = +params['teamId'];  // El + convierte el valor a número
      console.log('teamId:', this.teamId);
      this.cargarListadoJugadores();
      // Luego puedes realizar acciones con el teamId según tus necesidades
    });
  }

  // Método para cargar el listado de equipos
  cargarListadoJugadores(): void {
    this.playerservice.getPlayers(this.teamId.toString()).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response && response.data && Array.isArray(response.data)) {
          // Mapea los datos bajo 'data' a instancias del modelo Team
          this.players = response.data.map((player: Player) => new Player(player));
          // Inicializar el DataTable después de cargar los datos
          this.inicializarDataTable();
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
        this.datosCargados = true;
      },
      (error) => {
        console.error('Error al cargar el listado de jugadores', error);
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

  // Método para confirmar la eliminación del equipo
  confirmarEliminarJugador(playerId: number, name: string, surname: string): void {
    const confirmacion = confirm('¿Estás seguro de que deseas eliminar el jugador ' + name + ' ' + surname + ` con ID ${playerId}?`);
    if (confirmacion) {
      // Llama al método para eliminar el equipo
      this.eliminarJugador(playerId);
    }
  }

  // Método para eliminar el equipo
  eliminarJugador(playerId: number): void {
    // Lógica para eliminar el equipo llamando al servicio correspondiente
    this.playerservice.deletePlayer(playerId.toString()).subscribe(
      (response) => {
        // Manejar la respuesta según tus necesidades
        console.log('Jugador eliminado con éxito:', response);

        // Cargar nuevamente el listado de equipos después de la eliminación exitosa
        this.cargarListadoJugadores();
      },
      (error) => {
        console.error('Error al eliminar el jugador:', error);
        // Puedes manejar el error según tus necesidades
      }
    );
  }

  // Método para abrir el modal de creación de equipo
  abrirModalCrearJugdor(): void {
    this.inicializePlayer();
    this.showModal = true;
  }

  // Método para cerrar el modal de creación de equipo
  cerrarModal(): void {
    this.showModal = false;
    // Limpiar los datos del nuevo equipo al cerrar el modal si es necesario
    this.inicializePlayer();
  }

  // Método para crear un nuevo equipo
  crearJugador(): void {
    // Llamada al servicio para crear el jugador
    this.playerservice.createUpdatePlayer(this.teamId.toString(), this.player,).subscribe(
      (response) => {
        // Manejar la respuesta según tus necesidades
        console.log('Jugador creado con éxito:', response);

        // Cargar nuevamente el listado de jugadores después de la creación exitosa
        this.cargarListadoJugadores();

        // Cerrar el modal después de crear el jugador
        this.cerrarModal();
      },
      (error) => {
        console.error('Error al crear el jugador:', error);
        // Puedes manejar el error según tus necesidades
      }
    );
  }

  // Método para navegar a la pantalla de calendario
  navegarACalendario(): void {
    // Puedes ajustar la ruta según tu estructura de rutas
    this.router.navigate(['/dashboard/calendario', this.teamId]);
  }

  inicializePlayer() {
    this.player = {
      playerId: 0,
      nombre: '',
      apellido: '',
      posicion: '4',
      fechaDeNacimiento: '',
      altura: '',
      peso: '',
      piernaNatural: '1',
      habilidadConBalon: '50',
      habilidadConBalonControlDeBalon: '50',
      habilidadConBalonRegate: '50',
      pase: '50',
      paseCorto: '50',
      paseLargo: '50',
      centros: '50',
      tiro: '50',
      tiroPotenciaDeTiro: '50',
      tiroDefinicion: '50',
      tiroTirosLejanos: '50',
      tiroVoleas: '50',
      tiroPrecisionFalta: '50',
      tiroPenaltis: '50',
      tiroCabezazo: '50',
      defensa: '50',
      defensaMarcaje: '50',
      defensaEntradas: '50',
      defensaRobos: '50',
      fisico: '50',
      fisicoAceleracion: '50',
      fisicoVelocidad: '50',
      fisicoAgilidad: '50',
      fisicoResistencia: '50',
      fisicoFuerza: '50',
      fisicoEquilibrio: '50',
      fisicoSalto: '50',
      mentalidad: '50',
      mentalidadAgresividad: '50',
      mentalidadAnticipacion: '50',
      mentalidadInterceptacion: '50',
      mentalidadVision: '50',
      mentalidadCompostura: '50',
      portero: '50',
      porteroColocacion: '50',
      porteroEstirada: '50',
      porteroParadas: '50',
      porteroSaques: '50',
      porteroReflejos: '50',
      especialidades: '50',
      opinionDelEntrenador: '',
      picturePlayer: '',
      verify: 0,
      telefono: '',
      telefonoPadre: '',
      telefonoMadre: '',
      emailPadre: '',
      emailMadre: ''
      
    };
  }

  editarJugador(playerId: number): void {
    const jugadorSeleccionado = this.players.find(player => player.playerId === playerId);
    this.player = jugadorSeleccionado;
    this.showModal = true; // Suponiendo que tienes una variable que controla la visibilidad del modal de edición
  }

  verInfoJugador(player: Player): void {
    this.selectedPlayer = player; // Almacena el jugador seleccionado en una propiedad del componente
    this.edadSeleccionada = this.fechaEnEspañol(this.selectedPlayer.fechaDeNacimiento) + ' (' + this.calcularEdad(player.fechaDeNacimiento) + ')';
    this.mostrarEdad = true;
    this.mostrarModalInfoJugador = true; // Activa el indicador para mostrar el modal

    // Aquí llamamos a la función para cargar el gráfico de radar
    this.cargarGraficoRadar();
  }

  // Método para cargar el gráfico de radar con los datos del jugador
  cargarGraficoRadar() {
    // Antes de crear el nuevo gráfico, destruye el gráfico existente si es necesario
    if (this.radarChart) {
      this.radarChart.destroy(); // Destruye el gráfico existente
    }
    const ctx = document.getElementById('radarChart') as HTMLCanvasElement;
    this.radarChart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['Habilidad con balon', 'Pase', 'Tiro', 'Defensa', 'Físico', 'Mentalidad', 'Portero'],
        datasets: [{
          label: 'Atributos del Jugador',
          data: [
            parseInt(this.selectedPlayer.habilidadConBalon),
            parseInt(this.selectedPlayer.pase),
            parseInt(this.selectedPlayer.tiro),
            parseInt(this.selectedPlayer.defensa),
            parseInt(this.selectedPlayer.fisico),
            parseInt(this.selectedPlayer.mentalidad),
            parseInt(this.selectedPlayer.portero)
          ],
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Gráfica del jugador'
          }
        },
        scales: {
          r: {
            angleLines: {
              display: true
            },
            pointLabels: {
              font: {
                size: 14
              }
            },
            min: 0, // Establece el valor mínimo del eje radial
            max: 100 // Establece el valor máximo del eje radial
          }
        }
      }
    });
  }

  // Método para cerrar el modal de información del jugador
  cerrarModalInfoJugador() {
    this.mostrarModalInfoJugador = false;
  }

  // Método para calcular la edad del jugador a partir de su fecha de nacimiento
  calcularEdad(fechaNacimientoString: string): number {
    // Convertimos la cadena de fecha de nacimiento a un objeto Date
    const fechaNacimiento = new Date(fechaNacimientoString);

    const hoy = new Date();
    const cumpleanos = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - cumpleanos.getFullYear();
    const mes = hoy.getMonth() - cumpleanos.getMonth();

    if (mes < 0 || (mes === 0 && hoy.getDate() < cumpleanos.getDate())) {
      edad--;
    }

    return edad;
  }

  fechaEnEspañol(fecha: string): string {
    const partes = fecha.split('-');
    const fechaObj = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));

    const dia = fechaObj.getDate();
    const mes = fechaObj.getMonth() + 1;
    const año = fechaObj.getFullYear();

    const diaStr = dia < 10 ? '0' + dia : dia.toString();
    const mesStr = mes < 10 ? '0' + mes : mes.toString();

    return `${diaStr}/${mesStr}/${año}`;
  }

  promedioDefensa() {
    const a = parseFloat(this.player.defensaMarcaje) || 0;
    const b = parseFloat(this.player.defensaEntradas) || 0;
    const c = parseFloat(this.player.defensaRobos) || 0;

    const promedio = Math.round((a + b + c) / 3); // Redondear al entero más cercano
    this.player.defensa = promedio.toString();
  }

  promedioHabilidad() {
    const a = parseFloat(this.player.habilidadConBalonControlDeBalon) || 0;
    const b = parseFloat(this.player.habilidadConBalonRegate) || 0;

    const promedio = Math.round((a + b) / 2); // Redondear al entero más cercano
    this.player.habilidadConBalon = promedio.toString();
  }

  promedioPase() {
    const a = parseFloat(this.player.paseCorto) || 0;
    const b = parseFloat(this.player.paseLargo) || 0;

    const promedio = Math.round((a + b) / 2); // Redondear al entero más cercano
    this.player.pase = promedio.toString();
  }

  promedioTiro() {
    const a = parseFloat(this.player.tiroPotenciaDeTiro) || 0;
    const b = parseFloat(this.player.tiroDefinicion) || 0;
    const c = parseFloat(this.player.tiroTirosLejanos) || 0;
    const d = parseFloat(this.player.tiroVoleas) || 0;
    const e = parseFloat(this.player.tiroPrecisionFalta) || 0;
    const f = parseFloat(this.player.tiroPenaltis) || 0;
    const g = parseFloat(this.player.tiroCabezazo) || 0;

    const promedio = Math.round((a + b + c + d + e + f + g) / 7); // Redondear al entero más cercano
    this.player.tiro = promedio.toString();
  }

  promedioFisico() {
    const a = parseFloat(this.player.fisicoAceleracion) || 0;
    const b = parseFloat(this.player.fisicoVelocidad) || 0;
    const c = parseFloat(this.player.fisicoAgilidad) || 0;
    const d = parseFloat(this.player.fisicoResistencia) || 0;
    const e = parseFloat(this.player.fisicoFuerza) || 0;
    const f = parseFloat(this.player.fisicoEquilibrio) || 0;
    const g = parseFloat(this.player.fisicoSalto) || 0;

    const promedio = Math.round((a + b + c + d + e + f + g) / 7); // Redondear al entero más cercano
    this.player.fisico = promedio.toString();
  }

  promedioMentalidad() {
    const a = parseFloat(this.player.mentalidadAgresividad) || 0;
    const b = parseFloat(this.player.mentalidadAnticipacion) || 0;
    const c = parseFloat(this.player.mentalidadInterceptacion) || 0;
    const d = parseFloat(this.player.mentalidadVision) || 0;
    const e = parseFloat(this.player.mentalidadCompostura) || 0;

    const promedio = Math.round((a + b + c + d + e) / 5); // Redondear al entero más cercano
    this.player.mentalidad = promedio.toString();
  }

  promedioPortero() {
    const a = parseFloat(this.player.porteroColocacion) || 0;
    const b = parseFloat(this.player.porteroEstirada) || 0;
    const c = parseFloat(this.player.porteroParadas) || 0;
    const d = parseFloat(this.player.porteroSaques) || 0;
    const e = parseFloat(this.player.porteroReflejos) || 0;

    const promedio = Math.round((a + b + c + d + e) / 5); // Redondear al entero más cercano
    this.player.portero = promedio.toString();
  }

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  onSubmit(playerId: number) {
    // Verifica si se ha seleccionado un archivo
    if (this.selectedFile) {
      console.log('Imagen seleccionada:', this.selectedFile);

      this.trainingService.createUpdateImgPlayer(playerId.toString(), this.selectedFile)
        .subscribe(
          (response) => {
            const updatedImgPlayer = response.data;

            // Encuentra el jugador en el arreglo y actualiza su imgPlayer
            const index = this.players.findIndex(player => player.playerId === playerId);
            if (index !== -1) {
                this.players[index].picturePlayer = updatedImgPlayer;
            }
            this.cerrarModal();
          },
          error => {
            console.error('Error al subir la imagen', error);
            // Aquí puedes manejar el error si la subida de la imagen falla
          }
        );
    } else {
      console.log('Ninguna imagen seleccionada.');
    }
  }

}
