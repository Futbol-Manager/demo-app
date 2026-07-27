import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from 'src/environments/environment';
import { isDemoMode } from '../demo/demo-mode';

/**
 * Modelos del módulo de Nutrición (Fase 3.1, Modo Profesional).
 */

export interface NutritionProfile {
  profileId?: number;
  clubId: number;
  playerId: number;
  heightCm: number | null;
  weightKg: number | null;
  targetWeightKg: number | null;
  bloodType: string | null;
  allergies: string | null;
  intolerances: string | null;
  medications: string | null;
  dietaryPreferences: string | null;
  generalNotes: string | null;
  updatedByUserId?: number | null;
  updatedByName?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface SkinFold {
  skinfoldId: number;
  clubId: number;
  playerId: number;
  measurementDate: string; // yyyy-MM-dd
  weightKg: number | null;
  heightCm: number | null;
  tricepsMm: number | null;
  subscapularMm: number | null;
  bicepsMm: number | null;
  iliacCrestMm: number | null;
  supraspinalMm: number | null;
  abdominalMm: number | null;
  anteriorThighMm: number | null;
  medialCalfMm: number | null;
  sum8Mm: number | null;
  fatPercentage: number | null;
  notes: string | null;
  measuredByUserId?: number | null;
  measuredByName?: string | null;
}

export interface Supplement {
  supplementationId: number;
  clubId: number;
  playerId: number;
  supplementName: string;
  dose: string | null;
  route: string | null;
  frequency: string | null;
  purpose: string | null;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
  notes: string | null;
  prescribedByUserId?: number | null;
  prescribedByName?: string | null;
}

export type MealType =
  | 'BREAKFAST' | 'MIDMORNING' | 'LUNCH' | 'SNACK'
  | 'DINNER' | 'POST_TRAINING' | 'OTHER';

export interface DietMeal {
  mealId?: number;
  dietPlanId?: number;
  clubId?: number;
  mealOrder: number;
  mealType: MealType;
  mealTime: string | null;   // HH:mm
  title: string | null;
  description: string | null;
  kcal: number | null;
  carbsG: number | null;
  proteinG: number | null;
  fatG: number | null;
}

export interface DietPlan {
  dietPlanId?: number;
  clubId: number;
  playerId: number;
  name: string;
  goal: string | null;
  kcalTarget: number | null;
  carbsG: number | null;
  proteinG: number | null;
  fatG: number | null;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
  notes: string | null;
  createdByUserId?: number | null;
  createdByName?: string | null;
  meals: DietMeal[];
  createdAt?: string | null;
  updatedAt?: string | null;
}

/**
 * Cliente Angular para `/rest/nutrition/...`.
 *
 * <p>En modo demo devuelve perfil, pliegues, suplementación y planes de
 * dieta ficticios plausibles.</p>
 */
@Injectable({ providedIn: 'root' })
export class NutricionService {

  private readonly baseUrl = `${environment.apiUrl}nutrition`;

  constructor(private http: HttpClient) {}

  // ---------- profile ----------
  getProfile(playerId: number): Observable<NutritionProfile | null> {
    if (isDemoMode()) return of(this.demoProfile(playerId));
    return this.http
      .get<any>(`${this.baseUrl}/player/${playerId}/profile`)
      .pipe(map(r => (r?.data?.profile ?? null) as NutritionProfile | null));
  }

  upsertProfile(playerId: number, body: Partial<NutritionProfile>): Observable<NutritionProfile> {
    if (isDemoMode()) return of({ ...this.demoProfile(playerId), ...body });
    return this.http
      .post<any>(`${this.baseUrl}/player/${playerId}/profile`, body)
      .pipe(map(r => r?.data as NutritionProfile));
  }

  // ---------- skinfolds ----------
  getSkinfolds(playerId: number): Observable<SkinFold[]> {
    if (isDemoMode()) return of(this.demoSkinfolds(playerId));
    return this.http
      .get<any>(`${this.baseUrl}/player/${playerId}/skinfold`)
      .pipe(map(r => (r?.data?.skinfolds ?? []) as SkinFold[]));
  }

  createSkinfold(playerId: number, body: Partial<SkinFold>): Observable<SkinFold> {
    if (isDemoMode()) return of({ skinfoldId: Date.now(), clubId: 9001, playerId, ...body } as SkinFold);
    return this.http
      .post<any>(`${this.baseUrl}/player/${playerId}/skinfold`, body)
      .pipe(map(r => r?.data as SkinFold));
  }

