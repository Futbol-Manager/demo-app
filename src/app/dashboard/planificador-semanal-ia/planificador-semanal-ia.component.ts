import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import {
  AiChatService,
  WeeklyPlannerInput,
  WeeklyPlannerSession,
  WeeklyPlannerTask
} from 'src/app/core/services/ai-chat/ai-chat.service';
import { LoginService } from 'src/app/core/services/login/login.service';
import { TrainingService } from 'src/app/core/services/training/training.service';
import { Training, Task } from 'src/app/core/services/models/training.models';

interface WizardDay {
  name: string;
  date: string;
  label: string;
}

@Component({
  selector: 'app-planificador-semanal-ia',
  templateUrl: './planificador-semanal-ia.component.html',
  styleUrls: ['./planificador-semanal-ia.component.scss']
})
export class PlanificadorSemanalIaComponent implements OnInit {

  @Input() teamId: number | null = null;
  @Input() teamName: string = '';
  @Input() clubId: number | null = null;
  @Input() semanaActual: any[] = [];
  @Output() cerrar = new EventEmitter<void>();
  @Output() calendarioActualizado = new EventEmitter<void>();

  currentStep = 1;
  totalSteps = 7;

  // Estados del flujo
  loading = false;
  planGenerado: string | null = null;
  planSessions: WeeklyPlannerSession[] = [];
  errorMsg: string | null = null;
  copied = false;

  // Creación de entrenamientos
  creando = false;
  creacionProgreso = 0;
  creacionTotal = 0;
  creacionMensaje = '';
  creacionCompletada = false;
  creacionError: string | null = null;

  // Step 1 — Días de entrenamiento
  weekDays: WizardDay[] = [];
  selectedTrainingDays: string[] = [];

  // Step 2 — Partido
  hasMatch = false;
  matchDay = '';
  matchTime = '';
  matchLocation = 'Local';
  matchImportance = 'Liga';

  // Step 3 — Formato sesiones
  sessionDuration = 90;
  hasDoubleSession = false;
  doubleSessionDay = '';

  // Step 4 — Plantilla
  playersAvailable = 18;
  fatigue = 'MEDIA';

  // Step 5 — Objetivos
  objectivesMap: { [key: string]: boolean } = {
    TACTICO: false, TECNICO: false, FISICO: false,
    BALON_PARADO: false, PSICOLOGICO: false, RIVAL: false
  };
  tacticSubs: { [key: string]: boolean } = {
    PRESION: false, TRANSICIONES: false, DEFENSA_ORGANIZADA: false,
    JUEGO_POSICIONAL: false, SALIDA_BALON: false
  };
  technicalSubs: { [key: string]: boolean } = {
    PASE: false, REMATE: false, REGATE: false, CONTROL: false, PORTERIA: false
  };
  physicalSubs: { [key: string]: boolean } = {
    VELOCIDAD: false, RESISTENCIA: false, FUERZA: false, AGILIDAD: false, RECUPERACION: false
  };

  // Step 6 — Contexto temporada
  seasonMoment = 'PLENA_COMPETICION';
  lastMatchResult = 'SIN_PARTIDO';
  weeklyLoadHistory = 'MEDIA';

  // Step 7 — Notas libres
  notes = '';

  private userId = 0;

  constructor(
    private aiChatService: AiChatService,
    private loginService: LoginService,
    private trainingService: TrainingService
  ) {}

  ngOnInit(): void {
    this.loginService.usuarioActual.subscribe(user => {
      if (user) this.userId = user.userId;
    });
    this.buildWeekDays();
  }

  private buildWeekDays(): void {
    if (this.semanaActual && this.semanaActual.length > 0) {
      const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
      this.weekDays = this.semanaActual.map((dia: any, i: number) => ({
        name: dayNames[i] ?? `Día ${i + 1}`,
        date: dia.daysession ?? '',
        label: `${dayNames[i] ?? ''} ${dia.numero ? dia.numero : ''}`
      }));
    } else {
      const today = new Date();
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
      const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
      this.weekDays = dayNames.map((name, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return { name, date: d.toISOString().split('T')[0], label: `${name} ${d.getDate()}` };
      });
    }
  }

  /** Devuelve la fecha ISO (YYYY-MM-DD) real del día a partir del nombre del día. */
  private getDateForDayName(dayName: string): string {
    const found = this.weekDays.find(d => d.name === dayName);
    return found?.date ?? '';
  }

