// ════════════════════════════════════════════════════════════════════════
// SPHAIRA – WellnessService
// HTTP wrapper para los endpoints /rest/wellness/* del backend.
// En modo demo devuelve plantilla + respuestas de equipo ficticias.
// ════════════════════════════════════════════════════════════════════════

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { isDemoMode } from '../demo/demo-mode';
import {
  WellnessTemplate,
  WellnessTeamEntry,
  WellnessTeamRow,
  WellnessSubmissionPayload,
  WellnessTemplateSchema,
  parseTemplateSchema,
  WellnessRiskLevel
} from './wellness.model';

@Injectable({ providedIn: 'root' })
export class WellnessService {

  private baseUrl = environment.apiUrl + 'wellness/';

  constructor(private http: HttpClient) {}

  // ─── Templates ────────────────────────────────────────────────────────

  getTemplates(clubId: number): Observable<WellnessTemplate[]> {
    if (isDemoMode()) return of([this.demoTemplate(clubId)]);
    return this.http.get<any>(`${this.baseUrl}template/club/${clubId}`).pipe(
      map(r => Array.isArray(r?.data) ? r.data as WellnessTemplate[] : []),
      catchError(() => of([] as WellnessTemplate[]))
    );
  }

  // ─── Submit ───────────────────────────────────────────────────────────

  submit(payload: WellnessSubmissionPayload): Observable<any> {
    if (isDemoMode()) return of({ formResponseId: Date.now(), ...payload });
    return this.http.post<any>(`${this.baseUrl}submit`, payload).pipe(
      map(r => r?.data ?? null),
      catchError(err => of({ error: true, status: err?.status }))
    );
  }

  // ─── Reads ────────────────────────────────────────────────────────────

  getPlayerToday(teamId: number, userId: number): Observable<any | null> {
    if (isDemoMode()) {
      return of({
        formResponseId: userId,
        respuestas: JSON.stringify({ sleep: 4, fatigue: 3, soreness: 3, stress: 2, mood: 4, comments: '' }),
        createdAt: new Date().toISOString()
      });
    }
    return this.http.get<any>(`${this.baseUrl}player/${teamId}/${userId}/today`).pipe(
      map(r => r?.data ?? null),
      catchError(() => of(null))
    );
  }

  getTeamForDate(teamId: number, date: string): Observable<WellnessTeamEntry[]> {
    if (isDemoMode()) return of(this.demoTeamEntries(teamId, date));
    return this.http.get<any>(`${this.baseUrl}team/${teamId}/date/${date}`).pipe(
      map(r => Array.isArray(r?.data) ? r.data as WellnessTeamEntry[] : []),
      catchError(() => of([] as WellnessTeamEntry[]))
    );
  }

