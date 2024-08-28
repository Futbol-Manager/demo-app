import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
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
import { RegisterService } from 'src/app/core/services/register/register.service';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TeamService } from 'src/app/core/services/team/team.service';
import { LoginService } from 'src/app/core/services/login/login.service';
import { environment } from 'src/environments/environment';
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
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.scss']
})
export class PlayerComponent implements OnInit {

  @ViewChild('primerCampo', { static: false }) primerCampo!: ElementRef;

  datosCargados: boolean = false;
  usuarioActual!: User | null;
  teamId!: number;
  showModal = false;
  showModalInvitar = false;
  mostrarModalInfoJugador = false;
  selectedPlayer: Player = new Player({});
  player: Player = new Player({});
  radarChart: Chart | null = null; // Inicializar la variable radarChart
  mostrarEdad: boolean = false;
  edadSeleccionada!: string;

  players: any[] = [];
  imgPlayer: string = '';
  selectedFile!: File;

  nombreJugador: string = '';
  isMenor: boolean = false;
  correoElectronico: string = '';
  selectedPlayerId: number = 0;

  userForm: FormGroup = this.fb.group({
    mail: ['', Validators.email],
  });

  showPorteroOptions = false;
  showbtnupimg = false;
  imagePreviewUrl: string | ArrayBuffer | null = null;
  showPreview: boolean = false;

  showModalMover = false;
  playerIdSelected = 0;

  teamSelected: number = 0;
  listTeamsForCombo: any[] = [];
  clubId = 0;
  categoryTypeIdActual = 0;
  indexSelected = 0;
  profileId = 0;

  countries: string[] = [
    'Afganistán', 'Albania', 'Alemania', 'Andorra', 'Angola', 'Antigua y Barbuda', 'Arabia Saudita',
    'Argelia', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaiyán', 'Bahamas', 'Bangladés', 'Barbados',
    'Baréin', 'Bélgica', 'Belice', 'Benín', 'Bielorrusia', 'Birmania', 'Bolivia', 'Bosnia y Herzegovina', 'Botsuana',
    'Brasil', 'Brunéi', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Bután', 'Cabo Verde', 'Camboya', 'Camerún', 'Canadá',
    'Catar', 'Chad', 'Chile', 'China', 'Chipre', 'Ciudad del Vaticano', 'Colombia', 'Comoras', 'Corea del Norte',
    'Corea del Sur', 'Costa de Marfil', 'Costa Rica', 'Croacia', 'Cuba', 'Dinamarca', 'Dominica', 'Ecuador', 'Egipto',
    'El Salvador', 'Emiratos Árabes Unidos', 'Eritrea', 'Eslovaquia', 'Eslovenia', 'Estados Unidos',
    'Estonia', 'Etiopía', 'Filipinas', 'Finlandia', 'Fiyi', 'Francia', 'Gabón', 'Gambia', 'Georgia', 'Ghana', 'Granada',
    'Grecia', 'Guatemala', 'Guinea', 'Guinea-Bisáu', 'Guinea Ecuatorial', 'Guyana', 'Haití', 'Honduras', 'Hungría',
    'India', 'Indonesia', 'Irak', 'Irán', 'Irlanda', 'Islandia', 'Islas Marshall', 'Islas Salomón', 'Israel', 'Italia',
    'Jamaica', 'Japón', 'Jordania', 'Kazajistán', 'Kenia', 'Kirguistán', 'Kiribati', 'Kuwait', 'Laos', 'Lesoto',
    'Letonia', 'Líbano', 'Liberia', 'Libia', 'Liechtenstein', 'Lituania', 'Luxemburgo', 'Madagascar', 'Malasia',
    'Malaui', 'Maldivas', 'Malí', 'Malta', 'Marruecos', 'Mauricio', 'Mauritania', 'México', 'Micronesia', 'Moldavia',
    'Mónaco', 'Mongolia', 'Montenegro', 'Mozambique', 'Namibia', 'Nauru', 'Nepal', 'Nicaragua', 'Níger', 'Nigeria',
    'Noruega', 'Nueva Zelanda', 'Omán', 'Países Bajos', 'Pakistán', 'Palaos', 'Panamá', 'Papúa Nueva Guinea', 'Paraguay',
    'Perú', 'Polonia', 'Portugal', 'Reino Unido', 'República Centroafricana', 'República Checa', 'República de Macedonia',
    'República del Congo', 'República Democrática del Congo', 'República Dominicana', 'Ruanda', 'Rumania', 'Rusia',
    'Samoa', 'San Cristóbal y Nieves', 'San Marino', 'San Vicente y las Granadinas', 'Santa Lucía', 'Santo Tomé y Príncipe',
    'Senegal', 'Serbia', 'Seychelles', 'Sierra Leona', 'Singapur', 'Siria', 'Somalia', 'Sri Lanka', 'Suazilandia', 'Sudáfrica',
    'Sudán', 'Sudán del Sur', 'Suecia', 'Suiza', 'Surinam', 'Tailandia', 'Tanzania', 'Tayikistán', 'Timor Oriental', 'Togo',
    'Tonga', 'Trinidad y Tobago', 'Túnez', 'Turkmenistán', 'Turquía', 'Tuvalu', 'Ucrania', 'Uganda', 'Uruguay', 'Uzbekistán',
    'Vanuatu', 'Venezuela', 'Vietnam', 'Yemen', 'Yibuti', 'Zambia', 'Zimbabue'
  ];

