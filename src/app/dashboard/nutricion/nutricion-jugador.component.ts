import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

import { LoginService } from 'src/app/core/services/login/login.service';
import { ClubService } from 'src/app/core/services/club/club.service';
import { ClubModulesService, ClubModules } from 'src/app/core/services/club/club-modules.service';
import {
  NutricionService,
  NutritionProfile,
  SkinFold,
  Supplement,
  DietPlan,
  DietMeal,
  MealType
} from 'src/app/core/services/nutricion/nutricion.service';

type Tab = 'profile' | 'skinfold' | 'diet' | 'supplement';

interface DraftSkin {
  skinfoldId: number | null;
  measurementDate: string;
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
  fatPercentage: number | null;
  notes: string;
}

interface DraftSupp {
  supplementationId: number | null;
  supplementName: string;
  dose: string;
  route: string;
  frequency: string;
  purpose: string;
  startDate: string;
  endDate: string;
  active: boolean;
  notes: string;
}

const MEAL_TYPES: MealType[] = [
  'BREAKFAST', 'MIDMORNING', 'LUNCH', 'SNACK', 'DINNER', 'POST_TRAINING', 'OTHER'
];

const MEAL_LABELS: { [k in MealType]: string } = {
  BREAKFAST: 'Desayuno',
  MIDMORNING: 'Media mañana',
  LUNCH: 'Comida',
  SNACK: 'Merienda',
  DINNER: 'Cena',
  POST_TRAINING: 'Post-entreno',
  OTHER: 'Otra'
};

/**
 * Pantalla de Nutrición por jugador (Fase 3.1, Modo Profesional).
 *
 * <p>Cuatro tabs: Perfil, Pliegues (ISAK 8), Dieta, Suplementación.</p>
 *
 * <p>Hard-gate por {@code professionalModeEnabled}. Acceso en lectura para
 * el jugador (perfil 3); CRUD para Club Admin (1), Staff con permisos (9),
 * Fisio (6), Nutricionista (7) y Médico (8).</p>
 *
 * Ruta: {@code /dashboard/nutricion/:playerId}
 */
