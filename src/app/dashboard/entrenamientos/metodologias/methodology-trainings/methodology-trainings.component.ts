import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { Response } from 'src/app/core/services/models/response.model';
import { ClubTask, ClubTaskService } from 'src/app/core/services/training/club-task.service';
import { TrainingService } from 'src/app/core/services/training/training.service';
import {
  MethodologyService,
  MethodologyTeam,
  MethodologyTraining,
  TrainingTask,
} from 'src/app/core/services/training/methodology.service';

/**
 * Entrenamientos por equipo dentro de una metodología (Fase 3).
 *
 * <p>Por cada equipo asignado a la metodología, permite crear entrenamientos
 * (que son `training_sessions` reales y aparecen en el calendario de coach y
 * jugador) y gestionar sus tareas (copia de club o de la nube).
 */
@Component({
  selector: 'app-methodology-trainings',
  templateUrl: './methodology-trainings.component.html',
  styleUrls: ['./methodology-trainings.component.scss'],
})
export class MethodologyTrainingsComponent implements OnChanges {

  @Input() clubId = 0;
  @Input() methodologyId = 0;
  @Input() teams: MethodologyTeam[] = [];

  selectedTeamId: number | null = null;
  trainings: MethodologyTraining[] = [];
  loading = false;
  saving = false;
  error = '';

  // Crear / editar entrenamiento
  showForm = false;
  editingId: number | null = null;
  form: MethodologyTraining = {};

  // Detalle de entrenamiento (tareas)
  selectedTraining: MethodologyTraining | null = null;
  trainingTasks: TrainingTask[] = [];
  tasksLoading = false;

  // Selector de tareas
  showPicker = false;
  pickerSource: 'CLOUD' | 'CLUB' = 'CLUB';
  pickerLoading = false;
  clubTasks: ClubTask[] = [];
  cloudTasks: any[] = [];

