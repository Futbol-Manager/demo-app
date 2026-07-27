import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, of, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Response } from 'src/app/core/services/models/response.model';
import { isDemoMode } from '../demo/demo-mode';

/** Contenido de una novedad para un idioma concreto. */
export interface ClubNewsContent {
  title: string;
  items: string[];
}

/** Novedad tal como llega del backend. `contentJson` es el JSON multiidioma. */
export interface ClubNewsItem {
  id: number;
  version: string;
  contentJson: string;
  published: boolean;
  read: boolean;
  publishedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/** Novedades de ejemplo para el modo demo. */
const DEMO_NEWS: ClubNewsItem[] = [
  {
    id: 1,
    version: 'v2.4',
    published: true,
    read: false,
    publishedAt: '2026-04-10T09:00:00',
    contentJson: JSON.stringify({
      es: {
        title: 'Nuevo módulo de Redes Sociales',
        items: [
          'Calendario de publicaciones con vista semanal y mensual',
          'Generador de posts de partido listos para Instagram',
          'Plan mensual de contenido asistido por IA',
        ],
      },
      en: {
        title: 'New Social Media module',
        items: [
          'Publishing calendar with weekly and monthly views',
          'Match post generator ready for Instagram',
          'AI-assisted monthly content plan',
        ],
      },
    }),
  },
  {
    id: 2,
    version: 'v2.3',
    published: true,
    read: true,
    publishedAt: '2026-03-01T09:00:00',
    contentJson: JSON.stringify({
      es: {
        title: 'Mejoras en cuotas y pagos',
        items: ['Cobro con tarjeta guardada', 'Recordatorios automáticos de pago'],
      },
      en: {
        title: 'Fees and payments improvements',
        items: ['Charge with saved card', 'Automatic payment reminders'],
      },
    }),
  },
];

/**
 * Servicio de Novedades / changelog para cuentas de club. Mantiene estado
 * compartido entre la campana del header (`unseenCount$`) y el modal
 * (`openHistory$` para abrir el historial desde la campana).
 */
@Injectable({ providedIn: 'root' })
export class ClubNewsService {
  private base = environment.apiUrl;

  /** Nº de novedades sin leer (para el punto rojo de la campana). */
  readonly unseenCount$ = new BehaviorSubject<number>(0);
  /** Última carga de novedades sin leer (para el modal automático). */
  readonly unseen$ = new BehaviorSubject<ClubNewsItem[]>([]);
  /** Petición de abrir el historial (la dispara la campana del header). */
  readonly openHistory$ = new Subject<void>();

  constructor(private http: HttpClient) {}

  private authHeaders(): HttpHeaders | undefined {
    const token = localStorage.getItem('token');
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
  }

  // ── Club ────────────────────────────────────────────────────────────────

  getUnseen(): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: DEMO_NEWS.filter(n => !n.read), status: 200, error: null } as any);
    }
    const headers = this.authHeaders();
    if (!headers) return throwError(() => new Error('No auth token'));
    return this.http.get<Response>(`${this.base}club-news/unseen`, { headers });
  }

  getHistory(): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: [...DEMO_NEWS], status: 200, error: null } as any);
    }
    const headers = this.authHeaders();
    if (!headers) return throwError(() => new Error('No auth token'));
    return this.http.get<Response>(`${this.base}club-news/history`, { headers });
  }

  markRead(newsId: number): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: { id: newsId, read: true }, status: 200, error: null } as any);
    }
    const headers = this.authHeaders();
    if (!headers) return throwError(() => new Error('No auth token'));
    return this.http.post<Response>(`${this.base}club-news/read/${newsId}`, {}, { headers });
  }

  markAllRead(): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: { readAll: true }, status: 200, error: null } as any);
    }
    const headers = this.authHeaders();
    if (!headers) return throwError(() => new Error('No auth token'));
    return this.http.post<Response>(`${this.base}club-news/read-all`, {}, { headers });
  }

  /** Recarga las novedades sin leer y actualiza el estado compartido. */
  refreshUnseen(): void {
    this.getUnseen().subscribe({
      next: (res) => {
        const list = (res?.data as ClubNewsItem[]) ?? [];
        this.unseen$.next(list);
        this.unseenCount$.next(list.length);
      },
      error: () => {
        this.unseen$.next([]);
        this.unseenCount$.next(0);
      },
    });
  }

  /** Solicita abrir el modal en modo historial (desde la campana). */
  requestOpenHistory(): void {
    this.openHistory$.next();
  }

  // ── Admin ───────────────────────────────────────────────────────────────

  adminGetAll(): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: [...DEMO_NEWS], status: 200, error: null } as any);
    }
    const headers = this.authHeaders();
    if (!headers) return throwError(() => new Error('No auth token'));
    return this.http.get<Response>(`${this.base}club-news/admin`, { headers });
  }

  adminCreate(body: { version: string; contentJson: string; published: boolean }): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: { id: Date.now(), read: false, ...body }, status: 200, error: null } as any);
    }
    const headers = this.authHeaders();
    if (!headers) return throwError(() => new Error('No auth token'));
    return this.http.post<Response>(`${this.base}club-news/admin`, body, { headers });
  }

  adminUpdate(id: number, body: { version: string; contentJson: string; published: boolean }): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: { id, ...body }, status: 200, error: null } as any);
    }
    const headers = this.authHeaders();
    if (!headers) return throwError(() => new Error('No auth token'));
    return this.http.put<Response>(`${this.base}club-news/admin/${id}`, body, { headers });
  }

  adminSetPublished(id: number, published: boolean): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: { id, published }, status: 200, error: null } as any);
    }
    const headers = this.authHeaders();
    if (!headers) return throwError(() => new Error('No auth token'));
    return this.http.put<Response>(`${this.base}club-news/admin/${id}/published/${published}`, {}, { headers });
  }

  adminDelete(id: number): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: { id, deleted: true }, status: 200, error: null } as any);
    }
    const headers = this.authHeaders();
    if (!headers) return throwError(() => new Error('No auth token'));
    return this.http.delete<Response>(`${this.base}club-news/admin/${id}`, { headers });
  }

  // ── Utilidades ──────────────────────────────────────────────────────────

  /**
   * Extrae el contenido del idioma activo (con fallback es → en → primer idioma
   * disponible) a partir del `contentJson` multiidioma de una novedad.
   */
  resolveContent(item: ClubNewsItem, lang: string): ClubNewsContent {
    let parsed: Record<string, ClubNewsContent> = {};
    try {
      parsed = item?.contentJson ? JSON.parse(item.contentJson) : {};
    } catch {
      parsed = {};
    }
    const pick =
      parsed[lang] ||
      parsed['es'] ||
      parsed['en'] ||
      parsed[Object.keys(parsed)[0]] ||
      null;
    return {
      title: pick?.title?.trim() || item?.version || '',
      items: Array.isArray(pick?.items) ? pick!.items.filter((s) => !!s && s.trim()) : [],
    };
  }
}