  updateSkinfold(skinfoldId: number, body: Partial<SkinFold>): Observable<SkinFold> {
    if (isDemoMode()) return of({ skinfoldId, ...body } as SkinFold);
    return this.http
      .put<any>(`${this.baseUrl}/skinfold/${skinfoldId}`, body)
      .pipe(map(r => r?.data as SkinFold));
  }

  deleteSkinfold(skinfoldId: number): Observable<void> {
    if (isDemoMode()) return of(undefined);
    return this.http
      .delete<any>(`${this.baseUrl}/skinfold/${skinfoldId}`)
      .pipe(map(() => undefined));
  }

  // ---------- supplementation ----------
  getSupplements(playerId: number): Observable<Supplement[]> {
    if (isDemoMode()) return of(this.demoSupplements(playerId));
    return this.http
      .get<any>(`${this.baseUrl}/player/${playerId}/supplement`)
      .pipe(map(r => (r?.data?.supplements ?? []) as Supplement[]));
  }

  createSupplement(playerId: number, body: Partial<Supplement>): Observable<Supplement> {
    if (isDemoMode()) return of({ supplementationId: Date.now(), clubId: 9001, playerId, active: true, ...body } as Supplement);
    return this.http
      .post<any>(`${this.baseUrl}/player/${playerId}/supplement`, body)
      .pipe(map(r => r?.data as Supplement));
  }

  updateSupplement(id: number, body: Partial<Supplement>): Observable<Supplement> {
    if (isDemoMode()) return of({ supplementationId: id, ...body } as Supplement);
    return this.http
      .put<any>(`${this.baseUrl}/supplement/${id}`, body)
      .pipe(map(r => r?.data as Supplement));
  }

  deleteSupplement(id: number): Observable<void> {
    if (isDemoMode()) return of(undefined);
    return this.http
      .delete<any>(`${this.baseUrl}/supplement/${id}`)
      .pipe(map(() => undefined));
  }

  // ---------- diet plans ----------
  getDietPlans(playerId: number): Observable<DietPlan[]> {
    if (isDemoMode()) return of([this.demoDietPlan(playerId)]);
    return this.http
      .get<any>(`${this.baseUrl}/player/${playerId}/diet`)
      .pipe(map(r => (r?.data?.plans ?? []) as DietPlan[]));
  }

  getActiveDietPlan(playerId: number): Observable<DietPlan | null> {
    if (isDemoMode()) return of(this.demoDietPlan(playerId));
    return this.http
      .get<any>(`${this.baseUrl}/player/${playerId}/diet/active`)
      .pipe(map(r => (r?.data?.plan ?? null) as DietPlan | null));
  }

  createDietPlan(playerId: number, body: Partial<DietPlan>): Observable<DietPlan> {
    if (isDemoMode()) return of({ ...this.demoDietPlan(playerId), dietPlanId: Date.now(), ...body } as DietPlan);
    return this.http
      .post<any>(`${this.baseUrl}/player/${playerId}/diet`, body)
      .pipe(map(r => r?.data as DietPlan));
  }

  updateDietPlan(id: number, body: Partial<DietPlan>): Observable<DietPlan> {
    if (isDemoMode()) return of({ dietPlanId: id, ...body } as DietPlan);
    return this.http
      .put<any>(`${this.baseUrl}/diet/${id}`, body)
      .pipe(map(r => r?.data as DietPlan));
  }

  deleteDietPlan(id: number): Observable<void> {
    if (isDemoMode()) return of(undefined);
    return this.http
      .delete<any>(`${this.baseUrl}/diet/${id}`)
      .pipe(map(() => undefined));
  }

