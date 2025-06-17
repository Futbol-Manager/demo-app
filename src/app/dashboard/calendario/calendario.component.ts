import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AsistenciaTraining, Task, Training } from 'src/app/core/services/models/training.models';
import { TrainingService } from 'src/app/core/services/training/training.service';
import { Response } from 'src/app/core/services/models/response.model';
import { ConvocatoriaUI, MatchPreparation, PlayerPostPartido, PostPartido, PostPartidoId } from 'src/app/core/services/models/match.model';
import { MatDialog } from '@angular/material/dialog';
import { PlayerService } from 'src/app/core/services/player/player.service';
import { NotificatePlayerUI, PlayerId } from 'src/app/core/services/player/player.model';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TeamService } from 'src/app/core/services/team/team.service';
import { LoginService } from 'src/app/core/services/login/login.service';
import { User } from 'src/app/core/models/users/user.model';
import { RespPostEntreno, RespPostPartido, RespPreEntreno, RespPrePartido } from 'src/app/core/services/player/respuestas.model';
import { GolPostPartido } from 'src/app/core/services/team/team.model';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { environment } from 'src/environments/environment';
import { Location } from '@angular/common';

declare var html2pdf: any;

// Utilizaremos una interfaz para especificar las opciones de formato de fecha
interface OpcionesFormatoFecha {
  month: 'long';
  year: 'numeric';
}

interface Match {
  lugar: string;
  // Otras propiedades de MatchPreparation
}

interface Category {
  name: string;
  subcategories: {
    name: string;
    options: string[];
  }[];
}

@Component({
  selector: 'app-calendario',
  templateUrl: './calendario.component.html',
  styleUrls: ['./calendario.component.scss']
})
export class CalendarioComponent implements OnInit {

  @ViewChild('endOfModal', { static: false }) endOfModal!: ElementRef;

  datosCargados: boolean = false;
  teamId!: number;  // Ajusta el valor según el teamId del equipo actual
  calendario: any[][] = [];
  mesActual: Date = new Date();
  // Variable para almacenar el nombre del mes y el año actual
  tituloMesAnio!: string;
  showModal = false;
  showModalEntrenamiento = false;
  trainingSession: Training = new Training({});
  daySession!: string;
  listTraining: any[] = []; // Define una variable para almacenar el listado de equipos
  listMatchPreparation: any[] = [];

  nuevaTarea: Task = new Task();
  showAddTaskForm = false;
  trainingId!: number;
  matchPreparationId!: number;

  showModalPartido: boolean = false;
  match: MatchPreparation = new MatchPreparation({});

  taskList: any[] = [];
  viewShop: boolean = false;

  showModalPostPartido: boolean = false;
  postPartido: PostPartido = new PostPartido({});

  playerPostPartido: PlayerId[] = [];
  playerInfoPostPartido: PlayerPostPartido = new PlayerPostPartido({});
  postPartidoId: number = 0;

  cerrarPlayer: PlayerId = new PlayerId({});
  selectedFile!: File;


  showModalBoard: boolean = false;
  iframeSrc: string = 'https://tacticalboard.sphairatech.com/';
  nombreEquipo: string = '';

  categories = [
    {
      name: 'Trabajo Físico',
      subcategories: [
        {
          name: 'Resistencia',
          options: [
            'Juegos de posesión',
            'Juegos de posición',
            'Ataque – Defensa',
            'Partidos reducidos',
            'Partidos condicionados',
            'Acciones combinadas',
            'Finalizaciones'
          ]
        },
        {
          name: 'Fuerza',
          options: [
            'Circuitos Físicos',
            'Juego de Posesión',
            'Ataque – Defensa',
            'Finalizaciones'
          ]
        },
        {
          name: 'Velocidad',
          options: []
        }
      ]
    },
    {
      name: 'Trabajo Táctico',
      subcategories: [
        {
          name: 'Trabajo por posiciones',
          options: []
        },
        {
          name: 'Trabajo por líneas',
          options: []
        },
        {
          name: 'Específicos',
          options: []
        }
      ]
    },
    {
      name: 'Tecnificación',
      subcategories: []
    },
    {
      name: 'ABP',
      subcategories: [
        {
          name: 'Faltas laterales',
          options: []
        },
        {
          name: 'Faltas frontales',
          options: []
        },
        {
          name: 'Corners',
          options: []
        }
      ]
    },
    {
      name: 'Trabajo Preventivo',
      subcategories: [
        {
          name: 'Core',
          options: []
        },
        {
          name: 'Estabilización de rodilla',
          options: []
        },
        {
          name: 'Glúteos',
          options: []
        },
        {
          name: 'Cuádriceps',
          options: []
        },
        {
          name: 'Aductores',
          options: []
        },
        {
          name: 'Isquiotibiales',
          options: []
        },
        {
          name: 'Gemelos',
          options: []
        },
        {
          name: 'Propiocepción',
          options: []
        }
      ]
    }
  ];

  cat1: string = '';
  cat2: string = '';
  cat3: string = '';

  selectedCategory: string = '';
  selectedSubcategory: string = '';
  selectedOption: string = '';
  usuarioActual!: User | null;

  toggleVisible: number = 0;
  togglePartidoVisible: number = 0;

  showModalFormPreEntreno: boolean = false;
  showModalFormPostEntreno: boolean = false;
  showModalFormPrePartido: boolean = false;
  showModalFormPostPartido: boolean = false;

  respPreEntreno: RespPreEntreno = new RespPreEntreno({});
  respPrePartido: RespPrePartido = new RespPrePartido({});
  respPostEntreno: RespPostEntreno = new RespPostEntreno({});
  respPostPartido: RespPostPartido = new RespPostPartido({});

  showModalPreEntrenamiento: boolean = false;
  showModalPostEntrenamiento: boolean = false;
  showModalPreMatch: boolean = false;
  showModalPostMatch: boolean = false;
  showModalAsistencia: boolean = false;

  playerIdUserActual: any = 0;


