import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

import { LoginService } from 'src/app/core/services/login/login.service';
import { ClubService } from 'src/app/core/services/club/club.service';
import { ClubModulesService, ClubModules } from 'src/app/core/services/club/club-modules.service';
import {
  PhysicalAssessmentService,
  PhysicalTest,
  PhysicalTestType,
  BodyComposition,
  BodyCompositionMethod
} from 'src/app/core/services/physical-assessment/physical-assessment.service';

type Tab = 'tests' | 'body';

interface DraftTest {
  testId: number | null;
  measurementDate: string;
  testType: PhysicalTestType | string;
  value: number | null;
  unit: string;
  value2: number | null;
  value2Unit: string;
  notes: string;
}

interface DraftBody {
  compId: number | null;
  measurementDate: string;
  method: BodyCompositionMethod | string;
  weightKg: number | null;
  heightCm: number | null;
  bodyFatPct: number | null;
  muscleMassKg: number | null;
  leanMassKg: number | null;
  waterPct: number | null;
  visceralFat: number | null;
  basalMetabolismKcal: number | null;
  boneDensity: number | null;
  notes: string;
}

const TEST_TYPES: { code: PhysicalTestType; label: string; defaultUnit: string }[] = [
  { code: 'CMJ',             label: 'CMJ (salto contramovimiento)',    defaultUnit: 'cm'      },
  { code: 'SQUAT_JUMP',      label: 'Squat Jump',                       defaultUnit: 'cm'      },
  { code: 'DROP_JUMP',       label: 'Drop Jump',                        defaultUnit: 'cm'      },
  { code: 'SPRINT_10M',      label: 'Sprint 10 m',                      defaultUnit: 's'       },
  { code: 'SPRINT_20M',      label: 'Sprint 20 m',                      defaultUnit: 's'       },
  { code: 'SPRINT_30M',      label: 'Sprint 30 m',                      defaultUnit: 's'       },
  { code: 'AGILITY_T',       label: 'Test Agility-T',                   defaultUnit: 's'       },
  { code: 'AGILITY_505',     label: 'Test 5-0-5',                       defaultUnit: 's'       },
  { code: 'AGILITY_ILLINOIS',label: 'Test Illinois',                    defaultUnit: 's'       },
  { code: 'SIT_AND_REACH',   label: 'Sit & Reach',                      defaultUnit: 'cm'      },
  { code: 'PLANK_ISOMETRIC', label: 'Plancha isométrica',               defaultUnit: 's'       },
  { code: 'YOYO_IR1',        label: 'Yo-Yo IR1',                        defaultUnit: 'm'       },
  { code: 'MAS',             label: 'MAS (velocidad aeróbica máxima)',  defaultUnit: 'km/h'    },
  { code: 'COOPER',          label: 'Test de Cooper',                   defaultUnit: 'm'       },
  { code: 'VO2MAX',          label: 'VO₂ máx',                          defaultUnit: 'ml/kg/min' },
  { code: 'BENCH_PRESS_1RM', label: 'Press banca 1RM',                  defaultUnit: 'kg'      },
  { code: 'BACK_SQUAT_1RM',  label: 'Back Squat 1RM',                   defaultUnit: 'kg'      },
  { code: 'PULL_UPS_MAX',    label: 'Dominadas máx.',                   defaultUnit: 'reps'    },
  { code: 'OTHER',           label: 'Otro',                             defaultUnit: ''        }
];

const METHODS: BodyCompositionMethod[] = ['BIA', 'DEXA', 'HYDRO', 'OTHER'];
const METHOD_LABELS: { [k: string]: string } = {
  BIA: 'BIA (bioimpedancia)',
  DEXA: 'DEXA',
  HYDRO: 'Hidrodensitometría',
  OTHER: 'Otro'
};

