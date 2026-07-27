import {
  Component, EventEmitter, Input, OnDestroy, OnInit, Output
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { TaskStorageService, StoredTask } from 'src/app/core/services/training/task-storage.service';
import { TrainingService } from 'src/app/core/services/training/training.service';

export interface PickedTask {
  taskId: number;
  taskType: 'cloud' | 'own';
  label: string;
}

/**
 * Modal para seleccionar una tarea (favorita o propia del coach) y vincularla
 * al estado actual de la pizarra táctica.
 * Emite un PickedTask al seleccionar, o closed al cancelar.
 */
@Component({
  selector: 'app-task-picker-modal',
  templateUrl: './task-picker-modal.component.html',
  styleUrls: ['./task-picker-modal.component.scss']
})
export class TaskPickerModalComponent implements OnInit, OnDestroy {

  @Input() userId: number = 0;
  @Input() imageBaseUrl: string = '';
  @Output() picked = new EventEmitter<PickedTask>();
  @Output() closed = new EventEmitter<void>();

  activeTab: 'favorites' | 'own' = 'favorites';
  searchText: string = '';

  favorites: StoredTask[] = [];
  ownTasks: any[] = [];
  isLoadingFavorites = true;
  isLoadingOwn = true;

  private favSub?: Subscription;

  constructor(
    private taskStorage: TaskStorageService,
    private trainingService: TrainingService
  ) {}

  ngOnInit(): void {
    this.loadFavorites();
    this.loadOwnTasks();
  }

  ngOnDestroy(): void {
    this.favSub?.unsubscribe();
  }

  private loadFavorites(): void {
    this.favSub = this.taskStorage.favorites$.subscribe(favs => {
      this.favorites = favs;
      this.isLoadingFavorites = false;
    });
    this.taskStorage.loadFromBackend(this.userId);
  }

  private loadOwnTasks(): void {
    this.trainingService.getCoachOwnTasks(this.userId).subscribe({
      next: (res: any) => {
        this.ownTasks = Array.isArray(res?.data) ? res.data : [];
        this.isLoadingOwn = false;
      },
      error: () => { this.isLoadingOwn = false; }
    });
  }

  get filteredFavorites(): StoredTask[] {
    if (!this.searchText.trim()) return this.favorites;
    const q = this.searchText.toLowerCase();
    return this.favorites.filter(t =>
      (t.slogans || '').toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q)
    );
  }

  get filteredOwn(): any[] {
    if (!this.searchText.trim()) return this.ownTasks;
    const q = this.searchText.toLowerCase();
    return this.ownTasks.filter(t => {
      const name = (t.slogans || t.description || '').toLowerCase();
      return name.includes(q);
    });
  }

  selectFavorite(task: StoredTask): void {
    // tasksShopId es la referencia a la tarea del catálogo (tasks_shop)
    // coachTaskId es la referencia a la tarea propia del coach
    // taskId es el ID de la tarea dentro de un entrenamiento (no sirve para board state)
    const cloudId = task.tasksShopId;
    const ownId = task.coachTaskId;
    const id = cloudId ?? ownId;
    if (!id) return;
    const taskType: 'cloud' | 'own' = cloudId ? 'cloud' : 'own';
    this.picked.emit({
      taskId: id,
      taskType,
      label: task.slogans || task.description || `Tarea ${id}`
    });
  }

  selectOwn(task: any): void {
    const id = task.coach_task_id ?? task.coachTaskId;
    if (!id) return;
    this.picked.emit({
      taskId: id,
      taskType: 'own',
      label: task.slogans || task.description || `Tarea propia ${id}`
    });
  }

  getImageUrl(imagenBoard: string): string {
    if (!imagenBoard) return '';
    if (imagenBoard.startsWith('http')) return imagenBoard;
    return this.imageBaseUrl + imagenBoard;
  }

  close(): void {
    this.closed.emit();
  }
}
