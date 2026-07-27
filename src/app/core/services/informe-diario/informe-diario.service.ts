import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { isDemoMode } from '../demo/demo-mode';

/**
 * Informe diario persistido (histórico por equipo/fecha). El detalle por
 * jugador viaja serializado en {@link rowsJson}.
 */
export interface InformeDiario {
  informeId?: number;
  clubId: number;
  teamId: number;
  /** yyyy-MM-dd */
  reportDate: string;
  /** yyyy-MM-dd | null */
  nextSessionDate?: string | null;
  teamName?: string | null;
  rowsJson?: string | null;
  status?: string;
  createdByUserId?: number | null;
  createdByName?: string | null;
  /** epoch millis */
  createdAt?: number | null;
  updatedAt?: number | null;
}

/**
 * Cliente Angular del histórico de informes diarios del fisio.
 *
 * <p>En modo demo devuelve un histórico ficticio plausible.</p>
 */
@Injectable({ providedIn: 'root' })
export class InformeDiarioService {

  private readonly baseUrl = `${environment.apiUrl}informe-diario`;

  constructor(private http: HttpClient) {}

  save(payload: InformeDiario): Observable<InformeDiario> {
    if (isDemoMode()) {
      return of({ informeId: Date.now(), status: 'SAVED', createdAt: Date.now(), updatedAt: Date.now(), ...payload });
    }
    return this.http.post<any>(`${this.baseUrl}/`, payload).pipe(
      map(resp => (resp?.data ?? resp) as InformeDiario)
    );
  }

  listByTeam(teamId: number): Observable<InformeDiario[]> {
    if (isDemoMode()) return of(this.demoHistory(teamId));
    return this.http.get<any>(`${this.baseUrl}/team/${teamId}`).pipe(
      map(resp => (resp?.data ?? []) as InformeDiario[]),
      catchError(() => of([] as InformeDiario[]))
    );
  }

  getByTeamAndDate(teamId: number, date: string): Observable<InformeDiario | null> {
    if (isDemoMode()) return of(null);
    return this.http.get<any>(`${this.baseUrl}/team/${teamId}/date/${date}`).pipe(
      map(resp => (resp?.data ?? null) as InformeDiario | null),
      catchError(() => of(null))
    );
  }

  getById(informeId: number): Observable<InformeDiario | null> {
    if (isDemoMode()) {
      return of({ informeId, clubId: 9001, teamId: 9001, reportDate: new Date().toISOString().substring(0, 10), rowsJson: '[]', status: 'SAVED' });
    }
    return this.http.get<any>(`${this.baseUrl}/${informeId}`).pipe(
      map(resp => (resp?.data ?? null) as InformeDiario | null),
      catchError(() => of(null))
    );
  }

  getPlayerTeams(teamId: number): Observable<Map<number, string>> {
    if (isDemoMode()) return of(new Map<number, string>());
    return this.http.get<any>(`${this.baseUrl}/team/${teamId}/player-teams`).pipe(
      map(resp => {
        const arr = (resp?.data ?? []) as Array<{ playerId: number; teamsLabel?: string }>;
        const m = new Map<number, string>();
        for (const it of arr) m.set(Number(it.playerId), it.teamsLabel ?? '');
        return m;
      }),
      catchError(() => of(new Map<number, string>()))
    );
  }

  remove(informeId: number): Observable<boolean> {
    if (isDemoMode()) return of(true);
    return this.http.delete<any>(`${this.baseUrl}/${informeId}`).pipe(
      map(resp => !!(resp?.data)),
      catchError(() => of(false))
    );
  }

  // ─── DEMO ──────────────────────────────────────────────────────────
  private demoHistory(teamId: number): InformeDiario[] {
    const today = new Date();
    const mk = (offset: number): InformeDiario => {
      const d = new Date(today);
      d.setDate(d.getDate() - offset);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return {
        informeId: 1000 + offset,
        clubId: 9001,
        teamId,
        reportDate: iso,
        nextSessionDate: null,
        teamName: 'Fútbol Senior',
        status: 'SAVED',
        createdByUserId: 1,
        createdByName: 'Staff médico',
        createdAt: d.getTime(),
        updatedAt: d.getTime()
      };
    };
    return [mk(0), mk(2), mk(4), mk(7)];
  }
}
