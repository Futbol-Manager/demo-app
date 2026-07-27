import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { isDemoMode } from '../demo/demo-mode';
import {
  CreateSeasonRequest,
  InitializeSeasonRequest,
  RolloverPlayersRequest,
  Season,
  SeasonBannerStatus,
  SeasonRolloverResult,
  SeasonUsage,
  UpdateSeasonRequest,
} from './season.model';

/**
 * Error tipado para distinguir los códigos de bloqueo del archivado de temporada.
 */
export interface DeleteSeasonError {
  code: string;
  usage?: SeasonUsage;
  status: number;
}

interface ApiResponse<T> {
  status?: number;
  data?: T | null;
  error?: { msg?: string } | null;
}

/**
 * Cliente del feature "Mi temporada" contra `/rest/club/{clubId}/seasons`.
 *
 * <p>En modo demo devuelve un catálogo de temporadas ficticio y simula las
 * escrituras con éxito.</p>
 */
@Injectable({ providedIn: 'root' })
export class SeasonsService {

  private readonly baseUrl = `${environment.apiUrl}club`;

  constructor(private http: HttpClient) {}

  private headers(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  // ── Lectura ───────────────────────────────────────────────────────────────

  list(clubId: number): Observable<Season[]> {
    if (isDemoMode()) return of(this.demoSeasons(clubId));
    return this.http
      .get<ApiResponse<Season[]>>(`${this.baseUrl}/${clubId}/seasons`, { headers: this.headers() })
      .pipe(
        timeout(15000),
        map((res) => (res?.data ?? []) as Season[]),
        catchError(() => of([] as Season[]))
      );
  }

  getCurrent(clubId: number): Observable<Season | null> {
    if (isDemoMode()) return of(this.demoSeasons(clubId).find(s => s.current) ?? null);
    return this.http
      .get<ApiResponse<Season | null>>(`${this.baseUrl}/${clubId}/seasons/current`, { headers: this.headers() })
      .pipe(
        timeout(10000),
        map((res) => (res?.data ?? null) as Season | null),
        catchError(() => of<Season | null>(null))
      );
  }

  getBannerStatus(clubId: number): Observable<SeasonBannerStatus> {
    if (isDemoMode()) return of({ showBanner: false });
    return this.http
      .get<ApiResponse<SeasonBannerStatus>>(`${this.baseUrl}/${clubId}/seasons/banner-status`, {
        headers: this.headers(),
      })
      .pipe(
        timeout(8000),
        map((res) => (res?.data ?? { showBanner: false }) as SeasonBannerStatus),
        catchError(() => of<SeasonBannerStatus>({ showBanner: false }))
      );
  }

  // ── Escritura (requiere ser dueño del club) ──────────────────────────────

  create(clubId: number, body: CreateSeasonRequest): Observable<Season> {
    if (isDemoMode()) {
      const year = (body?.year ?? String(new Date().getFullYear())).trim();
      return of(this.season(Date.now(), clubId, year, body?.startDate ?? `${year}-08-01`, body?.endDate, !!body?.setAsCurrent, 'active'));
    }
    return this.http.post<ApiResponse<Season>>(
      `${this.baseUrl}/${clubId}/seasons`,
      body || {},
      { headers: this.headers() }
    ).pipe(
      timeout(20000),
      map((res) => res?.data as Season)
    );
  }

  update(clubId: number, seasonId: number, body: UpdateSeasonRequest): Observable<Season> {
    if (isDemoMode()) {
      const year = (body?.year ?? '2024').trim();
      return of(this.season(seasonId, clubId, year, body?.startDate ?? `${year}-08-01`, body?.endDate, false, 'active'));
    }
    return this.http.put<ApiResponse<Season>>(
      `${this.baseUrl}/${clubId}/seasons/${seasonId}`,
      body || {},
      { headers: this.headers() }
    ).pipe(
      timeout(20000),
      map((res) => res?.data as Season)
    );
  }

  markAsCurrent(clubId: number, seasonId: number): Observable<{ success: boolean; current?: Season | null }> {
    if (isDemoMode()) {
      const s = this.demoSeasons(clubId).find(x => x.seasonId === seasonId) ?? null;
      return of({ success: true, current: s ? { ...s, current: true } : null });
    }
    return this.http.put<ApiResponse<Season | null>>(
      `${this.baseUrl}/${clubId}/seasons/${seasonId}/current`,
      {},
      { headers: this.headers() }
    ).pipe(
      timeout(10000),
      map((res) => ({ success: (res?.status ?? 0) === 200, current: res?.data ?? null })),
      catchError(() => of({ success: false, current: null }))
    );
  }

  getUsage(clubId: number, seasonId: number): Observable<SeasonUsage> {
    if (isDemoMode()) {
      // Temporadas antiguas (no actuales) demo: sin datos → archivables.
      return of({ realTeams: 0, placeholderTeams: 0, players: 0 });
    }
    return this.http.get<ApiResponse<SeasonUsage>>(
      `${this.baseUrl}/${clubId}/seasons/${seasonId}/usage`,
      { headers: this.headers() }
    ).pipe(
      timeout(10000),
      map((res) => (res?.data ?? { realTeams: 0, placeholderTeams: 0, players: 0 }) as SeasonUsage)
    );
  }

  delete(clubId: number, seasonId: number): Observable<SeasonUsage> {
    if (isDemoMode()) return of({ realTeams: 0, placeholderTeams: 0, players: 0 });
    return this.http.delete<ApiResponse<SeasonUsage>>(
      `${this.baseUrl}/${clubId}/seasons/${seasonId}`,
      { headers: this.headers() }
    ).pipe(
      timeout(20000),
      map((res) => (res?.data ?? { realTeams: 0, placeholderTeams: 0, players: 0 }) as SeasonUsage),
      catchError((err: HttpErrorResponse) => {
        const body = err?.error as ApiResponse<SeasonUsage> | undefined;
        const code = body?.error?.msg || (err?.status === 409 ? 'season_has_data' : 'unknown');
        const out: DeleteSeasonError = {
          code,
          usage: (body?.data as SeasonUsage | undefined) ?? undefined,
          status: err?.status ?? 0,
        };
        return throwError(() => out);
      })
    );
  }

  rolloverPlayers(clubId: number, body: RolloverPlayersRequest): Observable<SeasonRolloverResult> {
    if (isDemoMode()) {
      return of({
        fromSeasonYear: '2024',
        toSeasonYear: '2025',
        playersMoved: 16,
        playersSkippedBaja: 2,
        renovationsTeamId: 9901
      });
    }
    const toSeasonId = body.toSeasonId;
    return this.http.post<ApiResponse<SeasonRolloverResult>>(
      `${this.baseUrl}/${clubId}/seasons/${toSeasonId}/rollover-players`,
      { fromSeasonId: body.fromSeasonId },
      { headers: this.headers() }
    ).pipe(
      timeout(60000),
      map((res) => res?.data as SeasonRolloverResult)
    );
  }

  // ── Admin Sphaira (userId=9) ─────────────────────────────────────────────

  initializeForExistingClub(clubId: number, body: InitializeSeasonRequest = {}): Observable<Season> {
    if (isDemoMode()) {
      const year = (body?.year ?? String(new Date().getFullYear())).trim();
      return of(this.season(1, clubId, year, `${year}-08-01`, undefined, true, 'active'));
    }
    return this.http.put<ApiResponse<Season>>(
      `${this.baseUrl}/admin/${clubId}/initialize-current-season`,
      body,
      { headers: this.headers() }
    ).pipe(
      timeout(15000),
      map((res) => res?.data as Season)
    );
  }

  adminUpdate(clubId: number, seasonId: number, body: UpdateSeasonRequest): Observable<Season> {
    if (isDemoMode()) {
      const year = (body?.year ?? '2024').trim();
      return of(this.season(seasonId, clubId, year, `${year}-08-01`, body?.endDate, false, 'active'));
    }
    return this.http.put<ApiResponse<Season>>(
      `${this.baseUrl}/admin/${clubId}/seasons/${seasonId}`,
      body,
      { headers: this.headers() }
    ).pipe(
      timeout(20000),
      map((res) => res?.data as Season)
    );
  }

  // ─── DEMO ──────────────────────────────────────────────────────────
  private season(seasonId: number, clubId: number, year: string, startDate: string, endDate: string | undefined, current: boolean, status: string): Season {
    const y = parseInt(year, 10);
    return {
      seasonId,
      clubId: clubId || 9001,
      year,
      startDate,
      endDate: endDate ?? (isNaN(y) ? undefined : `${y + 1}-06-30`),
      label: isNaN(y) ? year : `${y}/${y + 1}`,
      current,
      status,
      createdAt: startDate
    };
  }

  private demoSeasons(clubId: number): Season[] {
    const cid = clubId || 9001;
    const cy = new Date().getMonth() >= 7 ? new Date().getFullYear() : new Date().getFullYear() - 1;
    return [
      this.season(3, cid, String(cy), `${cy}-08-01`, `${cy + 1}-06-30`, true, 'active'),
      this.season(2, cid, String(cy - 1), `${cy - 1}-08-01`, `${cy}-06-30`, false, 'active'),
      this.season(1, cid, String(cy - 2), `${cy - 2}-08-01`, `${cy - 1}-06-30`, false, 'active'),
    ];
  }
}
