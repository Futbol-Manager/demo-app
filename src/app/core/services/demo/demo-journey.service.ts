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
 * Recorrido guiado de la demo: cuatro hitos por perfil que llevan al visitante a las
 * pantallas que de verdad venden el producto, con progreso visible. Al completarlo se
 * abre la oferta, de modo que el descuento llega cuando ya ha visto el valor.
 */
@Injectable({ providedIn: 'root' })
export class DemoJourneyService {
  private milestones: JourneyMilestone[] = [];
  private routerSub?: Subscription;
  private dwellTimer?: any;
  private started = false;

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

    this.milestones = this.buildMilestones(this.demoService.getDemoRole());
    this.restoreProgress();
    this.milestones$.next(this.milestones);
    this.visible$.next(sessionStorage.getItem(STORAGE_KEY_HIDDEN) !== 'true');

    this.routerSub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) this.onNavigation(event.urlAfterRedirects);
    });
    this.onNavigation(this.router.url);
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

  openOffer(source: 'journey' | 'manual'): void {
    this.offerOpen$.next(true);
    this.demoAnalytics.track('demo_offer_view', { source, completed: this.completedCount });
  }

  closeOffer(): void {
    this.offerOpen$.next(false);
  }

  private onNavigation(url: string): void {
    clearTimeout(this.dwellTimer);
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

    if (this.completedCount === this.total && sessionStorage.getItem(STORAGE_KEY_OFFER_SEEN) !== 'true') {
      sessionStorage.setItem(STORAGE_KEY_OFFER_SEEN, 'true');
      this.demoAnalytics.track('demo_journey_complete', { total: this.total });
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
        { id: 'coach_squad',    key: 'COACH_SQUAD',    icon: 'bi-people', route: ['/dashboard/jugadores', teamId], urlMatch: '/dashboard/jugadores/', done: false },
        { id: 'coach_video',    key: 'COACH_VIDEO',    icon: 'bi-play-btn', route: ['/dashboard/video-analysis'], urlMatch: '/dashboard/video-analysis', done: false },
      ];
    }

    if (role === 'player') {
      return [
        { id: 'player_fees',      key: 'PLAYER_FEES',      icon: 'bi-credit-card', route: ['/dashboard/cuotas', teamId, playerId], urlMatch: '/dashboard/cuotas/', done: false },
        { id: 'player_calendar',  key: 'PLAYER_CALENDAR',  icon: 'bi-calendar-week', route: ['/dashboard/calendario', teamId, playerId], urlMatch: '/dashboard/calendario/', done: false },
        { id: 'player_documents', key: 'PLAYER_DOCUMENTS', icon: 'bi-folder2-open', route: ['/dashboard/documentos-jugador', teamId, playerId], urlMatch: '/dashboard/documentos-jugador/', done: false },
        { id: 'player_profile',   key: 'PLAYER_PROFILE',   icon: 'bi-person-vcard', route: ['/dashboard/opcionesjugador', teamId, playerId], urlMatch: '/dashboard/opcionesjugador/', done: false },
      ];
    }

    return [
      { id: 'club_fees',     key: 'CLUB_FEES',     icon: 'bi-cash-coin', route: ['/dashboard/new-cuotas', clubId], urlMatch: '/dashboard/new-cuotas/', done: false },
      { id: 'club_squad',    key: 'CLUB_SQUAD',    icon: 'bi-people', route: ['/dashboard/equipos'], urlMatch: '/dashboard/equipos', done: false },
      { id: 'club_messages', key: 'CLUB_MESSAGES', icon: 'bi-megaphone', route: ['/dashboard/notificaciones', clubId], urlMatch: '/dashboard/notificaciones/', done: false },
      { id: 'club_ai',       key: 'CLUB_AI',       icon: 'bi-stars', route: ['/dashboard/asistente-ia'], urlMatch: '/dashboard/asistente-ia', done: false },
    ];
  }

  ngOnDestroy(): void {
    clearTimeout(this.dwellTimer);
    this.routerSub?.unsubscribe();
  }
}