  // ─── DEMO ──────────────────────────────────────────────────────────
  private isoMonthsAgo(months: number): string {
    const d = new Date();
    d.setMonth(d.getMonth() - months);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-10`;
  }

  private demoProfile(playerId: number): NutritionProfile {
    return {
      profileId: playerId,
      clubId: 9001,
      playerId,
      heightCm: 180,
      weightKg: 73.5,
      targetWeightKg: 72,
      bloodType: '0+',
      allergies: 'Ninguna',
      intolerances: 'Lactosa (leve)',
      medications: null,
      dietaryPreferences: 'Sin cerdo',
      generalNotes: 'Buena adherencia al plan.',
      updatedByUserId: 1,
      updatedByName: 'Nutricionista',
      createdAt: '2024-09-01',
      updatedAt: new Date().toISOString()
    };
  }

  private demoSkinfolds(playerId: number): SkinFold[] {
    return [
      { skinfoldId: playerId * 10 + 1, clubId: 9001, playerId, measurementDate: this.isoMonthsAgo(3), weightKg: 74.5, heightCm: 180, tricepsMm: 8.2, subscapularMm: 9.1, bicepsMm: 3.8, iliacCrestMm: 10.5, supraspinalMm: 7.2, abdominalMm: 11.0, anteriorThighMm: 9.5, medialCalfMm: 6.1, sum8Mm: 65.4, fatPercentage: 12.4, notes: 'Pretemporada', measuredByUserId: 1, measuredByName: 'Nutricionista' },
      { skinfoldId: playerId * 10 + 2, clubId: 9001, playerId, measurementDate: this.isoMonthsAgo(0), weightKg: 73.2, heightCm: 180, tricepsMm: 7.5, subscapularMm: 8.6, bicepsMm: 3.5, iliacCrestMm: 9.8, supraspinalMm: 6.5, abdominalMm: 10.0, anteriorThighMm: 8.9, medialCalfMm: 5.8, sum8Mm: 60.6, fatPercentage: 11.1, notes: 'Composición óptima', measuredByUserId: 1, measuredByName: 'Nutricionista' },
    ];
  }

  private demoSupplements(playerId: number): Supplement[] {
    return [
      { supplementationId: playerId * 10 + 1, clubId: 9001, playerId, supplementName: 'Creatina monohidrato', dose: '5 g', route: 'Oral', frequency: 'Diaria', purpose: 'Fuerza y potencia', startDate: this.isoMonthsAgo(2), endDate: null, active: true, notes: 'Tras entrenamiento', prescribedByUserId: 1, prescribedByName: 'Nutricionista' },
      { supplementationId: playerId * 10 + 2, clubId: 9001, playerId, supplementName: 'Vitamina D3', dose: '2000 UI', route: 'Oral', frequency: 'Diaria', purpose: 'Salud ósea', startDate: this.isoMonthsAgo(4), endDate: null, active: true, notes: null, prescribedByUserId: 1, prescribedByName: 'Nutricionista' },
      { supplementationId: playerId * 10 + 3, clubId: 9001, playerId, supplementName: 'Magnesio', dose: '300 mg', route: 'Oral', frequency: 'Noche', purpose: 'Recuperación / descanso', startDate: this.isoMonthsAgo(1), endDate: null, active: false, notes: 'Pausado', prescribedByUserId: 1, prescribedByName: 'Nutricionista' },
    ];
  }

  private demoDietPlan(playerId: number): DietPlan {
    const meals: DietMeal[] = [
      { mealId: 1, clubId: 9001, mealOrder: 1, mealType: 'BREAKFAST', mealTime: '08:00', title: 'Desayuno', description: 'Avena con fruta, huevos y café', kcal: 620, carbsG: 70, proteinG: 30, fatG: 20 },
      { mealId: 2, clubId: 9001, mealOrder: 2, mealType: 'MIDMORNING', mealTime: '11:00', title: 'Media mañana', description: 'Yogur y frutos secos', kcal: 300, carbsG: 20, proteinG: 15, fatG: 15 },
      { mealId: 3, clubId: 9001, mealOrder: 3, mealType: 'LUNCH', mealTime: '14:00', title: 'Comida', description: 'Arroz, pollo y verduras', kcal: 780, carbsG: 90, proteinG: 45, fatG: 20 },
      { mealId: 4, clubId: 9001, mealOrder: 4, mealType: 'POST_TRAINING', mealTime: '20:30', title: 'Post-entreno', description: 'Batido de proteína y plátano', kcal: 320, carbsG: 40, proteinG: 25, fatG: 5 },
      { mealId: 5, clubId: 9001, mealOrder: 5, mealType: 'DINNER', mealTime: '22:00', title: 'Cena', description: 'Pescado, patata y ensalada', kcal: 650, carbsG: 55, proteinG: 40, fatG: 22 },
    ];
    return {
      dietPlanId: playerId,
      clubId: 9001,
      playerId,
      name: 'Plan de temporada',
      goal: 'Mantenimiento y rendimiento',
      kcalTarget: 2700,
      carbsG: 275,
      proteinG: 155,
      fatG: 82,
      startDate: this.isoMonthsAgo(1),
      endDate: null,
      active: true,
      notes: 'Ajustar hidratos según carga de entrenamiento.',
      createdByUserId: 1,
      createdByName: 'Nutricionista',
      meals,
      createdAt: this.isoMonthsAgo(1),
      updatedAt: new Date().toISOString()
    };
  }
}