  get progressPercent(): number {
    return Math.round((this.currentStep / this.totalSteps) * 100);
  }

  toggleTrainingDay(dayName: string): void {
    const idx = this.selectedTrainingDays.indexOf(dayName);
    if (idx >= 0) this.selectedTrainingDays.splice(idx, 1);
    else this.selectedTrainingDays.push(dayName);
  }

  isTrainingDay(dayName: string): boolean {
    return this.selectedTrainingDays.includes(dayName);
  }

  get selectedObjectives(): string[] {
    return Object.keys(this.objectivesMap).filter(k => this.objectivesMap[k]);
  }

  get selectedTacticSubs(): string[] {
    return Object.keys(this.tacticSubs).filter(k => this.tacticSubs[k]);
  }

  get selectedTechnicalSubs(): string[] {
    return Object.keys(this.technicalSubs).filter(k => this.technicalSubs[k]);
  }

  get selectedPhysicalSubs(): string[] {
    return Object.keys(this.physicalSubs).filter(k => this.physicalSubs[k]);
  }

  canGoNext(): boolean {
    if (this.currentStep === 1) return this.selectedTrainingDays.length > 0;
    if (this.currentStep === 5) return this.selectedObjectives.length > 0;
    return true;
  }

  next(): void {
    if (this.currentStep < this.totalSteps && this.canGoNext()) this.currentStep++;
  }

