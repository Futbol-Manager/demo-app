// ═══════════════════════════════════════════════════════════════════
// SPHAIRA – IndividualTrainingService (Angular)
// HTTP calls to backend /rest/individual-training/
// ═══════════════════════════════════════════════════════════════════

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  IndividualPlan,
  IndividualPlanDay,
  TrainingLog,
  PlayerComplianceSummary,
  IndividualPlanGeneratorInput,
} from './individual-training.model';

@Injectable({ providedIn: 'root' })
export class IndividualTrainingService {

  private base = environment.apiUrl + 'individual-training/';

  constructor(private http: HttpClient) {}

  // ─── PLANS ────────────────────────────────────────────────────

  createPlan(body: Partial<IndividualPlan> & { days?: any[]; playerIds?: number[] }): Observable<IndividualPlan | null> {
    return this.http.post<any>(this.base + 'plan', body).pipe(
      map(r => r?.data ?? r),
      catchError(err => { console.error('[IndividualTrainingService] createPlan', err); return of(null); })
    );
  }

  getPlans(params: { teamId?: number; playerId?: number; clubId?: number; userId?: number } = {}): Observable<IndividualPlan[]> {
    let p = new HttpParams();
    if (params.teamId   != null) p = p.set('teamId',   params.teamId);
    if (params.playerId != null) p = p.set('playerId', params.playerId);
    if (params.clubId   != null) p = p.set('clubId',   params.clubId);
    if (params.userId   != null) p = p.set('userId',   params.userId);
    return this.http.get<any>(this.base + 'plan', { params: p }).pipe(
      map(r => r?.data ?? r ?? []),
      catchError(err => { console.error('[IndividualTrainingService] getPlans', err); return of([]); })
    );
  }

  getPlanById(planId: number): Observable<IndividualPlan | null> {
    return this.http.get<any>(this.base + `plan/${planId}`).pipe(
      map(r => r?.data ?? r),
      catchError(err => { console.error('[IndividualTrainingService] getPlanById', err); return of(null); })
    );
  }

  updatePlan(planId: number, body: Partial<IndividualPlan>): Observable<IndividualPlan | null> {
    return this.http.put<any>(this.base + `plan/${planId}`, body).pipe(
      map(r => r?.data ?? r),
      catchError(err => { console.error('[IndividualTrainingService] updatePlan', err); return of(null); })
    );
  }

  deletePlan(planId: number): Observable<boolean> {
    return this.http.delete<any>(this.base + `plan/${planId}`).pipe(
      map(() => true),
      catchError(err => { console.error('[IndividualTrainingService] deletePlan', err); return of(false); })
    );
  }

  assignPlayers(planId: number, playerIds: number[]): Observable<boolean> {
    return this.http.post<any>(this.base + `plan/${planId}/assign`, { playerIds }).pipe(
      map(() => true),
      catchError(err => { console.error('[IndividualTrainingService] assignPlayers', err); return of(false); })
    );
  }

  unassignPlayer(planId: number, playerId: number): Observable<boolean> {
    return this.http.delete<any>(this.base + `plan/${planId}/players/${playerId}`).pipe(
      map(() => true),
      catchError(err => { console.error('[IndividualTrainingService] unassignPlayer', err); return of(false); })
    );
  }

  removeAllPlayers(planId: number): Observable<boolean> {
    return this.http.delete<any>(this.base + `plan/${planId}/players`).pipe(
      map(() => true),
      catchError(err => { console.error('[IndividualTrainingService] removeAllPlayers', err); return of(false); })
    );
  }

  getAssignedPlayers(planId: number): Observable<{ playerId: number; playerName?: string; posicion?: string }[]> {
    return this.http.get<any>(this.base + `plan/${planId}/players`).pipe(
      map(r => r?.data ?? r ?? []),
      catchError(err => { console.error('[IndividualTrainingService] getAssignedPlayers', err); return of([]); })
    );
  }

  // ─── PLAN DAYS ────────────────────────────────────────────────

  getPlanDays(planId: number): Observable<IndividualPlanDay[]> {
    return this.http.get<any>(this.base + `plan/${planId}/days`).pipe(
      map(r => r?.data ?? r ?? []),
      catchError(err => { console.error('[IndividualTrainingService] getPlanDays', err); return of([]); })
    );
  }

  // ─── TRAINING LOGS ────────────────────────────────────────────

  getLogs(params: { playerId?: number; planId?: number; planDayId?: number } = {}): Observable<TrainingLog[]> {
    let p = new HttpParams();
    if (params.playerId  != null) p = p.set('playerId',  params.playerId);
    if (params.planId    != null) p = p.set('planId',    params.planId);
    if (params.planDayId != null) p = p.set('planDayId', params.planDayId);
    return this.http.get<any>(this.base + 'log', { params: p }).pipe(
      map(r => r?.data ?? r ?? []),
      catchError(err => { console.error('[IndividualTrainingService] getLogs', err); return of([]); })
    );
  }

  // ─── COMPLIANCE ───────────────────────────────────────────────

  getCompliance(planId: number): Observable<PlayerComplianceSummary[]> {
    const params = new HttpParams().set('planId', planId);
    return this.http.get<any>(this.base + 'compliance', { params }).pipe(
      map(r => r?.data ?? r ?? []),
      catchError(err => { console.error('[IndividualTrainingService] getCompliance', err); return of([]); })
    );
  }

  // ─── AI GENERATOR ─────────────────────────────────────────────

  aiGeneratePlan(input: IndividualPlanGeneratorInput): Observable<any> {
    return this.http.post<any>(this.base + 'plan/ai-generate', input).pipe(
      map(r => {
        const raw = r?.data ?? r;
        if (typeof raw === 'string') {
          try { return JSON.parse(raw); } catch { return null; }
        }
        return raw;
      }),
      catchError(err => { console.error('[IndividualTrainingService] aiGeneratePlan', err); return of(null); })
    );
  }
}
