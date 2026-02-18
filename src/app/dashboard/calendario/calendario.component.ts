import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgZone,
  OnInit,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AsistenciaTraining,
  Task,
  Training,
} from 'src/app/core/services/models/training.models';
import { TrainingService } from 'src/app/core/services/training/training.service';
import { Response } from 'src/app/core/services/models/response.model';
import {
  ConvocatoriaUI,
  MatchPreparation,
  PlayerPostPartido,
  PostPartido,
  PostPartidoId,
} from 'src/app/core/services/models/match.model';
import { MatDialog } from '@angular/material/dialog';
import { PlayerService } from 'src/app/core/services/player/player.service';
import {
  NotificatePlayerUI,
  PlayerId,
} from 'src/app/core/services/player/player.model';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TeamService } from 'src/app/core/services/team/team.service';
import { LoginService } from 'src/app/core/services/login/login.service';
import { User } from 'src/app/core/models/users/user.model';
import {
  RespPostEntreno,
  RespPostPartido,
  RespPreEntreno,
  RespPrePartido,
} from 'src/app/core/services/player/respuestas.model';
import { GolPostPartido } from 'src/app/core/services/team/team.model';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { environment } from 'src/environments/environment';
import { Location } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { TranslateService } from '@ngx-translate/core';
import { FormTemplateSelectorResult } from 'src/app/dashboard/shared/form-template-selector/form-template-selector.component';
import { FormTemplate } from 'src/app/core/services/form-template/form-template.model';
import { FormTemplateService } from 'src/app/core/services/form-template/form-template.service';

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
  styleUrls: ['./calendario.component.scss'],
})
export class CalendarioComponent implements OnInit, OnDestroy {
  @ViewChild('endOfModal', { static: false }) endOfModal!: ElementRef;
  private aiDataChangedHandler = () => this.reloadDataFromAi();

  datosCargados: boolean = false;
  teamId!: number; // Ajusta el valor según el teamId del equipo actual
  clubId: number = 0;
  calendario: any[][] = [];

  // ── Selector de formularios pre/post para coaches ─────────────────────────
  showFormTemplateSelector = false;
  formSelectorTipo: 'pre-match' | 'post-match' | 'pre-training' | 'post-training' = 'post-match';
  formSelectorEntityId: number = 0;
  mesActual: Date = new Date();
  /** Vista actual: año (grid 12 meses), mes (tabla), semana (7 días) */
  vistaCalendario: 'year' | 'month' | 'week' = 'month';
  /** Año mostrado en vista año */
  anioActual: number = new Date().getFullYear();
  /** Semana actual para vista semana (array de 7 días, lun-dom) */
  semanaActual: any[] = [];
  /** Título para vista semana, ej. "9 - 15 Feb 2026" */
  tituloSemana: string = '';
  // Variable para almacenar el nombre del mes y el año actual
  tituloMesAnio!: string;
  showModal = false;
  showModalEntrenamiento = false;
  trainingSession: Training = new Training({});
  private initTrainingSession(): Training {
    return new Training({
      trainingSessionId: 0,
      objectiveSession: '',
      warmUp: '',
      addressSession: '',
      visible: 1,
      tasks: [],
    });
  }

