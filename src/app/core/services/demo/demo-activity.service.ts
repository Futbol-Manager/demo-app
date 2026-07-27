import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { DemoService } from './demo.service';
import { DemoAnalyticsService } from './demo-analytics.service';

export interface DemoVisit {
  route: string;
  section?: string;
  seconds: number;
}

export interface DemoActivitySummary {
  totalSeconds: number;
  visits: DemoVisit[];
  topScreens: DemoVisit[];
}

export interface DemoLeadPayload {
  email: string;
  phone?: string;
  demoRole: string;
  activitySummary: DemoActivitySummary;
}

/** Clave de sessionStorage donde se guarda el teléfono capturado al acceder a la demo. */
const SESSION_KEY_PHONE = 'demoPhone';

/** Normaliza la URL del router a un nombre de pantalla legible */
function routeToScreenName(url: string): string {
  if (!url || url === '/') return 'inicio';
  const path = url.replace(/^\//, '').split('?')[0];
  const segments = path.split('/').filter(Boolean);
  if (segments[0] === 'dashboard' && segments[1]) return segments[1];
  if (segments[0] === 'demo-role') return 'demo-role';
  return path || 'inicio';
}


@Injectable({ providedIn: 'root' })
export class DemoActivityService {
  private completedVisits: DemoVisit[] = [];
  private currentRoute    = '';
  private currentSection: string | undefined;
  /** Timestamp en ms del momento en que se inició la visita activa */
  private currentStartTime = 0;
  /** Acumulado de ms que la pestaña estuvo oculta durante la visita activa */
  private hiddenMs = 0;
  /** Momento en que la pestaña se ocultó (undefined si está visible) */
  private hiddenSince: number | undefined;

  private routerSub?: { unsubscribe: () => void };
  private visibilityHandler?: () => void;
  private unloadHandler?: () => void;
  /** Evita enviar el lead dos veces si se disparan pagehide y beforeunload. */
  private beaconSent = false;
  private readonly TOP_N = 5;

  constructor(
    private router: Router,
    private http: HttpClient,
    private demoService: DemoService,
    private demoAnalytics: DemoAnalyticsService,
  ) {}

  /** Inicializa el tracking (solo en modo demo). Llamar una vez desde AppComponent. */
  init(): void {
    if (!this.demoService.isDemoMode()) return;

    this.currentRoute     = routeToScreenName(this.router.url);
    this.currentSection   = undefined;
    this.currentStartTime = Date.now();
    this.hiddenMs         = 0;
    this.hiddenSince      = undefined;

    // ── Cambio de ruta ────────────────────────────────────────────────────────
    this.routerSub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.endCurrentVisit();
        this.currentRoute     = routeToScreenName(event.urlAfterRedirects);
        this.currentSection   = undefined;
        this.currentStartTime = Date.now();
        this.hiddenMs         = 0;
        this.demoAnalytics.track('demo_screen_view', {
          screen: this.currentRoute,
          screens_seen: this.completedVisits.length + 1,
        });
      }
    });

    // ── Visibilidad de pestaña: pausar/reanudar cronómetro ────────────────────
    this.visibilityHandler = () => {
      if (document.hidden) {
        // Pestaña pasa a segundo plano → anotar cuándo
        this.hiddenSince = Date.now();
      } else {
        // Pestaña vuelve a primer plano → acumular tiempo oculto
        if (this.hiddenSince !== undefined) {
          this.hiddenMs   += Date.now() - this.hiddenSince;
          this.hiddenSince = undefined;
        }
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);

    // ── Cierre de pestaña ─────────────────────────────────────────────────────
    // Sin esto el lead solo se guardaba al pulsar "cerrar sesión", que casi nadie
    // hace: la mayoría cierra la pestaña y se perdía la visita entera.
    this.unloadHandler = () => this.submitLeadBeacon();
    window.addEventListener('pagehide', this.unloadHandler);
    window.addEventListener('beforeunload', this.unloadHandler);
  }

  /** Notifica pausa forzada (p. ej. cuando InactivityService detecta 5 min sin actividad). */
  pauseTracking(): void {
    this.endCurrentVisit();
    // Congelar el cronómetro: la próxima acción del usuario reiniciará desde 0
    this.currentStartTime = 0;
  }

  /** Reanuda el cronómetro tras una pausa forzada. */
  resumeTracking(): void {
    if (!this.demoService.isDemoMode()) return;
    this.currentStartTime = Date.now();
    this.hiddenMs         = 0;
  }

  /** Indica cambio de sección dentro de la misma ruta. */
  setSection(section: string): void {
    if (!this.demoService.isDemoMode()) return;
    this.endCurrentVisit();
    this.currentSection   = section;
    this.currentStartTime = Date.now();
    this.hiddenMs         = 0;
  }

  private endCurrentVisit(): void {
    if (!this.currentRoute || this.currentStartTime === 0) return;

    // Si la pestaña aún está oculta, acumular el tiempo hasta ahora
    let extraHidden = 0;
    if (this.hiddenSince !== undefined) {
      extraHidden      = Date.now() - this.hiddenSince;
      this.hiddenSince = undefined;
    }

    const elapsedMs  = Date.now() - this.currentStartTime;
    const activeMs   = Math.max(0, elapsedMs - this.hiddenMs - extraHidden);
    const seconds = Math.round(activeMs / 1000);

    if (seconds > 0) {
      this.completedVisits.push({
        route:   this.currentRoute,
        section: this.currentSection,
        seconds,
      });
    }

    this.hiddenMs = 0;
  }

  /**
   * Devuelve el resumen de actividad SIN modificar el estado interno.
   * (No llama a endCurrentVisit para evitar duplicados si se invoca varias veces.)
   */
  getActivitySummary(): DemoActivitySummary {
    // Snapshot de la visita en curso sin cerrarla definitivamente
    const currentVisitSnapshot = this.buildCurrentVisitSnapshot();
    const visits = [...this.completedVisits, ...currentVisitSnapshot];

    const totalSeconds = visits.reduce((sum, v) => sum + v.seconds, 0);

    const byKey = new Map<string, DemoVisit>();
    for (const v of visits) {
      const key = v.section ? `${v.route}:${v.section}` : v.route;
      const existing = byKey.get(key);
      if (!existing) byKey.set(key, { ...v });
      else existing.seconds += v.seconds;
    }
    const topScreens = Array.from(byKey.values())
      .sort((a, b) => b.seconds - a.seconds)
      .slice(0, this.TOP_N);

    return { totalSeconds, visits, topScreens };
  }

  /** Cierra definitivamente la visita activa y la añade a completedVisits. */
  finalizeAndSubmit(): void {
    this.endCurrentVisit();
    this.currentStartTime = 0; // no volver a contabilizar
  }

  private buildCurrentVisitSnapshot(): DemoVisit[] {
    if (!this.currentRoute || this.currentStartTime === 0) return [];

    let extraHidden = 0;
    if (this.hiddenSince !== undefined) {
      extraHidden = Date.now() - this.hiddenSince;
    }
    const elapsedMs = Date.now() - this.currentStartTime;
    const activeMs  = Math.max(0, elapsedMs - this.hiddenMs - extraHidden);
    const seconds = Math.round(activeMs / 1000);

    if (seconds <= 0) return [];
    return [{ route: this.currentRoute, section: this.currentSection, seconds }];
  }

  /**
   * Envía el correo y la actividad al endpoint configurado.
   */
  submitLead(email: string): Observable<{ success: boolean; message?: string }> {
    this.finalizeAndSubmit(); // cerrar visita activa antes de enviar
    this.beaconSent = true;   // el cierre de pestaña ya no debe reenviarlo

    const baseUrl = (environment as { demoLeadApiUrl?: string }).demoLeadApiUrl;
    if (!baseUrl) {
      return of({ success: false, message: 'Endpoint de demo no configurado' });
    }
    const url = `${baseUrl.replace(/\/$/, '')}/public/demo-lead`;
    const role = this.demoService.getDemoRole();
    const phone = (sessionStorage.getItem(SESSION_KEY_PHONE) || '').trim();
    const payload: DemoLeadPayload = {
      email:           email.trim(),
      demoRole:        role || '',
      activitySummary: this.getActivitySummary(),
    };
    if (phone) payload.phone = phone;
    return this.http.post<{ status?: number; data?: unknown; error?: { msg?: string } }>(url, payload).pipe(
      map((res) => {
        if (res.status === 200) return { success: true };
        return { success: false, message: (res.error && res.error.msg) || 'Error al enviar' };
      }),
      catchError((err) => {
        const msg = err.error?.error?.msg || err.message || 'Error de conexión';
        return of({ success: false, message: msg });
      })
    );
  }

  /**
   * Envía el lead al cerrar la pestaña usando `sendBeacon`, que el navegador
   * garantiza aunque el documento se esté destruyendo (una petición HTTP normal
   * se cancelaría). Silencioso: si no hay email todavía, no hay nada que guardar.
   */
  submitLeadBeacon(): void {
    if (this.beaconSent || !this.demoService.isDemoMode()) return;

    const email = this.resolveEmail();
    if (!email) return;

    const baseUrl = (environment as { demoLeadApiUrl?: string }).demoLeadApiUrl;
    if (!baseUrl || typeof navigator === 'undefined' || !navigator.sendBeacon) return;

    this.finalizeAndSubmit();

    const phone = (sessionStorage.getItem(SESSION_KEY_PHONE) || '').trim();
    const payload: DemoLeadPayload = {
      email,
      demoRole:        this.demoService.getDemoRole() || '',
      activitySummary: this.getActivitySummary(),
    };
    if (phone) payload.phone = phone;

    try {
      const url = `${baseUrl.replace(/\/$/, '')}/public/demo-lead`;
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      this.beaconSent = navigator.sendBeacon(url, blob);
      this.demoAnalytics.track('demo_session_end', {
        total_seconds: payload.activitySummary.totalSeconds,
        screens_seen: payload.activitySummary.visits.length,
        top_screen: payload.activitySummary.topScreens[0]?.route ?? 'none',
      });
    } catch {
      // El navegador puede rechazar el beacon durante la descarga; no hay reintento posible.
    }
  }

  /** Email del visitante: el del usuario demo logueado o el capturado en la entrada. */
  private resolveEmail(): string {
    try {
      const raw = localStorage.getItem('usuario');
      if (raw) {
        const user = JSON.parse(raw);
        const mail = user && user.mail ? String(user.mail).trim() : '';
        if (mail) return mail;
      }
    } catch {
      // usuario corrupto en localStorage: caemos al email de sesión
    }
    return (sessionStorage.getItem('demoEmail') || '').trim();
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
    if (this.unloadHandler) {
      window.removeEventListener('pagehide', this.unloadHandler);
      window.removeEventListener('beforeunload', this.unloadHandler);
    }
  }
}
