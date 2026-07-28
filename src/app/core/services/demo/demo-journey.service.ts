import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { BehaviorSubject, Subscription } from 'rxjs';
import { DEMO_IDS, DemoRole, DemoService } from './demo.service';
import { DemoAnalyticsService } from './demo-analytics.service';

/** Un hito del recorrido: una pantalla concreta que demuestra un beneficio del producto. */
export interface JourneyMilestone {
  id: string;
  /** Clave i18n del título corto (DEMO_JOURNEY.<KEY>_TITLE) */
  key: string;
  /** Icono de Bootstrap Icons */
  icon: string;
  /** Comandos de router para llegar al hito */
  route: any[];
  /** Fragmento que debe contener la URL para dar el hito por visto */
  urlMatch: string;
  done: boolean;
}

const STORAGE_KEY = 'demoJourneyDone';
const STORAGE_KEY_HIDDEN = 'demoJourneyHidden';
const STORAGE_KEY_OFFER_SEEN = 'demoJourneyOfferSeen';

/**
 * Segundos que el visitante debe permanecer en la pantalla para que el hito cuente.
 * Sin esta espera, atravesar una sección de camino a otra la marcaba como vista
 * y el recorrido se completaba sin que hubiera entendido nada.
 */
const DWELL_SECONDS = 5;

/**
 * Hitos necesarios para que la oferta salte sola. Exigir el recorrido completo dejaba
 * la oferta fuera del alcance de casi todos: quien se cansaba a la mitad no la veía
 * nunca. Con tres de cinco ya ha visto lo suficiente para que tenga sentido.
 */
const OFFER_MILESTONES = 3;

/** Nada de ofertas en el primer medio minuto: interrumpe justo cuando está entendiendo. */
const OFFER_MIN_SECONDS = 30;

/** Segundos fuera de la pestaña a partir de los cuales la vuelta se considera un regreso. */
const RETURN_AWAY_SECONDS = 20;

/** Ancho a partir del cual asumimos ratón y por tanto podemos detectar el abandono. */
const POINTER_BREAKPOINT = 768;

/** Origen del que parte la apertura de la oferta, para medir qué disparador convierte. */
export type OfferSource =
  | 'journey'
  | 'manual'
  | 'exit_intent'
  | 'return_visit'
  | 'pricing_intent';

/** Rutas que solo se visitan con intención de contratar. */
const PRICING_URLS = ['/dashboard/suscripcion', '/dashboard/planes'];

/**
 * Recorrido guiado de la demo: los hitos de cada perfil llevan al visitante a las
 * pantallas que de verdad venden el producto, mezclando gestión y parte deportiva, con
 * progreso visible.
 *
 * La oferta Club Fundador se abre sola en cuanto ha visto lo suficiente, cuando parece
 * que va a abandonar o cuando busca los precios; siempre una única vez por sesión, para
 * que llegue después del valor sin convertirse en un modal que persigue al visitante.
 */
@Injectable({ providedIn: 'root' })
export class DemoJourneyService {
  private milestones: JourneyMilestone[] = [];
  private routerSub?: Subscription;
  private dwellTimer?: any;
  private started = false;
  private startedAt = 0;
  private hiddenAt = 0;

  readonly milestones$ = new BehaviorSubject<JourneyMilestone[]>([]);
  readonly visible$ = new BehaviorSubject<boolean>(false);
  readonly offerOpen$ = new BehaviorSubject<boolean>(false);

  constructor(
    private router: Router,
    private demoService: DemoService,
    private demoAnalytics: DemoAnalyticsService,
  ) {}