  daySession!: string;
  listTraining: any[] = []; // Define una variable para almacenar el listado de equipos
  listMatchPreparation: any[] = [];
  today: Date = (() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  })();
  todayNumber = this.today.getDate();
  todayMonth = this.today.getMonth();
  todayYear = this.today.getFullYear();

  mostrarModal = false;
  nuevaTarea: Task = new Task();
  showAddTaskForm = false;
  trainingId!: number;
  matchPreparationId!: number;

  showModalPartido: boolean = false;
  match: MatchPreparation = new MatchPreparation({});
  selectedActivity: 'entrenamiento' | 'partido' | 'otra' | '' = '';
  selectedItem: {
    type: 'entrenamiento' | 'partido' | 'otra' | null;
    id: number | null;
  } = { type: null, id: null };
  mode:
    | 'empty'
    | 'view-entrenamiento'
    | 'view-partido'
    | 'create-entrenamiento'
    | 'create-partido'
    | 'create-otra' = 'empty';
  /* ===== FLAGS DERIVADOS ===== */
  get isEmpty(): boolean {
    return this.mode === 'empty';
  }
  get isCreate(): boolean {
    return this.mode === 'create-partido';
  }

  get isView(): boolean {
    return this.mode === 'view-partido';
  }

  get isEdit(): boolean {
    return !!this.usuarioActual && this.usuarioActual.profileType.profileId < 3;
  }
  get canShowTabs(): boolean {

    //Solo en VIEW o CREATE
    if (!this.isView && !this.isCreate) {
      return false;
    }

    //Entrenador / Admin (NO jugador)
    if (this.isEdit) {
      return true;
    }

    // Jugador → depende de infoVisible
    return this.match?.infoVisible === 1;
  }
  get canShowTasks(): boolean {
    // En CREATE siempre se ve
    if (this.mode === 'create-entrenamiento') {
      return true;
    }

    // En VIEW
    if (this.mode === 'view-entrenamiento') {
      // No jugador (coach / admin)
      if (this.profileId !== 3) {
        return true;
      }

      // Jugador → solo si infoVisible = 1
      return this.trainingSession?.infoVisible === 1;
    }

    return false;
  }
  get infoVisibleModel(): boolean {
    return this.trainingSession?.infoVisible === 1;
  }

  set infoVisibleModel(value: boolean) {
    if (this.trainingSession) {
      this.trainingSession.infoVisible = value ? 1 : 0;
    }
  }
  // Nuevas variables para campo - Convocatoria
  // ================== FORMACIONES ==================
  formacionSeleccionada = '4-4-2';

  slotsFormacion: any[] = [];
  slotActivoDrag: number | null = null;

  /* Posiciones con buen espacio entre slots (x más separados en cada línea) */
  FORMACIONES: any = {
    '4-4-2': [
      { id: 1, x: 50, y: 90 },
      { id: 2, x: 12, y: 72 },
      { id: 3, x: 32, y: 72 },
      { id: 4, x: 68, y: 72 },
      { id: 5, x: 88, y: 72 },
      { id: 6, x: 15, y: 48 },
      { id: 7, x: 38, y: 48 },
      { id: 8, x: 62, y: 48 },
      { id: 9, x: 85, y: 48 },
      { id: 10, x: 35, y: 18 },
      { id: 11, x: 65, y: 18 }
    ],
    '4-3-3': [
      { id: 1, x: 50, y: 90 },
      { id: 2, x: 12, y: 72 },
      { id: 3, x: 32, y: 72 },
      { id: 4, x: 68, y: 72 },
      { id: 5, x: 88, y: 72 },
      { id: 6, x: 25, y: 50 },
      { id: 7, x: 50, y: 50 },
      { id: 8, x: 75, y: 50 },
      { id: 9, x: 18, y: 18 },
      { id: 10, x: 50, y: 14 },
      { id: 11, x: 82, y: 18 }
    ],
    '4-2-3-1': [
      { id: 1, x: 50, y: 90 },
      { id: 2, x: 12, y: 72 },
      { id: 3, x: 32, y: 72 },
      { id: 4, x: 68, y: 72 },
      { id: 5, x: 88, y: 72 },
      { id: 6, x: 32, y: 58 },
      { id: 7, x: 68, y: 58 },
      { id: 8, x: 18, y: 34 },
      { id: 9, x: 50, y: 32 },
      { id: 10, x: 82, y: 34 },
      { id: 11, x: 50, y: 10 }
    ],
    '4-5-1': [
      { id: 1, x: 50, y: 90 },
      { id: 2, x: 12, y: 72 },
      { id: 3, x: 32, y: 72 },
      { id: 4, x: 68, y: 72 },
      { id: 5, x: 88, y: 72 },
      { id: 6, x: 12, y: 48 },
      { id: 7, x: 30, y: 48 },
      { id: 8, x: 50, y: 48 },
      { id: 9, x: 70, y: 48 },
      { id: 10, x: 88, y: 48 },
      { id: 11, x: 50, y: 12 }
    ],
    '3-5-2': [
      { id: 1, x: 50, y: 90 },
      { id: 2, x: 22, y: 72 },
      { id: 3, x: 50, y: 72 },
      { id: 4, x: 78, y: 72 },
      { id: 5, x: 12, y: 50 },
      { id: 6, x: 30, y: 50 },
      { id: 7, x: 50, y: 50 },
      { id: 8, x: 70, y: 50 },
      { id: 9, x: 88, y: 50 },
      { id: 10, x: 35, y: 16 },
      { id: 11, x: 65, y: 16 }
    ],
    '3-4-3': [
      { id: 1, x: 50, y: 90 },
      { id: 2, x: 22, y: 72 },
      { id: 3, x: 50, y: 72 },
      { id: 4, x: 78, y: 72 },
      { id: 5, x: 18, y: 48 },
      { id: 6, x: 38, y: 48 },
      { id: 7, x: 62, y: 48 },
      { id: 8, x: 82, y: 48 },
      { id: 9, x: 18, y: 16 },
      { id: 10, x: 50, y: 12 },
      { id: 11, x: 82, y: 16 }
    ],
    '5-3-2': [
      { id: 1, x: 50, y: 90 },
      { id: 2, x: 8, y: 72 },
      { id: 3, x: 25, y: 72 },
      { id: 4, x: 50, y: 72 },
      { id: 5, x: 75, y: 72 },
      { id: 6, x: 92, y: 72 },
      { id: 7, x: 32, y: 48 },
      { id: 8, x: 50, y: 48 },
      { id: 9, x: 68, y: 48 },
      { id: 10, x: 35, y: 16 },
      { id: 11, x: 65, y: 16 }
    ],
    '5-4-1': [
      { id: 1, x: 50, y: 90 },
      { id: 2, x: 8, y: 72 },
      { id: 3, x: 25, y: 72 },
      { id: 4, x: 50, y: 72 },
      { id: 5, x: 75, y: 72 },
      { id: 6, x: 92, y: 72 },
      { id: 7, x: 18, y: 48 },
      { id: 8, x: 38, y: 48 },
      { id: 9, x: 62, y: 48 },
      { id: 10, x: 82, y: 48 },
      { id: 11, x: 50, y: 12 }
    ]
  };

  private autoSelectionDone = false;


  showNewActivityMenu = false;

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
            'Finalizaciones',
          ],
        },
        {
          name: 'Fuerza',
          options: [
            'Circuitos Físicos',
            'Juego de Posesión',
            'Ataque – Defensa',
            'Finalizaciones',
          ],
        },
        {
          name: 'Velocidad',
          options: [],
        },
      ],
    },
    {
      name: 'Trabajo Táctico',
      subcategories: [
        {
          name: 'Trabajo por posiciones',
          options: [],
        },
        {
          name: 'Trabajo por líneas',
          options: [],
        },
        {
          name: 'Específicos',
          options: [],
        },
      ],
    },
    {
      name: 'Tecnificación',
      subcategories: [],
    },
    {
      name: 'ABP',
      subcategories: [
        {
          name: 'Faltas laterales',
          options: [],
        },
        {
          name: 'Faltas frontales',
          options: [],
        },
        {
          name: 'Corners',
          options: [],
        },
      ],
    },
    {
      name: 'Trabajo Preventivo',
      subcategories: [
        {
          name: 'Core',
          options: [],
        },
        {
          name: 'Estabilización de rodilla',
          options: [],
        },
        {
          name: 'Glúteos',
          options: [],
        },
        {
          name: 'Cuádriceps',
          options: [],
        },
        {
          name: 'Aductores',
          options: [],
        },
        {
          name: 'Isquiotibiales',
          options: [],
        },
        {
          name: 'Gemelos',
          options: [],
        },
        {
          name: 'Propiocepción',
          options: [],
        },
      ],
    },
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

  respListPreEntreno: RespPreEntreno[] = [];
  respListPostEntreno: RespPostEntreno[] = [];
  respListPreMatch: RespPrePartido[] = [];
  respListPostMatch: RespPostPartido[] = [];
  listAsistencia: AsistenciaTraining[] = [];

  golTypes = [
    {
      name: 'En propia',
      subcategories: [],
    },
    {
      name: 'Jugada combinativa',
      subcategories: [
        {
          name: 'Banda Izquierda',
          options: [
            'Tiro a portería',
            'Remate de cabeza',
            'Otra parte del cuerpo',
          ],
        },
        {
          name: 'Banda Derecha',
          options: [
            'Tiro a portería',
            'Remate de cabeza',
            'Otra parte del cuerpo',
          ],
        },
        {
          name: 'Zona interior',
          options: [
            'Tiro a portería',
            'Remate de cabeza',
            'Otra parte del cuerpo',
          ],
        },
        {
          name: 'Dentro del área',
          options: [
            'Tiro a portería',
            'Remate de cabeza',
            'Otra parte del cuerpo',
          ],
        },
        {
          name: 'Fuera del área',
          options: [
            'Tiro a portería',
            'Remate de cabeza',
            'Otra parte del cuerpo',
          ],
        },
      ],
    },
    {
      name: 'Pérdida/Recuperación',
      subcategories: [
        {
          name: 'Banda Izquierda',
          options: [
            'Tiro a portería',
            'Remate de cabeza',
            'Otra parte del cuerpo',
          ],
        },
        {
          name: 'Banda Derecha',
          options: [
            'Tiro a portería',
            'Remate de cabeza',
            'Otra parte del cuerpo',
          ],
        },
        {
          name: 'Zona interior',
          options: [
            'Tiro a portería',
            'Remate de cabeza',
            'Otra parte del cuerpo',
          ],
        },
        {
          name: 'Dentro del área',
          options: [
            'Tiro a portería',
            'Remate de cabeza',
            'Otra parte del cuerpo',
          ],
        },
        {
          name: 'Fuera del área',
          options: [
            'Tiro a portería',
            'Remate de cabeza',
            'Otra parte del cuerpo',
          ],
        },
      ],
    },
    {
      name: 'Córner',
      subcategories: [
        {
          name: 'Izquierda',
          options: [
            'Olímpico 1er palo',
            'Olímpico 2do palo',
            'De cabeza 1er palo',
            'De cabeza punto de penalti',
            'De cabeza 2nd palo',
            'Con otra parte 1er palo',
            'Con otra parte punto de penalti',
            'Con otra parte 2do palo',
          ],
        },
        {
          name: 'Derecha',
          options: [
            'Olímpico 1er palo',
            'Olímpico 2do palo',
            'De cabeza 1er palo',
            'De cabeza punto de penalti',
            'De cabeza 2nd palo',
            'Con otra parte 1er palo',
            'Con otra parte punto de penalti',
            'Con otra parte 2do palo',
          ],
        },
      ],
    },
    {
      name: 'Falta disparo directo',
      subcategories: [],
    },
    {
      name: 'Falta',
      subcategories: [
        {
          name: 'Banda Izquierda',
          options: [
            'Tiro a portería',
            'Remate de cabeza',
            'Otra parte del cuerpo',
          ],
        },
        {
          name: 'Banda Derecha',
          options: [
            'Tiro a portería',
            'Remate de cabeza',
            'Otra parte del cuerpo',
          ],
        },
        {
          name: 'Zona Interior',
          options: [
            'Tiro a portería',
            'Remate de cabeza',
            'Otra parte del cuerpo',
          ],
        },
        {
          name: 'Dentro del área',
          options: [
            'Tiro a portería',
            'Remate de cabeza',
            'Otra parte del cuerpo',
          ],
        },
        {
          name: 'Fuera del área',
          options: [
            'Tiro a portería',
            'Remate de cabeza',
            'Otra parte del cuerpo',
          ],
        },
      ],
    },
    {
      name: 'Saque de banda',
      subcategories: [
        {
          name: 'Banda Izquierda',
          options: [
            'Tiro a portería',
            'Remate de cabeza',
            'Otra parte del cuerpo',
          ],
        },
        {
          name: 'Banda Derecha',
          options: [
            'Tiro a portería',
            'Remate de cabeza',
            'Otra parte del cuerpo',
          ],
        },
        {
          name: 'Zona interior',
          options: [
            'Tiro a portería',
            'Remate de cabeza',
            'Otra parte del cuerpo',
          ],
        },
        {
          name: 'Dentro del área',
          options: [
            'Tiro a portería',
            'Remate de cabeza',
            'Otra parte del cuerpo',
          ],
        },
        {
          name: 'Fuera del área',
          options: [
            'Tiro a portería',
            'Remate de cabeza',
            'Otra parte del cuerpo',
          ],
        },
      ],
    },
    {
      name: 'Penalti',
      subcategories: [],
    },
  ];

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

  /** Slots dinámicos: solo se muestran los formularios que el usuario va agregando */
  goalSlotsAFavor: number[] = [0];
  goalSlotsEnContra: number[] = [0];
  readonly maxGolesSlots: number = 10;
  readonly goalSlotLabels: string[] = [
    'CAL.TEXT_136', 'CAL.TEXT_153', 'CAL.TEXT_154', 'CAL.TEXT_155', 'CAL.TEXT_156',
    'CAL.TEXT_157', 'CAL.TEXT_158', 'CAL.TEXT_159', 'CAL.TEXT_160', 'CAL.TEXT_161'
  ];

  showAlert: boolean = false;
  showAlert2: boolean = false;
  categoryTeam = 0;
  subirTarea = 0;

  estrategias: string[] = [
    'Acciones a Balón Parado',
    'Acciones Combinadas',
    'Circuito',
    'Conservación',
    'Juego Adaptado al Fútbol',
    'Juego de Posición',
    'Juego de Posición Específico',
    'Oleadas',
    'Partidos',
    'Posesión',
    'Rueda de Pases',
    'Situaciones Reducidas',
    'Trabajo de Líneas',
  ];

  intenciones: string[] = [
    '1 vs 1',
    '2 vs 1',
    '2 vs 2',
    '3 vs 3',
    '4 vs 4',
    'ABP Defensiva',
    'ABP Ofensiva',
    'Amplitud',
    'Apoyos',
    'Ataque Organizado',
    'Ataque-Defensa',
    'Cobertura',
    'Conservar',
    'Contraataque',
    'Defensa Inicio de Juego',
    'Defensa de Juego Directo',
    'Defensa Organizada',
    'Desmarques',
    'Dividir',
    'Evitar Progresión',
    'Fase Defensiva',
    'Fase Ofensiva',
    'Fijar',
    'Finalizar',
    'Inicio de Juego',
    'Juego Directo',
    'Mantener',
    'Marcaje',
    'Orientar',
    'Permuta',
    'Presionar',
    'Primer Atacante',
    'Primer Defensor',
    'Profundidad',
    'Progresar',
    'Proteger Portería',
    'Recuperar',
    'Reinicio de Juego',
    'Replegar',
    'Segundo Atacante',
    'Segundo Defensor',
    'Temporizar',
    'Tercer Atacante',
    'Tercer Defensor',
    'Transición Defensiva',
    'Transición Ofensiva',
    'Transiciones',
  ];

  userId: any = 0;

  showModalTask: boolean = false;
  tareaSeleccionada: any;

  showEditTaskModal: boolean = false;
  tareaEditando: Task | null = null;

  // Genera un array con los números del 0 al 1000
  numeros: number[] = [0, ...Array.from({ length: 1000 }, (_, i) => i + 1)];

  selectedNumber: number = 0; // Por defecto, seleccionamos 0
  trainingSessionIdSelected = 0;

  match1: Match = {
    lugar: '',
    // Asegúrate de inicializar otras propiedades de MatchPreparation si las tiene
  };

  jugadoresNoConvocados: ConvocatoriaUI[] = [];
  startConvocarotia: ConvocatoriaUI[] = [];
  jugadoresSuplentes: ConvocatoriaUI[] = [];
  jugadoresLesionados: ConvocatoriaUI[] = [];
  jugadoresTitulares: ConvocatoriaUI[] = [];

  mostrarModalConvocatoria = false;
  mostrarModalConvocatoriaLista = false;
  showNotificar = false;

  playersConvo: any[] = [];
  horas: string[] = [];
  /** Opciones para minutos (quedada y partido): 00, 15, 30, 45 */
  minutosOpciones: string[] = ['00', '15', '30', '45'];

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
  profileId = 0;
  playerAsistencia = false;
  motivoNoAsistencia = '';

  constructor(
    public router: Router,
    private route: ActivatedRoute,
    private trainingService: TrainingService,
    private playerService: PlayerService,
    private teamService: TeamService,
    private cdr: ChangeDetectorRef,
    private loginService: LoginService,
    private location: Location,
    private toastr: ToastrService,
    private ngZone: NgZone,
    private formTemplateService: FormTemplateService,
  ) { }

  ngOnInit(): void {
    window.addEventListener('ai-data-changed', this.aiDataChangedHandler);
    // Suscríbete al observable del servicio para obtener el usuario actual
    console.log(this.today);
    this.loginService.usuarioActual.subscribe((user) => {
      this.usuarioActual = user;
      this.userId = user?.userId;
      this.profileId =
        user?.profileType.profileId != null ? user?.profileType.profileId : 0;

      // Override admin: si el userId es 9 (admin que también actúa como coach),
      // forzar profileId = 2 para que el calendario funcione correctamente
      if (user?.userId === 9 && this.profileId !== 1 && this.profileId !== 2) {
        this.profileId = 2;
      }

      // Suscribirse a los cambios en los parámetros de la URL
      this.route.params.subscribe((params) => {
        // Obtener el valor de teamId de los parámetros
        this.teamId = +params['teamId']; // El + convierte el valor a número
        this.playerId = +params['playerId']; // El + convierte el valor a número
        //console.log('teamId:', this.teamId);
      });
      this.teamService.getTeamById(this.teamId.toString()).subscribe(
        (response: Response) => {
          // Verifica que la propiedad 'data' exista en la respuesta
          if (response.data !== null) {
            this.nombreEquipo =
              (response.data.categoryType?.categoryName || '') +
              ' ' +
              (response.data.levelLeague || '');
            this.categoryTeam = response.data.categoryTypeId;
            this.imgClub = response.data.imgClub;
            this.clubId = response.data.clubId || 0;
            this.match2.imgClub =
              this.imageBaseUrl + 'user/' + response.data.imgClub;
            if (this.categoryTeam === 14) this.irAPantalla(2);
            this.getListaEntrenamientos();
          } else {
            console.error(
              'La respuesta del servicio no tiene la estructura esperada',
              response,
            );
            // Intentar cargar entrenamientos aunque el equipo no tenga datos completos
            this.getListaEntrenamientos();
          }
        },
        (error) => {
          console.error('Error al cargar datos del equipo, intentando cargar entrenamientos igualmente', error);
          this.getListaEntrenamientos();
        },
      );
    });
    this.horas = this.generarHoras(8, 21);
  }

  ngOnDestroy(): void {
    window.removeEventListener('ai-data-changed', this.aiDataChangedHandler);
  }

  private reloadDataFromAi(): void {
    if (this.teamId) {
      console.log('[Calendario] reloadDataFromAi triggered for teamId=' + this.teamId);
      this.ngZone.run(() => {
        this.getListaEntrenamientos();
        this.cdr.detectChanges();
      });
    }
  }

  goBack(): void {
    this.location.back();
  }

  select(option: string) {
    this.selected = option;
  }

  // Método para generar el calendario para el mes especificado
  private generarCalendarioV2(mes: Date): void {
    const primerDiaMes = new Date(mes.getFullYear(), mes.getMonth(), 1);
    let primerDiaSemana = primerDiaMes.getDay();
    primerDiaSemana = primerDiaSemana === 0 ? 6 : primerDiaSemana - 1;

    const ultimoDiaMes = new Date(
      mes.getFullYear(),
      mes.getMonth() + 1,
      0
    ).getDate();

    this.calendario = [];
    let dia = 1;

    for (let i = 0; i < 6; i++) {
      this.calendario[i] = [];

      for (let j = 0; j < 7; j++) {
        if ((i === 0 && j < primerDiaSemana) || dia > ultimoDiaMes) {
          this.calendario[i][j] = '';
          continue;
        }

        const fecha = new Date(mes.getFullYear(), mes.getMonth(), dia, 12);
        const daysession =
          fecha.getFullYear() +
          '-' +
          String(fecha.getMonth() + 1).padStart(2, '0') +
          '-' +
          String(fecha.getDate()).padStart(2, '0');

        const training = this.listTraining.find(
          t => t.daySession === daysession
        );

        const match = this.listMatchPreparation.find(
          m => m.matchDate === daysession
        );

        this.calendario[i][j] = {
          numero: dia,
          daysession,

          trainingId: training?.trainingSessionId ?? null,
          trainingVisible: training?.visible ?? 0,
          startTime: training?.startTime ?? null,
          endTime: training?.endTime ?? null,

          matchPreparationId: match?.matchPreparationId ?? null,
          matchVisible: match?.visible ?? 0,

          rivalName: match?.rivalName ?? null,

          terreno: match?.terreno ?? null
        };

        dia++;
      }
    }

    this.tituloMesAnio = mes
      .toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
      .toUpperCase();
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

  navigateToDebrief(type: 'training' | 'match', entityId: number): void {
    const tipo = type === 'match' ? 'post-match' : 'post-training';
    this.formSelectorTipo = tipo as any;
    this.formSelectorEntityId = entityId;
    this.showFormTemplateSelector = true;
  }

  openPreForm(type: 'training' | 'match', entityId: number): void {
    const tipo = type === 'match' ? 'pre-match' : 'pre-training';
    this.formSelectorTipo = tipo as any;
    this.formSelectorEntityId = entityId;
    this.showFormTemplateSelector = true;
  }

  onFormTemplateSelected(result: FormTemplateSelectorResult): void {
    this.showFormTemplateSelector = false;
    const isMatch = this.formSelectorTipo === 'pre-match' || this.formSelectorTipo === 'post-match';
    const type = isMatch ? 'match' : 'training';
    if (result.type === 'standard') {
      if (this.formSelectorTipo === 'post-match' || this.formSelectorTipo === 'post-training') {
        this.router.navigate(['/dashboard/debrief', type, this.teamId, this.formSelectorEntityId]);
      } else {
        this.toastr.info('Formulario estándar de preparación no disponible aún', 'Formulario PRE');
      }
    }
    // Respuesta a template personalizado: se persiste vía servicio
    if (result.type === 'custom' && result.template) {
      this.persistFormTemplateResponse(result.template);
    }
  }

  private persistFormTemplateResponse(template: FormTemplate): void {
    const isMatch = this.formSelectorTipo === 'pre-match' || this.formSelectorTipo === 'post-match';
    const payload: any = {
      formTemplateId: template.formTemplateId,
      coachUserId: this.userId,
      teamId: this.teamId,
      tipo: this.formSelectorTipo,
      respuestas: '[]',
      isStandard: 0,
    };
    if (isMatch) {
      payload.matchPreparationId = this.formSelectorEntityId;
    } else {
      payload.trainingSessionId = this.formSelectorEntityId;
    }
    this.formTemplateService.saveResponse(payload).subscribe(
      (res: any) => {
        this.toastr.success(`Formulario "${template.nombre}" guardado correctamente`, 'Formulario guardado');
      },
      () => {
        this.toastr.error('Error al guardar las respuestas del formulario', 'Error');
      }
    );
  }

  onFormTemplateSelectorClosed(): void {
    this.showFormTemplateSelector = false;
  }

  navegarAInicio(): void {
    this.router.navigate(['/dashboard/inicio']);
  }

  agregarEvento(dia: number) { }

  mesAnterior() {
    if (this.vistaCalendario === 'week') {
      const d = new Date(this.mesActual);
      d.setDate(d.getDate() - 7);
      this.mesActual = d;
      this.generarVistaSemana();
      return;
    }
    this.mesActual.setMonth(this.mesActual.getMonth() - 1);
    this.generarCalendarioV2(this.mesActual);
  }

  mesSiguiente() {
    if (this.vistaCalendario === 'week') {
      const d = new Date(this.mesActual);
      d.setDate(d.getDate() + 7);
      this.mesActual = d;
      this.generarVistaSemana();
      return;
    }
    this.mesActual.setMonth(this.mesActual.getMonth() + 1);
    this.generarCalendarioV2(this.mesActual);
  }

  anioAnterior() {
    this.anioActual--;
  }

  anioSiguiente() {
    this.anioActual++;
  }

  /** Cambiar a vista año y sincronizar año con mes actual */
  irAVistaAnio() {
    this.vistaCalendario = 'year';
    this.anioActual = this.mesActual.getFullYear();
  }

  irAVistaMes() {
    this.vistaCalendario = 'month';
    this.generarCalendarioV2(this.mesActual);
  }

  /** Ir a vista semana: semana que contiene mesActual */
  irAVistaSemana() {
    this.vistaCalendario = 'week';
    this.generarVistaSemana();
  }

  /** Construye semanaActual (lun-dom) que contiene la fecha de referencia */
  generarVistaSemana(): void {
    const ref = new Date(this.mesActual);
    ref.setHours(12, 0, 0, 0);
    let dayOfWeek = ref.getDay();
    dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const lunes = new Date(ref);
    lunes.setDate(ref.getDate() - dayOfWeek);
    this.semanaActual = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(lunes);
      d.setDate(lunes.getDate() + i);
      const daysession =
        d.getFullYear() +
        '-' +
        String(d.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(d.getDate()).padStart(2, '0');
      const training = this.listTraining.find(t => t.daySession === daysession);
      const match = this.listMatchPreparation.find(m => m.matchDate === daysession);
      this.semanaActual.push({
        numero: d.getDate(),
        daysession,
        trainingId: training?.trainingSessionId ?? null,
        trainingVisible: training?.visible ?? 0,
        startTime: training?.startTime ?? null,
        endTime: training?.endTime ?? null,
        matchPreparationId: match?.matchPreparationId ?? null,
        matchVisible: match?.visible ?? 0,
        rivalName: match?.rivalName ?? null,
        terreno: match?.terreno ?? null
      });
    }
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    this.tituloSemana =
      lunes.getDate() +
      ' - ' +
      domingo.getDate() +
      ' ' +
      domingo.toLocaleDateString('es-ES', { month: 'short' }) +
      ' ' +
      domingo.getFullYear();
  }

  /** Nombre del mes para vista año (0-11), primera letra en mayúscula */
  getNombreMes(mesIndex: number): string {
    const name = new Date(2026, mesIndex, 1).toLocaleDateString('es-ES', { month: 'long' });
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  /** Al elegir un mes en vista año, pasar a mes y generar calendario */
  seleccionarMesEnVistaAnio(mesIndex: number): void {
    this.mesActual = new Date(this.anioActual, mesIndex, 1);
    this.vistaCalendario = 'month';
    this.generarCalendarioV2(this.mesActual);
  }

  trackByIndex(index: number): number {
    return index;
  }

  // Método para abrir el modal de creación de equipo
  abrirModal(day: string): void {
    this.resetModalState();
    this.daySession = day;
    this.trainingSession = this.initTrainingSession();

    this.match = new MatchPreparation({});

    this.match.hora = this.match.hora != '' ? this.match.hora : '08';
    this.match.minutos = this.match.minutos != '' ? this.match.minutos : '15';

    this.match.horaEmpieza =
      this.match.horaEmpieza != '' ? this.match.horaEmpieza : '09';
    this.match.minutosEmpieza =
      this.match.minutosEmpieza != '' ? this.match.minutosEmpieza : '15';
    this.showModal = true;
    setTimeout(() => {
      this.seleccionarPrimerItemDelDia();
    });
  }

  seleccionarPrimerItemDelDia() {

    const entrenamientos = this.listTraining
      .filter(t => t.daySession === this.daySession && this.puedeVerEntrenamientoEnLista(t));

    if (entrenamientos.length > 0) {
      const t = entrenamientos[0];

      this.selectActivity(
        'entrenamiento',
        t.trainingSessionId,
        t
      );
      return;
    }

    const partidos = this.listMatchPreparation
      .filter(m => m.matchDate === this.daySession && this.puedeVerPartidoEnLista(m));

    if (partidos.length > 0) {
      const m = partidos[0];

      this.selectActivity(
        'partido',
        m.matchPreparationId,
        m
      );
    }
  }

  resetModalState() {
    this.mode = 'empty';

    this.selectedItem = { type: null, id: null };
    this.showAddTaskForm = false;
    this.showNewActivityMenu = false;
    this.trainingSession = this.initTrainingSession();
    this.match = {} as any;
  }

  // Método para cerrar el modal de creación de equipo
  cerrarModal(): void {
    this.showModal = false;

    // Día
    this.daySession = '';

    // Estado visual
    this.mode = 'empty';

    this.showAddTaskForm = false;
    this.showNewActivityMenu = false;

    // Selección
    this.selectedItem = { type: null, id: null };
    this.selectedActivity = '';
    // Datos
    this.trainingSession = this.initTrainingSession();

    this.match = {} as any;

    // Extra seguridad
    this.viewShop = false;
  }

  toggleNewActivityMenu(event: MouseEvent) {
    event.stopPropagation();
    this.showNewActivityMenu = !this.showNewActivityMenu;
  }
  private generarHoras(inicio: number, fin: number): string[] {
    const resultado: string[] = [];
    for (let i = inicio; i <= fin; i++) {
      resultado.push(i.toString().padStart(2, '0'));
    }
    return resultado;
  }


  crearEntrenamiento() {
    this.trainingSession.daySession = this.daySession + 'T12:00:00';

    console.log(this.trainingSession)
    if (
      this.trainingSession.infoVisible === undefined ||
      this.trainingSession.infoVisible === null
    ) {
      this.trainingSession.infoVisible = 0;
    }
    console.log("TRAI", this.trainingSession)
    this.trainingService
      .createUpdateTrainingSession(this.teamId.toString(), this.trainingSession)
      .subscribe(
        (response) => {
          // Vuelve a cargar la lista de entrenamientos y genera el calendario actualizado
          this.getListaEntrenamientos();
          // Cerrar el modal después de crear el equipo
          // NUEVO: decidir cierre según modo
          if (this.mode === 'create-entrenamiento') {
            this.cerrarModal();
          } else {
            this.cerrarModalEntrenamiento();
          }
        },
        (error) => {
          console.error('Error al guardar la sesión de entrenamiento:', error);
          // Aquí puedes manejar el error, si es necesario
        },
      );
  }

  showDeleteTrainingConfirm = false;

  eliminarEntrenamiento() {
    this.showDeleteTrainingConfirm = true;
  }

  confirmDeleteTraining() {
    this.showDeleteTrainingConfirm = false;
    this.trainingSession.daySession = this.daySession;
    this.trainingService
      .deleteTrainingSession(this.teamId.toString(), this.trainingSession)
      .subscribe(
        (response) => {
          console.log('Sesión de entrenamiento eliminada con éxito:', response);
          this.getListaEntrenamientos();
          if (this.trainingSession.trainingSessionId === 0) this.cerrarModal();
          else this.cerrarModalEntrenamiento();
        },
        (error) => {
          console.error('Error al eliminar la sesión de entrenamiento:', error);
        },
      );
  }

  cancelDeleteTraining() {
    this.showDeleteTrainingConfirm = false;
  }

  getListaEntrenamientos() {
    this.trainingService.getTrainingSessions(this.teamId.toString()).subscribe(
      (response: Response) => {
        console.log("ENTRENAMIENTOS:", response)
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response && response.data && Array.isArray(response.data)) {
          // Mapea los datos bajo 'data' a instancias del modelo Team
          this.listTraining = response.data.map(
            (team: Training) => new Training(team),
          );
        } else {
          this.listTraining = [];
          if (response?.data !== null && response?.data !== undefined) {
            console.error(
              'La respuesta del servicio no tiene la estructura esperada',
              response,
            );
          }
        }
        // Siempre continuar para generar el calendario (aunque no haya datos de entrenamientos)
        this.getListaPrePartido();
      },
      (error) => {
        console.error('Error al cargar entrenamientos:', error);
        this.listTraining = [];
        this.getListaPrePartido();
      },
    );
  }

  getListaPrePartido() {
    this.trainingService
      .getListPrePartidoByTeam(this.teamId.toString())
      .subscribe(
        (response: Response) => {
          console.log("PRE_PARTIDO", response)
          // Verifica que la propiedad 'data' exista en la respuesta
          if (response && response.data && Array.isArray(response.data)) {
            // Mapea los datos bajo 'data' a instancias del modelo Team
            this.listMatchPreparation = response.data.map(
              (match: MatchPreparation) => new MatchPreparation(match),
            );
          } else {
            this.listMatchPreparation = [];
            if (response?.data !== null && response?.data !== undefined) {
              console.error(
                'La respuesta del servicio no tiene la estructura esperada',
                response,
              );
            }
          }
          // Siempre generar el calendario, aunque no haya pre-partidos
          this.generarCalendarioV2(this.mesActual);
          if (this.vistaCalendario === 'week') this.generarVistaSemana();
          this.datosCargados = true;

          // Auto-abrir evento si venimos del calendario del club con queryParams
          this.autoOpenFromQueryParams();
        },
        (error) => {
          console.error('Error al cargar pre-partidos, generando calendario sin ellos', error);
          this.listMatchPreparation = [];
          this.generarCalendarioV2(this.mesActual);
          if (this.vistaCalendario === 'week') this.generarVistaSemana();
          this.datosCargados = true;
        },
      );
  }

  /**
   * Lee queryParams (eventType, eventId, eventDate) para abrir automáticamente
   * el detalle de un entrenamiento o partido al llegar desde el calendario del club.
   */
  private autoOpenFromQueryParams(): void {
    this.route.queryParams.subscribe((qp) => {
      const eventType = qp['eventType'];   // 'entrenamiento' | 'partido'
      const eventId = +qp['eventId'];
      const eventDate = qp['eventDate'];   // 'YYYY-MM-DD'

      if (!eventType || !eventId || !eventDate) return;

      // Navegar al mes correcto si es diferente al actual
      const eventDateObj = new Date(eventDate + 'T12:00:00');
      if (
        eventDateObj.getMonth() !== this.mesActual.getMonth() ||
        eventDateObj.getFullYear() !== this.mesActual.getFullYear()
      ) {
        this.mesActual = new Date(eventDateObj.getFullYear(), eventDateObj.getMonth(), 1);
        this.generarCalendarioV2(this.mesActual);
      }

      // Abrir el modal del día y luego seleccionar el evento específico
      this.abrirModal(eventDate);

      setTimeout(() => {
        if (eventType === 'entrenamiento') {
          const training = this.listTraining.find(
            (t) => t.trainingSessionId === eventId
          );
          if (training) {
            this.selectActivity('entrenamiento', eventId, training);
          }
        } else if (eventType === 'partido') {
          const match = this.listMatchPreparation.find(
            (m) => m.matchPreparationId === eventId
          );
          if (match) {
            this.selectActivity('partido', eventId, match);
          }
        }

        // Limpiar queryParams para evitar re-apertura si se navega dentro del calendario
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {},
          replaceUrl: true,
        });
      }, 100);
    });
  }

  puedeVerPartido(dia: any): boolean {
    const perfil = this.profileId ?? this.usuarioActual?.profileType?.profileId;

    if (!dia.matchPreparationId) return false;

    // Club (0, 1) + Coach (2) + Staff (6, 7) → siempre pueden ver
    if (perfil === 0 || perfil === 1 || perfil === 2 || perfil === 6 || perfil === 7) return true;

    if (perfil === 3) {
      return dia.matchVisible === 1;
    }

    return false;
  }


  puedeVerPartidoEnLista(m: any): boolean {
    const perfil = this.profileId ?? this.usuarioActual?.profileType?.profileId;

    const esVisible =
      m.visible === 1 ||
      m.visible === '1' ||
      m.visible === true;

    // Club (0, 1) + Coach (2) + Staff (6, 7) → siempre
    if (perfil === 0 || perfil === 1 || perfil === 2 || perfil === 6 || perfil === 7) {
      return true;
    }

    // Jugador → solo visibles
    if (perfil === 3) {
      return esVisible;
    }

    return false;
  }
  puedeVerEntrenamientoEnLista(t: any): boolean {
    const perfil = this.profileId ?? this.usuarioActual?.profileType?.profileId;

    const esVisible =
      t.visible === 1 ||
      t.visible === '1' ||
      t.visible === true;

    // Club (0, 1) + Coach (2) + Staff (6, 7) → siempre
    if (perfil === 0 || perfil === 1 || perfil === 2 || perfil === 6 || perfil === 7) {
      return true;
    }

    // Jugador → solo visibles
    if (perfil === 3) {
      return esVisible;
    }

    return false;
  }

  puedeVerEntrenamiento(dia: any): boolean {
    const perfil = this.profileId ?? this.usuarioActual?.profileType?.profileId;

    if (!dia.trainingId) return false;

    // Club (0, 1) + Coach (2) + Staff de tipo coach (6, 7) → siempre pueden ver
    if (perfil === 0 || perfil === 1 || perfil === 2 || perfil === 6 || perfil === 7) return true;

    // Jugador → solo si el entrenamiento está marcado como visible
    if (perfil === 3) {
      return dia.trainingVisible === 1;
    }

    return false;
  }


  openEntrenamiento(id: any, day: string): void {
    this.mode = 'view-entrenamiento';
    this.daySession = day;
    this.trainingId = id;

    const entrenamiento = this.listTraining.find(
      t => t.trainingSessionId === id
    );

    if (!entrenamiento) return;

    this.trainingSession = entrenamiento;
    this.trainingService.getTasksByTraining(id.toString()).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response && response.data && Array.isArray(response.data)) {
          // Buscar el entrenamiento por su ID en la lista de entrenamientos
          const entrenamientoSeleccionado = this.listTraining.find(
            (training) => training.trainingSessionId === id,
          );
          if (entrenamientoSeleccionado) {
            // Asignar el entrenamiento seleccionado a la variable trainingSession
            this.trainingSession = entrenamientoSeleccionado;
            this.trainingSession.tasks = response.data;
            // Abrir el modal
            this.showModalEntrenamiento = true;
          }

          this.toggleVisible =
            entrenamientoSeleccionado.visible === 0 ||
              !entrenamientoSeleccionado.visible
              ? 0
              : 1;
        } else {
          console.error(
            'La respuesta del servicio no tiene la estructura esperada',
            response,
          );
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      },
    );
  }

  openPartido(id: any, day: string): void {
    this.mode = 'view-partido';
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
          this.togglePartidoVisible =
            response.data.visible === 0 || !response.data.visible ? 0 : 1;
          this.playersConvo = response.data.players;

          if (
            this.match.convocatoria != null &&
            this.match.convocatoria !== ''
          ) {
            // Parse convocatoria
            const convocatoria = JSON.parse(this.match.convocatoria || '{}');

            // Parse siAsisten -> Set<number> (solo si viene y es válido)
            let asistentesSet: Set<number> | null = null;
            const siAsistenStr = this.match.siAsisten;
            if (siAsistenStr && siAsistenStr.trim().length > 0) {
              try {
                const ids: any = JSON.parse(siAsistenStr); // p.ej. "[741,456,453]"
                if (Array.isArray(ids)) {
                  asistentesSet = new Set(
                    ids
                      .map((x: any) => Number(x))
                      .filter((n: number) => Number.isFinite(n)),
                  );
                }
              } catch (e) {
                console.error('Error parseando siAsisten:', e);
              }
            }

            // Helper: filtra por siAsisten si existe; si no, devuelve el array original
            const filtrarPorAsistentes = (arr: any[]): any[] => {
              if (!Array.isArray(arr)) return [];
              if (!asistentesSet || asistentesSet.size === 0) return arr;
              return arr.filter((p) => asistentesSet!.has(Number(p?.playerId)));
            };

            // Aplica el filtrado ANTES de asignar a las variables del componente
            // this.jugadoresNoConvocados = filtrarPorAsistentes(convocatoria?.noConvocados ?? []);
            this.jugadoresNoConvocados = convocatoria?.noConvocados ?? [];
            this.jugadoresSuplentes = convocatoria?.suplentes ?? [];
            this.jugadoresLesionados = convocatoria?.lesionados ?? [];
            this.jugadoresTitulares = convocatoria?.titulares ?? [];

            if (
              this.jugadoresTitulares.length > 0 ||
              this.jugadoresSuplentes.length > 0
            ) {
              this.showNotificar = true;
            }

            // Copia base de todos los jugadores (como no convocados iniciales)
            if (this.playersConvo) {
              const nuevosNoConvocados = this.playersConvo.map(
                (player: any, index: number) =>
                  new ConvocatoriaUI({
                    id: index,
                    playerId: player.playerId,
                    nombre:
                      (player.nick ? player.nick : player.nombre) +
                      ' ' +
                      (player.numero != null ? player.numero : ''),
                    img: player.picturePlayer
                      ? this.imageBaseUrlUser + player.picturePlayer
                      : '',
                    posicion_x: player.posicion_x || null,
                    posicion_y: player.posicion_y || null,
                    confirmacion: player.confirmacion,
                  }),
              );
              this.startConvocarotia = [...nuevosNoConvocados];
            }
          } else {
            this.showNotificar = false;

            if (this.playersConvo) {
              this.jugadoresNoConvocados = this.playersConvo.map(
                (player: any, index: number) =>
                  new ConvocatoriaUI({
                    id: index,
                    playerId: player.playerId,
                    nombre:
                      (player.nick ? player.nick : player.nombre) +
                      ' ' +
                      (player.numero != null ? player.numero : ''),
                    img:
                      player.picturePlayer != null && player.picturePlayer != ''
                        ? this.imageBaseUrlUser + player.picturePlayer
                        : '',
                    posicion_x: player.posicion_x || null,
                    posicion_y: player.posicion_y || null,
                    confirmacion: player.confirmacion,
                  }),
              );

              this.startConvocarotia = [...this.jugadoresNoConvocados];
            }
          }

          // Abrir el modal
          this.showModalPartido = true;
        } else {
          console.error(
            'Error al obtener la información del partido:',
            response.error.msg,
          );
        }
      },
      (error) => {
        console.error('Error en la solicitud:', error);
      },
    );
  }

  getIconoConfirmacion(confirmacion: number): { icon: string; color: string } {
    if (confirmacion === 1) {
      return { icon: '✔️', color: 'green' }; // Tic verde
    } else {
      return { icon: '❌', color: 'red' }; // X roja
    }
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
    this.trainingService
      .createUpdateTask(
        this.trainingId.toString(),
        this.nuevaTarea,
        this.subirTarea,
        this.userId,
      )
      .subscribe(
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
        },
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
        .filter((t) => t !== tarea) // Filtrar todas las tareas que no sean la seleccionada
        .forEach((t) => (t.collapsed = false)); // Cerrar cada tarea
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
      },
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
    this.match.matchDate = this.daySession + 'T12:00:00';
    this.match.visible = this.togglePartidoVisible;
    this.match.convocatoria = this.convocatoriaJSON ?? this.match.convocatoria;
    console.log('infoVisible ANTES payload:', this.match.infoVisible);
    const payload = {
      ...this.match
    };
    console.log("PAYY", payload)
    // Lógica para crear el partido usando this.partido y enviarlo al servicio
    this.trainingService
      .createUpdatePartido(this.teamId.toString(), payload)
      .subscribe(
        (response) => {
          // Manejar la respuesta del servidor, por ejemplo, cerrar el modal si se ha creado correctamente
          if (response.data) {
            if (id == 0) this.match = new MatchPreparation({});
            // Vuelve a cargar la lista de entrenamientos y genera el calendario actualizado
            this.getListaPrePartido();
            if (this.match.matchPreparationId === 0) this.cerrarModal();
            else this.cerrarModalPartido();
          } else {
            console.error('Error al crear el partido:', response.error.msg);
          }
        },
        (error) => {
          console.error('Error en la solicitud:', error);
        },
      );
  }
  onInfoVisibleChange(value: boolean): void {
    const newValue = value ? 1 : 0;

    // Actualiza en frontend (optimista)
    this.match.infoVisible = newValue;

    // Llama al backend
    this.trainingService
      .updateMatchInfoVisibility(
        this.match.matchPreparationId,
        newValue
      )
      .subscribe({
        next: () => {
          console.log('infoVisible actualizado correctamente:', newValue);
        },
        error: (err) => {
          console.error('Error actualizando infoVisible', err);
          // rollback si falla
          this.match.infoVisible = newValue === 1 ? 0 : 1;
        }
      });
  }


  showDeleteMatchConfirm = false;

  eliminarPartido(): void {
    this.showDeleteMatchConfirm = true;
  }

  confirmDeleteMatch(): void {
    this.showDeleteMatchConfirm = false;
    this.match.matchDate = this.daySession;
    this.trainingService
      .deletePartido(this.teamId.toString(), this.match)
      .subscribe(
        (response) => {
          if (response.data) {
            this.getListaPrePartido();
            if (this.match.matchPreparationId === 0) this.cerrarModal();
            else this.cerrarModalPartido();
          } else {
            console.error('Error al crear el partido:', response.error.msg);
          }
        },
        (error) => {
          console.error('Error en la solicitud:', error);
        },
      );
  }

  cancelDeleteMatch(): void {
    this.showDeleteMatchConfirm = false;
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
        this.playerService
          .getPlayersPostPartido(
            this.teamId.toString(),
            this.postPartidoId.toString(),
          )
          .subscribe(
            (response) => {
              // Verificar si se obtuvo correctamente la información del partido
              if (response.data) {
                // Asignar los datos del partido al objeto 'partido'
                this.playerPostPartido = response.data;
                // Abrir el modal
                this.showModalPartido = false;
                this.showModalPostPartido = true;
              }

              this.trainingService
                .getListGolesAvanzado(this.postPartidoId)
                .subscribe(
                  (resp) => {
                    if (resp.data) {
                      this.golesAvanzadoAFavor = resp.data.golesAFavor ?? [];
                      this.golesAvanzadoEnContra = resp.data.golesEnContra ?? [];
                      this.initGoalSlotsFromData();
                      const afavor = this.golesAvanzadoAFavor.length;
                      const encontra = this.golesAvanzadoEnContra.length;

                      if (this.golesAvanzadoAFavor.length !== 0) {
                        this.postPartido.golesAFavor = afavor;
                      }
                      if (this.golesAvanzadoEnContra.length !== 0) {
                        this.postPartido.golesEnContra = encontra;
                      }

                      if (
                        this.golesAvanzadoAFavor.length !== 0 ||
                        this.golesAvanzadoEnContra.length !== 0
                      ) {
                        setTimeout(() => {
                          const i =
                            this.indexGolAvanza !== 0 ? this.indexGolAvanza : 0;
                          this.toggleGolAvanzado(true, i);
                        }, 1000);
                      }
                    }
                  },
                  (error) => {
                    console.error('Error en la solicitud:', error);
                  },
                );
            },
            (error) => {
              console.error('Error en la solicitud:', error);
            },
          );
      },
      (error) => {
        console.error('Error en la solicitud:', error);
      },
    );
  }

  // Método para verificar si hay algún dato en la semana
  tieneDatosEnSemana(semana: any[]): boolean {
    return semana.some((dia) => dia !== '');
  }

  cerrarModalPostPartido() {
    this.showModalPostPartido = false;
    this.goalSlotsAFavor = [0];
    this.goalSlotsEnContra = [0];
    this.indexGolAvanza = 0;
    // Limpiar los campos del partido
    this.match = new MatchPreparation({});
    this.postPartido = new PostPartido({});
  }

  guardarPostPartidoSimple() {
    this.postPartido.matchPreparation.matchPreparationId =
      this.matchPreparationId;
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
      },
    );
  }

  guardarPostPartidoAvanzado() {
    this.postPartido.matchPreparation.matchPreparationId =
      this.matchPreparationId;
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
      },
    );
  }

  togglePlayer(player: PlayerId): void {
    // Cambiar el estado isOpen de la tarea seleccionada
    player.collapsed = !player.collapsed;
    this.cerrarPlayer = player;

    let playerInfo = this.playerPostPartido.find(
      (jugador) => jugador.playerId === player.playerId,
    );
    if (playerInfo?.info !== undefined && playerInfo?.info !== null) {
      this.playerInfoPostPartido = playerInfo.info;
    } else {
      this.playerInfoPostPartido = new PlayerPostPartido({});
    }
    //this.playerInfoPostPartido = playerResult!.info;

    // Si la tarea se abre, cerrar el resto de las tareas
    if (player.collapsed) {
      this.playerPostPartido
        .filter((t) => t !== player) // Filtrar todas las tareas que no sean la seleccionada
        .forEach((t) => (t.collapsed = false)); // Cerrar cada tarea
    }
  }

  cerrarTogglePlayer(player: PlayerId) {
    player.collapsed = !player.collapsed;
    // Si la tarea se abre, cerrar el resto de las tareas
    if (player.collapsed) {
      this.playerPostPartido
        .filter((t) => t !== player) // Filtrar todas las tareas que no sean la seleccionada
        .forEach((t) => (t.collapsed = false)); // Cerrar cada tarea
    }
  }

  guardarInfoPlayerPostPartido(playerId: number) {
    if (this.postPartidoId === 0) {
      //mostrar aqui un alert de que no se puede guardar un jugador sin antes haber guardado la info en el postpartido
    } else {
      this.playerInfoPostPartido.player.playerId = playerId;
      this.playerInfoPostPartido.postPartido.postPartidoId = this.postPartidoId;
      this.playerService
        .createUpdateInfoPlayerPostPartido(this.playerInfoPostPartido)
        .subscribe(
          (response) => {
            // Manejar la respuesta del servidor, por ejemplo, cerrar el modal si se ha creado correctamente
            if (response.data) {
              // Encontrar el índice del elemento a actualizar
              const index = this.playerPostPartido.findIndex(
                (player) => player.playerId === response.data.player.playerId,
              );
              this.playerPostPartido[index].info = response.data;
              //esto cerraria la pestaña de jugador para poder introducir los datos de otros
              this.togglePlayer(this.cerrarPlayer);
            } else {
              console.error('Error al crear el partido:', response.error.msg);
            }
          },
          (error) => {
            console.error('Error en la solicitud:', error);
          },
        );
    }
  }

  onSubmit(task: any) {
    let taskId = task.taskId;
    // Verifica si se ha seleccionado un archivo
    if (this.selectedFile) {
      //console.log('Imagen seleccionada:', this.selectedFile);

      // Llama al método createUpdateImgTask del servicio para subir la imagen
      this.trainingService
        .createUpdateImgTask(
          task.tasksShopId,
          taskId,
          this.selectedFile,
          this.userId,
        )
        .subscribe(
          (response) => {
            // Construir el id completo de la imagen
            const imageId = 'imagen_tarea_' + taskId;

            // Obtener la imagen por su id
            const imgElement = document.getElementById(
              imageId,
            ) as HTMLImageElement;

            if (imgElement) {
              // Asignar la nueva URL de la imagen al atributo src
              imgElement.src = this.imageBaseUrlTask + response.data;
            } else {
              console.error('No se encontró la imagen con el id:', imageId);

              // Crear un nuevo elemento img
              const newImgElement = document.createElement(
                'img',
              ) as HTMLImageElement;
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
                console.error(
                  'No se encontró el div con el id:',
                  'div_tarea_' + taskId,
                );
              }
            }
          },
          (error) => {
            console.error('Error al subir la imagen', error);
            // Aquí puedes manejar el error si la subida de la imagen falla
          },
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
    if (
      event.target.value === 'Resistencia' ||
      event.target.value === 'Fuerza'
    ) {
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
    const selectedCategory = this.categories.find(
      (cat) => cat.name === this.selectedCategory,
    );
    return selectedCategory ? selectedCategory.subcategories : [];
  }

  getOptions(): string[] {
    const selectedCategory = this.categories.find(
      (cat) => cat.name === this.selectedCategory,
    );
    const selectedSubcategory = selectedCategory?.subcategories.find(
      (subcat) => subcat.name === this.selectedSubcategory,
    );
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

    const popupWin = window.open(
      '',
      '_blank',
      'top=0,left=0,height=100%,width=auto',
    );

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
    this.tareaSeleccionada = tarea;
    this.parsedExtraFields = this.parseExtraFields(tarea?.extraFields);
    this.showModalTask = true;
  }

  closeTaskModal(): void {
    this.showModalTask = false;
    this.parsedExtraFields = [];
  }

  parsedExtraFields: { name: string; value: string }[] = [];

  private parseExtraFields(raw: string | undefined): { name: string; value: string }[] {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((f: any) => f.name?.trim()) : [];
    } catch {
      return [];
    }
  }

  editTarea(tarea: Task): void {
    this.tareaEditando = tarea;
    this.showEditTaskModal = true;
  }

  onTaskSaved(updated: Task): void {
    const idx = this.trainingSession.tasks.findIndex((t: Task) => t.taskId === updated.taskId);
    if (idx !== -1) {
      this.trainingSession.tasks[idx] = { ...this.trainingSession.tasks[idx], ...updated };
    }
    this.showEditTaskModal = false;
    this.tareaEditando = null;
  }

  onEditModalClosed(): void {
    this.showEditTaskModal = false;
    this.tareaEditando = null;
  }

  printDivPostPartido(divId: string): void {
    let printContents = document.getElementById(divId)?.innerHTML;
    let originalTitle = document.title;
    let popupWin = window.open(
      '',
      '_blank',
      'top=0,left=0,height=100%,width=auto',
    );

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
    this.trainingService
      .getTrainingSessionVisibility(id, this.toggleVisible)
      .subscribe(
        (response) => {
          console.log('Visibilidad actualizada:', response);
          const entrenamientoSeleccionado = this.listTraining.find(
            (training) => training.trainingSessionId === id,
          );
          if (entrenamientoSeleccionado) {
            entrenamientoSeleccionado.visible = this.toggleVisible;
            // Actualizar el elemento en this.listTraining
            const index = this.listTraining.findIndex(
              (training) => training.trainingSessionId === id,
            );
            if (index !== -1) {
              this.listTraining[index] = entrenamientoSeleccionado;
            }
          }
        },
        (error) => {
          console.error('Error al actualizar la visibilidad:', error);
          // Manejo de errores
        },
      );
  }

  onChangeTogglePartido(event: any, id: number) {
    this.togglePartidoVisible = event.target.checked ? 1 : 0;

    // Método para cambiar la visibilidad de una sesión de entrenamiento
    this.trainingService
      .getMatchVisibility(id, this.togglePartidoVisible)
      .subscribe(
        (response) => {
          console.log('Visibilidad actualizada:', response);
        },
        (error) => {
          console.error('Error al actualizar la visibilidad:', error);
          // Manejo de errores
        },
      );
  }

  // AQUI EMPIEZAN LOS FORMULARIOS

  openModalFormPreEntreno(trainingSessionId: number) {
    this.trainingService
      .getFormPreTraining(trainingSessionId, this.playerId)
      .subscribe(
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
        },
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
    this.respPreEntreno.playerId = this.playerId;
    this.trainingService.createFormPreEntreno(this.respPreEntreno).subscribe(
      (response) => {
        this.respPreEntreno = new RespPreEntreno({});
        this.showModalFormPreEntreno = false;
      },
      (error) => {
        console.error('Error al guardar la sesión de entrenamiento:', error);
      },
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
    this.trainingService
      .getFormPostTraining(trainingSessionId, this.playerId)
      .subscribe(
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
        },
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
    this.respPostEntreno.playerId = this.playerId;
    this.trainingService.createFormPostEntreno(this.respPostEntreno).subscribe(
      (response) => {
        this.respPostEntreno = new RespPostEntreno({});
        this.showModalFormPostEntreno = false;
      },
      (error) => {
        console.error('Error al guardar la sesión de entrenamiento:', error);
      },
    );
  }

  //----------------------

  openModalFormPrePartido(matchPreparationId: number) {
    this.matchPreparationId = matchPreparationId;
    this.trainingService
      .getFormPrePartido(matchPreparationId, this.playerId)
      .subscribe(
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
        },
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
    this.respPrePartido.playerId = this.playerId;
    this.trainingService.createFormPrePartido(this.respPrePartido).subscribe(
      (response) => {
        this.respPrePartido = new RespPrePartido({});
        this.showModalFormPrePartido = false;
      },
      (error) => {
        console.error('Error al guardar la sesión de entrenamiento:', error);
      },
    );
  }

  //-----------------------------

  openModalFormPostPartido(matchPreparationId: number) {
    this.matchPreparationId = matchPreparationId;
    this.trainingService
      .getFormPostPartido(matchPreparationId, this.playerId)
      .subscribe(
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
        },
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
          this.toastr.warning(this.translate.instant('CAL.TEXT_393'));
        } else {
          this.toastr.success(this.translate.instant('CAL.TEXT_394'));
        }
      },
      (error) => {
        console.error('Error al guardar la sesión de entrenamiento:', error);
      },
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
      },
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
        .filter((t) => t !== pre) // Filtrar todas las tareas que no sean la seleccionada
        .forEach((t) => (t.collapsed = false)); // Cerrar cada tarea
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
      },
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
        .filter((t) => t !== post) // Filtrar todas las tareas que no sean la seleccionada
        .forEach((t) => (t.collapsed = false)); // Cerrar cada tarea
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
      },
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
        .filter((t) => t !== pre) // Filtrar todas las tareas que no sean la seleccionada
        .forEach((t) => (t.collapsed = false)); // Cerrar cada tarea
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
      },
    );
  }

  cerrarModalPostMatch() {
    this.showModalPostMatch = false;
  }

  //-----------------------

  openModalAsistencia(id: number, date: any) {
    this.trainingSessionIdSelected = id;
    this.trainingService
      .getListAsistenciaByTraining(id, this.teamId, date)
      .subscribe(
        (response) => {
          if (response.data) {
            this.listAsistencia = response.data;
            this.showModalAsistencia = true;
          }
        },
        (error) => {
          console.error('Error en la solicitud:', error);
        },
      );
  }

  cerrarModalAsistencia() {
    this.showModalAsistencia = false;
  }

  countAsistencia(value: number): number {
    return this.listAsistencia.filter((j: any) => j.asistencia === value).length;
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
      },
    );
  }

  toggleTaskPostPartido(post: RespPostPartido): void {
    // Cambiar el estado isOpen de la tarea seleccionada
    post.collapsed = !post.collapsed;

    // Si la tarea se abre, cerrar el resto de las tareas
    if (post.collapsed) {
      this.respListPostMatch
        .filter((t) => t !== post) // Filtrar todas las tareas que no sean la seleccionada
        .forEach((t) => (t.collapsed = false)); // Cerrar cada tarea
    }
  }

  onSelectGolTypes(event: any): void {
    if (
      event.target.value === 'Falta disparo directo' ||
      event.target.value === 'Penalti'
    ) {
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

    if (
      event.target.value === 'Jugada combinativa' ||
      event.target.value === 'Pérdida/Recuperación' ||
      event.target.value === 'Falta'
    ) {
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
    const selectedGolTypes = this.golTypes.find(
      (cat) => cat.name === this.selectedGolTypes,
    );
    return selectedGolTypes ? selectedGolTypes.subcategories : [];
  }

  getOptionsGolTypes(): string[] {
    const selectedGolTypes = this.golTypes.find(
      (cat) => cat.name === this.selectedGolTypes,
    );
    const selectedSubGolTypes = selectedGolTypes?.subcategories.find(
      (subcat) => subcat.name === this.selectedSubGolTypes,
    );
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

  /**
   * Inicializa los slots de formularios según los goles ya guardados (al cargar el modal).
   */
  initGoalSlotsFromData(): void {
    const nAFavor = Math.min(
      this.maxGolesSlots,
      Math.max(1, this.golesAvanzadoAFavor.length)
    );
    const nEnContra = Math.min(
      this.maxGolesSlots,
      Math.max(1, this.golesAvanzadoEnContra.length)
    );
    this.goalSlotsAFavor = Array.from({ length: nAFavor }, (_, i) => i);
    this.goalSlotsEnContra = Array.from({ length: nEnContra }, (_, i) => i);
  }

  /**
   * Añade un nuevo formulario de "gol a favor" y lo abre.
   */
  addGolFormAFavor(): void {
    if (this.goalSlotsAFavor.length >= this.maxGolesSlots) return;
    const newIndex = this.goalSlotsAFavor.length;
    this.goalSlotsAFavor = [...this.goalSlotsAFavor, newIndex];
    this.indexGolAvanza = newIndex;
    this.toggleGolAvanzado(true, newIndex);
  }

  /**
   * Añade un nuevo formulario de "gol en contra" y lo abre.
   */
  addGolFormEnContra(): void {
    if (this.goalSlotsEnContra.length >= this.maxGolesSlots) return;
    const newIndex = this.goalSlotsEnContra.length;
    this.goalSlotsEnContra = [...this.goalSlotsEnContra, newIndex];
    this.indexGolAvanza = newIndex;
    this.toggleGolAvanzado(false, newIndex);
  }

  /** Devuelve la clave de traducción para la etiqueta "Descripción gol N". */
  getGoalSlotLabel(index: number): string {
    return this.goalSlotLabels[index] ?? this.goalSlotLabels[0];
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
      if (
        this.selectedGolTypes === 'Jugada combinativa' ||
        this.selectedGolTypes === 'Pérdida/Recuperación' ||
        this.selectedGolTypes === 'Falta'
      ) {
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
    gol.combinado =
      this.selectedGolTypesCombi === '' ? '0' : this.selectedGolTypesCombi;
    gol.teamId = this.teamId;

    this.trainingService
      .createUpdateGolPostPartidoAvanzado(gol, this.postPartidoId)
      .subscribe(
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
        },
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

    const indexToRemove = this.indexGolAvanza;
    const isSaved = gol?.golPostPartidoId != null && gol.golPostPartidoId > 0;

    if (!isSaved) {
      // Gol no guardado: solo quitar el panel del formulario sin llamar al API
      if (isAFavor === 0) {
        const newLength = Math.max(1, this.goalSlotsAFavor.length - 1);
        this.goalSlotsAFavor = Array.from({ length: newLength }, (_, i) => i);
        this.indexGolAvanza = Math.min(indexToRemove, newLength - 1);
        this.toggleGolAvanzado(true, this.indexGolAvanza);
      } else {
        const newLength = Math.max(1, this.goalSlotsEnContra.length - 1);
        this.goalSlotsEnContra = Array.from({ length: newLength }, (_, i) => i);
        this.indexGolAvanza = Math.min(indexToRemove, newLength - 1);
        this.toggleGolAvanzado(false, this.indexGolAvanza);
      }
      return;
    }

    this.trainingService
      .deleteGolPostPartidoAvanzado(gol.golPostPartidoId, this.postPartidoId)
      .subscribe(
        (resp) => {
          if (resp.data) {
            this.golesAvanzadoAFavor = resp.data.golesAFavor ?? [];
            this.golesAvanzadoEnContra = resp.data.golesEnContra ?? [];
            this.postPartido.golesAFavor = this.golesAvanzadoAFavor.length;
            this.postPartido.golesEnContra = this.golesAvanzadoEnContra.length;

            // Actualizar los slots para que el panel desaparezca del formulario
            const nAFavor = Math.max(1, this.golesAvanzadoAFavor.length);
            const nEnContra = Math.max(1, this.golesAvanzadoEnContra.length);
            this.goalSlotsAFavor = Array.from({ length: Math.min(this.maxGolesSlots, nAFavor) }, (_, i) => i);
            this.goalSlotsEnContra = Array.from({ length: Math.min(this.maxGolesSlots, nEnContra) }, (_, i) => i);
            const maxIndex = isAFavor === 0 ? nAFavor - 1 : nEnContra - 1;
            this.indexGolAvanza = Math.min(this.indexGolAvanza, Math.max(0, maxIndex));
            this.toggleGolAvanzado(isAFavor === 0, this.indexGolAvanza);

            this.borrar();
          }
        },
        (error) => {
          console.error('Error en la solicitud:', error);
        },
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
    const confirmacion = confirm(this.translate.instant('CAL.TEXT_395'));

    if (confirmacion) {
      this.subirTarea = nuevoValor;
    } else {
      // Si el usuario cancela, restablece el valor original del switch
      setTimeout(() => {
        (document.getElementById('subirTarea') as HTMLInputElement).checked =
          actualValue === 1;
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

    const data = event.dataTransfer?.getData('jugador');
    if (!data) return;

    const jugador = JSON.parse(data);

    // 🔥 elimina de slots y arrays
    this.removeJugador(jugador);

    if (estado === 'no_convocado') {
      this.jugadoresNoConvocados.push(jugador);
    }

    if (estado === 'suplente') {
      this.jugadoresSuplentes.push(jugador);
    }

    if (estado === 'lesionado') {
      this.jugadoresLesionados.push(jugador);
    }
  }

  onToggleVisible(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) return;
    this.match.visible = input.checked ? 1 : 0;
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
      const fieldRect = (
        document.querySelector('.field') as HTMLElement
      ).getBoundingClientRect();
      this.touchJugador.posicion_x = touch.clientX - fieldRect.left;
      this.touchJugador.posicion_y = touch.clientY - fieldRect.top;

      // Actualiza la posición del jugador en el DOM
      const playerElement = document.querySelector(
        `.player[data-id="${this.touchJugador.id}"]`,
      ) as HTMLElement;
      if (playerElement) {
        playerElement.style.left = `${this.touchJugador.posicion_x}px`;
        playerElement.style.top = `${this.touchJugador.posicion_y}px`;
      }

      event.preventDefault(); // Evitar el desplazamiento de la página mientras se arrastra
    }
  }

  onTouchEnd(event: TouchEvent, estado: string): void {
    if (this.touchJugador) {
      const fieldRect = (
        document.querySelector('.field') as HTMLElement
      ).getBoundingClientRect();

      // Ajustar las coordenadas si se suelta en titulares
      if (estado === 'titular') {
        this.touchJugador.posicion_x =
          this.touchJugador.posicion_x - fieldRect.left;
        this.touchJugador.posicion_y =
          this.touchJugador.posicion_y - fieldRect.top;
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
      case 'lesionado':
        this.jugadoresLesionados.push(player);
        break;
      case 'titular':
        this.jugadoresTitulares.push(player);
        break;
    }
  }

  resetConvocatoria() {
    this.jugadoresNoConvocados = this.startConvocarotia;
    this.jugadoresSuplentes = [];
    this.jugadoresLesionados = [];
    this.jugadoresTitulares = [];
    this.guardarConvocatoria();
    this.mostrarModalConvocatoria = false;
  }

  removeJugador(jugador: any) {
    // 🔥 liberar slot SIEMPRE
    this.liberarSlotJugador(jugador);

    this.jugadoresNoConvocados =
      this.jugadoresNoConvocados.filter(j => j.id !== jugador.id);

    this.jugadoresSuplentes =
      this.jugadoresSuplentes.filter(j => j.id !== jugador.id);

    this.jugadoresLesionados =
      this.jugadoresLesionados.filter(j => j.id !== jugador.id);

    this.jugadoresTitulares =
      this.jugadoresTitulares.filter(j => j.id !== jugador.id);
  }


  /** Objeto solo con campos que el backend PlayerConvUI acepta (sin confirmacion para no romper deserialización). */
  private convocatoriaItemToBackend(j: ConvocatoriaUI): { id: number; playerId: number; nombre: string; img: string; posicion_x: any; posicion_y: any } {
    return {
      id: j.id,
      playerId: j.playerId,
      nombre: j.nombre,
      img: j.img,
      posicion_x: j.posicion_x,
      posicion_y: j.posicion_y,
    };
  }

  guardarConvocatoria() {

    // traducir slot → coordenadas
    this.jugadoresTitulares.forEach(j => {
      const slot = this.slotsFormacion.find(s => s.id === j.posicion_slot);
      if (slot) {
        j.posicion_x = slot.x;
        j.posicion_y = slot.y;
      }
    });

    const convocatoria = {
      noConvocados: this.jugadoresNoConvocados.map((j) => this.convocatoriaItemToBackend(j)),
      suplentes: this.jugadoresSuplentes.map((j) => this.convocatoriaItemToBackend(j)),
      lesionados: this.jugadoresLesionados.map((j) => this.convocatoriaItemToBackend(j)),
      titulares: this.jugadoresTitulares.map((j) => this.convocatoriaItemToBackend(j)),
    };

    this.convocatoriaJSON = JSON.stringify(convocatoria);

    this.playerService
      .updateConvocatoria(this.convocatoriaJSON, this.matchPreparationId)
      .subscribe(() => {
        this.toastr.success(this.translate.instant('CAL.TEXT_396'));
        this.showNotificar = true;
      });
  }


  abrirModalConvocatoria() {
    if (this.match.convocatoria == null || this.match.convocatoria == '') {
      this.resetConvocatoria();
    }
    this.generarSlotsFormacion();
    this.mostrarModalConvocatoria = true;
  }

  cerrarModalConvocatoria() {
    this.mostrarModalConvocatoria = false;
  }

  abrirModalConvocatoriaLista(matchPreparationId: number) {
    this.playerService
      .getAsistenciaPartido(matchPreparationId, this.playerId)
      .subscribe(
        (resp) => {
          if (resp.data) {
            this.playerAsistencia = true;
          } else {
            this.playerAsistencia = false;
          }

          let ui = new NotificatePlayerUI({});
          ui.players = this.playersConvo;
          // Asignar los nombres de jugadores no convocados
          ui.noConvocados = this.jugadoresNoConvocados.map(
            (jugador: ConvocatoriaUI) => jugador.nombre,
          );

          // Asignar los nombres de jugadores suplentes y titulares a convocados
          ui.convocados = [
            ...this.jugadoresSuplentes.map(
              (jugador: ConvocatoriaUI) => jugador.nombre,
            ),
            ...this.jugadoresTitulares.map(
              (jugador: ConvocatoriaUI) => jugador.nombre,
            ),
          ];

          this.showConvocados = ui.convocados;
          this.showNoConvocados = ui.noConvocados;
          this.mostrarModalConvocatoriaLista = true;
        },
        (error) => {
          console.error('Error en la solicitud:', error);
        },
      );
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
    ui.noConvocados = this.jugadoresNoConvocados.map(
      (jugador: ConvocatoriaUI) => jugador.nombre,
    );

    // Asignar los nombres de jugadores suplentes y titulares a convocados
    ui.convocados = [
      ...this.jugadoresTitulares.map(
        (jugador: ConvocatoriaUI) => jugador.nombre,
      ),
      ...this.jugadoresSuplentes.map(
        (jugador: ConvocatoriaUI) => jugador.nombre,
      ),
    ].sort((a, b) => a.localeCompare(b)); // Ordenar alfabéticamente

    ui.mailEntrenador =
      this.usuarioActual?.mail !== undefined ? this.usuarioActual?.mail : '';
    //console.log(ui);

    this.playerService
      .notificateMatchPlayer(ui, this.teamId)
      .subscribe((response) => {
        this.toastr.success(this.translate.instant('CAL.TEXT_397'));
      });
  }

  preavisoConvocatoria() {
    const convocatoria = {
      noConvocados: this.jugadoresNoConvocados.map((j) => this.convocatoriaItemToBackend(j)),
      suplentes: this.jugadoresSuplentes.map((j) => this.convocatoriaItemToBackend(j)),
      lesionados: this.jugadoresLesionados.map((j) => this.convocatoriaItemToBackend(j)),
      titulares: this.jugadoresTitulares.map((j) => this.convocatoriaItemToBackend(j)),
    };

    // Convertir la convocatoria a una cadena JSON
    this.convocatoriaJSON = JSON.stringify(convocatoria);

    this.playerService
      .updateConvocatoria(this.convocatoriaJSON, this.matchPreparationId)
      .subscribe((response) => { });

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
    ui.noConvocados = this.jugadoresNoConvocados.map(
      (jugador: ConvocatoriaUI) => jugador.nombre,
    );

    ui.mailEntrenador =
      this.usuarioActual?.mail !== undefined ? this.usuarioActual?.mail : '';
    //console.log(ui);

    this.playerService
      .notificateMatchPlayer(ui, this.teamId)
      .subscribe((response) => {
        this.toastr.info(this.translate.instant('CAL.TEXT_398'));
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
    refereeName: '',
  };

  onChangeToggleAsistencia(matchPreparationId: number) {
    this.playerAsistencia = !this.playerAsistencia; // si no asiste → mostrar textarea
    this.playerService
      .setAsistenciaPartido(
        matchPreparationId,
        this.playerId,
        this.playerAsistencia == true ? 1 : 0,
      )
      .subscribe(
        (resp) => {
          if (resp.data) {
            this.toastr.success(this.translate.instant('CAL.TEXT_399'));
          }
        },
        (error) => {
          console.error('Error en la solicitud:', error);
        },
      );
  }

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
    this.match2.horaPartido =
      this.match.horaEmpieza + ':' + this.match.minutosEmpieza;
    this.match2.puntosFuertesRival = this.match.puntosFuertesRival;
    this.match2.puntosDebilesRival = this.match.puntosDebilesRival;
    this.match2.jugadoresClaveRival = this.match.jugadoresClaveRival;
    this.match2.estiloJuegoRival = this.match.estiloJuegoRival;
    this.match2.ultimosResultadosRival = this.match.ultimosResultadosRival;
    this.match2.formacionesRecientesRival =
      this.match.formacionesRecientesRival;
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
      this.match2.imgClub = 'assets/images/512.png'; // Cambia a una imagen predeterminada si es necesario
    }

    const element = document.getElementById('pdf-content');
    const options = {
      margin: 0.5,
      filename: 'informe-partido.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
    };

    html2pdf().from(element).set(options).save();
  }

  abrirModalPDF() {
    this.showModalPDF = true;
  }

  cerrarModalPDF() {
    this.showModalPDF = false;
  }

  notificarNoAsistencia(value1: any, value2: any) {
    const dto = {
      matchPreparationId: this.matchPreparationId,
      playerId: this.playerId,
      motivo: this.motivoNoAsistencia,
      teamId: this.teamId,
      userId: this.userId,
    };

    this.playerService.notificarNoAsistencia(dto).subscribe((response) => {
      this.toastr.success(this.translate.instant('CAL.TEXT_400'));
      this.motivoNoAsistencia = '';
    });
  }
  newTask() {
    this.selected = '';
    this.mostrarModal = true;
  }
  cerrarnewTask() {
    this.mostrarModal = false;
  }
  isToday(dayString: string): boolean {
    if (!dayString) return false;

    const day = new Date(dayString + 'T12:00:00');

    const today = new Date();
    today.setHours(12, 0, 0, 0);

    return (
      day.getDate() === today.getDate() &&
      day.getMonth() === today.getMonth() &&
      day.getFullYear() === today.getFullYear()
    );
  }
  selectNewActivity(type: 'entrenamiento' | 'partido' | 'otra') {
    this.mode = `create-${type}` as any;
    this.selectedActivity = type;
    this.selected = type; // si ya usas selected en más sitios
    this.showNewActivityMenu = false;

    // Reset de modelos
    if (type === 'entrenamiento') {
      this.trainingSession = this.initTrainingSession();
    }

    if (type === 'partido') {
      this.match = new MatchPreparation({});
    }
  }
  onSelectPartido(match: MatchPreparation) {
    this.match = match;
    this.mode = 'view-partido';
  }
  onSelectEntrenamiento(training: Training) {
    this.trainingSession = training;
    this.mode = 'view-entrenamiento';
  }
  selectActivity(
    type: 'entrenamiento' | 'partido',
    id: number,
    data: any
  ): void {

    this.selectedItem = { type, id };

    if (type === 'entrenamiento') {
      this.mode = 'view-entrenamiento';
      this.trainingSession = data;
      this.openEntrenamiento(id, this.daySession);

    }

    if (type === 'partido') {
      this.mode = 'view-partido';
      this.openPartido(id, this.daySession);

    }
  }

  autoGrow(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement | null;
    if (!textarea) return;

    textarea.style.height = 'auto';                 // reset
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  generarSlotsFormacion() {
    this.slotsFormacion = this.FORMACIONES[this.formacionSeleccionada]
      .map((s: any) => ({
        ...s,
        jugador: null
      }));

    // recolocar titulares ya asignados
    this.jugadoresTitulares.forEach(j => {
      if (j.posicion_slot) {
        const slot = this.slotsFormacion.find(s => s.id === j.posicion_slot);
        if (slot) slot.jugador = j;
      }
    });
  }
  ajustarY(y: number): number {
    const factor = 0.75; // cuánto se comprime arriba
    return y * factor + (100 - 100 * factor);
  }
  ajustarX(x: number): number {
    const campoWidth = 70;
    const paddingCampo = 8;

    const margenExterno = (100 - campoWidth) / 2;
    const anchoUtil = campoWidth - paddingCampo * 2;

    return margenExterno + paddingCampo + (x * anchoUtil) / 100;
  }



  onDropSlot(event: DragEvent, slot: any) {
    event.preventDefault();

    const data = event.dataTransfer?.getData('jugador');
    if (!data || slot.jugador) return;

    const jugador = JSON.parse(data);

    // 🔥 limpia slot anterior
    this.liberarSlotJugador(jugador);

    // 🔥 limpia listas
    this.removeJugador(jugador);

    jugador.posicion_slot = slot.id;
    slot.jugador = jugador;

    this.jugadoresTitulares.push(jugador);
  }


  onTouchEndSlot(slot: any) {
    if (!this.touchJugador || slot.jugador) return;

    this.liberarSlotJugador(this.touchJugador);
    this.removeJugador(this.touchJugador);

    this.touchJugador.posicion_slot = slot.id;
    slot.jugador = this.touchJugador;

    this.jugadoresTitulares.push(this.touchJugador);
    this.touchJugador = null;
  }

  liberarSlotJugador(jugador: any) {
    this.slotsFormacion.forEach(slot => {
      if (slot.jugador?.id === jugador.id) {
        slot.jugador = null;
      }
    });

    jugador.posicion_slot = null;
  }


}
