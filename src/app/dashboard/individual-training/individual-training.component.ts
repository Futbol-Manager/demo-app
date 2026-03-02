import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, forkJoin } from 'rxjs';
import { IndividualTrainingService } from 'src/app/core/services/individual-training/individual-training.service';
import {
  IndividualPlan,
  IndividualPlanDay,
  TrainingLog,
  PlayerComplianceSummary,
  IndividualPlanGeneratorInput,
  ACTIVITY_LABELS,
  ACTIVITY_COLORS,
  durationFormatted,
  paceFormatted,
  statusLabel,
  statusBadgeClass,
  ActivityType,
  SeasonMoment,
  PlanStatus,
} from 'src/app/core/services/individual-training/individual-training.model';
import { PlayerService } from 'src/app/core/services/player/player.service';
import { Player } from 'src/app/core/services/player/player.model';
import { TeamService } from 'src/app/core/services/team/team.service';
import { LoginService } from 'src/app/core/services/login/login.service';

export interface DayConfig {
  enabled: boolean;
  activityType: ActivityType;
  durationMinutes: number;
  distanceKm: number;
  sets: number;
  reps: number;
  description: string;
}

@Component({
  selector: 'app-individual-training',
  templateUrl: './individual-training.component.html',
  styleUrls: ['./individual-training.component.scss']
})
export class IndividualTrainingComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  // ─── Data ─────────────────────────────────────────────────────────────────
  plans: IndividualPlan[] = [];
  selectedPlan: IndividualPlan | null = null;
  planDays: IndividualPlanDay[] = [];
  compliance: PlayerComplianceSummary[] = [];
  logs: TrainingLog[] = [];

  teamPlayers: Player[] = [];
  availableTeams: any[] = [];
  assignedPlayerIds = new Set<number>();
  loadingPlayers = false;
  togglingPlayerId: number | null = null;
  bulkLoading = false;

  // ─── AI Generator ─────────────────────────────────────────────────────────
  showAiForm = false;
  aiGenerating = false;
  aiGeneratedPlan: any = null;
  aiError: string | null = null;
  aiInput: Partial<IndividualPlanGeneratorInput> = {
    seasonMoment:           'PRETEMPORADA',
    durationWeeks:          4,
    sessionDurationMinutes: 60,
    fitnessLevel:           'MEDIO',
    trainingDays:           ['LUNES', 'MARTES', 'JUEVES', 'VIERNES'],
    physicalObjectives:     ['RESISTENCIA'],
    availableActivities:    ['RUNNING', 'GYM', 'FLEXIBILITY'],
  };

  // ─── Create Plan form ─────────────────────────────────────────────────────
  showCreateForm = false;
  newPlan: Partial<IndividualPlan> = {
    seasonMoment: 'PRETEMPORADA',
    status:       'BORRADOR',
    startDate:    new Date().toISOString().split('T')[0],
    endDate:      new Date(Date.now() + 28 * 86400000).toISOString().split('T')[0],
  };
  newPlanActiveWeek = 1;
  newPlanWeeks = 4;
  newPlanSchedule: Record<number, Record<string, DayConfig>> = {};

  // ─── UI state ─────────────────────────────────────────────────────────────
  loading = true;
  savingPlan = false;
  activeTab: 'compliance' | 'logs' | 'plans' | 'players' = 'compliance';

  // ─── Expose helpers ───────────────────────────────────────────────────────
  activityLabels = ACTIVITY_LABELS;
  activityColors = ACTIVITY_COLORS;
  durationFormatted = durationFormatted;
  paceFormatted     = paceFormatted;
  statusLabel       = statusLabel;
  statusBadgeClass  = statusBadgeClass;

  seasonMoments: SeasonMoment[] = ['PRETEMPORADA', 'VERANO', 'INICIO', 'PLENA_COMPETICION', 'FINAL_TEMPORADA'];
  seasonLabels: Record<SeasonMoment, string> = {
    PRETEMPORADA:     'Pretemporada',
    VERANO:           'Verano',
    INICIO:           'Inicio temporada',
    PLENA_COMPETICION:'Competición',
    FINAL_TEMPORADA:  'Final temporada',
  };

  daysOfWeek     = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
  dayLabels: Record<string, string> = {
    LUNES:'Lunes', MARTES:'Martes', MIERCOLES:'Miércoles', JUEVES:'Jueves',
    VIERNES:'Viernes', SABADO:'Sábado', DOMINGO:'Domingo',
  };

  physicalObjectives = ['RESISTENCIA', 'FUERZA', 'VELOCIDAD', 'AGILIDAD', 'RECUPERACION'];
  activityOptions: ActivityType[] = ['RUNNING', 'GYM', 'HIIT', 'CYCLING', 'SWIMMING', 'FLEXIBILITY'];

  activityIcons: Record<ActivityType, string> = {
    RUNNING: 'bi-person-walking', GYM: 'bi-dumbbell', HIIT: 'bi-lightning-charge-fill',
    CYCLING: 'bi-bicycle', SWIMMING: 'bi-water', FLEXIBILITY: 'bi-tree',
    CUSTOM: 'bi-star', REST: 'bi-moon',
  };

  resolvedTeamId = 0;
  private resolvedUserId = 0;

  constructor(
    private svc: IndividualTrainingService,
    private playerSvc: PlayerService,
    private teamSvc: TeamService,
    private loginSvc: LoginService,
  ) {}

  ngOnInit(): void {
    this.initNewPlanSchedule();
    // Take the first non-null emission (user is usually already in BehaviorSubject)
    this.loginSvc.usuarioActual.pipe(takeUntil(this.destroy$)).subscribe(user => {
      if (user && this.resolvedUserId === 0) {
        this.resolvedUserId = user.userId ?? 0;
        this.resolveTeamIdAndLoad();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Team Players ──────────────────────────────────────────────────────────

  private resolveTeamIdAndLoad(): void {
    // Fast path: sidebar stored the last visited teamId in sessionStorage
    const cachedTeamId = parseInt(sessionStorage.getItem('it_lastTeamId') ?? '0', 10);
    if (cachedTeamId > 0) {
      this.resolvedTeamId = cachedTeamId;
      this.loadPlans();
      this.loadTeamPlayers();
      // Still fetch team list in background for the team switcher
      this.fetchTeamList();
      return;
    }
    // Slow path: no cached teamId, must fetch teams first
    this.fetchTeamList(true);
  }

  private fetchTeamList(andLoad = false): void {
    const temporada = localStorage.getItem('temporada') ?? String(new Date().getFullYear());
    this.teamSvc.getTeams(String(this.resolvedUserId), temporada).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        const teams: any[] = res?.data?.teams ?? [];
        this.availableTeams = teams;
        if (andLoad && teams.length > 0 && !this.resolvedTeamId) {
          this.resolvedTeamId = teams[0].teamId ?? 0;
          this.loadPlans();
          this.loadTeamPlayers();
        }
      },
      error: () => {
        if (andLoad) {
          this.loadPlans();
        }
      }
    });
  }

  switchTeam(teamId: number): void {
    this.resolvedTeamId = teamId;
    sessionStorage.setItem('it_lastTeamId', String(teamId));
    this.loadTeamPlayers();
    this.loadPlans();
    if (this.selectedPlan) {
      this.clearSelection();
    }
  }

  loadTeamPlayers(): void {
    if (!this.resolvedTeamId) return;
    this.loadingPlayers = true;
    this.playerSvc.getPlayers(String(this.resolvedTeamId)).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.teamPlayers = res?.data?.players ?? res?.data ?? [];
        this.loadingPlayers = false;
      },
      error: () => { this.loadingPlayers = false; }
    });
  }

  isPlayerAssigned(playerId: number): boolean {
    return this.assignedPlayerIds.has(playerId);
  }

  togglePlayerAssignment(player: Player): void {
    if (!this.selectedPlan) return;
    const planId = this.selectedPlan.planId;
    this.togglingPlayerId = player.playerId;

    if (this.isPlayerAssigned(player.playerId)) {
      this.svc.unassignPlayer(planId, player.playerId).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.assignedPlayerIds.delete(player.playerId);
          this.togglingPlayerId = null;
          this.reloadCompliance();
        },
        error: () => { this.togglingPlayerId = null; }
      });
    } else {
      this.svc.assignPlayers(planId, [player.playerId]).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.assignedPlayerIds.add(player.playerId);
          this.togglingPlayerId = null;
          this.reloadCompliance();
        },
        error: () => { this.togglingPlayerId = null; }
      });
    }
  }

  assignAllPlayers(): void {
    if (!this.selectedPlan || !this.teamPlayers.length || this.bulkLoading) return;
    const unassigned = this.teamPlayers.filter(p => !this.isPlayerAssigned(p.playerId));
    if (!unassigned.length) return;
    this.bulkLoading = true;
    this.svc.assignPlayers(this.selectedPlan.planId, unassigned.map(p => p.playerId))
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          unassigned.forEach(p => this.assignedPlayerIds.add(p.playerId));
          this.bulkLoading = false;
          this.reloadCompliance();
        },
        error: () => { this.bulkLoading = false; }
      });
  }

  removeAllPlayers(): void {
    if (!this.selectedPlan || this.bulkLoading) return;
    const assigned = this.teamPlayers.filter(p => this.isPlayerAssigned(p.playerId));
    if (!assigned.length) return;
    this.bulkLoading = true;
    this.svc.removeAllPlayers(this.selectedPlan.planId)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          assigned.forEach(p => this.assignedPlayerIds.delete(p.playerId));
          this.bulkLoading = false;
          this.reloadCompliance();
        },
        error: () => { this.bulkLoading = false; }
      });
  }

  private reloadCompliance(): void {
    if (!this.selectedPlan) return;
    const planId = this.selectedPlan.planId;
    forkJoin({
      compliance: this.svc.getCompliance(planId),
      assigned:   this.svc.getAssignedPlayers(planId),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ compliance, assigned }) => {
        this.assignedPlayerIds = new Set(assigned.map((a: any) => a.playerId));
        this.compliance = this.buildCompliance(compliance, assigned);
      }
    });
  }

  // ─── Plans ──────────────────────────────────────────────────────────────────

  loadPlans(): void {
    this.loading = true;
    const userId = this.resolvedUserId;
    this.svc.getPlans({ userId }).pipe(takeUntil(this.destroy$)).subscribe({
      next: plans => {
        this.plans = plans;
        this.loading = false;
        if (this.selectedPlan) {
          const updated = plans.find(p => p.planId === this.selectedPlan!.planId);
          if (updated) this.selectedPlan = updated;
        }
      },
      error: () => { this.loading = false; }
    });
  }

  selectPlan(plan: IndividualPlan): void {
    this.selectedPlan = plan;
    this.activeTab = 'compliance';
    this.compliance = [];

    forkJoin({
      days:       this.svc.getPlanDays(plan.planId),
      compliance: this.svc.getCompliance(plan.planId),
      logs:       this.svc.getLogs({ planId: plan.planId }),
      assigned:   this.svc.getAssignedPlayers(plan.planId),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ days, compliance, logs, assigned }) => {
        this.planDays  = days;
        this.logs      = logs;
        this.assignedPlayerIds = new Set(assigned.map((a: any) => a.playerId));
        this.compliance = this.buildCompliance(compliance, assigned);
      },
      error: err => console.error('[IndividualTraining] selectPlan', err)
    });
  }

  private buildCompliance(
    compliance: PlayerComplianceSummary[],
    assigned: { playerId: number; playerName?: string }[]
  ): PlayerComplianceSummary[] {
    if (compliance.length > 0) return compliance;
    if (!assigned.length) return [];
    return assigned.map(a => ({
      playerId:      a.playerId,
      playerName:    a.playerName,
      totalDays:     0,
      completedDays: 0,
      compliancePct: 0,
    }));
  }

  clearSelection(): void {
    this.selectedPlan     = null;
    this.planDays         = [];
    this.compliance       = [];
    this.logs             = [];
    this.assignedPlayerIds = new Set();
    this.activeTab        = 'compliance';
  }

  createPlan(): void {
    this.savingPlan = true;
    const userId = this.resolvedUserId;
    const teamId = this.resolvedTeamId;

    const days = this.buildDaysFromSchedule();

    const body: Partial<IndividualPlan> & { days?: any[] } = {
      ...this.newPlan,
      createdByUserId: userId,
      teamId:          teamId || undefined,
      status:          (this.newPlan.status ?? 'BORRADOR') as PlanStatus,
      days,
    };

    this.svc.createPlan(body).pipe(takeUntil(this.destroy$)).subscribe({
      next: plan => {
        this.savingPlan     = false;
        this.showCreateForm = false;
        this.resetCreateForm();
        if (plan) this.loadPlans();
      },
      error: err => { console.error('[IndividualTraining] createPlan', err); this.savingPlan = false; }
    });
  }

  deletePlan(plan: IndividualPlan): void {
    if (!confirm(`¿Eliminar el plan "${plan.name}"?`)) return;
    this.svc.deletePlan(plan.planId).pipe(takeUntil(this.destroy$)).subscribe({
      next: ok => { if (ok) this.loadPlans(); },
      error: err => console.error('[IndividualTraining] deletePlan', err)
    });
  }

  activatePlan(plan: IndividualPlan): void {
    this.svc.updatePlan(plan.planId, { status: 'ACTIVO' }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.loadPlans(),
      error: err => console.error('[IndividualTraining] activatePlan', err)
    });
  }

  // ─── Schedule Editor ─────────────────────────────────────────────────────

  initNewPlanSchedule(): void {
    this.newPlanWeeks = this.computeWeeksFromDates();
    this.newPlanSchedule = {};
    for (let w = 1; w <= this.newPlanWeeks; w++) {
      this.newPlanSchedule[w] = {};
      for (const d of this.daysOfWeek) {
        this.newPlanSchedule[w][d] = {
          enabled: false, activityType: 'RUNNING', durationMinutes: 45,
          distanceKm: 0, sets: 0, reps: 0, description: ''
        };
      }
    }
    if (this.newPlanActiveWeek > this.newPlanWeeks) this.newPlanActiveWeek = 1;
  }

  onPlanDateChange(): void {
    const newWeeks = this.computeWeeksFromDates();
    if (newWeeks === this.newPlanWeeks) return;
    // Extend or trim schedule
    if (newWeeks > this.newPlanWeeks) {
      for (let w = this.newPlanWeeks + 1; w <= newWeeks; w++) {
        this.newPlanSchedule[w] = {};
        for (const d of this.daysOfWeek) {
          this.newPlanSchedule[w][d] = { ...this.newPlanSchedule[1]?.[d] ?? {
            enabled: false, activityType: 'RUNNING' as ActivityType,
            durationMinutes: 45, distanceKm: 0, sets: 0, reps: 0, description: ''
          }};
        }
      }
    }
    this.newPlanWeeks = newWeeks;
  }

  private computeWeeksFromDates(): number {
    if (!this.newPlan.startDate || !this.newPlan.endDate) return 4;
    const start = new Date(this.newPlan.startDate);
    const end   = new Date(this.newPlan.endDate);
    const diff  = Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 3600 * 1000));
    return Math.max(1, Math.min(20, diff));
  }

  getWeekNumbers(): number[] {
    return Array.from({ length: this.newPlanWeeks }, (_, i) => i + 1);
  }

  getDayConfig(week: number, day: string): DayConfig {
    return this.newPlanSchedule[week]?.[day] ?? {
      enabled: false, activityType: 'RUNNING', durationMinutes: 45,
      distanceKm: 0, sets: 0, reps: 0, description: ''
    };
  }

  setDayEnabled(week: number, day: string, enabled: boolean): void {
    if (this.newPlanSchedule[week]?.[day]) {
      this.newPlanSchedule[week][day].enabled = enabled;
    }
  }

  setDayActivity(week: number, day: string, activity: ActivityType): void {
    if (this.newPlanSchedule[week]?.[day]) {
      this.newPlanSchedule[week][day].activityType = activity;
    }
  }

  isDistanceActivity(activityType: ActivityType): boolean {
    return ['RUNNING', 'CYCLING', 'SWIMMING'].includes(activityType);
  }

  isSetActivity(activityType: ActivityType): boolean {
    return ['GYM', 'HIIT'].includes(activityType);
  }

  private buildDaysFromSchedule(): any[] {
    const days: any[] = [];
    for (let w = 1; w <= this.newPlanWeeks; w++) {
      for (const d of this.daysOfWeek) {
        const cfg = this.newPlanSchedule[w]?.[d];
        if (!cfg) continue;
        days.push({
          weekNumber:            w,
          dayOfWeek:             d,
          activityType:          cfg.enabled ? cfg.activityType : 'REST',
          restDay:               !cfg.enabled,
          targetDurationMinutes: cfg.enabled ? cfg.durationMinutes || null : null,
          targetDistanceKm:      cfg.enabled && cfg.distanceKm > 0 ? cfg.distanceKm : null,
          targetSets:            cfg.enabled && cfg.sets > 0 ? cfg.sets : null,
          targetReps:            cfg.enabled && cfg.reps > 0 ? cfg.reps : null,
          description:           cfg.enabled && cfg.description ? cfg.description : null,
        });
      }
    }
    return days;
  }

  private resetCreateForm(): void {
    this.newPlan = {
      seasonMoment: 'PRETEMPORADA',
      status:       'BORRADOR',
      startDate:    new Date().toISOString().split('T')[0],
      endDate:      new Date(Date.now() + 28 * 86400000).toISOString().split('T')[0],
    };
    this.newPlanActiveWeek = 1;
    this.initNewPlanSchedule();
  }

  // ─── AI Generator ─────────────────────────────────────────────────────────

  toggleAiDay(day: string): void {
    const days = [...(this.aiInput.trainingDays ?? [])];
    const idx  = days.indexOf(day);
    if (idx >= 0) days.splice(idx, 1); else days.push(day);
    this.aiInput = { ...this.aiInput, trainingDays: days };
  }

  toggleAiObjective(obj: string): void {
    const list = [...(this.aiInput.physicalObjectives ?? [])];
    const idx  = list.indexOf(obj);
    if (idx >= 0) list.splice(idx, 1); else list.push(obj);
    this.aiInput = { ...this.aiInput, physicalObjectives: list };
  }

  toggleAiActivity(act: ActivityType): void {
    const list = [...(this.aiInput.availableActivities ?? [])] as ActivityType[];
    const idx  = list.indexOf(act);
    if (idx >= 0) list.splice(idx, 1); else list.push(act);
    this.aiInput = { ...this.aiInput, availableActivities: list };
  }

  generateWithAi(): void {
    if (!this.aiInput.trainingDays?.length || !this.aiInput.physicalObjectives?.length) {
      this.aiError = 'Selecciona al menos un día y un objetivo físico.';
      return;
    }
    if (!this.aiInput.availableActivities?.length) {
      this.aiError = 'Selecciona al menos una actividad disponible.';
      return;
    }
    this.aiGenerating    = true;
    this.aiError         = null;
    this.aiGeneratedPlan = null;

    const userId = this.resolvedUserId;
    const teamId = this.resolvedTeamId;

    const input: IndividualPlanGeneratorInput = {
      userId,
      teamId:                 teamId || undefined,
      planName:               `Plan ${this.aiInput.seasonMoment} ${this.aiInput.durationWeeks}sem.`,
      seasonMoment:           this.aiInput.seasonMoment as SeasonMoment,
      durationWeeks:          this.aiInput.durationWeeks ?? 4,
      trainingDays:           this.aiInput.trainingDays ?? [],
      sessionDurationMinutes: this.aiInput.sessionDurationMinutes ?? 60,
      fitnessLevel:           this.aiInput.fitnessLevel as any ?? 'MEDIO',
      physicalObjectives:     this.aiInput.physicalObjectives ?? [],
      availableActivities:    this.aiInput.availableActivities ?? [],
      notes:                  this.aiInput.notes,
      startDate:              new Date().toISOString().split('T')[0],
    };

    this.svc.aiGeneratePlan(input).pipe(takeUntil(this.destroy$)).subscribe({
      next: result => {
        this.aiGenerating    = false;
        this.aiGeneratedPlan = result;
        if (!result) this.aiError = 'La IA no devolvió un plan. Comprueba la configuración del servidor.';
      },
      error: err => {
        this.aiGenerating = false;
        this.aiError      = 'Error al conectar con la IA.';
        console.error('[IndividualTraining] aiGeneratePlan', err);
      }
    });
  }

  saveAiPlan(): void {
    if (!this.aiGeneratedPlan) return;
    this.savingPlan = true;
    const userId = this.resolvedUserId;
    const teamId = this.resolvedTeamId;

    const weeks = this.aiGeneratedPlan.weeks ?? [];
    const days: any[] = [];
    for (const week of weeks) {
      for (const d of (week.days ?? [])) {
        days.push({
          weekNumber:            week.weekNumber,
          dayOfWeek:             d.dayOfWeek,
          activityType:          d.activityType ?? 'REST',
          restDay:               d.restDay === true,
          targetDurationMinutes: d.targetDurationMinutes,
          targetDistanceKm:      d.targetDistanceKm,
          targetSets:            d.targetSets,
          targetReps:            d.targetReps,
          description:           d.description,
        });
      }
    }

    const durationWeeks = this.aiInput.durationWeeks ?? 4;
    const start = new Date();
    const end   = new Date(start.getTime() + durationWeeks * 7 * 86400000);

    const body: Partial<IndividualPlan> & { days?: any[] } = {
      name:            this.aiGeneratedPlan.planName ?? 'Plan IA',
      description:     this.aiGeneratedPlan.description ?? '',
      seasonMoment:    (this.aiInput.seasonMoment ?? 'PRETEMPORADA') as SeasonMoment,
      status:          'BORRADOR' as PlanStatus,
      startDate:       start.toISOString().split('T')[0],
      endDate:         end.toISOString().split('T')[0],
      createdByUserId: userId,
      teamId:          teamId || undefined,
      days,
    };

    this.svc.createPlan(body).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.savingPlan      = false;
        this.showAiForm      = false;
        this.aiGeneratedPlan = null;
        this.loadPlans();
      },
      error: err => { console.error('[IndividualTraining] saveAiPlan', err); this.savingPlan = false; }
    });
  }

  // ─── Template helpers ─────────────────────────────────────────────────────

  getComplianceClass(pct: number): string {
    if (pct >= 90) return 'text-success';
    if (pct >= 60) return 'text-warning';
    return 'text-danger';
  }

  getComplianceBarClass(pct: number): string {
    if (pct >= 90) return 'bg-success';
    if (pct >= 60) return 'bg-warning';
    return 'bg-danger';
  }

  getWeeks(days: IndividualPlanDay[]): number[] {
    return [...new Set(days.map(d => d.weekNumber))].sort((a, b) => a - b);
  }

  getDaysForWeek(week: number): IndividualPlanDay[] {
    return this.planDays.filter(d => d.weekNumber === week);
  }

  totalKmForPlayer(playerId: number): number {
    return this.logs
      .filter(l => l.playerId === playerId && l.distanceMeters != null)
      .reduce((sum, l) => sum + (l.distanceMeters! / 1000), 0);
  }

  isAiDaySelected(day: string): boolean {
    return (this.aiInput.trainingDays ?? []).includes(day);
  }

  isAiObjectiveSelected(obj: string): boolean {
    return (this.aiInput.physicalObjectives ?? []).includes(obj);
  }

  isAiActivitySelected(act: ActivityType): boolean {
    return (this.aiInput.availableActivities ?? []).includes(act);
  }

  getActivityColor(activityType: string): string {
    return ACTIVITY_COLORS[activityType as ActivityType] ?? '#6c757d';
  }

  getActivityLabel(activityType: string): string {
    return ACTIVITY_LABELS[activityType as ActivityType] ?? activityType;
  }

  playerInitials(player: Player): string {
    const n = (player.nombre ?? '').charAt(0).toUpperCase();
    const a = (player.apellido ?? '').charAt(0).toUpperCase();
    return n + a;
  }
}