  playerIdsList: any[] = [];

  //para subir las caras de los dnis
  mostrarModalDniJugador: boolean = false;
  dniCara1: string | ArrayBuffer | null | undefined = null;
  dniCara2: string | ArrayBuffer | null | undefined = null;
  selectedFileCara1: File | null = null;
  selectedFileCara2: File | null = null;
  //estas son las caras del padre o tutor 1
  dniCara3: string | ArrayBuffer | null | undefined = null;
  dniCara4: string | ArrayBuffer | null | undefined = null;
  selectedFileCara3: File | null = null;
  selectedFileCara4: File | null = null;
  //estas son  las caras de la madre o tutor 2
  dniCara5: string | ArrayBuffer | null | undefined = null;
  dniCara6: string | ArrayBuffer | null | undefined = null;
  selectedFileCara5: File | null = null;
  selectedFileCara6: File | null = null;

  indexSelectedDni = 0;

  constructor(private playerservice: PlayerService,
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private elementRef: ElementRef,
    private trainingService: TrainingService,
    private registerService: RegisterService,
    private snackBar: MatSnackBar,
    private fb: FormBuilder,
    private teamService: TeamService,
    private loginService: LoginService,
    private playerService: PlayerService,) { }

  ngOnInit(): void {
    // Suscribirse a los cambios en los parámetros de la URL
    this.route.params.subscribe(params => {
      // Obtener el valor de teamId de los parámetros
      this.teamId = +params['teamId'];  // El + convierte el valor a número
      //console.log('teamId:', this.teamId);
      this.cargarListadoJugadores();
      // Luego puedes realizar acciones con el teamId según tus necesidades
    });

    this.loginService.usuarioActual.subscribe(user => {
      this.usuarioActual = user;
      this.profileId = this.usuarioActual!.profileType.profileId;
      //this.playerIdsList = this.usuarioActual!.playerIds;
    });
  }