  prev(): void {
    if (this.currentStep === 8) {
      // Volver al último paso del wizard limpiando el estado del resultado
      this.currentStep = this.totalSteps;
      this.errorMsg = null;
      this.planGenerado = null;
      this.planSessions = [];
    } else if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  // ── GENERAR PLAN (llamada a IA) ──────────────────────────────────────────

  generarPlan(): void {
    this.loading = true;
    this.errorMsg = null;
    this.planGenerado = null;
    this.planSessions = [];
    this.creacionCompletada = false;
    this.creacionError = null;

    const payload: WeeklyPlannerInput = {
      userId: this.userId,
      clubId: this.clubId,
      teamId: this.teamId,
      teamName: this.teamName,
      trainingDays: this.selectedTrainingDays,
      hasMatch: this.hasMatch,
      matchDay: this.hasMatch ? this.matchDay : undefined,
      matchTime: this.hasMatch ? this.matchTime : undefined,
      matchLocation: this.hasMatch ? this.matchLocation : undefined,
      matchImportance: this.hasMatch ? this.matchImportance : undefined,
      sessionDurationMinutes: this.sessionDuration,
      hasDoubleSession: this.hasDoubleSession,
      doubleSessionDay: this.hasDoubleSession ? this.doubleSessionDay : undefined,
      playersAvailable: this.playersAvailable,
      fatigue: this.fatigue,
      objectives: this.selectedObjectives,
      tacticSubobjectives: this.objectivesMap['TACTICO'] ? this.selectedTacticSubs : undefined,
      technicalSubobjectives: this.objectivesMap['TECNICO'] ? this.selectedTechnicalSubs : undefined,
      physicalSubobjectives: this.objectivesMap['FISICO'] ? this.selectedPhysicalSubs : undefined,
      seasonMoment: this.seasonMoment,
      lastMatchResult: this.lastMatchResult,
      weeklyLoadHistory: this.weeklyLoadHistory,
      notes: this.notes || undefined
    };

    this.aiChatService.weeklyPlanner(payload).subscribe({
      next: (res) => {
        this.loading = false;
        this.currentStep = 8; // Siempre ir al paso 8 para mostrar resultado o error
        if (res.success && res.response) {
          this.planGenerado = res.response;
          this.planSessions = res.sessions ?? [];
        } else {
          this.errorMsg = res.message || 'Error al generar el plan. Inténtalo de nuevo.';
        }
      },
      error: () => {
        this.loading = false;
        this.currentStep = 8;
        this.errorMsg = 'Error de conexión con la API. Inténtalo de nuevo.';
      }
    });
  }

  // ── CONFIRMAR Y CREAR ENTRENAMIENTOS ────────────────────────────────────

  confirmarYCrear(): void {
    if (!this.teamId || this.planSessions.length === 0) return;

    const teamIdStr = String(this.teamId);
    this.creando = true;
    this.creacionError = null;
    this.creacionCompletada = false;
    this.creacionProgreso = 0;
    this.creacionTotal = this.planSessions.length;

    const sessions = [...this.planSessions];

    const crearSesion = (idx: number) => {
      if (idx >= sessions.length) {
        this.creando = false;
        this.creacionCompletada = true;
        this.creacionMensaje = `¡${this.creacionTotal} entrenamientos creados con sus ejercicios!`;
        this.calendarioActualizado.emit();
        return;
      }

      const session = sessions[idx];
      this.creacionMensaje = `Creando sesión ${idx + 1}/${this.creacionTotal}: ${session.dayName}...`;

      const training = new Training({
        trainingSessionId: 0,
        daySession: this.getDateForDayName(session.dayName),
        objectiveSession: session.objectiveSession ?? '',
        warmUp: session.warmUp ?? '',
        addressSession: session.addressSession ?? '',
        visible: 1,
        infoVisible: 0,
        tasks: []
      });

      this.trainingService.createUpdateTrainingSession(teamIdStr, training).subscribe({
        next: (res: any) => {
          const sessionId: number = res?.data?.trainingSessionId ?? res?.trainingSessionId ?? 0;
          const tasks: WeeklyPlannerTask[] = session.tasks ?? [];

          if (!sessionId || tasks.length === 0) {
            this.creacionProgreso++;
            crearSesion(idx + 1);
            return;
          }

          this.crearTareas(String(sessionId), [...tasks], 0, () => {
            this.creacionProgreso++;
            crearSesion(idx + 1);
          });
        },
        error: (err: any) => {
          console.error(`[PlanificadorIA] Error creando sesión ${session.dayName}:`, err);
          this.creacionProgreso++;
          crearSesion(idx + 1); // continúa con la siguiente sesión
        }
      });
    };

    crearSesion(0);
  }

  private crearTareas(sessionId: string, tasks: WeeklyPlannerTask[], idx: number, onComplete: () => void): void {
    if (idx >= tasks.length) {
      onComplete();
      return;
    }

    const t = tasks[idx];
    const task = new Task();
    task.description = t.description ?? '';
    task.rules       = t.rules ?? '';
    task.worktime    = t.worktime ?? '';
    task.space       = t.space ?? '';
    task.material    = t.material ?? '';
    task.work        = t.work ?? 'TECNICO';
    task.intencion   = t.intencion ?? '';

    this.trainingService.createUpdateTask(sessionId, task, 0, this.userId).subscribe({
      next:  () => this.crearTareas(sessionId, tasks, idx + 1, onComplete),
      error: () => this.crearTareas(sessionId, tasks, idx + 1, onComplete)
    });
  }

  // ── UTILIDADES ───────────────────────────────────────────────────────────

  copyPlan(): void {
    if (this.planGenerado) {
      navigator.clipboard.writeText(this.planGenerado).then(() => {
        this.copied = true;
        setTimeout(() => (this.copied = false), 2500);
      });
    }
  }

  get creacionProgresoPercent(): number {
    if (this.creacionTotal === 0) return 0;
    return Math.round((this.creacionProgreso / this.creacionTotal) * 100);
  }

  resetWizard(): void {
    this.currentStep = 1;
    this.planGenerado = null;
    this.planSessions = [];
    this.errorMsg = null;
    this.creando = false;
    this.creacionCompletada = false;
    this.creacionError = null;
    this.creacionProgreso = 0;
    this.selectedTrainingDays = [];
    this.hasMatch = false;
    this.matchDay = '';
    this.matchTime = '';
    this.matchLocation = 'Local';
    this.matchImportance = 'Liga';
    this.sessionDuration = 90;
    this.hasDoubleSession = false;
    this.doubleSessionDay = '';
    this.playersAvailable = 18;
    this.fatigue = 'MEDIA';
    Object.keys(this.objectivesMap).forEach(k => (this.objectivesMap[k] = false));
    Object.keys(this.tacticSubs).forEach(k => (this.tacticSubs[k] = false));
    Object.keys(this.technicalSubs).forEach(k => (this.technicalSubs[k] = false));
    Object.keys(this.physicalSubs).forEach(k => (this.physicalSubs[k] = false));
    this.seasonMoment = 'PLENA_COMPETICION';
    this.lastMatchResult = 'SIN_PARTIDO';
    this.weeklyLoadHistory = 'MEDIA';
    this.notes = '';
  }

  onCerrar(): void {
    this.cerrar.emit();
  }
}
