import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from 'src/environments/environment';
import { isDemoMode } from '../demo/demo-mode';

/**
 * Bloque dentro de una sesión de entrenamiento (Fase 2.3, Modo Profesional).
 */
export interface ScheduleBlock {
  blockId: number;
  trainingSessionId: number;
  teamId: number;
  clubId: number;
  blockOrder: number;
  category: string;
  title: string;
  startTime?: string | null;
  durationMin: number;
  notes?: string | null;
  color?: string | null;
  createdByUserId?: number | null;
  createdByName?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/**
 * Resultado del endpoint listar-por-sesión y por-equipo-y-fecha. Si no hay
 * sesión asociada al día (caso por-equipo-y-fecha), {@code sessionId} es
 * {@code null} y {@code blocks} es un array vacío.
 */
export interface ScheduleBundle {
  sessionId: number | null;
  teamId: number;
  clubId: number;
  date?: string;
  daySession?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  totalDurationMin: number;
  blocks: ScheduleBlock[];
}

export interface ScheduleBlockUpsert {
  category?: string;
  title?: string;
  startTime?: string | null;
  durationMin?: number;
  blockOrder?: number;
  notes?: string | null;
  color?: string | null;
  createdByUserId?: number | null;
  createdByName?: string | null;
}

/**
 * Cliente Angular para el módulo de "Horarios" del Modo Profesional
 * (endpoint {@code /rest/training-schedule}).
 *
 * <p>Todos los endpoints están hard-gated por {@code professionalModeEnabled}.
 * El backend responde {@code 403 PROFESSIONAL_MODE_DISABLED} para clubes
 * base, así que el front debe ocultar la UI antes de invocar.</p>
 */
@Injectable({ providedIn: 'root' })
export class TrainingScheduleService {
  private readonly baseUrl = `${environment.apiUrl}training-schedule`;

  constructor(private http: HttpClient) {}

  // ── Datos mock para modo demo ────────────────────────────────────────────
  private demoBlocks(sessionId: number, teamId: number = 1): ScheduleBlock[] {
    const base: Array<{ cat: string; title: string; start: string; dur: number; color: string; notes: string }> = [
      { cat: 'Activación',   title: 'Movilidad articular y calentamiento', start: '18:00', dur: 15, color: '#31b270', notes: 'Circuito de activación + coordinación' },
      { cat: 'Técnico',      title: 'Rondos 4v2 y pases',                   start: '18:15', dur: 20, color: '#002c40', notes: 'Ritmo alto, dos toques' },
      { cat: 'Táctico',      title: 'Juego de posición 8v8',                start: '18:35', dur: 25, color: '#1f7a8c', notes: 'Salida de balón bajo presión' },
      { cat: 'Físico',       title: 'Series de velocidad',                  start: '19:00', dur: 15, color: '#e07a5f', notes: '6x30m con recuperación completa' },
      { cat: 'Competitivo',  title: 'Partido reducido + ABP',               start: '19:15', dur: 20, color: '#3d405b', notes: 'Aplicación de estrategia de córners' },
      { cat: 'Vuelta calma', title: 'Estiramientos y feedback',             start: '19:35', dur: 10, color: '#81b29a', notes: 'Análisis breve de la sesión' },
    ];
    return base.map((b, i) => ({
      blockId: sessionId * 10 + i,
      trainingSessionId: sessionId,
      teamId,
      clubId: 1,
      blockOrder: i,
      category: b.cat,
      title: b.title,
      startTime: b.start,
      durationMin: b.dur,
      notes: b.notes,
      color: b.color,
      createdByName: 'Cuerpo técnico',
    }));
  }

  private demoBundle(sessionId: number | null, teamId: number, date?: string): ScheduleBundle {
    const blocks = sessionId != null ? this.demoBlocks(sessionId, teamId) : [];
    return {
      sessionId,
      teamId,
      clubId: 1,
      date,
      daySession: 'Tarde',
      startTime: blocks.length ? blocks[0].startTime ?? null : null,
      endTime: '19:45',
      totalDurationMin: blocks.reduce((s, b) => s + b.durationMin, 0),
      blocks,
    };
  }

