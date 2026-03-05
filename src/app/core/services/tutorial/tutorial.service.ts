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
        text: 'Bienvenido a tu panel de gestión. Desde aquí tienes acceso a todos los módulos del club, equipos, documentos, pagos, equipación y mucho más. En los próximos pasos te explicamos qué hace cada sección.',
        audioFile: 'inicio_01.mp3',
        position: 'bottom'
      },
      {
        id: 'inicio-cuadro',
        title: 'Cuadro de mando',
        text: 'Empecemos por el Cuadro de mando, tu centro de control del club. Aquí encuentras el resumen de equipos, jugadores y entrenadores, los próximos partidos y entrenamientos, y alertas sobre pagos pendientes, lesiones o documentos sin entregar. Pulsa en cualquier elemento para ver su detalle.',
        audioFile: 'inicio_02.mp3',
        targetSelector: '[data-tutorial="inicio-cuadro"]',
        position: 'left'
      },
      {
        id: 'inicio-equipos',
        title: 'Equipos',
        text: 'Continuamos con Equipos. Gestiona toda la estructura deportiva del club: crea equipos por categoría, asigna jugadores y entrenadores, y accede al detalle completo de cada uno con estadísticas, calendario y plantilla.',
        audioFile: 'inicio_03.mp3',
        targetSelector: '[data-tutorial="inicio-equipos"]',
        position: 'left'
      },
      {
        id: 'inicio-documentos',
        title: 'Documentos',
        text: 'Ahora, Documentos. Centraliza toda la documentación del club, autorizaciones, contratos, fichas médicas y formularios personalizados. Publica documentos para que los jugadores los firmen y haz seguimiento de quién ha entregado cada uno.',
        audioFile: 'inicio_04.mp3',
        targetSelector: '[data-tutorial="inicio-documentos"]',
        position: 'left'
      },
      {
        id: 'inicio-pagos',
        title: 'Pagos y cuotas',
        text: 'Pasamos a Pagos y cuotas. Gestiona todas las cuotas del club desde un único lugar: consulta quién está al día y quién tiene pagos pendientes, configura los importes y acepta pagos online de forma sencilla.',
        audioFile: 'inicio_05.mp3',
        targetSelector: '[data-tutorial="inicio-pagos"]',
        position: 'left'
      },
      {
        id: 'inicio-ropa',
        title: 'Ropa / Equipación',
        text: 'Seguimos con Ropa y Equipación. Los padres pueden indicar las tallas de sus hijos directamente desde la app, y el club las recibe al instante. Además, puedes subir imágenes de la ropa para que las familias la vean antes de hacer el pedido.',
        audioFile: 'inicio_06.mp3',
        targetSelector: '[data-tutorial="inicio-ropa"]',
        position: 'left'
      },
      {
        id: 'inicio-patrocinadores',
        title: 'Patrocinadores',
        text: 'Y hablemos de Patrocinadores. Registra cada patrocinador con nombre, importe, logotipo y fechas de contrato, y dale visibilidad mostrándolo a todos los usuarios del club.',
        audioFile: 'inicio_07.mp3',
        targetSelector: '[data-tutorial="inicio-patrocinadores"]',
        position: 'left'
      },
      {
        id: 'inicio-notificaciones',
        title: 'Notificaciones',
        text: 'Siguiente, Notificaciones. Comunícate de forma directa con todos o con un equipo concreto: redacta mensajes, adjunta archivos y programa el momento exacto en que quieres que se entreguen.',
        audioFile: 'inicio_08.mp3',
        targetSelector: '[data-tutorial="inicio-notificaciones"]',
        position: 'left'
      },
      {
        id: 'inicio-staff',
        title: 'Gestión de Staff',
        text: 'Pasamos a Gestión de Staff. Define quién tiene acceso a cada parte del panel: añade miembros, asígnales permisos por módulo —pagos, documentos, estadísticas, calendario— y gestiona sus roles con total precisión.',
        audioFile: 'inicio_09.mp3',
        targetSelector: '[data-tutorial="inicio-staff"]',
        position: 'left'
      },
      {
        id: 'inicio-scouting',
        title: 'Scouting',
        text: 'Ahora, Scouting. Organiza tu proceso de captación de talento: añade jugadores a tu lista de observación y sigue su evolución desde el primer vistazo hasta el contacto formal con el club.',
        audioFile: 'inicio_10.mp3',
        targetSelector: '[data-tutorial="inicio-scouting"]',
        position: 'left'
      },
      {
        id: 'inicio-biblioteca-videos',
        title: 'Biblioteca de vídeos',
        text: 'Continuamos con la Biblioteca de vídeos, tu videoteca deportiva en la nube. Sube grabaciones, enlaza vídeos de YouTube o Vimeo, y organízalos en carpetas por equipo o temporada.',
        audioFile: 'inicio_11.mp3',
        targetSelector: '[data-tutorial="inicio-biblioteca-videos"]',
        position: 'left'
      },
      {
        id: 'inicio-video-analysis',
        title: 'Análisis de vídeo',
        text: 'Y si quieres ir más allá, tienes el Análisis de vídeo. Crea sesiones tácticas sobre tus grabaciones, añade anotaciones, dibuja sobre el campo y extrae clips clave para compartir con el cuerpo técnico.',
        audioFile: 'inicio_12.mp3',
        targetSelector: '[data-tutorial="inicio-video-analysis"]',
        position: 'left'
      },
      {
        id: 'inicio-asistente-ia',
        title: 'Asistente de IA',
        text: 'Y para terminar, el Asistente de IA, siempre disponible en todas las pantallas. Hazle preguntas, pídele informes, sesiones de entrenamiento o convocatorias. Lo tienes en el botón circular de la esquina inferior derecha.',
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
        text: 'Bienvenido al centro de control de tu club. A la izquierda tienes acceso rápido a jugadores, entrenadores, estadísticas y calendario. A la derecha, un resumen en tiempo real de resultados, entrenamientos del día y próximos partidos.',
        audioFile: 'cuadro_01.mp3',
        position: 'bottom'
      },
      {
        id: 'cuadro-volver',
        title: 'Volver',
        text: 'Antes de empezar, fíjate en este botón. Cuando quieras volver al panel principal del club, pulsa aquí y accederás al resto de módulos.',
        audioFile: 'cuadro_02.mp3',
        targetSelector: '[data-tutorial="cuadro-volver"]',
        position: 'bottom'
      },
      {
        id: 'cuadro-jugadores',
        title: 'Info jugadores',
        text: 'Empecemos por el panel izquierdo. Aquí tienes Info jugadores, donde accedes al directorio completo del club. Consulta fichas individuales con datos personales, estadísticas, historial de lesiones, pagos y documentación.',
        audioFile: 'cuadro_03.mp3',
        targetSelector: '[data-tutorial="cuadro-jugadores"]',
        position: 'right'
      },
      {
        id: 'cuadro-entrenadores',
        title: 'Info entrenadores',
        text: 'A continuación, Info entrenadores. Consulta y gestiona todo el cuerpo técnico del club: listado de entrenadores, su asignación a cada equipo y sus datos de contacto, todo en un mismo lugar.',
        audioFile: 'cuadro_04.mp3',
        targetSelector: '[data-tutorial="cuadro-entrenadores"]',
        position: 'right'
      },
      {
        id: 'cuadro-stats-jugadores',
        title: 'Estadísticas jugadores',
        text: 'Seguimos con Estadísticas de jugadores. Analiza el rendimiento individual de cada jugador: goles, asistencias, minutos jugados y tarjetas. Aplica filtros por equipo, posición o temporada.',
        audioFile: 'cuadro_05.mp3',
        targetSelector: '[data-tutorial="cuadro-stats-jugadores"]',
        position: 'right'
      },
      {
        id: 'cuadro-stats-equipos',
        title: 'Estadísticas equipos',
        text: 'Y también tienes Estadísticas por equipo. Evalúa el rendimiento colectivo, visualiza clasificaciones, resultados y tendencias por temporada para tomar mejores decisiones tácticas.',
        audioFile: 'cuadro_06.mp3',
        targetSelector: '[data-tutorial="cuadro-stats-equipos"]',
        position: 'right'
      },
      {
        id: 'cuadro-entrenamientos',
        title: 'Entrenamientos',
        text: 'Pasamos a Entrenamientos. Los entrenadores ya pueden crear y gestionar sus sesiones desde la app. Muy pronto el club también tendrá aquí un resumen de toda la actividad de entrenamiento.',
        audioFile: 'cuadro_07.mp3',
        targetSelector: '[data-tutorial="cuadro-entrenamientos"]',
        position: 'right'
      },
      {
        id: 'cuadro-calendario',
        title: 'Calendario',
        text: 'Sigamos con el Calendario. Visualiza toda la actividad del club en un único lugar: partidos, entrenamientos y eventos organizados de forma clara. Crea o edita cualquier entrada desde la vista mensual o semanal.',
        audioFile: 'cuadro_08.mp3',
        targetSelector: '[data-tutorial="cuadro-calendario"]',
        position: 'right'
      },
      {
        id: 'cuadro-lesiones',
        title: 'Lesiones',
        text: 'También encontrarás Lesiones. Los entrenadores ya pueden registrar y gestionar las bajas de sus jugadores desde la app. Próximamente el club tendrá aquí un resumen centralizado de todo el estado de lesiones del club.',
        audioFile: 'cuadro_09.mp3',
        targetSelector: '[data-tutorial="cuadro-lesiones"]',
        position: 'right'
      },
      {
        id: 'cuadro-resultados',
        title: 'Resultados',
        text: 'Ahora fíjate en el panel derecho. Aquí tienes los Resultados del club: marcador y resultado de cada partido, victoria, empate o derrota. Pulsa en cualquiera para ver el detalle completo o actualizar el marcador.',
        audioFile: 'cuadro_10.mp3',
        targetSelector: '[data-tutorial="cuadro-resultados"]',
        position: 'left'
      },
      {
        id: 'cuadro-entrenamientos-hoy',
        title: 'Entrenamientos de hoy',
        text: 'A la derecha tienes los Entrenamientos de hoy. De un vistazo ves qué equipos entrenan y a qué hora, y la línea de tiempo te indica en qué momento del día te encuentras respecto a los entrenamientos programados.',
        audioFile: 'cuadro_11.mp3',
        targetSelector: '[data-tutorial="cuadro-entrenamientos-hoy"]',
        position: 'left'
      },
      {
        id: 'cuadro-proximos-partidos',
        title: 'Próximos partidos',
        text: 'Y para cerrar este panel, los Próximos partidos. Anticipa los compromisos del club consultando fecha, hora y rival, y pulsa en cualquier partido para acceder a la convocatoria o preparar el análisis previo.',
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
        text: 'Esta es tu pantalla principal como entrenador. Aquí ves todos los equipos que tienes asignados en la temporada seleccionada. Pulsa en una tarjeta para entrar al menú de ese equipo.',
        audioFile: 'coach_01.mp3',
        position: 'bottom'
      },
      {
        id: 'inicio-coach-temporada',
        title: 'Temporada',
        text: 'Fíjate en el selector de temporada. Cámbialo para ver los equipos asignados en otro curso; el listado se actualiza al instante.',
        audioFile: 'coach_02.mp3',
        targetSelector: '[data-tutorial="inicio-coach-temporada"]',
        position: 'bottom'
      },
      {
        id: 'inicio-coach-grid',
        title: 'Tarjetas de equipos',
        text: 'Aquí tienes tus equipos. Cada tarjeta muestra categoría, nombre, liga, horario de entrenamiento y número de jugadores. Pulsa en una para acceder al calendario, tareas, jugadores, estadísticas, notificaciones y mucho más.',
        audioFile: 'coach_03.mp3',
        targetSelector: '[data-tutorial="inicio-coach-grid"]',
        position: 'left'
      },
      {
        id: 'inicio-coach-empty',
        title: 'Sin equipos',
        text: 'Si aún no tienes equipos asignados en esta temporada, verás un mensaje orientativo y el botón para ir a la gestión de equipos del club.',
        audioFile: 'coach_04.mp3',
        targetSelector: '[data-tutorial="inicio-coach-empty"]',
        position: 'bottom'
      },
      {
        id: 'inicio-coach-fin',
        title: 'Listo',
        text: 'Ya conoces tu panel de entrenador. Elige un equipo y accede a su calendario, tareas, jugadores y el resto de opciones cuando quieras.',
        audioFile: 'coach_05.mp3',
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
        text: 'Esta es tu pantalla principal. Aquí ves los jugadores vinculados a tu cuenta en la temporada seleccionada. Pulsa en una tarjeta para acceder a las opciones de ese jugador: calendario, cuotas, documentación, estadísticas, galería y mucho más.',
        audioFile: 'player_01.mp3',
        position: 'bottom'
      },
      {
        id: 'inicio-player-temporada',
        title: 'Temporada',
        text: 'Fíjate en el selector de temporada. Cámbialo para ver los jugadores y equipos de otro curso; el listado se actualiza al instante.',
        audioFile: 'player_02.mp3',
        targetSelector: '[data-tutorial="inicio-player-temporada"]',
        position: 'bottom'
      },
      {
        id: 'inicio-player-list',
        title: 'Tarjetas de jugadores',
        text: 'Aquí ves tus jugadores. Cada tarjeta muestra nombre, equipo, horario de entrenamiento y próximo partido. Pulsa en una tarjeta o en Ver jugador para acceder a todas sus opciones.',
        audioFile: 'player_03.mp3',
        targetSelector: '[data-tutorial="inicio-player-list"]',
        position: 'left'
      },
      {
        id: 'inicio-player-empty',
        title: 'Sin jugadores',
        text: 'Y si no tienes jugadores vinculados en esta temporada, verás un mensaje orientativo. Contacta con tu club para dar de alta a los jugadores.',
        audioFile: 'player_04.mp3',
        targetSelector: '[data-tutorial="inicio-player-empty"]',
        position: 'bottom'
      },
      {
        id: 'inicio-player-fin',
        title: 'Listo',
        text: 'Ya conoces tu panel. Pulsa en un jugador para ver su calendario, cuotas, documentación y el resto de opciones cuando quieras.',
        audioFile: 'player_05.mp3',
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
        audioFile: 'equipos_01.mp3',
        position: 'bottom'
      },
      {
        id: 'equipos-volver',
        title: 'Volver',
        text: 'Antes de explorar las opciones, este botón te lleva de vuelta al inicio del dashboard del club cuando lo necesites.',
        audioFile: 'equipos_02.mp3',
        targetSelector: '[data-tutorial="equipos-volver"]',
        position: 'bottom'
      },
      {
        id: 'equipos-excel',
        title: 'Subir jugadores desde Excel',
        text: 'Empecemos por las acciones superiores. Puedes importar un listado de jugadores desde Excel: descarga la plantilla, rellena los datos y súbela para dar de alta a varios jugadores a la vez.',
        audioFile: 'equipos_03.mp3',
        targetSelector: '[data-tutorial="equipos-excel"]',
        position: 'bottom'
      },
      {
        id: 'equipos-invitar',
        title: 'Invitar jugadores',
        text: 'También puedes invitar jugadores generando un enlace de registro. Compártelo por WhatsApp o correo y los jugadores se asignarán al club directamente.',
        audioFile: 'equipos_04.mp3',
        targetSelector: '[data-tutorial="equipos-invitar"]',
        position: 'bottom'
      },
      {
        id: 'equipos-crear',
        title: 'Crear equipo',
        text: 'Para crear un nuevo equipo, pulsa aquí: elige categoría, nivel y letra. Si la categoría no existe, puedes crearla en el momento.',
        audioFile: 'equipos_05.mp3',
        targetSelector: '[data-tutorial="equipos-crear"]',
        position: 'bottom'
      },
      {
        id: 'equipos-temporada',
        title: 'Temporada',
        text: 'Si quieres ver los equipos de otro curso, cambia la temporada desde este selector. El listado y las estadísticas se actualizan al instante.',
        audioFile: 'equipos_06.mp3',
        targetSelector: '[data-tutorial="equipos-temporada"]',
        position: 'bottom'
      },
      {
        id: 'equipos-listado',
        title: 'Listado de equipos',
        text: 'Y aquí tienes el listado de todos los equipos. Cada tarjeta muestra el escudo, nombre, horario de entrenamientos y número de jugadores. Pulsa en una para abrir el calendario y el detalle.',
        audioFile: 'equipos_07.mp3',
        targetSelector: '[data-tutorial="equipos-listado"]',
        position: 'left'
      },
      {
        id: 'equipos-fin',
        title: 'Listo',
        text: 'Ya conoces la pantalla de equipos. Usa las acciones superiores para importar, invitar o crear equipos, y pulsa en cualquier tarjeta para ver su calendario.',
        audioFile: 'equipos_08.mp3',
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
        text: 'Aquí almacenas y organizas toda la documentación del club: autorizaciones, fichas médicas, contratos y formularios personalizados. Puedes subir documentos, solicitarlos y hacer seguimiento de las entregas.',
        audioFile: 'docs_01.mp3',
        position: 'bottom'
      },
      {
        id: 'docs-volver',
        title: 'Volver',
        text: 'Antes de continuar, recuerda que este botón te devuelve al inicio del dashboard cuando lo necesites.',
        audioFile: 'docs_02.mp3',
        targetSelector: '[data-tutorial="docs-volver"]',
        position: 'bottom'
      },
      {
        id: 'docs-tabs',
        title: 'Pestañas Jugadores / Entrenadores',
        text: 'La pantalla tiene dos pestañas. Cambia entre la documentación de jugadores y la de entrenadores; cada una muestra los documentos y el estado de entrega correspondiente.',
        audioFile: 'docs_03.mp3',
        targetSelector: '[data-tutorial="docs-tabs"]',
        position: 'bottom'
      },
      {
        id: 'docs-acciones',
        title: 'Acciones rápidas',
        text: 'En la parte superior tienes las tres acciones disponibles. Subir documento añade un archivo al club, Solicitar documento exige la entrega a jugadores o entrenadores, y Crear formulario diseña un formulario personalizado con campos a rellenar.',
        audioFile: 'docs_04.mp3',
        targetSelector: '[data-tutorial="docs-acciones"]',
        position: 'bottom'
      },
      {
        id: 'docs-busqueda',
        title: 'Buscar y filtrar',
        text: 'También puedes buscar documentos por nombre o descripción y filtrar por equipo. El contador muestra cuántos documentos hay en la lista actual.',
        audioFile: 'docs_05.mp3',
        targetSelector: '[data-tutorial="docs-busqueda"]',
        position: 'bottom'
      },
      {
        id: 'docs-tabla',
        title: 'Tabla de documentos',
        text: 'Y aquí ves la tabla completa. Cada fila muestra el estado de completado, equipos asignados, nombre, descripción y fecha. Desde las acciones puedes ver visibilidad, solicitar subida, editar, abrir el archivo o eliminar.',
        audioFile: 'docs_06.mp3',
        targetSelector: '[data-tutorial="docs-tabla"]',
        position: 'left'
      },
      {
        id: 'docs-fin',
        title: 'Listo',
        text: 'Ya conoces la pantalla de documentos. Usa las acciones superiores para subir, solicitar o crear formularios, y la tabla para revisar y gestionar cada documento.',
        audioFile: 'docs_07.mp3',
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
        text: 'En esta pantalla gestionas todos los pagos y cuotas del club: configuración de pagos, Stripe, historial, Sphaira Pay, cuenta bancaria y notificaciones. Tendrás el resumen de cobros y el listado completo de jugadores con su estado de pago.',
        audioFile: 'cuotas_01.mp3',
        position: 'bottom'
      },
      {
        id: 'cuotas-volver',
        title: 'Volver',
        text: 'Antes de continuar, recuerda que este botón te devuelve al inicio del dashboard cuando lo necesites.',
        audioFile: 'cuotas_02.mp3',
        targetSelector: '[data-tutorial="cuotas-volver"]',
        position: 'bottom'
      },
      {
        id: 'cuotas-acciones',
        title: 'Acciones rápidas',
        text: 'Empecemos por las acciones rápidas. Pagos configura las cuotas del club, Stripe conecta tu cuenta para cobros online, Historial muestra todos los movimientos, y también tienes Sphaira Pay, datos de Banco y Notificaciones de pago.',
        audioFile: 'cuotas_03.mp3',
        targetSelector: '[data-tutorial="cuotas-acciones"]',
        position: 'bottom'
      },
      {
        id: 'cuotas-resumen',
        title: 'Resumen',
        text: 'A continuación tienes el resumen. Las tarjetas muestran el total de jugadores, el importe a cobrar, lo ya cobrado con su barra de progreso y el importe pendiente. Te dan una visión rápida del estado de las cuotas.',
        audioFile: 'cuotas_04.mp3',
        targetSelector: '[data-tutorial="cuotas-resumen"]',
        position: 'bottom'
      },
      {
        id: 'cuotas-filtros',
        title: 'Buscar y filtrar',
        text: 'Para encontrar un jugador concreto, busca por nombre o filtra por tipo de cuota. El filtro permite ver solo los jugadores de una o varias cuotas específicas.',
        audioFile: 'cuotas_05.mp3',
        targetSelector: '[data-tutorial="cuotas-filtros"]',
        position: 'bottom'
      },
      {
        id: 'cuotas-listado',
        title: 'Listado de jugadores',
        text: 'Y aquí tienes el listado completo. Cada fila muestra nombre, equipo, estado, total a pagar, pagado, restante y progreso por cuota. Desde las acciones puedes editar, registrar un pago o ver el historial del jugador.',
        audioFile: 'cuotas_06.mp3',
        targetSelector: '[data-tutorial="cuotas-listado"]',
        position: 'left'
      },
      {
        id: 'cuotas-fin',
        title: 'Listo',
        text: 'Ya conoces la gestión de cuotas. Usa la barra superior para configurar pagos y Stripe, y la tabla para revisar y registrar cobros por jugador.',
        audioFile: 'cuotas_07.mp3',
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
        text: 'Aquí gestionas la equipación del club: el catálogo de prendas, las tallas disponibles y la tabla de tallas por jugador. Los padres pueden indicar las tallas de sus hijos y el club recibe esa información directamente aquí.',
        audioFile: 'ropa_01.mp3',
        position: 'bottom'
      },
      {
        id: 'ropa-volver',
        title: 'Volver',
        text: 'Antes de continuar, recuerda que este botón te devuelve al inicio del dashboard cuando lo necesites.',
        audioFile: 'ropa_02.mp3',
        targetSelector: '[data-tutorial="ropa-volver"]',
        position: 'bottom'
      },
      {
        id: 'ropa-temporada',
        title: 'Temporada',
        text: 'Fíjate en el selector de temporada. Cámbialo para ver y editar las tallas del catálogo y de los jugadores del curso correspondiente.',
        audioFile: 'ropa_03.mp3',
        targetSelector: '[data-tutorial="ropa-temporada"]',
        position: 'bottom'
      },
      {
        id: 'ropa-tabs',
        title: 'Pestañas',
        text: 'La pantalla tiene tres pestañas. Tallas catálogo gestiona las tallas disponibles, Catálogo de prendas define las prendas del club con sus imágenes, y Tallas jugadores muestra la tabla clásica con las tallas de cada jugador.',
        audioFile: 'ropa_04.mp3',
        targetSelector: '[data-tutorial="ropa-tabs"]',
        position: 'bottom'
      },
      {
        id: 'ropa-tabla-tallas',
        title: 'Tabla de tallas catálogo',
        text: 'En la primera pestaña ves la tabla de tallas del catálogo: cada prenda con las tallas disponibles. Puedes editar las tallas y gestionar el contenido que verán los jugadores desde la app.',
        audioFile: 'ropa_05.mp3',
        targetSelector: '[data-tutorial="ropa-contenido"]',
        position: 'left'
      },
      {
        id: 'ropa-catalogo-tab',
        title: 'Catálogo de prendas',
        text: 'Si pulsas en la segunda pestaña, accedes al catálogo de prendas: define las prendas disponibles y sube las imágenes de cada una para que los jugadores y padres las vean directamente en la app.',
        audioFile: 'ropa_06.mp3',
        targetSelector: '[data-tutorial="ropa-tab-catalogo"]',
        position: 'bottom'
      },
      {
        id: 'ropa-contenido',
        title: 'Contenido',
        text: 'En cada pestaña puedes exportar el contenido a Excel y personalizar las columnas visibles según lo que necesites consultar.',
        audioFile: 'ropa_07.mp3',
        targetSelector: '[data-tutorial="ropa-contenido"]',
        position: 'left'
      },
      {
        id: 'ropa-fin',
        title: 'Listo',
        text: 'Ya conoces la gestión de ropa. Cambia de pestaña para trabajar con el catálogo, subir imágenes de las prendas o revisar las tallas de los jugadores.',
        audioFile: 'ropa_08.mp3',
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
        text: 'En esta pantalla gestionas los patrocinadores del club. Añade el logo, nombre, descripción y datos de contacto de cada uno para que todos los miembros del club los vean y puedas darles la visibilidad que merecen.',
        audioFile: 'patro_01.mp3',
        position: 'bottom'
      },
      {
        id: 'patro-volver',
        title: 'Volver',
        text: 'Antes de continuar, recuerda que este botón te devuelve al inicio del dashboard cuando lo necesites.',
        audioFile: 'patro_02.mp3',
        targetSelector: '[data-tutorial="patro-volver"]',
        position: 'bottom'
      },
      {
        id: 'patro-carrusel',
        title: 'Carrusel de logos',
        text: 'Empecemos por el carrusel de logos. Los patrocinadores con visibilidad activada aparecen aquí. Cualquier usuario del club puede hacer clic en un logo para ver la ficha completa del patrocinador.',
        audioFile: 'patro_03.mp3',
        targetSelector: '[data-tutorial="patro-carrusel"]',
        position: 'bottom'
      },
      {
        id: 'patro-nuevo',
        title: 'Nuevo patrocinador',
        text: 'Para añadir un nuevo patrocinador, pulsa aquí. Sube el logo, rellena nombre, descripción, web, email y teléfono para que los miembros del club puedan conocerlo. Después podrás activar o desactivar su aparición en el carrusel.',
        audioFile: 'patro_04.mp3',
        targetSelector: '[data-tutorial="patro-nuevo"]',
        position: 'bottom'
      },
      {
        id: 'patro-grid',
        title: 'Fichas de patrocinadores',
        text: 'Y aquí ves las fichas de todos los patrocinadores registrados. Cada tarjeta muestra logo, nombre, descripción, contacto y beneficios. Puedes ver la ficha completa, controlar su visibilidad o eliminarlo.',
        audioFile: 'patro_05.mp3',
        targetSelector: '[data-tutorial="patro-grid"]',
        position: 'left'
      },
      {
        id: 'patro-fin',
        title: 'Listo',
        text: 'Ya conoces la pantalla de patrocinadores. Usa el botón Nuevo para añadir patrocinadores y las tarjetas para editar o gestionar su visibilidad.',
        audioFile: 'patro_06.mp3',
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
        audioFile: 'notif_01.mp3',
        position: 'bottom'
      },
      {
        id: 'notif-volver',
        title: 'Volver',
        text: 'Antes de continuar, recuerda que este botón te devuelve al inicio del dashboard cuando lo necesites.',
        audioFile: 'notif_02.mp3',
        targetSelector: '[data-tutorial="notif-volver"]',
        position: 'bottom'
      },
      {
        id: 'notif-redactar',
        title: 'Redactar mensaje',
        text: 'Empecemos por el botón principal: Redactar. Abre el formulario para escribir una nueva notificación; elige destinatarios, asunto y cuerpo, y decide si envías al momento o programas el envío.',
        audioFile: 'notif_03.mp3',
        targetSelector: '[data-tutorial="notif-redactar"]',
        position: 'right'
      },
      {
        id: 'notif-sidebar',
        title: 'Bandejas',
        text: 'A la izquierda tienes las tres bandejas. Entrada muestra los mensajes recibidos con el contador de no leídos, Enviados los que ya has mandado, y Programados los que tienen un envío futuro planificado.',
        audioFile: 'notif_04.mp3',
        targetSelector: '[data-tutorial="notif-sidebar"]',
        position: 'right'
      },
      {
        id: 'notif-toolbar',
        title: 'Búsqueda y marcar todo como leído',
        text: 'En la parte superior puedes buscar mensajes por remitente, asunto o contenido. Si tienes mensajes sin leer, el botón Marcar todo como leído los marca de una sola vez.',
        audioFile: 'notif_05.mp3',
        targetSelector: '[data-tutorial="notif-toolbar"]',
        position: 'bottom'
      },
      {
        id: 'notif-filtros',
        title: 'Filtros (Entrada)',
        text: 'Además puedes filtrar los mensajes de entrada por Todos, Leídos o No leídos. Muy útil para localizar rápidamente los pendientes de leer.',
        audioFile: 'notif_06.mp3',
        targetSelector: '[data-tutorial="notif-filtros"]',
        position: 'bottom'
      },
      {
        id: 'notif-lista',
        title: 'Lista de mensajes',
        text: 'Y aquí ves la lista de mensajes. Cada fila muestra remitente, asunto y fecha; los no leídos tienen un indicador visual. Pulsa en uno para abrirlo en el panel de lectura.',
        audioFile: 'notif_07.mp3',
        targetSelector: '[data-tutorial="notif-lista"]',
        position: 'left'
      },
      {
        id: 'notif-lector',
        title: 'Panel de lectura',
        text: 'Al seleccionar un mensaje verás aquí el asunto, remitente, fecha y el cuerpo completo. En móvil puedes volver atrás para ver de nuevo la lista.',
        audioFile: 'notif_08.mp3',
        targetSelector: '[data-tutorial="notif-lector"]',
        position: 'left'
      },
      {
        id: 'notif-fin',
        title: 'Listo',
        text: 'Ya conoces la gestión de notificaciones. Usa Redactar para enviar mensajes, cambia de bandeja en el menú lateral y aprovecha la búsqueda y los filtros para encontrar lo que necesitas.',
        audioFile: 'notif_09.mp3',
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
        text: 'Aquí creas y gestionas los usuarios con acceso al panel del club. Cada usuario Staff tiene permisos por módulo: jugadores, estadísticas, calendario, documentos, pagos y más. Puedes habilitar o deshabilitar el acceso y editar los permisos en cualquier momento.',
        audioFile: 'staff_01.mp3',
        position: 'bottom'
      },
      {
        id: 'staff-volver',
        title: 'Volver',
        text: 'Antes de continuar, recuerda que este botón te devuelve al inicio del dashboard cuando lo necesites.',
        audioFile: 'staff_02.mp3',
        targetSelector: '[data-tutorial="staff-volver"]',
        position: 'bottom'
      },
      {
        id: 'staff-toolbar',
        title: 'Barra de acciones',
        text: 'En la parte superior ves el número de usuarios Staff y el botón Nuevo Staff para crear uno nuevo. Al crearlo indicarás nombre, apellidos, email, contraseña y los módulos a los que tendrá acceso.',
        audioFile: 'staff_03.mp3',
        targetSelector: '[data-tutorial="staff-toolbar"]',
        position: 'bottom'
      },
      {
        id: 'staff-grid',
        title: 'Tarjetas de usuarios',
        text: 'Y aquí ves las tarjetas de todos los usuarios Staff. Cada una muestra identidad, estado Activo o Inhabilitado, el interruptor de acceso y los permisos asignados. Desde las acciones puedes editar permisos o eliminar al usuario.',
        audioFile: 'staff_04.mp3',
        targetSelector: '[data-tutorial="staff-grid"]',
        position: 'left'
      },
      {
        id: 'staff-tarjeta',
        title: 'Contenido de cada tarjeta',
        text: 'Fíjate en cada tarjeta: verás nombre, email y el badge de estado. El interruptor Acceso habilita o deshabilita el panel con confirmación, y los chips muestran los módulos a los que tiene acceso ese usuario.',
        audioFile: 'staff_05.mp3',
        targetSelector: '[data-tutorial="staff-tarjeta"]',
        position: 'left'
      },
      {
        id: 'staff-fin',
        title: 'Listo',
        text: 'Ya conoces la gestión de Staff. Crea usuarios con Nuevo Staff, asigna solo los módulos que necesiten y usa el interruptor de acceso para activar o desactivar sin borrar al usuario.',
        audioFile: 'staff_06.mp3',
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
        text: 'Aquí gestionas la lista de jugadores en observación: tu watchlist, el pipeline por estados y la opción de comparar jugadores. Puedes añadir jugadores externos, evaluarlos y generar informes con IA.',
        audioFile: 'scout_01.mp3',
        position: 'bottom'
      },
      {
        id: 'scout-volver',
        title: 'Volver',
        text: 'Antes de continuar, recuerda que este botón te devuelve al inicio del dashboard cuando lo necesites.',
        audioFile: 'scout_02.mp3',
        targetSelector: '[data-tutorial="scout-volver"]',
        position: 'bottom'
      },
      {
        id: 'scout-config',
        title: 'Configuración',
        text: 'Empecemos por la configuración del módulo. Desde aquí activas o desactivas el Pipeline, los informes y la comparativa de jugadores. Los cambios se aplican al guardar.',
        audioFile: 'scout_03.mp3',
        targetSelector: '[data-tutorial="scout-config"]',
        position: 'bottom'
      },
      {
        id: 'scout-tabs',
        title: 'Pestañas',
        text: 'La pantalla tiene dos vistas. La lista de seguimiento muestra todos los jugadores en observación con filtros y búsqueda, y el Pipeline presenta una vista por columnas para mover jugadores entre fases.',
        audioFile: 'scout_04.mp3',
        targetSelector: '[data-tutorial="scout-tabs"]',
        position: 'bottom'
      },
      {
        id: 'scout-watchlist-header',
        title: 'Barra de la lista de seguimiento',
        text: 'En la lista de seguimiento puedes buscar por nombre, filtrar por estado del pipeline, añadir jugadores externos con Añadir externo, y activar el modo comparación para elegir hasta cuatro jugadores y compararlos.',
        audioFile: 'scout_05.mp3',
        targetSelector: '[data-tutorial="scout-watchlist-header"]',
        position: 'bottom'
      },
      {
        id: 'scout-tabla',
        title: 'Tabla de jugadores',
        text: 'Aquí ves a todos los jugadores en observación. Cada fila muestra nombre, edad, posición, equipo, estado, valoración media y acciones para ver la ficha, añadir una evaluación o quitar de la lista.',
        audioFile: 'scout_06.mp3',
        targetSelector: '[data-tutorial="scout-tabla"]',
        position: 'left'
      },
      {
        id: 'scout-pipeline',
        title: 'Vista Pipeline',
        text: 'Y si tienes el pipeline activado, verás columnas por estado: Identificado, Observado, Evaluado, Contactado y más. Arrastra o usa las flechas para mover jugadores entre fases. Los descartados se agrupan en una sección separada y puedes restaurarlos.',
        audioFile: 'scout_07.mp3',
        targetSelector: '[data-tutorial="scout-pipeline"]',
        position: 'left'
      },
      {
        id: 'scout-fin',
        title: 'Listo',
        text: 'Ya conoces el módulo de Scouting. Usa la watchlist para evaluar jugadores, el pipeline para organizar por fase y la comparativa para analizar varios a la vez.',
        audioFile: 'scout_08.mp3',
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
        text: 'Aquí gestionas todos los vídeos del club: sube archivos desde tu equipo, importa desde Google Drive, añade enlaces de YouTube o Vimeo y organízalos en carpetas por temporada.',
        audioFile: 'videos_01.mp3',
        position: 'bottom'
      },
      {
        id: 'videos-volver',
        title: 'Volver',
        text: 'Antes de continuar, recuerda que este botón te devuelve al dashboard del club cuando lo necesites.',
        audioFile: 'videos_02.mp3',
        targetSelector: '[data-tutorial="videos-volver"]',
        position: 'bottom'
      },
      {
        id: 'videos-header-acciones',
        title: 'Acciones del header',
        text: 'Empecemos por las acciones del header. Gestionar plan o Contratar almacenamiento abre los planes disponibles. Subir vídeo sube un archivo desde tu equipo, Importar desde Drive trae vídeos de Google Drive, y Añadir enlace agrega una URL de YouTube o Vimeo sin consumir espacio.',
        audioFile: 'videos_03.mp3',
        targetSelector: '[data-tutorial="videos-header-acciones"]',
        position: 'bottom'
      },
      {
        id: 'videos-plan-bar',
        title: 'Uso de almacenamiento',
        text: 'Justo debajo ves el estado de tu almacenamiento: plan activo, espacio usado y límite total. Si no tienes plan, aparecerá un banner para contratar almacenamiento.',
        audioFile: 'videos_04.mp3',
        targetSelector: '[data-tutorial="videos-plan-bar"]',
        position: 'bottom'
      },
      {
        id: 'videos-sidebar',
        title: 'Carpetas',
        text: 'A la izquierda tienes el organizador de carpetas. Puedes ver todos los vídeos, los que no tienen carpeta, o las carpetas que hayas creado. El botón de personas sincroniza carpetas por equipo y el de carpeta más crea una nueva.',
        audioFile: 'videos_05.mp3',
        targetSelector: '[data-tutorial="videos-sidebar"]',
        position: 'right'
      },
      {
        id: 'videos-busqueda',
        title: 'Búsqueda y filtro por carpeta',
        text: 'Para encontrar un vídeo concreto, busca por título, jugador o etiqueta. Si tienes una carpeta seleccionada, aparece un breadcrumb que puedes quitar para ver todos los vídeos de nuevo.',
        audioFile: 'videos_06.mp3',
        targetSelector: '[data-tutorial="videos-busqueda"]',
        position: 'bottom'
      },
      {
        id: 'videos-grid',
        title: 'Grid de vídeos',
        text: 'Y aquí tienes todos tus vídeos. Cada tarjeta muestra miniatura, título, jugador, carpeta, etiquetas y fecha. Desde las acciones puedes reproducir, exportar a Drive, analizar el vídeo, moverlo de carpeta o eliminarlo.',
        audioFile: 'videos_07.mp3',
        targetSelector: '[data-tutorial="videos-grid"]',
        position: 'left'
      },
      {
        id: 'videos-fin',
        title: 'Listo',
        text: 'Ya conoces la Biblioteca de Vídeos. Sube o enlaza vídeos, organízalos en carpetas y usa Analizar vídeo para etiquetar jugadas en el módulo de Análisis de Vídeo.',
        audioFile: 'videos_08.mp3',
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
        text: 'Desde aquí creas y gestionas proyectos de etiquetado de vídeo. Subes un archivo local, eliges una plantilla de categorías, etiquetas jugadas y creas playlists que puedes compartir con el equipo.',
        audioFile: 'va_01.mp3',
        position: 'bottom'
      },
      {
        id: 'va-volver',
        title: 'Volver',
        text: 'Antes de continuar, recuerda que este botón te devuelve al dashboard cuando lo necesites.',
        audioFile: 'va_02.mp3',
        targetSelector: '[data-tutorial="va-volver"]',
        position: 'bottom'
      },
      {
        id: 'va-quick-actions',
        title: 'Acciones rápidas',
        text: 'Empecemos por las acciones rápidas. Plantillas gestiona las categorías de etiquetado, Playlists crea y comparte listas de clips, y Biblioteca enlaza con la Biblioteca de Vídeos del club.',
        audioFile: 'va_03.mp3',
        targetSelector: '[data-tutorial="va-quick-actions"]',
        position: 'bottom'
      },
      {
        id: 'va-kpi',
        title: 'Filtros por estado',
        text: 'Las tarjetas de estado te permiten filtrar la lista de proyectos. Pulsa en Total, En progreso, Completados o Borradores para ver solo los análisis en ese estado.',
        audioFile: 'va_04.mp3',
        targetSelector: '[data-tutorial="va-kpi"]',
        position: 'bottom'
      },
      {
        id: 'va-toolbar',
        title: 'Barra de proyectos',
        text: 'En la barra de proyectos tienes el contador de análisis, la búsqueda por título y el botón Nuevo análisis para crear un proyecto: título, descripción, archivo de vídeo local y plantilla.',
        audioFile: 'va_05.mp3',
        targetSelector: '[data-tutorial="va-toolbar"]',
        position: 'bottom'
      },
      {
        id: 'va-grid',
        title: 'Proyectos de análisis',
        text: 'Y aquí ves todos tus proyectos de análisis. Cada tarjeta muestra el estado, título, descripción, origen del vídeo y fecha. Pulsa en una tarjeta para abrir el workspace de etiquetado.',
        audioFile: 'va_06.mp3',
        targetSelector: '[data-tutorial="va-grid"]',
        position: 'left'
      },
      {
        id: 'va-fin',
        title: 'Listo',
        text: 'Crea tu primer análisis con Nuevo análisis, configura tus plantillas si hace falta, y abre un proyecto para etiquetar jugadas y crear clips.',
        audioFile: 'va_07.mp3',
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
        text: 'Este es el chat de inteligencia artificial del club. Haz preguntas, pide resúmenes o que ejecute acciones como consultar datos o crear elementos. Cada mensaje consume créditos; el saldo se muestra en la cabecera.',
        audioFile: 'asistente_01.mp3',
        position: 'bottom'
      },
      {
        id: 'asistente-volver',
        title: 'Volver',
        text: 'Antes de continuar, recuerda que este botón te devuelve al dashboard cuando lo necesites.',
        audioFile: 'asistente_02.mp3',
        targetSelector: '[data-tutorial="asistente-volver"]',
        position: 'bottom'
      },
      {
        id: 'asistente-sidebar',
        title: 'Historial de conversaciones',
        text: 'A la izquierda tienes el historial de conversaciones anteriores. El botón más inicia una nueva conversación; pulsa en una entrada para cargarla, y la papelera la elimina.',
        audioFile: 'asistente_03.mp3',
        targetSelector: '[data-tutorial="asistente-sidebar"]',
        position: 'right'
      },
      {
        id: 'asistente-toggle',
        title: 'Mostrar u ocultar historial',
        text: 'Este botón abre o cierra el panel del historial para ganar espacio en pantalla cuando lo necesites.',
        audioFile: 'asistente_04.mp3',
        targetSelector: '[data-tutorial="asistente-toggle"]',
        position: 'right'
      },
      {
        id: 'asistente-header',
        title: 'Cabecera del chat',
        text: 'En la cabecera del chat ves el título del asistente, el indicador de estado y los créditos disponibles. Pulsa en los créditos para ver detalles o comprar más.',
        audioFile: 'asistente_05.mp3',
        targetSelector: '[data-tutorial="asistente-header"]',
        position: 'bottom'
      },
      {
        id: 'asistente-body',
        title: 'Mensajes',
        text: 'Aquí se van mostrando tus mensajes y las respuestas del asistente. Las respuestas pueden incluir acciones que debes confirmar o cancelar. El asistente mostrará un indicador mientras genera la respuesta.',
        audioFile: 'asistente_06.mp3',
        targetSelector: '[data-tutorial="asistente-body"]',
        position: 'left'
      },
      {
        id: 'asistente-sugerencias',
        title: 'Sugerencias',
        text: 'Para empezar rápido, al iniciar una conversación verás chips de sugerencias con preguntas o tareas frecuentes. Pulsa en uno para enviarlo directamente y obtener una respuesta inmediata.',
        audioFile: 'asistente_07.mp3',
        targetSelector: '[data-tutorial="asistente-sugerencias"]',
        position: 'top'
      },
      {
        id: 'asistente-input',
        title: 'Escribir y enviar',
        text: 'Y para escribir tu consulta, usa el área de texto y pulsa Enviar o Intro. Si admite voz, el micrófono te permite dictar. Durante la respuesta puedes cancelar con el botón X.',
        audioFile: 'asistente_08.mp3',
        targetSelector: '[data-tutorial="asistente-input"]',
        position: 'top'
      },
      {
        id: 'asistente-fin',
        title: 'Listo',
        text: 'Ya conoces el Asistente IA. Usa las sugerencias o escribe libremente, revisa tus créditos y confirma las acciones que el asistente te proponga.',
        audioFile: 'asistente_09.mp3',
        position: 'bottom'
      }
    ];
  }

  /** Pasos del tutorial de Info Jugadores (cuadro de mandos). */
  private getInfoJugadoresSteps(): TutorialStep[] {
    return [
      { id: 'ij-bienvenida', title: 'Info Jugadores', text: 'Aquí consultas y gestionas el perfil de cada jugador del club: datos personales, padre o madre, DNI, documentos y equipo asignado. Puedes mover jugadores de equipo, cambiar temporada, exportar a Excel y personalizar columnas.', audioFile: 'ij_01.mp3', position: 'bottom' },
      { id: 'ij-volver', title: 'Volver', text: 'Antes de continuar, recuerda que este botón te devuelve al cuadro de mandos del club.', audioFile: 'ij_02.mp3', targetSelector: '[data-tutorial="ij-volver"]', position: 'bottom' },
      { id: 'ij-consultar-ia', title: 'Consultar IA', text: 'Puedes también consultar el Asistente IA sobre el listado de jugadores con datos anonimizados: distribución por posición, por equipo, posiciones con déficit, jugadores sin dorsal y mucho más.', audioFile: 'ij_03.mp3', targetSelector: '[data-tutorial="ij-consultar-ia"]', position: 'left' },
      { id: 'ij-toolbar', title: 'Barra de controles', text: 'En la barra superior tienes los controles. Busca por nombre o datos, filtra por equipo, exporta la tabla a Excel y personaliza los campos visibles con Campos personalizados.', audioFile: 'ij_04.mp3', targetSelector: '[data-tutorial="ij-toolbar"]', position: 'bottom' },
      { id: 'ij-tabla', title: 'Tabla de jugadores', text: 'Y aquí ves la tabla completa de jugadores. Cada fila muestra foto, nombre, equipo con opciones de mover o cambiar temporada, fecha de nacimiento, teléfono, DNI, documentos, datos del padre o madre e IBAN.', audioFile: 'ij_05.mp3', targetSelector: '[data-tutorial="ij-tabla"]', position: 'left' },
      { id: 'ij-modal-jugador', title: 'Información del jugador', text: 'Al hacer clic en el nombre de un jugador se abre su ficha completa: información personal, datos financieros si aplica, documentos, DNI y campos personalizados.', audioFile: 'ij_06.mp3', targetSelector: '[data-tutorial="ij-tabla"]', position: 'left' },
      { id: 'ij-panel-ia', title: 'Panel Asistente IA', text: 'El panel del Asistente IA incluye sugerencias rápidas, historial de mensajes y un área de consulta. Pulsa Intro para enviar y Shift más Intro para añadir una nueva línea.', audioFile: 'ij_07.mp3', targetSelector: '[data-tutorial="ij-panel-ia"]', position: 'left' },
      { id: 'ij-fin', title: 'Listo', text: 'Ya conoces Info Jugadores. Usa la búsqueda y los filtros, exporta a Excel, personaliza columnas y haz clic en cualquier nombre para ver la ficha completa.', audioFile: 'ij_08.mp3', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial de Info Entrenadores (cuadro de mandos). */
  private getInfoEntrenadoresSteps(): TutorialStep[] {
    return [
      { id: 'ie-bienvenida', title: 'Info Entrenadores', text: 'Aquí consultas y gestionas el perfil de cada entrenador del club: datos personales, rol, equipos asignados, certificados obligatorios, documentos e historial deportivo.', audioFile: 'ie_01.mp3', position: 'bottom' },
      { id: 'ie-volver', title: 'Volver', text: 'Antes de continuar, recuerda que este botón te devuelve al cuadro de mandos del club.', audioFile: 'ie_02.mp3', targetSelector: '[data-tutorial="ie-volver"]', position: 'bottom' },
      { id: 'ie-consultar-ia', title: 'Consultar IA', text: 'También puedes consultar la IA sobre el cuerpo técnico con datos anonimizados: total de entrenadores, equipos con entrenador asignado, distribución de perfiles y equipos sin entrenador.', audioFile: 'ie_03.mp3', targetSelector: '[data-tutorial="ie-consultar-ia"]', position: 'left' },
      { id: 'ie-toolbar', title: 'Barra de controles', text: 'En la barra superior selecciona la temporada, busca por nombre, filtra por equipo, exporta a Excel y configura los campos personalizados visibles en la tabla.', audioFile: 'ie_04.mp3', targetSelector: '[data-tutorial="ie-toolbar"]', position: 'bottom' },
      { id: 'ie-tabla', title: 'Tabla de entrenadores', text: 'Y aquí ves la tabla de entrenadores con columnas ordenables: nombre, rol, equipos, email, teléfono, DNI, certificados, documentos y campos personalizados. Pulsa en el nombre de un entrenador para ver su ficha completa.', audioFile: 'ie_05.mp3', targetSelector: '[data-tutorial="ie-tabla"]', position: 'left' },
      { id: 'ie-panel-ia', title: 'Panel Asistente IA', text: 'El panel del Asistente IA incluye sugerencias sobre el cuerpo técnico, historial de mensajes y un área de consulta para preguntas más específicas.', audioFile: 'ie_06.mp3', targetSelector: '[data-tutorial="ie-panel-ia"]', position: 'left' },
      { id: 'ie-fin', title: 'Listo', text: 'Ya conoces Info Entrenadores. Ordena por cualquier columna, abre la ficha pulsando el nombre y usa el panel IA para análisis del cuerpo técnico.', audioFile: 'ie_07.mp3', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial de Estadísticas Jugadores Club. */
  private getEstadisticasJugadoresClubSteps(): TutorialStep[] {
    return [
      { id: 'ej-bienvenida', title: 'Estadísticas Jugadores', text: 'Aquí tienes las métricas de rendimiento de todos los jugadores del club: partidos jugados, minutos, goles, asistencias, penaltis y tarjetas. Todas las columnas son ordenables e incluye un panel de consultas con IA.', audioFile: 'ej_01.mp3', position: 'bottom' },
      { id: 'ej-volver', title: 'Volver', text: 'Antes de continuar, recuerda que este botón te devuelve al cuadro de mandos del club.', audioFile: 'ej_02.mp3', targetSelector: '[data-tutorial="ej-volver"]', position: 'bottom' },
      { id: 'ej-consultar-ia', title: 'Consultar IA', text: 'Para análisis más profundos, abre el panel IA y pregunta por el goleador del club, la gráfica de asistencias, los jugadores con más tarjetas o la media de minutos por partido.', audioFile: 'ej_03.mp3', targetSelector: '[data-tutorial="ej-consultar-ia"]', position: 'left' },
      { id: 'ej-tabla', title: 'Tabla de estadísticas', text: 'Aquí tienes la tabla de estadísticas. Columnas ordenables: nombre, equipo, posición, partidos, minutos totales, media por partido, goles, asistencias, penaltis, tiros libres y tarjetas. Pulsa en el encabezado de cualquier columna para ordenar.', audioFile: 'ej_04.mp3', targetSelector: '[data-tutorial="ej-tabla"]', position: 'left' },
      { id: 'ej-paginacion', title: 'Paginación', text: 'Si hay muchos jugadores, usa la paginación para cambiar el tamaño de página y navegar entre páginas con los botones de avance y retroceso.', audioFile: 'ej_05.mp3', targetSelector: '[data-tutorial="ej-paginacion"]', position: 'top' },
      { id: 'ej-panel-ia', title: 'Panel Asistente IA', text: 'El panel del Asistente IA incluye sugerencias sobre goleadores, asistencias, rendimiento, tarjetas y comparativas. Escribe tu consulta o usa las sugerencias directamente.', audioFile: 'ej_06.mp3', targetSelector: '[data-tutorial="ej-panel-ia"]', position: 'left' },
      { id: 'ej-fin', title: 'Listo', text: 'Ya conoces las estadísticas de jugadores. Ordena por cualquier métrica para encontrar los mejores rendimientos y usa el panel IA para análisis más detallados.', audioFile: 'ej_07.mp3', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial de Estadísticas Equipos Club. */
  private getEstadisticasEquiposClubSteps(): TutorialStep[] {
    return [
      { id: 'ee-bienvenida', title: 'Estadísticas Equipos', text: 'Aquí ves las métricas de rendimiento de todos los equipos del club: posición, partidos jugados, puntos, victorias, empates, derrotas, goles a favor y en contra y últimos resultados. Pulsa en un equipo para ver el detalle de sus partidos.', audioFile: 'ee_01.mp3', position: 'bottom' },
      { id: 'ee-volver', title: 'Volver', text: 'Antes de continuar, recuerda que este botón te devuelve al cuadro de mandos del club.', audioFile: 'ee_02.mp3', targetSelector: '[data-tutorial="ee-volver"]', position: 'bottom' },
      { id: 'ee-consultar-ia', title: 'Consultar IA', text: 'Para análisis más profundos, abre el panel IA y pregunta por el equipo con más victorias, la gráfica de puntos, el rendimiento general o la comparativa de goles entre equipos.', audioFile: 'ee_03.mp3', targetSelector: '[data-tutorial="ee-consultar-ia"]', position: 'left' },
      { id: 'ee-cabecera', title: 'Cabecera y leyenda', text: 'En la cabecera tienes el número total de equipos y la leyenda de colores que indica Victoria, Empate o Derrota, para interpretar la columna de últimos resultados de cada equipo.', audioFile: 'ee_04.mp3', targetSelector: '[data-tutorial="ee-cabecera"]', position: 'bottom' },
      { id: 'ee-tabla', title: 'Tabla de equipos', text: 'Y aquí ves la tabla completa de equipos. Verás posición, categoría, partidos jugados, puntos, victorias, empates, derrotas, goles a favor, goles en contra, diferencia y última racha. Las tres primeras posiciones destacan con estilo podio.', audioFile: 'ee_05.mp3', targetSelector: '[data-tutorial="ee-tabla"]', position: 'left' },
      { id: 'ee-panel-ia', title: 'Panel Asistente IA', text: 'El panel del Asistente IA incluye sugerencias sobre estadísticas de equipos y un área de consulta para preguntas más específicas sobre el rendimiento del club.', audioFile: 'ee_06.mp3', targetSelector: '[data-tutorial="ee-panel-ia"]', position: 'left' },
      { id: 'ee-fin', title: 'Listo', text: 'Ya conoces las estadísticas de equipos. Haz clic en cualquier equipo para ver el detalle de sus partidos en el modal.', audioFile: 'ee_07.mp3', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial de Calendario Club. */
  private getCalendarioClubSteps(): TutorialStep[] {
    return [
      { id: 'cal-bienvenida', title: 'Calendario Club', text: 'Aquí tienes la vista mensual de partidos y entrenamientos de todos los equipos del club. Filtra por equipo con los chips, navega entre meses y pulsa en un día o en un evento para ver el detalle.', audioFile: 'cal_01.mp3', position: 'bottom' },
      { id: 'cal-volver', title: 'Volver', text: 'Antes de continuar, recuerda que este botón te devuelve al cuadro de mandos del club.', audioFile: 'cal_02.mp3', targetSelector: '[data-tutorial="cal-volver"]', position: 'bottom' },
      { id: 'cal-filtro', title: 'Filtro de equipos', text: 'Empecemos por el filtro de equipos. Cada chip corresponde a un equipo; el color y el icono de ojo indican si está visible. Pulsa en un chip para mostrarlo u ocultarlo, o usa los botones de mostrar y ocultar todos.', audioFile: 'cal_03.mp3', targetSelector: '[data-tutorial="cal-filtro"]', position: 'bottom' },
      { id: 'cal-nav', title: 'Navegación del mes', text: 'Para navegar entre meses usa las flechas de anterior y siguiente. El botón Hoy te lleva directamente al mes actual.',  audioFile: 'cal_04.mp3', targetSelector: '[data-tutorial="cal-nav"]', position: 'bottom' },
      { id: 'cal-grid', title: 'Calendario y leyenda', text: 'Y aquí tienes el calendario en sí. Los puntos de color indican eventos; los de forma de pesa son entrenamientos y los de forma de balón son partidos. Pulsa en una celda para abrir el panel del día.', audioFile: 'cal_05.mp3', targetSelector: '[data-tutorial="cal-grid"]', position: 'left' },
      { id: 'cal-panel-dia', title: 'Panel del día', text: 'Al pulsar en cualquier día se abre el panel lateral con todos los eventos de ese día agrupados por equipo. Cada evento puede abrirse para ver sus detalles completos.', audioFile: 'cal_06.mp3', targetSelector: '[data-tutorial="cal-panel-dia"]', position: 'left' },
      { id: 'cal-fin', title: 'Listo', text: 'Ya conoces el Calendario del club. Filtra los equipos que quieras ver, navega entre meses y pulsa en cualquier día o evento para acceder a todos los detalles.', audioFile: 'cal_07.mp3', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Menu Club: una opción por paso, sin omitir ninguna. */
  private getMenuClubSteps(): TutorialStep[] {
    return [
      { id: 'mc-bienvenida', title: 'Menú del equipo', text: 'Desde aquí accedes a todas las secciones del equipo. Cada tarjeta te lleva a una pantalla distinta con información y herramientas específicas.', audioFile: 'mc_01.mp3', position: 'bottom' },
      { id: 'mc-volver', title: 'Volver', text: 'Si en algún momento quieres volver atrás, este botón te lleva a la pantalla anterior.', audioFile: 'mc_02.mp3', targetSelector: '[data-tutorial="mc-volver"]', position: 'bottom' },
      { id: 'mc-calendar', title: 'Calendario', text: 'Empecemos por el Calendario: aquí ves todos los partidos y entrenamientos del equipo organizados por fecha.', audioFile: 'mc_03.mp3', targetSelector: '[data-tutorial="mc-calendar"]', position: 'bottom' },
      { id: 'mc-players', title: 'Jugadores', text: 'Continuamos con Jugadores, donde tienes el listado completo con la información de cada jugador del equipo.', audioFile: 'mc_04.mp3', targetSelector: '[data-tutorial="mc-players"]', position: 'bottom' },
      { id: 'mc-stats-players', title: 'Estadísticas jugadores', text: 'Después tienes las Estadísticas de jugadores: goles, asistencias, minutos y mucho más para analizar el rendimiento individual.', audioFile: 'mc_05.mp3', targetSelector: '[data-tutorial="mc-stats-players"]', position: 'bottom' },
      { id: 'mc-stats-team', title: 'Estadísticas equipo', text: 'Y también las Estadísticas del equipo, con los puntos acumulados, victorias, empates, derrotas y goles a favor y en contra.', audioFile: 'mc_06.mp3', targetSelector: '[data-tutorial="mc-stats-team"]', position: 'bottom' },
      { id: 'mc-ranking', title: 'Ranking y resultados', text: 'Pasamos a Ranking y resultados, donde consultas la clasificación actual y el historial de partidos del equipo.', audioFile: 'mc_07.mp3', targetSelector: '[data-tutorial="mc-ranking"]', position: 'bottom' },
      { id: 'mc-gallery', title: 'Galería', text: 'Siguiente, la Galería: fotos y momentos del equipo que puedes compartir con jugadores y familias.', audioFile: 'mc_08.mp3', targetSelector: '[data-tutorial="mc-gallery"]', position: 'bottom' },
      { id: 'mc-team-info', title: 'Info equipo', text: 'También tienes Info del equipo, con toda la información general: nombre, categoría, liga y horarios.', audioFile: 'mc_09.mp3', targetSelector: '[data-tutorial="mc-team-info"]', position: 'bottom' },
      { id: 'mc-injuries', title: 'Lesiones', text: 'Y para cerrar el menú, Lesiones: registra y haz seguimiento del estado de recuperación de los jugadores lesionados.', audioFile: 'mc_10.mp3', targetSelector: '[data-tutorial="mc-injuries"]', position: 'bottom' },
      { id: 'mc-fin', title: 'Listo', text: 'Ya conoces todas las opciones del menú del equipo. Pulsa en cualquier tarjeta para entrar en esa sección cuando lo necesites.', audioFile: 'mc_11.mp3', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Menu Entrenador: una opción por paso, sin omitir ninguna. */
  private getMenuEntrenadorSteps(): TutorialStep[] {
    return [
      { id: 'me-bienvenida', title: 'Menú entrenador', text: 'Este es tu panel como entrenador. Desde aquí accedes a todo lo que necesitas: calendario, tareas, jugadores, estadísticas, notificaciones, galería, lesiones, asistente IA, debrief, perfil, documentos y análisis de vídeo.', audioFile: 'me_01.mp3', position: 'bottom' },
      { id: 'me-volver', title: 'Volver', text: 'Si en algún momento quieres volver atrás, este botón te lleva a la pantalla anterior.', audioFile: 'me_02.mp3', targetSelector: '[data-tutorial="me-volver"]', position: 'bottom' },
      { id: 'me-calendar', title: 'Calendario', text: 'Empecemos por el Calendario: aquí tienes todos los entrenamientos y partidos del equipo organizados por fecha.', audioFile: 'me_03.mp3', targetSelector: '[data-tutorial="me-calendar"]', position: 'bottom' },
      { id: 'me-tasks', title: 'Tareas', text: 'Continuamos con Tareas, donde diseñas y gestionas las sesiones de entrenamiento: ejercicios, objetivos y planificación táctica.', audioFile: 'me_04.mp3', targetSelector: '[data-tutorial="me-tasks"]', position: 'bottom' },
      { id: 'me-players', title: 'Jugadores', text: 'Siguiente, Jugadores: el listado completo con la información de cada jugador del equipo.', audioFile: 'me_05.mp3', targetSelector: '[data-tutorial="me-players"]', position: 'bottom' },
      { id: 'me-team-info', title: 'Info equipo', text: 'Pasamos a Info del equipo, con toda la información general: nombre, categoría, liga, horarios y plantilla.', audioFile: 'me_06.mp3', targetSelector: '[data-tutorial="me-team-info"]', position: 'bottom' },
      { id: 'me-team-stats', title: 'Estadísticas equipo', text: 'También tienes las Estadísticas del equipo: victorias, empates, derrotas, goles y la evolución del rendimiento colectivo.', audioFile: 'me_07.mp3', targetSelector: '[data-tutorial="me-team-stats"]', position: 'bottom' },
      { id: 'me-player-stats', title: 'Estadísticas jugadores', text: 'Y las Estadísticas de jugadores, con métricas individuales como goles, asistencias, minutos jugados y mucho más.', audioFile: 'me_08.mp3', targetSelector: '[data-tutorial="me-player-stats"]', position: 'bottom' },
      { id: 'me-rankings', title: 'Rankings', text: 'Seguimos con Rankings: la clasificación del equipo en la competición y el historial de resultados.', audioFile: 'me_09.mp3', targetSelector: '[data-tutorial="me-rankings"]', position: 'bottom' },
      { id: 'me-notifications', title: 'Notificaciones', text: 'Ahora las Notificaciones: tu centro de mensajes y avisos del club y de los jugadores del equipo.', audioFile: 'me_10.mp3', targetSelector: '[data-tutorial="me-notifications"]', position: 'bottom' },
      { id: 'me-gallery', title: 'Galería', text: 'Pasamos a la Galería: fotos y momentos del equipo que puedes compartir con jugadores y familias.', audioFile: 'me_11.mp3', targetSelector: '[data-tutorial="me-gallery"]', position: 'bottom' },
      { id: 'me-injuries', title: 'Lesiones', text: 'También tienes Lesiones para registrar y hacer seguimiento del estado de recuperación de cada jugador.', audioFile: 'me_12.mp3', targetSelector: '[data-tutorial="me-injuries"]', position: 'bottom' },
      { id: 'me-ai-assistant', title: 'Asistente IA', text: 'Y el Asistente IA: un chat de inteligencia artificial para consultar datos del equipo, pedir análisis o resolver dudas al instante.', audioFile: 'me_13.mp3', targetSelector: '[data-tutorial="me-ai-assistant"]', position: 'bottom' },
      { id: 'me-debrief', title: 'Historial debrief', text: 'Siguiente, el Historial de debrief: reuniones y análisis post-partido guardados para revisarlos cuando quieras.', audioFile: 'me_14.mp3', targetSelector: '[data-tutorial="me-debrief"]', position: 'bottom' },
      { id: 'me-coach-profile', title: 'Perfil entrenador', text: 'Pasamos a tu Perfil: aquí tienes y editas tus datos personales como entrenador.', audioFile: 'me_15.mp3', targetSelector: '[data-tutorial="me-coach-profile"]', position: 'bottom' },
      { id: 'me-coach-documents', title: 'Documentos entrenador', text: 'Y tus Documentos: todos los archivos y certificados vinculados a tu perfil de entrenador.', audioFile: 'me_16.mp3', targetSelector: '[data-tutorial="me-coach-documents"]', position: 'bottom' },
      { id: 'me-video-analysis', title: 'Análisis de vídeo', text: 'Y para terminar, Análisis de vídeo: etiqueta jugadas de tus partidos o entrenamientos y crea playlists para compartir con el equipo.', audioFile: 'me_17.mp3', targetSelector: '[data-tutorial="me-video-analysis"]', position: 'bottom' },
      { id: 'me-fin', title: 'Listo', text: 'Ya conoces todas las opciones del menú del entrenador. Tienes todo lo que necesitas para gestionar tu equipo en un solo lugar.', audioFile: 'me_18.mp3', position: 'bottom' }
    ];
  }

  /** Pasos del tutorial Opciones Jugador: una opción por paso, sin omitir ninguna. */
  private getOpcionesjugadorSteps(): TutorialStep[] {
    return [
      { id: 'oj-bienvenida', title: 'Opciones del jugador', text: 'Desde aquí el jugador accede a todo lo que necesita: datos personales, calendario, cuotas, documentación, clasificación, estadísticas, galería, notificaciones, patrocinadores, lesiones y ropa.', audioFile: 'oj_01.mp3', position: 'bottom' },
      { id: 'oj-volver', title: 'Volver', text: 'Si en algún momento quieres volver atrás, este botón te lleva a la pantalla anterior.', audioFile: 'oj_02.mp3', targetSelector: '[data-tutorial="oj-volver"]', position: 'bottom' },
      { id: 'oj-datos-personales', title: 'Datos personales', text: 'Empecemos por los Datos personales: aquí el jugador consulta y edita su información personal como nombre, fecha de nacimiento, posición y contacto.', audioFile: 'oj_03.mp3', targetSelector: '[data-tutorial="oj-datos-personales"]', position: 'bottom' },
      { id: 'oj-calendario', title: 'Calendario', text: 'Continuamos con el Calendario: el jugador ve todos sus entrenamientos y partidos organizados por fecha.', audioFile: 'oj_04.mp3', targetSelector: '[data-tutorial="oj-calendario"]', position: 'bottom' },
      { id: 'oj-pagar-cuotas', title: 'Pagar cuotas', text: 'Pasamos a Pagar cuotas, donde el jugador o la familia gestiona y abona las cuotas del club de forma segura.', audioFile: 'oj_05.mp3', targetSelector: '[data-tutorial="oj-pagar-cuotas"]', position: 'bottom' },
      { id: 'oj-documentacion', title: 'Documentación', text: 'Siguiente, la Documentación: todos los archivos y documentos del jugador que el club puede solicitar.', audioFile: 'oj_06.mp3', targetSelector: '[data-tutorial="oj-documentacion"]', position: 'bottom' },
      { id: 'oj-clasificacion', title: 'Clasificación y resultados', text: 'También tienes Clasificación y resultados: el jugador sigue la tabla de su equipo en la competición y consulta los últimos resultados.', audioFile: 'oj_07.mp3', targetSelector: '[data-tutorial="oj-clasificacion"]', position: 'bottom' },
      { id: 'oj-mis-estadisticas', title: 'Mis estadísticas', text: 'Pasamos a Mis estadísticas: goles, asistencias, minutos y otras métricas de rendimiento personal del jugador.', audioFile: 'oj_08.mp3', targetSelector: '[data-tutorial="oj-mis-estadisticas"]', position: 'bottom' },
      { id: 'oj-galeria', title: 'Galería', text: 'Después, la Galería: fotos y momentos del equipo que el jugador puede ver y descargar.', audioFile: 'oj_09.mp3', targetSelector: '[data-tutorial="oj-galeria"]', position: 'bottom' },
      { id: 'oj-notificaciones', title: 'Notificaciones', text: 'Seguimos con Notificaciones: mensajes y avisos del club y del entrenador dirigidos al jugador.', audioFile: 'oj_10.mp3', targetSelector: '[data-tutorial="oj-notificaciones"]', position: 'bottom' },
      { id: 'oj-patrocinadores', title: 'Patrocinadores', text: 'También puedes ver los Patrocinadores del club: logos, información de contacto y beneficios que ofrecen a los jugadores.', audioFile: 'oj_11.mp3', targetSelector: '[data-tutorial="oj-patrocinadores"]', position: 'bottom' },
      { id: 'oj-lesiones', title: 'Lesiones', text: 'Y el registro de Lesiones: el jugador puede consultar su historial de lesiones y el estado de su recuperación.', audioFile: 'oj_12.mp3', targetSelector: '[data-tutorial="oj-lesiones"]', position: 'bottom' },
      { id: 'oj-ropa', title: 'Ropa', text: 'Y para cerrar, la Ropa del club: el catálogo de equipación y la opción de indicar las tallas para que el club lo gestione desde el panel.', audioFile: 'oj_13.mp3', targetSelector: '[data-tutorial="oj-ropa"]', position: 'bottom' },
      { id: 'oj-fin', title: 'Listo', text: 'Ya conoces todas las opciones disponibles para el jugador. Todo lo que necesitas está a un solo toque de distancia.', audioFile: 'oj_14.mp3', position: 'bottom' }
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
