// ════════════════════════════════════════════════════════════════════════
// SPHAIRA – RpeService
// HTTP wrapper para los endpoints /rest/rpe/* del backend.
// En modo demo devuelve un panel semanal ficticio plausible.
// ════════════════════════════════════════════════════════════════════════

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { isDemoMode } from '../demo/demo-mode';

/** Una sesión RPE individual tal como llega del backend. */
export interface RpeSession {
  rpeId: number;
  clubId: number;
  teamId: number;
  playerId: number;
  userId: number | null;
  trainingSessionId: number | null;
  sessionType: 'training' | 'match' | 'individual' | string;
  sessionDate: string;       // YYYY-MM-DD
  rpe: number;               // 0..10
  durationMin: number;
  sessionLoad: number;       // rpe * durationMin
  comments: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

/** Métricas Foster por jugador o por rango. */
export interface RpeMetrics {
  sRPE: number;
  dailyLoad: Record<string, number>;
  monotony: number;
  strain: number;
  daysWithLoad: number;
}

/** Bloque de un jugador en la respuesta de panel semanal del equipo. */
export interface RpeTeamPlayerBlock {
  playerId: number;
  metrics: RpeMetrics;
  sessions: RpeSession[];
}

/** Respuesta completa del panel semanal del equipo. */
export interface RpeTeamWeek {
  teamId: number;
  weekStart: string;
  weekEnd: string;
  teamLoad: number;
  players: RpeTeamPlayerBlock[];
}

/** Payload para `POST /rpe/submit`. */
export interface RpeSubmissionPayload {
  clubId: number;
  teamId: number;
  playerId: number;
  userId?: number;
  trainingSessionId?: number;
  sessionType?: 'training' | 'match' | 'individual';
  sessionDate?: string;
  rpe: number;
  durationMin: number;
  comments?: string;
}

@Injectable({ providedIn: 'root' })
export class RpeService {
  private baseUrl = environment.apiUrl + 'rpe/';

  constructor(private http: HttpClient) {}

  getTeamWeek(teamId: number, weekStart?: string): Observable<RpeTeamWeek | null> {
    if (isDemoMode()) return of(this.demoTeamWeek(teamId, weekStart));
    const url = weekStart
      ? `${this.baseUrl}team/${teamId}/week?weekStart=${weekStart}`
      : `${this.baseUrl}team/${teamId}/week`;
    return this.http.get<any>(url).pipe(
      map(r => (r?.data as RpeTeamWeek) ?? null),
      catchError(() => of(null))
    );
  }

  getPlayerRange(teamId: number, playerId: number, from: string, to: string):
      Observable<{ entries: RpeSession[]; metrics: RpeMetrics } | null> {
    if (isDemoMode()) {
      const block = this.demoPlayerBlock(teamId, playerId, from);
      return of({ entries: block.sessions, metrics: block.metrics });
    }
    return this.http.get<any>(
      `${this.baseUrl}player/${teamId}/${playerId}/range?from=${from}&to=${to}`
    ).pipe(
      map(r => r?.data ?? null),
      catchError(() => of(null))
    );
  }

  getPlayerToday(teamId: number, playerId: number, type: string = 'training'):
      Observable<RpeSession | null> {
    if (isDemoMode()) {
      const today = new Date().toISOString().substring(0, 10);
      return of(this.session(playerId, teamId, today, 6, 75, type));
    }
    return this.http.get<any>(
      `${this.baseUrl}player/${teamId}/${playerId}/today?type=${type}`
    ).pipe(
      map(r => (r?.data as RpeSession) ?? null),
      catchError(() => of(null))
    );
  }

  submit(payload: RpeSubmissionPayload): Observable<RpeSession | null> {
    if (isDemoMode()) {
      const date = payload.sessionDate ?? new Date().toISOString().substring(0, 10);
      return of(this.session(payload.playerId, payload.teamId, date, payload.rpe, payload.durationMin, payload.sessionType ?? 'training', payload.comments ?? null));
    }
    return this.http.post<any>(`${this.baseUrl}submit`, payload).pipe(
      map(r => (r?.data as RpeSession) ?? null),
      catchError(() => of(null))
    );
  }

