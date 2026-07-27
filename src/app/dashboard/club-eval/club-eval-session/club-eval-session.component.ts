import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { LoginService } from 'src/app/core/services/login/login.service';
import { ClubEvalService, ClubEvalField, ClubEvalConfig, ClubPlayerEvaluation } from 'src/app/core/services/club-eval/club-eval.service';
import { TrainingService } from 'src/app/core/services/training/training.service';
import { ClubService } from 'src/app/core/services/club/club.service';
import { SpeechRecognitionService } from 'src/app/core/services/speech/speech-recognition.service';
import { environment } from 'src/environments/environment';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CanDeactivateUnsaved } from './unsaved-session.guard';
import { NotificationService } from 'src/app/core/services/notification/notification.service';

export type SessionLinkedEventType = 'none' | 'match' | 'training' | 'free';

export interface SessionCalendarItem {
  id: number;
  label: string;
  date: string;
  type: 'match' | 'training';
}

interface SessionRow {
  playerId: number;
  nombre: string;
  apellido: string;
  posicion: string;
  foto: string;
  scores: { [fieldKey: string]: number | null };
  notes: string;
  overallRating: number | null;
  included: boolean;
  // Para edición: id de la evaluación existente si ya fue guardada
  existingEvalId?: number;
}

@Component({
  selector: 'app-club-eval-session',
  templateUrl: './club-eval-session.component.html',
  styleUrls: ['./club-eval-session.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClubEvalSessionComponent implements OnInit, OnDestroy, CanDeactivateUnsaved {

  private destroy$ = new Subject<void>();

  clubId = 0;
  teamId = 0;
  userId = 0;
  imageBaseUrl: string = environment.images + 'user/';

  config: ClubEvalConfig | null = null;
  activeFields: ClubEvalField[] = [];

  rows: SessionRow[] = [];
  brokenPhotos: Record<number, boolean> = {};
  loading = true;
  saving = false;
  savedSuccessfully = false;

  // Control de cambios para el guard
  dirty = false;

  // Evento vinculado a la sesión
  linkedEventType: SessionLinkedEventType = 'none';
  selectedMatchId = 0;
  selectedTrainingId = 0;
  freeEventLabel = '';
  sessionDate = new Date().toISOString().split('T')[0];

  matches: SessionCalendarItem[] = [];
  trainings: SessionCalendarItem[] = [];
  calendarLoading = false;

  // Modo edición: si hay evaluaciones existentes del equipo en esa fecha
  isEditMode = false;
  existingEvalDate = '';

  // Speech-to-text — mismo patrón que debrief-match
  speechAvailable = false;
  isListening = false;
  interimText = '';
  activeAudioPlayerId: number | null = null;
  private stoppingAudioPlayerId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private loginService: LoginService,
    private clubEvalService: ClubEvalService,
    private trainingService: TrainingService,
    private clubService: ClubService,
    private translateService: TranslateService,
    public speechService: SpeechRecognitionService,
    private notification: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.speechAvailable = this.speechService.isAvailable();

    // Patrón idéntico al de debrief-match
    this.speechService.isListening$
      .pipe(takeUntil(this.destroy$))
      .subscribe(listening => { this.isListening = listening; this.cdr.markForCheck(); });

    this.speechService.result$
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        const pid = this.activeAudioPlayerId ?? this.stoppingAudioPlayerId;
        if (pid !== null) {
          this.appendAudioTranscript(pid, result.transcript);
          this.stoppingAudioPlayerId = null;
        }
        this.cdr.markForCheck();
      });

    this.speechService.interimTranscript$
      .pipe(takeUntil(this.destroy$))
      .subscribe(text => { this.interimText = text; this.cdr.markForCheck(); });

    this.clubId = +this.route.snapshot.paramMap.get('clubId')!;
    this.teamId = +this.route.snapshot.paramMap.get('teamId')!;

    // Opcionalmente recibir una fecha para cargar sesión existente
    const dateParam = this.route.snapshot.queryParamMap.get('date');
    if (dateParam) {
      this.existingEvalDate = dateParam;
      this.sessionDate = dateParam;
      this.isEditMode = true;
    }

    this.loginService.usuarioActual
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => { if (user) this.userId = user.userId ?? 0; this.cdr.markForCheck(); });

    this.loadData();
  }

  ngOnDestroy(): void {
    this.speechService.stopListening();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Speech-to-text — patrón idéntico a debrief-match ──────────────────────

  isMicListening(playerId: number): boolean {
    return this.isListening && this.activeAudioPlayerId === playerId;
  }

  toggleMic(playerId: number): void {
    if (this.isListening && this.activeAudioPlayerId === playerId) {
      this.stoppingAudioPlayerId = playerId;
      this.speechService.stopListening();
      this.activeAudioPlayerId = null;
      this.interimText = '';
    } else {
      this.activeAudioPlayerId = playerId;
      this.stoppingAudioPlayerId = null;
      const lang = this.speechService.mapAppLangToSpeechLang(
        this.translateService.currentLang || 'es'
      );
      this.speechService.startListening(lang, true);
    }
  }

  private appendAudioTranscript(playerId: number, text: string): void {
    const row = this.rows.find(r => r.playerId === playerId);
    if (!row) return;
    const sep = row.notes && !row.notes.endsWith(' ') ? ' ' : '';
    row.notes = (row.notes + sep + text).trim();
    this.markDirty();
    this.interimText = '';
  }

  /** Interfaz CanDeactivateUnsaved */
  hasUnsavedChanges(): boolean {
    return this.dirty && !this.savedSuccessfully;
  }

  markDirty(): void {
    this.dirty = true;
  }

  loadData(): void {
    this.clubEvalService.getConfig(this.clubId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          if (res?.data) {
            this.config = res.data;
            this.activeFields = (res.data.fields || []).filter((f: ClubEvalField) => f.active === 1);
          }
          this.loadPlayers();
          this.loadCalendarEvents();
          this.cdr.markForCheck();
        },
        error: () => { this.loadPlayers(); this.loadCalendarEvents(); }
      });
  }

  loadCalendarEvents(): void {
    if (!this.teamId) return;
    this.calendarLoading = true;
    forkJoin({
      liga: this.clubService.getMatchesByTeamAndType(this.teamId, 'Liga').pipe(catchError(() => of(null))),
      copa: this.clubService.getMatchesByTeamAndType(this.teamId, 'Copa').pipe(catchError(() => of(null))),
      amistoso: this.clubService.getMatchesByTeamAndType(this.teamId, 'Amistoso').pipe(catchError(() => of(null))),
      torneo: this.clubService.getMatchesByTeamAndType(this.teamId, 'Torneo').pipe(catchError(() => of(null))),
      trainings: this.trainingService.getTrainingSessions(String(this.teamId)).pipe(catchError(() => of(null)))
    }).pipe(takeUntil(this.destroy$))
      .subscribe(({ liga, copa, amistoso, torneo, trainings }) => {
        this.matches = [];
        const seenIds = new Set<number>();
        const mapMatch = (list: any[]) => list?.forEach((p: any) => {
          const mp = p.matchPreparation || p;
          if (!mp?.matchPreparationId) return;
          if (seenIds.has(mp.matchPreparationId)) return;
          seenIds.add(mp.matchPreparationId);
          const tipo = mp.tipoPartido ? ` (${mp.tipoPartido})` : '';
          this.matches.push({ id: mp.matchPreparationId, label: (mp.rivalName || 'Partido') + tipo, date: mp.matchDate ? String(mp.matchDate).substring(0, 10) : '', type: 'match' });
        });
        mapMatch(liga?.data || []);
        mapMatch(copa?.data || []);
        mapMatch(amistoso?.data || []);
        mapMatch(torneo?.data || []);
        this.matches.sort((a, b) => b.date.localeCompare(a.date));

        this.trainings = (trainings?.data || [])
          .map((t: any) => ({ id: t.trainingSessionId, label: t.objectiveSession || 'Entrenamiento', date: t.daySession ? String(t.daySession).substring(0, 10) : '', type: 'training' as const }))
          .sort((a: SessionCalendarItem, b: SessionCalendarItem) => b.date.localeCompare(a.date));

        this.calendarLoading = false;
        this.cdr.markForCheck();
      });
  }

  onLinkedEventTypeChange(): void {
    this.selectedMatchId = 0;
    this.selectedTrainingId = 0;
    this.freeEventLabel = '';
    this.markDirty();
  }

  onMatchSelected(id: number): void {
    const match = this.matches.find(m => m.id === +id);
    if (match?.date) this.sessionDate = match.date;
    this.markDirty();
  }

  onTrainingSelected(id: number): void {
    const training = this.trainings.find(t => t.id === +id);
    if (training?.date) this.sessionDate = training.date;
    this.markDirty();
  }

  loadPlayers(): void {
    this.clubEvalService.getTeamPlayers(this.clubId, this.teamId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const players = res?.data || [];
          this.rows = players.map((p: any) => {
            const scores: { [k: string]: number | null } = {};
            this.activeFields.forEach(f => scores[f.fieldKey] = null);
            return {
              playerId: p.playerId,
              nombre: p.nombre,
              apellido: p.apellido || '',
              posicion: p.posicion,
              foto: p.foto,
              scores,
              notes: '',
              overallRating: null,
              included: false,
              existingEvalId: undefined
            };
          });
          this.loading = false;
          this.cdr.markForCheck();

          // Si estamos en modo edición, cargar las evaluaciones existentes del equipo para esa fecha
          if (this.isEditMode && this.existingEvalDate) {
            this.loadExistingEvaluations();
          }
        },
        error: () => { this.loading = false; this.cdr.markForCheck(); }
      });
  }

  /** Carga evaluaciones ya guardadas del equipo para una fecha dada y pre-rellena las filas */
  loadExistingEvaluations(): void {
    this.clubEvalService.getTeamEvaluationsByDate(this.clubId, this.teamId, this.existingEvalDate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const evals: ClubPlayerEvaluation[] = res?.data || [];
          evals.forEach(ev => {
            const row = this.rows.find(r => r.playerId === ev.playerId);
            if (!row) return;
            row.existingEvalId = ev.id;
            row.overallRating = ev.overallRating ?? null;
            row.notes = ev.notes || '';
            row.included = true;
            (ev.scores || []).forEach((s: any) => {
              row.scores[s.fieldKey] = s.score;
            });
            // Restaurar el evento vinculado del primer registro (todos comparten el mismo)
            if (!this.linkedEventType || this.linkedEventType === 'none') {
              if (ev.matchId) {
                this.linkedEventType = 'match';
                this.selectedMatchId = ev.matchId;
              } else if (ev.trainingId) {
                this.linkedEventType = 'training';
                this.selectedTrainingId = ev.trainingId;
              } else if (ev.observationContext) {
                this.linkedEventType = 'free';
                this.freeEventLabel = ev.observationContext;
              }
            }
          });
          this.cdr.markForCheck();
        },
        error: () => this.notification.errorLoad()
      });
  }

  onScoreChange(row: SessionRow, fieldKey: string, value: string): void {
    const num = parseInt(value, 10);
    row.scores[fieldKey] = isNaN(num) ? null : Math.min(10, Math.max(0, num));
    this.autoInclude(row);
    this.markDirty();
  }

  onOverallChange(row: SessionRow, value: string): void {
    const num = parseInt(value, 10);
    row.overallRating = isNaN(num) ? null : Math.min(10, Math.max(0, num));
    this.autoInclude(row);
    this.markDirty();
  }

  onNotesChange(): void {
    this.markDirty();
  }

  autoInclude(row: SessionRow): void {
    const hasAnyScore = Object.values(row.scores).some(v => v !== null) || row.overallRating !== null;
    if (hasAnyScore) row.included = true;
  }

  toggleRow(row: SessionRow): void {
    row.included = !row.included;
    this.markDirty();
  }

  get includedCount(): number {
    return this.rows.filter(r => r.included).length;
  }

  saveSession(): void {
    const toSave = this.rows.filter(r => r.included);
    if (!toSave.length) return;

    const matchId = this.linkedEventType === 'match' && this.selectedMatchId ? this.selectedMatchId : undefined;
    const trainingId = this.linkedEventType === 'training' && this.selectedTrainingId ? this.selectedTrainingId : undefined;
    const matchPrefix = this.translateService.instant('CLUB_EVAL.FORM.MATCH_PREFIX');
    const trainingPrefix = this.translateService.instant('CLUB_EVAL.FORM.TRAINING_PREFIX');
    const observationContext = this.linkedEventType === 'free' ? this.freeEventLabel :
      this.linkedEventType === 'match' ? (this.matches.find(m => m.id === this.selectedMatchId)?.label ? `${matchPrefix} ${this.matches.find(m => m.id === this.selectedMatchId)!.label}` : '') :
      this.linkedEventType === 'training' ? (this.trainings.find(t => t.id === this.selectedTrainingId)?.label ? `${trainingPrefix} ${this.trainings.find(t => t.id === this.selectedTrainingId)!.label}` : '') : '';

    const evaluations: ClubPlayerEvaluation[] = toSave.map(row => ({
      id: row.existingEvalId,       // si existe, el backend actualiza en lugar de crear
      clubId: this.clubId,
      playerId: row.playerId,
      teamId: this.teamId,
      evaluatorUserId: this.userId,
      overallRating: row.overallRating ?? this.computeOverall(row),
      notes: row.notes || '',
      observationContext,
      evaluationDate: this.sessionDate,
      matchId,
      trainingId,
      scores: this.activeFields
        .filter(f => row.scores[f.fieldKey] !== null)
        .map(f => ({ fieldKey: f.fieldKey, score: row.scores[f.fieldKey]! }))
    }));

    this.saving = true;
    this.clubEvalService.createTeamSession(this.clubId, this.teamId, evaluations)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saving = false;
          this.savedSuccessfully = true;
          this.dirty = false;
          this.notification.saveSuccess();
          this.cdr.markForCheck();
          this.location.back();
        },
        error: () => {
          this.saving = false;
          this.notification.errorGeneric();
          this.cdr.markForCheck();
        }
      });
  }

  private computeOverall(row: SessionRow): number {
    const vals = Object.values(row.scores).filter(v => v !== null) as number[];
    if (!vals.length) return 5;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }

  onPhotoError(playerId: number): void {
    setTimeout(() => { this.brokenPhotos[playerId] = true; this.cdr.markForCheck(); });
  }

  goBack(): void { this.location.back(); }
}