/**
 * Pantalla de Tests físicos + Composición corporal por jugador
 * (Fase 3.2, Modo Profesional).
 *
 * <p>Dos tabs:</p>
 * <ul>
 *   <li><b>Tests</b> — histórico cronológico de tests (CMJ, sprints, agility,
 *       sit & reach, plancha, Yo-Yo, MAS, 1RM…).</li>
 *   <li><b>Composición</b> — histórico de mediciones (BIA, DEXA, hidro)
 *       con peso, %grasa, masa muscular, agua, BMR, etc.</li>
 * </ul>
 *
 * <p>Hard-gate por {@code professionalModeEnabled}. Acceso en lectura para el
 * jugador (perfil 3); CRUD para Club Admin (1), Staff con permisos (9), Fisio
 * (6), Nutricionista (7) y Médico (8).</p>
 *
 * Ruta: {@code /dashboard/tests-fisicos/:playerId}
 */
@Component({
  selector: 'app-physical-assessment',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="phys-page">
      <div class="page-header">
        <button class="btn-back" (click)="goBack()"><i class="bi bi-arrow-left"></i> Volver</button>
        <div class="header-center">
          <h2><i class="bi bi-clipboard2-pulse me-2"></i>Tests físicos <span class="badge-pro">Pro</span></h2>
        </div>
        <div class="spacer"></div>
      </div>

      <div *ngIf="loading" class="loading-state">
        <div class="spinner-border text-primary"></div><p>Cargando…</p>
      </div>

      <div *ngIf="!loading && disabledByMaster" class="disabled-state">
        <i class="bi bi-shield-lock"></i>
        <h3>Modo Profesional desactivado</h3>
        <p>El club no tiene activo el Modo Profesional. Pide al administrador que lo active en Ajustes para usar este módulo.</p>
      </div>

      <div *ngIf="!loading && errorMessage" class="error-state">
        <i class="bi bi-exclamation-triangle"></i><p>{{ errorMessage }}</p>
      </div>

      <div *ngIf="!loading && !disabledByMaster && !errorMessage" class="content">
        <ul class="tabs">
          <li [class.active]="tab === 'tests'" (click)="setTab('tests')"><i class="bi bi-speedometer2"></i> Tests</li>
          <li [class.active]="tab === 'body'" (click)="setTab('body')"><i class="bi bi-bar-chart-line"></i> Composición</li>
        </ul>

        <!-- TESTS TAB -->
        <section *ngIf="tab === 'tests'">
          <div class="section-header">
            <h3>Histórico de tests</h3>
            <button *ngIf="canEdit" class="btn btn-primary" (click)="openTestEditor(null)">
              <i class="bi bi-plus-lg"></i> Nuevo test
            </button>
          </div>
          <p class="muted" *ngIf="!tests.length">Sin tests registrados.</p>
          <div *ngIf="tests.length" class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Fecha</th><th>Test</th><th class="text-end">Valor</th>
                  <th class="text-end">Valor 2</th><th>Notas</th><th></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let t of tests">
                  <td>{{ t.measurementDate }}</td>
                  <td>{{ getTestLabel(t.testType) }}</td>
                  <td class="text-end">
                    <ng-container *ngIf="t.value != null">{{ t.value }} {{ t.unit }}</ng-container>
                  </td>
                  <td class="text-end">
                    <ng-container *ngIf="t.value2 != null">{{ t.value2 }} {{ t.value2Unit }}</ng-container>
                  </td>
                  <td class="notes">{{ t.notes }}</td>
                  <td class="actions" *ngIf="canEdit">
                    <button class="btn-icon" (click)="openTestEditor(t)" title="Editar"><i class="bi bi-pencil"></i></button>
                    <button class="btn-icon danger" (click)="deleteTest(t)" title="Borrar"><i class="bi bi-trash"></i></button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- BODY COMPOSITION TAB -->
        <section *ngIf="tab === 'body'">
          <div class="section-header">
            <h3>Histórico de composición corporal</h3>
            <button *ngIf="canEdit" class="btn btn-primary" (click)="openBodyEditor(null)">
              <i class="bi bi-plus-lg"></i> Nueva medición
            </button>
          </div>
          <p class="muted" *ngIf="!compositions.length">Sin mediciones registradas.</p>
          <div *ngIf="compositions.length" class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Fecha</th><th>Método</th>
                  <th class="text-end">Peso (kg)</th>
                  <th class="text-end">Grasa (%)</th>
                  <th class="text-end">Músculo (kg)</th>
                  <th class="text-end">Agua (%)</th>
                  <th class="text-end">Visceral</th>
                  <th class="text-end">BMR (kcal)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let c of compositions">
                  <td>{{ c.measurementDate }}</td>
                  <td>{{ getMethodLabel(c.method) }}</td>
                  <td class="text-end">{{ c.weightKg }}</td>
                  <td class="text-end">{{ c.bodyFatPct }}</td>
                  <td class="text-end">{{ c.muscleMassKg }}</td>
                  <td class="text-end">{{ c.waterPct }}</td>
                  <td class="text-end">{{ c.visceralFat }}</td>
                  <td class="text-end">{{ c.basalMetabolismKcal }}</td>
                  <td class="actions" *ngIf="canEdit">
                    <button class="btn-icon" (click)="openBodyEditor(c)" title="Editar"><i class="bi bi-pencil"></i></button>
                    <button class="btn-icon danger" (click)="deleteComposition(c)" title="Borrar"><i class="bi bi-trash"></i></button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <!-- TEST EDITOR -->
      <div *ngIf="testDraft" class="modal-overlay" (click)="closeTestEditor($event)">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <h3>{{ testDraft.testId ? 'Editar test' : 'Nuevo test' }}</h3>
          <div class="grid-2">
            <label>Fecha
              <input type="date" [(ngModel)]="testDraft.measurementDate">
            </label>
            <label>Tipo
              <select [(ngModel)]="testDraft.testType" (change)="onTestTypeChange()">
                <option *ngFor="let t of testTypes" [value]="t.code">{{ t.label }}</option>
              </select>
            </label>
            <label>Valor
              <input type="number" step="0.01" [(ngModel)]="testDraft.value" placeholder="—">
            </label>
            <label>Unidad
              <input type="text" [(ngModel)]="testDraft.unit" placeholder="cm, s, kg…">
            </label>
            <label>Valor 2 <small class="muted">(opcional)</small>
              <input type="number" step="0.01" [(ngModel)]="testDraft.value2">
            </label>
            <label>Unidad 2
              <input type="text" [(ngModel)]="testDraft.value2Unit">
            </label>
          </div>
          <label class="full">Notas
            <textarea rows="3" [(ngModel)]="testDraft.notes"></textarea>
          </label>
          <div class="modal-actions">
            <button class="btn btn-light" (click)="closeTestEditor()">Cancelar</button>
            <button class="btn btn-primary" (click)="saveTest()" [disabled]="saving">
              <span *ngIf="saving" class="spinner-border spinner-border-sm me-1"></span>Guardar
            </button>
          </div>
        </div>
      </div>

      <!-- BODY EDITOR -->
      <div *ngIf="bodyDraft" class="modal-overlay" (click)="closeBodyEditor($event)">
        <div class="modal-card wide" (click)="$event.stopPropagation()">
          <h3>{{ bodyDraft.compId ? 'Editar medición' : 'Nueva medición' }}</h3>
          <div class="grid-2">
            <label>Fecha
              <input type="date" [(ngModel)]="bodyDraft.measurementDate">
            </label>
            <label>Método
              <select [(ngModel)]="bodyDraft.method">
                <option *ngFor="let m of methods" [value]="m">{{ getMethodLabel(m) }}</option>
              </select>
            </label>
            <label>Peso (kg)
              <input type="number" step="0.1" [(ngModel)]="bodyDraft.weightKg">
            </label>
            <label>Altura (cm)
              <input type="number" step="0.1" [(ngModel)]="bodyDraft.heightCm">
            </label>
            <label>% Grasa
              <input type="number" step="0.01" [(ngModel)]="bodyDraft.bodyFatPct">
            </label>
            <label>Masa muscular (kg)
              <input type="number" step="0.1" [(ngModel)]="bodyDraft.muscleMassKg">
            </label>
            <label>Masa magra (kg)
              <input type="number" step="0.1" [(ngModel)]="bodyDraft.leanMassKg">
            </label>
            <label>% Agua
              <input type="number" step="0.01" [(ngModel)]="bodyDraft.waterPct">
            </label>
            <label>Grasa visceral
              <input type="number" step="0.1" [(ngModel)]="bodyDraft.visceralFat">
            </label>
            <label>BMR (kcal)
              <input type="number" step="1" [(ngModel)]="bodyDraft.basalMetabolismKcal">
            </label>
            <label>Densidad ósea
              <input type="number" step="0.01" [(ngModel)]="bodyDraft.boneDensity">
            </label>
          </div>
          <label class="full">Notas
            <textarea rows="3" [(ngModel)]="bodyDraft.notes"></textarea>
          </label>
          <div class="modal-actions">
            <button class="btn btn-light" (click)="closeBodyEditor()">Cancelar</button>
            <button class="btn btn-primary" (click)="saveComposition()" [disabled]="saving">
              <span *ngIf="saving" class="spinner-border spinner-border-sm me-1"></span>Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .phys-page { padding:24px; max-width:1280px; margin:0 auto; }
    .page-header { display:flex; align-items:center; gap:16px; margin-bottom:24px; }
    .header-center { flex:1; text-align:center; }
    .header-center h2 { margin:0; }
    .spacer { width:80px; }
    .btn-back {
      border:1px solid #d1d5db; background:#fff; padding:6px 14px; border-radius:8px; cursor:pointer;
    }
    .btn-back:hover { background:#f3f4f6; }
    .badge-pro {
      background:linear-gradient(135deg,#10b981,#059669); color:#fff; font-size:.65rem;
      padding:3px 8px; border-radius:6px; vertical-align:middle; margin-left:6px;
      letter-spacing:.5px; font-weight:600;
    }
    .loading-state, .disabled-state, .error-state {
      text-align:center; padding:64px 16px; color:#6b7280;
    }
    .disabled-state i { font-size:48px; color:#f59e0b; }
    .error-state i { font-size:36px; color:#ef4444; }
    .tabs {
      display:flex; gap:4px; padding:0; margin:0 0 24px; list-style:none; border-bottom:2px solid #e5e7eb;
    }
    .tabs li {
      cursor:pointer; padding:10px 18px; border-radius:8px 8px 0 0; color:#6b7280; font-weight:500;
    }
    .tabs li.active { background:#fff; color:#0f172a; border-bottom:2px solid #2563eb; margin-bottom:-2px; }
    .section-header {
      display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;
    }
    .section-header h3 { margin:0; }
    .muted { color:#6b7280; }
    .table-wrapper { overflow:auto; border:1px solid #e9eef1; border-radius:16px; box-shadow: 0 8px 24px rgba(0,44,64,0.06); }
    .data-table { width:100%; border-collapse:separate; border-spacing:0; background:#fff; }
    .data-table th, .data-table td {
      padding:12px 14px; border-bottom:1px solid #eef2f4; text-align:left; font-size:.9rem;
    }
    .data-table th {
      background:#f1f5f7; font-weight:800; color:#002c40;
      text-transform:uppercase; font-size:11px; letter-spacing:.05em;
      border-bottom:2px solid #dde6ea;
    }
    .data-table tbody tr { transition: background .12s ease; }
    .data-table tbody tr:nth-child(even) { background:#fafcfd; }
    .data-table tbody tr:hover { background:#eafaf1; }
    .data-table td.text-end, .data-table th.text-end { text-align:right; }
    .data-table td.notes { color:#6b7280; max-width:240px; }
    .data-table td.actions { text-align:right; white-space:nowrap; }
    .btn-icon {
      background:transparent; border:1px solid #e5e7eb; padding:4px 8px; border-radius:6px;
      cursor:pointer; margin-left:4px;
    }
    .btn-icon:hover { background:#f3f4f6; }
    .btn-icon.danger:hover { background:#fee2e2; color:#b91c1c; border-color:#fca5a5; }
    .modal-overlay {
      position:fixed; inset:0; background:rgba(15,23,42,.55);
      display:flex; align-items:center; justify-content:center; z-index:1080; padding:16px;
    }
    .modal-card {
      background:#fff; border-radius:12px; width:100%; max-width:560px; padding:24px;
      box-shadow:0 20px 50px rgba(0,0,0,.2); max-height:90vh; overflow:auto;
    }
    .modal-card.wide { max-width:760px; }
    .modal-card h3 { margin-top:0; }
    .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px 16px; }
    .grid-2 label, label.full { display:flex; flex-direction:column; font-size:.85rem; color:#374151; margin-top:8px; }
    label.full { margin-top:8px; }
    .grid-2 label input, .grid-2 label select, label.full input, label.full select, label.full textarea {
      margin-top:4px; padding:8px 10px; border:1px solid #d1d5db; border-radius:6px; font-size:.95rem;
    }
    .modal-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:20px; }
  `]
})
export class PhysicalAssessmentComponent implements OnInit, OnDestroy {

  playerId = 0;
  clubId = 0;
  profileId = 0;
  loading = true;
  saving = false;
  disabledByMaster = false;
  errorMessage = '';
  canEdit = false;

  tab: Tab = 'tests';

  tests: PhysicalTest[] = [];
  compositions: BodyComposition[] = [];

  testTypes = TEST_TYPES;
  methods = METHODS;

  testDraft: DraftTest | null = null;
  bodyDraft: DraftBody | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService,
    private loginService: LoginService,
    private clubService: ClubService,
    private modulesService: ClubModulesService,
    private service: PhysicalAssessmentService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.playerId = parseInt(params.get('playerId') || '0', 10);
      if (this.playerId > 0) this.bootstrap();
    });
  }

  private bootstrap(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.loginService.usuarioActual.pipe(takeUntil(this.destroy$)).subscribe((user: any) => {
      this.profileId = user?.profileType?.profileId ?? 0;
      this.canEdit = this.profileId !== 3;

      this.resolveClubId(user).then(cid => {
        this.clubId = cid;
        if (!cid) {
          this.errorMessage = 'No se ha podido resolver el club.';
          this.loading = false;
          this.cdr.markForCheck();
          return;
        }
        this.modulesService.getModules(cid).pipe(takeUntil(this.destroy$)).subscribe({
          next: (m: ClubModules) => {
            if (!m?.professionalModeEnabled) {
              this.disabledByMaster = true;
              this.loading = false;
              this.cdr.markForCheck();
              return;
            }
            this.loadAll();
          },
          error: () => this.handleLoadError()
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goBack(): void { history.length > 1 ? history.back() : this.router.navigate(['/dashboard']); }

  setTab(t: Tab): void { this.tab = t; }

  getTestLabel(code: string): string {
    return TEST_TYPES.find(t => t.code === code)?.label ?? code;
  }
  getMethodLabel(m: string | null | undefined): string {
    if (!m) return '—';
    return METHOD_LABELS[m] ?? m;
  }

  private loadAll(): void {
    forkJoin({
      tests: this.service.getTests(this.playerId).pipe(catchError(() => of([] as PhysicalTest[]))),
      body:  this.service.getCompositions(this.playerId).pipe(catchError(() => of([] as BodyComposition[])))
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ tests, body }) => {
        this.tests = tests || [];
        this.compositions = body || [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => this.handleLoadError()
    });
  }

  private handleLoadError(): void {
    this.loading = false;
    this.errorMessage = 'No se pudo cargar la información de tests físicos.';
    this.cdr.markForCheck();
  }

  // ---------- TEST EDITOR ----------
  openTestEditor(t: PhysicalTest | null): void {
    this.testDraft = t ? {
      testId: t.testId ?? null,
      measurementDate: t.measurementDate,
      testType: t.testType,
      value: t.value,
      unit: t.unit ?? '',
      value2: t.value2,
      value2Unit: t.value2Unit ?? '',
      notes: t.notes ?? ''
    } : {
      testId: null,
      measurementDate: this.today(),
      testType: 'CMJ',
      value: null,
      unit: 'cm',
      value2: null,
      value2Unit: '',
      notes: ''
    };
  }

  closeTestEditor(ev?: Event): void {
    if (ev && ev.target !== ev.currentTarget) return;
    this.testDraft = null;
  }

  onTestTypeChange(): void {
    if (!this.testDraft) return;
    const def = TEST_TYPES.find(t => t.code === this.testDraft!.testType);
    if (def && !this.testDraft.unit) this.testDraft.unit = def.defaultUnit;
    if (def && def.defaultUnit) this.testDraft.unit = def.defaultUnit;
  }

  saveTest(): void {
    if (!this.testDraft) return;
    const body: Partial<PhysicalTest> = {
      measurementDate: this.testDraft.measurementDate,
      testType: this.testDraft.testType,
      value: this.testDraft.value,
      unit: this.testDraft.unit || null,
      value2: this.testDraft.value2,
      value2Unit: this.testDraft.value2Unit || null,
      notes: this.testDraft.notes || null
    };
    this.saving = true;
    const obs = this.testDraft.testId
      ? this.service.updateTest(this.testDraft.testId, body)
      : this.service.createTest(this.playerId, body);
    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toastr.success('Test guardado');
        this.testDraft = null;
        this.saving = false;
        this.refreshTests();
        this.cdr.markForCheck();
      },
      error: () => {
        this.toastr.error('No se pudo guardar el test');
        this.saving = false;
        this.cdr.markForCheck();
      }
    });
  }

  deleteTest(t: PhysicalTest): void {
    if (!t.testId) return;
    if (!confirm(`¿Borrar el test del ${t.measurementDate}?`)) return;
    this.service.deleteTest(t.testId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.toastr.success('Test borrado'); this.refreshTests(); },
      error: () => this.toastr.error('No se pudo borrar')
    });
  }

  private refreshTests(): void {
    this.service.getTests(this.playerId).pipe(takeUntil(this.destroy$)).subscribe({
      next: rows => { this.tests = rows; this.cdr.markForCheck(); }
    });
  }

  // ---------- BODY EDITOR ----------
  openBodyEditor(c: BodyComposition | null): void {
    this.bodyDraft = c ? {
      compId: c.compId ?? null,
      measurementDate: c.measurementDate,
      method: (c.method as string) ?? 'BIA',
      weightKg: c.weightKg,
      heightCm: c.heightCm,
      bodyFatPct: c.bodyFatPct,
      muscleMassKg: c.muscleMassKg,
      leanMassKg: c.leanMassKg,
      waterPct: c.waterPct,
      visceralFat: c.visceralFat,
      basalMetabolismKcal: c.basalMetabolismKcal,
      boneDensity: c.boneDensity,
      notes: c.notes ?? ''
    } : {
      compId: null,
      measurementDate: this.today(),
      method: 'BIA',
      weightKg: null, heightCm: null, bodyFatPct: null,
      muscleMassKg: null, leanMassKg: null, waterPct: null,
      visceralFat: null, basalMetabolismKcal: null, boneDensity: null,
      notes: ''
    };
  }

  closeBodyEditor(ev?: Event): void {
    if (ev && ev.target !== ev.currentTarget) return;
    this.bodyDraft = null;
  }

  saveComposition(): void {
    if (!this.bodyDraft) return;
    const d = this.bodyDraft;
    const body: Partial<BodyComposition> = {
      measurementDate: d.measurementDate,
      method: d.method || null,
      weightKg: d.weightKg, heightCm: d.heightCm, bodyFatPct: d.bodyFatPct,
      muscleMassKg: d.muscleMassKg, leanMassKg: d.leanMassKg,
      waterPct: d.waterPct, visceralFat: d.visceralFat,
      basalMetabolismKcal: d.basalMetabolismKcal, boneDensity: d.boneDensity,
      notes: d.notes || null
    };
    this.saving = true;
    const obs = d.compId
      ? this.service.updateComposition(d.compId, body)
      : this.service.createComposition(this.playerId, body);
    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toastr.success('Medición guardada');
        this.bodyDraft = null;
        this.saving = false;
        this.refreshCompositions();
        this.cdr.markForCheck();
      },
      error: () => {
        this.toastr.error('No se pudo guardar la medición');
        this.saving = false;
        this.cdr.markForCheck();
      }
    });
  }

  deleteComposition(c: BodyComposition): void {
    if (!c.compId) return;
    if (!confirm(`¿Borrar la medición del ${c.measurementDate}?`)) return;
    this.service.deleteComposition(c.compId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.toastr.success('Medición borrada'); this.refreshCompositions(); },
      error: () => this.toastr.error('No se pudo borrar')
    });
  }

  private refreshCompositions(): void {
    this.service.getCompositions(this.playerId).pipe(takeUntil(this.destroy$)).subscribe({
      next: rows => { this.compositions = rows; this.cdr.markForCheck(); }
    });
  }

  private today(): string {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }
}
