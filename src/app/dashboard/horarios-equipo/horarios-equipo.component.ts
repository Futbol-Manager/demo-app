import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  HostListener
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TrainingScheduleEditorComponent } from '../training-schedule/training-schedule-editor.component';
import { ActivityScheduleTimesComponent } from '../activity-schedule/activity-schedule-times.component';

import { LoginService } from 'src/app/core/services/login/login.service';
import { ClubService } from 'src/app/core/services/club/club.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { ClubModulesService, ClubModules } from 'src/app/core/services/club/club-modules.service';
import {
  TrainingScheduleService,
  ScheduleBundle
} from 'src/app/core/services/training-schedule/training-schedule.service';
import {
  ActivityScheduleService,
  ActivitySchedule
} from 'src/app/core/services/activity-schedule/activity-schedule.service';

/**
 * Pantalla "Horarios del equipo" (Fase 2.3 — Modo Profesional).
 *
 * Vista detallada del horario del día, con timeline editable de bloques
 * (calentamiento, fuerza, táctico, vuelta a la calma…). Reutiliza el
 * componente {@code <app-training-schedule-editor>} para la edición fila a
 * fila, igual que el modal de sesión, pero a pantalla completa para que
 * cualquier perfil del cuerpo técnico pueda planificarlo cómodamente.
 *
 * <p>Hard-gate por {@code professionalModeEnabled}: si está desactivado a
 * nivel de club, se muestra un estado vacío con CTA hacia "Permisos del
 * club" (consistente con el resto de pantallas Pro).</p>
 *
 * Rutas:
 * <ul>
 *   <li>{@code /dashboard/horarios-equipo/:teamId}</li>
 *   <li>{@code /dashboard/horarios-equipo/:teamId?date=YYYY-MM-DD}</li>
 * </ul>
 */
