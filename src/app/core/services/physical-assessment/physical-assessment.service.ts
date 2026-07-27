import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from 'src/environments/environment';
import { isDemoMode } from '../demo/demo-mode';

/**
 * Modelos del módulo de Tests físicos + Composición corporal
 * (Fase 3.2, Modo Profesional).
 */

export type PhysicalTestType =
  | 'CMJ' | 'SQUAT_JUMP' | 'DROP_JUMP'
  | 'SPRINT_10M' | 'SPRINT_20M' | 'SPRINT_30M'
  | 'AGILITY_T' | 'AGILITY_505' | 'AGILITY_ILLINOIS'
  | 'SIT_AND_REACH' | 'PLANK_ISOMETRIC'
  | 'YOYO_IR1' | 'MAS' | 'COOPER' | 'VO2MAX'
  | 'BENCH_PRESS_1RM' | 'BACK_SQUAT_1RM' | 'PULL_UPS_MAX'
  | 'OTHER';

export interface PhysicalTest {
  testId?: number;
  clubId?: number;
  playerId: number;
  measurementDate: string;       // yyyy-MM-dd
  testType: PhysicalTestType | string;
  value: number | null;
  unit: string | null;
  value2: number | null;
  value2Unit: string | null;
  notes: string | null;
  measuredByUserId?: number | null;
  measuredByName?: string | null;
}

export type BodyCompositionMethod = 'BIA' | 'DEXA' | 'HYDRO' | 'OTHER';

export interface BodyComposition {
  compId?: number;
  clubId?: number;
  playerId: number;
  measurementDate: string;       // yyyy-MM-dd
  method: BodyCompositionMethod | string | null;
  weightKg: number | null;
  heightCm: number | null;
  bodyFatPct: number | null;
  muscleMassKg: number | null;
  leanMassKg: number | null;
  waterPct: number | null;
  visceralFat: number | null;
  basalMetabolismKcal: number | null;
  boneDensity: number | null;
  notes: string | null;
  measuredByUserId?: number | null;
  measuredByName?: string | null;
}

/**
 * Cliente Angular para `/rest/physical/...`.
 *
 * <p>En modo demo devuelve tests y composición corporal ficticios.</p>
 */
@Injectable({ providedIn: 'root' })
export class PhysicalAssessmentService {

  private readonly baseUrl = `${environment.apiUrl}physical`;

  constructor(private http: HttpClient) {}

  // ---------- physical tests ----------
  getTests(playerId: number): Observable<PhysicalTest[]> {
    if (isDemoMode()) return of(this.demoTests(playerId));
    return this.http
      .get<any>(`${this.baseUrl}/player/${playerId}/test`)
      .pipe(map(r => (r?.data?.tests ?? []) as PhysicalTest[]));
  }

  getTestsByType(playerId: number, testType: string): Observable<PhysicalTest[]> {
    if (isDemoMode()) return of(this.demoTests(playerId).filter(t => t.testType === testType));
    return this.http
      .get<any>(`${this.baseUrl}/player/${playerId}/test/type/${encodeURIComponent(testType)}`)
      .pipe(map(r => (r?.data?.tests ?? []) as PhysicalTest[]));
  }

  createTest(playerId: number, body: Partial<PhysicalTest>): Observable<PhysicalTest> {
    if (isDemoMode()) return of({ testId: Date.now(), clubId: 9001, playerId, ...body } as PhysicalTest);
    return this.http
      .post<any>(`${this.baseUrl}/player/${playerId}/test`, body)
      .pipe(map(r => r?.data as PhysicalTest));
  }

  updateTest(id: number, body: Partial<PhysicalTest>): Observable<PhysicalTest> {
    if (isDemoMode()) return of({ testId: id, ...body } as PhysicalTest);
    return this.http
      .put<any>(`${this.baseUrl}/test/${id}`, body)
      .pipe(map(r => r?.data as PhysicalTest));
  }

  deleteTest(id: number): Observable<void> {
    if (isDemoMode()) return of(undefined);
    return this.http
      .delete<any>(`${this.baseUrl}/test/${id}`)
      .pipe(map(() => undefined));
  }