  getPlayerRange(teamId: number, userId: number, from: string, to: string): Observable<any[]> {
    if (isDemoMode()) return of(this.demoPlayerRange(teamId, userId, from, to));
    const params = `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    return this.http.get<any>(`${this.baseUrl}player/${teamId}/${userId}/range${params}`).pipe(
      map(r => Array.isArray(r?.data) ? r.data : []),
      catchError(() => of([]))
    );
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  toTeamRows(entries: WellnessTeamEntry[]): WellnessTeamRow[] {
    return entries.map(e => {
      const values: Record<string, number | string> = {};
      let comments = '';
      try {
        const parsed = JSON.parse(e.respuestas || '{}');
        Object.entries(parsed || {}).forEach(([k, v]) => {
          if (k === 'comments' && typeof v === 'string') comments = v;
          else if (typeof v === 'number') values[k] = v;
          else if (typeof v === 'string') values[k] = v;
        });
      } catch {
        // Si el JSON está corrupto, mantener values vacío
      }
      return {
        formResponseId: e.formResponseId,
        userId: e.userId,
        nombre: e.nombre,
        riskLevel: e.riskLevel ?? 'green',
        values,
        comments,
        createdAt: new Date(e.createdAt)
      };
    });
  }

  pickActiveSchema(templates: WellnessTemplate[]) {
    const first = templates && templates.length > 0 ? templates[0] : null;
    return {
      template: first,
      schema: parseTemplateSchema(first)
    };
  }

  riskBadgeClass(level: WellnessRiskLevel): string {
    if (level === 'red') return 'risk-badge risk-red';
    if (level === 'yellow') return 'risk-badge risk-yellow';
    return 'risk-badge risk-green';
  }

  // ─── DEMO ──────────────────────────────────────────────────────────
  private demoSchema(): WellnessTemplateSchema {
    return {
      version: 1,
      globalAlertWhen: 'sumLte:12',
      fields: [
        { id: 'sleep', label: 'Calidad del sueño', type: 'scale', min: 1, max: 5, minLabel: 'Muy mala', maxLabel: 'Excelente', alertLte: 2, required: true },
        { id: 'fatigue', label: 'Fatiga', type: 'scale', min: 1, max: 5, minLabel: 'Agotado', maxLabel: 'Muy fresco', alertLte: 2, required: true },
        { id: 'soreness', label: 'Dolor muscular', type: 'scale', min: 1, max: 5, minLabel: 'Mucho dolor', maxLabel: 'Sin dolor', alertLte: 2, required: true },
        { id: 'stress', label: 'Estrés', type: 'scale', min: 1, max: 5, minLabel: 'Muy estresado', maxLabel: 'Relajado', alertLte: 2, required: true },
        { id: 'mood', label: 'Estado de ánimo', type: 'scale', min: 1, max: 5, minLabel: 'Muy bajo', maxLabel: 'Muy bueno', alertLte: 2, required: true },
        { id: 'comments', label: 'Comentarios', type: 'text', required: false }
      ]
    };
  }

  private demoTemplate(clubId: number): WellnessTemplate {
    return {
      formTemplateId: 1,
      clubId: clubId || 9001,
      nombre: 'Wellness Hooper extendido',
      tipo: 'wellness-daily',
      campos: JSON.stringify(this.demoSchema()),
      activo: 1
    };
  }

  private risk(values: { [k: string]: number }): WellnessRiskLevel {
    const sum = Object.values(values).reduce((a, b) => a + b, 0);
    const anyLow = Object.values(values).some(v => v <= 2);
    if (sum <= 12 || anyLow) return 'red';
    if (sum <= 17) return 'yellow';
    return 'green';
  }

  private demoTeamEntries(teamId: number, date: string): WellnessTeamEntry[] {
    const roster: { userId: number; nombre: string; v: { sleep: number; fatigue: number; soreness: number; stress: number; mood: number }; comments?: string }[] = [
      { userId: 8001, nombre: 'Carlos García', v: { sleep: 4, fatigue: 4, soreness: 3, stress: 4, mood: 5 } },
      { userId: 8002, nombre: 'Miguel López', v: { sleep: 2, fatigue: 2, soreness: 2, stress: 3, mood: 3 }, comments: 'Dormí mal, cargado de gemelos.' },
      { userId: 8003, nombre: 'Antonio Ruiz', v: { sleep: 5, fatigue: 5, soreness: 4, stress: 4, mood: 5 } },
      { userId: 8005, nombre: 'Pablo Sánchez', v: { sleep: 3, fatigue: 3, soreness: 3, stress: 3, mood: 4 } },
      { userId: 8006, nombre: 'Javier Pérez', v: { sleep: 4, fatigue: 3, soreness: 2, stress: 2, mood: 3 }, comments: 'Molestia en el aductor.' },
      { userId: 8009, nombre: 'Diego Fernández', v: { sleep: 5, fatigue: 4, soreness: 4, stress: 5, mood: 5 } },
      { userId: 8014, nombre: 'Iván Moreno', v: { sleep: 2, fatigue: 2, soreness: 1, stress: 2, mood: 2 }, comments: 'Muy cansado.' },
    ];
    return roster.map((r, i) => ({
      formResponseId: 1000 + i,
      formTemplateId: 1,
      userId: r.userId,
      teamId,
      respuestas: JSON.stringify({ ...r.v, comments: r.comments ?? '' }),
      createdAt: date + 'T08:30:00',
      nombre: r.nombre,
      riskLevel: this.risk(r.v)
    }));
  }

  private demoPlayerRange(teamId: number, userId: number, from: string, to: string): any[] {
    const out: any[] = [];
    const start = new Date(from);
    const end = new Date(to);
    let i = 0;
    for (let d = new Date(start); d <= end && i < 14; d.setDate(d.getDate() + 1), i++) {
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const v = {
        sleep: 3 + ((userId + i) % 3),
        fatigue: 3 + (i % 3),
        soreness: 2 + ((userId + i) % 4),
        stress: 3 + (i % 2),
        mood: 3 + ((userId + i) % 3)
      };
      out.push({
        formResponseId: 2000 + i,
        userId,
        teamId,
        respuestas: JSON.stringify({ ...v, comments: '' }),
        createdAt: iso + 'T08:30:00',
        riskLevel: this.risk(v)
      });
    }
    return out;
  }
}
