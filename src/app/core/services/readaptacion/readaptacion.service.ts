// ═══════════════════════════════════════════════════════════════════
// SPHAIRA – ReadaptacionService
// Parte diario de readaptación de jugadores lesionados activos.
// Backend: /rest/readaptacion/  (en modo demo devuelve mocks).
// ═══════════════════════════════════════════════════════════════════

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { isDemoMode } from '../demo/demo-mode';

/** Una fila de la pantalla de readaptación (un jugador lesionado activo). */
export interface ReadaptacionRow {
  playerId: number;
  injuryId: number;
  playerName: string;
  picturePlayer: string | null;
  zone: string | null;
  zoneLabel: string | null;
  type: string | null;
  rtpPhase: number;
  dateInjury: string | null;
  daysInjured: number;
  workDone: string | null;
  observations: string | null;
}

export interface ReadaptacionBundle {
  teamId: number;
  clubId: number;
  date: string;
  totalActive: number;
  entries: ReadaptacionRow[];
}

@Injectable({ providedIn: 'root' })
export class ReadaptacionService {

  private baseUrl = environment.apiUrl + 'readaptacion/';

  constructor(private http: HttpClient) {}

  /** Lista jugadores lesionados activos (baja competitiva) con su parte del día. */
  getForDate(teamId: number, date: string): Observable<ReadaptacionBundle> {
    if (isDemoMode()) {
      return of(this.demoBundle(teamId, date));
    }
    return this.http.get<any>(this.baseUrl + `team/${teamId}/date/${date}`).pipe(
      map(resp => {
        const d = resp?.data || {};
        return {
          teamId: d.teamId ?? teamId,
          clubId: d.clubId ?? 0,
          date: d.date ?? date,
          totalActive: d.totalActive ?? 0,
          entries: Array.isArray(d.entries) ? d.entries : []
        } as ReadaptacionBundle;
      }),
      catchError(() => of({ teamId, clubId: 0, date, totalActive: 0, entries: [] }))
    );
  }

  /** Crea/actualiza el parte de readaptación de un jugador para una fecha. */
  save(
    playerId: number,
    date: string,
    body: { teamId: number; clubId: number; workDone?: string | null; observations?: string | null }
  ): Observable<boolean> {
    if (isDemoMode()) return of(true);
    return this.http.put<any>(this.baseUrl + `player/${playerId}/date/${date}`, body).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  // ─── DEMO ──────────────────────────────────────────────────────────
  private demoBundle(teamId: number, date: string): ReadaptacionBundle {
    const entries: ReadaptacionRow[] = [
      {
        playerId: 8005, injuryId: 501, playerName: 'Pablo Sánchez',
        picturePlayer: 'demo-player-2.jpg', zone: 'isquio', zoneLabel: 'Isquiotibial',
        type: 'Rotura fibrilar', rtpPhase: 3, dateInjury: this.daysAgo(date, 21), daysInjured: 21,
        workDone: 'CARRERA_CONTINUA,CAMBIOS_DIRECCION', observations: 'Progresando bien, sin dolor en carrera.'
      },
      {
        playerId: 8014, injuryId: 502, playerName: 'Iván Moreno',
        picturePlayer: 'demo-player-3.jpg', zone: 'muslo', zoneLabel: 'Muslo',
        type: 'Contractura', rtpPhase: 2, dateInjury: this.daysAgo(date, 8), daysInjured: 8,
        workDone: 'MOVILIDAD,FORTALECIMIENTO', observations: 'Trabajo de fuerza sin impacto.'
      },
      {
        playerId: 8001, injuryId: 503, playerName: 'Carlos García',
        picturePlayer: 'demo-player-1.jpg', zone: 'tobillo', zoneLabel: 'Tobillo',
        type: 'Esguince grado I', rtpPhase: 4, dateInjury: this.daysAgo(date, 30), daysInjured: 30,
        workDone: 'CARRERA_CONTINUA,TRABAJO_BALON', observations: 'Fase final, integración con el grupo.'
      }
    ];
    return { teamId, clubId: 9001, date, totalActive: entries.length, entries };
  }

  private daysAgo(fromIso: string, days: number): string {
    const d = new Date(fromIso);
    d.setDate(d.getDate() - days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
