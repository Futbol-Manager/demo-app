import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface TutorialStep {
  id: string;
  title: string;
  text: string;
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

  /** Pasos del tutorial del Cuadro de mandos (vista detallada: opciones + resultados + calendario). */
  private getCuadroMandosSteps(): TutorialStep[] {
    return [
      {
        id: 'cuadro-bienvenida',
        title: 'Cuadro de mandos',
        text: 'Aquí tienes el resumen detallado del club: opciones de acceso rápido a la izquierda (jugadores, entrenadores, estadísticas, calendario) y a la derecha los resultados, entrenamientos de hoy y próximos partidos.',
        position: 'bottom'
      },
      {
        id: 'cuadro-volver',
        title: 'Volver',
        text: 'Pulsa aquí para regresar al inicio del dashboard del club.',
        targetSelector: '[data-tutorial="cuadro-volver"]',
        position: 'bottom'
      },
      {
        id: 'cuadro-jugadores',
        title: 'Info jugadores',
        text: 'Accede al listado completo de jugadores del club: fichas, datos, estadísticas, lesiones, pagos y documentos. Desde ahí puedes crear o editar jugadores.',
        targetSelector: '[data-tutorial="cuadro-jugadores"]',
        position: 'right'
      },
      {
        id: 'cuadro-entrenadores',
        title: 'Info entrenadores',
        text: 'Gestiona el cuerpo técnico: lista de entrenadores, asignación a equipos y datos de contacto.',
        targetSelector: '[data-tutorial="cuadro-entrenadores"]',
        position: 'right'
      },
      {
        id: 'cuadro-stats-jugadores',
        title: 'Estadísticas jugadores',
        text: 'Consulta estadísticas por jugador: goles, asistencias, minutos, tarjetas. Filtra por equipo o temporada.',
        targetSelector: '[data-tutorial="cuadro-stats-jugadores"]',
        position: 'right'
      },
      {
        id: 'cuadro-stats-equipos',
        title: 'Estadísticas equipos',
        text: 'Estadísticas por equipo: clasificación, resultados, goles a favor y en contra. Ideal para ver el rendimiento global del equipo.',
        targetSelector: '[data-tutorial="cuadro-stats-equipos"]',
        position: 'right'
      },
      {
        id: 'cuadro-entrenamientos',
        title: 'Entrenamientos',
        text: 'Módulo de entrenamientos (próximamente). Podrás crear sesiones, tareas y ver el calendario de entrenamientos.',
        targetSelector: '[data-tutorial="cuadro-entrenamientos"]',
        position: 'right'
      },
      {
        id: 'cuadro-calendario',
        title: 'Calendario',
        text: 'Accede al calendario del club: partidos, entrenamientos y eventos. Crea y edita eventos desde la vista mensual o semanal.',
        targetSelector: '[data-tutorial="cuadro-calendario"]',
        position: 'right'
      },
      {
        id: 'cuadro-lesiones',
        title: 'Lesiones',
        text: 'Módulo de lesiones (próximamente). Seguimiento de jugadores lesionados, estado y fecha de recuperación.',
        targetSelector: '[data-tutorial="cuadro-lesiones"]',
        position: 'right'
      },
      {
        id: 'cuadro-resultados',
        title: 'Resultados',
        text: 'Últimos partidos jugados con marcador y estado (victoria, empate, derrota). Pulsa en un partido para ver detalle o editar el resultado.',
        targetSelector: '[data-tutorial="cuadro-resultados"]',
        position: 'left'
      },
      {
        id: 'cuadro-entrenamientos-hoy',
        title: 'Entrenamientos de hoy',
        text: 'Vista del día: entrenamientos programados hoy con horario y equipo. La línea indica la hora actual.',
        targetSelector: '[data-tutorial="cuadro-entrenamientos-hoy"]',
        position: 'left'
      },
      {
        id: 'cuadro-proximos-partidos',
        title: 'Próximos partidos',
        text: 'Partidos próximos con fecha, hora y rival. Pulsa en uno para ver convocatoria o editar datos.',
        targetSelector: '[data-tutorial="cuadro-proximos-partidos"]',
        position: 'left'
      },
      {
        id: 'cuadro-fin',
        title: 'Listo',
        text: 'Ya conoces el cuadro de mandos. Usa las tarjetas de la izquierda para ir a cada módulo y revisa resultados y próximos partidos a la derecha.',
        position: 'bottom'
      }
    ];
  }

  /** Pasos del tutorial del Cuadro de mando (dashboard/inicio) — Club. Basado en sphaira-tutorial.txt */
  private getInicioSteps(): TutorialStep[] {
    return [
      {
        id: 'inicio-bienvenida',
        title: 'Bienvenido al dashboard del club',
        text: 'Esta es tu pantalla principal. Desde aquí accedes al resumen del club y a todos los módulos: equipos, documentos, pagos, ropa, patrocinadores, notificaciones y mucho más. En los siguientes pasos te mostramos cada opción.',
        position: 'bottom'
      },
      {
        id: 'inicio-cuadro',
        title: 'Cuadro de mando',
        text: 'Desde aquí accedes al resumen detallado: equipos, número de jugadores y entrenadores, próximos partidos y entrenamientos de la semana, y alertas (lesiones, pagos pendientes, documentos sin entregar). Pulsa en un equipo o en un partido para ver o editarlo.',
        targetSelector: '[data-tutorial="inicio-cuadro"]',
        position: 'left'
      },
      {
        id: 'inicio-equipos',
        title: 'Equipos',
        text: 'Gestiona todos los equipos del club. Crea categorías, asigna jugadores y entrenadores, y consulta el detalle de cada equipo.',
        targetSelector: '[data-tutorial="inicio-equipos"]',
        position: 'left'
      },
      {
        id: 'inicio-documentos',
        title: 'Documentos',
        text: 'Documentación del club: autorizaciones, contratos, fichas médicas, formularios. Publica documentos y haz seguimiento de las entregas.',
        targetSelector: '[data-tutorial="inicio-documentos"]',
        position: 'left'
      },
      {
        id: 'inicio-pagos',
        title: 'Pagos y cuotas',
        text: 'Consulta el estado de pagos de los jugadores, registra cuotas y configura las cuotas del club. Los jugadores con pagos pendientes aparecen destacados.',
        targetSelector: '[data-tutorial="inicio-pagos"]',
        position: 'left'
      },
      {
        id: 'inicio-ropa',
        title: 'Ropa / Equipación',
        text: 'Gestiona la equipación del club: tabla de jugadores con tallas (camiseta, pantalón, medias). Edita las tallas de cada jugador y haz seguimiento de pedidos.',
        targetSelector: '[data-tutorial="inicio-ropa"]',
        position: 'left'
      },
      {
        id: 'inicio-patrocinadores',
        title: 'Patrocinadores',
        text: 'Administra los patrocinios del club: añade patrocinadores con nombre, importe, fechas y logo. Configura alertas de vencimiento de contratos.',
        targetSelector: '[data-tutorial="inicio-patrocinadores"]',
        position: 'left'
      },
      {
        id: 'inicio-notificaciones',
        title: 'Notificaciones',
        text: 'Bandeja de mensajes: envía notificaciones a equipos, jugadores o todo el club. Redacta, adjunta archivos y programa envíos.',
        targetSelector: '[data-tutorial="inicio-notificaciones"]',
        position: 'left'
      },
      {
        id: 'inicio-staff',
        title: 'Gestión de Staff',
        text: 'Controla quién tiene acceso al panel del club: añade usuarios, asigna permisos por módulo (estadísticas, calendario, documentos, pagos, etc.) y gestiona roles.',
        targetSelector: '[data-tutorial="inicio-staff"]',
        position: 'left'
      },
      {
        id: 'inicio-scouting',
        title: 'Scouting',
        text: 'Sigue jugadores en tu lista de observación. Usa la vista pipeline (Identificado, Observado, Evaluado, Contactado) y añade jugadores desde la base o externos.',
        targetSelector: '[data-tutorial="inicio-scouting"]',
        position: 'left'
      },
      {
        id: 'inicio-biblioteca-videos',
        title: 'Biblioteca de vídeos',
        text: 'Videoteca del club: sube vídeos, añade enlaces de YouTube/Vimeo, organiza en carpetas y consulta el espacio de almacenamiento usado.',
        targetSelector: '[data-tutorial="inicio-biblioteca-videos"]',
        position: 'left'
      },
      {
        id: 'inicio-video-analysis',
        title: 'Análisis de vídeo',
        text: 'Análisis táctico sobre vídeo: crea sesiones de análisis, sube vídeos de partidos o entrenamientos y trabaja en el espacio de trabajo con anotaciones.',
        targetSelector: '[data-tutorial="inicio-video-analysis"]',
        position: 'left'
      },
      {
        id: 'inicio-asistente-ia',
        title: 'Asistente de IA',
        text: 'Asistente disponible en todas las pantallas. Haz preguntas, pide informes o que cree entrenamientos y convocatorias. También accesible desde el botón circular en esquina inferior derecha.',
        targetSelector: '[data-tutorial="inicio-asistente-ia"]',
        position: 'left'
      },
      {
        id: 'inicio-fin',
        title: 'Listo',
        text: 'Ya conoces todas las opciones del cuadro de mando. Usa el menú lateral para navegar en cualquier momento. Si necesitas ayuda, el botón "?" en cada pantalla abre la ayuda específica.',
        position: 'bottom'
      }
    ];
  }

  private getLoginSteps(): TutorialStep[] {
    return [
      {
        id: 'login-welcome',
        title: 'Bienvenido a Sphaira',
        text: 'Desde esta pantalla puedes iniciar sesión en la plataforma. Te guiaremos en unos segundos para que conozcas cada elemento.',
        position: 'bottom'
      },
      {
        id: 'login-email',
        title: 'Correo electrónico',
        text: 'Introduce aquí tu correo electrónico con el que te registraste. En modo demo solo necesitas el correo para acceder.',
        targetSelector: '#mail',
        position: 'bottom'
      },
      {
        id: 'login-password',
        title: 'Contraseña',
        text: 'Si no estás en modo demo, escribe tu contraseña. Puedes mostrar u ocultar la contraseña con el icono del ojo.',
        targetSelector: '#password',
        position: 'top'
      },
      {
        id: 'login-submit',
        title: 'Iniciar sesión',
        text: 'Pulsa este botón para acceder a tu cuenta. Comprueba que el correo y la contraseña sean correctos antes de continuar.',
        targetSelector: '.form-login .btn-custom',
        position: 'top'
      },
      {
        id: 'login-ready',
        title: 'Listo para empezar',
        text: 'Con el correo (y la contraseña si no estás en modo demo) rellenados, pulsa "Iniciar sesión" para acceder a tu panel.',
        position: 'top'
      }
    ];
  }

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
