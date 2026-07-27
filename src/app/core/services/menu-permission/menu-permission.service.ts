import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { isDemoMode } from '../demo/demo-mode';

/**
 * Cliente del módulo "Sphaira Adhoc" (personalización de menús por club).
 * Versión demo-app: en modo demo devuelve catálogo/permisos ficticios inline
 * y opera en modo wildcard (todos los menús visibles), simulando éxito en
 * las escrituras.
 */
export interface MenuItem {
  menuId: number;
  code: string;
  labelKey: string;
  icon?: string | null;
  category: string;
  applicableProfiles: number[];
  displayOrder: number;
  defaultEnabled: boolean;
  legacyModule?: string | null;
}

export interface PresetSummary {
  presetId: number;
  name: string;
  description?: string | null;
  isSystem: boolean;
}

export interface PresetItem {
  menuId: number;
  menuCode: string;
  profileId: number;
  enabled: boolean;
}

export interface PresetDetail extends PresetSummary {
  items: PresetItem[];
}

export interface ClubPermissions {
  clubId: number;
  usesAdhocMenus: boolean;
  appliedPresetId?: number | null;
  permissions: PresetItem[];
}

export interface MyMenus {
  wildcard: boolean;
  clubId?: number | null;
  profileId?: number | null;
  enabledCodes: string[];
  enabledLegacyModules: string[];
}

@Injectable({ providedIn: 'root' })
export class MenuPermissionService {

  private readonly baseUrl = `${environment.apiUrl}menu-permissions`;

  private readonly _myMenus$ = new BehaviorSubject<MyMenus>({
    wildcard: true,
    enabledCodes: [],
    enabledLegacyModules: []
  });
  readonly myMenus$ = this._myMenus$.asObservable();

  constructor(private http: HttpClient) {}

  // ─────────── Catálogo ───────────
  getCatalog(): Observable<MenuItem[]> {
    if (isDemoMode()) {
      return of(this.mockCatalog());
    }
    return this.http.get<any>(`${this.baseUrl}/catalog`).pipe(
      map(resp => (resp?.data ?? resp ?? []) as MenuItem[])
    );
  }

  // ─────────── Presets ───────────
  listPresets(): Observable<PresetSummary[]> {
    if (isDemoMode()) {
      return of([
        { presetId: 1, name: 'Club completo', description: 'Todos los módulos activos', isSystem: true },
        { presetId: 2, name: 'Club básico', description: 'Solo gestión esencial', isSystem: true },
      ]);
    }
    return this.http.get<any>(`${this.baseUrl}/presets`).pipe(
      map(resp => (resp?.data ?? resp ?? []) as PresetSummary[])
    );
  }

  getPreset(presetId: number): Observable<PresetDetail> {
    if (isDemoMode()) {
      return of({
        presetId,
        name: presetId === 2 ? 'Club básico' : 'Club completo',
        description: '',
        isSystem: true,
        items: this.mockCatalog().map(m => ({
          menuId: m.menuId,
          menuCode: m.code,
          profileId: 1,
          enabled: presetId === 2 ? m.defaultEnabled : true,
        })),
      });
    }
    return this.http.get<any>(`${this.baseUrl}/presets/${presetId}`).pipe(
      map(resp => resp?.data ?? resp)
    );
  }

  createPreset(name: string, description?: string): Observable<PresetSummary> {
    if (isDemoMode()) {
      return of({ presetId: Date.now(), name, description: description ?? '', isSystem: false });
    }
    return this.http
      .post<any>(`${this.baseUrl}/presets`, { name, description })
      .pipe(map(resp => resp?.data ?? resp));
  }

  updatePreset(presetId: number, name: string, description?: string): Observable<void> {
    if (isDemoMode()) return of(undefined);
    return this.http
      .put<any>(`${this.baseUrl}/presets/${presetId}`, { name, description })
      .pipe(map(() => undefined));
  }

  deletePreset(presetId: number): Observable<void> {
    if (isDemoMode()) return of(undefined);
    return this.http
      .delete<any>(`${this.baseUrl}/presets/${presetId}`)
      .pipe(map(() => undefined));
  }

  setPresetItems(presetId: number, items: PresetItem[]): Observable<void> {
    if (isDemoMode()) return of(undefined);
    return this.http
      .put<any>(`${this.baseUrl}/presets/${presetId}/items`, { items })
      .pipe(map(() => undefined));
  }

