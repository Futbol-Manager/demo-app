import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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
import { FormTemplateService } from 'src/app/core/services/form-template/form-template.service';
import { FormTemplate, FormTemplateCampo } from 'src/app/core/services/form-template/form-template.model';

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
  dayLabels: Record<string, string | undefined> = {
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

  // ─── Player view ──────────────────────────────────────────────────────────
  profileId = 0;
  playerId  = 0;

  playerPlans:        IndividualPlan[]    = [];
  selectedPlayerPlan: IndividualPlan | null = null;
  playerPlanDays:     IndividualPlanDay[] = [];
  playerLogs:         TrainingLog[]       = [];
  playerActiveTab: 'today' | 'schedule' | 'history' = 'today';

  showLogForm = false;
  savingLog   = false;
  logForm = {
    activityType:    'RUNNING' as ActivityType,
    durationMinutes: 30,
    durationSeconds: 0,
    distanceKm:      0,
    sets:            0,
    reps:            0,
    weightKg:        0,
    perceivedEffort: 5,
    notes:           '',
    logDate:         new Date().toISOString().split('T')[0],
    planDayId:       undefined as number | undefined,
  };
  currentLogPlanDay: IndividualPlanDay | null = null;

  // ─── Form templates (PRE/POST) ────────────────────────────────────────────
  preFormTemplates:  FormTemplate[] = [];
  postFormTemplates: FormTemplate[] = [];
  loadingFormTemplates = false;
  assigningDayId: number | null = null;

  // Player log form – templates cargados para el día actual
  activePreTemplate:  FormTemplate | null = null;
  activePostTemplate: FormTemplate | null = null;
  preFormAnswers:  Record<string, string | undefined> = {};
  postFormAnswers: Record<string, string | undefined> = {};
  loadingTemplatesForLog = false;

  // Coach compliance – respuestas de jugadores
  expandedCompliancePlayerId: number | null = null;
  playerFormResponses: { logId: number; logDate: string; tipo: 'pre' | 'post'; template: FormTemplate; answers: Record<string, string> }[] = [];
  loadingPlayerResponses = false;
  responsesModalOpen = false;
  responsesModalPlayerName = '';

  get isPlayerView(): boolean {
    return this.profileId === 3 || this.profileId === 5;
  }

  constructor(
    private svc: IndividualTrainingService,
    private playerSvc: PlayerService,
    private teamSvc: TeamService,
    private loginSvc: LoginService,
    private route: ActivatedRoute,
    private formTemplateSvc: FormTemplateService,
  ) {}

  ngOnInit(): void {
    this.initNewPlanSchedule();
    this.loginSvc.usuarioActual.pipe(takeUntil(this.destroy$)).subscribe(user => {
      if (user && this.resolvedUserId === 0) {
        this.resolvedUserId = user.userId    ?? 0;
        this.profileId      = (user as any).profileType?.profileId ?? 0;
        this.playerId       = (user as any).playerId ?? 0;

        if (this.isPlayerView) {
          // Leer query params: si vienen planId+date del calendario, cargar ese plan/día directamente
          const params = this.route.snapshot.queryParams;
          const planId = +params['planId'];
          const date   = params['date'] as string | undefined;
          if (planId) {
            this.loadPlanByIdForPlayer(planId, date);
          } else {
            this.loadPlayerPlans();
          }
        } else {
          this.resolveTeamIdAndLoad();
        }
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
    // No se sobreescribe assignedPlayerIds: se gestiona localmente en toggle/assign/remove.
    // Solo se recargan las estadísticas de cumplimiento.
    const currentAssigned = [...this.assignedPlayerIds].map(id => ({ playerId: id }));
    this.svc.getCompliance(planId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (compliance) => {
        this.compliance = this.buildCompliance(compliance, currentAssigned);
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
    this.expandedCompliancePlayerId = null;
    this.playerFormResponses        = [];

    // Si teamPlayers aún no se cargó (p.ej. primera visita), forzar carga ahora
    if (!this.teamPlayers.length && this.resolvedTeamId) {
      this.loadTeamPlayers();
    }

    // Cargar templates de formulario para el club
    if (!this.preFormTemplates.length && !this.postFormTemplates.length) {
      this.loadFormTemplates();
    }

    forkJoin({
      days:       this.svc.getPlanDays(plan.planId),
      compliance: this.svc.getCompliance(plan.planId),
      logs:       this.svc.getLogs({ planId: plan.planId }),
      assigned:   this.svc.getAssignedPlayers(plan.planId),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ days, compliance, logs, assigned }) => {
        this.planDays = days;
        this.logs     = logs;
        // Si getAssignedPlayers devuelve vacío, poblar desde compliance como fallback
        const effectiveAssigned = assigned.length > 0
          ? assigned
          : compliance.map((c: any) => ({ playerId: c.playerId, playerName: c.playerName }));
        this.assignedPlayerIds = new Set(effectiveAssigned.map((a: any) => a.playerId));
        this.compliance = this.buildCompliance(compliance, effectiveAssigned);
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
    this.expandedCompliancePlayerId = null;
    this.playerFormResponses        = [];
  }

  // ─── Form Templates (Coach) ───────────────────────────────────────────────

  loadFormTemplates(): void {
    const clubId = parseInt(sessionStorage.getItem('clubId') ?? localStorage.getItem('clubId') ?? '0', 10);
    if (!clubId) return;
    this.loadingFormTemplates = true;
    forkJoin({
      pre:  this.formTemplateSvc.getByClubAndTipo(clubId, 'pre-training'),
      post: this.formTemplateSvc.getByClubAndTipo(clubId, 'post-training'),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ pre, post }) => {
        this.preFormTemplates  = pre?.data ?? pre ?? [];
        this.postFormTemplates = post?.data ?? post ?? [];
        this.loadingFormTemplates = false;
      },
      error: () => { this.loadingFormTemplates = false; }
    });
  }

  assignFormToDay(day: IndividualPlanDay, tipo: 'pre' | 'post', templateId: number | null): void {
    this.assigningDayId = day.planDayId;
    const body = tipo === 'pre'
      ? { preFormTemplateId:  templateId }
      : { postFormTemplateId: templateId };
    this.svc.updatePlanDay(day.planDayId, body).pipe(takeUntil(this.destroy$)).subscribe({
      next: updated => {
        if (updated) {
          const idx = this.planDays.findIndex(d => d.planDayId === day.planDayId);
          if (idx >= 0) this.planDays[idx] = { ...this.planDays[idx], ...body };
        }
        this.assigningDayId = null;
      },
      error: () => { this.assigningDayId = null; }
    });
  }

  // ─── Compliance Responses (Coach) ─────────────────────────────────────────

  openResponsesModal(playerId: number): void {
    this.expandedCompliancePlayerId = playerId;
    this.responsesModalPlayerName = this.getPlayerName(playerId);
    this.playerFormResponses = [];
    this.responsesModalOpen = true;
    this.loadPlayerFormResponses(playerId);
  }

  closeResponsesModal(): void {
    this.responsesModalOpen = false;
    this.expandedCompliancePlayerId = null;
    this.playerFormResponses = [];
  }

  /** @deprecated Use openResponsesModal */
  toggleComplianceDetail(playerId: number): void {
    this.openResponsesModal(playerId);
  }

  private loadPlayerFormResponses(playerId: number): void {
    if (!this.selectedPlan) return;
    this.loadingPlayerResponses = true;

    const daysWithForms = this.planDays.filter(d => !d.restDay && (d.preFormTemplateId || d.postFormTemplateId));
    if (!daysWithForms.length) { this.loadingPlayerResponses = false; return; }

    // Usar logs ya cargados (todos los del plan). Primero intentar match exacto por playerId;
    // si vacío, mostrar todos los logs del plan con formularios (fallback cuando userId ≠ playerId).
    let logsWithForms = this.logs.filter(l =>
      l.playerId === playerId && daysWithForms.some(d => d.planDayId === l.planDayId)
    );
    if (!logsWithForms.length) {
      logsWithForms = this.logs.filter(l =>
        daysWithForms.some(d => d.planDayId === l.planDayId)
      );
    }

    if (!logsWithForms.length) { this.loadingPlayerResponses = false; return; }

    const requests: { log: TrainingLog; tipo: 'pre' | 'post'; templateId: number }[] = [];
    for (const log of logsWithForms) {
      const day = daysWithForms.find(d => d.planDayId === log.planDayId);
      if (day?.preFormTemplateId)  requests.push({ log, tipo: 'pre',  templateId: day.preFormTemplateId! });
      if (day?.postFormTemplateId) requests.push({ log, tipo: 'post', templateId: day.postFormTemplateId! });
    }

    let pending = requests.length;
    if (!pending) { this.loadingPlayerResponses = false; return; }

    for (const req of requests) {
      const tipo = req.tipo === 'pre' ? 'pre-training' : 'post-training';
      forkJoin({
        template: this.formTemplateSvc.getById(req.templateId),
        // Endpoint sin coachId: devuelve TODAS las respuestas de esa sesión
        response: this.formTemplateSvc.getAllResponsesByTraining(tipo, req.log.logId),
      }).pipe(takeUntil(this.destroy$)).subscribe({
        next: ({ template, response }) => {
          const tpl = this.normalizeTemplate(template?.data ?? template);
          const respList: any[] = response?.data ?? response ?? [];
          if (tpl && respList.length) {
            const answers: Record<string, string> = {};
            for (const r of respList) {
              // El backend devuelve r.respuestas como JSON string "[{campoId:'...',valor:'...'}]"
              try {
                const campoAnswers: { campoId: string; valor: string }[] =
                  typeof r.respuestas === 'string' ? JSON.parse(r.respuestas) : (r.respuestas ?? []);
                for (const ca of campoAnswers) {
                  if (ca.campoId) answers[ca.campoId] = ca.valor ?? '';
                }
              } catch {}
            }
            this.playerFormResponses.push({
              logId:   req.log.logId,
              logDate: req.log.logDate,
              tipo:    req.tipo,
              template: tpl,
              answers,
            });
          }
          pending--;
          if (pending === 0) this.loadingPlayerResponses = false;
        },
        error: () => { pending--; if (pending === 0) this.loadingPlayerResponses = false; }
      });
    }
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

  // ─── Player view methods ──────────────────────────────────────────────────

  /** Carga un plan específico por ID (cuando viene del calendario con planId en query params). */
  loadPlanByIdForPlayer(planId: number, date?: string): void {
    this.loading = true;
    const effectivePlayerId = this.playerId || this.resolvedUserId;
    forkJoin({
      plan: this.svc.getPlanById(planId),
      days: this.svc.getPlanDays(planId),
      logs: this.svc.getLogs({ playerId: effectivePlayerId || undefined, planId }),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ plan, days, logs }) => {
        this.loading = false;
        if (!plan) { this.loadPlayerPlans(); return; }
        this.playerPlans        = [plan];
        this.selectedPlayerPlan = plan;
        this.playerPlanDays     = days;
        this.playerLogs         = logs;

        // Si viene con fecha concreta, abrir directamente el formulario para ese día
        if (date) {
          const d       = new Date(date + 'T12:00:00'); // forzar mediodía para evitar offset
          const dayCode = this.toDayCode(d.getDay());
          const start   = new Date((plan.startDate as string) + 'T00:00:00');
          const diffDays = Math.floor((d.getTime() - start.getTime()) / 86400000);
          const weekNum  = Math.max(1, Math.floor(diffDays / 7) + 1);
          const planDay  = days.find(day => day.weekNumber === weekNum && day.dayOfWeek === dayCode && !day.restDay);
          this.playerActiveTab = 'today';
          if (planDay) {
            this.openLogForm(planDay);
            this.logForm.logDate = date;
          }
        }
      },
      error: () => { this.loading = false; this.loadPlayerPlans(); }
    });
  }

  loadPlayerPlans(): void {
    this.loading = true;
    // Intentar por playerId; si falla o devuelve vacío, intentar por teamId del equipo del jugador
    const cachedTeamId = parseInt(sessionStorage.getItem('it_lastTeamId') ?? '0', 10);
    const params = this.playerId > 0
      ? { playerId: this.playerId }
      : cachedTeamId > 0 ? { teamId: cachedTeamId } : {};

    this.svc.getPlans(params).pipe(takeUntil(this.destroy$)).subscribe({
      next: plans => {
        this.playerPlans = plans;
        this.loading = false;
        if (plans.length === 1) this.selectPlayerPlan(plans[0]);
      },
      error: () => {
        // Último fallback: buscar por teamId
        const teamId = parseInt(sessionStorage.getItem('it_lastTeamId') ?? '0', 10);
        if (teamId > 0 && this.playerId > 0) {
          this.svc.getPlans({ teamId }).pipe(takeUntil(this.destroy$)).subscribe({
            next: plans => { this.playerPlans = plans; this.loading = false; },
            error: () => { this.loading = false; }
          });
        } else {
          this.loading = false;
        }
      }
    });
  }

  selectPlayerPlan(plan: IndividualPlan): void {
    this.selectedPlayerPlan = plan;
    this.playerActiveTab    = 'today';
    this.showLogForm        = false;
    const effectivePlayerId = this.playerId || this.resolvedUserId;
    forkJoin({
      days: this.svc.getPlanDays(plan.planId),
      logs: this.svc.getLogs({ playerId: effectivePlayerId || undefined, planId: plan.planId }),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ days, logs }) => {
        this.playerPlanDays = days;
        this.playerLogs     = logs;
      }
    });
  }

  clearPlayerPlan(): void {
    this.selectedPlayerPlan = null;
    this.playerPlanDays     = [];
    this.playerLogs         = [];
    this.showLogForm        = false;
  }

  getTodayActivity(): IndividualPlanDay | null {
    if (!this.selectedPlayerPlan || !this.playerPlanDays.length) return null;
    const today     = new Date();
    const start     = new Date(this.selectedPlayerPlan.startDate);
    const diffDays  = Math.floor((today.getTime() - start.getTime()) / 86400000);
    const weekNum   = Math.floor(diffDays / 7) + 1;
    const dayCode   = this.toDayCode(today.getDay());
    return this.playerPlanDays.find(d => d.weekNumber === weekNum && d.dayOfWeek === dayCode && !d.restDay) ?? null;
  }

  private toDayCode(jsDay: number): string {
    return ['DOMINGO','LUNES','MARTES','MIERCOLES','JUEVES','VIERNES','SABADO'][jsDay] ?? 'LUNES';
  }

  hasLoggedToday(): boolean {
    const today = new Date().toISOString().split('T')[0];
    return this.playerLogs.some(l => (l.logDate ?? '').startsWith(today));
  }

  hasLoggedDay(day: IndividualPlanDay): boolean {
    return this.playerLogs.some(l => l.planDayId === day.planDayId);
  }

  playerCompliancePct(): number {
    const activeDays = this.playerPlanDays.filter(d => !d.restDay).length;
    if (!activeDays) return 0;
    return Math.min(100, Math.round((this.playerLogs.filter(l => l.completed).length / activeDays) * 100));
  }

  currentPlanWeek(): number {
    if (!this.selectedPlayerPlan) return 1;
    const diffDays = Math.floor((Date.now() - new Date(this.selectedPlayerPlan.startDate).getTime()) / 86400000);
    return Math.max(1, Math.floor(diffDays / 7) + 1);
  }

  getPlanWeeks(): number[] {
    return [...new Set(this.playerPlanDays.map(d => d.weekNumber))].sort((a, b) => a - b);
  }

  getPlanDaysForWeek(week: number): IndividualPlanDay[] {
    return this.playerPlanDays.filter(d => d.weekNumber === week);
  }

  openLogForm(planDay?: IndividualPlanDay | null): void {
    this.logForm = {
      activityType:    planDay?.activityType ?? 'RUNNING',
      durationMinutes: planDay?.targetDurationMinutes ?? 30,
      durationSeconds: 0,
      distanceKm:      planDay?.targetDistanceKm ?? 0,
      sets:            planDay?.targetSets ?? 0,
      reps:            planDay?.targetReps ?? 0,
      weightKg:        0,
      perceivedEffort: 5,
      notes:           '',
      logDate:         new Date().toISOString().split('T')[0],
      planDayId:       planDay?.planDayId,
    };
    this.currentLogPlanDay  = planDay ?? null;
    this.activePreTemplate  = null;
    this.activePostTemplate = null;
    this.preFormAnswers     = {};
    this.postFormAnswers    = {};

    if (planDay?.preFormTemplateId || planDay?.postFormTemplateId) {
      this.loadingTemplatesForLog = true;
      const reqs: Record<string, any> = {};
      if (planDay.preFormTemplateId)  reqs['pre']  = this.formTemplateSvc.getById(planDay.preFormTemplateId);
      if (planDay.postFormTemplateId) reqs['post'] = this.formTemplateSvc.getById(planDay.postFormTemplateId);
      forkJoin(reqs).pipe(takeUntil(this.destroy$)).subscribe({
        next: (res: any) => {
          if (res['pre'])  this.activePreTemplate  = this.normalizeTemplate(res['pre']?.data  ?? res['pre']);
          if (res['post']) this.activePostTemplate = this.normalizeTemplate(res['post']?.data ?? res['post']);
          this.initFormAnswers();
          this.loadingTemplatesForLog = false;
        },
        error: () => { this.loadingTemplatesForLog = false; }
      });
    }

    this.showLogForm = true;
  }

  /** Normaliza un FormTemplate: parsea `campos` si viene como JSON string */
  private normalizeTemplate(tpl: any): FormTemplate | null {
    if (!tpl) return null;
    if (typeof tpl.campos === 'string') {
      try { tpl = { ...tpl, campos: JSON.parse(tpl.campos) }; } catch { tpl = { ...tpl, campos: [] }; }
    }
    if (!Array.isArray(tpl.campos)) tpl = { ...tpl, campos: [] };
    return tpl as FormTemplate;
  }

  private initFormAnswers(): void {
    this.preFormAnswers  = {};
    this.postFormAnswers = {};
    const defaultFor = (tipo: string) => {
      if (tipo === 'CHECKBOX') return 'false';
      if (tipo === 'SCALE')   return '5';
      if (tipo === 'RATING')  return '3';
      return '';
    };
    for (const c of (this.activePreTemplate?.campos ?? [])) {
      this.preFormAnswers[c.id]  = defaultFor(c.tipo);
    }
    for (const c of (this.activePostTemplate?.campos ?? [])) {
      this.postFormAnswers[c.id] = defaultFor(c.tipo);
    }
  }

  getFormCampoOpciones(campo: FormTemplateCampo): string[] {
    return campo.opciones ?? [];
  }

  saveLog(): void {
    if (!this.selectedPlayerPlan) return;
    // Usar playerId del perfil; si no existe, usar el userId del login como fallback
    const effectivePlayerId = this.playerId || this.resolvedUserId;
    if (!effectivePlayerId) return;
    this.savingLog = true;
    const totalSec = (this.logForm.durationMinutes * 60) + (this.logForm.durationSeconds ?? 0);
    const body: Partial<TrainingLog> = {
      playerId:        effectivePlayerId,
      planId:          this.selectedPlayerPlan.planId,
      planDayId:       this.logForm.planDayId,
      activityType:    this.logForm.activityType,
      logDate:         this.logForm.logDate,
      durationSeconds: totalSec || undefined,
      distanceMeters:  this.logForm.distanceKm ? Math.round(this.logForm.distanceKm * 1000) : undefined,
      sets:            this.logForm.sets  || undefined,
      reps:            this.logForm.reps  || undefined,
      weightKg:        this.logForm.weightKg || undefined,
      perceivedEffort: this.logForm.perceivedEffort,
      notes:           this.logForm.notes || undefined,
      completed:       true,
    };
    this.svc.createLog(body).pipe(takeUntil(this.destroy$)).subscribe({
      next: log => {
        if (log) {
          this.playerLogs = [log, ...this.playerLogs];
          this.saveFormResponses(log.logId);
          this.showLogForm = false;
        }
        this.savingLog = false;
      },
      error: () => { this.savingLog = false; }
    });
  }

  private saveFormResponses(logId: number): void {
    const teamId = this.resolvedTeamId || parseInt(sessionStorage.getItem('it_lastTeamId') ?? '0', 10);
    const saveIfNeeded = (template: FormTemplate | null, answers: Record<string, string | undefined>, tipo: 'pre-training' | 'post-training') => {
      if (!template) return;
      // Guardar siempre que el template tenga campos, aunque no se hayan modificado
      if (!(template.campos?.length)) return;
      const respuestas = Object.entries(answers).map(([campoId, valor]) => ({ campoId, valor }));
      this.formTemplateSvc.saveResponse({
        formTemplateId:    template.formTemplateId,
        coachUserId:       this.resolvedUserId,
        teamId:            teamId || 0,
        tipo,
        trainingSessionId: logId,
        respuestas:        JSON.stringify(respuestas),
        isStandard:        0,
      }).pipe(takeUntil(this.destroy$)).subscribe({
        error: err => console.error('[IndividualTraining] saveFormResponses', err)
      });
    };
    saveIfNeeded(this.activePreTemplate,  this.preFormAnswers,  'pre-training');
    saveIfNeeded(this.activePostTemplate, this.postFormAnswers, 'post-training');
  }

  // ─── Template helpers ─────────────────────────────────────────────────────

  planDaysHaveForms(): boolean {
    return this.planDays.some(d => d.preFormTemplateId || d.postFormTemplateId);
  }

  sortedCampos(campos: FormTemplateCampo[] | string | undefined): FormTemplateCampo[] {
    let arr: FormTemplateCampo[] = [];
    if (typeof campos === 'string') {
      try { arr = JSON.parse(campos); } catch { arr = []; }
    } else {
      arr = campos ?? [];
    }
    return [...arr].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  }

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

  /** Devuelve el nombre completo de un jugador buscando primero en teamPlayers (que sí tiene nombres). */
  getPlayerName(playerId: number): string {
    const found = this.teamPlayers.find(p => p.playerId === playerId);
    if (found) return `${found.nombre ?? ''} ${found.apellido ?? ''}`.trim();
    return `Jugador #${playerId}`;
  }

  /** Iniciales de un jugador por ID, para el avatar en cumplimiento. */
  getPlayerInitials(playerId: number): string {
    const found = this.teamPlayers.find(p => p.playerId === playerId);
    if (found) {
      const n = (found.nombre ?? '').charAt(0).toUpperCase();
      const a = (found.apellido ?? '').charAt(0).toUpperCase();
      return n + a;
    }
    return '#';
  }
}