  /** Arranca el recorrido para el rol activo. Idempotente: se puede llamar en cada entrada. */
  init(): void {
    if (this.started || !this.demoService.isDemoMode()) return;
    this.started = true;
    this.startedAt = Date.now();

    this.milestones = this.buildMilestones(this.demoService.getDemoRole());
    this.restoreProgress();
    this.milestones$.next(this.milestones);
    this.visible$.next(sessionStorage.getItem(STORAGE_KEY_HIDDEN) !== 'true');

    this.routerSub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) this.onNavigation(event.urlAfterRedirects);
    });
    this.onNavigation(this.router.url);
    this.listenForAbandon();
  }

  /**
   * Detecta las dos formas de abandono que podemos ver desde el navegador: el ratón
   * saliendo por el borde superior en escritorio y la vuelta a la pestaña en móvil,
   * donde no existe el gesto anterior.
   */
  private listenForAbandon(): void {
    if (window.innerWidth > POINTER_BREAKPOINT) {
      document.addEventListener('mouseout', this.onMouseOut);
    }
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  private onMouseOut = (event: MouseEvent): void => {
    // Solo cuenta si el puntero sale de la ventana por arriba, hacia la barra del
    // navegador: cualquier otro borde suele ser un movimiento normal.
    if (event.relatedTarget || event.clientY > 0) return;
    this.maybeOpenOffer('exit_intent');
  };

  private onVisibilityChange = (): void => {
    if (document.hidden) {
      this.hiddenAt = Date.now();
      return;
    }
    if (!this.hiddenAt) return;
    const awaySeconds = (Date.now() - this.hiddenAt) / 1000;
    this.hiddenAt = 0;
    if (awaySeconds >= RETURN_AWAY_SECONDS) this.maybeOpenOffer('return_visit');
  };

  /**
   * Abre la oferta si el momento es razonable: una sola vez por sesión, nunca recién
   * entrado, solo dentro del producto y con algún hito ya visto, para que la oferta
   * llegue después del valor y no antes.
   *
   * @param immediate  la intención ya es explícita (ha buscado los precios), así que
   *                   no hace falta esperar ni exigir recorrido previo.
   */
  private maybeOpenOffer(source: OfferSource, immediate = false): boolean {
    if (this.offerOpen$.value || this.offerLocked) return false;
    if (!this.router.url.startsWith('/dashboard')) return false;
    if (!immediate) {
      if ((Date.now() - this.startedAt) / 1000 < OFFER_MIN_SECONDS) return false;
      if (this.completedCount < 1) return false;
    }

    this.openOffer(source);
    return true;
  }

  /**
   * Una vez mostrada la oferta, ya no vuelve a salir sola en la sesión: si la ha visto
   * y la ha cerrado, insistir solo estorba. Los botones de la interfaz siguen abriéndola
   * cuando el visitante quiera.
   */
  private get offerLocked(): boolean {
    return sessionStorage.getItem(STORAGE_KEY_OFFER_SEEN) === 'true';
  }

  private lockOffer(): void {
    sessionStorage.setItem(STORAGE_KEY_OFFER_SEEN, 'true');
  }

  /** Rehace los hitos al cambiar de perfil sin salir de la demo. */
  resetForRole(role: DemoRole | null): void {
    clearTimeout(this.dwellTimer);
    this.milestones = this.buildMilestones(role);
    this.restoreProgress();
    this.milestones$.next(this.milestones);
    this.onNavigation(this.router.url);
  }

  get pending(): JourneyMilestone | undefined {
    return this.milestones.find((m) => !m.done);
  }

  get completedCount(): number {
    return this.milestones.filter((m) => m.done).length;
  }

  get total(): number {
    return this.milestones.length;
  }

  /** Lleva al visitante al hito indicado (o al siguiente pendiente). */
  goTo(milestone?: JourneyMilestone): void {
    const target = milestone ?? this.pending;
    if (!target) return;
    this.demoAnalytics.track('demo_journey_go', { milestone: target.id });
    this.router.navigate(target.route);
  }

  /** Oculta el widget para el resto de la sesión. */
  hide(): void {
    sessionStorage.setItem(STORAGE_KEY_HIDDEN, 'true');
    this.visible$.next(false);
    this.demoAnalytics.track('demo_journey_dismiss', { completed: this.completedCount });
  }

  openOffer(source: OfferSource): void {
    this.lockOffer();
    this.offerOpen$.next(true);
    this.demoAnalytics.track('demo_offer_view', { source, completed: this.completedCount });
  }

  closeOffer(): void {
    this.offerOpen$.next(false);
    this.demoAnalytics.track('demo_offer_close', { completed: this.completedCount });
  }

  private onNavigation(url: string): void {
    clearTimeout(this.dwellTimer);

    // Si ha ido a buscar los precios, la oferta es exactamente lo que quiere ver.
    if (PRICING_URLS.some((u) => url.includes(u))) {
      this.maybeOpenOffer('pricing_intent', true);
    }

    const match = this.milestones.find((m) => !m.done && url.includes(m.urlMatch));
    if (!match) return;
    this.dwellTimer = setTimeout(() => this.complete(match), DWELL_SECONDS * 1000);
  }

  private complete(milestone: JourneyMilestone): void {
    if (milestone.done) return;
    milestone.done = true;
    this.persistProgress();
    this.milestones$.next([...this.milestones]);
    this.demoAnalytics.track('demo_journey_step', {
      milestone: milestone.id,
      completed: this.completedCount,
      total: this.total,
    });

    if (this.completedCount === this.total) {
      this.demoAnalytics.track('demo_journey_complete', { total: this.total });
    }

    const threshold = Math.min(OFFER_MILESTONES, this.total);
    if (this.completedCount >= threshold && !this.offerLocked) {
      this.lockOffer();
      // Margen para que el visitante vea el último check antes del salto a la oferta.
      setTimeout(() => this.openOffer('journey'), 1200);
    }
  }

  private persistProgress(): void {
    const done = this.milestones.filter((m) => m.done).map((m) => m.id);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(done));
  }

  private restoreProgress(): void {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      const done: string[] = raw ? JSON.parse(raw) : [];
      this.milestones.forEach((m) => (m.done = done.includes(m.id)));
    } catch {
      // Progreso corrupto en sessionStorage: se empieza de cero, no es crítico.
    }
  }

  private buildMilestones(role: DemoRole | null): JourneyMilestone[] {
    const { clubId, teamId, playerId } = DEMO_IDS;

    if (role === 'coach') {
      return [
        { id: 'coach_calendar', key: 'COACH_CALENDAR', icon: 'bi-calendar-week', route: ['/dashboard/calendario', teamId, 0], urlMatch: '/dashboard/calendario/', done: false },
        { id: 'coach_tasks',    key: 'COACH_TASKS',    icon: 'bi-clipboard-check', route: ['/dashboard/tareas', teamId], urlMatch: '/dashboard/tareas/', done: false },
        { id: 'coach_board',    key: 'COACH_BOARD',    icon: 'bi-easel', route: ['/dashboard/tactical-board', teamId], urlMatch: '/dashboard/tactical-board/', done: false },
        { id: 'coach_squad',    key: 'COACH_SQUAD',    icon: 'bi-people', route: ['/dashboard/jugadores', teamId], urlMatch: '/dashboard/jugadores/', done: false },
        { id: 'coach_video',    key: 'COACH_VIDEO',    icon: 'bi-play-btn', route: ['/dashboard/video-analysis'], urlMatch: '/dashboard/video-analysis', done: false },
      ];
    }

    if (role === 'player') {
      return [
        { id: 'player_calendar',  key: 'PLAYER_CALENDAR',  icon: 'bi-calendar-week', route: ['/dashboard/calendario', teamId, playerId], urlMatch: '/dashboard/calendario/', done: false },
        { id: 'player_matches',   key: 'PLAYER_MATCHES',   icon: 'bi-trophy', route: ['/dashboard/partidos-entrevistas', teamId, playerId], urlMatch: '/dashboard/partidos-entrevistas/', done: false },
        { id: 'player_fees',      key: 'PLAYER_FEES',      icon: 'bi-credit-card', route: ['/dashboard/cuotas', teamId, playerId], urlMatch: '/dashboard/cuotas/', done: false },
        { id: 'player_documents', key: 'PLAYER_DOCUMENTS', icon: 'bi-folder2-open', route: ['/dashboard/documentos-jugador', teamId, playerId], urlMatch: '/dashboard/documentos-jugador/', done: false },
        { id: 'player_profile',   key: 'PLAYER_PROFILE',   icon: 'bi-person-vcard', route: ['/dashboard/opcionesjugador', teamId, playerId], urlMatch: '/dashboard/opcionesjugador/', done: false },
      ];
    }

    // El club no solo administra: el recorrido pasa por el calendario deportivo y por
    // los ejercicios con pizarra, que es lo que diferencia a Sphaira de una simple
    // herramienta de cobros.
    return [
      { id: 'club_fees',      key: 'CLUB_FEES',      icon: 'bi-cash-coin', route: ['/dashboard/new-cuotas', clubId], urlMatch: '/dashboard/new-cuotas/', done: false },
      { id: 'club_calendar',  key: 'CLUB_CALENDAR',  icon: 'bi-calendar-week', route: ['/dashboard/cuadro-de-mandos/calendario-club', clubId], urlMatch: '/dashboard/cuadro-de-mandos/calendario-club/', done: false },
      { id: 'club_trainings', key: 'CLUB_TRAININGS', icon: 'bi-easel', route: ['/dashboard/entrenamientos-club', clubId], urlMatch: '/dashboard/entrenamientos-club/', done: false },
      { id: 'club_messages',  key: 'CLUB_MESSAGES',  icon: 'bi-megaphone', route: ['/dashboard/notificaciones', clubId], urlMatch: '/dashboard/notificaciones/', done: false },
      { id: 'club_ai',        key: 'CLUB_AI',        icon: 'bi-stars', route: ['/dashboard/asistente-ia'], urlMatch: '/dashboard/asistente-ia', done: false },
    ];
  }

  ngOnDestroy(): void {
    clearTimeout(this.dwellTimer);
    this.routerSub?.unsubscribe();
    document.removeEventListener('mouseout', this.onMouseOut);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }
}