  constructor(
    private methodologyService: MethodologyService,
    private clubTaskService: ClubTaskService,
    private trainingService: TrainingService,
    private translate: TranslateService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['teams'] || changes['methodologyId']) {
      if (this.teams?.length && !this.selectedTeamId) {
        this.selectedTeamId = this.teams[0].teamId ?? null;
      }
      if (this.selectedTeamId && !this.teams.some((t) => t.teamId === this.selectedTeamId)) {
        this.selectedTeamId = this.teams[0]?.teamId ?? null;
      }
      this.loadTrainings();
    }
  }

  onTeamChange(): void {
    this.selectedTraining = null;
    this.loadTrainings();
  }

  loadTrainings(): void {
    if (!this.methodologyId || !this.selectedTeamId) {
      this.trainings = [];
      return;
    }
    this.loading = true;
    this.error = '';
    this.methodologyService.listTrainings(this.clubId, this.methodologyId, this.selectedTeamId).subscribe({
      next: (res: Response) => {
        this.trainings = res?.status === 200 && Array.isArray(res.data) ? (res.data as MethodologyTraining[]) : [];
        this.loading = false;
      },
      error: () => {
        this.error = 'ENTRENAMIENTOS.TR_ERROR_LOAD';
        this.loading = false;
      },
    });
  }

  // ----------------------------------------------------- Crear / editar

  openCreate(): void {
    this.editingId = null;
    this.form = { visible: 1, infoVisible: 0, daySession: this.today() };
    this.error = '';
    this.showForm = true;
  }

  openEdit(t: MethodologyTraining): void {
    this.editingId = t.trainingSessionId ?? null;
    this.form = { ...t };
    this.error = '';
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
    this.form = {};
    this.editingId = null;
  }

  saveTraining(): void {
    if (!this.selectedTeamId) {
      return;
    }
    if (!this.form.daySession) {
      this.error = 'ENTRENAMIENTOS.TR_DATE_REQUIRED';
      return;
    }
    this.saving = true;
    this.error = '';
    const body: MethodologyTraining = { ...this.form, teamId: this.selectedTeamId };
    const obs = this.editingId
      ? this.methodologyService.updateTraining(this.clubId, this.methodologyId, this.editingId, body)
      : this.methodologyService.createTraining(this.clubId, this.methodologyId, body);
    obs.subscribe({
      next: (res: Response) => {
        this.saving = false;
        if (res?.status === 200) {
          this.cancelForm();
          this.loadTrainings();
        } else {
          this.error = 'ENTRENAMIENTOS.TR_ERROR_SAVE';
        }
      },
      error: () => {
        this.saving = false;
        this.error = 'ENTRENAMIENTOS.TR_ERROR_SAVE';
      },
    });
  }

  deleteTraining(t: MethodologyTraining): void {
    if (!t.trainingSessionId) {
      return;
    }
    const msg = this.translate.instant('ENTRENAMIENTOS.TR_CONFIRM_DELETE');
    if (!window.confirm(msg)) {
      return;
    }
    this.methodologyService.removeTraining(this.clubId, this.methodologyId, t.trainingSessionId).subscribe({
      next: (res: Response) => {
        if (res?.status === 200) {
          if (this.selectedTraining?.trainingSessionId === t.trainingSessionId) {
            this.selectedTraining = null;
          }
          this.loadTrainings();
        } else {
          this.error = 'ENTRENAMIENTOS.TR_ERROR_DELETE';
        }
      },
      error: () => { this.error = 'ENTRENAMIENTOS.TR_ERROR_DELETE'; },
    });
  }

  // ----------------------------------------------------- Detalle (tareas)

  openTraining(t: MethodologyTraining): void {
    this.selectedTraining = t;
    this.showPicker = false;
    this.loadTrainingTasks();
  }

  backFromTraining(): void {
    this.selectedTraining = null;
    this.trainingTasks = [];
    this.showPicker = false;
  }

  loadTrainingTasks(): void {
    if (!this.selectedTraining?.trainingSessionId) {
      return;
    }
    this.tasksLoading = true;
    this.methodologyService.listTrainingTasks(this.clubId, this.methodologyId, this.selectedTraining.trainingSessionId).subscribe({
      next: (res: Response) => {
        this.trainingTasks = res?.status === 200 && Array.isArray(res.data) ? (res.data as TrainingTask[]) : [];
        this.tasksLoading = false;
      },
      error: () => {
        this.error = 'ENTRENAMIENTOS.TR_ERROR_LOAD';
        this.tasksLoading = false;
      },
    });
  }

  openPicker(): void {
    this.showPicker = true;
    this.setPickerSource(this.pickerSource);
  }

  closePicker(): void {
    this.showPicker = false;
  }

  setPickerSource(source: 'CLOUD' | 'CLUB'): void {
    this.pickerSource = source;
    if (source === 'CLUB' && this.clubTasks.length === 0) {
      this.pickerLoading = true;
      this.clubTaskService.list(this.clubId).subscribe({
        next: (res: Response) => {
          this.clubTasks = res?.status === 200 && Array.isArray(res.data) ? (res.data as ClubTask[]) : [];
          this.pickerLoading = false;
        },
        error: () => { this.pickerLoading = false; },
      });
    } else if (source === 'CLOUD' && this.cloudTasks.length === 0) {
      this.pickerLoading = true;
      this.trainingService.getAllTaskShop().subscribe({
        next: (res: Response) => {
          this.cloudTasks = res?.status === 200 && Array.isArray(res.data) ? (res.data as any[]) : [];
          this.pickerLoading = false;
        },
        error: () => { this.pickerLoading = false; },
      });
    }
  }

  addTask(sourceType: 'SHOP' | 'CLUB', sourceTaskId: number): void {
    if (!this.selectedTraining?.trainingSessionId) {
      return;
    }
    this.methodologyService
      .addTrainingTask(this.clubId, this.methodologyId, this.selectedTraining.trainingSessionId, sourceType, sourceTaskId)
      .subscribe({
        next: (res: Response) => {
          if (res?.status === 200) {
            this.loadTrainingTasks();
            if (this.selectedTraining) {
              this.selectedTraining.taskCount = (this.selectedTraining.taskCount ?? 0) + 1;
            }
          }
        },
        error: () => { this.error = 'ENTRENAMIENTOS.TR_ERROR_SAVE'; },
      });
  }

  removeTask(task: TrainingTask): void {
    if (!this.selectedTraining?.trainingSessionId || !task.taskId) {
      return;
    }
    this.methodologyService
      .removeTrainingTask(this.clubId, this.methodologyId, this.selectedTraining.trainingSessionId, task.taskId)
      .subscribe({
        next: (res: Response) => {
          if (res?.status === 200) {
            this.loadTrainingTasks();
            if (this.selectedTraining) {
              this.selectedTraining.taskCount = Math.max(0, (this.selectedTraining.taskCount ?? 0) - 1);
            }
          }
        },
        error: () => { this.error = 'ENTRENAMIENTOS.TR_ERROR_DELETE'; },
      });
  }

  // ----------------------------------------------------- helpers

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  trackByTraining(_i: number, t: MethodologyTraining): number {
    return t.trainingSessionId ?? _i;
  }

  trackByTask(_i: number, t: TrainingTask): number {
    return t.taskId ?? _i;
  }
}