  /** Bloques de una sesión concreta (típicamente desde el modal). */
  getBySession(sessionId: number): Observable<ScheduleBundle> {
    if (isDemoMode()) {
      return of(this.demoBundle(sessionId, 1));
    }
    return this.http
      .get<any>(`${this.baseUrl}/session/${sessionId}`)
      .pipe(map(resp => this.normalize(resp?.data ?? resp)));
  }

  /**
   * Atajo para Panel diario / app jugador: dado un equipo y fecha, resuelve
   * la sesión del día y devuelve sus bloques (lista vacía si no hay sesión).
   */
  getByTeamAndDate(teamId: number, dateIsoYmd: string): Observable<ScheduleBundle> {
    if (isDemoMode()) {
      return of(this.demoBundle(teamId * 100 + 1, teamId, dateIsoYmd));
    }
    return this.http
      .get<any>(`${this.baseUrl}/team/${teamId}/date/${dateIsoYmd}`)
      .pipe(map(resp => this.normalize(resp?.data ?? resp)));
  }

  /** Crea un bloque al final de la sesión (o en {@code blockOrder} si se envía). */
  create(sessionId: number, body: ScheduleBlockUpsert): Observable<ScheduleBlock> {
    if (isDemoMode()) {
      return of({
        blockId: Date.now(),
        trainingSessionId: sessionId,
        teamId: 1,
        clubId: 1,
        blockOrder: body.blockOrder ?? 99,
        category: body.category ?? 'Técnico',
        title: body.title ?? 'Nuevo bloque',
        startTime: body.startTime ?? null,
        durationMin: body.durationMin ?? 15,
        notes: body.notes ?? null,
        color: body.color ?? '#31b270',
        createdByName: body.createdByName ?? 'Demo',
      });
    }
    return this.http
      .post<any>(`${this.baseUrl}/session/${sessionId}`, body)
      .pipe(map(resp => resp?.data ?? resp));
  }

  /** PATCH semántico: solo se modifican los campos presentes. */
  update(blockId: number, body: ScheduleBlockUpsert): Observable<ScheduleBlock> {
    if (isDemoMode()) {
      return of({
        blockId,
        trainingSessionId: 1,
        teamId: 1,
        clubId: 1,
        blockOrder: body.blockOrder ?? 0,
        category: body.category ?? 'Técnico',
        title: body.title ?? 'Bloque',
        startTime: body.startTime ?? null,
        durationMin: body.durationMin ?? 15,
        notes: body.notes ?? null,
        color: body.color ?? '#31b270',
      });
    }
    return this.http
      .put<any>(`${this.baseUrl}/block/${blockId}`, body)
      .pipe(map(resp => resp?.data ?? resp));
  }

  delete(blockId: number): Observable<{ blockId: number; deleted: boolean }> {
    if (isDemoMode()) {
      return of({ blockId, deleted: true });
    }
    return this.http
      .delete<any>(`${this.baseUrl}/block/${blockId}`)
      .pipe(map(resp => resp?.data ?? resp));
  }

  /** Reordena los bloques de una sesión enviando los IDs en el nuevo orden. */
  reorder(sessionId: number, blockIds: number[]): Observable<ScheduleBlock[]> {
    if (isDemoMode()) {
      const blocks = this.demoBlocks(sessionId, 1);
      const reordered = blockIds
        .map((id, idx) => {
          const b = blocks.find(x => x.blockId === id) ?? blocks[idx];
          return b ? { ...b, blockOrder: idx } : null;
        })
        .filter((b): b is ScheduleBlock => b !== null);
      return of(reordered.length ? reordered : blocks);
    }
    return this.http
      .put<any>(`${this.baseUrl}/session/${sessionId}/reorder`, { blockIds })
      .pipe(map(resp => resp?.data ?? resp));
  }

  private normalize(raw: any): ScheduleBundle {
    return {
      sessionId: raw?.sessionId ?? null,
      teamId: raw?.teamId ?? 0,
      clubId: raw?.clubId ?? 0,
      date: raw?.date ?? undefined,
      daySession: raw?.daySession ?? null,
      startTime: raw?.startTime ?? null,
      endTime: raw?.endTime ?? null,
      totalDurationMin: raw?.totalDurationMin ?? 0,
      blocks: Array.isArray(raw?.blocks) ? raw.blocks : []
    };
  }
}