  respListPreEntreno: RespPreEntreno[] = [];
  respListPostEntreno: RespPostEntreno[] = [];
  respListPreMatch: RespPrePartido[] = [];
  respListPostMatch: RespPostPartido[] = [];
  listAsistencia: AsistenciaTraining[] = [];

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
            "Olímpico 1er palo",
            "Olímpico 2do palo",
            "De cabeza 1er palo",
            "De cabeza punto de penalti",
            "De cabeza 2nd palo",
            "Con otra parte 1er palo",
            "Con otra parte punto de penalti",
            "Con otra parte 2do palo"
          ]
        },
        {
          "name": "Derecha",
          "options": [
            "Olímpico 1er palo",
            "Olímpico 2do palo",
            "De cabeza 1er palo",
            "De cabeza punto de penalti",
            "De cabeza 2nd palo",
            "Con otra parte 1er palo",
            "Con otra parte punto de penalti",
            "Con otra parte 2do palo"
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
  selectedOptionGolTypes: string = '';
  selectedGolTypesCombi: string = '';


  cat11: string = '';
  cat22: string = '';
  cat33: string = '';

  showSelectedOptional: boolean = false;

  isOpenGolesAvanzada: boolean = false;
  campos: any[] = [];

  selectedPlayerIdGolDe: number = 0;
  selectedPlayerIdAsisDe: number = 0;
  minutoGolAfavor: number = 0;
  minutoGolEnContra: number = 0;

  golAvanzadoAFavor: GolPostPartido = new GolPostPartido({});
  golesAvanzadoAFavor: GolPostPartido[] = [];

  golAvanzadoEnContra: GolPostPartido = new GolPostPartido({});
  golesAvanzadoEnContra: GolPostPartido[] = [];

  valueGoleador: number = 1;
  indexGolAvanza: number = 0;
  isSelectDisabled: boolean = true;

  showAlert: boolean = false;
  showAlert2: boolean = false;
  categoryTeam = 0;
  subirTarea = 0;

  estrategias: string[] = [
    'Acciones a Balón Parado', 'Acciones Combinadas', 'Circuito', 'Conservación', 'Juego Adaptado al Fútbol', 'Juego de Posición',
    'Juego de Posición Específico', 'Oleadas', 'Partidos', 'Posesión', 'Rueda de Pases', 'Situaciones Reducidas', 'Trabajo de Líneas'
  ];

  intenciones: string[] = [
    '1 vs 1', '2 vs 1', '2 vs 2', '3 vs 3', '4 vs 4', 'ABP Defensiva', 'ABP Ofensiva', 'Amplitud', 'Apoyos', 'Ataque Organizado', 'Ataque-Defensa',
    'Cobertura', 'Conservar', 'Contraataque', 'Defensa Inicio de Juego', 'Defensa de Juego Directo', 'Defensa Organizada',
    'Desmarques', 'Dividir', 'Evitar Progresión', 'Fase Defensiva', 'Fase Ofensiva', 'Fijar', 'Finalizar', 'Inicio de Juego',
    'Juego Directo', 'Mantener', 'Marcaje', 'Orientar', 'Permuta', 'Presionar', 'Primer Atacante', 'Primer Defensor',
    'Profundidad', 'Progresar', 'Proteger Portería', 'Recuperar', 'Reinicio de Juego', 'Replegar', 'Segundo Atacante',
    'Segundo Defensor', 'Temporizar', 'Tercer Atacante', 'Tercer Defensor',
    'Transición Defensiva', 'Transición Ofensiva', 'Transiciones',
  ];

  userId: any = 0;

  showModalTask: boolean = false;  // Controla la visibilidad del modal
  tareaSeleccionada: any;  // Almacena la tarea seleccionada

  // Genera un array con los números del 0 al 1000
  numeros: number[] = [0, ...Array.from({ length: 1000 }, (_, i) => i + 1)];

  selectedNumber: number = 0; // Por defecto, seleccionamos 0
  trainingSessionIdSelected = 0;

  match1: Match = {
    lugar: ''
    // Asegúrate de inicializar otras propiedades de MatchPreparation si las tiene
  };

  jugadoresNoConvocados: ConvocatoriaUI[] = [];
  jugadoresSuplentes: ConvocatoriaUI[] = [];
  jugadoresTitulares: ConvocatoriaUI[] = [];

  mostrarModalConvocatoria = false;
  mostrarModalConvocatoriaLista = false;
  showNotificar = false;

  playersConvo: any[] = [];

  showConvocados: any = [];
  showNoConvocados: any = [];

  // Variables para el control táctil
  touchJugador: any;
  startX: number = 0;
  startY: number = 0;

  playerId = 0;
  imgClub = '';
  selected: string = '';
  showModalPDF = false;
  imageBaseUrl: string = environment.images;
  imageBaseUrlTask: string = environment.images + 'task-board/';
  imageBaseUrlUser: string = environment.images + 'user/';

  convocatoriaJSON: any = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private trainingService: TrainingService,
    private playerService: PlayerService,
    private teamService: TeamService,
    private cdr: ChangeDetectorRef,
    private loginService: LoginService,
    private location: Location
  ) {
  }

  ngOnInit(): void {

    // Suscríbete al observable del servicio para obtener el usuario actual
    this.loginService.usuarioActual.subscribe(user => {
      this.usuarioActual = user;
      this.userId = user?.userId;
      this.playerIdUserActual = user?.playerId;
      // Suscribirse a los cambios en los parámetros de la URL
      this.route.params.subscribe(params => {
        // Obtener el valor de teamId de los parámetros
        this.teamId = +params['teamId'];  // El + convierte el valor a número
        this.playerId = +params['playerId'];  // El + convierte el valor a número
        //console.log('teamId:', this.teamId);
      });
      this.teamService.getTeamById(this.teamId.toString()).subscribe(
        (response: Response) => {
          // Verifica que la propiedad 'data' exista en la respuesta
          if (response.data !== null) {
            this.nombreEquipo = response.data.categoryType.categoryName + ' ' + response.data.levelLeague;
            this.categoryTeam = response.data.categoryTypeId;
            this.imgClub = response.data.imgClub;
            this.match2.imgClub = this.imageBaseUrl + 'user/' + response.data.imgClub;
            if (this.categoryTeam === 14) this.irAPantalla(2);
            this.getListaEntrenamientos();
          } else {
            console.error('La respuesta del servicio no tiene la estructura esperada', response);
          }
        },
        (error) => {
          console.error('Error al cargar el listado de equipos', error);
        }
      );
    });
  }

  goBack(): void {
    this.location.back();
  }

  select(option: string) {
    this.selected = option;
  }

  // Método para generar el calendario para el mes especificado
  private generarCalendarioV2(mes: Date): void {
    // Obtener el primer día del mes
    const primerDiaMes = new Date(mes.getFullYear(), mes.getMonth(), 1);
    // Obtener el día de la semana en el que empieza el mes (0 para domingo, 1 para lunes, etc.)
    let primerDiaSemana = primerDiaMes.getDay();
    // Ajustar primerDiaSemana para que sea 0 para domingo, 1 para lunes, etc.
    primerDiaSemana = (primerDiaSemana === 0) ? 6 : primerDiaSemana - 1;

    // Obtener el número de días en el mes actual
    const ultimoDiaMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();

    // Generar los datos del calendario
    this.calendario = [];
    let dia = 1;
    for (let i = 0; i < 6; i++) {
      this.calendario[i] = [];
      for (let j = 0; j < 7; j++) {
        if ((i === 0 && j < primerDiaSemana) || dia > ultimoDiaMes) {
          this.calendario[i][j] = '';
        } else {
          const fecha = new Date(mes.getFullYear(), mes.getMonth(), dia);
          fecha.setDate(fecha.getDate() + 1); // Añadir 1 día para obtener el día correcto
          const daysession = fecha.toISOString().split('T')[0];
          const training = this.listTraining.find(training => training.daySession === daysession);
          const matchPreparation = this.listMatchPreparation.find(match => match.matchDate === daysession);

          if (training && matchPreparation) {
            const maxLength = 16;
            const rivalNameConst = matchPreparation.rivalName.length > maxLength
              ? matchPreparation.rivalName.substring(0, maxLength) + '...'
              : matchPreparation.rivalName;
            // Si hay tanto entrenamiento como partido, se pueden asignar ambos al mismo día
            this.calendario[i][j] = {
              numero: dia, daysession, trainingId: training.trainingSessionId, matchPreparationId: matchPreparation.matchPreparationId,
              traininVisible: training.visible, matchVisible: matchPreparation.visible, rivalName: rivalNameConst, terreno: matchPreparation.terreno
            };
          } else if (training) {
            this.calendario[i][j] = { numero: dia, daysession, trainingId: training.trainingSessionId, traininVisible: training.visible };
          } else if (matchPreparation) {
            const maxLength = 16;
            const rivalNameConst = matchPreparation.rivalName.length > maxLength
              ? matchPreparation.rivalName.substring(0, maxLength) + '...'
              : matchPreparation.rivalName;
            this.calendario[i][j] = {
              numero: dia, daysession, matchPreparationId: matchPreparation.matchPreparationId,
              matchVisible: matchPreparation.visible, rivalName: rivalNameConst, terreno: matchPreparation.terreno
            };
          } else {
            this.calendario[i][j] = { numero: dia, daysession };
          }

          dia++;
        }
      }
    }

    // Actualizar el título del mes y el año
    const opcionesFecha: OpcionesFormatoFecha = { month: 'long', year: 'numeric' };
    this.tituloMesAnio = mes.toLocaleDateString('es-ES', opcionesFecha).toUpperCase();
  }

  // Método para redirigir a la pantalla de jugadores con el teamId
  irAPantalla(id: number): void {
    if (id === 1) {
      this.router.navigate(['/dashboard/informacion_equipo', this.teamId]);
    } else if (id === 2) {
      this.router.navigate(['/dashboard/jugadores', this.teamId]);
    } else if (id === 3) {
      this.router.navigate(['/dashboard/estadisticas_equipo', this.teamId]);
    } else if (id === 4) {
      this.router.navigate(['/dashboard/estadisticas_jugadores', this.teamId]);
    } else if (id === 5) {
      this.router.navigate(['/dashboard/cuotas', this.teamId, this.playerId]);
    } else if (id === 6) {
      this.router.navigate(['/dashboard/adminsettings']);
    } else if (id === 7) {
      this.router.navigate(['/dashboard/tareas', this.teamId]);
    } else if (id === 8) {
      this.router.navigate(['/dashboard/menu-entrenador', this.teamId, 0]);
    }
  }

  // Método para redirigir a la pantalla de jugadores con el teamId
  navegarAInicio(): void {
    // Ajusta la ruta según la configuración de tus rutas en el enrutador
    this.router.navigate(['/dashboard/inicio']);
  }

  agregarEvento(dia: number) { }

  mesAnterior() {
    this.mesActual.setMonth(this.mesActual.getMonth() - 1);
    this.generarCalendarioV2(this.mesActual);
  }

  mesSiguiente() {
    this.mesActual.setMonth(this.mesActual.getMonth() + 1);
    this.generarCalendarioV2(this.mesActual);
  }

  // Método para abrir el modal de creación de equipo
  abrirModal(day: string): void {
    this.daySession = day;
    this.trainingSession = new Training({}); // Restablecer a un objeto vacío  

    this.match = new MatchPreparation({});

    this.match.hora = this.match.hora != '' ? this.match.hora : '08';
    this.match.minutos = this.match.minutos != '' ? this.match.minutos : '15';

    this.match.horaEmpieza = this.match.horaEmpieza != '' ? this.match.horaEmpieza : '09';
    this.match.minutosEmpieza = this.match.minutosEmpieza != '' ? this.match.minutosEmpieza : '15';
    this.showModal = true;
  }

  // Método para cerrar el modal de creación de equipo
  cerrarModal(): void {
    this.daySession = '';
    this.showModal = false;
    this.showAddTaskForm = false;
    this.selected = '';
  }

  crearEntrenamiento() {
    this.trainingSession.daySession = this.daySession;
    this.trainingService.createUpdateTrainingSession(this.teamId.toString(), this.trainingSession).subscribe(
      (response) => {
        //console.log('Sesión de entrenamiento guardada con éxito:', response);
        // Vuelve a cargar la lista de entrenamientos y genera el calendario actualizado
        this.getListaEntrenamientos();
        // Cerrar el modal después de crear el equipo
        if (this.trainingSession.trainingSessionId === 0)
          this.cerrarModal();
        else
          this.cerrarModalEntrenamiento();
      },
      (error) => {
        console.error('Error al guardar la sesión de entrenamiento:', error);
        // Aquí puedes manejar el error, si es necesario
      }
    );
  }

  eliminarEntrenamiento() {
    this.trainingSession.daySession = this.daySession;
    this.trainingService.deleteTrainingSession(this.teamId.toString(), this.trainingSession).subscribe(
      (response) => {
        console.log('Sesión de entrenamiento eliminada con éxito:', response);
        // Vuelve a cargar la lista de entrenamientos y genera el calendario actualizado
        this.getListaEntrenamientos();
        // Cerrar el modal después de crear el equipo
        if (this.trainingSession.trainingSessionId === 0)
          this.cerrarModal();
        else
          this.cerrarModalEntrenamiento();

      },
      (error) => {
        console.error('Error al eliminar la sesión de entrenamiento:', error);
        // Aquí puedes manejar el error, si es necesario
      }
    );
  }

  getListaEntrenamientos() {
    this.trainingService.getTrainingSessions(this.teamId.toString()).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response && response.data && Array.isArray(response.data)) {
          // Mapea los datos bajo 'data' a instancias del modelo Team
          this.listTraining = response.data.map((team: Training) => new Training(team));
          // Lógica para obtener o generar la información del calendario
          this.getListaPrePartido();
          //this.generarCalendarioV2(new Date());
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  getListaPrePartido() {
    this.trainingService.getListPrePartidoByTeam(this.teamId.toString()).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response && response.data && Array.isArray(response.data)) {
          // Mapea los datos bajo 'data' a instancias del modelo Team
          this.listMatchPreparation = response.data.map((match: MatchPreparation) => new MatchPreparation(match));
          // Lógica para obtener o generar la información del calendario
          this.generarCalendarioV2(this.mesActual);
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
        this.datosCargados = true;
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  openEntrenamiento(id: any, day: string): void {
    this.daySession = day;
    this.trainingId = id;
    this.trainingService.getTasksByTraining(id.toString()).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response && response.data && Array.isArray(response.data)) {
          // Buscar el entrenamiento por su ID en la lista de entrenamientos
          const entrenamientoSeleccionado = this.listTraining.find(training => training.trainingSessionId === id);
          if (entrenamientoSeleccionado) {
            // Asignar el entrenamiento seleccionado a la variable trainingSession
            this.trainingSession = entrenamientoSeleccionado;
            this.trainingSession.tasks = response.data;
            // Abrir el modal
            this.showModalEntrenamiento = true;
          }

          this.toggleVisible = entrenamientoSeleccionado.visible === 0 || !entrenamientoSeleccionado.visible ? 0 : 1;
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  openPartido(id: any, day: string): void {
    //se vacia para reiniciarla
    this.jugadoresNoConvocados = [];
    this.jugadoresSuplentes = [];
    this.jugadoresTitulares = [];

    this.matchPreparationId = id;
    this.daySession = day;
    // Obtener la información del partido por su ID
    this.trainingService.getPrePartido(id).subscribe(
      (response) => {
        // Verificar si se obtuvo correctamente la información del partido
        if (response.data) {
          // Asignar los datos del partido al objeto 'partido'
          this.match = response.data;
          this.togglePartidoVisible = response.data.visible === 0 || !response.data.visible ? 0 : 1;
          this.playersConvo = response.data.players;

          if (this.match.convocatoria != null && this.match.convocatoria != '') {
            //se carga el json y se distribuye
            // Convertir la cadena JSON a un objeto JavaScript
            const convocatoria = JSON.parse(this.match.convocatoria);
            this.jugadoresNoConvocados = convocatoria.noConvocados;
            this.jugadoresSuplentes = convocatoria.suplentes;    // Inicializa con los datos del backend
            this.jugadoresTitulares = convocatoria.titulares;
            this.showNotificar = true;
          } else {
            this.showNotificar = false;
            //se coge todo de la lista de jugadores y se pone en no convocados
            // Supongamos que response.data.players es la lista de jugadores

            if (this.playersConvo) {
              // Asignar a jugadoresNoConvocados mapeando cada jugador a una instancia de ConvocatoriaUI
              let i = 0;
              this.jugadoresNoConvocados = this.playersConvo.map((player: any, index: number) => new ConvocatoriaUI({
                id: index, // Asignar el índice como ID,
                playerId: player.playerId, // Asegúrate de que este campo esté presente en la respuesta
                nombre: (player.nick ? player.nick : player.nombre) + ' ' + (player.numero != null ? player.numero : ''),
                img: player.picturePlayer != null && player.picturePlayer != '' ? this.imageBaseUrlUser + player.picturePlayer : '', // Puedes asignar una imagen si está disponible o usar un valor por defecto
                posicion_x: player.posicion_x || null, // O asignar null si no tiene coordenadas
                posicion_y: player.posicion_y || null  // O asignar null si no tiene coordenadas
              }));
            }

            //console.log(this.jugadoresNoConvocados);
          }
          // Abrir el modal
          this.showModalPartido = true;
        } else {
          console.error('Error al obtener la información del partido:', response.error.msg);
        }
      },
      (error) => {
        console.error('Error en la solicitud:', error);
      }
    );
  }

  // Método para cerrar el modal
  cerrarModalEntrenamiento(): void {
    this.showModalEntrenamiento = false;
    this.showAddTaskForm = false;
    //this.toggleAddTaskForm();
  }

  crearTarea(): void {
    this.nuevaTarea.work = '';
    // Llamada al servicio para crear el equipo
    this.trainingService.createUpdateTask(this.trainingId.toString(), this.nuevaTarea, this.subirTarea, this.userId).subscribe(
      (response) => {
        // Agregar la nueva tarea a la lista de tareas del entrenamiento
        this.trainingSession.tasks.push(response.data);
        // Limpiar el formulario de nueva tarea
        this.nuevaTarea = new Task();
        // Ocultar el formulario de nueva tarea
        this.showAddTaskForm = false;
        //dejamos limpio los combos work
        this.selectedCategory = '';
        this.selectedSubcategory = '';
        this.selectedOption = '';
      },
      (error) => {
        console.error('Error al crear el equipo:', error);
      }
    );
  }

  toggleAddTaskForm(): void {
    this.showAddTaskForm = !this.showAddTaskForm;
    if (this.showAddTaskForm) {
      this.nuevaTarea.estrategia = '-';
      this.nuevaTarea.intencion = '-';
    }
  }

  toggleTask(tarea: Task): void {
    // Cambiar el estado isOpen de la tarea seleccionada
    tarea.collapsed = !tarea.collapsed;

    // Si la tarea se abre, cerrar el resto de las tareas
    if (tarea.collapsed) {
      this.trainingSession.tasks
        .filter(t => t !== tarea) // Filtrar todas las tareas que no sean la seleccionada
        .forEach(t => t.collapsed = false); // Cerrar cada tarea
    }
  }

  deleteTask(tarea: Task): void {
    // Lógica para eliminar el equipo llamando al servicio correspondiente
    this.trainingService.deleteTask(tarea.taskId.toString()).subscribe(
      (response) => {
        // Manejar la respuesta según tus necesidades
        console.log('Tarea eliminada con éxito:', response);

        // Cargar nuevamente el listado de equipos después de la eliminación exitosa
        this.openEntrenamiento(this.trainingId, this.daySession);
      },
      (error) => {
        console.error('Error al eliminar la tarea:', error);
        // Puedes manejar el error según tus necesidades
      }
    );
  }

  abrirModalPartido(): void {
    this.showModal = true;
  }

  cerrarModalPartido(): void {
    this.showModalPartido = false;
    // Limpiar los campos del partido
    this.match = new MatchPreparation({});
    this.convocatoriaJSON = null;
  }

  crearPartido(): void {
    let id = this.match.matchPreparationId;
    this.match.matchDate = this.daySession;
    this.match.visible = this.togglePartidoVisible;
    this.match.convocatoria = this.convocatoriaJSON ?? this.match.convocatoria;
    // Lógica para crear el partido usando this.partido y enviarlo al servicio
    this.trainingService.createUpdatePartido(this.teamId.toString(), this.match).subscribe(
      (response) => {
        // Manejar la respuesta del servidor, por ejemplo, cerrar el modal si se ha creado correctamente
        if (response.data) {
          if (id == 0) this.match = new MatchPreparation({});
          // Vuelve a cargar la lista de entrenamientos y genera el calendario actualizado
          this.getListaPrePartido();
          if (this.match.matchPreparationId === 0)
            this.cerrarModal();
          else
            this.cerrarModalPartido();

        } else {
          console.error('Error al crear el partido:', response.error.msg);
        }
      },
      (error) => {
        console.error('Error en la solicitud:', error);
      }
    );
  }

  eliminarPartido(): void {
    this.match.matchDate = this.daySession;
    // Lógica para crear el partido usando this.partido y enviarlo al servicio
    this.trainingService.deletePartido(this.teamId.toString(), this.match).subscribe(
      (response) => {
        // Manejar la respuesta del servidor, por ejemplo, cerrar el modal si se ha creado correctamente
        if (response.data) {
          // Vuelve a cargar la lista de entrenamientos y genera el calendario actualizado
          this.getListaPrePartido();
          if (this.match.matchPreparationId === 0)
            this.cerrarModal();
          else
            this.cerrarModalPartido();

        } else {
          console.error('Error al crear el partido:', response.error.msg);
        }
      },
      (error) => {
        console.error('Error en la solicitud:', error);
      }
    );
  }

  verTienda() {
    this.viewShop = true;
    this.scrollToEnd();
  }

  scrollToEnd() {
    if (this.endOfModal) {
      this.endOfModal.nativeElement.scrollIntoView({ behavior: 'smooth' });
    }
  }

  cerrarTienda() {
    this.viewShop = false;
    this.taskList = [];
  }

  tareaDescargada(response: boolean) {
    if (response) {
      this.openEntrenamiento(this.trainingId, this.daySession);
      this.cerrarTienda();
    }
  }

  openPostPartido(id: any): void {
    this.matchPreparationId = id;
    // Obtener la información del partido por su ID
    this.trainingService.getPostPartidoByMatchPrepaId(id).subscribe(
      (response) => {
        // Verificar si se obtuvo correctamente la información del partido
        if (response.data) {
          // Asignar los datos del partido al objeto 'partido'
          this.postPartido = response.data;
          this.postPartidoId = response.data.postPartidoId;
        }
        this.playerService.getPlayersPostPartido(this.teamId.toString(), this.postPartidoId.toString()).subscribe(
          (response) => {

            // Verificar si se obtuvo correctamente la información del partido
            if (response.data) {
              // Asignar los datos del partido al objeto 'partido'
              this.playerPostPartido = response.data;
              // Abrir el modal
              this.showModalPartido = false;
              this.showModalPostPartido = true;
            }

            this.trainingService.getListGolesAvanzado(this.postPartidoId).subscribe(
              (resp) => {
                if (resp.data) {
                  this.golesAvanzadoAFavor = resp.data.golesAFavor;
                  this.golesAvanzadoEnContra = resp.data.golesEnContra;
                  let afavor = this.golesAvanzadoAFavor.length;
                  let encontra = this.golesAvanzadoEnContra.length;

                  if (this.golesAvanzadoAFavor.length !== 0) {
                    this.postPartido.golesAFavor = afavor;
                  }
                  if (this.golesAvanzadoEnContra.length !== 0) {
                    this.postPartido.golesEnContra = encontra;
                  }

                  if (this.golesAvanzadoAFavor.length !== 0 || this.golesAvanzadoEnContra.length !== 0) {
                    setTimeout(() => {
                      const i = this.indexGolAvanza !== 0 ? this.indexGolAvanza : 0;
                      this.toggleGolAvanzado(true, i);
                    }, 1000);
                  }
                }
              },
              (error) => {
                console.error('Error en la solicitud:', error);
              }
            );
          },
          (error) => {
            console.error('Error en la solicitud:', error);
          }
        );
      },
      (error) => {
        console.error('Error en la solicitud:', error);
      }
    );
  }

  // Método para verificar si hay algún dato en la semana
  tieneDatosEnSemana(semana: any[]): boolean {
    return semana.some(dia => dia !== '');
  }

  cerrarModalPostPartido() {
    this.showModalPostPartido = false;
    // Limpiar los campos del partido
    this.match = new MatchPreparation({});
    this.postPartido = new PostPartido({});
  }

  guardarPostPartidoSimple() {
    this.postPartido.matchPreparation.matchPreparationId = this.matchPreparationId;
    this.trainingService.createUpdatePostPartido(this.postPartido).subscribe(
      (response) => {
        // Manejar la respuesta del servidor, por ejemplo, cerrar el modal si se ha creado correctamente
        if (response.data) {
          this.cerrarModalPostPartido();
        } else {
          console.error('Error al crear el partido:', response.error.msg);
        }
      },
      (error) => {
        console.error('Error en la solicitud:', error);
      }
    );
  }

  guardarPostPartidoAvanzado() {
    this.postPartido.matchPreparation.matchPreparationId = this.matchPreparationId;
    this.trainingService.createUpdatePostPartido(this.postPartido).subscribe(
      (response) => {
        // Manejar la respuesta del servidor, por ejemplo, cerrar el modal si se ha creado correctamente
        if (response.data) {
          this.cerrarModalPostPartido();
        } else {
          console.error('Error al crear el partido:', response.error.msg);
        }
      },
      (error) => {
        console.error('Error en la solicitud:', error);
      }
    );
  }

  togglePlayer(player: PlayerId): void {
    // Cambiar el estado isOpen de la tarea seleccionada
    player.collapsed = !player.collapsed;
    this.cerrarPlayer = player;

    let playerInfo = this.playerPostPartido.find(jugador => jugador.playerId === player.playerId);
    if (playerInfo?.info !== undefined && playerInfo?.info !== null) {
      this.playerInfoPostPartido = playerInfo.info;
    } else {
      this.playerInfoPostPartido = new PlayerPostPartido({});
    }
    //this.playerInfoPostPartido = playerResult!.info;

    // Si la tarea se abre, cerrar el resto de las tareas
    if (player.collapsed) {
      this.playerPostPartido
        .filter(t => t !== player) // Filtrar todas las tareas que no sean la seleccionada
        .forEach(t => t.collapsed = false); // Cerrar cada tarea
    }
  }

  cerrarTogglePlayer(player: PlayerId) {
    player.collapsed = !player.collapsed;
    // Si la tarea se abre, cerrar el resto de las tareas
    if (player.collapsed) {
      this.playerPostPartido
        .filter(t => t !== player) // Filtrar todas las tareas que no sean la seleccionada
        .forEach(t => t.collapsed = false); // Cerrar cada tarea
    }
  }

  guardarInfoPlayerPostPartido(playerId: number) {
    if (this.postPartidoId === 0) {
      //mostrar aqui un alert de que no se puede guardar un jugador sin antes haber guardado la info en el postpartido
    } else {
      this.playerInfoPostPartido.player.playerId = playerId;
      this.playerInfoPostPartido.postPartido.postPartidoId = this.postPartidoId;
      this.playerService.createUpdateInfoPlayerPostPartido(this.playerInfoPostPartido).subscribe(
        (response) => {
          // Manejar la respuesta del servidor, por ejemplo, cerrar el modal si se ha creado correctamente
          if (response.data) {
            // Encontrar el índice del elemento a actualizar
            const index = this.playerPostPartido.findIndex(player => player.playerId === response.data.player.playerId);
            this.playerPostPartido[index].info = response.data;
            //esto cerraria la pestaña de jugador para poder introducir los datos de otros
            this.togglePlayer(this.cerrarPlayer);
          } else {
            console.error('Error al crear el partido:', response.error.msg);
          }
        },
        (error) => {
          console.error('Error en la solicitud:', error);
        }
      );
    }
  }

  onSubmit(task: any) {
    let taskId = task.taskId;
    // Verifica si se ha seleccionado un archivo
    if (this.selectedFile) {
      //console.log('Imagen seleccionada:', this.selectedFile);

      // Llama al método createUpdateImgTask del servicio para subir la imagen
      this.trainingService.createUpdateImgTask(task.tasksShopId, taskId, this.selectedFile, this.userId)
        .subscribe(
          (response) => {
            // Construir el id completo de la imagen
            const imageId = 'imagen_tarea_' + taskId;

            // Obtener la imagen por su id
            const imgElement = document.getElementById(imageId) as HTMLImageElement;

            if (imgElement) {
              // Asignar la nueva URL de la imagen al atributo src
              imgElement.src = this.imageBaseUrlTask + response.data;
            } else {
              console.error('No se encontró la imagen con el id:', imageId);

              // Crear un nuevo elemento img
              const newImgElement = document.createElement('img') as HTMLImageElement;
              newImgElement.src = this.imageBaseUrlTask + response.data;
              newImgElement.alt = 'Imagen de la tarea';
              newImgElement.className = 'imgBoard';
              newImgElement.id = 'imagen_tarea_' + taskId;
              newImgElement.style.width = '-webkit-fill-available';

              // Obtener el div correspondiente y agregar el elemento img
              const divElement = document.getElementById('div_tarea_' + taskId);
              if (divElement) {
                divElement.appendChild(newImgElement);
              } else {
                console.error('No se encontró el div con el id:', 'div_tarea_' + taskId);
              }
            }
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


  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  onDragOver(event: any) {
    event.preventDefault();
  }

  onDrop(event: any) {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      this.selectedFile = files[0];
    }
  }

  openBoardModal() {
    this.showModalBoard = true;
  }

  cerrarBoardModal() {
    this.showModalBoard = false;
  }

  onSelectCategory(event: any): void {
    if (event.target.value === 'Tecnificación') {
      //no va haber nada mas
      this.selectedCategory = '';
      this.selectedSubcategory = '';
      this.selectedOption = '';
    } else {
      this.selectedCategory = event.target.value;
      this.selectedSubcategory = '';
      this.selectedOption = '';
      this.cat2 = '';
    }
    this.cat1 = event.target.value;
    this.cdr.detectChanges(); // Forzar la detección de cambios
  }

  onSelectSubcategory(event: any): void {
    if (event.target.value === 'Resistencia' || event.target.value === 'Fuerza') {
      this.selectedSubcategory = event.target.value;
      this.selectedOption = '';
    } else {
      this.selectedSubcategory = '';
      this.selectedOption = '';
      this.cat3 = '';
    }
    this.cat2 = event.target.value;
    this.cdr.detectChanges(); // Forzar la detección de cambios
  }

  onSelectOptionSubcategory(event: any): void {
    this.selectedOption = event.target.value;
    this.cat3 = event.target.value;
  }

  getSubcategories(): any[] {
    const selectedCategory = this.categories.find(cat => cat.name === this.selectedCategory);
    return selectedCategory ? selectedCategory.subcategories : [];
  }

  getOptions(): string[] {
    const selectedCategory = this.categories.find(cat => cat.name === this.selectedCategory);
    const selectedSubcategory = selectedCategory?.subcategories.find(subcat => subcat.name === this.selectedSubcategory);
    return selectedSubcategory ? selectedSubcategory.options : [];
  }

  printDiv(tarea: any): void {
    console.log(tarea);
    const printContents = `
        <div>
            <h1>Tarea: ${tarea.slogans}</h1>
            <p>ID: ${tarea.taskId}</p>
            <p><b>Estrategia:</b> ${tarea.estrategia}</p>
            <p><b>Intención:</b> ${tarea.intencion}</p>
            <p><b>Descripción:</b> ${tarea.description}</p>
            <p><b>Reglas:</b> ${tarea.rules}</p>
            <p><b>Variantes:</b> ${tarea.variants}</p>
            <p><b>Tiempo de Trabajo:</b> ${tarea.worktime}</p>
            <p><b>Espacio:</b> ${tarea.space}</p>
            <p><b>Material:</b> ${tarea.material}</p>
            <p><b>Video YouTube:</b> ${tarea.video}</p>
            <br>
            ${tarea.imagenBoard ? `<img src="${this.imageBaseUrlTask}${tarea.imagenBoard}" alt="Imagen de la tarea">` : ''}
            
        </div>
    `;

    const popupWin = window.open('', '_blank', 'top=0,left=0,height=100%,width=auto');

    if (popupWin) {
      popupWin.document.open();
      popupWin.document.write(`
            <html>
                <head>
                    <title>Impresión</title>
                    <style>
                        body { font-family: 'Arial', sans-serif; }
                        .btn { display: none; } /* Ocultar botones en la impresión */
                    </style>
                </head>
                <body onload="window.print();window.close();">${printContents}</body>
            </html>
        `);
      popupWin.document.close();
    }
  }

  openTaskModal(tarea: any): void {
    this.tareaSeleccionada = tarea;  // Almacena la tarea seleccionada
    this.showModalTask = true;  // Muestra el modal
  }

  closeTaskModal(): void {
    this.showModalTask = false;  // Oculta el modal
  }

  printDivPostPartido(divId: string): void {
    let printContents = document.getElementById(divId)?.innerHTML;
    let originalTitle = document.title;
    let popupWin = window.open('', '_blank', 'top=0,left=0,height=100%,width=auto');

    popupWin?.document.open();
    popupWin?.document.write(`
      <html>
        <head>
          <title>Impresión</title>
          <style>
            // Aquí puedes añadir estilos específicos para la impresión si es necesario
            body { font-family: 'Arial', sans-serif; }
            .btn { display: none; } // Ocultar botones en la impresión
          </style>
        </head>
        <body onload="window.print();window.close();">${printContents}</body>
      </html>
    `);
    popupWin?.document.close();
  }

  onChangeToggle(event: any, id: number) {
    this.toggleVisible = event.target.checked ? 1 : 0;

    // Método para cambiar la visibilidad de una sesión de entrenamiento
    this.trainingService.getTrainingSessionVisibility(id, this.toggleVisible)
      .subscribe(
        response => {
          console.log('Visibilidad actualizada:', response);
          const entrenamientoSeleccionado = this.listTraining.find(training => training.trainingSessionId === id);
          if (entrenamientoSeleccionado) {
            entrenamientoSeleccionado.visible = this.toggleVisible;
            // Actualizar el elemento en this.listTraining
            const index = this.listTraining.findIndex(training => training.trainingSessionId === id);
            if (index !== -1) {
              this.listTraining[index] = entrenamientoSeleccionado;
            }
          }
        },
        error => {
          console.error('Error al actualizar la visibilidad:', error);
          // Manejo de errores
        }
      );
  }

  onChangeTogglePartido(event: any, id: number) {
    this.togglePartidoVisible = event.target.checked ? 1 : 0;

    // Método para cambiar la visibilidad de una sesión de entrenamiento
    this.trainingService.getMatchVisibility(id, this.togglePartidoVisible)
      .subscribe(
        response => {
          console.log('Visibilidad actualizada:', response);
        },
        error => {
          console.error('Error al actualizar la visibilidad:', error);
          // Manejo de errores
        }
      );
  }

  // AQUI EMPIEZAN LOS FORMULARIOS

  openModalFormPreEntreno(trainingSessionId: number) {
    this.trainingService.getFormPreTraining(trainingSessionId, this.playerIdUserActual).subscribe(
      (response) => {
        if (response.data) {
          this.respPreEntreno = response.data;
          this.disableFormElements('formularioPreEntreno');
        } else {
          this.respPreEntreno = new RespPreEntreno({});
          this.enableFormElements('formularioPreEntreno');
        }
        this.showModalFormPreEntreno = true;
      },
      (error) => {
        console.error('Error en la solicitud:', error);
      }
    );
  }

  cerrarModalFormPreEntreno() {
    this.showModalFormPreEntreno = false;
  }

  cancelarFormPreEntreno() {
    this.respPreEntreno = new RespPreEntreno({});
    this.showModalFormPreEntreno = false;
  }

  crearFormPreEntreno() {
    this.respPreEntreno.trainingSessionId = this.trainingId;
    this.respPreEntreno.playerId = this.usuarioActual?.playerId != null ? this.usuarioActual?.playerId : 0;
    this.trainingService.createFormPreEntreno(this.respPreEntreno).subscribe(
      (response) => {
        this.respPreEntreno = new RespPreEntreno({});
        this.showModalFormPreEntreno = false;
      },
      (error) => {
        console.error('Error al guardar la sesión de entrenamiento:', error);
      }
    );
  }

  disableFormElements(formId: string) {
    const form = document.getElementById(formId) as HTMLFormElement;
    const elements = form.elements;
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i] as HTMLInputElement;
      element.disabled = true;
    }
  }

  enableFormElements(formId: string) {
    const form = document.getElementById(formId) as HTMLFormElement;
    const elements = form.elements;
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i] as HTMLInputElement;
      element.disabled = false;
    }
  }


  //----------------------------------

  openModalFormPostEntreno(trainingSessionId: number) {
    this.trainingService.getFormPostTraining(trainingSessionId, this.playerIdUserActual).subscribe(
      (response) => {
        if (response.data) {
          this.respPostEntreno = response.data;
          this.disableFormElements('formularioPostEntreno');
        } else {
          this.respPostEntreno = new RespPostEntreno({});
          this.enableFormElements('formularioPostEntreno');
        }
        this.showModalFormPostEntreno = true;
      },
      (error) => {
        console.error('Error en la solicitud:', error);
      }
    );
  }

  cerrarModalFormPostEntreno() {
    this.showModalFormPostEntreno = false;
  }

  cancelarFormPostEntreno() {
    this.respPostEntreno = new RespPostEntreno({});
    this.showModalFormPostEntreno = false;
  }

  crearFormPostEntreno() {
    this.respPostEntreno.trainingSessionId = this.trainingId;
    this.respPostEntreno.playerId = this.usuarioActual?.playerId != null ? this.usuarioActual?.playerId : 0;
    this.trainingService.createFormPostEntreno(this.respPostEntreno).subscribe(
      (response) => {
        this.respPostEntreno = new RespPostEntreno({});
        this.showModalFormPostEntreno = false;
      },
      (error) => {
        console.error('Error al guardar la sesión de entrenamiento:', error);
      }
    );
  }

  //----------------------

  openModalFormPrePartido(matchPreparationId: number) {
    this.matchPreparationId = matchPreparationId;
    this.trainingService.getFormPrePartido(matchPreparationId, this.playerIdUserActual).subscribe(
      (response) => {
        if (response.data) {
          this.respPrePartido = response.data;
          this.disableFormElements('formularioPrePartido');
        } else {
          this.respPrePartido = new RespPrePartido({});
          this.enableFormElements('formularioPrePartido');
        }
        this.showModalFormPrePartido = true;
      },
      (error) => {
        console.error('Error en la solicitud:', error);
      }
    );
  }

  cerrarModalFormPrePartido() {
    this.showModalFormPrePartido = false;
  }

  cancelarFormPrePartido() {
    this.respPrePartido = new RespPrePartido({});
    this.showModalFormPrePartido = false;
  }

  crearFormPrePartido() {
    this.respPrePartido.matchPreparationId = this.matchPreparationId;
    this.respPrePartido.playerId = this.usuarioActual?.playerId != null ? this.usuarioActual?.playerId : 0;
    this.trainingService.createFormPrePartido(this.respPrePartido).subscribe(
      (response) => {
        this.respPrePartido = new RespPrePartido({});
        this.showModalFormPrePartido = false;
      },
      (error) => {
        console.error('Error al guardar la sesión de entrenamiento:', error);
      }
    );
  }

  //-----------------------------

  openModalFormPostPartido(matchPreparationId: number) {
    this.matchPreparationId = matchPreparationId;
    this.trainingService.getFormPostPartido(matchPreparationId, this.playerIdUserActual).subscribe(
      (response) => {
        if (response.data) {
          this.respPostPartido = response.data;
          this.disableFormElements('formularioPostPartido');
        } else {
          this.respPostPartido = new RespPostPartido({});
          this.enableFormElements('formularioPostPartido');
        }
        this.showModalFormPostPartido = true;
      },
      (error) => {
        console.error('Error en la solicitud:', error);
      }
    );
  }

  cerrarModalFormPostPartido() {
    this.showModalFormPostPartido = false;
  }

  cancelarFormPostPartido() {
    this.respPostPartido = new RespPostPartido({});
    this.showModalFormPostPartido = false;
  }

  crearFormPostPartido() {
    this.respPostPartido.matchPreparationId = this.matchPreparationId;
    this.respPostPartido.playerId = this.playerId;
    this.trainingService.createFormPostPartido(this.respPostPartido).subscribe(
      (response) => {
        this.respPostPartido = new RespPostPartido({});
        this.showModalFormPostPartido = false;
        if (!response.data) {
          alert('No se han enviado las respuestas porque ya se rellenó anteriormente y solo se puede una vez por partido.');
        } else {
          alert('Respuestas enviadas correctamente.');
        }
      },
      (error) => {
        console.error('Error al guardar la sesión de entrenamiento:', error);
      }
    );
  }


  // AQUI TERMINAN LOS FORMULARIOS
  // AQUI VER LOS FORMULARIOS COMO ENTRENADOR O CLUB

  openModalPreEntrenamiento(id: number) {
    this.trainingService.getListFormPreTraining(id).subscribe(
      (response) => {
        if (response.data) {
          this.respListPreEntreno = response.data;
          this.showModalPreEntrenamiento = true;
        }
      },
      (error) => {
        console.error('Error en la solicitud:', error);
      }
    );
  }

  cerrarModalPreEntrenamiento() {
    this.showModalPreEntrenamiento = false;
  }



  toggleTaskPreEn(pre: RespPreEntreno): void {
    // Cambiar el estado isOpen de la tarea seleccionada
    pre.collapsed = !pre.collapsed;

    // Si la tarea se abre, cerrar el resto de las tareas
    if (pre.collapsed) {
      this.respListPreEntreno
        .filter(t => t !== pre) // Filtrar todas las tareas que no sean la seleccionada
        .forEach(t => t.collapsed = false); // Cerrar cada tarea
    }
  }

  //----------------------

  openModalPostEntrenamiento(id: number) {
    this.trainingService.getListFormPostTraining(id).subscribe(
      (response) => {
        if (response.data) {
          this.respListPostEntreno = response.data;
          this.showModalPostEntrenamiento = true;
        }
      },
      (error) => {
        console.error('Error en la solicitud:', error);
      }
    );
  }

  cerrarModalPostEntrenamiento() {
    this.showModalPostEntrenamiento = false;
  }

  toggleTaskPostEn(post: RespPostEntreno): void {
    // Cambiar el estado isOpen de la tarea seleccionada
    post.collapsed = !post.collapsed;

    // Si la tarea se abre, cerrar el resto de las tareas
    if (post.collapsed) {
      this.respListPostEntreno
        .filter(t => t !== post) // Filtrar todas las tareas que no sean la seleccionada
        .forEach(t => t.collapsed = false); // Cerrar cada tarea
    }
  }

  //----------------------

  openModalPrePartido(id: number) {
    this.trainingService.getListFormPreMatch(id).subscribe(
      (response) => {
        if (response.data) {
          this.respListPreMatch = response.data;
          this.showModalPreMatch = true;
        }
      },
      (error) => {
        console.error('Error en la solicitud:', error);
      }
    );
  }

  cerrarModalPrePartido() {
    this.showModalPreMatch = false;
  }

  toggleTaskPreMatch(pre: RespPrePartido): void {
    // Cambiar el estado isOpen de la tarea seleccionada
    pre.collapsed = !pre.collapsed;

    // Si la tarea se abre, cerrar el resto de las tareas
    if (pre.collapsed) {
      this.respListPreMatch
        .filter(t => t !== pre) // Filtrar todas las tareas que no sean la seleccionada
        .forEach(t => t.collapsed = false); // Cerrar cada tarea
    }
  }

  //----------------------

  openModalPostMatch(id: number) {
    this.trainingService.getListFormPostMatch(id).subscribe(
      (response) => {
        if (response.data) {
          this.respListPostMatch = response.data;
          this.showModalPostMatch = true;
        }
      },
      (error) => {
        console.error('Error en la solicitud:', error);
      }
    );
  }

  cerrarModalPostMatch() {
    this.showModalPostMatch = false;
  }

  //-----------------------

  openModalAsistencia(id: number) {
    this.trainingSessionIdSelected = id;
    this.trainingService.getListAsistenciaByTraining(id, this.teamId).subscribe(
      (response) => {
        if (response.data) {
          this.listAsistencia = response.data;
          this.showModalAsistencia = true;
        }
      },
      (error) => {
        console.error('Error en la solicitud:', error);
      }
    );
  }

  cerrarModalAsistencia() {
    this.showModalAsistencia = false;
  }

  toggleAsistencia(index: number, value: number) {
    this.listAsistencia[index].asistencia = value === 0 ? 1 : 0;
    this.updateRopaClub(this.listAsistencia[index]);
  }

  toggleRetraso(index: number, value: number) {
    this.listAsistencia[index].retraso = value === 0 ? 1 : 0;
    this.updateRopaClub(this.listAsistencia[index]);
  }

  comboMulta(index: number) {
    this.updateRopaClub(this.listAsistencia[index]);
  }

  motivoMulta(index: number) {
    this.updateRopaClub(this.listAsistencia[index]);
  }

  updateRopaClub(asis: AsistenciaTraining) {
    this.trainingService.updateAsistenciaByAsistencia(asis).subscribe(
      (response) => {
        //todo ok
      },
      (error) => {
        console.error('Error al crear el equipo:', error);
        // Puedes manejar el error según tus necesidades
      }
    );
  }

  toggleTaskPostPartido(post: RespPostPartido): void {
    // Cambiar el estado isOpen de la tarea seleccionada
    post.collapsed = !post.collapsed;

    // Si la tarea se abre, cerrar el resto de las tareas
    if (post.collapsed) {
      this.respListPostMatch
        .filter(t => t !== post) // Filtrar todas las tareas que no sean la seleccionada
        .forEach(t => t.collapsed = false); // Cerrar cada tarea
    }
  }

  onSelectGolTypes(event: any): void {
    if (event.target.value === 'Falta disparo directo' || event.target.value === 'Penalti') {
      //no va haber nada mas
      this.selectedGolTypes = '';
      this.selectedSubGolTypes = '';
      this.selectedOptionGolTypes = '';
    } else {
      this.selectedGolTypes = event.target.value;
      this.selectedSubGolTypes = '';
      this.selectedOptionGolTypes = '';
      this.cat22 = '';
    }

    if (event.target.value === 'Jugada combinativa' || event.target.value === 'Pérdida/Recuperación'
      || event.target.value === 'Falta') {
      this.showSelectedOptional = true;
    } else {
      this.showSelectedOptional = false;
    }
    this.cat11 = event.target.value;
    this.cdr.detectChanges(); // Forzar la detección de cambios

  }

  onSelectSubGolTypes(event: any): void {
    this.selectedSubGolTypes = event.target.value;
    this.selectedOptionGolTypes = '';
    this.cat22 = event.target.value;
    this.cdr.detectChanges(); // Forzar la detección de cambios
  }

  onSelectOptionSubGolTypes(event: any): void {
    this.selectedOptionGolTypes = event.target.value;
    this.cat33 = event.target.value;
  }

  getSubGolTypes(): any[] {
    const selectedGolTypes = this.golTypes.find(cat => cat.name === this.selectedGolTypes);
    return selectedGolTypes ? selectedGolTypes.subcategories : [];
  }

  getOptionsGolTypes(): string[] {
    const selectedGolTypes = this.golTypes.find(cat => cat.name === this.selectedGolTypes);
    const selectedSubGolTypes = selectedGolTypes?.subcategories.find(subcat => subcat.name === this.selectedSubGolTypes);
    return selectedSubGolTypes ? selectedSubGolTypes.options : [];
  }

  /*onSelectOpcional(event: any): void {
    if (event.target.value !== 0)
      this.cat11 = this.cat11 + event.target.value;
  }*/

  toggleCollapse(id: string) {
    const collapseElement = document.getElementById(id);
    if (collapseElement!.classList.contains('show')) {
      collapseElement!.classList.remove('show');
    } else {
      collapseElement!.classList.add('show');
    }

    if (id === 'collapseEnContra') {
      this.toggleGolAvanzado(false, 0);
    } else {
      this.toggleGolAvanzado(true, 0);
    }
  }

  toggleGolAvanzado(isAFavor: boolean, index: number): void {
    this.indexGolAvanza = index;
    let access = false;
    if (isAFavor) {
      if (index < this.golesAvanzadoAFavor.length) {
        this.golAvanzadoAFavor = this.golesAvanzadoAFavor[index];
        this.selectedGolTypes = this.golAvanzadoAFavor.category;

        this.selectedSubGolTypes = this.golAvanzadoAFavor.subCategory;
        this.selectedOptionGolTypes = this.golAvanzadoAFavor.option;
        this.selectedGolTypesCombi = this.golAvanzadoAFavor.combinado;
        access = true;
      } else {
        this.golAvanzadoAFavor = new GolPostPartido({});
      }
    } else {
      if (index < this.golesAvanzadoEnContra.length) {
        this.golAvanzadoEnContra = this.golesAvanzadoEnContra[index];
        this.selectedGolTypes = this.golAvanzadoEnContra.category;

        this.selectedSubGolTypes = this.golAvanzadoEnContra.subCategory;
        this.selectedOptionGolTypes = this.golAvanzadoEnContra.option;
        this.selectedGolTypesCombi = this.golAvanzadoEnContra.combinado;
        access = true;
        /*if (this.selectedGolTypes === 'En propia')
          this.isSelectDisabled = false;
        else
          this.isSelectDisabled = true;*/
      } else {
        this.golAvanzadoEnContra = new GolPostPartido({});
      }
    }

    if (access) {
      if (this.selectedGolTypes === 'Jugada combinativa' || this.selectedGolTypes === 'Pérdida/Recuperación'
        || this.selectedGolTypes === 'Falta') {
        this.showSelectedOptional = true;
      } else {
        this.showSelectedOptional = false;
      }
    } else {
      this.showSelectedOptional = false;
      this.selectedGolTypes = '';
      this.selectedSubGolTypes = '';
      this.selectedOptionGolTypes = '';
      this.selectedGolTypesCombi = '';
    }
  }

  agregarGol(isAFavor: number) {
    let gol = new GolPostPartido({});

    if (isAFavor === 0) {
      gol = this.golAvanzadoAFavor;
    } else {
      gol = this.golAvanzadoEnContra;
    }

    gol.aFavor = isAFavor;
    gol.category = this.cat11 === '' ? gol.category : this.cat11;
    gol.subCategory = this.cat22 === '' ? gol.subCategory : this.cat22;
    gol.option = this.cat33 === '' ? gol.option : this.cat33;
    gol.combinado = this.selectedGolTypesCombi === '' ? '0' : this.selectedGolTypesCombi;
    gol.teamId = this.teamId;

    this.trainingService.createUpdateGolPostPartidoAvanzado(gol, this.postPartidoId).subscribe(
      (resp) => {
        if (resp.data) {
          this.golesAvanzadoAFavor = resp.data.golesAFavor;
          this.golesAvanzadoEnContra = resp.data.golesEnContra;
          let afavor = this.golesAvanzadoAFavor.length;
          let encontra = this.golesAvanzadoEnContra.length;

          //this.playerInfoPostPartido = resp.data.info;

          if (this.golesAvanzadoAFavor.length !== 0) {
            this.postPartido.golesAFavor = afavor;
          }
          if (this.golesAvanzadoEnContra.length !== 0) {
            this.postPartido.golesEnContra = encontra;
          }

          this.guardar();

          //if (this.golesAvanzadoAFavor.length !== 0 || this.golesAvanzadoEnContra.length !== 0) this.toggleGolAvanzado(true, 0);
        }
      },
      (error) => {
        console.error('Error en la solicitud:', error);
      }
    );
  }

  borrarGol(isAFavor: number) {
    let gol = new GolPostPartido({});

    if (isAFavor === 0) {
      gol = this.golAvanzadoAFavor;
      this.golAvanzadoAFavor = new GolPostPartido({});
    } else {
      gol = this.golAvanzadoEnContra;
      this.golAvanzadoEnContra = new GolPostPartido({});
    }
    this.selectedGolTypes = '';
    this.selectedSubGolTypes = '';
    this.selectedOptionGolTypes = '';
    this.selectedGolTypesCombi = '';

    this.trainingService.deleteGolPostPartidoAvanzado(gol.golPostPartidoId, this.postPartidoId).subscribe(
      (resp) => {
        if (resp.data) {
          this.golesAvanzadoAFavor = resp.data.golesAFavor;
          this.golesAvanzadoEnContra = resp.data.golesEnContra;
          this.postPartido.golesAFavor = this.golesAvanzadoAFavor.length;
          this.postPartido.golesEnContra = this.golesAvanzadoEnContra.length;

          this.borrar();

          //if (this.golesAvanzadoAFavor.length !== 0 || this.golesAvanzadoEnContra.length !== 0) this.toggleGolAvanzado(true, 0);
        }
      },
      (error) => {
        console.error('Error en la solicitud:', error);
      }
    );
  }

  // Método para mostrar el alert y ocultarlo después de 2 segundos
  guardar() {
    this.showAlert = true;
    setTimeout(() => {
      this.showAlert = false;
    }, 2000);
    //alert('Guardado correctamente');
  }

  borrar() {
    this.showAlert2 = true;
    setTimeout(() => {
      this.showAlert2 = false;
    }, 2000);
  }

  toggleChangeSubirTarea(actualValue: number) {
    const nuevoValor = actualValue === 0 ? 1 : 0;
    const confirmacion = confirm('AVISO: Al activar esta opción, su tarea de entrenamiento será pública y visible para otros entrenadores. ' +
      'Cualquier dato ingresado será accesible. No está permitido publicar información, datos o imágenes con derechos de autor sin el permiso del autor. ' +
      'Cualquier contenido que infrinja esta norma será eliminado. ¿Estás seguro?');

    if (confirmacion) {
      this.subirTarea = nuevoValor;
    } else {
      // Si el usuario cancela, restablece el valor original del switch
      setTimeout(() => {
        (document.getElementById('subirTarea') as HTMLInputElement).checked = actualValue === 1;
      }, 0);
    }
  }

  // Método para abrir Google Maps con la dirección
  openInGoogleMaps(): void {
    if (this.match.lugar && this.match.lugar.trim()) {
      const address = encodeURIComponent(this.match.lugar.trim());
      const url = `https://www.google.com/maps/search/?api=1&query=${address}`;
      window.open(url, '_blank');
    }
  }

  // Evento para arrastrar con ratón (PC)
  onDragStart(event: DragEvent, jugador: any) {
    event.dataTransfer?.setData('jugador', JSON.stringify(jugador));
  }

  // Permitir el arrastre
  allowDrop(event: DragEvent) {
    event.preventDefault();
  }

  // Evento para soltar en la zona correspondiente con el ratón (PC)
  onDrop2(event: DragEvent, estado: string) {
    event.preventDefault();
    const jugadorData = event.dataTransfer?.getData('jugador');
    if (jugadorData) {
      const jugador = JSON.parse(jugadorData);

      // Actualiza el estado del jugador
      this.actualizarEstadoJugador(jugador, estado);

      // Si se suelta en titulares, actualizamos las coordenadas del jugador
      if (estado === 'titular') {
        const fieldRect = (event.target as HTMLElement).getBoundingClientRect();
        jugador.posicion_x = event.clientX - fieldRect.left;
        jugador.posicion_y = event.clientY - fieldRect.top;
      }

      // Mueve al jugador a la nueva lista
      this.moverJugador(jugador, estado);
    }
  }

  // Eventos táctiles para soportar arrastrar con el dedo (móviles y tablets)
  onTouchStart(event: TouchEvent, jugador: any): void {
    this.touchJugador = jugador;
    this.startX = event.touches[0].clientX;
    this.startY = event.touches[0].clientY;
    event.preventDefault(); // Prevenir acciones no deseadas como el scroll
  }

  onTouchMove(event: TouchEvent): void {
    if (this.touchJugador) {
      const touch = event.touches[0];
      const fieldRect = (document.querySelector('.field') as HTMLElement).getBoundingClientRect();
      this.touchJugador.posicion_x = touch.clientX - fieldRect.left;
      this.touchJugador.posicion_y = touch.clientY - fieldRect.top;

      // Actualiza la posición del jugador en el DOM
      const playerElement = document.querySelector(`.player[data-id="${this.touchJugador.id}"]`) as HTMLElement;
      if (playerElement) {
        playerElement.style.left = `${this.touchJugador.posicion_x}px`;
        playerElement.style.top = `${this.touchJugador.posicion_y}px`;
      }

      event.preventDefault(); // Evitar el desplazamiento de la página mientras se arrastra
    }
  }

  onTouchEnd(event: TouchEvent, estado: string): void {
    if (this.touchJugador) {
      const fieldRect = (document.querySelector('.field') as HTMLElement).getBoundingClientRect();

      // Ajustar las coordenadas si se suelta en titulares
      if (estado === 'titular') {
        this.touchJugador.posicion_x = this.touchJugador.posicion_x - fieldRect.left;
        this.touchJugador.posicion_y = this.touchJugador.posicion_y - fieldRect.top;
      }

      this.actualizarEstadoJugador(this.touchJugador, estado);
      this.moverJugador(this.touchJugador, estado);
      this.touchJugador = null; // Resetear variable
    }
  }

  actualizarEstadoJugador(jugador: any, estado: string) {
    jugador.estado = estado;
  }

  moverJugador(player: any, estado: string) {
    this.removeJugador(player);

    switch (estado) {
      case 'no_convocado':
        this.jugadoresNoConvocados.push(player);
        break;
      case 'suplente':
        this.jugadoresSuplentes.push(player);
        break;
      case 'titular':
        this.jugadoresTitulares.push(player);
        break;
    }
  }

  removeJugador(jugador: any) {
    this.jugadoresNoConvocados = this.jugadoresNoConvocados.filter(j => j.id !== jugador.id);
    this.jugadoresSuplentes = this.jugadoresSuplentes.filter(j => j.id !== jugador.id);
    this.jugadoresTitulares = this.jugadoresTitulares.filter(j => j.id !== jugador.id);
  }

  guardarConvocatoria() {
    const convocatoria = {
      noConvocados: this.jugadoresNoConvocados,
      suplentes: this.jugadoresSuplentes,
      titulares: this.jugadoresTitulares.map(j => ({
        id: j.id,
        playerId: j.playerId,
        nombre: j.nombre,
        img: j.img,
        posicion_x: j.posicion_x,
        posicion_y: j.posicion_y
      }))
    };

    // Convertir la convocatoria a una cadena JSON
    this.convocatoriaJSON = JSON.stringify(convocatoria);

    this.playerService.updateConvocatoria(this.convocatoriaJSON, this.matchPreparationId).subscribe(response => {
      alert('Convocatoria guardada con éxito.');
      this.showNotificar = true;
    });
  }

  abrirModalConvocatoria() {
    this.mostrarModalConvocatoria = true;
  }

  cerrarModalConvocatoria() {
    this.mostrarModalConvocatoria = false;
  }

  abrirModalConvocatoriaLista() {
    let ui = new NotificatePlayerUI({});
    ui.players = this.playersConvo;
    // Asignar los nombres de jugadores no convocados
    ui.noConvocados = this.jugadoresNoConvocados.map((jugador: ConvocatoriaUI) => jugador.nombre);

    // Asignar los nombres de jugadores suplentes y titulares a convocados
    ui.convocados = [
      ...this.jugadoresSuplentes.map((jugador: ConvocatoriaUI) => jugador.nombre),
      ...this.jugadoresTitulares.map((jugador: ConvocatoriaUI) => jugador.nombre)
    ];

    this.showConvocados = ui.convocados;
    this.showNoConvocados = ui.noConvocados;
    this.mostrarModalConvocatoriaLista = true;
  }

  cerrarModalConvocatoriaLista() {
    this.mostrarModalConvocatoriaLista = false;
  }

  enviarConvocatoria() {
    let partido = this.match;
    //crear el objeto para enviarlo
    let ui = new NotificatePlayerUI({});
    ui.players = this.playersConvo;

    ui.local = partido.terreno == 'Local' ? 0 : 1;
    ui.lugar = partido.lugar;
    ui.rival = partido.rivalName;
    ui.tipoPartido = partido.tipoPartido;

    //esta es la hora de partido
    ui.horaPartido = partido.horaEmpieza + ':' + partido.minutosEmpieza;
    ui.horaQuedada = partido.hora + ':' + partido.minutos;
    ui.fechaPartido = partido.matchDate;

    // Asignar los nombres de jugadores no convocados
    ui.noConvocados = this.jugadoresNoConvocados.map((jugador: ConvocatoriaUI) => jugador.nombre);

    // Asignar los nombres de jugadores suplentes y titulares a convocados
    ui.convocados = [
      ...this.jugadoresTitulares.map((jugador: ConvocatoriaUI) => jugador.nombre),
      ...this.jugadoresSuplentes.map((jugador: ConvocatoriaUI) => jugador.nombre)
    ].sort((a, b) => a.localeCompare(b)); // Ordenar alfabéticamente    

    ui.mailEntrenador = this.usuarioActual?.mail !== undefined ? this.usuarioActual?.mail : '';
    //console.log(ui);

    this.playerService.notificateMatchPlayer(ui, this.teamId).subscribe(response => {
      alert('Notificados con éxito.');
    });
  }

  match2: any = {
    rivalName: '',
    terreno: '',
    imgClub: '',
    horaQuedada: '',
    horaPartido: '',
    lugar: '',
    puntosFuertesRival: '',
    puntosDebilesRival: '',
    jugadoresClaveRival: '',
    estiloJuegoRival: '',
    ultimosResultadosRival: '',
    formacionesRecientesRival: '',
    patronesOfensivosRival: '',
    patronesDefensivosRival: '',
    tendenciasTacticasRival: '',
    datosIndividualesRival: '',
    abpsRival: '',
    formacionInicial: '',
    planJuegoAtaque: '',
    planJuegoDefensa: '',
    transicionesOfensivas: '',
    transicionesDefensivas: '',
    abpsOfensivas: '',
    abpsDefensivas: '',
    rolesEspecificos: '',
    ajustesTacticos: '',
    refereeName: ''
  };

  convertImgToBase64URL(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = url;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.height = img.height;
        canvas.width = img.width;
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataURL = canvas.toDataURL('image/png');
          resolve(dataURL);
        } else {
          reject(new Error('Failed to get canvas context.'));
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image.'));
      };
    });
  }

  async generatePDF() {
    this.match2.rivalName = this.match.rivalName;
    this.match2.terreno = this.match.terreno;
    this.match2.lugar = this.match.lugar;
    this.match2.horaQuedada = this.match.hora + ':' + this.match.minutos;
    this.match2.horaPartido = this.match.horaEmpieza + ':' + this.match.minutosEmpieza;
    this.match2.puntosFuertesRival = this.match.puntosFuertesRival;
    this.match2.puntosDebilesRival = this.match.puntosDebilesRival;
    this.match2.jugadoresClaveRival = this.match.jugadoresClaveRival;
    this.match2.estiloJuegoRival = this.match.estiloJuegoRival;
    this.match2.ultimosResultadosRival = this.match.ultimosResultadosRival;
    this.match2.formacionesRecientesRival = this.match.formacionesRecientesRival;
    this.match2.patronesOfensivosRival = this.match.patronesOfensivosRival;
    this.match2.patronesDefensivosRival = this.match.patronesDefensivosRival;
    this.match2.tendenciasTacticasRival = this.match.tendenciasTacticasRival;
    this.match2.datosIndividualesRival = this.match.datosIndividualesRival;
    this.match2.abpsRival = this.match.abpsRival;
    this.match2.formacionInicial = this.match.formacionInicial;
    this.match2.planJuegoAtaque = this.match.planJuegoAtaque;
    this.match2.planJuegoDefensa = this.match.planJuegoDefensa;
    this.match2.transicionesOfensivas = this.match.transicionesOfensivas;
    this.match2.transicionesDefensivas = this.match.transicionesDefensivas;
    this.match2.abpsOfensivas = this.match.abpsOfensivas;
    this.match2.abpsDefensivas = this.match.abpsDefensivas;
    this.match2.rolesEspecificos = this.match.rolesEspecificos;
    this.match2.ajustesTacticos = this.match.ajustesTacticos;
    this.match2.refereeName = this.match.refereeName;

    try {
      const base64Img = await this.convertImgToBase64URL(this.match2.imgClub);
      this.match2.imgClub = base64Img;
    } catch (error) {
      console.error('Failed to convert image to Base64:', error);
      // Establecer una imagen de respaldo o proceder sin la imagen
      this.match2.imgClub = 'assets/images/512.png';  // Cambia a una imagen predeterminada si es necesario
    }

    const element = document.getElementById('pdf-content');
    const options = {
      margin: 0.5,
      filename: 'informe-partido.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().from(element).set(options).save();
  }

  abrirModalPDF() {
    this.showModalPDF = true;
  }

  cerrarModalPDF() {
    this.showModalPDF = false;
  }


}