@Component({
  selector: 'app-horarios-equipo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="schedule-page">
      <div class="page-header">
        <div class="back-container">
          <button class="btn-back-clean" (click)="goBack()">
            <i class="bi bi-arrow-left"></i>
            <span>Volver</span>
          </button>
        </div>
        <div class="header-center">
          <h2 class="page-title">
            <i class="bi bi-clock-history me-2"></i>Horarios
            <span class="badge-pro ms-2">Pro</span>
          </h2>
          <p class="page-subtitle" *ngIf="teamName">
            {{ teamName }} · {{ formatHumanDate(selectedDate) }}
          </p>
        </div>
        <div class="page-header-spacer"></div>
      </div>

      <div class="container-fluid px-3 px-md-4">

        <!-- Master toggle OFF -->
        <div class="empty-state empty-state--master" *ngIf="disabledByMaster">
          <i class="bi bi-shield-lock"></i>
          <h3>Modo Profesional desactivado</h3>
          <p>El club tiene desactivado el Modo Profesional. Actívalo en Permisos del club para usar Horarios.</p>
          <button class="btn btn-primary" (click)="goPermisos()">Ir a Permisos</button>
        </div>

        <!-- Loading -->
        <div class="loading-state" *ngIf="loading && !disabledByMaster">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Cargando…</span>
          </div>
          <p class="text-muted mt-2">Cargando horario…</p>
        </div>

        <!-- Error -->
        <div class="alert alert-warning" *ngIf="errorMessage && !loading && !disabledByMaster">
          {{ errorMessage }}
        </div>

        <!-- Toolbar -->
        <div class="filters-bar" *ngIf="!disabledByMaster && !loading">
          <div class="filter-group">
            <label class="filter-label">Fecha</label>
            <div class="date-controls">
              <button class="date-nav" (click)="changeDate(-1)" title="Día anterior">
                <i class="bi bi-chevron-left"></i>
              </button>
              <input type="date" class="form-control form-control-sm date-input"
                     [value]="selectedDate"
                     (change)="onDateChange($event)" />
              <button class="date-nav" (click)="changeDate(1)" title="Día siguiente">
                <i class="bi bi-chevron-right"></i>
              </button>
              <button class="btn btn-sm btn-outline-primary ms-2" (click)="goToday()" title="Hoy">
                <i class="bi bi-calendar-day"></i> Hoy
              </button>
            </div>
          </div>

          <div class="kpis" *ngIf="!isFisio && bundle && bundle.sessionId">
            <div class="kpi">
              <div class="kpi-value">{{ bundle.blocks?.length || 0 }}</div>
              <div class="kpi-label">bloques</div>
            </div>
            <div class="kpi">
              <div class="kpi-value">{{ bundle.totalDurationMin || 0 }}'</div>
              <div class="kpi-label">duración total</div>
            </div>
            <div class="kpi" *ngIf="bundle.startTime">
              <div class="kpi-value">{{ formatTimeRange() }}</div>
              <div class="kpi-label">rango horario</div>
            </div>
          </div>

          <div class="kpis" *ngIf="isFisio && activities.length">
            <div class="kpi">
              <div class="kpi-value">{{ activities.length }}</div>
              <div class="kpi-label">{{ activities.length === 1 ? 'actividad' : 'actividades' }}</div>
            </div>
          </div>
        </div>

        <!-- ===== Vista FISIO: horarios fijos por actividad ===== -->
        <ng-container *ngIf="isFisio && !loading && !disabledByMaster">
          <div class="empty-state" *ngIf="activities.length === 0">
            <i class="bi bi-calendar-x"></i>
            <h3>No hay actividad programada</h3>
            <p>No hay entrenamientos ni partidos para este equipo y fecha. Puedes crearlos desde el calendario.</p>
            <button class="btn btn-primary" (click)="goCalendario()">
              <i class="bi bi-calendar-plus me-1"></i> Ir al calendario
            </button>
          </div>

          <div class="activities-wrapper" *ngIf="activities.length > 0">
            <app-activity-schedule-times
              *ngFor="let act of activities; trackBy: trackByActivity"
              [activity]="act">
            </app-activity-schedule-times>
          </div>
        </ng-container>

        <!-- ===== Vista cuerpo técnico (coach/club): editor de bloques ===== -->
        <ng-container *ngIf="!isFisio">
          <!-- Sin sesión programada -->
          <div class="empty-state" *ngIf="!loading && !disabledByMaster && bundle && !bundle.sessionId">
            <i class="bi bi-calendar-x"></i>
            <h3>No hay sesión programada</h3>
            <p>Crea una sesión de entrenamiento para este equipo y fecha desde el menú del entrenador para poder añadir bloques.</p>
          </div>

          <!-- Editor (timeline) -->
          <div class="editor-wrapper" *ngIf="!loading && !disabledByMaster && bundle && bundle.sessionId">
            <app-training-schedule-editor
              [sessionId]="bundle.sessionId"
              [sessionStartTime]="bundle.startTime || null"
              [userId]="userId"
              [userName]="userName">
            </app-training-schedule-editor>
          </div>
        </ng-container>

      </div>
    </div>
  `,
  styles: [`
    .schedule-page { font-family: 'Archivo', sans-serif; }
    .page-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 24px; gap: 12px; border-bottom: 1px solid #e9ecef; background: #fff;
    }
    .header-center { text-align: center; flex: 1; }
    .page-title { margin: 0; font-weight: 700; color: #1a1a1a; display: inline-flex; align-items: center; }
    .page-subtitle { margin: 4px 0 0; color: #6c757d; font-size: 0.92rem; }
    .btn-back-clean {
      display: inline-flex; align-items: center; gap: 8px;
      background: rgba(49, 178, 112, 0.08); border: 0; color: #002c40;
      padding: 0.4rem 0.75rem; border-radius: 8px;
      cursor: pointer; transition: background .2s, transform .15s; font-weight: 600;
    }
    .btn-back-clean:hover { background: rgba(49, 178, 112, 0.18); color: #002c40; transform: translateX(-2px); }
    .page-header-spacer { width: 110px; }
    .badge-pro {
      display: inline-flex; align-items: center; padding: 2px 8px;
      background: linear-gradient(135deg, #1a73e8 0%, #6f42c1 100%);
      color: #fff; border-radius: 999px; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.5px;
    }
    .filters-bar {
      display: flex; gap: 16px; flex-wrap: wrap; padding: 16px 0;
      border-bottom: 1px solid #f0f0f0; margin-bottom: 16px; align-items: end;
    }
    .filter-group { display: flex; flex-direction: column; gap: 4px; min-width: 160px; }
    .filter-label { font-size: 0.78rem; color: #6c757d; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; }
    .date-controls { display: flex; gap: 6px; align-items: center; }
    .date-nav { background: #f5f6f8; border: 1px solid #e0e3e8; border-radius: 6px; width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; color: #002c40; transition: all .15s ease; }
    .date-nav:hover { background: #c4e8d6; border-color: #31b270; color: #002c40; }
    /* Botón "Hoy" con estilo de marca Sphaira (verde). */
    .filters-bar .btn-outline-primary {
      border-color: #31b270; color: #31b270; font-weight: 600;
    }
    .filters-bar .btn-outline-primary:hover { background: #31b270; border-color: #31b270; color: #fff; }
    .date-input { width: 160px; }
    .kpis { display: flex; gap: 24px; margin-left: auto; }
    .kpi { text-align: center; }
    .kpi-value { font-size: 1.4rem; font-weight: 800; color: #1a1a1a; line-height: 1; }
    .kpi-label { font-size: 0.78rem; color: #6c757d; text-transform: uppercase; letter-spacing: 0.4px; margin-top: 2px; }
    .loading-state { text-align: center; padding: 48px 16px; }
    .empty-state { text-align: center; padding: 48px 16px; color: #6c757d; }
    .empty-state i { font-size: 2.5rem; color: #adb5bd; }
    .empty-state h3 { margin: 12px 0 4px; font-size: 1.15rem; color: #1a1a1a; font-weight: 700; }
    .empty-state p { margin: 0 auto 16px; max-width: 460px; }
    .editor-wrapper { background: #fff; border: 1px solid #e9ecef; border-radius: 12px; padding: 16px; margin-top: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
    .activities-wrapper { margin-top: 16px; max-width: 720px; }
    @media (max-width: 640px) {
      .page-header-spacer { display: none; }
      .filters-bar { flex-direction: column; align-items: stretch; }
      .kpis { margin-left: 0; }
    }
  `]
})
export class HorariosEquipoComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  clubId = 0;
  userId = 0;
  userName: string | null = null;
  profileId = 0;
  modules: ClubModules = { clubId: 0, wellnessEnabled: false, rpeEnabled: false, professionalModeEnabled: false, accessControlEnabled: false, menuSport: 'futbol' };

  teamId: number = 0;
  teamName: string = '';
  selectedDate: string = this.todayIsoYmd();

  bundle: ScheduleBundle | null = null;
  /** Actividades del día (entrenamientos + partidos) para la vista del fisio. */
  activities: ActivitySchedule[] = [];

  loading = false;
  errorMessage: string | null = null;
  disabledByMaster = false;

  /** El fisioterapeuta (profileId 6) ve los 6 horarios fijos por actividad. */
  get isFisio(): boolean { return this.profileId === 6; }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private loginService: LoginService,
    private clubService: ClubService,
    private teamService: TeamService,
    private clubModulesService: ClubModulesService,
    private scheduleService: TrainingScheduleService,
    private activityScheduleService: ActivityScheduleService,
    private cdr: ChangeDetectorRef,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const tid = Number(params.get('teamId') ?? '0');
      this.teamId = tid > 0 ? tid : 0;
      const qpDate = this.route.snapshot.queryParamMap.get('date');
      if (qpDate && /^\d{4}-\d{2}-\d{2}$/.test(qpDate)) {
        this.selectedDate = qpDate;
      }
      this.bootstrap();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ------------------------------------------------------------------
  // Carga inicial
  // ------------------------------------------------------------------

  private bootstrap(): void {
    if (!this.teamId) {
      this.errorMessage = 'No se ha indicado el equipo.';
      return;
    }
    this.loading = true;
    this.cdr.markForCheck();

    this.loginService.usuarioActual.pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.userId = user?.userId ?? 0;
      this.profileId = user?.profileType?.profileId ?? 0;
      this.userName = user?.firstName
        ? `${user.firstName} ${user.secondName || ''}`.trim()
        : null;
      this.resolveClubId(user).then(clubId => {
        this.clubId = clubId;
        if (!clubId) {
          this.errorMessage = 'No se ha podido identificar el club.';
          this.loading = false;
          this.cdr.markForCheck();
          return;
        }
        this.clubModulesService.getModules(clubId).subscribe({
          next: (m) => {
            this.modules = m;
            if (!m.professionalModeEnabled) {
              this.disabledByMaster = true;
              this.loading = false;
              this.cdr.markForCheck();
              return;
            }
            this.loadTeamThenSchedule();
          },
          error: () => {
            this.errorMessage = 'No se han podido cargar los permisos del club.';
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
    if (!user?.userId) return 0;
    return new Promise<number>((resolve) => {
      this.clubService.getClubForEntrenador(user.userId).subscribe({
        next: (resp: any) => {
          const cid = Number(resp?.data ?? 0);
          if (cid > 0) sessionStorage.setItem('clubId', String(cid));
          resolve(cid);
        },
        error: () => resolve(0)
      });
    });
  }

  private loadTeamThenSchedule(): void {
    this.teamService.getTeamById(String(this.teamId)).subscribe({
      next: (resp: any) => {
        this.teamName = resp?.data?.name || resp?.data?.teamName || `Equipo ${this.teamId}`;
        this.loadSchedule();
      },
      error: () => {
        this.teamName = `Equipo ${this.teamId}`;
        this.loadSchedule();
      }
    });
  }

  private loadSchedule(): void {
    this.loading = true;
    this.errorMessage = null;
    this.bundle = null;
    this.activities = [];
    this.cdr.markForCheck();

    if (this.isFisio) {
      this.loadFisioActivities();
      return;
    }

    this.scheduleService.getByTeamAndDate(this.teamId, this.selectedDate).subscribe({
      next: (b) => {
        this.bundle = b;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        const msg = err?.error?.error?.msg;
        if (msg === 'PROFESSIONAL_MODE_DISABLED') {
          this.disabledByMaster = true;
        } else {
          this.errorMessage = 'No se ha podido cargar el horario. Vuelve a intentarlo.';
        }
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private loadFisioActivities(): void {
    this.activityScheduleService.getByTeamAndDate(this.teamId, this.selectedDate).subscribe({
      next: (b) => {
        this.activities = b.activities || [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        const msg = err?.error?.error?.msg;
        if (msg === 'PROFESSIONAL_MODE_DISABLED') {
          this.disabledByMaster = true;
        } else {
          this.errorMessage = 'No se han podido cargar los horarios. Vuelve a intentarlo.';
        }
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  trackByActivity(_i: number, act: ActivitySchedule): string {
    return `${act.activityType}-${act.activityId}`;
  }

  // ------------------------------------------------------------------
  // UI handlers
  // ------------------------------------------------------------------

  onDateChange(ev: Event): void {
    const value = (ev.target as HTMLInputElement).value;
    if (value) {
      this.selectedDate = value;
      this.syncQueryParam();
      this.loadSchedule();
    }
  }

  changeDate(deltaDays: number): void {
    const d = new Date(this.selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + deltaDays);
    this.selectedDate = this.toIsoYmd(d);
    this.syncQueryParam();
    this.loadSchedule();
  }

  goToday(): void {
    this.selectedDate = this.todayIsoYmd();
    this.syncQueryParam();
    this.loadSchedule();
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(ev: KeyboardEvent): void {
    if (this.loading || this.disabledByMaster) return;
    if (ev.key === 'ArrowLeft' && (ev.ctrlKey || ev.metaKey)) { this.changeDate(-1); ev.preventDefault(); }
    if (ev.key === 'ArrowRight' && (ev.ctrlKey || ev.metaKey)) { this.changeDate(1); ev.preventDefault(); }
  }

  goBack(): void {
    this.location.back();
  }
  goPermisos(): void {
    this.router.navigate(['/dashboard/permisos-club']);
  }
  goCalendario(): void {
    this.router.navigate(['/dashboard/calendario', this.teamId, 0]);
  }

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  formatHumanDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  formatTimeRange(): string {
    if (!this.bundle?.startTime) return '';
    const start = this.bundle.startTime.slice(0, 5);
    const total = this.bundle.totalDurationMin || 0;
    const end = this.addMinutes(start, total);
    return `${start} – ${end}`;
  }

  private addMinutes(hhmm: string, mins: number): string {
    const m = /^(\d{2}):(\d{2})/.exec(hhmm);
    if (!m) return hhmm;
    let total = (parseInt(m[1], 10) * 60 + parseInt(m[2], 10)) + Math.max(0, mins);
    total = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
    const h = Math.floor(total / 60); const mm = total % 60;
    return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  private syncQueryParam(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { date: this.selectedDate },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  private todayIsoYmd(): string {
    return this.toIsoYmd(new Date());
  }

  private toIsoYmd(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}
