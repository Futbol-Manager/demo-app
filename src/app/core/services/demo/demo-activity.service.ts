import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { DemoService, DemoRole } from './demo.service';

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
  demoRole: string;
  activitySummary: DemoActivitySummary;
}

/** Normaliza la URL del router a un nombre de pantalla legible para agregación */
function routeToScreenName(url: string): string {
  if (!url || url === '/') return 'inicio';
  const path = url.replace(/^\//, '').split('?')[0];
  const segments = path.split('/').filter(Boolean);
  if (segments[0] === 'dashboard' && segments[1]) return segments[1];
  if (segments[0] === 'demo-role') return 'demo-role';
  return path || 'inicio';
}

@Injectable({
  providedIn: 'root',
})
export class DemoActivityService {
  /** Visitas ya cerradas con su duración en segundos */
  private completedVisits: { route: string; section?: string; seconds: number }[] = [];
  private currentRoute = '';
  private currentSection: string | undefined;
  private currentStartTime = 0;
  private routerSub?: { unsubscribe: () => void };
  private readonly TOP_N = 5;

  constructor(
    private router: Router,
    private http: HttpClient,
    private demoService: DemoService
  ) {}

  /** Inicializa el tracking de actividad (solo en modo demo). Llamar desde AppComponent o similar. */
  init(): void {
    if (!this.demoService.isDemoMode()) return;
    this.currentRoute = routeToScreenName(this.router.url);
    this.currentSection = undefined;
    this.currentStartTime = Date.now();

    this.routerSub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.endCurrentVisit();
        this.currentRoute = routeToScreenName(event.urlAfterRedirects);
        this.currentSection = undefined;
        this.currentStartTime = Date.now();
      }
    });
  }

  /** Opcional: indicar cambio de sección dentro de la misma ruta (p. ej. pestaña Gráficas vs Tabla). */
  setSection(section: string): void {
    if (!this.demoService.isDemoMode()) return;
    this.endCurrentVisit();
    this.currentSection = section;
    this.currentStartTime = Date.now();
  }

  private endCurrentVisit(): void {
    if (!this.currentRoute) return;
    const seconds = Math.round((Date.now() - this.currentStartTime) / 1000);
    if (seconds > 0) {
      this.completedVisits.push({
        route: this.currentRoute,
        section: this.currentSection,
        seconds,
      });
    }
  }

  /** Devuelve el resumen de actividad actual (visitas con duración y top por tiempo). */
  getActivitySummary(): DemoActivitySummary {
    this.endCurrentVisit();
    const visits = [...this.completedVisits];
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

    return {
      totalSeconds,
      visits,
      topScreens,
    };
  }

  /**
   * Envía el correo y la actividad al endpoint configurado (demoLeadApiUrl).
   * Con config "demo" va a producción; con "demo-local" va a http://localhost:8081 para ver datos en tu BD.
   */
  submitLead(email: string): Observable<{ success: boolean; message?: string }> {
    const baseUrl = (environment as { demoLeadApiUrl?: string }).demoLeadApiUrl;
    if (!baseUrl) {
      return of({ success: false, message: 'Endpoint de demo no configurado' });
    }
    const url = `${baseUrl.replace(/\/$/, '')}/public/demo-lead`;
    if (!(environment as { production?: boolean }).production) {
      console.log('[Demo] Enviando lead a:', url, '→ Para guardar en tu BD local usa: ng serve --configuration=demo-local (y API en :8081)');
    }
    const role = this.demoService.getDemoRole();
    const payload: DemoLeadPayload = {
      email: email.trim(),
      demoRole: role || '',
      activitySummary: this.getActivitySummary(),
    };
    return this.http.post<{ status?: number; data?: unknown; error?: { msg?: string } }>(url, payload).pipe(
      map((res) => {
        if (res.status === 200) return { success: true };
        return { success: false, message: (res.error && res.error.msg) || 'Error al enviar' };
      }),
      catchError((err) => {
        const msg = err.error?.error?.msg || err.message || 'Error de conexión';
        if (!(environment as { production?: boolean }).production) {
          console.warn('[Demo] Fallo al enviar lead:', msg, err.status ? `(HTTP ${err.status})` : '');
        }
        return of({ success: false, message: msg });
      })
    );
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }
}
