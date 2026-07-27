import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { ClubEvalService, ClubEvalConfig, ClubEvalField, ClubPlayerEvaluation, ClubEvalScore } from 'src/app/core/services/club-eval/club-eval.service';
import { LoginService } from 'src/app/core/services/login/login.service';
import { TrainingService } from 'src/app/core/services/training/training.service';
import { ClubService } from 'src/app/core/services/club/club.service';
import { NotificationService } from 'src/app/core/services/notification/notification.service';

export type LinkedEventType = 'none' | 'match' | 'training';

export interface CalendarItem {
  id: number;
  label: string;
  date: string;
  type: 'match' | 'training';
}

@Component({
  selector: 'app-club-eval-form',
  templateUrl: './club-eval-form.component.html',
  styleUrls: ['./club-eval-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClubEvalFormComponent implements OnInit, OnDestroy {

  @Input() clubId!: number;
  @Input() playerId!: number;
  @Input() config: ClubEvalConfig | null = null;
  @Input() editingEval: ClubPlayerEvaluation | null = null;
  @Input() teamId?: number;

  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private destroy$ = new Subject<void>();
  private userId = 0;

  activeFields: ClubEvalField[] = [];

  // Form fields
  overallRating = 3;
  notes = '';
  observationContext = '';
  evaluationDate = '';
  visibleToPlayer = 0;
  scores: { [key: string]: number } = {};

  // Linked event
  linkedEventType: LinkedEventType = 'none';
  selectedMatchId = 0;
  selectedTrainingId = 0;

  matches: CalendarItem[] = [];
  trainings: CalendarItem[] = [];
  calendarLoading = false;

  saving = false;

  constructor(
    private clubEvalService: ClubEvalService,
    private loginService: LoginService,
    private trainingService: TrainingService,
    private clubService: ClubService,
    private notification: NotificationService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loginService.usuarioActual
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => { if (user) this.userId = user.userId ?? 0; });

    this.activeFields = this.config?.fields?.filter(f => f.active === 1) || [];
    this.activeFields.forEach(f => { this.scores[f.fieldKey] = 5; });

    const today = new Date();
    this.evaluationDate = today.toISOString().split('T')[0];

    if (this.editingEval) {
      this.overallRating = this.editingEval.overallRating || 3;
      this.notes = this.editingEval.notes || '';
      this.observationContext = this.editingEval.observationContext || '';
      this.evaluationDate = this.editingEval.evaluationDate || this.evaluationDate;
      this.visibleToPlayer = this.editingEval.visibleToPlayer || 0;
      if (this.editingEval.matchId) {
        this.linkedEventType = 'match';
        this.selectedMatchId = this.editingEval.matchId;
      } else if (this.editingEval.trainingId) {
        this.linkedEventType = 'training';
        this.selectedTrainingId = this.editingEval.trainingId;
      }
      if (this.editingEval.scores) {
        this.editingEval.scores.forEach(s => { this.scores[s.fieldKey] = s.score; });
      }
    }

    if (this.teamId) {
      this.loadCalendarEvents();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
          this.matches.push({
            id: mp.matchPreparationId,
            label: (mp.rivalName || 'Partido') + tipo,
            date: mp.matchDate ? String(mp.matchDate).substring(0, 10) : '',
            type: 'match'
          });
        });

        mapMatch(liga?.data || []);
        mapMatch(copa?.data || []);
        mapMatch(amistoso?.data || []);
        mapMatch(torneo?.data || []);

        // Ordenar partidos por fecha desc
        this.matches.sort((a, b) => b.date.localeCompare(a.date));

        this.trainings = (trainings?.data || [])
          .map((t: any) => ({
            id: t.trainingSessionId,
            label: t.objectiveSession || 'Entrenamiento',
            date: t.daySession ? String(t.daySession).substring(0, 10) : '',
            type: 'training' as const
          }))
          .sort((a: CalendarItem, b: CalendarItem) => b.date.localeCompare(a.date));

        this.calendarLoading = false;
        this.cdr.markForCheck();
      });
  }

  onLinkedEventTypeChange(): void {
    this.selectedMatchId = 0;
    this.selectedTrainingId = 0;
    // Auto-rellenar fecha con el evento seleccionado si se elige
  }

  onMatchSelected(matchId: number): void {
    const match = this.matches.find(m => m.id === +matchId);
    if (match?.date) this.evaluationDate = match.date;
    this.observationContext = match ? `Partido vs ${match.label}` : '';
  }

  onTrainingSelected(trainingId: number): void {
    const training = this.trainings.find(t => t.id === +trainingId);
    if (training?.date) this.evaluationDate = training.date;
    this.observationContext = training?.label ? `Entrenamiento: ${training.label}` : 'Entrenamiento';
  }

  setRating(r: number): void {
    this.overallRating = r;
  }

  getStars(): number[] {
    return [1, 2, 3, 4, 5];
  }

  onSave(): void {
    if (!this.evaluationDate) return;
    this.saving = true;

    const scoresList: ClubEvalScore[] = Object.entries(this.scores).map(([key, val]) => ({
      fieldKey: key,
      score: val
    }));

    const payload: ClubPlayerEvaluation = {
      clubId: this.clubId,
      playerId: this.playerId,
      teamId: this.teamId || 0,
      evaluatorUserId: this.userId,
      overallRating: this.overallRating,
      notes: this.notes,
      observationContext: this.observationContext,
      matchId: this.linkedEventType === 'match' ? +this.selectedMatchId : 0,
      trainingId: this.linkedEventType === 'training' ? +this.selectedTrainingId : 0,
      evaluationDate: this.evaluationDate,
      visibleToPlayer: this.visibleToPlayer,
      scores: scoresList
    };

    if (this.editingEval?.id) {
      this.clubEvalService.updateEvaluation(this.clubId, this.editingEval.id, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.saving = false;
            this.notification.success('CLUB_EVAL.MSG.SAVED');
            this.saved.emit();
            this.cdr.markForCheck();
          },
          error: () => {
            this.saving = false;
            this.notification.error('CLUB_EVAL.MSG.SAVE_ERROR');
            this.cdr.markForCheck();
          }
        });
    } else {
      this.clubEvalService.createEvaluation(this.clubId, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.saving = false;
            this.notification.success('CLUB_EVAL.MSG.SAVED');
            this.saved.emit();
            this.cdr.markForCheck();
          },
          error: () => {
            this.saving = false;
            this.notification.error('CLUB_EVAL.MSG.SAVE_ERROR');
            this.cdr.markForCheck();
          }
        });
    }
  }
}