  // ─────────── Permisos por club ───────────
  getClubPermissions(clubId: number): Observable<ClubPermissions> {
    if (isDemoMode()) {
      return of({
        clubId,
        usesAdhocMenus: false,
        appliedPresetId: null,
        permissions: this.mockCatalog().map(m => ({
          menuId: m.menuId,
          menuCode: m.code,
          profileId: 1,
          enabled: true,
        })),
      });
    }
    return this.http.get<any>(`${this.baseUrl}/club/${clubId}`).pipe(
      map(resp => resp?.data ?? resp)
    );
  }

  enableAdhoc(clubId: number, enabled: boolean): Observable<ClubPermissions> {
    if (isDemoMode()) {
      return of({
        clubId,
        usesAdhocMenus: enabled,
        appliedPresetId: null,
        permissions: this.mockCatalog().map(m => ({
          menuId: m.menuId,
          menuCode: m.code,
          profileId: 1,
          enabled: true,
        })),
      });
    }
    return this.http
      .put<any>(`${this.baseUrl}/club/${clubId}/enable-adhoc`, null, {
        params: { enabled: String(enabled) }
      })
      .pipe(map(resp => resp?.data ?? resp));
  }

  applyPreset(clubId: number, presetId: number): Observable<ClubPermissions> {
    if (isDemoMode()) {
      return of({
        clubId,
        usesAdhocMenus: true,
        appliedPresetId: presetId,
        permissions: this.mockCatalog().map(m => ({
          menuId: m.menuId,
          menuCode: m.code,
          profileId: 1,
          enabled: presetId === 2 ? m.defaultEnabled : true,
        })),
      });
    }
    return this.http
      .put<any>(`${this.baseUrl}/club/${clubId}/apply-preset/${presetId}`, null)
      .pipe(map(resp => resp?.data ?? resp));
  }

  toggleMenu(clubId: number, menuCode: string, profileId: number, enabled: boolean): Observable<void> {
    if (isDemoMode()) return of(undefined);
    return this.http
      .put<any>(`${this.baseUrl}/club/${clubId}/toggle`, { menuCode, profileId, enabled })
      .pipe(map(() => undefined));
  }

  // ─────────── /me ───────────
  loadMyMenus(clubId: number | null | undefined, profileId: number | null | undefined): Observable<MyMenus> {
    if (isDemoMode()) {
      const my: MyMenus = {
        wildcard: true,
        clubId: clubId ?? null,
        profileId: profileId ?? null,
        enabledCodes: [],
        enabledLegacyModules: [],
      };
      this._myMenus$.next(my);
      return of(my);
    }
    let params: any = {};
    if (clubId != null) params.clubId = String(clubId);
    if (profileId != null) params.profileId = String(profileId);
    return this.http.get<any>(`${this.baseUrl}/me`, { params }).pipe(
      map(resp => (resp?.data ?? resp) as MyMenus),
      tap(my => this._myMenus$.next(my))
    );
  }

  snapshot(): MyMenus {
    return this._myMenus$.value;
  }

  isMenuEnabled(code: string | null | undefined): boolean {
    if (!code) return true;
    const snap = this._myMenus$.value;
    if (snap.wildcard) return true;
    return snap.enabledCodes.includes(code);
  }

  isAdhocActive(): boolean {
    return !this._myMenus$.value.wildcard;
  }

  isFeatureEnabled(featureId: number | null | undefined): boolean {
    if (featureId == null) return true;
    const code = FEATURE_ID_TO_CODE[featureId];
    if (!code) {
      return !this.isAdhocActive();
    }
    return this.isMenuEnabled(code);
  }

  routeToMenuCode(url: string | null | undefined): string | null {
    if (!url) return null;
    const path = url.split('?')[0].split('#')[0];
    const seg = path.replace(/^\/+/, '').split('/').filter(Boolean);
    if (seg.length === 0 || seg[0] !== 'dashboard') return null;
    const first = seg[1] || '';
    return ROUTE_TO_CODE[first] ?? null;
  }

  reset(): void {
    this._myMenus$.next({ wildcard: true, enabledCodes: [], enabledLegacyModules: [] });
  }

