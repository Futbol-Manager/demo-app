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
    this.screens.set('cuadro-de-mandos', this.getCuadroMandosSteps());
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

  // ── Login (5 pasos) ────────────────────────────────────────────────────────

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