  // Método para cargar el listado de equipos
  cargarListadoJugadores(): void {
    this.playerservice.getPlayers(this.teamId.toString()).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response && response.data) {
          // Mapea los datos bajo 'data' a instancias del modelo Team
          this.players = response.data.players; //.map((player: Player) => new Player(player));
          this.clubId = response.data.clubId;

          // Si el perfil es > 2, filtra los jugadores según los playerIds del usuario actual
          if (this.profileId > 2 && this.usuarioActual && this.usuarioActual!.playerIds) {
            this.players = this.players.filter(player =>
              this.usuarioActual!.playerIds.includes(player.playerId)
            );
          }
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
  confirmarEliminarJugador(playerId: number, name: string, surname: string, index: number): void {
    const confirmacion = confirm('¿Estás seguro de que deseas eliminar el jugador ' + name + ' ' + surname + ` con ID ${playerId}?`);
    if (confirmacion) {
      // Llama al método para eliminar el equipo
      this.eliminarJugador(playerId, index);
    }
  }

  // Método para eliminar el equipo
  eliminarJugador(playerId: number, index: number): void {
    // Lógica para eliminar el equipo llamando al servicio correspondiente
    this.playerservice.deletePlayer(playerId.toString()).subscribe(
      (response) => {
        // Manejar la respuesta según tus necesidades
        //console.log('Jugador eliminado con éxito:', response);
        this.players.splice(index, 1);
      },
      (error) => {
        console.error('Error al eliminar el jugador:', error);
        // Puedes manejar el error según tus necesidades
      }
    );
  }

  // Método para abrir el modal de creación de equipo
  abrirModalCrearJugador(): void {
    this.inicializePlayer();

    //reiniciar la img
    this.showPreview = false;
    this.showModal = true;

    setTimeout(() => {
      this.enfocarPrimerCampo();
    }, 500);
  }

  // Método para cerrar el modal de creación de equipo
  cerrarModal(): void {
    this.showModal = false;
    // Limpiar los datos del nuevo equipo al cerrar el modal si es necesario
    this.inicializePlayer();
  }

  // Método para crear un nuevo equipo
  crearJugador(): void {
    let id = this.player.playerId;
    // Llamada al servicio para crear el jugador
    this.playerservice.createUpdatePlayer(this.teamId.toString(), this.player,).subscribe(
      (response) => {
        if (id === 0) this.players.push(response.data);
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
      posicion: 'Sin definir',
      fechaDeNacimiento: '',
      altura: '',
      peso: '',
      piernaNatural: 'Derecha',
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
      especialidades: '',
      opinionDelEntrenador: '',
      picturePlayer: '',
      verify: 0,
      telefono: '',
      telefonoPadre: '',
      telefonoMadre: '',
      emailPadre: '',
      emailMadre: '',
      nick: '',
      numero: '',
      dni: '',
      nombrePadre: '',
      dniPadre: '',
      nombreMadre: '',
      dniMadre: '',
      posicionDos: 'Sin definir',
      email: '',
      nacionalidad: 'España',
      direccion: '',
      municipio: '',
      imgDniUno: '',
      imgDniDos: '',
      dniPadre1: '',
      dniPadre2: '',
      dniMadre1: '',
      dniMadre2: ''
    };
  }

  editarJugador(playerId: number): void {
    const jugadorSeleccionado = this.players.find(player => player.playerId === playerId);
    this.player = jugadorSeleccionado;
    this.showPortero(this.player.posicion);
    this.promedioPase();
    this.promedioDefensa();
    this.promedioFisico();
    this.promedioHabilidad();
    this.promedioMentalidad();
    this.promedioTiro();
    this.promedioPortero();
    this.showPreview = false;
    this.showModal = true; // Suponiendo que tienes una variable que controla la visibilidad del modal de edición

    setTimeout(() => {
      this.enfocarPrimerCampo();
    }, 500);
  }

  private enfocarPrimerCampo() {
    if (this.primerCampo) {
      this.primerCampo.nativeElement.focus();
    }
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

    let labels = ['Habilidad con balon', 'Pase', 'Tiro', 'Defensa', 'Físico', 'Mentalidad'];
    let data = [
      parseInt(this.selectedPlayer.habilidadConBalon),
      parseInt(this.selectedPlayer.pase),
      parseInt(this.selectedPlayer.tiro),
      parseInt(this.selectedPlayer.defensa),
      parseInt(this.selectedPlayer.fisico),
      parseInt(this.selectedPlayer.mentalidad)
    ];

    if (this.selectedPlayer.posicion === 'Portero') {
      labels = ['Habilidad con balon', 'Pase', 'Tiro', 'Defensa', 'Físico', 'Mentalidad', 'Portero'];
      data = [
        parseInt(this.selectedPlayer.habilidadConBalon),
        parseInt(this.selectedPlayer.pase),
        parseInt(this.selectedPlayer.tiro),
        parseInt(this.selectedPlayer.defensa),
        parseInt(this.selectedPlayer.fisico),
        parseInt(this.selectedPlayer.mentalidad),
        parseInt(this.selectedPlayer.portero)
      ];
    }

    this.radarChart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Atributos del Jugador',
          data: data,
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
    const c = parseFloat(this.player.centros) || 0;

    const promedio = Math.round((a + b + c) / 3); // Redondear al entero más cercano
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
    if (event.target.files[0].type === 'image/png' || event.target.files[0].type === 'image/jpeg') {
      this.selectedFile = event.target.files[0];
      this.showbtnupimg = true;
      if (this.selectedFile) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.imagePreviewUrl = e.target.result;
          this.showPreview = true; // Mostrar vista previa
        };
        reader.readAsDataURL(this.selectedFile);
      }
    } else {
      this.showbtnupimg = false;
    }
  }