  /** Catálogo ficticio inline usado en modo demo. */
  private mockCatalog(): MenuItem[] {
    const c = (menuId: number, code: string, labelKey: string, category: string, icon: string, order: number, def = true): MenuItem => ({
      menuId, code, labelKey, icon, category,
      applicableProfiles: [1, 9, 99],
      displayOrder: order,
      defaultEnabled: def,
      legacyModule: null,
    });
    return [
      c(1,  'inicio',           'SIDEBAR.HOME',             'general', 'bi-house-door',        1),
      c(2,  'cuadro-de-mandos', 'SIDEBAR.DASHBOARD',        'club',    'bi-clipboard2-data',   2),
      c(3,  'panel-diario',     'SIDEBAR.DAILY_PANEL',      'club',    'bi-calendar-event',    3),
      c(4,  'equipos',          'SIDEBAR.TEAMS',            'club',    'bi-people',            4),
      c(5,  'documentos-club',  'SIDEBAR.DOCUMENTS',        'club',    'bi-file-earmark-pdf',  5),
      c(6,  'cuotas',           'SIDEBAR.FEES',             'club',    'bi-bank2',             6),
      c(7,  'ropa',             'SIDEBAR.CLOTHING',         'club',    'bi-backpack3',         7, false),
      c(8,  'patrocinadores',   'SIDEBAR.SPONSORS',         'club',    'bi-collection',        8, false),
      c(9,  'abonados',         'SIDEBAR.MEMBERS',          'club',    'bi-person-vcard',      9, false),
      c(10, 'notificaciones',   'SIDEBAR.NOTIFICATIONS',    'general', 'bi-bell',             10),
      c(11, 'scouting',         'SIDEBAR.SCOUTING',         'club',    'bi-binoculars',       11, false),
      c(12, 'club-eval',        'CLUB_EVAL.TITLE',          'club',    'bi-clipboard2-pulse', 12),
      c(13, 'staff',            'SIDEBAR.STAFF_MANAGEMENT', 'club',    'bi-person-badge',     13),
      c(14, 'tienda',           'SIDEBAR.SHOP',             'club',    'bi-shop',             14, false),
    ];
  }
}

const ROUTE_TO_CODE: Record<string, string> = {
  'inicio':                'inicio',
  'cuadro-de-mandos':      'cuadro-de-mandos',
  'panel-diario':          'panel-diario',
  'equipos':               'equipos',
  'entrenamientos':        'entrenamientos',
  'documentos-club':       'documentos-club',
  'documentos-abonados':   'documentos-abonados',
  'new-cuotas':            'cuotas',
  'ropa':                  'ropa',
  'patrocinadores':        'patrocinadores',
  'scouting-club':         'scouting',
  'club-videos':           'videos-scouting',
  'video-analysis':        'video-analysis',
  'staff-club':            'staff',
  'club-posts':            'club-posts',
  'notificaciones':        'notificaciones',
  'tienda-admin':          'tienda',
  'tienda':                'tienda',
  'erp':                   'erp',
  'mi-temporada':          'mi-temporada',
  'encuestas':             'encuestas',
  'abonados':              'abonados',
  'access-control':        'access-control',
  'wellness':              'wellness',
  'rpe':                   'rpe',
  'diario-medico':         'diario-medico',
  'calendario':            'calendario',
  'tareas':                'tareas',
  'jugadores':             'jugadores',
  'informacion_equipo':    'info-equipo',
  'estadisticas_equipo':   'stats-equipo',
  'estadisticas_jugadores':'stats-jugadores',
  'clasificacion-resultados':'clasificacion',
  'partidos-entrevistas':  'galeria',
  'lesiones':              'lesiones',
  'debrief':               'debrief',
  'tactical-board-editor': 'pizarra-tactica',
  'perfil-entrenador':     'perfil',
  'cuotas':                'mis-cuotas',
  'documentos-jugador':    'documentos-jugador',
  'scan-carnet':           'scan-carnet',
};

const FEATURE_ID_TO_CODE: Record<number, string> = {
  2:  'ropa',
  3:  'cuadro-de-mandos',
  4:  'patrocinadores',
  23: 'entrenamientos',
  6:  'documentos-club',
  7:  'cuotas',
  8:  'notificaciones',
  9:  'equipos',
  11: 'ai-assistant',
  12: 'scouting',
  13: 'videos-scouting',
  14: 'video-analysis',
  15: 'erp',
  16: 'staff',
  17: 'tienda',
  18: 'club-posts',
  21: 'abonados',
  22: 'documentos-abonados',
};
