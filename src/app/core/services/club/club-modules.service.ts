import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { isDemoMode } from '../demo/demo-mode';

/** Claves de deporte soportadas para la imagen del menú del club. */
export type ClubMenuSport = 'futbol' | 'voley' | 'baloncesto' | 'futbol-sala';

/** Deporte por defecto del menú cuando el club no ha elegido ninguno. */
export const DEFAULT_MENU_SPORT: ClubMenuSport = 'futbol';

/** Lista de deportes seleccionables para el menú (orden de presentación). */
export const MENU_SPORTS: ClubMenuSport[] = ['futbol', 'voley', 'baloncesto', 'futbol-sala'];

export interface ClubModules {
  clubId: number;
  wellnessEnabled: boolean;
  rpeEnabled: boolean;
  professionalModeEnabled: boolean;
  accessControlEnabled: boolean;
  menuSport: ClubMenuSport;
}

/**
 * Gestiona los módulos opcionales activos por club. Versión demo-app: en modo
 * demo devuelve un club con Modo Profesional, Wellness y RPE activos, y simula
 * los toggles con éxito.
 */
@Injectable({ providedIn: 'root' })
export class ClubModulesService {

  private readonly baseUrl = `${environment.apiUrl}club`;

  /** Estado en memoria del mock, para que los toggles se reflejen en sesión. */
  private demoState: Record<number, ClubModules> = {};

  constructor(private http: HttpClient) {}

  private demoModules(clubId: number): ClubModules {
    if (!this.demoState[clubId]) {
      this.demoState[clubId] = {
        clubId,
        wellnessEnabled: true,
        rpeEnabled: true,
        professionalModeEnabled: true,
        accessControlEnabled: false,
        menuSport: DEFAULT_MENU_SPORT,
      };
    }
    return this.demoState[clubId];
  }

  getModules(clubId: number): Observable<ClubModules> {
    if (isDemoMode()) return of({ ...this.demoModules(clubId) });
    return this.http.get<any>(`${this.baseUrl}/${clubId}/modules`).pipe(
      map(resp => this.normalize(clubId, resp?.data ?? resp))
    );
  }

  toggleWellness(clubId: number, enabled: boolean): Observable<ClubModules> {
    if (isDemoMode()) { this.demoModules(clubId).wellnessEnabled = enabled; return of({ ...this.demoModules(clubId) }); }
    return this.http
      .put<any>(`${this.baseUrl}/${clubId}/modules/wellness`, null, { params: { enabled: String(enabled) } })
      .pipe(map(resp => this.normalize(clubId, resp?.data ?? resp)));
  }

  toggleRpe(clubId: number, enabled: boolean): Observable<ClubModules> {
    if (isDemoMode()) { this.demoModules(clubId).rpeEnabled = enabled; return of({ ...this.demoModules(clubId) }); }
    return this.http
      .put<any>(`${this.baseUrl}/${clubId}/modules/rpe`, null, { params: { enabled: String(enabled) } })
      .pipe(map(resp => this.normalize(clubId, resp?.data ?? resp)));
  }

  toggleProfessionalMode(clubId: number, enabled: boolean): Observable<ClubModules> {
    if (isDemoMode()) { this.demoModules(clubId).professionalModeEnabled = enabled; return of({ ...this.demoModules(clubId) }); }
    return this.http
      .put<any>(`${this.baseUrl}/${clubId}/modules/professional-mode`, null, { params: { enabled: String(enabled) } })
      .pipe(map(resp => this.normalize(clubId, resp?.data ?? resp)));
  }

  toggleAccessControl(clubId: number, enabled: boolean): Observable<ClubModules> {
    if (isDemoMode()) { this.demoModules(clubId).accessControlEnabled = enabled; return of({ ...this.demoModules(clubId) }); }
    return this.http
      .put<any>(`${this.baseUrl}/${clubId}/modules/access-control`, null, { params: { enabled: String(enabled) } })
      .pipe(map(resp => this.normalize(clubId, resp?.data ?? resp)));
  }

  setMenuSport(clubId: number, sport: ClubMenuSport): Observable<ClubModules> {
    if (isDemoMode()) { this.demoModules(clubId).menuSport = this.normalizeSport(sport); return of({ ...this.demoModules(clubId) }); }
    return this.http
      .put<any>(`${this.baseUrl}/${clubId}/modules/menu-sport`, null, { params: { sport } })
      .pipe(map(resp => this.normalize(clubId, resp?.data ?? resp)));
  }

  private normalize(clubId: number, raw: any): ClubModules {
    return {
      clubId: raw?.clubId ?? clubId,
      wellnessEnabled: !!raw?.wellnessEnabled,
      rpeEnabled: !!raw?.rpeEnabled,
      professionalModeEnabled: !!raw?.professionalModeEnabled,
      accessControlEnabled: !!raw?.accessControlEnabled,
      menuSport: this.normalizeSport(raw?.menuSport)
    };
  }

  private normalizeSport(raw: any): ClubMenuSport {
    const v = String(raw ?? '').trim().toLowerCase();
    return (MENU_SPORTS as string[]).includes(v) ? (v as ClubMenuSport) : DEFAULT_MENU_SPORT;
  }
}