  onSubmit(playerId: number) {
    // Verifica si se ha seleccionado un archivo
    if (this.selectedFile) {
      //console.log('Imagen seleccionada:', this.selectedFile);

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

  invitarJugador(playerId: number): void {
    this.selectedPlayerId = playerId;
    const jugadorSeleccionado = this.players.find(player => player.playerId === playerId);

    this.nombreJugador = jugadorSeleccionado.nombre;

    // Calcular la fecha actual
    const fechaActual = new Date();

    // Calcular la fecha de nacimiento del jugador
    const fechaNacimiento = new Date(jugadorSeleccionado.fechaDeNacimiento);

    // Calcular la edad del jugador
    let edad = fechaActual.getFullYear() - fechaNacimiento.getFullYear();
    const mesActual = fechaActual.getMonth() + 1;
    const mesNacimiento = fechaNacimiento.getMonth() + 1;

    // Si el mes actual es menor que el mes de nacimiento o si es el mismo mes pero el día actual es menor que el día de nacimiento,
    // entonces el jugador no ha cumplido años todavía
    if (mesActual < mesNacimiento || (mesActual === mesNacimiento && fechaActual.getDate() < fechaNacimiento.getDate())) {
      edad--;
    }

    // Comprobar si el jugador es menor de 18 años
    this.isMenor = edad < 180;
    this.showModalInvitar = true;
  }

  cerrarModalInvitar() {
    this.showModalInvitar = false;
  }

  openShowModalMover(playerId: number, index: number): void {
    const jugadorSeleccionado = this.players.find(player => player.playerId === playerId);
    this.nombreJugador = jugadorSeleccionado.nombre + ' ' + jugadorSeleccionado.apellido;
    this.playerIdSelected = playerId;

    this.teamService.getTeamsByClubForCombo(this.clubId, '2024').subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.listTeamsForCombo = response.data;
          this.showModalMover = true;
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  moverJugador(): void {
    this.teamService.movePlayer(this.playerIdSelected, this.teamId, this.teamSelected).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.players.splice(this.indexSelected, 1);
          this.showModalMover = false;
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );

  }


  cerrarModalMover() {
    this.showModalMover = false;
  }

  enviarMailJugador() {
    if (this.userForm.valid) {
      let menor = 1;
      /*if (this.isMenor) {
        menor = 1;
      }*/
      this.registerService.invitePlayer(this.userForm.value.mail, this.selectedPlayerId, menor, this.teamId).pipe().subscribe(
        res => {
          if (res.data) {
            //ocultar sobre TODO
          }
          this.cerrarModalInvitar();
          const snackBarConfig = new MatSnackBarConfig();
          snackBarConfig.duration = 5000;
          snackBarConfig.horizontalPosition = 'center';
          snackBarConfig.verticalPosition = 'bottom';
          this.snackBar.open('Invitación enviada correctamente.', 'Cerrar', snackBarConfig);
        }
      )
    }
  }

  showPortero(value: string) {
    if (value === 'Portero')
      this.showPorteroOptions = true;
    else
      this.showPorteroOptions = false;
  }

  abrirModalDniJugador(player: any) {
    this.playerIdSelected = player.playerId;
    this.selectedPlayer = player;
    this.mostrarModalDniJugador = true;
  }

  cerrarModalDniJugador() {
    this.dniCara1 = null;
    this.dniCara2 = null;
    this.dniCara3 = null;
    this.dniCara4 = null;
    this.dniCara5 = null;
    this.dniCara6 = null;
    this.mostrarModalDniJugador = false;
  }

  onFileChange(event: any, cara: string) {
    const file = event.target.files[0];

    if (file) {
      const fileType = file.type;

      // Verifica si el tipo de archivo es PNG o JPEG
      if (fileType === 'image/png' || fileType === 'image/jpeg') {
        const reader = new FileReader();
        reader.onload = (e) => {
          switch (cara) {
            case 'cara1':
              this.dniCara1 = e.target?.result;
              this.selectedFileCara1 = file;
              break;
            case 'cara2':
              this.dniCara2 = e.target?.result;
              this.selectedFileCara2 = file;
              break;
            case 'cara3':
              this.dniCara3 = e.target?.result;
              this.selectedFileCara3 = file;
              break;
            case 'cara4':
              this.dniCara4 = e.target?.result;
              this.selectedFileCara4 = file;
              break;
            case 'cara5':
              this.dniCara5 = e.target?.result;
              this.selectedFileCara5 = file;
              break;
            case 'cara6':
              this.dniCara6 = e.target?.result;
              this.selectedFileCara6 = file;
              break;
          }
        };
        reader.readAsDataURL(file);

        setTimeout(() => {
          this.subirCaraDni(cara);
        }, 1000);
      } else {
        // Muestra un mensaje de error si el archivo no es PNG o JPEG
        alert('Formato de archivo no válido. Por favor, sube una imagen en formato PNG o JPEG.');
      }
    }
  }

  subirCaraDni(cara: string) {
    let fileToUpload = null;
    let caraOption = 0;

    switch (cara) {
      case 'cara1':
        fileToUpload = this.selectedFileCara1;
        break;
      case 'cara2':
        caraOption = 1;
        fileToUpload = this.selectedFileCara2;
        break;
      case 'cara3':
        caraOption = 2;
        fileToUpload = this.selectedFileCara3;
        break;
      case 'cara4':
        caraOption = 3;
        fileToUpload = this.selectedFileCara4;
        break;
      case 'cara5':
        caraOption = 4;
        fileToUpload = this.selectedFileCara5;
        break;
      case 'cara6':
        caraOption = 5;
        fileToUpload = this.selectedFileCara6;
        break;
    }

    if (fileToUpload) {
      const formData = new FormData();
      formData.append('file', fileToUpload);

      // Simulamos el envío de la imagen al servidor
      this.playerService.createUpdateImgDniPlayer(this.playerIdSelected, caraOption, fileToUpload)
        .subscribe(
          (response) => {
            switch (caraOption) {
              case 0:
                this.player.imgDniUno = response.data;
                break;
              case 1:
                this.player.imgDniDos = response.data;
                break;
              case 2:
                this.player.dniPadre1 = response.data;
                break;
              case 3:
                this.player.dniPadre2 = response.data;
                break;
              case 4:
                this.player.dniMadre1 = response.data;
                break;
              case 5:
                this.player.dniMadre2 = response.data;
                break;
            }

            this.snackBar.open('Imagen subida correctamente.', 'Cerrar', {
              duration: 3000,
            });
          },
          error => {
            console.error('Error al subir la imagen', error);
          }
        );

      // Aquí se realiza la llamada al backend
      // Puedes usar HttpClient para realizar la solicitud
      // Ejemplo: this.http.post(endpoint, formData).subscribe(...)
      //console.log(`Subiendo ${cara}:`, fileToUpload.name);
      // Realiza la llamada a tu servicio o API aquí
    }
  }

  descargarImagen(url: string, nombreArchivo: string) {
    const urlBackend = environment.apiUrl + `commons/download-image?url=${encodeURIComponent(url)}`;

    fetch(urlBackend)
      .then(response => response.blob())
      .then(blob => {
        const a = document.createElement('a');
        const objectUrl = window.URL.createObjectURL(blob);
        a.href = objectUrl;
        a.download = nombreArchivo;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(objectUrl);
        document.body.removeChild(a);
      })
      .catch(error => {
        window.open(url, '_blank');
        //console.error('Error descargando la imagen:', error);
        //alert('No se pudo descargar la imagen. Por favor, intente de nuevo más tarde.');
      });
  }

}