  // ─── Helpers de UI ────────────────────────────────────────────────────

  strainZone(strain: number): 'low' | 'optimal' | 'alert' {
    if (strain >= 6000) return 'alert';
    if (strain >= 4000) return 'optimal';
    return 'low';
  }

  monotonyZone(monotony: number): 'low' | 'optimal' | 'alert' {
    if (monotony >= 2.0) return 'alert';
    if (monotony >= 1.0) return 'optimal';
    return 'low';
  }

  // ─── DEMO ──────────────────────────────────────────────────────────
  private iso(base: Date, offset: number): string {
    const d = new Date(base);
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private session(playerId: number, teamId: number, date: string, rpe: number, durationMin: number, type: string, comments: string | null = null): RpeSession {
    return {
      rpeId: playerId * 100 + parseInt(date.replace(/-/g, '').slice(-4), 10),
      clubId: 9001,
      teamId,
      playerId,
      userId: playerId,
      trainingSessionId: null,
      sessionType: type,
      sessionDate: date,
      rpe,
      durationMin,
      sessionLoad: rpe * durationMin,
      comments,
      createdAt: date + 'T20:00:00',
      updatedAt: null
    };
  }

  private monday(weekStart?: string): Date {
    if (weekStart) return new Date(weekStart);
    const today = new Date();
    const dow = (today.getDay() + 6) % 7;
    const m = new Date(today);
    m.setDate(today.getDate() - dow);
    return m;
  }

  private demoPlayerBlock(teamId: number, playerId: number, weekStart?: string): RpeTeamPlayerBlock {
    const mon = this.monday(weekStart);
    // Perfil de carga por jugador (variación determinista según playerId).
    const base = 5 + (playerId % 3);
    const rpes = [0, base, base + 1, base, base + 2, base - 1, base + 3];
    const durs = [0, 75, 90, 80, 85, 60, 95];
    const sessions: RpeSession[] = [];
    const dailyLoad: Record<string, number> = {};
    let sRPE = 0;
    const loads: number[] = [];
    for (let i = 0; i < 7; i++) {
      const date = this.iso(mon, i);
      const rpe = Math.max(0, Math.min(10, rpes[i]));
      if (rpe > 0) {
        const type = i === 6 ? 'match' : 'training';
        const s = this.session(playerId, teamId, date, rpe, durs[i], type);
        sessions.push(s);
        dailyLoad[date] = s.sessionLoad;
        sRPE += s.sessionLoad;
        loads.push(s.sessionLoad);
      } else {
        dailyLoad[date] = 0;
      }
    }
    const mean = loads.length ? sRPE / loads.length : 0;
    const variance = loads.length ? loads.reduce((a, l) => a + Math.pow(l - mean, 2), 0) / loads.length : 0;
    const std = Math.sqrt(variance);
    const monotony = std > 0 ? mean / std : 0;
    const strain = sRPE * monotony;
    return {
      playerId,
      metrics: {
        sRPE: Math.round(sRPE),
        dailyLoad,
        monotony: Math.round(monotony * 100) / 100,
        strain: Math.round(strain),
        daysWithLoad: loads.length
      },
      sessions
    };
  }

  private demoTeamWeek(teamId: number, weekStart?: string): RpeTeamWeek {
    const mon = this.monday(weekStart);
    const playerIds = [8001, 8002, 8003, 8005, 8006, 8009, 8014];
    const players = playerIds.map(pid => this.demoPlayerBlock(teamId, pid, weekStart));
    const teamLoad = players.reduce((a, p) => a + p.metrics.sRPE, 0);
    return {
      teamId,
      weekStart: this.iso(mon, 0),
      weekEnd: this.iso(mon, 6),
      teamLoad,
      players
    };
  }
}
