import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { Response } from 'src/app/core/services/models/response.model';
import { ClubTask, ClubTaskService } from 'src/app/core/services/training/club-task.service';
import { ClubTaskFormComponent } from './club-task-form/club-task-form.component';

/**
 * Entrenamientos (Club) — Fase 1: "Tareas del club".
 *
 * <p>Biblioteca de tareas de entrenamiento propias del club, visibles para
 * todos sus entrenadores. CRUD completo (crear / editar / borrar). El acceso
 * lo controla el backend (dueño del club o staff con permiso ENTRENAMIENTOS).
 * El formulario de crear/editar vive en {@link ClubTaskFormComponent}, que se
 * reutiliza también desde el selector de tareas de una metodología.
 */
@Component({
  selector: 'app-entrenamientos-club',
  templateUrl: './entrenamientos-club.component.html',
  styleUrls: ['./entrenamientos-club.component.scss'],
})
export class EntrenamientosClubComponent implements OnInit {

  clubId = 0;
  loading = false;
  error = '';
  tasks: ClubTask[] = [];

  showForm = false;
  /** Tarea que se está editando; {@code null} al crear una nueva. */
  editingTask: ClubTask | null = null;

  constructor(
    private route: ActivatedRoute,
    private clubTaskService: ClubTaskService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.clubId = Number(this.route.snapshot.paramMap.get('clubId')) || 0;
    this.loadTasks();
  }

  loadTasks(): void {
    if (!this.clubId) {
      return;
    }
    this.loading = true;
    this.error = '';
    this.clubTaskService.list(this.clubId).subscribe({
      next: (res: Response) => {
        this.tasks = res?.status === 200 && Array.isArray(res.data) ? (res.data as ClubTask[]) : [];
        this.loading = false;
      },
      error: () => {
        this.error = 'ENTRENAMIENTOS.ERROR_LOAD';
        this.loading = false;
      },
    });
  }

  openCreate(): void {
    this.editingTask = null;
    this.error = '';
    this.showForm = true;
  }

  openEdit(task: ClubTask): void {
    this.editingTask = task;
    this.error = '';
    this.showForm = true;
  }

  onFormSaved(): void {
    this.showForm = false;
    this.editingTask = null;
    this.loadTasks();
  }

  onFormClosed(): void {
    this.showForm = false;
    this.editingTask = null;
  }

  removeTask(task: ClubTask): void {
    if (!task.clubTaskId) {
      return;
    }
    const msg = this.translate.instant('ENTRENAMIENTOS.CONFIRM_DELETE');
    if (!window.confirm(msg)) {
      return;
    }
    this.clubTaskService.remove(this.clubId, task.clubTaskId).subscribe({
      next: (res: Response) => {
        if (res?.status === 200) {
          this.loadTasks();
        } else {
          this.error = 'ENTRENAMIENTOS.ERROR_DELETE';
        }
      },
      error: () => {
        this.error = 'ENTRENAMIENTOS.ERROR_DELETE';
      },
    });
  }

  /** URL absoluta de la imagen/gif de una tarea (o null si no tiene). */
  taskImageUrl(task: ClubTask): string | null {
    return task.imagenBoard ? this.clubTaskService.imageBaseUrl + task.imagenBoard : null;
  }

  isGif(name?: string | null): boolean {
    return !!name && /\.gif(\?|$)/i.test(name);
  }

  trackByTask(_index: number, task: ClubTask): number {
    return task.clubTaskId ?? _index;
  }
}