@Component({
  selector: 'app-nutricion-jugador',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="nutri-page">
      <div class="page-header">
        <button class="btn-back" (click)="goBack()"><i class="bi bi-arrow-left"></i> Volver</button>
        <div class="header-center">
          <h2><i class="bi bi-egg-fried me-2"></i>Nutrición <span class="badge-pro">Pro</span></h2>
          <p class="subtitle" *ngIf="playerName">{{ playerName }}</p>
        </div>
        <div class="spacer"></div>
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="loading-state">
        <div class="spinner-border text-primary"></div><p>Cargando…</p>
      </div>

      <!-- Modo Pro desactivado -->
      <div *ngIf="!loading && disabledByMaster" class="disabled-state">
        <i class="bi bi-shield-lock"></i>
        <h3>Modo Profesional desactivado</h3>
        <p>El club no tiene activo el Modo Profesional. Pide al administrador que lo active en Ajustes para usar Nutrición.</p>
      </div>

      <!-- Error -->
      <div *ngIf="!loading && errorMessage" class="error-state">
        <i class="bi bi-exclamation-triangle"></i>
        <p>{{ errorMessage }}</p>
      </div>

      <!-- Contenido -->
      <div *ngIf="!loading && !disabledByMaster && !errorMessage" class="content">
        <ul class="tabs">
          <li [class.active]="tab === 'profile'" (click)="setTab('profile')"><i class="bi bi-person-badge"></i> Perfil</li>
          <li [class.active]="tab === 'skinfold'" (click)="setTab('skinfold')"><i class="bi bi-bar-chart"></i> Pliegues</li>
          <li [class.active]="tab === 'diet'" (click)="setTab('diet')"><i class="bi bi-list-check"></i> Dieta</li>
          <li [class.active]="tab === 'supplement'" (click)="setTab('supplement')"><i class="bi bi-capsule"></i> Suplementación</li>
        </ul>

        <!-- TAB: PROFILE ============================================== -->
        <section *ngIf="tab === 'profile'" class="card">
          <div class="row">
            <div class="col-md-3">
              <label>Altura (cm)</label>
              <input type="number" step="0.1" class="form-control" [(ngModel)]="profile.heightCm" [disabled]="readOnly" />
            </div>
            <div class="col-md-3">
              <label>Peso (kg)</label>
              <input type="number" step="0.1" class="form-control" [(ngModel)]="profile.weightKg" [disabled]="readOnly" />
            </div>
            <div class="col-md-3">
              <label>Peso objetivo (kg)</label>
              <input type="number" step="0.1" class="form-control" [(ngModel)]="profile.targetWeightKg" [disabled]="readOnly" />
            </div>
            <div class="col-md-3">
              <label>Grupo sanguíneo</label>
              <input type="text" maxlength="6" class="form-control" [(ngModel)]="profile.bloodType" [disabled]="readOnly" />
            </div>
          </div>
          <div class="row mt-2">
            <div class="col-md-6">
              <label>Alergias</label>
              <textarea class="form-control" rows="2" [(ngModel)]="profile.allergies" [disabled]="readOnly"></textarea>
            </div>
            <div class="col-md-6">
              <label>Intolerancias</label>
              <textarea class="form-control" rows="2" [(ngModel)]="profile.intolerances" [disabled]="readOnly"></textarea>
            </div>
          </div>
          <div class="row mt-2">
            <div class="col-md-6">
              <label>Medicación</label>
              <textarea class="form-control" rows="2" [(ngModel)]="profile.medications" [disabled]="readOnly"></textarea>
            </div>
            <div class="col-md-6">
              <label>Preferencias</label>
              <textarea class="form-control" rows="2" [(ngModel)]="profile.dietaryPreferences" [disabled]="readOnly"></textarea>
            </div>
          </div>
          <div class="row mt-2">
            <div class="col-md-12">
              <label>Notas generales</label>
              <textarea class="form-control" rows="3" [(ngModel)]="profile.generalNotes" [disabled]="readOnly"></textarea>
            </div>
          </div>
          <div class="row mt-3" *ngIf="!readOnly">
            <div class="col-md-12 text-end">
              <button class="btn btn-primary" (click)="saveProfile()" [disabled]="saving">
                <i class="bi bi-check2"></i> Guardar perfil
              </button>
            </div>
          </div>
        </section>

        <!-- TAB: SKINFOLD ============================================= -->
        <section *ngIf="tab === 'skinfold'" class="card">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h4 class="m-0"><i class="bi bi-rulers"></i> Histórico ISAK 8 pliegues</h4>
            <button *ngIf="!readOnly" class="btn btn-primary btn-sm" (click)="openSkinfoldDraft()">
              <i class="bi bi-plus-lg"></i> Nueva medición
            </button>
          </div>

          <div *ngIf="skinfolds.length === 0" class="empty">
            <i class="bi bi-clipboard-data"></i>
            <p>Sin mediciones registradas.</p>
          </div>

          <div class="table-responsive" *ngIf="skinfolds.length > 0">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>Fecha</th><th>Peso</th><th>Σ8 (mm)</th><th>% grasa</th><th>Medidor</th><th></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let s of skinfolds">
                  <td>{{ s.measurementDate }}</td>
                  <td>{{ s.weightKg }}</td>
                  <td>{{ s.sum8Mm }}</td>
                  <td>{{ s.fatPercentage }}</td>
                  <td>{{ s.measuredByName }}</td>
                  <td class="text-end">
                    <button *ngIf="!readOnly" class="btn btn-sm btn-link" (click)="editSkinfold(s)"><i class="bi bi-pencil"></i></button>
                    <button *ngIf="!readOnly" class="btn btn-sm btn-link text-danger" (click)="deleteSkinfold(s)"><i class="bi bi-trash"></i></button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- TAB: DIET ================================================= -->
        <section *ngIf="tab === 'diet'" class="card">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h4 class="m-0"><i class="bi bi-list-check"></i> Planes dietéticos</h4>
            <button *ngIf="!readOnly" class="btn btn-primary btn-sm" (click)="openDietDraft()">
              <i class="bi bi-plus-lg"></i> Nuevo plan
            </button>
          </div>

          <div *ngIf="diets.length === 0" class="empty">
            <i class="bi bi-egg-fried"></i>
            <p>Sin planes asignados.</p>
          </div>

          <div *ngFor="let p of diets" class="diet-card" [class.inactive]="!p.active">
            <div class="diet-head">
              <strong>{{ p.name }}</strong>
              <span class="badge bg-success" *ngIf="p.active">Activo</span>
              <span class="badge bg-secondary" *ngIf="!p.active">Inactivo</span>
              <span class="text-muted ms-2" *ngIf="p.kcalTarget">{{ p.kcalTarget }} kcal · C{{ p.carbsG || '-' }} P{{ p.proteinG || '-' }} F{{ p.fatG || '-' }}</span>
              <span class="text-muted ms-2" *ngIf="p.startDate">desde {{ p.startDate }}</span>
              <button *ngIf="!readOnly" class="btn btn-sm btn-link float-end" (click)="editDiet(p)"><i class="bi bi-pencil"></i></button>
              <button *ngIf="!readOnly && p.dietPlanId" class="btn btn-sm btn-link float-end text-danger" (click)="deleteDiet(p)"><i class="bi bi-trash"></i></button>
            </div>
            <div class="diet-meals">
              <div class="meal-row" *ngFor="let m of p.meals">
                <span class="meal-time">{{ m.mealTime || '—' }}</span>
                <span class="meal-type">{{ mealLabel(m.mealType) }}</span>
                <span class="meal-title">{{ m.title || m.description }}</span>
                <span class="meal-kcal" *ngIf="m.kcal">{{ m.kcal }} kcal</span>
              </div>
            </div>
          </div>
        </section>

        <!-- TAB: SUPPLEMENTATION ====================================== -->
        <section *ngIf="tab === 'supplement'" class="card">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h4 class="m-0"><i class="bi bi-capsule"></i> Pautas de suplementación</h4>
            <button *ngIf="!readOnly" class="btn btn-primary btn-sm" (click)="openSuppDraft()">
              <i class="bi bi-plus-lg"></i> Nueva pauta
            </button>
          </div>

          <div *ngIf="supplements.length === 0" class="empty">
            <i class="bi bi-capsule"></i>
            <p>Sin pautas registradas.</p>
          </div>

          <div class="table-responsive" *ngIf="supplements.length > 0">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>Suplemento</th><th>Dosis</th><th>Frecuencia</th><th>Periodo</th><th></th><th></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let s of supplements" [class.inactive]="!s.active">
                  <td>{{ s.supplementName }}</td>
                  <td>{{ s.dose }}</td>
                  <td>{{ s.frequency }}</td>
                  <td>
                    <span *ngIf="s.startDate">{{ s.startDate }}</span>
                    <span *ngIf="s.endDate"> → {{ s.endDate }}</span>
                  </td>
                  <td><span class="badge bg-success" *ngIf="s.active">Activo</span><span class="badge bg-secondary" *ngIf="!s.active">Inactivo</span></td>
                  <td class="text-end">
                    <button *ngIf="!readOnly" class="btn btn-sm btn-link" (click)="editSupp(s)"><i class="bi bi-pencil"></i></button>
                    <button *ngIf="!readOnly" class="btn btn-sm btn-link text-danger" (click)="deleteSupp(s)"><i class="bi bi-trash"></i></button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <!-- Modal SKINFOLD -->
      <div class="modal-bg" *ngIf="skinfoldDraft">
        <div class="modal-card">
          <h4>{{ skinfoldDraft.skinfoldId ? 'Editar medición' : 'Nueva medición' }}</h4>
          <div class="row g-2">
            <div class="col-md-4"><label>Fecha</label><input type="date" class="form-control" [(ngModel)]="skinfoldDraft.measurementDate"/></div>
            <div class="col-md-4"><label>Peso (kg)</label><input type="number" step="0.1" class="form-control" [(ngModel)]="skinfoldDraft.weightKg"/></div>
            <div class="col-md-4"><label>Altura (cm)</label><input type="number" step="0.1" class="form-control" [(ngModel)]="skinfoldDraft.heightCm"/></div>
            <div class="col-md-3"><label>Tríceps</label><input type="number" step="0.1" class="form-control" [(ngModel)]="skinfoldDraft.tricepsMm"/></div>
            <div class="col-md-3"><label>Subescapular</label><input type="number" step="0.1" class="form-control" [(ngModel)]="skinfoldDraft.subscapularMm"/></div>
            <div class="col-md-3"><label>Bíceps</label><input type="number" step="0.1" class="form-control" [(ngModel)]="skinfoldDraft.bicepsMm"/></div>
            <div class="col-md-3"><label>Cresta ilíaca</label><input type="number" step="0.1" class="form-control" [(ngModel)]="skinfoldDraft.iliacCrestMm"/></div>
            <div class="col-md-3"><label>Supraespinal</label><input type="number" step="0.1" class="form-control" [(ngModel)]="skinfoldDraft.supraspinalMm"/></div>
            <div class="col-md-3"><label>Abdominal</label><input type="number" step="0.1" class="form-control" [(ngModel)]="skinfoldDraft.abdominalMm"/></div>
            <div class="col-md-3"><label>Muslo ant.</label><input type="number" step="0.1" class="form-control" [(ngModel)]="skinfoldDraft.anteriorThighMm"/></div>
            <div class="col-md-3"><label>Pierna med.</label><input type="number" step="0.1" class="form-control" [(ngModel)]="skinfoldDraft.medialCalfMm"/></div>
            <div class="col-md-4"><label>% grasa</label><input type="number" step="0.1" class="form-control" [(ngModel)]="skinfoldDraft.fatPercentage"/></div>
            <div class="col-md-12"><label>Notas</label><textarea class="form-control" rows="2" [(ngModel)]="skinfoldDraft.notes"></textarea></div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" (click)="skinfoldDraft = null">Cancelar</button>
            <button class="btn btn-primary" (click)="saveSkinfold()" [disabled]="saving">Guardar</button>
          </div>
        </div>
      </div>

      <!-- Modal SUPPLEMENT -->
      <div class="modal-bg" *ngIf="suppDraft">
        <div class="modal-card">
          <h4>{{ suppDraft.supplementationId ? 'Editar pauta' : 'Nueva pauta' }}</h4>
          <div class="row g-2">
            <div class="col-md-12"><label>Suplemento *</label><input type="text" class="form-control" [(ngModel)]="suppDraft.supplementName"/></div>
            <div class="col-md-4"><label>Dosis</label><input type="text" class="form-control" [(ngModel)]="suppDraft.dose"/></div>
            <div class="col-md-4"><label>Vía</label><input type="text" class="form-control" [(ngModel)]="suppDraft.route"/></div>
            <div class="col-md-4"><label>Frecuencia</label><input type="text" class="form-control" [(ngModel)]="suppDraft.frequency"/></div>
            <div class="col-md-12"><label>Objetivo</label><input type="text" class="form-control" [(ngModel)]="suppDraft.purpose"/></div>
            <div class="col-md-4"><label>Inicio</label><input type="date" class="form-control" [(ngModel)]="suppDraft.startDate"/></div>
            <div class="col-md-4"><label>Fin</label><input type="date" class="form-control" [(ngModel)]="suppDraft.endDate"/></div>
            <div class="col-md-4 d-flex align-items-end">
              <div class="form-check">
                <input type="checkbox" class="form-check-input" [(ngModel)]="suppDraft.active" id="sup-active"/>
                <label class="form-check-label" for="sup-active">Activa</label>
              </div>
            </div>
            <div class="col-md-12"><label>Notas</label><textarea class="form-control" rows="2" [(ngModel)]="suppDraft.notes"></textarea></div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" (click)="suppDraft = null">Cancelar</button>
            <button class="btn btn-primary" (click)="saveSupp()" [disabled]="saving">Guardar</button>
          </div>
        </div>
      </div>

      <!-- Modal DIET -->
      <div class="modal-bg" *ngIf="dietDraft">
        <div class="modal-card modal-lg">
          <h4>{{ dietDraft.dietPlanId ? 'Editar plan' : 'Nuevo plan' }}</h4>
          <div class="row g-2">
            <div class="col-md-6"><label>Nombre *</label><input type="text" class="form-control" [(ngModel)]="dietDraft.name"/></div>
            <div class="col-md-6"><label>Objetivo</label><input type="text" class="form-control" [(ngModel)]="dietDraft.goal"/></div>
            <div class="col-md-3"><label>Kcal</label><input type="number" class="form-control" [(ngModel)]="dietDraft.kcalTarget"/></div>
            <div class="col-md-3"><label>Carbs (g)</label><input type="number" class="form-control" [(ngModel)]="dietDraft.carbsG"/></div>
            <div class="col-md-3"><label>Prot (g)</label><input type="number" class="form-control" [(ngModel)]="dietDraft.proteinG"/></div>
            <div class="col-md-3"><label>Grasa (g)</label><input type="number" class="form-control" [(ngModel)]="dietDraft.fatG"/></div>
            <div class="col-md-4"><label>Inicio</label><input type="date" class="form-control" [(ngModel)]="dietDraft.startDate"/></div>
            <div class="col-md-4"><label>Fin</label><input type="date" class="form-control" [(ngModel)]="dietDraft.endDate"/></div>
            <div class="col-md-4 d-flex align-items-end">
              <div class="form-check">
                <input type="checkbox" class="form-check-input" [(ngModel)]="dietDraft.active" id="diet-active"/>
                <label class="form-check-label" for="diet-active">Activo</label>
              </div>
            </div>
            <div class="col-md-12"><label>Notas</label><textarea class="form-control" rows="2" [(ngModel)]="dietDraft.notes"></textarea></div>
          </div>

          <h5 class="mt-3">Comidas</h5>
          <div class="meal-edit" *ngFor="let m of dietDraft.meals; let i = index">
            <div class="row g-1">
              <div class="col-md-2">
                <select class="form-select form-select-sm" [(ngModel)]="m.mealType">
                  <option *ngFor="let t of mealTypes" [value]="t">{{ mealLabel(t) }}</option>
                </select>
              </div>
              <div class="col-md-1"><input type="time" class="form-control form-control-sm" [(ngModel)]="m.mealTime"/></div>
              <div class="col-md-3"><input type="text" class="form-control form-control-sm" placeholder="Título" [(ngModel)]="m.title"/></div>
              <div class="col-md-3"><input type="text" class="form-control form-control-sm" placeholder="Descripción" [(ngModel)]="m.description"/></div>
              <div class="col-md-1"><input type="number" class="form-control form-control-sm" placeholder="kcal" [(ngModel)]="m.kcal"/></div>
              <div class="col-md-1"><input type="number" class="form-control form-control-sm" placeholder="C" [(ngModel)]="m.carbsG"/></div>
              <div class="col-md-1 text-end"><button class="btn btn-sm btn-link text-danger" (click)="removeMeal(i)"><i class="bi bi-x-lg"></i></button></div>
            </div>
          </div>
          <button class="btn btn-sm btn-outline-primary mt-2" (click)="addMeal()"><i class="bi bi-plus-lg"></i> Añadir comida</button>

          <div class="modal-actions">
            <button class="btn btn-secondary" (click)="dietDraft = null">Cancelar</button>
            <button class="btn btn-primary" (click)="saveDiet()" [disabled]="saving">Guardar</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .nutri-page { padding: 20px; }
    .page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .btn-back { background: none; border: 1px solid #d1d5db; padding: 6px 12px; border-radius: 6px; cursor: pointer; }
    .header-center { flex: 1; text-align: center; }
    .header-center h2 { margin: 0; }
    .subtitle { margin: 0; color: #6b7280; font-size: 0.95rem; }
    .badge-pro { background: #f59e0b; color: white; padding: 2px 8px; border-radius: 6px; font-size: 0.75rem; vertical-align: middle; }
    .spacer { width: 80px; }

    .loading-state, .disabled-state, .error-state {
      text-align: center; padding: 40px; color: #6b7280;
    }
    .disabled-state i, .error-state i { font-size: 2.5rem; margin-bottom: 8px; display: block; }

    .tabs {
      display: flex; gap: 4px; padding: 0; margin: 0 0 16px 0; list-style: none;
      border-bottom: 2px solid #e5e7eb;
    }
    .tabs li {
      padding: 10px 16px; cursor: pointer; border-bottom: 2px solid transparent;
      margin-bottom: -2px; color: #6b7280;
    }
    .tabs li.active { color: #f59e0b; border-bottom-color: #f59e0b; font-weight: 600; }
    .tabs li i { margin-right: 6px; }

    .card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    label { display: block; margin-bottom: 4px; font-size: 0.85rem; color: #4b5563; }

    /* ── Tablas estilo Sphaira ───────────────────────────────────── */
    .table-responsive {
      border: 1px solid #e9eef1; border-radius: 16px; overflow: hidden;
      box-shadow: 0 8px 24px rgba(0,44,64,0.06);
    }
    .table-responsive .table { margin: 0; border-collapse: separate; border-spacing: 0; }
    .table-responsive .table > thead > tr > th {
      background: #f1f5f7; color: #002c40; font-weight: 800;
      text-transform: uppercase; font-size: 11px; letter-spacing: .05em;
      border-bottom: 2px solid #dde6ea; padding: 12px 14px; vertical-align: middle;
    }
    .table-responsive .table > tbody > tr > td {
      padding: 12px 14px; border-bottom: 1px solid #eef2f4; vertical-align: middle;
      color: #334155; font-size: .9rem;
    }
    .table-responsive .table > tbody > tr { transition: background .12s ease; }
    .table-responsive .table > tbody > tr:nth-child(even) { background: #fafcfd; }
    .table-responsive .table > tbody > tr:hover { background: #eafaf1; }
    .table-responsive .table > tbody > tr.inactive { opacity: .55; }
    .table-responsive .table > tbody > tr:last-child > td { border-bottom: 0; }

    .empty { text-align: center; padding: 40px; color: #9ca3af; }
    .empty i { font-size: 2rem; display: block; margin-bottom: 8px; }

    .diet-card { padding: 12px; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 8px; }
    .diet-card.inactive { opacity: 0.6; }
    .diet-head { margin-bottom: 8px; }
    .diet-meals .meal-row { display: grid; grid-template-columns: 60px 100px 1fr 80px; gap: 8px; padding: 4px 0; font-size: 0.9rem; border-top: 1px dashed #f3f4f6; }
    .meal-time { color: #6b7280; }
    .meal-type { color: #f59e0b; }
    .meal-title { font-weight: 500; }

    .modal-bg {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;
      padding: 20px;
    }
    .modal-card {
      background: white; border-radius: 8px; padding: 24px;
      max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto;
    }
    .modal-card.modal-lg { max-width: 900px; }
    .modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
    .meal-edit { padding: 6px 0; border-bottom: 1px dashed #e5e7eb; }

    tr.inactive { opacity: 0.5; }
  `]
})
export class NutricionJugadorComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  playerId = 0;
  playerName: string = '';
  clubId = 0;
  userId = 0;
  profileId = 0;
  userName = '';
  modules: ClubModules = { clubId: 0, wellnessEnabled: false, rpeEnabled: false, professionalModeEnabled: false, accessControlEnabled: false, menuSport: 'futbol' };

  loading = true;
  saving = false;
  errorMessage: string | null = null;
  disabledByMaster = false;
  tab: Tab = 'profile';

  profile: NutritionProfile = this.emptyProfile();
  skinfolds: SkinFold[] = [];
  diets: DietPlan[] = [];
  supplements: Supplement[] = [];

  skinfoldDraft: DraftSkin | null = null;
  suppDraft: DraftSupp | null = null;
  dietDraft: DietPlan | null = null;

  readonly mealTypes = MEAL_TYPES;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private notification: ToastrService,
    private loginService: LoginService,
    private clubService: ClubService,
    private clubModulesService: ClubModulesService,
    private nutricionService: NutricionService,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.playerId = Number(this.route.snapshot.paramMap.get('playerId') || 0);
    this.playerName = this.route.snapshot.queryParamMap.get('playerName') || '';
    if (!this.playerId) {
      this.errorMessage = 'No se ha indicado el jugador.';
      this.loading = false;
      return;
    }
    this.bootstrap();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── readOnly por perfil ─────────────────────────────────────────
  get readOnly(): boolean {
    // Jugador (3) sólo lectura. El resto editan si tienen acceso.
    return this.profileId === 3;
  }

  setTab(t: Tab): void { this.tab = t; }
  goBack(): void { this.location.back(); }
  mealLabel(t: MealType | string): string { return MEAL_LABELS[(t as MealType)] || t; }

  // ─── bootstrap ───────────────────────────────────────────────────
  private bootstrap(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.loginService.usuarioActual.pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.userId = (user as any)?.userId ?? 0;
      this.profileId = (user as any)?.profileType?.profileId ?? 0;
      this.userName = (user as any)?.firstName
        ? `${(user as any).firstName} ${(user as any).secondName || ''}`.trim()
        : '';

      this.resolveClubId(user).then(clubId => {
        this.clubId = clubId;
        if (!clubId) {
          this.errorMessage = 'No se ha podido resolver el club.';
          this.loading = false;
          this.cdr.markForCheck();
          return;
        }
        this.clubModulesService.getModules(clubId).subscribe({
          next: (mods) => {
            this.modules = mods;
            if (!mods.professionalModeEnabled) {
              this.disabledByMaster = true;
              this.loading = false;
              this.cdr.markForCheck();
              return;
            }
            this.loadAll();
          },
          error: () => {
            this.errorMessage = 'No se han podido cargar los módulos del club.';
            this.loading = false;
            this.cdr.markForCheck();
          }
        });
      });
    });
  }

  private async resolveClubId(user: any): Promise<number> {
    const stored = Number(sessionStorage.getItem('clubId') ?? '0');
    if (stored > 0) return stored;
    const direct = user?.clubId || user?.club?.clubId;
    if (direct) return Number(direct);
    if (!user?.userId) return 0;
    return new Promise<number>(resolve => {
      this.clubService.getClubForEntrenador(user.userId).subscribe({
        next: (r: any) => {
          const cid = Number(r?.data ?? 0);
          if (cid > 0) sessionStorage.setItem('clubId', String(cid));
          resolve(cid);
        },
        error: () => resolve(0)
      });
    });
  }

  private loadAll(): void {
    let pending = 4;
    const done = () => { pending--; if (pending === 0) { this.loading = false; this.cdr.markForCheck(); } };

    this.nutricionService.getProfile(this.playerId).subscribe({
      next: (p) => { this.profile = p ?? this.emptyProfile(); done(); },
      error: () => { this.profile = this.emptyProfile(); done(); }
    });
    this.nutricionService.getSkinfolds(this.playerId).subscribe({
      next: (rs) => { this.skinfolds = rs; done(); },
      error: () => { this.skinfolds = []; done(); }
    });
    this.nutricionService.getDietPlans(this.playerId).subscribe({
      next: (ps) => { this.diets = ps.map(p => ({ ...p, meals: p.meals ?? [] })); done(); },
      error: () => { this.diets = []; done(); }
    });
    this.nutricionService.getSupplements(this.playerId).subscribe({
      next: (rs) => { this.supplements = rs; done(); },
      error: () => { this.supplements = []; done(); }
    });
  }

  // ─── Profile ─────────────────────────────────────────────────────
  saveProfile(): void {
    if (this.readOnly) return;
    this.saving = true;
    this.profile.updatedByUserId = this.userId;
    this.profile.updatedByName = this.userName;
    this.nutricionService.upsertProfile(this.playerId, this.profile).subscribe({
      next: (p) => {
        this.profile = p;
        this.saving = false;
        this.notification.success('Perfil guardado', 'Nutrición');
        this.cdr.markForCheck();
      },
      error: () => {
        this.saving = false;
        this.notification.error('No se ha podido guardar el perfil.', 'Nutrición');
        this.cdr.markForCheck();
      }
    });
  }

  // ─── Skinfold ────────────────────────────────────────────────────
  openSkinfoldDraft(): void {
    this.skinfoldDraft = {
      skinfoldId: null,
      measurementDate: this.todayIso(),
      weightKg: this.profile.weightKg, heightCm: this.profile.heightCm,
      tricepsMm: null, subscapularMm: null, bicepsMm: null, iliacCrestMm: null,
      supraspinalMm: null, abdominalMm: null, anteriorThighMm: null, medialCalfMm: null,
      fatPercentage: null, notes: ''
    };
  }

  editSkinfold(s: SkinFold): void {
    this.skinfoldDraft = {
      skinfoldId: s.skinfoldId, measurementDate: s.measurementDate,
      weightKg: s.weightKg, heightCm: s.heightCm,
      tricepsMm: s.tricepsMm, subscapularMm: s.subscapularMm, bicepsMm: s.bicepsMm,
      iliacCrestMm: s.iliacCrestMm, supraspinalMm: s.supraspinalMm,
      abdominalMm: s.abdominalMm, anteriorThighMm: s.anteriorThighMm, medialCalfMm: s.medialCalfMm,
      fatPercentage: s.fatPercentage, notes: s.notes ?? ''
    };
  }

  saveSkinfold(): void {
    if (!this.skinfoldDraft || this.readOnly) return;
    this.saving = true;
    const d = this.skinfoldDraft;
    const body: Partial<SkinFold> = {
      measurementDate: d.measurementDate,
      weightKg: d.weightKg, heightCm: d.heightCm,
      tricepsMm: d.tricepsMm, subscapularMm: d.subscapularMm, bicepsMm: d.bicepsMm,
      iliacCrestMm: d.iliacCrestMm, supraspinalMm: d.supraspinalMm,
      abdominalMm: d.abdominalMm, anteriorThighMm: d.anteriorThighMm, medialCalfMm: d.medialCalfMm,
      fatPercentage: d.fatPercentage, notes: d.notes,
      measuredByUserId: this.userId, measuredByName: this.userName
    };
    const obs$ = d.skinfoldId
      ? this.nutricionService.updateSkinfold(d.skinfoldId, body)
      : this.nutricionService.createSkinfold(this.playerId, body);
    obs$.subscribe({
      next: () => {
        this.notification.success('Medición guardada', 'Nutrición');
        this.skinfoldDraft = null;
        this.saving = false;
        this.cdr.markForCheck();
        this.nutricionService.getSkinfolds(this.playerId).subscribe(rs => {
          this.skinfolds = rs;
          this.cdr.markForCheck();
        });
      },
      error: () => {
        this.saving = false;
        this.notification.error('No se ha podido guardar.', 'Nutrición');
        this.cdr.markForCheck();
      }
    });
  }

  deleteSkinfold(s: SkinFold): void {
    if (!confirm('¿Borrar esta medición?')) return;
    this.nutricionService.deleteSkinfold(s.skinfoldId).subscribe({
      next: () => {
        this.skinfolds = this.skinfolds.filter(x => x.skinfoldId !== s.skinfoldId);
        this.cdr.markForCheck();
      }
    });
  }

  // ─── Supplement ──────────────────────────────────────────────────
  openSuppDraft(): void {
    this.suppDraft = {
      supplementationId: null, supplementName: '', dose: '', route: '',
      frequency: '', purpose: '', startDate: this.todayIso(), endDate: '',
      active: true, notes: ''
    };
  }

  editSupp(s: Supplement): void {
    this.suppDraft = {
      supplementationId: s.supplementationId,
      supplementName: s.supplementName, dose: s.dose ?? '', route: s.route ?? '',
      frequency: s.frequency ?? '', purpose: s.purpose ?? '',
      startDate: s.startDate ?? '', endDate: s.endDate ?? '',
      active: s.active, notes: s.notes ?? ''
    };
  }

  saveSupp(): void {
    if (!this.suppDraft || this.readOnly) return;
    if (!this.suppDraft.supplementName.trim()) {
      this.notification.warning('Nombre del suplemento requerido', 'Nutrición');
      return;
    }
    this.saving = true;
    const d = this.suppDraft;
    const body: Partial<Supplement> = {
      supplementName: d.supplementName, dose: d.dose, route: d.route,
      frequency: d.frequency, purpose: d.purpose,
      startDate: d.startDate || null, endDate: d.endDate || null,
      active: d.active, notes: d.notes,
      prescribedByUserId: this.userId, prescribedByName: this.userName
    };
    const obs$ = d.supplementationId
      ? this.nutricionService.updateSupplement(d.supplementationId, body)
      : this.nutricionService.createSupplement(this.playerId, body);
    obs$.subscribe({
      next: () => {
        this.notification.success('Pauta guardada', 'Nutrición');
        this.suppDraft = null;
        this.saving = false;
        this.cdr.markForCheck();
        this.nutricionService.getSupplements(this.playerId).subscribe(rs => {
          this.supplements = rs;
          this.cdr.markForCheck();
        });
      },
      error: () => {
        this.saving = false;
        this.notification.error('No se ha podido guardar.', 'Nutrición');
        this.cdr.markForCheck();
      }
    });
  }

  deleteSupp(s: Supplement): void {
    if (!confirm('¿Borrar esta pauta?')) return;
    this.nutricionService.deleteSupplement(s.supplementationId).subscribe({
      next: () => {
        this.supplements = this.supplements.filter(x => x.supplementationId !== s.supplementationId);
        this.cdr.markForCheck();
      }
    });
  }

  // ─── Diet ────────────────────────────────────────────────────────
  openDietDraft(): void {
    this.dietDraft = {
      clubId: this.clubId, playerId: this.playerId, name: '', goal: null,
      kcalTarget: null, carbsG: null, proteinG: null, fatG: null,
      startDate: this.todayIso(), endDate: null, active: true, notes: null,
      meals: this.defaultMeals()
    };
  }

  editDiet(p: DietPlan): void {
    this.dietDraft = JSON.parse(JSON.stringify(p));
  }

  addMeal(): void {
    if (!this.dietDraft) return;
    const order = (this.dietDraft.meals?.length || 0) + 1;
    this.dietDraft.meals.push({
      mealOrder: order, mealType: 'OTHER', mealTime: null,
      title: null, description: null, kcal: null, carbsG: null, proteinG: null, fatG: null
    });
  }

  removeMeal(i: number): void {
    if (!this.dietDraft) return;
    this.dietDraft.meals.splice(i, 1);
  }

  saveDiet(): void {
    if (!this.dietDraft || this.readOnly) return;
    if (!this.dietDraft.name.trim()) {
      this.notification.warning('Nombre del plan requerido', 'Nutrición');
      return;
    }
    this.saving = true;
    const d = this.dietDraft;
    d.createdByUserId = this.userId;
    d.createdByName = this.userName;
    // re-numera meals
    d.meals.forEach((m, i) => m.mealOrder = i + 1);
    const obs$ = d.dietPlanId
      ? this.nutricionService.updateDietPlan(d.dietPlanId, d)
      : this.nutricionService.createDietPlan(this.playerId, d);
    obs$.subscribe({
      next: () => {
        this.notification.success('Plan guardado', 'Nutrición');
        this.dietDraft = null;
        this.saving = false;
        this.cdr.markForCheck();
        this.nutricionService.getDietPlans(this.playerId).subscribe(ps => {
          this.diets = ps.map(p => ({ ...p, meals: p.meals ?? [] }));
          this.cdr.markForCheck();
        });
      },
      error: () => {
        this.saving = false;
        this.notification.error('No se ha podido guardar.', 'Nutrición');
        this.cdr.markForCheck();
      }
    });
  }

  deleteDiet(p: DietPlan): void {
    if (!p.dietPlanId) return;
    if (!confirm('¿Borrar este plan?')) return;
    this.nutricionService.deleteDietPlan(p.dietPlanId).subscribe({
      next: () => {
        this.diets = this.diets.filter(x => x.dietPlanId !== p.dietPlanId);
        this.cdr.markForCheck();
      }
    });
  }

  // ─── helpers ─────────────────────────────────────────────────────
  private emptyProfile(): NutritionProfile {
    return {
      clubId: this.clubId, playerId: this.playerId,
      heightCm: null, weightKg: null, targetWeightKg: null, bloodType: null,
      allergies: null, intolerances: null, medications: null,
      dietaryPreferences: null, generalNotes: null
    };
  }

  private todayIso(): string {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }

  private defaultMeals(): DietMeal[] {
    return [
      { mealOrder: 1, mealType: 'BREAKFAST',  mealTime: '08:00', title: null, description: null, kcal: null, carbsG: null, proteinG: null, fatG: null },
      { mealOrder: 2, mealType: 'MIDMORNING', mealTime: '11:00', title: null, description: null, kcal: null, carbsG: null, proteinG: null, fatG: null },
      { mealOrder: 3, mealType: 'LUNCH',      mealTime: '14:00', title: null, description: null, kcal: null, carbsG: null, proteinG: null, fatG: null },
      { mealOrder: 4, mealType: 'SNACK',      mealTime: '17:30', title: null, description: null, kcal: null, carbsG: null, proteinG: null, fatG: null },
      { mealOrder: 5, mealType: 'DINNER',     mealTime: '21:00', title: null, description: null, kcal: null, carbsG: null, proteinG: null, fatG: null }
    ];
  }
}
