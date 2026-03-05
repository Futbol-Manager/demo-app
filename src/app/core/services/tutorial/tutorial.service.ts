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
