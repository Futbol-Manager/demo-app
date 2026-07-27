import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { isDemoMode } from '../demo/demo-mode';

/**
 * Item del orden personalizado que devuelve/acepta el backend.
 */
export interface MenuLayoutItem {
  menuId: number;
  code: string;
  displayOrder: number;
}

/**
 * Item editable en el modal "Reordenar menú".
 */
export interface MenuLayoutEditableItem {
  code: string;
  labelKey: string;
  icon: string;
}

/**
 * Cliente del orden personalizado del menú principal + sidebar.
 * Versión demo-app: en modo demo no golpea el backend; el orden custom se
 * mantiene sólo en memoria (currentLayout$) y persiste con éxito simulado.
 */
@Injectable({ providedIn: 'root' })
export class MenuLayoutService {

  private readonly baseUrl = `${environment.apiUrl}menu-permissions`;

  private readonly _currentLayout$ = new BehaviorSubject<string[]>([]);
  readonly currentLayout$ = this._currentLayout$.asObservable();

  constructor(private http: HttpClient) {}

  load(clubId: number, profileId: number): Observable<string[]> {
    if (!clubId || clubId <= 0 || !profileId || profileId <= 0) {
      this._currentLayout$.next([]);
      return of([]);
    }
    if (isDemoMode()) {
      // En demo mantenemos el orden que ya haya en memoria (o vacío =
      // orden por defecto del catálogo). No golpeamos el backend.
      return of(this._currentLayout$.value);
    }
    return this.http
      .get<any>(`${this.baseUrl}/club/${clubId}/layout`, {
        params: { profileId: String(profileId) }
      })
      .pipe(
        map((resp) => {
          const items: MenuLayoutItem[] = (resp?.data ?? resp ?? []) as MenuLayoutItem[];
          return items.map((i) => i.code);
        }),
        tap((codes) => this._currentLayout$.next(codes)),
        catchError(() => {
          this._currentLayout$.next([]);
          return of([]);
        })
      );
  }

  save(clubId: number, profileId: number, codes: string[]): Observable<void> {
    if (isDemoMode()) {
      this._currentLayout$.next([...codes]);
      return of(undefined);
    }
    return this.http
      .put<any>(
        `${this.baseUrl}/club/${clubId}/layout`,
        { codes },
        { params: { profileId: String(profileId) } }
      )
      .pipe(
        tap(() => this._currentLayout$.next([...codes])),
        map(() => undefined)
      );
  }

  snapshot(): string[] {
    return this._currentLayout$.value;
  }

  setLocal(codes: string[]): void {
    this._currentLayout$.next([...(codes ?? [])]);
  }

  applyOrder<T>(
    items: T[],
    getCode: (item: T) => string | null | undefined,
    layout: string[] = this._currentLayout$.value
  ): T[] {
    if (!items || items.length === 0) return items;
    if (!layout || layout.length === 0) return items;

    const orderIndex = new Map<string, number>();
    layout.forEach((c, i) => orderIndex.set(c, i));

    const withCode: { item: T; code: string | null; idx: number }[] = items.map((item, idx) => ({
      item,
      code: (getCode(item) ?? null) || null,
      idx,
    }));

    return withCode
      .sort((a, b) => {
        const aHas = a.code != null && orderIndex.has(a.code);
        const bHas = b.code != null && orderIndex.has(b.code);
        if (aHas && bHas) {
          return (orderIndex.get(a.code!) ?? 0) - (orderIndex.get(b.code!) ?? 0);
        }
        if (aHas) return -1;
        if (bHas) return 1;
        return a.idx - b.idx;
      })
      .map((w) => w.item);
  }

  reset(): void {
    this._currentLayout$.next([]);
  }

  private readonly CANONICAL_CATALOG: MenuLayoutEditableItem[] = [
    { code: 'inicio',             labelKey: 'SIDEBAR.HOME',                icon: 'bi-house-door' },
    { code: 'ai-assistant',       labelKey: 'SIDEBAR.AI_ASSISTANT',        icon: 'bi-robot' },
    { code: 'cuadro-de-mandos',   labelKey: 'SIDEBAR.DASHBOARD',           icon: 'bi-clipboard2-data' },
    { code: 'panel-diario',       labelKey: 'SIDEBAR.DAILY_PANEL',         icon: 'bi-calendar-event' },
    { code: 'equipos',            labelKey: 'SIDEBAR.TEAMS',               icon: 'bi-people' },
    { code: 'documentos-club',    labelKey: 'SIDEBAR.DOCUMENTS',           icon: 'bi-file-earmark-pdf' },
    { code: 'cuotas',             labelKey: 'SIDEBAR.FEES',                icon: 'bi-bank2' },
    { code: 'ropa',               labelKey: 'SIDEBAR.CLOTHING',            icon: 'bi-backpack3' },
    { code: 'patrocinadores',     labelKey: 'SIDEBAR.SPONSORS',            icon: 'bi-collection' },
    { code: 'abonados',           labelKey: 'SIDEBAR.MEMBERS',             icon: 'bi-person-vcard' },
    { code: 'notificaciones',     labelKey: 'SIDEBAR.NOTIFICATIONS',       icon: 'bi-bell' },
    { code: 'scouting',           labelKey: 'SIDEBAR.SCOUTING',            icon: 'bi-binoculars' },
    { code: 'club-eval',          labelKey: 'CLUB_EVAL.TITLE',             icon: 'bi-clipboard2-pulse' },
    { code: 'staff',              labelKey: 'SIDEBAR.STAFF_MANAGEMENT',    icon: 'bi-person-badge' },
    { code: 'videos-scouting',    labelKey: 'SIDEBAR.SCOUTING_VIDEOS',     icon: 'bi-collection-play' },
    { code: 'video-analysis',     labelKey: 'SIDEBAR.VIDEO_ANALYSIS',      icon: 'bi-camera-reels' },
    { code: 'club-posts',         labelKey: 'SIDEBAR.SOCIAL_POSTS',        icon: 'bi-instagram' },
    { code: 'tienda',             labelKey: 'SIDEBAR.SHOP',                icon: 'bi-shop' },
    // 'erp' retirado en jul-2026 junto con su tarjeta de inicio.
  ];

  getCatalogOrdered(): MenuLayoutEditableItem[] {
    return this.applyOrder(
      [...this.CANONICAL_CATALOG],
      (it) => it.code,
      this._currentLayout$.value
    );
  }
}
