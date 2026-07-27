// ════════════════════════════════════════════════════════════════════════
// SPHAIRA – PlayerDailyStatusService (Disponibilidad fisio/médico)
// HTTP wrapper para /rest/player-daily-status/*
// En modo demo devuelve tags y estados de equipo ficticios.
// ════════════════════════════════════════════════════════════════════════

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { isDemoMode } from '../demo/demo-mode';

/** Tag de disponibilidad configurable por club (DT, DC, L, ...). */
export interface PlayerStatusTag {
  tagId: number;
  clubId: number;
  code: string;
  label: string;
  color: string;
  isDefault: boolean;
  sortOrder: number;
  active: boolean;
}

/** Estado diario por jugador (una fila por día). */
export interface PlayerDailyStatus {
  dailyStatusId?: number;
  playerId: number;
  teamId: number;
  clubId: number;
  /** YYYY-MM-DD */
  statusDate: string;
  statusTagCode?: string | null;
  statusTagLabel?: string | null;
  statusColor?: string | null;
  attendedPhysio?: boolean | null;
  treatmentZone?: string | null;
  treatmentTechnique?: string | null;
  treatmentDurationMin?: number | null;
  treatmentObservations?: string | null;
  generalObservations?: string | null;
  forecastTagCode?: string | null;
  forecastTagLabel?: string | null;
  forecastText?: string | null;
  registeredByUserId?: number | null;
  registeredByName?: string | null;
}

export interface AutofillTeamDayResult {
  teamId: number;
  date: string;
  defaultCode: string;
  totalPlayers: number;
  created: number;
  updated: number;
  skipped: number;
  playerIdsAffected: number[];
}

/**
 * Servicio para gestionar la disponibilidad diaria del equipo.
 *
 * <p>En modo demo devuelve un catálogo de tags y el estado del equipo
 * ficticios plausibles.</p>
 */
@Injectable({ providedIn: 'root' })
export class PlayerDailyStatusService {

  private readonly baseUrl = `${environment.apiUrl}player-daily-status`;

  constructor(private http: HttpClient) {}

  getTags(clubId: number): Observable<PlayerStatusTag[]> {
    if (isDemoMode()) return of(this.demoTags(clubId));
    return this.http.get<any>(`${this.baseUrl}/tags/${clubId}`).pipe(
      map(resp => (resp?.data ?? resp ?? []) as PlayerStatusTag[]),
      catchError(() => of([] as PlayerStatusTag[]))
    );
  }

  getTeamDay(teamId: number, date: string): Observable<PlayerDailyStatus[]> {
    if (isDemoMode()) return of(this.demoTeamDay(teamId, date));
    return this.http.get<any>(`${this.baseUrl}/team/${teamId}/date/${date}`).pipe(
      map(resp => (resp?.data ?? resp ?? []) as PlayerDailyStatus[]),
      catchError(() => of([] as PlayerDailyStatus[]))
    );
  }

  saveStatus(payload: PlayerDailyStatus): Observable<PlayerDailyStatus> {
    if (isDemoMode()) return of({ dailyStatusId: Date.now(), ...payload });
    return this.http.post<any>(`${this.baseUrl}/`, payload).pipe(
      map(resp => (resp?.data ?? resp) as PlayerDailyStatus)
    );
  }

  bulkSave(entries: PlayerDailyStatus[], registeredByUserId: number, registeredByName: string): Observable<PlayerDailyStatus[]> {
    if (isDemoMode()) return of(entries.map((e, i) => ({ dailyStatusId: Date.now() + i, ...e, registeredByUserId, registeredByName })));
    return this.http.post<any>(`${this.baseUrl}/bulk`, {
      entries,
      registeredByUserId,
      registeredByName
    }).pipe(map(resp => (resp?.data ?? resp ?? []) as PlayerDailyStatus[]));
  }