  // ---------- body composition ----------
  getCompositions(playerId: number): Observable<BodyComposition[]> {
    if (isDemoMode()) return of(this.demoCompositions(playerId));
    return this.http
      .get<any>(`${this.baseUrl}/player/${playerId}/body`)
      .pipe(map(r => (r?.data?.compositions ?? []) as BodyComposition[]));
  }

  createComposition(playerId: number, body: Partial<BodyComposition>): Observable<BodyComposition> {
    if (isDemoMode()) return of({ compId: Date.now(), clubId: 9001, playerId, ...body } as BodyComposition);
    return this.http
      .post<any>(`${this.baseUrl}/player/${playerId}/body`, body)
      .pipe(map(r => r?.data as BodyComposition));
  }

  updateComposition(id: number, body: Partial<BodyComposition>): Observable<BodyComposition> {
    if (isDemoMode()) return of({ compId: id, ...body } as BodyComposition);
    return this.http
      .put<any>(`${this.baseUrl}/body/${id}`, body)
      .pipe(map(r => r?.data as BodyComposition));
  }

  deleteComposition(id: number): Observable<void> {
    if (isDemoMode()) return of(undefined);
    return this.http
      .delete<any>(`${this.baseUrl}/body/${id}`)
      .pipe(map(() => undefined));
  }

  // ─── DEMO ──────────────────────────────────────────────────────────
  private isoMonthsAgo(months: number): string {
    const d = new Date();
    d.setMonth(d.getMonth() - months);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-15`;
  }

  private demoTests(playerId: number): PhysicalTest[] {
    return [
      { testId: playerId * 10 + 1, clubId: 9001, playerId, measurementDate: this.isoMonthsAgo(3), testType: 'CMJ', value: 38.5, unit: 'cm', value2: null, value2Unit: null, notes: 'Test pretemporada', measuredByUserId: 1, measuredByName: 'Preparador físico' },
      { testId: playerId * 10 + 2, clubId: 9001, playerId, measurementDate: this.isoMonthsAgo(1), testType: 'CMJ', value: 40.2, unit: 'cm', value2: null, value2Unit: null, notes: 'Mejora tras bloque de fuerza', measuredByUserId: 1, measuredByName: 'Preparador físico' },
      { testId: playerId * 10 + 3, clubId: 9001, playerId, measurementDate: this.isoMonthsAgo(1), testType: 'SPRINT_20M', value: 2.98, unit: 's', value2: null, value2Unit: null, notes: null, measuredByUserId: 1, measuredByName: 'Preparador físico' },
      { testId: playerId * 10 + 4, clubId: 9001, playerId, measurementDate: this.isoMonthsAgo(0), testType: 'YOYO_IR1', value: 2040, unit: 'm', value2: 18.5, value2Unit: 'nivel', notes: 'Buen nivel aeróbico', measuredByUserId: 1, measuredByName: 'Preparador físico' },
    ];
  }

  private demoCompositions(playerId: number): BodyComposition[] {
    return [
      { compId: playerId * 10 + 1, clubId: 9001, playerId, measurementDate: this.isoMonthsAgo(3), method: 'BIA', weightKg: 74.5, heightCm: 180, bodyFatPct: 12.4, muscleMassKg: 60.1, leanMassKg: 65.2, waterPct: 60.2, visceralFat: 6, basalMetabolismKcal: 1820, boneDensity: null, notes: 'Inicio de temporada', measuredByUserId: 1, measuredByName: 'Nutricionista' },
      { compId: playerId * 10 + 2, clubId: 9001, playerId, measurementDate: this.isoMonthsAgo(0), method: 'BIA', weightKg: 73.2, heightCm: 180, bodyFatPct: 11.1, muscleMassKg: 61.0, leanMassKg: 65.9, waterPct: 61.0, visceralFat: 5, basalMetabolismKcal: 1845, boneDensity: null, notes: 'Composición óptima', measuredByUserId: 1, measuredByName: 'Nutricionista' },
    ];
  }
}
