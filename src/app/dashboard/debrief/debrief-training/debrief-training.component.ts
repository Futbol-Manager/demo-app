import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LoginService } from 'src/app/core/services/login/login.service';
import { DebriefService } from 'src/app/core/services/debrief/debrief.service';
import { SpeechRecognitionService } from 'src/app/core/services/speech/speech-recognition.service';
import { TrainingService } from 'src/app/core/services/training/training.service';
import { PlayerService } from 'src/app/core/services/player/player.service';
import { Response } from 'src/app/core/services/models/response.model';
import {
  DebriefQuestion,
  DebriefAnswer,
  DebriefTraining,
  DebriefConfig,
  AttendanceContext
} from 'src/app/core/models/debrief/debrief.model';

@Component({
  selector: 'app-debrief-training',
  templateUrl: './debrief-training.component.html',
  styleUrls: ['./debrief-training.component.scss']
})
export class DebriefTrainingComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  // ── Parámetros de ruta ──
  teamId = 0;
  trainingSessionId = 0;

  // ── Usuario ──
  userId = 0;

  // ── Estado del wizard ──
  questions: DebriefQuestion[] = [];
  answers: Map<string, DebriefAnswer> = new Map();
  currentStep = 0;
  totalSteps = 0;
  isCompleted = false;
  isSaving = false;

  // ── Asistencia ──
  attendanceContext: AttendanceContext | null = null;
  loadingAttendance = true;

  // ── Jugadores (para selectors tipo 'players') ──
  players: any[] = [];
  loadingPlayers = true;

  // ── Configuración personalizada ──
  config: DebriefConfig | null = null;

  // ── Speech ──
  speechAvailable = false;
  isListening = false;
  interimText = '';
  activeAudioQuestionId: string | null = null;
  private stoppingAudioQuestionId: string | null = null;

  // ── Custom Questions modal ──
  showCustomModal = false;
  newCustomQuestion: Partial<DebriefQuestion> = {};

  // ── Info del entrenamiento ──
  trainingDate = '';
  trainingObjective = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private loginService: LoginService,
    private debriefService: DebriefService,
    private speechService: SpeechRecognitionService,
    private trainingService: TrainingService,
    private playerService: PlayerService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    // Speech availability
    this.speechAvailable = this.speechService.isAvailable();

    // Suscripciones Speech
    this.speechService.isListening$
      .pipe(takeUntil(this.destroy$))
      .subscribe(listening => this.isListening = listening);

    this.speechService.result$
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        const qId = this.activeAudioQuestionId || this.stoppingAudioQuestionId;
        if (qId) {
          this.appendAudioTranscript(qId, result.transcript);
          this.stoppingAudioQuestionId = null;
        }
      });

    this.speechService.interimTranscript$
      .pipe(takeUntil(this.destroy$))
      .subscribe(text => this.interimText = text);

    // Usuario
    this.loginService.usuarioActual.subscribe(user => {
      if (user) {
        this.userId = user.userId;
      }
    });

    // Parámetros de ruta
    this.route.params.subscribe(params => {
      this.teamId = +params['teamId'];
      this.trainingSessionId = +params['trainingSessionId'];
      this.loadData();
    });
  }

  ngOnDestroy(): void {
    this.speechService.stopListening();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ═══════════════════════════════════════
  // CARGA DE DATOS
  // ═══════════════════════════════════════

  private loadData(): void {
    // Cargar config personalizada
    this.debriefService.getConfig(this.userId, this.teamId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(config => {
        this.config = config;
        this.questions = this.debriefService.getTrainingQuestions(config);
        this.totalSteps = this.questions.length;
        this.initAnswers();
      });

    // Cargar asistencia contextual
    this.loadingAttendance = true;
    this.debriefService.getAttendanceContext(this.teamId, new Date().toISOString())
      .pipe(takeUntil(this.destroy$))
      .subscribe(ctx => {
        this.attendanceContext = ctx;
        this.loadingAttendance = false;
      });

    // Cargar jugadores del equipo
    this.loadingPlayers = true;
    this.playerService.getPlayers(String(this.teamId))
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (response: Response) => {
          if (response && response.data && response.data.players) {
            this.players = response.data.players;
          }
          this.loadingPlayers = false;
        },
        () => { this.loadingPlayers = false; }
      );

    // Cargar info del entrenamiento
    // TODO: Llamar endpoint real para obtener los datos del entrenamiento
    this.trainingDate = new Date().toLocaleDateString();
  }

  private initAnswers(): void {
    this.questions.forEach(q => {
      if (!this.answers.has(q.id)) {
        this.answers.set(q.id, {
          questionId: q.id,
          skipped: false
        });
      }
    });
  }

  // ═══════════════════════════════════════
  // NAVEGACIÓN DEL WIZARD
  // ═══════════════════════════════════════

  get currentQuestion(): DebriefQuestion | null {
    return this.questions[this.currentStep] || null;
  }

  get currentAnswer(): DebriefAnswer | null {
    if (!this.currentQuestion) return null;
    return this.answers.get(this.currentQuestion.id) || null;
  }

  get progress(): number {
    if (this.totalSteps === 0) return 0;
    return Math.round(((this.currentStep + 1) / this.totalSteps) * 100);
  }

  get canGoNext(): boolean {
    if (!this.currentQuestion || !this.currentAnswer) return false;
    if (!this.currentQuestion.required) return true;
    return this.isAnswered(this.currentAnswer);
  }

  isAnswered(answer: DebriefAnswer): boolean {
    return !!(
      answer.quickValue !== undefined && answer.quickValue !== null && answer.quickValue !== '' ||
      answer.textValue ||
      answer.audioTranscript ||
      (answer.selectedPlayers && answer.selectedPlayers.length > 0)
    );
  }

  nextStep(): void {
    if (this.currentStep < this.totalSteps - 1) {
      this.currentStep++;
    }
  }

  prevStep(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
    }
  }

  goToStep(step: number): void {
    if (step >= 0 && step < this.totalSteps) {
      this.currentStep = step;
    }
  }

  skipQuestion(): void {
    if (this.currentAnswer) {
      this.currentAnswer.skipped = true;
    }
    this.nextStep();
  }

  // ═══════════════════════════════════════
  // RESPUESTAS
  // ═══════════════════════════════════════

  setRating(questionId: string, value: number): void {
    const answer = this.answers.get(questionId);
    if (answer) {
      answer.quickValue = value;
    }
  }

  setScale(questionId: string, value: number): void {
    const answer = this.answers.get(questionId);
    if (answer) {
      answer.quickValue = value;
    }
  }

  selectOption(questionId: string, optionKey: string): void {
    const answer = this.answers.get(questionId);
    if (answer) {
      answer.quickValue = optionKey;
    }
  }

  setTextValue(questionId: string, text: string): void {
    const answer = this.answers.get(questionId);
    if (answer) {
      answer.textValue = text;
    }
  }

  togglePlayer(questionId: string, playerId: number): void {
    const answer = this.answers.get(questionId);
    if (answer) {
      if (!answer.selectedPlayers) answer.selectedPlayers = [];
      const idx = answer.selectedPlayers.indexOf(playerId);
      if (idx >= 0) {
        answer.selectedPlayers.splice(idx, 1);
      } else {
        answer.selectedPlayers.push(playerId);
      }
    }
  }

  isPlayerSelected(questionId: string, playerId: number): boolean {
    const answer = this.answers.get(questionId);
    return answer?.selectedPlayers?.includes(playerId) || false;
  }

  // ═══════════════════════════════════════
  // AUDIO / SPEECH
  // ═══════════════════════════════════════

  toggleAudio(questionId: string): void {
    if (this.isListening && this.activeAudioQuestionId === questionId) {
      this.stoppingAudioQuestionId = questionId;
      this.speechService.stopListening();
      this.activeAudioQuestionId = null;
      this.interimText = '';
    } else {
      this.activeAudioQuestionId = questionId;
      this.stoppingAudioQuestionId = null;
      const appLang = this.translate.currentLang || 'es';
      const speechLang = this.speechService.mapAppLangToSpeechLang(appLang);
      this.speechService.startListening(speechLang, true);
    }
  }

  private appendAudioTranscript(questionId: string, text: string): void {
    const answer = this.answers.get(questionId);
    if (answer) {
      const existing = answer.audioTranscript || '';
      answer.audioTranscript = existing ? `${existing} ${text}` : text;
      // También rellenar textValue con la transcripción
      answer.textValue = answer.audioTranscript;
    }
    this.interimText = '';
  }

  // ═══════════════════════════════════════
  // PREGUNTAS PERSONALIZADAS
  // ═══════════════════════════════════════

  openCustomModal(): void {
    this.newCustomQuestion = {
      type: 'text',
      required: false,
      isDefault: false,
      category: 'custom'
    };
    this.showCustomModal = true;
  }

  closeCustomModal(): void {
    this.showCustomModal = false;
    this.newCustomQuestion = {};
  }

  addCustomQuestion(): void {
    if (!this.newCustomQuestion.textKey) return;

    const question: DebriefQuestion = {
      id: 'CQ_' + Date.now(),
      textKey: this.newCustomQuestion.textKey || '',
      type: this.newCustomQuestion.type || 'text',
      required: this.newCustomQuestion.required || false,
      isDefault: false,
      category: 'custom',
      options: this.newCustomQuestion.options
    };

    this.debriefService.addCustomQuestion(question);
    this.questions.push(question);
    this.totalSteps = this.questions.length;
    this.answers.set(question.id, { questionId: question.id, skipped: false });
    this.closeCustomModal();
  }

  removeQuestion(questionId: string): void {
    this.debriefService.removeQuestion(questionId);
    this.questions = this.questions.filter(q => q.id !== questionId);
    this.totalSteps = this.questions.length;
    if (this.currentStep >= this.totalSteps) {
      this.currentStep = Math.max(0, this.totalSteps - 1);
    }
  }

  // ═══════════════════════════════════════
  // GUARDAR Y COMPLETAR
  // ═══════════════════════════════════════

  completeDebrief(): void {
    this.isSaving = true;

    const debrief: DebriefTraining = {
      trainingSessionId: this.trainingSessionId,
      teamId: this.teamId,
      coachUserId: this.userId,
      date: new Date().toISOString(),
      answers: Array.from(this.answers.values()).filter(a => !a.skipped),
      attendanceContext: this.attendanceContext || undefined,
      status: 'completed'
    };

    this.debriefService.saveTrainingDebrief(debrief)
      .pipe(takeUntil(this.destroy$))
      .subscribe(saved => {
        this.isCompleted = true;
        this.isSaving = false;
        // Navegar al informe
        this.router.navigate([
          '/dashboard/debrief/report',
          saved.debriefId,
          'training'
        ]);
      });
  }

  saveDraft(): void {
    const debrief: DebriefTraining = {
      trainingSessionId: this.trainingSessionId,
      teamId: this.teamId,
      coachUserId: this.userId,
      date: new Date().toISOString(),
      answers: Array.from(this.answers.values()),
      attendanceContext: this.attendanceContext || undefined,
      status: 'draft'
    };

    this.debriefService.saveTrainingDebrief(debrief)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Mostrar feedback visual
      });
  }

  goBack(): void {
    window.history.back();
  }

  // ═══════════════════════════════════════
  // HELPERS PARA TEMPLATE
  // ═══════════════════════════════════════

  getRatingArray(max: number = 5): number[] {
    return Array.from({ length: max }, (_, i) => i + 1);
  }

  getScaleArray(min: number, max: number): number[] {
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
  }

  getStepIcon(question: DebriefQuestion): string {
    const icons: { [key: string]: string } = {
      'general': 'bi-star',
      'objectives': 'bi-bullseye',
      'intensity': 'bi-activity',
      'players': 'bi-people',
      'tactical': 'bi-diagram-3',
      'notes': 'bi-chat-text',
      'custom': 'bi-plus-circle'
    };
    return icons[question.category || 'general'] || 'bi-question-circle';
  }
}