  autofillTeamDay(
    teamId: number,
    date: string,
    payload: { clubId: number; defaultCode?: string; registeredByUserId?: number; registeredByName?: string; overrideExisting?: boolean }
  ): Observable<AutofillTeamDayResult> {
    if (isDemoMode()) {
      const affected = [8001, 8002, 8003, 8004, 8005, 8006, 8009, 8014];
      return of({
        teamId, date, defaultCode: payload.defaultCode ?? 'DT',
        totalPlayers: affected.length, created: affected.length, updated: 0, skipped: 0,
        playerIdsAffected: affected
      });
    }
    return this.http.post<any>(`${this.baseUrl}/team/${teamId}/date/${date}/autofill`, payload).pipe(
      map(resp => (resp?.data ?? resp) as AutofillTeamDayResult)
    );
  }

  // ─── DEMO ──────────────────────────────────────────────────────────
  private demoTags(clubId: number): PlayerStatusTag[] {
    const cid = clubId || 9001;
    return [
      { tagId: 1, clubId: cid, code: 'DT', label: 'Disponible total', color: '#31b270', isDefault: true, sortOrder: 1, active: true },
      { tagId: 2, clubId: cid, code: 'DC', label: 'Duda competitiva', color: '#f59e0b', isDefault: false, sortOrder: 2, active: true },
      { tagId: 3, clubId: cid, code: 'RD', label: 'Readaptación', color: '#0891b2', isDefault: false, sortOrder: 3, active: true },
      { tagId: 4, clubId: cid, code: 'L', label: 'Lesionado', color: '#b1231b', isDefault: false, sortOrder: 4, active: true },
      { tagId: 5, clubId: cid, code: 'P', label: 'Permiso', color: '#636363', isDefault: false, sortOrder: 5, active: true },
      { tagId: 6, clubId: cid, code: 'E', label: 'Enfermo', color: '#d6336c', isDefault: false, sortOrder: 6, active: true },
    ];
  }

  private demoTeamDay(teamId: number, date: string): PlayerDailyStatus[] {
    const rows: { playerId: number; code: string; label: string; color: string; attended?: boolean; zone?: string; obs?: string }[] = [
      { playerId: 8001, code: 'DC', label: 'Duda competitiva', color: '#f59e0b', attended: true, zone: 'Tobillo', obs: 'Molestia leve' },
      { playerId: 8002, code: 'DT', label: 'Disponible total', color: '#31b270' },
      { playerId: 8003, code: 'DT', label: 'Disponible total', color: '#31b270' },
      { playerId: 8004, code: 'DT', label: 'Disponible total', color: '#31b270' },
      { playerId: 8005, code: 'RD', label: 'Readaptación', color: '#0891b2', attended: true, zone: 'Isquiotibial' },
      { playerId: 8006, code: 'DC', label: 'Duda competitiva', color: '#f59e0b', attended: true, zone: 'Aductor' },
      { playerId: 8009, code: 'DT', label: 'Disponible total', color: '#31b270' },
      { playerId: 8014, code: 'L', label: 'Lesionado', color: '#b1231b', attended: true, zone: 'Muslo', obs: 'Baja 2-3 semanas' },
    ];
    return rows.map(r => ({
      dailyStatusId: r.playerId,
      playerId: r.playerId,
      teamId,
      clubId: 9001,
      statusDate: date,
      statusTagCode: r.code,
      statusTagLabel: r.label,
      statusColor: r.color,
      attendedPhysio: r.attended ?? false,
      treatmentZone: r.zone ?? null,
      treatmentTechnique: r.attended ? 'Fisioterapia' : null,
      treatmentDurationMin: r.attended ? 20 : null,
      treatmentObservations: r.obs ?? null,
      generalObservations: null,
      forecastTagCode: null,
      forecastTagLabel: null,
      forecastText: null,
      registeredByUserId: 1,
      registeredByName: 'Staff médico'
    }));
  }
}
