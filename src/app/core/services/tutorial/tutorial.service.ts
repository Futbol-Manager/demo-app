import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface TutorialStep {
  id: string;
  title: string;
  text: string;
  /** Ruta relativa al audio TTS del paso, bajo assets/audio/tutorial/. Ej: 'inicio_01.mp3' */
  audioFile?: string;
  /** Selector CSS del elemento a resaltar (opcional). Ej: '#mail', '.btn-custom' */
  targetSelector?: string;
  /** Posición del tooltip respecto al elemento: 'top' | 'bottom' | 'left' | 'right' */
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export interface TutorialScreen {
  screenId: string;
  steps: TutorialStep[];
}

const STORAGE_KEY_PREFIX = 'sphaira_tutorial_done_';

@Injectable({
  providedIn: 'root'
})
export class TutorialService {
  private readonly screens = new Map<string, TutorialStep[]>();

  /** Pantalla activa y índice del paso actual. null = cerrado */
  private state$ = new BehaviorSubject<{
    screenId: string;
    currentIndex: number;
    steps: TutorialStep[];
    dontShowAgain: boolean;
  } | null>(null);

  readonly isOpen$ = new BehaviorSubject<boolean>(false);
  readonly currentStep$ = new BehaviorSubject<{ step: TutorialStep; index: number; total: number } | null>(null);

  constructor() {
    this.registerScreens();
  }

  private registerScreens(): void {
    this.screens.set('login', this.getLoginSteps());
    this.screens.set('dashboard-inicio', this.getInicioSteps());
    this.screens.set('dashboard-inicio-coach', this.getInicioCoachSteps());
    this.screens.set('dashboard-inicio-player', this.getInicioPlayerSteps());
    this.screens.set('cuadro-de-mandos', this.getCuadroMandosSteps());
    this.screens.set('equipos', this.getEquiposSteps());
    this.screens.set('documentos-club', this.getDocumentosClubSteps());
    this.screens.set('new-cuotas', this.getNewCuotasSteps());
    this.screens.set('ropa', this.getRopaSteps());
    this.screens.set('patrocinadores', this.getPatrocinadoresSteps());
    this.screens.set('notificaciones', this.getNotificacionesSteps());
    this.screens.set('staff-club', this.getStaffClubSteps());
    this.screens.set('scouting-club', this.getScoutingClubSteps());
    this.screens.set('club-videos', this.getClubVideosSteps());
    this.screens.set('video-analysis', this.getVideoAnalysisSteps());
    this.screens.set('asistente-ia', this.getAsistenteIaSteps());
    this.screens.set('info-jugadores', this.getInfoJugadoresSteps());
    this.screens.set('info-entrenadores', this.getInfoEntrenadoresSteps());
    this.screens.set('estadisticas-jugadores-club', this.getEstadisticasJugadoresClubSteps());
    this.screens.set('estadisticas-equipos-club', this.getEstadisticasEquiposClubSteps());
    this.screens.set('calendario-club', this.getCalendarioClubSteps());
    this.screens.set('menu-club', this.getMenuClubSteps());
    this.screens.set('menu-entrenador', this.getMenuEntrenadorSteps());
    this.screens.set('opcionesjugador', this.getOpcionesjugadorSteps());
    this.screens.set('calendario', this.getCalendarioSteps());
    this.screens.set('tareas', this.getTareasSteps());
    this.screens.set('tactical-board', this.getTacticalBoardSteps());
    this.screens.set('tareas-catalog', this.getTareasCatalogSteps());
    this.screens.set('tareas-historial', this.getTareasHistorialSteps());
    this.screens.set('tareas-favoritas', this.getTareasFavoritasSteps());
    this.screens.set('tareas-mis', this.getTareasMisSteps());
    this.screens.set('jugadores', this.getJugadoresSteps());
    this.screens.set('informacion-equipo', this.getInformacionEquipoSteps());
    this.screens.set('estadisticas-equipo', this.getEstadisticasEquipoSteps());
    this.screens.set('estadisticas-jugadores', this.getEstadisticasJugadoresSteps());
    this.screens.set('clasificacion-resultados', this.getClasificacionResultadosSteps());
    this.screens.set('partidos-entrevistas', this.getPartidosEntrevistasSteps());
    this.screens.set('lesiones', this.getLesionesSteps());
    this.screens.set('asistente-ia-coach', this.getAsistenteIaCoachSteps());
    this.screens.set('debrief-history', this.getDebriefHistorySteps());
    this.screens.set('perfil-entrenador', this.getPerfilEntrenadorSteps());
    this.screens.set('documentos-entrenador', this.getDocumentosEntrenadorSteps());
    this.screens.set('cuotas', this.getCuotasSteps());
    this.screens.set('documentos-jugador', this.getDocumentosJugadorSteps());
    this.screens.set('scouting-player', this.getScoutingPlayerSteps());
    this.screens.set('patrocinadores-usuario', this.getPatrocinadoresUsuarioSteps());
    this.screens.set('lesiones-jugador', this.getLesionesSteps());
    this.screens.set('ropa-jugador', this.getRopaJugadorSteps());
    this.screens.set('scouting-player-profile', this.getScoutingPlayerProfileSteps());
    this.screens.set('erp', this.getErpSteps());
    this.screens.set('menu-fisio', this.getMenuFisioSteps());
    this.screens.set('entrenadores', this.getEntrenadoresSteps());
    this.screens.set('asistencia', this.getAsistenciaSteps());
    this.screens.set('debrief-templates', this.getDebriefTemplatesSteps());
    this.screens.set('debrief-training', this.getDebriefTrainingSteps());
    this.screens.set('debrief-match', this.getDebriefMatchSteps());
    this.screens.set('contabilidad', this.getContabilidadSteps());
    this.screens.set('historial-pagos-club', this.getHistorialPagosClubSteps());
    this.screens.set('abonados', this.getAbonadosSteps());
    this.screens.set('suscripcion-club', this.getSuscripcionClubSteps());
    this.screens.set('suscripcion-club-wizard', this.getSuscripcionClubWizardSteps());
    this.screens.set('sugerencias-club', this.getSugerenciasClubSteps());
    this.screens.set('listado-clubes', this.getListadoClubesSteps());
    this.screens.set('suscripcion-coach', this.getSuscripcionCoachSteps());
    this.screens.set('coach-suscripcion-success', this.getCoachSuscripcionSuccessSteps());
    this.screens.set('individual-training', this.getIndividualTrainingSteps());
    this.screens.set('debrief-report', this.getDebriefReportSteps());
    this.screens.set('suscripcion', this.getSuscripcionSteps());
    this.screens.set('inicio-deportes', this.getInicioDeportesSteps());
  }

  // ── Dashboard inicio (14 pasos) ────────────────────────────────────────────

  private getInicioSteps(): TutorialStep[] {
    return [
      {
        id: 'inicio-bienvenida',
        title: 'Bienvenido al dashboard del club',
        text: 'Bienvenido a tu panel de gestión. Desde aquí tienes acceso a todos los módulos del club: equipos, documentos, pagos, equipación y mucho más. En los próximos pasos te explicamos qué hace cada sección.',
        audioFile: 'inicio_01.mp3',
        position: 'bottom'
      },
      {
        id: 'inicio-cuadro',
        title: 'Cuadro de mando',
        text: 'Tu centro de control del club. Aquí encuentras el resumen de equipos, jugadores y entrenadores, los próximos partidos y entrenamientos, y alertas sobre pagos pendientes, lesiones o documentos sin entregar. Pulsa en cualquier elemento para ver su detalle.',
        audioFile: 'inicio_02.mp3',
        targetSelector: '[data-tutorial="inicio-cuadro"]',
        position: 'left'
      },
      {
        id: 'inicio-equipos',
        title: 'Equipos',
        text: 'Gestiona toda la estructura deportiva del club. Crea equipos por categoría, asigna jugadores y entrenadores, y accede al detalle completo de cada uno: estadísticas, calendario y plantilla.',
        audioFile: 'inicio_03.mp3',
        targetSelector: '[data-tutorial="inicio-equipos"]',
        position: 'left'
      },
      {
        id: 'inicio-documentos',
        title: 'Documentos',
        text: 'Centraliza toda la documentación del club: autorizaciones, contratos, fichas médicas y formularios personalizados. Publica documentos para que los jugadores los firmen y haz seguimiento de quién ha entregado cada uno.',
        audioFile: 'inicio_04.mp3',
        targetSelector: '[data-tutorial="inicio-documentos"]',
        position: 'left'
      },
      {
        id: 'inicio-pagos',
        title: 'Pagos y cuotas',
        text: 'Gestiona todas las cuotas del club desde un único lugar. Consulta qué jugadores están al día y cuáles tienen pagos pendientes, configura los importes y acepta pagos online de forma sencilla.',
        audioFile: 'inicio_05.mp3',
        targetSelector: '[data-tutorial="inicio-pagos"]',
        position: 'left'
      },
      {
        id: 'inicio-ropa',
        title: 'Ropa / Equipación',
        text: 'Controla la equipación de todos los jugadores del club. Consulta o edita las tallas de camiseta, pantalón y medias de cada jugador, y lleva un seguimiento de los pedidos realizados a proveedores.',
        audioFile: 'inicio_06.mp3',
        targetSelector: '[data-tutorial="inicio-ropa"]',
        position: 'left'
      },
      {
        id: 'inicio-patrocinadores',
        title: 'Patrocinadores',
        text: 'Lleva un control profesional de los patrocinios del club. Registra patrocinadores con nombre, importe, logotipo y fechas de contrato, y recibe alertas automáticas antes de que expire cada acuerdo.',
        audioFile: 'inicio_07.mp3',
        targetSelector: '[data-tutorial="inicio-patrocinadores"]',
        position: 'left'
      },
      {
        id: 'inicio-notificaciones',
        title: 'Notificaciones',
        text: 'Comunícate de forma directa con todos o con un equipo concreto. Redacta mensajes, adjunta archivos como documentos o imágenes, y programa el momento exacto en que quieres que se entreguen.',
        audioFile: 'inicio_08.mp3',
        targetSelector: '[data-tutorial="inicio-notificaciones"]',
        position: 'left'
      },
      {
        id: 'inicio-staff',
        title: 'Gestión de Staff',
        text: 'Define quién tiene acceso a cada parte del panel del club. Añade miembros del staff, asígnales permisos concretos por módulo —pagos, documentos, estadísticas, calendario— y gestiona sus roles de forma granular.',
        audioFile: 'inicio_09.mp3',
        targetSelector: '[data-tutorial="inicio-staff"]',
        position: 'left'
      },
      {
        id: 'inicio-scouting',
        title: 'Scouting',
        text: 'Organiza tu proceso de captación de talento. Añade jugadores a tu lista de observación y sigue su evolución a través del pipeline de scouting: desde el primer vistazo hasta el contacto formal con el club.',
        audioFile: 'inicio_10.mp3',
        targetSelector: '[data-tutorial="inicio-scouting"]',
        position: 'left'
      },
      {
        id: 'inicio-biblioteca-videos',
        title: 'Biblioteca de vídeos',
        text: 'Tu videoteca deportiva en la nube. Sube grabaciones de partidos y entrenamientos, enlaza vídeos de YouTube o Vimeo, y organízalos en carpetas por equipo o temporada para acceder a ellos cuando los necesites.',
        audioFile: 'inicio_11.mp3',
        targetSelector: '[data-tutorial="inicio-biblioteca-videos"]',
        position: 'left'
      },
      {
        id: 'inicio-video-analysis',
        title: 'Análisis de vídeo',
        text: 'Lleva el análisis táctico al siguiente nivel. Crea sesiones de trabajo sobre tus vídeos, añade anotaciones, dibuja sobre el campo y extrae clips clave para compartir con el cuerpo técnico.',
        audioFile: 'inicio_12.mp3',
        targetSelector: '[data-tutorial="inicio-video-analysis"]',
        position: 'left'
      },
      {
        id: 'inicio-asistente-ia',
        title: 'Asistente de IA',
        text: 'Tu asistente inteligente, siempre disponible. Hazle preguntas sobre el club, pídele que genere informes, cree sesiones de entrenamiento o prepare convocatorias. Lo encontrarás en el botón circular de la esquina inferior derecha.',
        audioFile: 'inicio_13.mp3',
        targetSelector: '[data-tutorial="inicio-asistente-ia"]',
        position: 'left'
      },
      {
        id: 'inicio-fin',
        title: 'Listo',
        text: '¡Ya conoces todo lo que Sphaira tiene para ti! Navega por cualquier módulo desde el menú lateral. Si en algún momento necesitas orientación, el botón de ayuda en cada pantalla está para cuando lo necesites.',
        audioFile: 'inicio_14.mp3',
        position: 'bottom'
      }
    ];
  }

  // ── Cuadro de mandos (13 pasos) ────────────────────────────────────────────

  private getCuadroMandosSteps(): TutorialStep[] {
    return [
      {
        id: 'cuadro-bienvenida',
        title: 'Cuadro de mandos',
        text: 'Bienvenido al centro de control de tu club. A la izquierda tienes acceso rápido a jugadores, entrenadores, estadísticas y calendario; a la derecha, un resumen en tiempo real de resultados, entrenamientos del día y próximos partidos.',
        audioFile: 'cuadro_01.mp3',
        position: 'bottom'
      },
      {
        id: 'cuadro-volver',
        title: 'Volver',
        text: 'Cuando quieras volver al panel principal del club, pulsa aquí. Desde ahí podrás acceder al resto de módulos.',
        audioFile: 'cuadro_02.mp3',
        targetSelector: '[data-tutorial="cuadro-volver"]',
        position: 'bottom'
      },
      {
        id: 'cuadro-jugadores',
        title: 'Info jugadores',
        text: 'Accede al directorio completo de todos los jugadores del club. Consulta fichas individuales con datos personales, estadísticas de rendimiento, historial de lesiones, estado de pagos y documentación asociada.',
        audioFile: 'cuadro_03.mp3',
        targetSelector: '[data-tutorial="cuadro-jugadores"]',
        position: 'right'
      },
      {
        id: 'cuadro-entrenadores',
        title: 'Info entrenadores',
        text: 'Consulta y gestiona todo el cuerpo técnico del club. Revisa el listado de entrenadores, su asignación a cada equipo y sus datos de contacto de manera centralizada.',
        audioFile: 'cuadro_04.mp3',
        targetSelector: '[data-tutorial="cuadro-entrenadores"]',
        position: 'right'
      },
      {
        id: 'cuadro-stats-jugadores',
        title: 'Estadísticas jugadores',
        text: 'Analiza el rendimiento individual de cada jugador. Consulta goles, asistencias, minutos jugados y tarjetas recibidas, y aplica filtros por equipo, posición o temporada.',
        audioFile: 'cuadro_05.mp3',
        targetSelector: '[data-tutorial="cuadro-stats-jugadores"]',
        position: 'right'
      },
      {
        id: 'cuadro-stats-equipos',
        title: 'Estadísticas equipos',
        text: 'Evalúa el rendimiento colectivo de cada equipo del club. Visualiza clasificaciones, resultados y tendencias por temporada para tomar mejores decisiones tácticas.',
        audioFile: 'cuadro_06.mp3',
        targetSelector: '[data-tutorial="cuadro-stats-equipos"]',
        position: 'right'
      },
      {
        id: 'cuadro-entrenamientos',
        title: 'Entrenamientos',
        text: 'El módulo de planificación de entrenamientos estará disponible muy pronto. Podrás diseñar sesiones completas, asignar tareas tácticas y ver el calendario de trabajo en un solo lugar.',
        audioFile: 'cuadro_07.mp3',
        targetSelector: '[data-tutorial="cuadro-entrenamientos"]',
        position: 'right'
      },
      {
        id: 'cuadro-calendario',
        title: 'Calendario',
        text: 'Visualiza toda la actividad del club en un único calendario. Partidos, entrenamientos y eventos organizados de forma clara; crea o edita cualquier entrada desde la vista mensual o semanal.',
        audioFile: 'cuadro_08.mp3',
        targetSelector: '[data-tutorial="cuadro-calendario"]',
        position: 'right'
      },
      {
        id: 'cuadro-lesiones',
        title: 'Lesiones',
        text: 'El módulo de gestión de lesiones llegará próximamente. Con él podrás registrar bajas, hacer seguimiento del estado de recuperación y planificar el retorno de cada jugador a la competición.',
        audioFile: 'cuadro_09.mp3',
        targetSelector: '[data-tutorial="cuadro-lesiones"]',
        position: 'right'
      },
      {
        id: 'cuadro-resultados',
        title: 'Resultados',
        text: 'Consulta los últimos resultados del club de un vistazo: marcador, equipo y resultado —victoria, empate o derrota—. Pulsa en cualquier partido para ver el detalle completo o actualizar el marcador.',
        audioFile: 'cuadro_10.mp3',
        targetSelector: '[data-tutorial="cuadro-resultados"]',
        position: 'left'
      },
      {
        id: 'cuadro-entrenamientos-hoy',
        title: 'Entrenamientos de hoy',
        text: 'Conoce de un vistazo qué equipos entrenan hoy y a qué hora. La línea de tiempo te indica en qué momento del día estás respecto a los entrenamientos programados.',
        audioFile: 'cuadro_11.mp3',
        targetSelector: '[data-tutorial="cuadro-entrenamientos-hoy"]',
        position: 'left'
      },
      {
        id: 'cuadro-proximos-partidos',
        title: 'Próximos partidos',
        text: 'Anticipa los próximos compromisos del club. Consulta fecha, hora y rival, y pulsa en cualquier partido para acceder a la convocatoria, editar los datos o preparar el análisis previo.',
        audioFile: 'cuadro_12.mp3',
        targetSelector: '[data-tutorial="cuadro-proximos-partidos"]',
        position: 'left'
      },
      {
        id: 'cuadro-fin',
        title: 'Listo',
        text: 'Ahora dominas el cuadro de mandos. Usa el panel izquierdo para profundizar en cualquier módulo y mantén siempre un ojo en el lado derecho para estar al tanto de resultados y próximos partidos.',
        audioFile: 'cuadro_13.mp3',
        position: 'bottom'
      }
    ];
  }

  /** Pasos del tutorial Dashboard inicio — Entrenador (coach). Vista "Mis equipos". */
  private getInicioCoachSteps(): TutorialStep[] {
    return [
      {
        id: 'inicio-coach-bienvenida',
        title: 'Mis equipos',
        text: 'Esta es tu pantalla principal como entrenador. Aquí ves todos los equipos que tienes asignados en la temporada seleccionada. Pulsa en una tarjeta para entrar al menú de ese equipo (calendario, tareas, jugadores, estadísticas, notificaciones, etc.).',
        position: 'bottom'
      },
      {
        id: 'inicio-coach-temporada',
        title: 'Temporada',
        text: 'Selecciona la temporada para ver los equipos asignados. Al cambiar de temporada se actualiza el listado.',
        targetSelector: '[data-tutorial="inicio-coach-temporada"]',
        position: 'bottom'
      },
      {
        id: 'inicio-coach-grid',
        title: 'Tarjetas de equipos',
        text: 'Cada tarjeta muestra el equipo: categoría, nombre, liga, horario de entrenamiento y número de jugadores. Pulsa en una tarjeta para acceder al menú del entrenador de ese equipo (calendario, tareas, jugadores, info equipo, estadísticas, notificaciones, galería, lesiones, asistente IA, historial debrief, perfil, documentos y análisis de vídeo).',
        targetSelector: '[data-tutorial="inicio-coach-grid"]',
        position: 'left'
      },
      {
        id: 'inicio-coach-empty',
        title: 'Sin equipos',
        text: 'Si no tienes equipos asignados para esta temporada, verás un mensaje y el botón "Crear equipo" para ir a la gestión de equipos del club.',
        targetSelector: '[data-tutorial="inicio-coach-empty"]',
        position: 'bottom'
      },
      {
        id: 'inicio-coach-fin',
        title: 'Listo',
        text: 'Ya conoces tu panel de entrenador. Elige un equipo para acceder a su calendario, tareas, jugadores y el resto de opciones.',
        position: 'bottom'
      }
    ];
  }

  /** Pasos del tutorial Dashboard inicio — Padre/Jugador (player). Vista "Mis hijos". */
  private getInicioPlayerSteps(): TutorialStep[] {
    return [
      {
        id: 'inicio-player-bienvenida',
        title: 'Inicio',
        text: 'Esta es tu pantalla principal. Aquí ves los jugadores vinculados a tu cuenta (tus hijos o tutelados) en la temporada seleccionada. Pulsa en una tarjeta para acceder a las opciones de ese jugador: datos personales, calendario, cuotas, documentación, clasificación, estadísticas, galería, notificaciones, patrocinadores, lesiones y ropa.',
        position: 'bottom'
      },
      {
        id: 'inicio-player-temporada',
        title: 'Temporada',
        text: 'Selecciona la temporada para ver los jugadores y equipos correspondientes. Al cambiar de temporada se actualiza el listado.',
        targetSelector: '[data-tutorial="inicio-player-temporada"]',
        position: 'bottom'
      },
      {
        id: 'inicio-player-list',
        title: 'Tarjetas de jugadores',
        text: 'Cada tarjeta muestra un jugador: nombre, equipo, horario de entrenamiento y próximo partido. Pulsa en la tarjeta o en "Ver jugador" para acceder a todas las opciones de ese jugador (datos personales, calendario, pagar cuotas, documentación, clasificación, estadísticas, galería, notificaciones, patrocinadores, lesiones, ropa).',
        targetSelector: '[data-tutorial="inicio-player-list"]',
        position: 'left'
      },
      {
        id: 'inicio-player-empty',
        title: 'Sin jugadores',
        text: 'Si no tienes jugadores vinculados para esta temporada, verás un mensaje indicándolo. Contacta con tu club para dar de alta a los jugadores.',
        targetSelector: '[data-tutorial="inicio-player-empty"]',
        position: 'bottom'
      },
      {
        id: 'inicio-player-fin',
        title: 'Listo',
        text: 'Ya conoces tu panel. Pulsa en un jugador para ver su calendario, cuotas, documentación y el resto de opciones.',
        position: 'bottom'
      }
    ];
  }

  /** Pasos del tutorial de Equipos. */
  private getEquiposSteps(): TutorialStep[] {
    return [
      {
        id: 'equipos-bienvenida',
        title: 'Equipos del club',
        text: 'En esta pantalla gestionas todos los equipos de la temporada: categorías, jugadores por equipo, horarios de entrenamiento y acceso rápido al calendario de cada equipo.',
        position: 'bottom'
      },
      {
        id: 'equipos-volver',
        title: 'Volver',
        text: 'Pulsa aquí para regresar al inicio del dashboard del club.',
        targetSelector: '[data-tutorial="equipos-volver"]',
        position: 'bottom'
      },
      {
        id: 'equipos-excel',
        title: 'Subir jugadores desde Excel',
        text: 'Importa un listado de jugadores desde una hoja Excel. Descarga la plantilla, rellena los datos y súbela aquí para dar de alta a varios jugadores a la vez.',
        targetSelector: '[data-tutorial="equipos-excel"]',
        position: 'bottom'
      },
      {
        id: 'equipos-invitar',
        title: 'Invitar jugadores',
        text: 'Genera un enlace de invitación para que los jugadores se registren y se asignen al club. Comparte el enlace por WhatsApp o correo.',
        targetSelector: '[data-tutorial="equipos-invitar"]',
        position: 'bottom'
      },
      {
        id: 'equipos-crear',
        title: 'Crear equipo',
        text: 'Crea un nuevo equipo: elige categoría, nivel y letra (A, B, C…). Puedes crear categorías nuevas si no existe la que buscas.',
        targetSelector: '[data-tutorial="equipos-crear"]',
        position: 'bottom'
      },
      {
        id: 'equipos-temporada',
        title: 'Temporada',
        text: 'Cambia de temporada para ver los equipos de otro curso. El listado y las estadísticas se actualizan según la temporada seleccionada.',
        targetSelector: '[data-tutorial="equipos-temporada"]',
        position: 'bottom'
      },
      {
        id: 'equipos-listado',
        title: 'Listado de equipos',
        text: 'Cada tarjeta es un equipo. Verás el escudo, nombre, horario de entrenamientos y número de jugadores. Pulsa en una tarjeta para abrir el calendario y el detalle de ese equipo.',
        targetSelector: '[data-tutorial="equipos-listado"]',
        position: 'left'
      },
      {
        id: 'equipos-fin',
        title: 'Listo',
        text: 'Ya conoces la pantalla de equipos. Usa las acciones superiores para importar jugadores, invitar o crear equipos, y pulsa en cualquier tarjeta para ver su calendario.',
        position: 'bottom'
      }
    ];
  }

  /** Pasos del tutorial de Documentos del club. */
  private getDocumentosClubSteps(): TutorialStep[] {
    return [
      {
        id: 'docs-bienvenida',
        title: 'Documentos del club',
        text: 'Aquí almacenas y organizas toda la documentación del club: autorizaciones, fichas médicas, contratos y formularios personalizados. Puedes subir documentos, solicitarlos a jugadores o entrenadores y hacer seguimiento de las entregas.',
        position: 'bottom'
      },
      {
        id: 'docs-volver',
        title: 'Volver',
        text: 'Pulsa aquí para regresar al inicio del dashboard del club.',
        targetSelector: '[data-tutorial="docs-volver"]',
        position: 'bottom'
      },
      {
        id: 'docs-tabs',
        title: 'Pestañas Jugadores / Entrenadores',
        text: 'Cambia entre la documentación de jugadores y la de entrenadores. Cada pestaña muestra los documentos y el estado de entrega correspondiente.',
        targetSelector: '[data-tutorial="docs-tabs"]',
        position: 'bottom'
      },
      {
        id: 'docs-acciones',
        title: 'Acciones rápidas',
        text: 'Subir documento: añade un archivo (PDF, imagen, etc.) al club. Solicitar documento: exige la entrega de un tipo de documento a jugadores o entrenadores. Crear formulario: diseña un formulario personalizado con campos a rellenar.',
        targetSelector: '[data-tutorial="docs-acciones"]',
        position: 'bottom'
      },
      {
        id: 'docs-busqueda',
        title: 'Buscar y filtrar',
        text: 'Busca documentos por nombre o descripción y filtra por equipo. El contador muestra cuántos documentos hay en la lista actual.',
        targetSelector: '[data-tutorial="docs-busqueda"]',
        position: 'bottom'
      },
      {
        id: 'docs-tabla',
        title: 'Tabla de documentos',
        text: 'Cada fila es un documento: verás el estado de completado (entregados/total), equipos asignados, nombre, descripción y fecha. Desde las acciones puedes ver visibilidad, solicitar subida, editar, abrir el archivo o eliminar.',
        targetSelector: '[data-tutorial="docs-tabla"]',
        position: 'left'
      },
      {
        id: 'docs-fin',
        title: 'Listo',
        text: 'Ya conoces la pantalla de documentos. Usa las tarjetas superiores para subir, solicitar o crear formularios, y la tabla para revisar y gestionar cada documento.',
        position: 'bottom'
      }
    ];
  }

  /** Pasos del tutorial de Gestión de Cuotas (new-cuotas). */
  private getNewCuotasSteps(): TutorialStep[] {
    return [
      {
        id: 'cuotas-bienvenida',
        title: 'Gestión de Cuotas',
        text: 'En esta pantalla gestionas los pagos y cuotas del club: configuración de pagos, Stripe, historial, Sphaira Pay, cuenta bancaria y notificaciones. Verás el resumen de jugadores, total a cobrar, cobrado y pendiente, y el listado de jugadores con su estado de pago.',
        position: 'bottom'
      },
      {
        id: 'cuotas-volver',
        title: 'Volver',
        text: 'Pulsa aquí para regresar al inicio del dashboard del club.',
        targetSelector: '[data-tutorial="cuotas-volver"]',
        position: 'bottom'
      },
      {
        id: 'cuotas-acciones',
        title: 'Acciones rápidas',
        text: 'Pagos: configura las cuotas del club. Stripe: conecta tu cuenta para cobros online. Historial: consulta todos los movimientos. Sphaira Pay: pagos integrados. Banco: datos de la cuenta bancaria. Notif.: configura recordatorios de pago.',
        targetSelector: '[data-tutorial="cuotas-acciones"]',
        position: 'bottom'
      },
      {
        id: 'cuotas-resumen',
        title: 'Resumen',
        text: 'Tarjetas con el total de jugadores, importe total a cobrar, cantidad ya cobrada (con barra de progreso) e importe pendiente. Te dan una visión rápida del estado de las cuotas.',
        targetSelector: '[data-tutorial="cuotas-resumen"]',
        position: 'bottom'
      },
      {
        id: 'cuotas-filtros',
        title: 'Buscar y filtrar',
        text: 'Busca jugadores por nombre, filtra por tipo de cuota y restablece los datos. El filtro por cuota permite ver solo los jugadores de una o varias cuotas concretas.',
        targetSelector: '[data-tutorial="cuotas-filtros"]',
        position: 'bottom'
      },
      {
        id: 'cuotas-listado',
        title: 'Listado de jugadores',
        text: 'Tabla con cada jugador: nombre, equipo, estado, total a pagar, pagado, restante y progreso por cuota. Desde las acciones puedes editar, registrar un pago o ver el historial de pagos del jugador.',
        targetSelector: '[data-tutorial="cuotas-listado"]',
        position: 'left'
      },
      {
        id: 'cuotas-fin',
        title: 'Listo',
        text: 'Ya conoces la gestión de cuotas. Usa la barra superior para configurar pagos y Stripe, y la tabla para revisar y registrar cobros por jugador.',
        position: 'bottom'
      }
    ];
  }

  /** Pasos del tutorial de Gestión de Ropa. */
  private getRopaSteps(): TutorialStep[] {
    return [
      {
        id: 'ropa-bienvenida',
        title: 'Gestión de Ropa',
        text: 'Aquí gestionas la equipación del club: tabla de tallas por jugador (camiseta, pantalón, medias), catálogo de prendas y exportación a Excel. Puedes cambiar de temporada y personalizar las columnas visibles.',
        position: 'bottom'
      },
      {
        id: 'ropa-volver',
        title: 'Volver',
        text: 'Pulsa aquí para regresar al inicio del dashboard del club.',
        targetSelector: '[data-tutorial="ropa-volver"]',
        position: 'bottom'
      },
      {
        id: 'ropa-temporada',
        title: 'Temporada',
        text: 'Selecciona la temporada para ver y editar las tallas del catálogo y de los jugadores de ese curso.',
        targetSelector: '[data-tutorial="ropa-temporada"]',
        position: 'bottom'
      },
      {
        id: 'ropa-tabs',
        title: 'Pestañas',
        text: 'Tallas catálogo: gestiona las tallas del catálogo del club. Catálogo de prendas: define las prendas disponibles. Tallas jugadores: tabla clásica con las tallas de cada jugador (sección antigua).',
        targetSelector: '[data-tutorial="ropa-tabs"]',
        position: 'bottom'
      },
      {
        id: 'ropa-tabla-tallas',
        title: 'Tabla de tallas catálogo',
        text: 'En esta pestaña ves la tabla de tallas del catálogo del club: cada prenda (camiseta, pantalón, medias, etc.) con las tallas disponibles. Puedes editar las tallas del catálogo y gestionar el contenido que verán los jugadores.',
        targetSelector: '[data-tutorial="ropa-contenido"]',
        position: 'left'
      },
      {
        id: 'ropa-catalogo-tab',
        title: 'Catálogo de prendas',
        text: 'Pulsa aquí para ver el catálogo de prendas del club: define las prendas disponibles (camiseta, pantalón, medias, etc.) y sus tallas. El tutorial cambiará a esta pestaña para mostrarte el contenido.',
        targetSelector: '[data-tutorial="ropa-tab-catalogo"]',
        position: 'bottom'
      },
      {
        id: 'ropa-contenido',
        title: 'Contenido',
        text: 'Según la pestaña activa verás la tabla de tallas del catálogo, el catálogo de prendas o la tabla de jugadores con sus tallas. Desde aquí puedes exportar a Excel y personalizar columnas visibles.',
        targetSelector: '[data-tutorial="ropa-contenido"]',
        position: 'left'
      },
      {
        id: 'ropa-fin',
        title: 'Listo',
        text: 'Ya conoces la gestión de ropa. Cambia de pestaña para trabajar con el catálogo o con las tallas de los jugadores.',
        position: 'bottom'
      }
    ];
  }

  /** Pasos del tutorial de Patrocinadores. */
  private getPatrocinadoresSteps(): TutorialStep[] {
    return [
      {
        id: 'patro-bienvenida',
        title: 'Patrocinadores',
        text: 'En esta pantalla administras los patrocinadores del club: logos, datos de contacto, beneficios y visibilidad en el carrusel de la web. Puedes añadir, editar y mostrar u ocultar cada patrocinador.',
        position: 'bottom'
      },
      {
        id: 'patro-volver',
        title: 'Volver',
        text: 'Pulsa aquí para regresar al inicio del dashboard del club.',
        targetSelector: '[data-tutorial="patro-volver"]',
        position: 'bottom'
      },
      {
        id: 'patro-carrusel',
        title: 'Carrusel de logos',
        text: 'Los patrocinadores visibles aparecen aquí en un carrusel. Los usuarios pueden hacer clic en un logo para ver su ficha. Solo se muestran los que tienen "Mostrar en carrusel" activado.',
        targetSelector: '[data-tutorial="patro-carrusel"]',
        position: 'bottom'
      },
      {
        id: 'patro-nuevo',
        title: 'Nuevo patrocinador',
        text: 'Añade un patrocinador: sube el logo, nombre, descripción, web, email, teléfono y beneficios para el club. Después podrás activar o desactivar su aparición en el carrusel.',
        targetSelector: '[data-tutorial="patro-nuevo"]',
        position: 'bottom'
      },
      {
        id: 'patro-grid',
        title: 'Fichas de patrocinadores',
        text: 'Cada tarjeta muestra un patrocinador con su logo, nombre, descripción, enlaces de contacto y beneficios. Puedes ver la ficha completa, mostrar u ocultar en el carrusel y eliminar.',
        targetSelector: '[data-tutorial="patro-grid"]',
        position: 'left'
      },
      {
        id: 'patro-fin',
        title: 'Listo',
        text: 'Ya conoces la pantalla de patrocinadores. Usa el botón "Nuevo" para añadir patrocinadores y las tarjetas para editar o gestionar su visibilidad.',
        position: 'bottom'
      }
    ];
  }

  /** Pasos del tutorial de Notificaciones (gestión tipo correo). */
  private getNotificacionesSteps(): TutorialStep[] {
    return [
      {
        id: 'notif-bienvenida',
        title: 'Gestión de Notificaciones',
        text: 'Desde aquí envías y gestionas las notificaciones del club. Tienes bandeja de entrada, enviados y mensajes programados. Puedes redactar mensajes a jugadores, entrenadores o equipos completos, y programar envíos para más tarde.',
        position: 'bottom'
      },
      {
        id: 'notif-volver',
        title: 'Volver',
        text: 'Pulsa aquí para regresar al inicio del dashboard del club.',
        targetSelector: '[data-tutorial="notif-volver"]',
        position: 'bottom'
      },
      {
        id: 'notif-redactar',
        title: 'Redactar mensaje',
        text: 'Abre el formulario para escribir una nueva notificación. Elige destinatarios (jugadores, entrenadores o equipos), asunto y cuerpo del mensaje. Puedes enviar al momento o programar la fecha y hora de envío.',
        targetSelector: '[data-tutorial="notif-redactar"]',
        position: 'right'
      },
      {
        id: 'notif-sidebar',
        title: 'Bandejas',
        text: 'Entrada: mensajes recibidos (con contador de no leídos). Enviados: mensajes que has enviado. Programados: mensajes con envío programado; desde aquí puedes editar o cancelar la programación.',
        targetSelector: '[data-tutorial="notif-sidebar"]',
        position: 'right'
      },
      {
        id: 'notif-toolbar',
        title: 'Búsqueda y marcar todo como leído',
        text: 'Busca en la lista por remitente, asunto o contenido. Si tienes mensajes sin leer en la bandeja de entrada, el botón "Marcar todo como leído" los marcará de una vez.',
        targetSelector: '[data-tutorial="notif-toolbar"]',
        position: 'bottom'
      },
      {
        id: 'notif-filtros',
        title: 'Filtros (Entrada)',
        text: 'En la bandeja de entrada puedes filtrar por: Todos, Leídos o No leídos. Útil para localizar rápidamente los mensajes pendientes de leer.',
        targetSelector: '[data-tutorial="notif-filtros"]',
        position: 'bottom'
      },
      {
        id: 'notif-lista',
        title: 'Lista de mensajes',
        text: 'Cada fila muestra remitente o destinatario, asunto y fecha. Los no leídos tienen un indicador. Pulsa en un mensaje para abrirlo en el panel de lectura. Desde aquí también puedes marcar como leído o eliminar.',
        targetSelector: '[data-tutorial="notif-lista"]',
        position: 'left'
      },
      {
        id: 'notif-lector',
        title: 'Panel de lectura',
        text: 'Al seleccionar un mensaje verás aquí el asunto, remitente o destinatario, fecha y el cuerpo del mensaje. En móvil puedes volver atrás para ver de nuevo la lista.',
        targetSelector: '[data-tutorial="notif-lector"]',
        position: 'left'
      },
      {
        id: 'notif-fin',
        title: 'Listo',
        text: 'Ya conoces la gestión de notificaciones. Usa "Redactar" para enviar mensajes, cambia de bandeja en el menú lateral y aprovecha la búsqueda y los filtros para encontrar lo que necesitas.',
        position: 'bottom'
      }
    ];
  }

  /** Pasos del tutorial de Gestión de Staff. */
  private getStaffClubSteps(): TutorialStep[] {
    return [
      {
        id: 'staff-bienvenida',
        title: 'Gestión de Staff',
        text: 'Aquí creas y gestionas los usuarios con acceso al panel del club. Cada usuario Staff tiene permisos por módulo (jugadores, estadísticas, calendario, documentos, pagos, etc.). Puedes habilitar o deshabilitar el acceso y editar los permisos en cualquier momento.',
        position: 'bottom'
      },
      {
        id: 'staff-volver',
        title: 'Volver',
        text: 'Pulsa aquí para regresar al inicio del dashboard del club.',
        targetSelector: '[data-tutorial="staff-volver"]',
        position: 'bottom'
      },
      {
        id: 'staff-toolbar',
        title: 'Barra de acciones',
        text: 'Se muestra el número de usuarios Staff y el botón "Nuevo Staff" para crear un usuario. Al crear indicarás nombre, apellidos, email y contraseña, y seleccionarás los módulos a los que tendrá acceso.',
        targetSelector: '[data-tutorial="staff-toolbar"]',
        position: 'bottom'
      },
      {
        id: 'staff-grid',
        title: 'Tarjetas de usuarios',
        text: 'Cada tarjeta corresponde a un usuario Staff: identidad (nombre, email), estado (Activo/Inhabilitado), interruptor de acceso y permisos asignados. Desde las acciones puedes editar permisos o eliminar al usuario.',
        targetSelector: '[data-tutorial="staff-grid"]',
        position: 'left'
      },
      {
        id: 'staff-tarjeta',
        title: 'Contenido de cada tarjeta',
        text: 'En cada tarjeta verás el nombre, email y badge de estado. El interruptor "Acceso" habilita o deshabilita el acceso al panel (con confirmación). Los chips muestran los permisos por módulo. Los botones de lápiz y papelera permiten editar permisos o eliminar al usuario.',
        targetSelector: '[data-tutorial="staff-tarjeta"]',
        position: 'left'
      },
      {
        id: 'staff-fin',
        title: 'Listo',
        text: 'Ya conoces la gestión de Staff. Crea usuarios con "Nuevo Staff", asigna solo los módulos que necesiten y usa el interruptor de acceso para activar o desactivar el panel sin borrar al usuario.',
        position: 'bottom'
      }
    ];
  }

  /** Pasos del tutorial de Scouting del club. */
  private getScoutingClubSteps(): TutorialStep[] {
    return [
      {
        id: 'scout-bienvenida',
        title: 'Scouting del club',
        text: 'Aquí gestionas la lista de jugadores en observación: tu lista de seguimiento (watchlist), el pipeline por estados (Identificado, Observado, Evaluado, etc.) y la opción de comparar jugadores. Puedes añadir jugadores externos, evaluarlos y generar informes con IA.',
        position: 'bottom'
      },
      {
        id: 'scout-volver',
        title: 'Volver',
        text: 'Pulsa aquí para regresar al inicio del dashboard del club.',
        targetSelector: '[data-tutorial="scout-volver"]',
        position: 'bottom'
      },
      {
        id: 'scout-config',
        title: 'Configuración',
        text: 'Abre la configuración del módulo: activa o desactiva el Pipeline (vista Kanban por estados), los informes y la comparativa de jugadores. Los cambios se aplican al guardar.',
        targetSelector: '[data-tutorial="scout-config"]',
        position: 'bottom'
      },
      {
        id: 'scout-tabs',
        title: 'Pestañas',
        text: 'Lista de seguimiento: tabla con todos los jugadores en observación, filtros por estado y búsqueda. Pipeline: vista por columnas (estados) para mover jugadores entre fases. El badge muestra cuántos hay en la lista.',
        targetSelector: '[data-tutorial="scout-tabs"]',
        position: 'bottom'
      },
      {
        id: 'scout-watchlist-header',
        title: 'Barra de la lista de seguimiento',
        text: 'Busca por nombre, filtra por estado del pipeline (Todos, Identificado, Observado, etc.), añade jugadores externos (no registrados en Sphaira) con "Añadir externo" y activa el modo comparación para elegir hasta 4 jugadores y ver una comparativa.',
        targetSelector: '[data-tutorial="scout-watchlist-header"]',
        position: 'bottom'
      },
      {
        id: 'scout-tabla',
        title: 'Tabla de jugadores',
        text: 'Cada fila muestra nombre, edad, posición, equipo, estado (selector para cambiar de fase), valoración media y acciones: ver ficha, añadir evaluación y quitar de la lista. Pulsa en el nombre para abrir la ficha completa.',
        targetSelector: '[data-tutorial="scout-tabla"]',
        position: 'left'
      },
      {
        id: 'scout-pipeline',
        title: 'Vista Pipeline',
        text: 'Si está activada en configuración, verás columnas por estado (Identificado, Observado, Evaluado, Contactado, etc.). Arrastra o usa las flechas para mover jugadores entre columnas. La sección "Descartados" agrupa los que has descartado; puedes restaurarlos.',
        targetSelector: '[data-tutorial="scout-pipeline"]',
        position: 'left'
      },
      {
        id: 'scout-fin',
        title: 'Listo',
        text: 'Ya conoces el módulo de Scouting. Usa la lista de seguimiento para evaluar jugadores, el pipeline para organizar por fase y la comparativa para analizar varios jugadores a la vez. Desde la ficha de cada jugador puedes añadir evaluaciones, vídeos e informes con IA.',
        position: 'bottom'
      }
    ];
  }

  /** Pasos del tutorial de Biblioteca de Vídeos del club. */
  private getClubVideosSteps(): TutorialStep[] {
    return [
      {
        id: 'videos-bienvenida',
        title: 'Biblioteca de Vídeos',
        text: 'Aquí gestionas todos los vídeos de scouting del club: subir desde tu equipo, importar desde Google Drive, añadir enlaces de YouTube/Vimeo/VEO y organizarlos en carpetas por temporada. Puedes reproducir, mover, exportar a Drive o abrir un vídeo en Análisis de Vídeo.',
        position: 'bottom'
      },
      {
        id: 'videos-volver',
        title: 'Volver',
        text: 'Pulsa aquí para regresar al dashboard del club.',
        targetSelector: '[data-tutorial="videos-volver"]',
        position: 'bottom'
      },
      {
        id: 'videos-header-acciones',
        title: 'Acciones del header',
        text: '"Gestionar plan" o "Contratar almacenamiento" abre los planes de vídeo. "Subir vídeo" sube un archivo desde tu equipo (requiere plan). "Importar desde Drive" trae vídeos desde Google Drive. "Añadir enlace" agrega un vídeo por URL de YouTube, Vimeo o VEO sin consumir espacio.',
        targetSelector: '[data-tutorial="videos-header-acciones"]',
        position: 'bottom'
      },
      {
        id: 'videos-plan-bar',
        title: 'Uso de almacenamiento',
        text: 'La barra muestra el plan activo, el espacio usado y el límite. El porcentaje y el número de vídeos te ayudan a controlar el consumo. Si no tienes plan, verás un banner para contratar almacenamiento.',
        targetSelector: '[data-tutorial="videos-plan-bar"]',
        position: 'bottom'
      },
      {
        id: 'videos-sidebar',
        title: 'Carpetas',
        text: 'Selector de temporada y lista de carpetas: "Todos los vídeos", "Sin carpeta" y las carpetas creadas. El botón de personas sincroniza carpetas por equipo; el de carpeta plus crea una nueva. En cada carpeta (no de equipo) puedes renombrar o eliminar.',
        targetSelector: '[data-tutorial="videos-sidebar"]',
        position: 'right'
      },
      {
        id: 'videos-busqueda',
        title: 'Búsqueda y filtro por carpeta',
        text: 'Busca por título, jugador o etiqueta. Si has seleccionado una carpeta, aparece el breadcrumb; puedes quitarlo para ver todos los vídeos de nuevo.',
        targetSelector: '[data-tutorial="videos-busqueda"]',
        position: 'bottom'
      },
      {
        id: 'videos-grid',
        title: 'Grid de vídeos',
        text: 'Cada tarjeta muestra miniatura, título, jugador, carpeta, etiquetas y fecha. Acciones: "Ver" para reproducir, "Exportar a Drive", "Analizar vídeo" (abre en Análisis de Vídeo), "Mover a carpeta" y "Eliminar". Los enlaces externos muestran badge de YouTube/Vimeo/VEO.',
        targetSelector: '[data-tutorial="videos-grid"]',
        position: 'left'
      },
      {
        id: 'videos-fin',
        title: 'Listo',
        text: 'Ya conoces la Biblioteca de Vídeos. Sube o enlaza vídeos, organízalos en carpetas y usa "Analizar vídeo" para etiquetar jugadas en el módulo de Análisis de Vídeo.',
        position: 'bottom'
      }
    ];
  }

  /** Pasos del tutorial del Hub de Análisis de Vídeo. */
  private getVideoAnalysisSteps(): TutorialStep[] {
    return [
      {
        id: 'va-bienvenida',
        title: 'Análisis de Vídeo',
        text: 'Desde aquí creas y gestionas proyectos de etiquetado de vídeo: subes un archivo local (se reproduce en tu equipo, no se sube al servidor), eliges una plantilla de categorías y etiquetas jugadas. Puedes crear playlists y compartir con el equipo.',
        position: 'bottom'
      },
      {
        id: 'va-volver',
        title: 'Volver',
        text: 'Pulsa aquí para regresar al dashboard.',
        targetSelector: '[data-tutorial="va-volver"]',
        position: 'bottom'
      },
      {
        id: 'va-quick-actions',
        title: 'Acciones rápidas',
        text: 'Plantillas: gestiona las categorías de etiquetado (tipos de jugadas, eventos). Playlists: crea y comparte listas de clips. Biblioteca: enlace a la Biblioteca de Vídeos del club para subir o ver vídeos.',
        targetSelector: '[data-tutorial="va-quick-actions"]',
        position: 'bottom'
      },
      {
        id: 'va-kpi',
        title: 'Filtros por estado',
        text: 'Las tarjetas Total, En progreso, Completados y Borradores filtran la lista de proyectos. Pulsa en una para ver solo los análisis en ese estado.',
        targetSelector: '[data-tutorial="va-kpi"]',
        position: 'bottom'
      },
      {
        id: 'va-toolbar',
        title: 'Barra de proyectos',
        text: 'Contador de análisis, búsqueda por título y el botón "Nuevo análisis" para crear un proyecto: título, descripción, archivo de vídeo local y plantilla. Puedes elegir contexto Libre, Partido o Entrenamiento.',
        targetSelector: '[data-tutorial="va-toolbar"]',
        position: 'bottom'
      },
      {
        id: 'va-grid',
        title: 'Proyectos de análisis',
        text: 'Cada tarjeta muestra estado (color), título, descripción, origen del vídeo (local, online, partido, entrenamiento) y fecha. Acciones: archivar o eliminar. Pulsa en la tarjeta para abrir el workspace de etiquetado.',
        targetSelector: '[data-tutorial="va-grid"]',
        position: 'left'
      },
      {
        id: 'va-fin',
        title: 'Listo',
        text: 'Crea tu primer análisis con "Nuevo análisis", elige una plantilla en Plantillas si hace falta, y abre un proyecto para etiquetar jugadas y crear clips.',
        position: 'bottom'
      }
    ];
  }

  /** Pasos del tutorial del Asistente IA. */
  private getAsistenteIaSteps(): TutorialStep[] {
    return [
      {
        id: 'asistente-bienvenida',
        title: 'Asistente IA',
        text: 'Chat con inteligencia artificial del club: haz preguntas, pide resúmenes o que ejecute acciones (consultar datos, crear elementos). Las respuestas pueden incluir acciones que debes confirmar. Usa créditos por mensaje; el saldo se muestra en la cabecera.',
        position: 'bottom'
      },
      {
        id: 'asistente-volver',
        title: 'Volver',
        text: 'Pulsa aquí para regresar al dashboard.',
        targetSelector: '[data-tutorial="asistente-volver"]',
        position: 'bottom'
      },
      {
        id: 'asistente-sidebar',
        title: 'Historial de conversaciones',
        text: 'El panel lateral lista tus conversaciones anteriores. El botón "+" inicia una nueva conversación. Pulsa en una entrada para cargarla; el botón de papelera la elimina.',
        targetSelector: '[data-tutorial="asistente-sidebar"]',
        position: 'right'
      },
      {
        id: 'asistente-toggle',
        title: 'Mostrar u ocultar historial',
        text: 'Este botón abre o cierra el panel del historial de conversaciones para ganar espacio en pantalla.',
        targetSelector: '[data-tutorial="asistente-toggle"]',
        position: 'right'
      },
      {
        id: 'asistente-header',
        title: 'Cabecera del chat',
        text: 'Título del asistente, indicador de estado (en línea) y créditos disponibles. Pulsa en los créditos para ver detalles o comprar más. El botón "+" inicia una nueva conversación.',
        targetSelector: '[data-tutorial="asistente-header"]',
        position: 'bottom'
      },
      {
        id: 'asistente-body',
        title: 'Mensajes',
        text: 'Aquí se muestran tus mensajes y las respuestas del asistente. Las respuestas pueden incluir acciones pendientes de confirmar (ejecutar o cancelar). El asistente puede mostrar "escribiendo..." mientras genera la respuesta.',
        targetSelector: '[data-tutorial="asistente-body"]',
        position: 'left'
      },
      {
        id: 'asistente-sugerencias',
        title: 'Sugerencias',
        text: 'Al iniciar una conversación verás chips de sugerencias: preguntas o tareas frecuentes. Pulsa en uno para enviarlo como mensaje y obtener una respuesta rápida.',
        targetSelector: '[data-tutorial="asistente-sugerencias"]',
        position: 'top'
      },
      {
        id: 'asistente-input',
        title: 'Escribir y enviar',
        text: 'Escribe en el área de texto y pulsa Enviar (o Intro). Si el asistente admite voz, el botón del micrófono permite dictar. Durante la respuesta puedes cancelar con el botón X. El aviso legal recuerda que la IA puede equivocarse.',
        targetSelector: '[data-tutorial="asistente-input"]',
        position: 'top'
      },
      {
        id: 'asistente-fin',
        title: 'Listo',
        text: 'Ya conoces el Asistente IA. Usa las sugerencias o escribe libremente, revisa los créditos y confirma las acciones que el asistente te proponga cuando aparezcan.',
        position: 'bottom'
      }
    ];
  }

  /** Pasos del tutorial de Info Jugadores (cuadro de mandos). */
  private getInfoJugadoresSteps(): TutorialStep[] {
    return [
      { id: 'ij-bienvenida', title: 'Info Jugadores', text: 'Consulta y gestiona el perfil de cada jugador del club: datos personales, padre/madre, DNI, documentos, equipo asignado. Puedes mover jugadores de equipo, cambiar temporada, exportar a Excel y personalizar columnas.', position: 'bottom' },
      { id: 'ij-volver', title: 'Volver', text: 'Regresa al cuadro de mandos del club.', targetSelector: '[data-tutorial="ij-volver"]', position: 'bottom' },
      { id: 'ij-consultar-ia', title: 'Consultar IA', text: 'Abre el panel lateral del Asistente IA para hacer preguntas sobre el listado de jugadores (datos anonimizados): distribución por posición, por equipo, posiciones con déficit, jugadores sin dorsal, etc.', targetSelector: '[data-tutorial="ij-consultar-ia"]', position: 'left' },
      { id: 'ij-toolbar', title: 'Barra de controles', text: 'Busca por nombre o datos, filtra por equipo (Todos los equipos o uno concreto), exporta la tabla a Excel y personaliza los campos visibles con "Campos personalizados".', targetSelector: '[data-tutorial="ij-toolbar"]', position: 'bottom' },
      { id: 'ij-tabla', title: 'Tabla de jugadores', text: 'Cada fila: foto, nombre (clic para ver ficha completa), equipo con botones Mover jugador y Cambiar temporada, fecha nacimiento, teléfono, DNI, botón DNI (subir caras), botón Documentos, datos padre/madre, IBAN y campos personalizados (firma/archivo).', targetSelector: '[data-tutorial="ij-tabla"]', position: 'left' },
      { id: 'ij-modal-jugador', title: 'Información del jugador', text: 'Haz clic en el nombre de un jugador para abrir el modal con su ficha completa: información personal, datos financieros (si aplica), documentos, DNI y campos personalizados.', targetSelector: '[data-tutorial="ij-tabla"]', position: 'left' },
      { id: 'ij-panel-ia', title: 'Panel Asistente IA', text: 'Sugerencias rápidas (distribución por posición, por equipo, etc.), historial de mensajes y área para escribir consultas. Shift+Enter nueva línea, Enter enviar.', targetSelector: '[data-tutorial="ij-panel-ia"]', position: 'left' },
      { id: 'ij-fin', title: 'Listo', text: 'Ya conoces Info Jugadores. Usa la búsqueda y el filtro por equipo, exporta a Excel, personaliza columnas y haz clic en un nombre para ver la ficha completa del jugador o abre el panel IA para consultas.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial de Info Entrenadores (cuadro de mandos). */
  private getInfoEntrenadoresSteps(): TutorialStep[] {
    return [
      { id: 'ie-bienvenida', title: 'Info Entrenadores', text: 'Consulta y gestiona el perfil de cada entrenador del club: datos personales, rol (entrenador, fisio, nutricionista), equipos asignados, certificados (delitos sexuales, antecedentes, seguro, primeros auxilios), documentos e historial deportivo.', position: 'bottom' },
      { id: 'ie-volver', title: 'Volver', text: 'Regresa al cuadro de mandos del club.', targetSelector: '[data-tutorial="ie-volver"]', position: 'bottom' },
      { id: 'ie-consultar-ia', title: 'Consultar IA', text: 'Abre el panel del Asistente IA para preguntas sobre el cuerpo técnico (datos anonimizados): total de entrenadores, equipos con entrenador, distribución de perfiles, equipos sin entrenador.', targetSelector: '[data-tutorial="ie-consultar-ia"]', position: 'left' },
      { id: 'ie-toolbar', title: 'Barra de controles', text: 'Selecciona temporada, busca por nombre, filtra por equipo, exporta a Excel y configura los campos personalizados visibles en la tabla.', targetSelector: '[data-tutorial="ie-toolbar"]', position: 'bottom' },
      { id: 'ie-tabla', title: 'Tabla de entrenadores', text: 'Columnas ordenables: imagen, nombre (clic para ver ficha), rol, equipo(s), email, teléfono, fecha nacimiento, DNI, nacionalidad, licencia federativa, titulación, certificados (botón), contacto emergencia, campos personalizados, DNI (imágenes), Documentos. Pulsa en el nombre para ver la ficha completa.', targetSelector: '[data-tutorial="ie-tabla"]', position: 'left' },
      { id: 'ie-panel-ia', title: 'Panel Asistente IA', text: 'Sugerencias (total entrenadores, equipos con entrenador, perfiles, equipos sin entrenador), mensajes y área de consulta.', targetSelector: '[data-tutorial="ie-panel-ia"]', position: 'left' },
      { id: 'ie-fin', title: 'Listo', text: 'Ya conoces Info Entrenadores. Ordena por cualquier columna, abre la ficha con el nombre y usa el panel IA para análisis del cuerpo técnico.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial de Estadísticas Jugadores Club. */
  private getEstadisticasJugadoresClubSteps(): TutorialStep[] {
    return [
      { id: 'ej-bienvenida', title: 'Estadísticas Jugadores', text: 'Métricas y análisis de rendimiento de los jugadores del club: partidos jugados, minutos, goles, asistencias, penaltis, tarjetas. Todas las columnas son ordenables. Incluye paginación y panel de consultas con IA.', position: 'bottom' },
      { id: 'ej-volver', title: 'Volver', text: 'Regresa al cuadro de mandos.', targetSelector: '[data-tutorial="ej-volver"]', position: 'bottom' },
      { id: 'ej-consultar-ia', title: 'Consultar IA', text: 'Abre el panel IA para preguntas como: goleador, gráfica de asistencias, rendimiento, jugadores con más tarjetas, comparativa goles vs asistencias, media de minutos.', targetSelector: '[data-tutorial="ej-consultar-ia"]', position: 'left' },
      { id: 'ej-tabla', title: 'Tabla de estadísticas', text: 'Columnas ordenables: nombre, equipo, posición, partidos, minutos totales, media minutos/partido, goles, media goles/partido, asistencias, goles+asistencias, penaltis, tiros libres, penaltis fallados, tarjetas (amarilla/roja). Pulsa en el encabezado para ordenar.', targetSelector: '[data-tutorial="ej-tabla"]', position: 'left' },
      { id: 'ej-paginacion', title: 'Paginación', text: 'Cambia el tamaño de página (filas visibles), avanza o retrocede con los botones y consulta el indicador de página actual.', targetSelector: '[data-tutorial="ej-paginacion"]', position: 'top' },
      { id: 'ej-panel-ia', title: 'Panel Asistente IA', text: 'Sugerencias (goleador, asistencias, rendimiento, tarjetas, comparativa, media minutos), mensajes y envío por texto o voz si está disponible.', targetSelector: '[data-tutorial="ej-panel-ia"]', position: 'left' },
      { id: 'ej-fin', title: 'Listo', text: 'Ya conoces las estadísticas de jugadores. Ordena por cualquier métrica y usa el panel IA para análisis rápidos.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial de Estadísticas Equipos Club. */
  private getEstadisticasEquiposClubSteps(): TutorialStep[] {
    return [
      { id: 'ee-bienvenida', title: 'Estadísticas Equipos', text: 'Métricas de rendimiento de todos los equipos del club: posición, partidos jugados, puntos, victorias, empates, derrotas, goles a favor y en contra, diferencia de goles y últimos resultados. Pulsa en un equipo para ver el detalle de sus partidos.', position: 'bottom' },
      { id: 'ee-volver', title: 'Volver', text: 'Regresa al cuadro de mandos.', targetSelector: '[data-tutorial="ee-volver"]', position: 'bottom' },
      { id: 'ee-consultar-ia', title: 'Consultar IA', text: 'Abre el panel IA para consultas sobre equipos: el que más victorias tiene, gráfica de puntos, análisis de rendimiento, comparativa goles, promedio de victorias, últimas rachas.', targetSelector: '[data-tutorial="ee-consultar-ia"]', position: 'left' },
      { id: 'ee-cabecera', title: 'Cabecera y leyenda', text: 'Título del módulo, número de equipos y leyenda de colores: Victoria, Empate, Derrota para interpretar la columna de últimos resultados.', targetSelector: '[data-tutorial="ee-cabecera"]', position: 'bottom' },
      { id: 'ee-tabla', title: 'Tabla de equipos', text: 'Posición (#), categoría del equipo (clic para abrir modal de partidos), PJ, PTS, victorias, empates, derrotas, GF, GA, diferencia de goles y última racha (V/E/D). Las tres primeras filas destacan con estilo podio.', targetSelector: '[data-tutorial="ee-tabla"]', position: 'left' },
      { id: 'ee-panel-ia', title: 'Panel Asistente IA', text: 'Sugerencias y consultas sobre estadísticas de equipos. Puedes usar voz si está disponible.', targetSelector: '[data-tutorial="ee-panel-ia"]', position: 'left' },
      { id: 'ee-fin', title: 'Listo', text: 'Ya conoces las estadísticas de equipos. Haz clic en un equipo para ver sus partidos en el modal.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial de Calendario Club. */
  private getCalendarioClubSteps(): TutorialStep[] {
    return [
      { id: 'cal-bienvenida', title: 'Calendario Club', text: 'Vista mensual de partidos y entrenamientos de todos los equipos del club. Filtra por equipo con los chips, navega entre meses y pulsa en un día o en un evento para ver el detalle.', position: 'bottom' },
      { id: 'cal-volver', title: 'Volver', text: 'Regresa al cuadro de mandos.', targetSelector: '[data-tutorial="cal-volver"]', position: 'bottom' },
      { id: 'cal-filtro', title: 'Filtro de equipos', text: 'Cada chip es un equipo; el color y el ojo indican si está visible. "Mostrar todos" / "Ocultar todos" para ver o ocultar todos a la vez. Arrastra los chips para reordenar. Pulsa en un chip o en el ojo para mostrar u ocultar ese equipo.', targetSelector: '[data-tutorial="cal-filtro"]', position: 'bottom' },
      { id: 'cal-nav', title: 'Navegación del mes', text: 'Flechas para mes anterior y siguiente, título del mes y año, y botón "Hoy" para volver al mes actual.', targetSelector: '[data-tutorial="cal-nav"]', position: 'bottom' },
      { id: 'cal-grid', title: 'Calendario y leyenda', text: 'Grid con días de la semana y celdas por día. Los puntos de color indican eventos (entrenamiento: forma de pesa; partido: forma de balón). Pulsa en una celda para abrir el panel del día. La leyenda explica los tipos de evento.', targetSelector: '[data-tutorial="cal-grid"]', position: 'left' },
      { id: 'cal-panel-dia', title: 'Panel del día', text: 'Al pulsar un día se abre el panel lateral con los eventos de ese día agrupados por equipo. Cada evento (entrenamiento o partido) puede abrirse para ver detalles. El enlace lleva al calendario del equipo.', targetSelector: '[data-tutorial="cal-panel-dia"]', position: 'left' },
      { id: 'cal-fin', title: 'Listo', text: 'Ya conoces el Calendario. Filtra equipos, cambia de mes y pulsa en un día o evento para ver toda la información.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Menu Club: una opción por paso, sin omitir ninguna. */
  private getMenuClubSteps(): TutorialStep[] {
    return [
      { id: 'mc-bienvenida', title: 'Menú del equipo', text: 'Desde aquí accedes a todas las secciones del equipo. Cada tarjeta lleva a una pantalla distinta: calendario, jugadores, estadísticas, galería, etc.', position: 'bottom' },
      { id: 'mc-volver', title: 'Volver', text: 'Regresa a la pantalla anterior.', targetSelector: '[data-tutorial="mc-volver"]', position: 'bottom' },
      { id: 'mc-calendar', title: 'Calendario', text: 'Accede al calendario del equipo: partidos y entrenamientos.', targetSelector: '[data-tutorial="mc-calendar"]', position: 'bottom' },
      { id: 'mc-players', title: 'Jugadores', text: 'Listado e información de los jugadores del equipo.', targetSelector: '[data-tutorial="mc-players"]', position: 'bottom' },
      { id: 'mc-stats-players', title: 'Estadísticas jugadores', text: 'Métricas y rendimiento de los jugadores del equipo.', targetSelector: '[data-tutorial="mc-stats-players"]', position: 'bottom' },
      { id: 'mc-stats-team', title: 'Estadísticas equipo', text: 'Métricas y resultados del equipo (puntos, victorias, goles, etc.).', targetSelector: '[data-tutorial="mc-stats-team"]', position: 'bottom' },
      { id: 'mc-ranking', title: 'Ranking y resultados', text: 'Clasificación y resultados de partidos del equipo.', targetSelector: '[data-tutorial="mc-ranking"]', position: 'bottom' },
      { id: 'mc-gallery', title: 'Galería', text: 'Fotos y galería del equipo.', targetSelector: '[data-tutorial="mc-gallery"]', position: 'bottom' },
      { id: 'mc-team-info', title: 'Info equipo', text: 'Información general del equipo.', targetSelector: '[data-tutorial="mc-team-info"]', position: 'bottom' },
      { id: 'mc-injuries', title: 'Lesiones', text: 'Registro y seguimiento de lesiones del equipo.', targetSelector: '[data-tutorial="mc-injuries"]', position: 'bottom' },
      { id: 'mc-fin', title: 'Listo', text: 'Ya conoces todas las opciones del menú del equipo. Pulsa en cualquier tarjeta para entrar en esa sección.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Menu Entrenador: una opción por paso, sin omitir ninguna. */
  private getMenuEntrenadorSteps(): TutorialStep[] {
    return [
      { id: 'me-bienvenida', title: 'Menú entrenador', text: 'Panel del entrenador: acceso a calendario, tareas, jugadores, estadísticas, notificaciones, galería, lesiones, asistente IA, historial de debrief, perfil, documentos y análisis de vídeo.', position: 'bottom' },
      { id: 'me-volver', title: 'Volver', text: 'Regresa a la pantalla anterior.', targetSelector: '[data-tutorial="me-volver"]', position: 'bottom' },
      { id: 'me-calendar', title: 'Calendario', text: 'Calendario de entrenamientos y partidos del equipo.', targetSelector: '[data-tutorial="me-calendar"]', position: 'bottom' },
      { id: 'me-tasks', title: 'Tareas', text: 'Gestión de tareas y sesiones de entrenamiento.', targetSelector: '[data-tutorial="me-tasks"]', position: 'bottom' },
      { id: 'me-players', title: 'Jugadores', text: 'Listado e información de los jugadores del equipo.', targetSelector: '[data-tutorial="me-players"]', position: 'bottom' },
      { id: 'me-team-info', title: 'Info equipo', text: 'Información general del equipo.', targetSelector: '[data-tutorial="me-team-info"]', position: 'bottom' },
      { id: 'me-team-stats', title: 'Estadísticas equipo', text: 'Métricas y resultados del equipo.', targetSelector: '[data-tutorial="me-team-stats"]', position: 'bottom' },
      { id: 'me-player-stats', title: 'Estadísticas jugadores', text: 'Rendimiento y estadísticas de cada jugador.', targetSelector: '[data-tutorial="me-player-stats"]', position: 'bottom' },
      { id: 'me-rankings', title: 'Rankings', text: 'Clasificaciones y rankings del equipo.', targetSelector: '[data-tutorial="me-rankings"]', position: 'bottom' },
      { id: 'me-notifications', title: 'Notificaciones', text: 'Centro de notificaciones del entrenador.', targetSelector: '[data-tutorial="me-notifications"]', position: 'bottom' },
      { id: 'me-gallery', title: 'Galería', text: 'Fotos y galería del equipo.', targetSelector: '[data-tutorial="me-gallery"]', position: 'bottom' },
      { id: 'me-injuries', title: 'Lesiones', text: 'Registro y seguimiento de lesiones.', targetSelector: '[data-tutorial="me-injuries"]', position: 'bottom' },
      { id: 'me-ai-assistant', title: 'Asistente IA', text: 'Chat con inteligencia artificial para consultas y ayuda.', targetSelector: '[data-tutorial="me-ai-assistant"]', position: 'bottom' },
      { id: 'me-debrief', title: 'Historial debrief', text: 'Historial de reuniones y debriefs post-partido.', targetSelector: '[data-tutorial="me-debrief"]', position: 'bottom' },
      { id: 'me-coach-profile', title: 'Perfil entrenador', text: 'Tu perfil y datos como entrenador.', targetSelector: '[data-tutorial="me-coach-profile"]', position: 'bottom' },
      { id: 'me-coach-documents', title: 'Documentos entrenador', text: 'Documentación y archivos del entrenador.', targetSelector: '[data-tutorial="me-coach-documents"]', position: 'bottom' },
      { id: 'me-video-analysis', title: 'Análisis de vídeo', text: 'Herramientas de análisis de vídeo para entrenamientos y partidos.', targetSelector: '[data-tutorial="me-video-analysis"]', position: 'bottom' },
      { id: 'me-fin', title: 'Listo', text: 'Ya conoces todas las opciones del menú del entrenador.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Opciones Jugador: una opción por paso, sin omitir ninguna. */
  private getOpcionesjugadorSteps(): TutorialStep[] {
    return [
      { id: 'oj-bienvenida', title: 'Opciones del jugador', text: 'Desde aquí el jugador accede a sus datos personales, calendario, cuotas, documentación, clasificación, estadísticas, galería, notificaciones, patrocinadores, lesiones y ropa.', position: 'bottom' },
      { id: 'oj-volver', title: 'Volver', text: 'Regresa a la pantalla anterior.', targetSelector: '[data-tutorial="oj-volver"]', position: 'bottom' },
      { id: 'oj-datos-personales', title: 'Datos personales', text: 'Ver y editar los datos personales del jugador.', targetSelector: '[data-tutorial="oj-datos-personales"]', position: 'bottom' },
      { id: 'oj-calendario', title: 'Calendario', text: 'Calendario de entrenamientos y partidos del jugador.', targetSelector: '[data-tutorial="oj-calendario"]', position: 'bottom' },
      { id: 'oj-pagar-cuotas', title: 'Pagar cuotas', text: 'Gestión y pago de cuotas del jugador.', targetSelector: '[data-tutorial="oj-pagar-cuotas"]', position: 'bottom' },
      { id: 'oj-documentacion', title: 'Documentación', text: 'Documentos y archivos del jugador.', targetSelector: '[data-tutorial="oj-documentacion"]', position: 'bottom' },
      { id: 'oj-clasificacion', title: 'Clasificación y resultados', text: 'Clasificación del equipo y resultados de partidos.', targetSelector: '[data-tutorial="oj-clasificacion"]', position: 'bottom' },
      { id: 'oj-mis-estadisticas', title: 'Mis estadísticas', text: 'Estadísticas personales del jugador.', targetSelector: '[data-tutorial="oj-mis-estadisticas"]', position: 'bottom' },
      { id: 'oj-galeria', title: 'Galería', text: 'Fotos y galería del equipo.', targetSelector: '[data-tutorial="oj-galeria"]', position: 'bottom' },
      { id: 'oj-notificaciones', title: 'Notificaciones', text: 'Notificaciones y avisos del jugador.', targetSelector: '[data-tutorial="oj-notificaciones"]', position: 'bottom' },
      { id: 'oj-patrocinadores', title: 'Patrocinadores', text: 'Información de patrocinadores del club.', targetSelector: '[data-tutorial="oj-patrocinadores"]', position: 'bottom' },
      { id: 'oj-lesiones', title: 'Lesiones', text: 'Registro de lesiones del jugador.', targetSelector: '[data-tutorial="oj-lesiones"]', position: 'bottom' },
      { id: 'oj-ropa', title: 'Ropa', text: 'Catálogo de ropa y equipación del club.', targetSelector: '[data-tutorial="oj-ropa"]', position: 'bottom' },
      { id: 'oj-fin', title: 'Listo', text: 'Ya conoces todas las opciones disponibles para el jugador.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Calendario del equipo (entrenador/jugador). */
  private getCalendarioSteps(): TutorialStep[] {
    return [
      { id: 'cal-bienvenida', title: 'Calendario del equipo', text: 'Aquí ves el calendario de entrenamientos y partidos del equipo. Puedes cambiar entre vista año, mes y semana, y usar el planificador con IA para organizar la semana.', position: 'bottom' },
      { id: 'cal-volver', title: 'Volver', text: 'Regresa al menú anterior.', targetSelector: '[data-tutorial="cal-volver"]', position: 'bottom' },
      { id: 'cal-vistas', title: 'Vistas', text: 'Cambia entre vista por año (grid de meses), por mes (tabla) o por semana (7 días). Cada vista muestra entrenamientos y partidos.', targetSelector: '[data-tutorial="cal-vistas"]', position: 'bottom' },
      { id: 'cal-planner-ia', title: 'Planificador IA', text: 'Abre el planificador semanal con IA para generar o ajustar la planificación de la semana.', targetSelector: '[data-tutorial="cal-planner-ia"]', position: 'bottom' },
      { id: 'cal-nav', title: 'Navegación', text: 'Avanza o retrocede en el tiempo (año, mes o semana según la vista activa).', targetSelector: '[data-tutorial="cal-nav"]', position: 'bottom' },
      { id: 'cal-contenido', title: 'Calendario', text: 'Celdas con entrenamientos (dumbbell) y partidos (local/visitante). Pulsa en un día para ver o editar eventos. Puedes arrastrar eventos entre días en vista semana.', targetSelector: '[data-tutorial="cal-contenido"]', position: 'left' },
      { id: 'cal-fin', title: 'Listo', text: 'Ya conoces el calendario del equipo. Usa la vista que prefieras y el planificador IA para organizar la temporada.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Tareas (hub del entrenador). */
  private getTareasSteps(): TutorialStep[] {
    return [
      { id: 'tareas-bienvenida', title: 'Tareas', text: 'Centro de tareas del equipo: pizarra táctica, catálogo en la nube, historial, favoritas y mis tareas propias. Elige una opción para continuar.', position: 'bottom' },
      { id: 'tareas-volver', title: 'Volver', text: 'Regresa al menú del entrenador.', targetSelector: '[data-tutorial="tareas-volver"]', position: 'bottom' },
      { id: 'tareas-pizarra', title: 'Dibujar / Pizarra táctica', text: 'Abre la pizarra táctica para dibujar jugadas, tácticas y animaciones. Puedes guardar imágenes o GIF en una tarea.', targetSelector: '[data-tutorial="tareas-pizarra"]', position: 'left' },
      { id: 'tareas-nube', title: 'Nube', text: 'Catálogo de tareas en la nube: busca por estrategia e intención y añade tareas a tus entrenamientos.', targetSelector: '[data-tutorial="tareas-nube"]', position: 'left' },
      { id: 'tareas-historial', title: 'Historial', text: 'Tareas que ya has usado en entrenamientos. Consulta y vuelve a añadirlas o marcarlas como favoritas.', targetSelector: '[data-tutorial="tareas-historial"]', position: 'left' },
      { id: 'tareas-favoritas', title: 'Favoritas', text: 'Tus tareas marcadas como favoritas para acceso rápido.', targetSelector: '[data-tutorial="tareas-favoritas"]', position: 'left' },
      { id: 'tareas-mis', title: 'Mis tareas', text: 'Tareas creadas por ti (desde la pizarra o manualmente). Crea, edita y elimina tus propias tareas.', targetSelector: '[data-tutorial="tareas-mis"]', position: 'left' },
      { id: 'tareas-fin', title: 'Listo', text: 'Ya conoces el hub de tareas. Entra en la opción que necesites para preparar tus sesiones.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Pizarra táctica (tactical-board). */
  private getTacticalBoardSteps(): TutorialStep[] {
    return [
      { id: 'tboard-bienvenida', title: 'Pizarra táctica', text: 'Dibuja jugadas, tácticas y animaciones sobre el campo. Añade jugadores, usa herramientas de dibujo, captura keyframes para GIF y exporta PNG o GIF.', position: 'bottom' },
      { id: 'tboard-volver', title: 'Volver / Cerrar', text: 'Regresa atrás o cierra la pizarra. Si hay cambios sin guardar, se te preguntará qué hacer.', targetSelector: '[data-tutorial="tboard-volver"]', position: 'bottom' },
      { id: 'tboard-guardar-tarea', title: 'Guardar en tarea', text: 'En modo tarea, guarda la imagen o el GIF actual en la tarea que estás editando.', targetSelector: '[data-tutorial="tboard-guardar-tarea"]', position: 'bottom' },
      { id: 'tboard-jugadores', title: 'Jugadores y balón', text: 'Añade conos/jugadores con color y el balón. Elige un color en el desplegable y haz clic en el campo para colocar.', targetSelector: '[data-tutorial="tboard-jugadores"]', position: 'bottom' },
      { id: 'tboard-herramientas', title: 'Herramientas de dibujo', text: 'Selección, lápiz, línea, flecha, rectángulo, elipse, texto y goma. Activa una herramienta y dibuja sobre el campo.', targetSelector: '[data-tutorial="tboard-herramientas"]', position: 'bottom' },
      { id: 'tboard-color', title: 'Color y grosor', text: 'Cambia el color y el grosor del trazo para las herramientas de dibujo.', targetSelector: '[data-tutorial="tboard-color"]', position: 'bottom' },
      { id: 'tboard-campo', title: 'Vista del campo', text: 'Cambia entre campo completo o medio campo.', targetSelector: '[data-tutorial="tboard-campo"]', position: 'bottom' },
      { id: 'tboard-deshacer', title: 'Deshacer y rehacer', text: 'Deshace o rehace los últimos cambios.', targetSelector: '[data-tutorial="tboard-deshacer"]', position: 'bottom' },
      { id: 'tboard-borrar', title: 'Eliminar y limpiar', text: 'Elimina el elemento seleccionado o limpia todo el dibujo.', targetSelector: '[data-tutorial="tboard-borrar"]', position: 'bottom' },
      { id: 'tboard-timeline', title: 'Timeline y keyframes', text: 'Añade keyframes para crear una animación. Reproduce, ajusta velocidad y exporta en GIF.', targetSelector: '[data-tutorial="tboard-timeline"]', position: 'top' },
      { id: 'tboard-exportar', title: 'Guardar y exportar', text: 'Guarda el dibujo para retomarlo después, o exporta como PNG o GIF (si hay al menos 2 keyframes).', targetSelector: '[data-tutorial="tboard-exportar"]', position: 'top' },
      { id: 'tboard-fin', title: 'Listo', text: 'Ya conoces la pizarra táctica. Dibuja, anima y guarda o exporta según necesites.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Catálogo de tareas (nube). */
  private getTareasCatalogSteps(): TutorialStep[] {
    return [
      { id: 'tc-bienvenida', title: 'Catálogo de tareas', text: 'Busca y filtra tareas de la nube por texto, estrategia e intención. Añade tareas a favoritas o a un entrenamiento concreto.', position: 'bottom' },
      { id: 'tc-volver', title: 'Volver', text: 'Regresa a la pantalla de tareas.', targetSelector: '[data-tutorial="tc-volver"]', position: 'bottom' },
      { id: 'tc-busqueda', title: 'Búsqueda', text: 'Escribe para filtrar tareas por título o descripción.', targetSelector: '[data-tutorial="tc-busqueda"]', position: 'bottom' },
      { id: 'tc-filtros', title: 'Filtros avanzados', text: 'Filtra por estrategia e intención. Muestra u oculta el panel de filtros avanzados.', targetSelector: '[data-tutorial="tc-filtros"]', position: 'bottom' },
      { id: 'tc-grid', title: 'Grid de tareas', text: 'Tarjetas de tareas con imagen, etiquetas y botón "Añadir a entrenamiento". Pulsa en una tarjeta para ver el detalle; desde el detalle puedes añadir a favoritas o a un entrenamiento.', targetSelector: '[data-tutorial="tc-grid"]', position: 'left' },
      { id: 'tc-paginacion', title: 'Paginación', text: 'Navega entre páginas de resultados si hay muchas tareas.', targetSelector: '[data-tutorial="tc-paginacion"]', position: 'top' },
      { id: 'tc-fin', title: 'Listo', text: 'Ya conoces el catálogo. Busca, filtra y añade tareas a tus entrenamientos o favoritas.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Historial de tareas. */
  private getTareasHistorialSteps(): TutorialStep[] {
    return [
      { id: 'th-bienvenida', title: 'Historial de tareas', text: 'Tareas que ya has usado en entrenamientos. Consulta cuándo y cuántas veces las usaste, abre el detalle y añádelas a favoritas o vuelve a usarlas.', position: 'bottom' },
      { id: 'th-volver', title: 'Volver', text: 'Regresa a la pantalla de tareas.', targetSelector: '[data-tutorial="th-volver"]', position: 'bottom' },
      { id: 'th-grid', title: 'Listado', text: 'Tarjetas con imagen, origen, título, etiquetas y fecha de último uso. Pulsa en una tarjeta para ver el detalle y marcar como favorita.', targetSelector: '[data-tutorial="th-grid"]', position: 'left' },
      { id: 'th-paginacion', title: 'Paginación', text: 'Cambia de página si hay muchas tareas en el historial.', targetSelector: '[data-tutorial="th-paginacion"]', position: 'top' },
      { id: 'th-fin', title: 'Listo', text: 'Ya conoces el historial. Reutiliza tareas y mantén tus favoritas al día.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Tareas favoritas. */
  private getTareasFavoritasSteps(): TutorialStep[] {
    return [
      { id: 'tf-bienvenida', title: 'Tareas favoritas', text: 'Tus tareas marcadas como favoritas. Ábrelas para ver el detalle completo y quitar de favoritas si lo deseas.', position: 'bottom' },
      { id: 'tf-volver', title: 'Volver', text: 'Regresa a la pantalla de tareas.', targetSelector: '[data-tutorial="tf-volver"]', position: 'bottom' },
      { id: 'tf-grid', title: 'Listado', text: 'Tarjetas de tus tareas favoritas. Pulsa en una para ver descripción, reglas, variantes y enlace a vídeo. Desde el detalle puedes quitar de favoritas.', targetSelector: '[data-tutorial="tf-grid"]', position: 'left' },
      { id: 'tf-paginacion', title: 'Paginación', text: 'Navega entre páginas si tienes muchas favoritas.', targetSelector: '[data-tutorial="tf-paginacion"]', position: 'top' },
      { id: 'tf-fin', title: 'Listo', text: 'Ya conoces las tareas favoritas. Añade más desde el catálogo o el historial.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Mis tareas. */
  private getTareasMisSteps(): TutorialStep[] {
    return [
      { id: 'tm-bienvenida', title: 'Mis tareas', text: 'Tareas creadas por ti: desde la pizarra táctica o con el formulario. Crea, edita y elimina; puedes marcarlas como favoritas.', position: 'bottom' },
      { id: 'tm-volver', title: 'Volver', text: 'Regresa a la pantalla de tareas.', targetSelector: '[data-tutorial="tm-volver"]', position: 'bottom' },
      { id: 'tm-crear', title: 'Crear tarea', text: 'Abre el formulario para crear una nueva tarea. Puedes usar una imagen desde la pizarra táctica o rellenar título, estrategia, descripción, reglas, variantes, tiempo, espacio, material y vídeo.', targetSelector: '[data-tutorial="tm-crear"]', position: 'bottom' },
      { id: 'tm-grid', title: 'Listado', text: 'Tus tareas con imagen, título, etiquetas. En cada tarjeta: favorita, editar y eliminar. Pulsa en la tarjeta para ver el detalle completo.', targetSelector: '[data-tutorial="tm-grid"]', position: 'left' },
      { id: 'tm-paginacion', title: 'Paginación', text: 'Cambia de página si tienes muchas tareas propias.', targetSelector: '[data-tutorial="tm-paginacion"]', position: 'top' },
      { id: 'tm-fin', title: 'Listo', text: 'Ya conoces Mis tareas. Crea y edita tus propias tareas para usarlas en tus entrenamientos.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Jugadores (listado del equipo). */
  private getJugadoresSteps(): TutorialStep[] {
    return [
      { id: 'jug-bienvenida', title: 'Listado de jugadores', text: 'Consulta todos los jugadores del equipo. Puedes ver tarjetas o tabla, crear jugadores, invitar, ver información, editar, mover entre equipos o eliminar según tu rol.', position: 'bottom' },
      { id: 'jug-volver', title: 'Volver', text: 'Regresa al menú anterior (menú del equipo o menú entrenador).', targetSelector: '[data-tutorial="jug-volver"]', position: 'bottom' },
      { id: 'jug-crear', title: 'Crear jugador', text: 'Abre el modal para dar de alta un nuevo jugador en el equipo. Solo visible para club y entrenador.', targetSelector: '[data-tutorial="jug-crear"]', position: 'bottom' },
      { id: 'jug-tabs', title: 'Vista de tarjetas y tabla', text: 'Cambia entre vista de tarjetas (fichas con foto, estadísticas y acciones) y vista de tabla (listado con búsqueda y exportar Excel). La pestaña tabla solo se muestra para club y entrenador.', targetSelector: '[data-tutorial="jug-tabs"]', position: 'bottom' },
      { id: 'jug-cards', title: 'Vista de tarjetas', text: 'Cada tarjeta muestra foto, número, posición, valoración, nombre, fecha de nacimiento y estadísticas (habilidad, pase, tiro, defensa, físico, mentalidad). Acciones: invitar, ver info, editar, mover (club), eliminar.', targetSelector: '[data-tutorial="jug-cards"]', position: 'left' },
      { id: 'jug-toolbar', title: 'Barra de la tabla', text: 'Busca jugadores por nombre y exporta el listado a Excel. Solo visible en la pestaña "Vista de tabla".', targetSelector: '[data-tutorial="jug-toolbar"]', position: 'bottom' },
      { id: 'jug-tabla', title: 'Tabla de jugadores', text: 'Listado en tabla con imagen, nombre, fecha, pie, posición y todas las estadísticas (habilidad, pase, tiro, defensa, físico, mentalidad, portero). En cada fila: ver info, editar, mover, eliminar.', targetSelector: '[data-tutorial="jug-tabla"]', position: 'left' },
      { id: 'jug-fin', title: 'Listo', text: 'Ya conoces el listado de jugadores. Usa las tarjetas o la tabla según prefieras y las acciones disponibles según tu permiso.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Información del equipo. */
  private getInformacionEquipoSteps(): TutorialStep[] {
    return [
      { id: 'ie-bienvenida', title: 'Información del equipo', text: 'Configura los datos y la información general del equipo: logo, categoría, nivel de liga, nombre, horario de entrenamiento, objetivos, opiniones y staff (entrenadores, fisio, nutricionista).', position: 'bottom' },
      { id: 'ie-volver', title: 'Volver', text: 'Regresa al menú anterior.', targetSelector: '[data-tutorial="ie-volver"]', position: 'bottom' },
      { id: 'ie-logo', title: 'Logo del equipo', text: 'Vista previa del logo. Si eres club, puedes subir o cambiar el logo desde el botón debajo.', targetSelector: '[data-tutorial="ie-logo"]', position: 'right' },
      { id: 'ie-logo-upload', title: 'Subir o cambiar logo', text: 'Pulsa para seleccionar una imagen y actualizar el logo del equipo. Solo visible para perfil club.', targetSelector: '[data-tutorial="ie-logo-upload"]', position: 'top' },
      { id: 'ie-pills', title: 'Datos resumidos', text: 'Píldoras con categoría, nivel de liga y nombre del equipo (se actualizan al guardar el formulario).', targetSelector: '[data-tutorial="ie-pills"]', position: 'bottom' },
      { id: 'ie-form-datos', title: 'Datos del equipo', text: 'Categoría (con búsqueda y opción crear), nivel de liga (con búsqueda y crear), letra/nombre del equipo y botón de horario para configurar días y franjas de entrenamiento.', targetSelector: '[data-tutorial="ie-form-datos"]', position: 'left' },
      { id: 'ie-form-objetivos', title: 'Objetivos y opiniones', text: 'Área de texto para el objetivo del equipo esta temporada y la opinión general sobre el equipo.', targetSelector: '[data-tutorial="ie-form-objetivos"]', position: 'left' },
      { id: 'ie-form-actions', title: 'Guardar y eliminar', text: 'Guarda los cambios del formulario o elimina el equipo (con confirmación).', targetSelector: '[data-tutorial="ie-form-actions"]', position: 'top' },
      { id: 'ie-staff', title: 'Staff del equipo', text: 'Listado de entrenadores, fisioterapeutas y nutricionistas asignados. Botón "Invitar" para añadir por email. Desde cada tarjeta puedes eliminar si tienes permiso.', targetSelector: '[data-tutorial="ie-staff"]', position: 'left' },
      { id: 'ie-fin', title: 'Listo', text: 'Ya conoces la pantalla de información del equipo. Actualiza datos, horario y staff cuando lo necesites.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Estadísticas del equipo. */
  private getEstadisticasEquipoSteps(): TutorialStep[] {
    return [
      { id: 'ee-bienvenida', title: 'Estadísticas del equipo', text: 'Análisis estadístico del rendimiento del equipo: resumen (PJ, PTS, V, E, D, GF, GC, DG, últimos resultados), detalle de partidos y gráficas (resultados, puntos por partido, estadísticas por partido, goles por categoría y subcategoría).', position: 'bottom' },
      { id: 'ee-volver', title: 'Volver', text: 'Regresa al menú anterior.', targetSelector: '[data-tutorial="ee-volver"]', position: 'bottom' },
      { id: 'ee-filtros', title: 'Filtros y vistas', text: 'Tipo de partido: Liga, Amistoso o Torneo. Alterna entre "Ver tabla" (resumen + partidos) y "Ver gráficas" (todas las gráficas de análisis).', targetSelector: '[data-tutorial="ee-filtros"]', position: 'bottom' },
      { id: 'ee-tabla-resumen', title: 'Tabla resumen', text: 'Card con el resumen del equipo: partidos jugados, puntos, victorias, empates, derrotas, goles a favor, en contra, diferencia y últimos resultados (iconos V/E/D).', targetSelector: '[data-tutorial="ee-tabla-resumen"]', position: 'left' },
      { id: 'ee-tabla-partidos', title: 'Tabla de partidos', text: 'Listado de partidos con fecha, rival, resultado, GF, GC y estadísticas detalladas (disparos, faltas, corners, recuperaciones, pérdidas, tarjetas, llegadas, penaltis). Pulsa en un rival para abrir el detalle del post partido.', targetSelector: '[data-tutorial="ee-tabla-partidos"]', position: 'left' },
      { id: 'ee-graficas', title: 'Vista gráficas', text: 'Gráfica de resultados (pie), puntos por partido (línea), estadísticas por partido (selector de tipo de estadística), goles por categoría (dos barras) y goles por subcategoría (selector de categoría y barras).', targetSelector: '[data-tutorial="ee-graficas"]', position: 'left' },
      { id: 'ee-fin', title: 'Listo', text: 'Ya conoces las estadísticas del equipo. Cambia entre tabla y gráficas y filtra por tipo de partido.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Estadísticas de jugadores. */
  private getEstadisticasJugadoresSteps(): TutorialStep[] {
    return [
      { id: 'ej-bienvenida', title: 'Estadísticas de jugadores', text: 'Análisis estadístico del rendimiento individual: vista tabla (todos los jugadores con PJ, minutos, goles, asistencias, tarjetas, etc.) o vista gráficas (gráficas comparativas y tabla de goles por jugador).', position: 'bottom' },
      { id: 'ej-volver', title: 'Volver', text: 'Regresa al menú anterior.', targetSelector: '[data-tutorial="ej-volver"]', position: 'bottom' },
      { id: 'ej-view-toggle', title: 'Tabla o gráficas', text: 'Alterna entre "Ver tabla" (tabla de jugadores con búsqueda y paginación) y "Ver gráficas" (gráficas y tabla de goles).', targetSelector: '[data-tutorial="ej-view-toggle"]', position: 'bottom' },
      { id: 'ej-filtros', title: 'Tipo de partido', text: 'Filtra por Liga, Amistoso o Torneo. Los datos mostrados se actualizan según la pestaña activa.', targetSelector: '[data-tutorial="ej-filtros"]', position: 'bottom' },
      { id: 'ej-tabla', title: 'Tabla de jugadores', text: 'Card con búsqueda por nombre o posición, tabla con ID, nombre, posición, fecha nac., PJ, minutos totales, media minutos, goles, asistencias, G+A, tarjetas, etc. Paginación debajo.', targetSelector: '[data-tutorial="ej-tabla"]', position: 'left' },
      { id: 'ej-grafica-jugadores', title: 'Gráfica de jugadores', text: 'Selector de tipo de gráfica (minutos totales, goles, asistencias, partidos jugados, goles penalti, penaltis fallados, tarjetas) y gráfica de barras comparativa.', targetSelector: '[data-tutorial="ej-grafica-jugadores"]', position: 'left' },
      { id: 'ej-goles', title: 'Tabla de goles', text: 'Selector de jugador (o "Ver todos"), búsqueda por goleador/rival/categoría y tabla con gol de, asistencia de, rival, minuto, fecha, categoría, subcategoría y opción. Paginación debajo.', targetSelector: '[data-tutorial="ej-goles"]', position: 'left' },
      { id: 'ej-fin', title: 'Listo', text: 'Ya conoces las estadísticas de jugadores. Usa la tabla o las gráficas y filtra por tipo de partido.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Clasificación y resultados. */
  private getClasificacionResultadosSteps(): TutorialStep[] {
    return [
      { id: 'cr-bienvenida', title: 'Clasificación y resultados', text: 'Seguimiento de la liga y resultados del equipo. Si no hay URL configurada, el asistente te guía para introducir la URL de tu federación. Una vez cargados los datos verás la clasificación y los resultados por jornada.', position: 'bottom' },
      { id: 'cr-volver', title: 'Volver', text: 'Regresa al menú anterior.', targetSelector: '[data-tutorial="cr-volver"]', position: 'bottom' },
      { id: 'cr-toolbar', title: 'Clasificación y resultados', text: 'Alterna entre la pestaña "Clasificación" (tabla de equipos con posición, puntos, J, G, E, P, GF-GC, forma) y "Resultados" (tarjetas de partidos con marcador, fecha y botón Ver acta).', targetSelector: '[data-tutorial="cr-toolbar"]', position: 'bottom' },
      { id: 'cr-jornada', title: 'Jornada y actualizar', text: 'Selector de jornada (si la fuente lo permite) y botón para actualizar los datos desde la federación.', targetSelector: '[data-tutorial="cr-jornada"]', position: 'bottom' },
      { id: 'cr-tabla', title: 'Tabla de clasificación', text: 'Tabla con posición, equipo, puntos, partidos jugados, ganados, empatados, perdidos, goles y forma (últimos resultados).', targetSelector: '[data-tutorial="cr-tabla"]', position: 'left' },
      { id: 'cr-resultados', title: 'Resultados', text: 'Grid de partidos con equipos, marcador, fecha, campo y botón "Ver acta" para abrir el acta en una pestaña nueva.', targetSelector: '[data-tutorial="cr-resultados"]', position: 'left' },
      { id: 'cr-reconfig', title: 'Cambiar fuente', text: 'Campo para introducir una nueva URL de clasificación y botón "Actualizar URL" si quieres cambiar la fuente de datos.', targetSelector: '[data-tutorial="cr-reconfig"]', position: 'top' },
      { id: 'cr-fin', title: 'Listo', text: 'Ya conoces clasificación y resultados. Actualiza cuando necesites y consulta las actas desde cada partido.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Galería de partidos (partidos-entrevistas). */
  private getPartidosEntrevistasSteps(): TutorialStep[] {
    return [
      { id: 'pe-bienvenida', title: 'Galería de partidos', text: 'Galería de fotos y vídeos de los partidos del equipo. Selecciona un partido en el carrusel y explora fotos y vídeos del encuentro. Puedes subir nuevas imágenes o añadir por URL.', position: 'bottom' },
      { id: 'pe-volver', title: 'Volver', text: 'Regresa al menú anterior.', targetSelector: '[data-tutorial="pe-volver"]', position: 'bottom' },
      { id: 'pe-stats', title: 'Resumen', text: 'Píldoras con total de fotos, vídeos y partidos disponibles.', targetSelector: '[data-tutorial="pe-stats"]', position: 'bottom' },
      { id: 'pe-carousel', title: 'Selección de partido', text: 'Carrusel de partidos con letra (V/E/D), nombre del rival, resultado y número de fotos/vídeos. Selecciona uno para ver su galería.', targetSelector: '[data-tutorial="pe-carousel"]', position: 'left' },
      { id: 'pe-tabs', title: 'Fotos y vídeos', text: 'Pestañas para ver las fotos o los vídeos del partido seleccionado.', targetSelector: '[data-tutorial="pe-tabs"]', position: 'bottom' },
      { id: 'pe-upload', title: 'Nueva imagen / Añadir por URL', text: 'En Fotos: "Nueva imagen" para subir o arrastrar archivos, o "Añadir por URL". En Vídeos: "Añadir por URL" o "Subir desde dispositivo" (si el club tiene suscripción de vídeos).', targetSelector: '[data-tutorial="pe-upload"]', position: 'bottom' },
      { id: 'pe-grid', title: 'Galería', text: 'Grid de fotos o vídeos. Pulsa en una foto para ampliarla en lightbox. En cada elemento puedes eliminar si es tuyo.', targetSelector: '[data-tutorial="pe-grid"]', position: 'left' },
      { id: 'pe-fin', title: 'Listo', text: 'Ya conoces la galería de partidos. Elige partido, sube contenido y consulta fotos y vídeos.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Lesiones (equipo). */
  private getLesionesSteps(): TutorialStep[] {
    return [
      { id: 'les-bienvenida', title: 'Gestión de lesiones', text: 'Registro y seguimiento de lesiones del equipo: mapa corporal, línea temporal y estadísticas (Pro). Exporta informes PDF, imprime y configura notificaciones.', position: 'bottom' },
      { id: 'les-volver', title: 'Volver', text: 'Regresa al menú anterior.', targetSelector: '[data-tutorial="les-volver"]', position: 'bottom' },
      { id: 'les-mode', title: 'Modo Base / Pro', text: 'Alterna entre modo Base y Pro. En Pro se desbloquean estadísticas, notas médicas, fase RTP y gestión de Return to Play.', targetSelector: '[data-tutorial="les-mode"]', position: 'bottom' },
      { id: 'les-actions', title: 'Acciones del encabezado', text: 'Descargar informe PDF, imprimir/exportar y configurar notificaciones (cuándo enviar avisos al crear, cambiar estado o avanzar RTP).', targetSelector: '[data-tutorial="les-actions"]', position: 'bottom' },
      { id: 'les-tabs', title: 'Vistas', text: 'Mapa corporal (frontal y posterior con zonas clicables), Línea temporal (cronología de lesiones) y Estadísticas (Pro: KPIs, tendencia, gravedad, zonas, tipos).', targetSelector: '[data-tutorial="les-tabs"]', position: 'bottom' },
      { id: 'les-stats-cards', title: 'Tarjetas de resumen', text: 'Total de lesiones, de baja, readaptando y con alta médica.', targetSelector: '[data-tutorial="les-stats-cards"]', position: 'bottom' },
      { id: 'les-bodymap', title: 'Mapa corporal', text: 'Vista frontal y posterior. Clic en una zona para registrar una lesión o ver el detalle. Leyenda de gravedad y estado. Desde el panel derecho: formulario nueva/editar, detalle (documentos, notas de evolución, RTP), historial con filtros por estado.', targetSelector: '[data-tutorial="les-bodymap"]', position: 'left' },
      { id: 'les-panel', title: 'Panel lateral', text: 'Formulario de nueva/editar lesión (zona, tipo, gravedad, fechas, mecanismo, descripción, tratamiento, estado, RTP). Detalle con documentos médicos y notas de evolución. Lista de historial con filtros y botón Nueva.', targetSelector: '[data-tutorial="les-panel"]', position: 'left' },
      { id: 'les-fin', title: 'Listo', text: 'Ya conoces la gestión de lesiones. Registra lesiones en el mapa, consulta el historial y exporta informes cuando lo necesites.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Asistente IA Coach. */
  private getAsistenteIaCoachSteps(): TutorialStep[] {
    return [
      { id: 'aic-bienvenida', title: 'Asistente IA Coach', text: 'Chat con el asistente de inteligencia artificial para entrenadores. Haz preguntas, pide planes de entrenamiento o que ejecute acciones. Usa créditos por cada uso; el historial de conversaciones se guarda en el panel lateral.', position: 'bottom' },
      { id: 'aic-volver', title: 'Volver', text: 'Regresa al menú anterior.', targetSelector: '[data-tutorial="aic-volver"]', position: 'bottom' },
      { id: 'aic-sidebar', title: 'Historial de conversaciones', text: 'Panel lateral con lista de conversaciones anteriores. Botón "+" para nueva conversación. Pulsa en una para cargarla; desde cada una puedes eliminarla.', targetSelector: '[data-tutorial="aic-sidebar"]', position: 'right' },
      { id: 'aic-toggle', title: 'Mostrar u ocultar historial', text: 'Abre o cierra el panel del historial de conversaciones.', targetSelector: '[data-tutorial="aic-toggle"]', position: 'bottom' },
      { id: 'aic-header', title: 'Cabecera del chat', text: 'Título del asistente, estado en línea, créditos disponibles (pulsable para ver modal de créditos) y botón nueva conversación.', targetSelector: '[data-tutorial="aic-header"]', position: 'bottom' },
      { id: 'aic-body', title: 'Mensajes', text: 'Área donde se muestran los mensajes del usuario y del asistente. El asistente puede mostrar vistas previas de acciones para confirmar o cancelar.', targetSelector: '[data-tutorial="aic-body"]', position: 'left' },
      { id: 'aic-suggestions', title: 'Sugerencias', text: 'Chips de sugerencias para enviar preguntas rápidas al asistente.', targetSelector: '[data-tutorial="aic-suggestions"]', position: 'top' },
      { id: 'aic-input', title: 'Escribir y enviar', text: 'Área de texto para escribir tu mensaje. Botón de micrófono (reconocimiento de voz si está disponible), cancelar (si hay petición en curso) y enviar.', targetSelector: '[data-tutorial="aic-input"]', position: 'top' },
      { id: 'aic-fin', title: 'Listo', text: 'Ya conoces el asistente IA Coach. Escribe o usa la voz, revisa el historial y gestiona tus créditos.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Historial de debrief. */
  private getDebriefHistorySteps(): TutorialStep[] {
    return [
      { id: 'dh-bienvenida', title: 'Historial de debrief', text: 'Listado de sesiones de debrief (entrenamientos y partidos). Filtra por tipo y abre cualquier elemento completado para ver el informe.', position: 'bottom' },
      { id: 'dh-volver', title: 'Volver', text: 'Regresa al menú del entrenador.', targetSelector: '[data-tutorial="dh-volver"]', position: 'bottom' },
      { id: 'dh-filters', title: 'Filtros', text: 'Todos, Entrenamientos o Partidos. Cada botón muestra el total de elementos y filtra la lista.', targetSelector: '[data-tutorial="dh-filters"]', position: 'bottom' },
      { id: 'dh-list', title: 'Lista de debriefs', text: 'Tarjetas con fecha, tipo (entrenamiento o vs rival), equipo, resumen y estado. Pulsa en un elemento completado para abrir el informe.', targetSelector: '[data-tutorial="dh-list"]', position: 'left' },
      { id: 'dh-fin', title: 'Listo', text: 'Ya conoces el historial de debrief. Filtra y abre los informes que necesites.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Perfil entrenador. */
  private getPerfilEntrenadorSteps(): TutorialStep[] {
    return [
      { id: 'pe-bienvenida', title: 'Perfil del entrenador', text: 'Consulta y edita tus datos personales, documento de identidad, certificados (delitos sexuales, antecedentes penales, seguro, primeros auxilios) y documentos que requiera cada club. Si eres entrenador independiente verás también la tarjeta de suscripción.', position: 'bottom' },
      { id: 'pe-volver', title: 'Volver', text: 'Regresa al menú anterior.', targetSelector: '[data-tutorial="pe-volver"]', position: 'bottom' },
      { id: 'pe-suscripcion', title: 'Mi suscripción', text: 'Tarjeta con estado de la suscripción (Activa, Prueba, Vencida, Sin suscripción), fecha de vencimiento y botón Ver planes o Gestionar. Solo visible para entrenador independiente (sin club).', targetSelector: '[data-tutorial="pe-suscripcion"]', position: 'bottom' },
      { id: 'pe-datos', title: 'Datos personales', text: 'Foto de perfil (clic para cambiar), nombre, botones Editar y Subir documento de identidad. Grid con email, teléfono, fecha nacimiento, documento de identidad, dirección, nacionalidad, licencia federativa, titulación deportiva y contacto de emergencia.', targetSelector: '[data-tutorial="pe-datos"]', position: 'left' },
      { id: 'pe-edicion', title: 'Editar perfil', text: 'En modo edición puedes cambiar nombre, apellidos, email, teléfono, fecha nacimiento, tipo y número de documento, dirección, nacionalidad, licencia, titulación y contacto de emergencia. Guardar o Cancelar.', targetSelector: '[data-tutorial="pe-edicion"]', position: 'left' },
      { id: 'pe-campos-club', title: 'Campos personalizados por club', text: 'Secciones por club con formularios dinámicos que cada club define para sus entrenadores.', targetSelector: '[data-tutorial="pe-campos-club"]', position: 'left' },
      { id: 'pe-doc-identidad', title: 'Documento de identidad', text: 'Imágenes del anverso y reverso del DNI o documento. Subir, cambiar o eliminar desde el botón o desde cada imagen.', targetSelector: '[data-tutorial="pe-doc-identidad"]', position: 'left' },
      { id: 'pe-certificados', title: 'Certificados', text: 'Certificado de delitos sexuales, antecedentes penales, seguro de responsabilidad civil y formación en primeros auxilios. En cada uno: subir o cambiar, ver archivo y eliminar.', targetSelector: '[data-tutorial="pe-certificados"]', position: 'left' },
      { id: 'pe-docs-club', title: 'Documentos requeridos por el club', text: 'Por cada club, lista de documentos: los que sube el club (descargar) o los que debes subir tú (subir/cambiar) o formularios personalizados (rellenar).', targetSelector: '[data-tutorial="pe-docs-club"]', position: 'left' },
      { id: 'pe-fin', title: 'Listo', text: 'Ya conoces tu perfil de entrenador. Mantén tus datos y certificados al día para cada club.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Documentos entrenador. */
  private getDocumentosEntrenadorSteps(): TutorialStep[] {
    return [
      { id: 'de-bienvenida', title: 'Documentos del entrenador', text: 'Listado de documentos que el club pone a tu disposición o que debes subir/rellenar. Cada tarjeta indica el tipo (descargar, subir o formulario) y el estado (pendiente o completado).', position: 'bottom' },
      { id: 'de-volver', title: 'Volver', text: 'Regresa al menú anterior.', targetSelector: '[data-tutorial="de-volver"]', position: 'bottom' },
      { id: 'de-grid', title: 'Lista de documentos', text: 'Tarjetas con nombre del documento, descripción, estado (Pendiente/Completado) y acción: Descargar (documentos del club), Subir (documentos que debes entregar) o Rellenar (formularios personalizados).', targetSelector: '[data-tutorial="de-grid"]', position: 'left' },
      { id: 'de-fin', title: 'Listo', text: 'Ya conoces la pantalla de documentos. Descarga lo que el club comparte y sube o rellena lo que te pidan.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Cuotas (jugador/padre). */
  private getCuotasSteps(): TutorialStep[] {
    return [
      { id: 'cq-bienvenida', title: 'Pagar cuotas', text: 'Consulta y paga las cuotas del club: estado pagado/pendiente, Sphaira Pay para vincular tarjeta y cobros automáticos, lista obligatoria y opcional, filtros y pago por transferencia.', position: 'bottom' },
      { id: 'cq-volver', title: 'Volver', text: 'Regresa al menú anterior.', targetSelector: '[data-tutorial="cq-volver"]', position: 'bottom' },
      { id: 'cq-estado', title: 'Estado y Sphaira Pay', text: 'Tarjetas de total pagado y pendiente. Acceso rápido a Sphaira Pay: vincular tarjeta, ver la asociada o gestionar cobros automáticos.', targetSelector: '[data-tutorial="cq-estado"]', position: 'bottom' },
      { id: 'cq-selection-bar', title: 'Barra de selección', text: 'Al marcar cuotas puntuales aparece la barra con total y botones Limpiar y Pagar para abrir el modal de pago.', targetSelector: '[data-tutorial="cq-selection-bar"]', position: 'top' },
      { id: 'cq-obligatorias', title: 'Cuotas obligatorias', text: 'Panel con filtros (concepto, tipo de pago, estado, vencimiento, fecha pago) y lista: concepto, tipo (Puntual/Sphaira Pay/Manual), importe, pagado, vencimiento, fecha pago y acciones (vincular tarjeta, cancelar).', targetSelector: '[data-tutorial="cq-obligatorias"]', position: 'left' },
      { id: 'cq-opcionales', title: 'Cuotas opcionales', text: 'Misma estructura: filtros y lista de cuotas opcionales con selección y pago múltiple si está disponible.', targetSelector: '[data-tutorial="cq-opcionales"]', position: 'left' },
      { id: 'cq-transfer', title: 'Pago por transferencia', text: 'Datos bancarios del club (IBAN, concepto, contacto, Bizum) para pagar por transferencia. Notifica al club cuando hayas realizado el pago.', targetSelector: '[data-tutorial="cq-transfer"]', position: 'left' },
      { id: 'cq-fin', title: 'Listo', text: 'Ya conoces la pantalla de cuotas. Vincula tarjeta si usas Sphaira Pay, selecciona y paga o usa transferencia según indique el club.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Documentos jugador. */
  private getDocumentosJugadorSteps(): TutorialStep[] {
    return [
      { id: 'dj-bienvenida', title: 'Documentación', text: 'Documentos que tu club te solicita: descargar los que comparte el club, subir los que te piden o rellenar formularios personalizados. Cada tarjeta muestra el estado (pendiente/completado).', position: 'bottom' },
      { id: 'dj-volver', title: 'Volver', text: 'Regresa al menú anterior.', targetSelector: '[data-tutorial="dj-volver"]', position: 'bottom' },
      { id: 'dj-busqueda', title: 'Buscar documento', text: 'Campo de búsqueda para filtrar la lista por nombre.', targetSelector: '[data-tutorial="dj-busqueda"]', position: 'bottom' },
      { id: 'dj-grid', title: 'Lista de documentos', text: 'Tarjetas con nombre, descripción, estado (Pendiente descargar/Descargado, Pendiente subir/Subido, Pendiente rellenar/Completado) y botón Descargar, Subir documento o Rellenar según el tipo.', targetSelector: '[data-tutorial="dj-grid"]', position: 'left' },
      { id: 'dj-fin', title: 'Listo', text: 'Ya conoces la documentación. Descarga, sube o rellena según lo que pida el club.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Perfil de jugador (scouting-player). */
  private getScoutingPlayerSteps(): TutorialStep[] {
    return [
      { id: 'sp-bienvenida', title: 'Perfil de jugador', text: 'Vista del perfil deportivo: foto, datos, radar de habilidades, estadísticas de partidos, gráficas y asistencia a entrenamientos.', position: 'bottom' },
      { id: 'sp-volver', title: 'Volver', text: 'Regresa al menú anterior.', targetSelector: '[data-tutorial="sp-volver"]', position: 'bottom' },
      { id: 'sp-hero', title: 'Perfil y habilidades', text: 'Avatar, nombre, píldoras (posición, pierna, altura). Panel de perfil de habilidades con radar si hay datos.', targetSelector: '[data-tutorial="sp-hero"]', position: 'left' },
      { id: 'sp-datos', title: 'Datos deportivos', text: 'Posición, posición 2, pierna natural, altura y peso.', targetSelector: '[data-tutorial="sp-datos"]', position: 'left' },
      { id: 'sp-stats', title: 'Estadísticas de partidos', text: 'Partidos jugados, titularidades, minutos, goles, tarjetas amarillas y rojas.', targetSelector: '[data-tutorial="sp-stats"]', position: 'left' },
      { id: 'sp-graficas', title: 'Gráficas', text: 'Pestañas Partidos y Asistencia para ver gráficas de estadísticas o de asistencia por mes.', targetSelector: '[data-tutorial="sp-graficas"]', position: 'left' },
      { id: 'sp-asistencia', title: 'Asistencia a entrenamientos', text: 'Tabla con fecha, asistencia y retraso de cada sesión.', targetSelector: '[data-tutorial="sp-asistencia"]', position: 'left' },
      { id: 'sp-fin', title: 'Listo', text: 'Ya conoces el perfil de jugador. Revisa datos, estadísticas y asistencia.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Patrocinadores (vista usuario/jugador). */
  private getPatrocinadoresUsuarioSteps(): TutorialStep[] {
    return [
      { id: 'patrou-bienvenida', title: 'Patrocinadores', text: 'Patrocinadores del club: carrusel de logos y tarjetas con información, enlaces y beneficios. Vista de consulta para jugadores y familias.', position: 'bottom' },
      { id: 'patrou-volver', title: 'Volver', text: 'Regresa al menú anterior.', targetSelector: '[data-tutorial="patro-volver"]', position: 'bottom' },
      { id: 'patrou-carrusel', title: 'Carrusel de logos', text: 'Carrusel con los logos de los patrocinadores. Pulsa en uno para ver su detalle.', targetSelector: '[data-tutorial="patro-carrusel"]', position: 'bottom' },
      { id: 'patrou-grid', title: 'Tarjetas de patrocinadores', text: 'Cada tarjeta muestra logo, nombre, descripción, enlaces (web, email, teléfono), beneficios y botón Ver para abrir el detalle.', targetSelector: '[data-tutorial="patro-grid"]', position: 'left' },
      { id: 'patrou-fin', title: 'Listo', text: 'Ya conoces los patrocinadores del club. Consulta sus datos y beneficios cuando lo necesites.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Ropa jugador (mis tallas). */
  private getRopaJugadorSteps(): TutorialStep[] {
    return [
      { id: 'rj-bienvenida', title: 'Mis tallas de ropa', text: 'Catálogo de prendas del equipo. Selecciona tu talla para cada prenda; se guarda automáticamente. El club usa estas preferencias para pedidos.', position: 'bottom' },
      { id: 'rj-volver', title: 'Volver', text: 'Regresa al menú anterior.', targetSelector: '[data-tutorial="rj-volver"]', position: 'bottom' },
      { id: 'rj-grid', title: 'Catálogo de prendas', text: 'Cada tarjeta muestra la imagen, nombre, descripción, selector de talla (— Sin seleccionar — o tallas disponibles) y estado (guardando/completado). Elige la talla y se guarda al instante.', targetSelector: '[data-tutorial="rj-grid"]', position: 'left' },
      { id: 'rj-fin', title: 'Listo', text: 'Ya conoces mis tallas de ropa. Mantén tus preferencias actualizadas para cada prenda del equipo.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Perfil de jugador para scouting (edición). */
  private getScoutingPlayerProfileSteps(): TutorialStep[] {
    return [
      { id: 'spp-bienvenida', title: 'Mi perfil para clubes', text: 'Completa y edita tu perfil para que los clubes puedan encontrarte: foto, visibilidad pública, identidad, posición, situación actual, carrera deportiva, CV, sobre mí y vídeos.', position: 'bottom' },
      { id: 'spp-hero', title: 'Foto y visibilidad', text: 'Avatar (clic para cambiar foto), nombre completo y toggle para hacer tu perfil visible o privado. Si está visible, los clubes pueden ver tu perfil en Sphaira.', targetSelector: '[data-tutorial="spp-hero"]', position: 'left' },
      { id: 'spp-identidad', title: 'Identidad', text: 'Fecha de nacimiento, nacionalidad, residencia, altura, peso, pierna natural, email y teléfono de contacto.', targetSelector: '[data-tutorial="spp-identidad"]', position: 'left' },
      { id: 'spp-posiciones', title: 'En el campo', text: 'Selecciona una o varias posiciones. Los clubes filtrarán por posición.', targetSelector: '[data-tutorial="spp-posiciones"]', position: 'left' },
      { id: 'spp-situacion', title: 'Situación actual', text: 'Equipo actual, liga/competición y disponibilidad (libre, con equipo, etc.).', targetSelector: '[data-tutorial="spp-situacion"]', position: 'left' },
      { id: 'spp-carrera', title: 'Carrera deportiva', text: 'Goles, asistencias, clubes anteriores, torneos, premios y convocatorias a selecciones.', targetSelector: '[data-tutorial="spp-carrera"]', position: 'left' },
      { id: 'spp-cv', title: 'CV futbolístico', text: 'Sube tu CV en PDF o Word. Los clubes podrán descargarlo desde tu perfil.', targetSelector: '[data-tutorial="spp-cv"]', position: 'left' },
      { id: 'spp-sobremi', title: 'Sobre mí', text: 'Fortalezas, áreas de mejora y descripción libre para que los clubes te conozcan.', targetSelector: '[data-tutorial="spp-sobremi"]', position: 'left' },
      { id: 'spp-videos', title: 'Vídeos y redes', text: 'Añade enlaces a vídeos (YouTube, etc.) o sube vídeos si tienes plan. Los clubes los verán en tu perfil.', targetSelector: '[data-tutorial="spp-videos"]', position: 'left' },
      { id: 'spp-guardar', title: 'Guardar', text: 'Pulsa Guardar perfil para aplicar todos los cambios.', targetSelector: '[data-tutorial="spp-guardar"]', position: 'top' },
      { id: 'spp-fin', title: 'Listo', text: 'Ya conoces tu perfil para clubes. Mantén tus datos al día para aumentar tus opciones.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial ERP (dashboard financiero club). */
  private getErpSteps(): TutorialStep[] {
    return [
      { id: 'erp-bienvenida', title: 'ERP - Dashboard financiero', text: 'Módulo de gestión financiera del club: ingresos, gastos, resultado, facturas, plan contable, cobros y pagos, informes y configuración. Si el ERP no está inicializado, usa el botón para configurarlo.', position: 'bottom' },
      { id: 'erp-init', title: 'Inicialización', text: 'Si el módulo no está configurado, aquí puedes inicializarlo. Se creará el plan contable, centros de coste y el ejercicio fiscal.', targetSelector: '[data-tutorial="erp-init"]', position: 'bottom' },
      { id: 'erp-daterange', title: 'Rango de fechas', text: 'Selector desde/hasta para filtrar los datos. El botón de engranaje lleva a la configuración de ejercicios fiscales.', targetSelector: '[data-tutorial="erp-daterange"]', position: 'bottom' },
      { id: 'erp-kpis', title: 'Indicadores', text: 'Tarjetas de ingresos, gastos, resultado neto, facturas pendientes y facturas vencidas.', targetSelector: '[data-tutorial="erp-kpis"]', position: 'left' },
      { id: 'erp-income', title: 'Ingresos por centro de coste', text: 'Gráfica de barras y detalle por centro de coste. Puedes expandir para ver la tabla.', targetSelector: '[data-tutorial="erp-income"]', position: 'left' },
      { id: 'erp-quicklinks', title: 'Accesos rápidos', text: 'Enlaces a facturas emitidas, facturas recibidas, cobros y pagos, plan contable, informes, presupuestos, clientes, proveedores y configuración.', targetSelector: '[data-tutorial="erp-quicklinks"]', position: 'left' },
      { id: 'erp-fin', title: 'Listo', text: 'Ya conoces el dashboard ERP. Usa los accesos rápidos para gestionar la contabilidad del club.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Menú fisio. */
  private getMenuFisioSteps(): TutorialStep[] {
    return [
      { id: 'mf-bienvenida', title: 'Menú del fisio', text: 'Acceso rápido a Lesiones, Jugadores, Calendario, Estadísticas jugadores y equipo, Clasificación, Documentos, Notificaciones, Mi perfil y Asistente de IA.', position: 'bottom' },
      { id: 'mf-volver', title: 'Volver', text: 'Regresa al listado de equipos.', targetSelector: '[data-tutorial="mf-volver"]', position: 'bottom' },
      { id: 'mf-grid', title: 'Opciones', text: 'Tarjetas para Lesiones, Jugadores, Calendario, Estadísticas jugadores, Estadísticas equipo, Clasificación y resultado, Documentos, Notificaciones, Mi perfil y Asistente de IA. Pulsa en una para entrar.', targetSelector: '[data-tutorial="mf-grid"]', position: 'left' },
      { id: 'mf-fin', title: 'Listo', text: 'Ya conoces el menú del fisio. Elige la opción que necesites.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Listado de entrenadores. */
  private getEntrenadoresSteps(): TutorialStep[] {
    return [
      { id: 'ent-bienvenida', title: 'Listado de entrenadores', text: 'Lista de entrenadores del equipo. Desde aquí puedes ver la información de cada uno y editar sus datos.', position: 'bottom' },
      { id: 'ent-volver', title: 'Volver', text: 'Regresa a la pantalla anterior.', targetSelector: '[data-tutorial="ent-volver"]', position: 'bottom' },
      { id: 'ent-list', title: 'Tarjetas de entrenadores', text: 'Cada tarjeta muestra foto, nombre, posición, fecha de nacimiento y botones Ver info y Editar.', targetSelector: '[data-tutorial="ent-list"]', position: 'left' },
      { id: 'ent-fin', title: 'Listo', text: 'Ya conoces el listado de entrenadores. Gestiona la información del cuerpo técnico desde aquí.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Asistencia (equipo). */
  private getAsistenciaSteps(): TutorialStep[] {
    return [
      { id: 'asis-bienvenida', title: 'Asistencia y multas', text: 'Consulta la asistencia de los jugadores por fecha y las multas asociadas. Pestañas Asistencia y Multas.', position: 'bottom' },
      { id: 'asis-volver', title: 'Volver', text: 'Regresa a la información del equipo.', targetSelector: '[data-tutorial="asis-volver"]', position: 'bottom' },
      { id: 'asis-tabs', title: 'Pestañas', text: 'Asistencia: tabla con fechas y asistencia por jugador. Multas: importes y estado de pago por fecha y jugador.', targetSelector: '[data-tutorial="asis-tabs"]', position: 'bottom' },
      { id: 'asis-content', title: 'Tabla', text: 'En Asistencia verás el total por jugador y el detalle por fecha. En Multas podrás marcar como pagada o no.', targetSelector: '[data-tutorial="asis-content"]', position: 'left' },
      { id: 'asis-fin', title: 'Listo', text: 'Ya conoces la pantalla de asistencia y multas.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Plantillas de formularios debrief. */
  private getDebriefTemplatesSteps(): TutorialStep[] {
    return [
      { id: 'dbtpl-bienvenida', title: 'Formularios personalizados debrief', text: 'Crea y gestiona plantillas de formularios para los análisis pre y post de partidos y entrenamientos.', position: 'bottom' },
      { id: 'dbtpl-volver', title: 'Volver', text: 'Regresa al menú anterior.', targetSelector: '[data-tutorial="dbtpl-volver"]', position: 'bottom' },
      { id: 'dbtpl-tabs', title: 'Tipo de formulario', text: 'Pestañas para elegir el tipo: entrenamiento o partido. Cada tipo tiene sus propias plantillas.', targetSelector: '[data-tutorial="dbtpl-tabs"]', position: 'bottom' },
      { id: 'dbtpl-list', title: 'Plantillas', text: 'Lista de formularios creados. En cada uno: Editar y Eliminar. Botón para crear nuevo formulario.', targetSelector: '[data-tutorial="dbtpl-list"]', position: 'left' },
      { id: 'dbtpl-fin', title: 'Listo', text: 'Ya conoces la gestión de plantillas. Crea formularios a medida para tus debriefs.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Debrief entrenamiento (sesión). */
  private getDebriefTrainingSteps(): TutorialStep[] {
    return [
      { id: 'dbt-bienvenida', title: 'Debrief de entrenamiento', text: 'Completa el análisis post-entrenamiento respondiendo a las preguntas. La barra de progreso y los indicadores muestran tu avance.', position: 'bottom' },
      { id: 'dbt-volver', title: 'Volver', text: 'Regresa sin guardar o después de completar.', targetSelector: '[data-tutorial="dbt-volver"]', position: 'bottom' },
      { id: 'dbt-progress', title: 'Progreso', text: 'Barra y puntos por pregunta. Pulsa en un punto para ir a esa pregunta. Las respondidas se marcan.', targetSelector: '[data-tutorial="dbt-progress"]', position: 'bottom' },
      { id: 'dbt-questions', title: 'Preguntas', text: 'Responde cada pregunta o omítela. El botón de engranaje permite personalizar las preguntas del formulario.', targetSelector: '[data-tutorial="dbt-questions"]', position: 'left' },
      { id: 'dbt-fin', title: 'Listo', text: 'Completa todas las preguntas y guarda para generar el informe de debrief.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Debrief partido (sesión). */
  private getDebriefMatchSteps(): TutorialStep[] {
    return [
      { id: 'dbm-bienvenida', title: 'Debrief de partido', text: 'Completa el análisis post-partido respondiendo a las preguntas. Similar al debrief de entrenamiento, adaptado al partido.', position: 'bottom' },
      { id: 'dbm-volver', title: 'Volver', text: 'Regresa sin guardar o después de completar.', targetSelector: '[data-tutorial="dbm-volver"]', position: 'bottom' },
      { id: 'dbm-progress', title: 'Progreso', text: 'Barra y puntos por pregunta. Navega entre preguntas y completa el formulario.', targetSelector: '[data-tutorial="dbm-progress"]', position: 'bottom' },
      { id: 'dbm-questions', title: 'Preguntas', text: 'Responde cada pregunta del análisis del partido. Puedes personalizar las preguntas desde el engranaje.', targetSelector: '[data-tutorial="dbm-questions"]', position: 'left' },
      { id: 'dbm-fin', title: 'Listo', text: 'Completa el debrief y guarda para generar el informe.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Contabilidad (club). */
  private getContabilidadSteps(): TutorialStep[] {
    return [
      { id: 'cont-bienvenida', title: 'Contabilidad', text: 'Resumen de cuotas del club: total cuota, cuota ropa, pagado y pendiente. Pestañas: Inicio, Abonados, Stripe y Configuración. Tabla con búsqueda, paginación y exportar a Excel.', position: 'bottom' },
      { id: 'cont-tabs', title: 'Pestañas', text: 'Inicio (resumen y tabla), Abonados, Stripe (pasarela de pago) y Configuración.', targetSelector: '[data-tutorial="cont-tabs"]', position: 'bottom' },
      { id: 'cont-totales', title: 'Totales', text: 'Cuota total del club, cuota ropa (si aplica), total pagado y restante pendiente.', targetSelector: '[data-tutorial="cont-totales"]', position: 'bottom' },
      { id: 'cont-toolbar', title: 'Exportar y controles', text: 'Botón Descargar Excel. Selector de registros por página y búsqueda para filtrar la tabla.', targetSelector: '[data-tutorial="cont-toolbar"]', position: 'bottom' },
      { id: 'cont-tabla', title: 'Tabla', text: 'Listado de abonados/jugadores con nombre, cuota, pagado, estado, etc. Ordenable por columnas.', targetSelector: '[data-tutorial="cont-tabla"]', position: 'left' },
      { id: 'cont-fin', title: 'Listo', text: 'Ya conoces la contabilidad del club. Exporta y filtra cuando lo necesites.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Historial de pagos club. */
  private getHistorialPagosClubSteps(): TutorialStep[] {
    return [
      { id: 'hpc-bienvenida', title: 'Historial de pagos', text: 'Listado de cobros y pagos del club. Filtra por nombre y exporta a Excel.', position: 'bottom' },
      { id: 'hpc-volver', title: 'Volver', text: 'Regresa al menú anterior.', targetSelector: '[data-tutorial="hpc-volver"]', position: 'bottom' },
      { id: 'hpc-toolbar', title: 'Buscar y exportar', text: 'Campo de búsqueda para filtrar y botón Exportar a Excel.', targetSelector: '[data-tutorial="hpc-toolbar"]', position: 'bottom' },
      { id: 'hpc-tabla', title: 'Tabla de pagos', text: 'Columnas: nombre, descripción, título, importe, método, tipo y fecha. Clic en cabecera para ordenar.', targetSelector: '[data-tutorial="hpc-tabla"]', position: 'left' },
      { id: 'hpc-fin', title: 'Listo', text: 'Ya conoces el historial de pagos. Filtra y exporta cuando lo necesites.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Abonados (club). */
  private getAbonadosSteps(): TutorialStep[] {
    return [
      { id: 'abo-bienvenida', title: 'Abonados', text: 'Gestión de abonados del club: crear, listado con búsqueda y paginación, exportar a Excel.', position: 'bottom' },
      { id: 'abo-volver', title: 'Volver', text: 'Regresa al menú anterior.', targetSelector: '[data-tutorial="abo-volver"]', position: 'bottom' },
      { id: 'abo-actions', title: 'Crear y exportar', text: 'Botón Crear abonado y Descargar Excel.', targetSelector: '[data-tutorial="abo-actions"]', position: 'bottom' },
      { id: 'abo-controls', title: 'Controles de tabla', text: 'Registros por página y búsqueda para filtrar.', targetSelector: '[data-tutorial="abo-controls"]', position: 'bottom' },
      { id: 'abo-tabla', title: 'Tabla de abonados', text: 'Imagen, nombre, apellidos, email, teléfono, estado, cuota, pagado, etc. Ordenable por columnas.', targetSelector: '[data-tutorial="abo-tabla"]', position: 'left' },
      { id: 'abo-fin', title: 'Listo', text: 'Ya conoces la gestión de abonados.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Suscripción club (planes y estado). */
  private getSuscripcionClubSteps(): TutorialStep[] {
    return [
      { id: 'suc-bienvenida', title: 'Suscripción del club', text: 'Consulta tu plan activo o elige un plan (Familia, Club, Gratuito). Los wizards te guían para contratar o activar el plan gratuito.', position: 'bottom' },
      { id: 'suc-volver', title: 'Volver', text: 'Regresa al dashboard.', targetSelector: '[data-tutorial="suc-volver"]', position: 'bottom' },
      { id: 'suc-activa', title: 'Plan activo', text: 'Si tienes plan de pago: tipo de plan, estado, fecha inicio, período, jugadores (plan club). Qué incluye tu plan.', targetSelector: '[data-tutorial="suc-activa"]', position: 'left' },
      { id: 'suc-planes', title: 'Selección de planes', text: 'Tarjetas de planes Familia, Club y Gratuito con precio y botón para contratar o activar.', targetSelector: '[data-tutorial="suc-planes"]', position: 'left' },
      { id: 'suc-fin', title: 'Listo', text: 'Ya conoces la suscripción del club. Elige o cambia de plan cuando lo necesites.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Wizard suscripción club (familia/club/gratuito). */
  private getSuscripcionClubWizardSteps(): TutorialStep[] {
    return [
      { id: 'scw-bienvenida', title: 'Asistente de suscripción', text: 'El asistente te guía paso a paso para configurar el plan elegido. Completa cada paso y avanza hasta finalizar.', position: 'bottom' },
      { id: 'scw-volver', title: 'Volver', text: 'Regresa sin completar el asistente.', targetSelector: '[data-tutorial="scw-volver"]', position: 'bottom' },
      { id: 'scw-stepper', title: 'Pasos', text: 'Indicador de pasos del asistente. Pulsa en un paso completado para volver a él.', targetSelector: '[data-tutorial="scw-stepper"]', position: 'bottom' },
      { id: 'scw-content', title: 'Contenido del paso', text: 'Formulario o opciones del paso actual. Rellena y pulsa Siguiente o Finalizar.', targetSelector: '[data-tutorial="scw-content"]', position: 'left' },
      { id: 'scw-fin', title: 'Listo', text: 'Completa todos los pasos para activar tu plan.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Sugerencias club. */
  private getSugerenciasClubSteps(): TutorialStep[] {
    return [
      { id: 'sug-bienvenida', title: 'Sugerencias', text: 'Envía ideas al equipo de Sphaira y sigue el estado de tus sugerencias. Las mejores se convierten en funcionalidades.', position: 'bottom' },
      { id: 'sug-volver', title: 'Volver', text: 'Regresa al menú anterior.', targetSelector: '[data-tutorial="sug-volver"]', position: 'bottom' },
      { id: 'sug-hero', title: 'Nueva sugerencia', text: 'Banner con descripción y botón Nueva sugerencia para abrir el formulario.', targetSelector: '[data-tutorial="sug-hero"]', position: 'bottom' },
      { id: 'sug-form', title: 'Formulario', text: 'Categoría, título y descripción. Envía cuando esté completo.', targetSelector: '[data-tutorial="sug-form"]', position: 'left' },
      { id: 'sug-list', title: 'Mis sugerencias', text: 'Listado de sugerencias enviadas con estado (pendiente, en revisión, etc.).', targetSelector: '[data-tutorial="sug-list"]', position: 'left' },
      { id: 'sug-fin', title: 'Listo', text: 'Ya conoces las sugerencias. ¡Tu opinión construye Sphaira!', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Listado de clubes. */
  private getListadoClubesSteps(): TutorialStep[] {
    return [
      { id: 'lc-bienvenida', title: 'Listado de clubes', text: 'Vista de clubes (federación/asociación): filtro por nombre, tabla con equipos, entrenadores, jugadores, padres y acción Ver equipos.', position: 'bottom' },
      { id: 'lc-volver', title: 'Volver', text: 'Regresa al menú anterior.', targetSelector: '[data-tutorial="lc-volver"]', position: 'bottom' },
      { id: 'lc-filtro', title: 'Filtrar', text: 'Campo para filtrar por nombre del club.', targetSelector: '[data-tutorial="lc-filtro"]', position: 'bottom' },
      { id: 'lc-tabla', title: 'Tabla', text: 'Columnas: nº, nombre, equipos, entrenadores, jugadores, padres, acciones (Ver equipos). Clic en cabecera para ordenar.', targetSelector: '[data-tutorial="lc-tabla"]', position: 'left' },
      { id: 'lc-fin', title: 'Listo', text: 'Ya conoces el listado de clubes.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Suscripción coach. */
  private getSuscripcionCoachSteps(): TutorialStep[] {
    return [
      { id: 'sco-bienvenida', title: 'Suscripción Sphaira Coach', text: 'Elige el plan que se adapta a ti: gestión de equipo, asistente IA, estadísticas, lesiones, calendario e informes PDF.', position: 'bottom' },
      { id: 'sco-hero', title: 'Planes y características', text: 'Resumen de lo que incluye Sphaira Coach y tarjetas de planes con precio y botón Empezar.', targetSelector: '[data-tutorial="sco-hero"]', position: 'left' },
      { id: 'sco-planes', title: 'Seleccionar plan', text: 'Cada tarjeta muestra el plan, precio y botón para contratar. El más popular está destacado.', targetSelector: '[data-tutorial="sco-planes"]', position: 'left' },
      { id: 'sco-fin', title: 'Listo', text: 'Elige tu plan y serás redirigido al pago.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Coach suscripción success. */
  private getCoachSuscripcionSuccessSteps(): TutorialStep[] {
    return [
      { id: 'css-bienvenida', title: 'Resultado del pago', text: 'Pantalla de verificación y resultado: verificando, éxito (bienvenida y acceso) o error (reintentar o ir al panel).', position: 'bottom' },
      { id: 'css-success', title: 'Éxito', text: 'Si el pago fue correcto: plan activo, beneficios y botón Ir al panel principal.', targetSelector: '[data-tutorial="css-success"]', position: 'left' },
      { id: 'css-actions', title: 'Acciones', text: 'Ir al panel principal o, en caso de error, Intentar de nuevo e Ir al panel.', targetSelector: '[data-tutorial="css-actions"]', position: 'bottom' },
      { id: 'css-fin', title: 'Listo', text: 'Ya conoces esta pantalla. Usa Ir al panel para continuar.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Entrenamiento individual. */
  private getIndividualTrainingSteps(): TutorialStep[] {
    return [
      { id: 'it-bienvenida', title: 'Entrenamiento individual', text: 'Vista jugador: planes asignados por el entrenador, progreso, pestañas Hoy, Planificación e Historial. Vista entrenador: crear y gestionar planes.', position: 'bottom' },
      { id: 'it-volver', title: 'Volver', text: 'Regresa al menú anterior.', targetSelector: '[data-tutorial="it-volver"]', position: 'bottom' },
      { id: 'it-hero', title: 'Resumen', text: 'Título y descripción según el modo (jugador o entrenador).', targetSelector: '[data-tutorial="it-hero"]', position: 'bottom' },
      { id: 'it-planes', title: 'Planes', text: 'Lista de planes (jugador: selecciona uno; entrenador: crear y gestionar).', targetSelector: '[data-tutorial="it-planes"]', position: 'left' },
      { id: 'it-tabs', title: 'Hoy / Planificación / Historial', text: 'Pestañas para ver la sesión de hoy, la planificación semanal o el historial de sesiones.', targetSelector: '[data-tutorial="it-tabs"]', position: 'bottom' },
      { id: 'it-content', title: 'Contenido', text: 'Sesión de hoy, calendario de la semana o listado de sesiones realizadas según la pestaña.', targetSelector: '[data-tutorial="it-content"]', position: 'left' },
      { id: 'it-fin', title: 'Listo', text: 'Ya conoces el entrenamiento individual.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Informe debrief (vista completada). */
  private getDebriefReportSteps(): TutorialStep[] {
    return [
      { id: 'dbr-bienvenida', title: 'Informe de debrief', text: 'Informe generado del análisis de entrenamiento o partido. Resumen, secciones y acciones: regenerar, descargar PDF y compartir.', position: 'bottom' },
      { id: 'dbr-volver', title: 'Volver', text: 'Regresa al historial o al menú.', targetSelector: '[data-tutorial="dbr-volver"]', position: 'bottom' },
      { id: 'dbr-actions', title: 'Acciones', text: 'Regenerar informe, Descargar PDF y Compartir.', targetSelector: '[data-tutorial="dbr-actions"]', position: 'bottom' },
      { id: 'dbr-content', title: 'Contenido del informe', text: 'Resumen y secciones con el análisis. Se usa para generar el PDF.', targetSelector: '[data-tutorial="dbr-content"]', position: 'left' },
      { id: 'dbr-fin', title: 'Listo', text: 'Ya conoces la vista del informe. Descarga o comparte cuando lo necesites.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Suscripción (jugador/familia). */
  private getSuscripcionSteps(): TutorialStep[] {
    return [
      { id: 'sus-bienvenida', title: 'Mi suscripción', text: 'Elige el perfil del jugador (si hay varios) y consulta el estado de la suscripción: activa/inactiva, tipo, fechas y opciones de renovación o contratación.', position: 'bottom' },
      { id: 'sus-perfiles', title: 'Perfiles', text: 'Tarjetas de jugadores asociados. Pulsa en uno para ver su suscripción.', targetSelector: '[data-tutorial="sus-perfiles"]', position: 'left' },
      { id: 'sus-estado', title: 'Estado', text: 'Tarjeta con plan activo o inactivo, tipo (mensual, trimestral, anual), fecha inicio y renovación o fin.', targetSelector: '[data-tutorial="sus-estado"]', position: 'left' },
      { id: 'sus-opciones', title: 'Opciones', text: 'Contratar, renovar o gestionar según el estado. Enlaces a planes si aplica.', targetSelector: '[data-tutorial="sus-opciones"]', position: 'left' },
      { id: 'sus-fin', title: 'Listo', text: 'Ya conoces tu suscripción.', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Inicio deportes. */
  private getInicioDeportesSteps(): TutorialStep[] {
    return [
      { id: 'id-bienvenida', title: 'Deportes de Sphaira', text: 'Selecciona el deporte con el que quieres trabajar. Fútbol está disponible; otros deportes pueden estar en desarrollo.', position: 'bottom' },
      { id: 'id-grid', title: 'Deportes', text: 'Tarjetas de deportes (Fútbol, Baloncesto, Balonmano, Voleibol, etc.). Pulsa en uno para acceder.', targetSelector: '[data-tutorial="id-grid"]', position: 'left' },
      { id: 'id-fin', title: 'Listo', text: 'Elige tu deporte para continuar.', position: 'bottom' }
    ];
  }

  private getLoginSteps(): TutorialStep[] {
    return [
      {
        id: 'login-welcome',
        title: 'Bienvenido a Sphaira',
        text: 'Estás a punto de entrar en Sphaira, la plataforma de gestión deportiva de tu club. En unos segundos te mostramos cómo funciona esta pantalla para que empieces con todo claro.',
        audioFile: 'login_01.mp3',
        position: 'bottom'
      },
      {
        id: 'login-email',
        title: 'Correo electrónico',
        text: 'Escribe aquí el correo electrónico con el que te diste de alta en Sphaira. Si estás explorando en modo demo, este campo es todo lo que necesitas para entrar.',
        audioFile: 'login_02.mp3',
        targetSelector: '#mail',
        position: 'bottom'
      },
      {
        id: 'login-password',
        title: 'Contraseña',
        text: 'Introduce tu contraseña para acceder a tu cuenta. Puedes usar el icono del ojo para mostrarla y comprobar que está escrita correctamente antes de continuar.',
        audioFile: 'login_03.mp3',
        targetSelector: '#password',
        position: 'top'
      },
      {
        id: 'login-submit',
        title: 'Iniciar sesión',
        text: 'Cuando hayas introducido tus datos, pulsa aquí para entrar. Si es tu primera vez, asegúrate de que el correo y la contraseña coinciden con los que usaste al registrarte.',
        audioFile: 'login_04.mp3',
        targetSelector: '.form-login .btn-custom',
        position: 'top'
      },
      {
        id: 'login-ready',
        title: 'Listo para empezar',
        text: 'Ya tienes todo listo. Pulsa Iniciar sesión para acceder a tu panel de gestión y empezar a explorar Sphaira. Si tienes algún problema, el equipo de soporte está disponible en el menú de ayuda.',
        audioFile: 'login_05.mp3',
        position: 'top'
      }
    ];
  }

  // ── API pública ────────────────────────────────────────────────────────────

  /** Comprueba si el usuario marcó "No volver a mostrar" para esta pantalla */
  wasDismissedPermanently(screenId: string): boolean {
    return localStorage.getItem(STORAGE_KEY_PREFIX + screenId) === '1';
  }

  /** Abre el tutorial de una pantalla. Si estaba marcado como "no mostrar", no hace nada a menos que force = true */
  start(screenId: string, force = false): void {
    if (!force && this.wasDismissedPermanently(screenId)) return;
    const steps = this.screens.get(screenId);
    if (!steps || steps.length === 0) return;
    this.state$.next({
      screenId,
      currentIndex: 0,
      steps,
      dontShowAgain: false
    });
    this.isOpen$.next(true);
    this.emitCurrentStep(steps, 0);
  }

  private emitCurrentStep(steps: TutorialStep[], index: number): void {
    this.currentStep$.next({
      step: steps[index],
      index: index + 1,
      total: steps.length
    });
  }

  /** Avanza al siguiente paso. Si es el último, cierra el tutorial. */
  next(): void {
    const state = this.state$.value;
    if (!state) return;
    if (state.currentIndex < state.steps.length - 1) {
      const newIndex = state.currentIndex + 1;
      this.state$.next({ ...state, currentIndex: newIndex });
      this.emitCurrentStep(state.steps, newIndex);
    } else {
      this.close();
    }
  }

  previous(): void {
    const state = this.state$.value;
    if (!state || state.currentIndex <= 0) return;
    const newIndex = state.currentIndex - 1;
    this.state$.next({ ...state, currentIndex: newIndex });
    this.emitCurrentStep(state.steps, newIndex);
  }

  close(): void {
    const state = this.state$.value;
    if (state?.dontShowAgain && state.screenId) {
      localStorage.setItem(STORAGE_KEY_PREFIX + state.screenId, '1');
    }
    this.state$.next(null);
    this.isOpen$.next(false);
    this.currentStep$.next(null);
  }

  setDontShowAgain(value: boolean): void {
    const state = this.state$.value;
    if (state) this.state$.next({ ...state, dontShowAgain: value });
  }

  getState() {
    return this.state$.value;
  }

  getState$() {
    return this.state$.asObservable();
  }
}
