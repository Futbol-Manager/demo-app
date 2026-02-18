import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { Task } from 'src/app/core/services/models/training.models';
import { TrainingService } from 'src/app/core/services/training/training.service';
import { TaskStorageService } from 'src/app/core/services/training/task-storage.service';
import { environment } from 'src/environments/environment';

export interface CustomField {
  name: string;
  value: string;
}

@Component({
  selector: 'app-task-edit-modal',
  templateUrl: './task-edit-modal.component.html',
  styleUrls: ['./task-edit-modal.component.scss']
})
export class TaskEditModalComponent implements OnChanges {

  @Input() task: Task | null = null;
  @Input() trainingId: number = 0;
  @Input() userId: number = 0;
  @Output() saved = new EventEmitter<Task>();
  @Output() closed = new EventEmitter<void>();

  editTask: Task = new Task();
  customFields: CustomField[] = [];

  saveToLibrary: boolean = false;
  saving: boolean = false;
  savingLibrary: boolean = false;
  errorMsg: string = '';

  selectedFile: File | null = null;
  previewUrl: string | null = null;
  imageBaseUrl: string = environment.images + 'task-board/';

  estrategiaOptions: string[] = ['-', 'Posesión', 'Transición', 'Organización defensiva', 'Organización ofensiva', 'Balón parado'];
  intencionOptions: string[] = ['-', 'Táctica', 'Técnica', 'Física', 'Psicológica'];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['task'] && this.task) {
      this.editTask = { ...this.task };
      this.customFields = this.parseExtraFields(this.task.extraFields);
      this.selectedFile = null;
      this.previewUrl = null;
      this.errorMsg = '';
      this.saveToLibrary = false;
    }
  }

  private parseExtraFields(raw: string | undefined): CustomField[] {
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  addCustomField(): void {
    this.customFields.push({ name: '', value: '' });
  }

  removeCustomField(index: number): void {
    this.customFields.splice(index, 1);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      const reader = new FileReader();
      reader.onload = () => { this.previewUrl = reader.result as string; };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  get currentImageUrl(): string {
    if (this.previewUrl) return this.previewUrl;
    if (this.editTask.imagenBoard) return this.imageBaseUrl + this.editTask.imagenBoard;
    return '';
  }

  save(): void {
    if (!this.editTask.taskId) return;
    this.saving = true;
    this.errorMsg = '';

    const validFields = this.customFields.filter(f => f.name.trim());
    this.editTask.extraFields = validFields.length ? JSON.stringify(validFields) : '';

    if (this.selectedFile) {
      this.trainingService.createUpdateImgTask(
        this.tasksShopId,
        this.editTask.taskId,
        this.selectedFile,
        this.userId
      ).subscribe({
        next: (imgResp) => {
          if (imgResp?.data) {
            this.editTask.imagenBoard = imgResp.data as string;
          }
          this.doSaveTask();
        },
        error: () => {
          this.saving = false;
          this.errorMsg = 'Error al subir la imagen.';
        }
      });
    } else {
      this.doSaveTask();
    }
  }

  private doSaveTask(): void {
    this.trainingService.createUpdateTask(
      this.trainingId.toString(),
      this.editTask,
      0,
      this.userId
    ).subscribe({
      next: (resp) => {
        if (resp?.data) {
          const updated = resp.data as Task;
          updated.collapsed = this.editTask.collapsed;
          if (this.saveToLibrary) {
            this.doSaveToLibrary(updated);
          } else {
            this.saving = false;
            this.saved.emit(updated);
          }
        } else {
          this.saving = false;
          this.errorMsg = 'Error al guardar la tarea.';
        }
      },
      error: () => {
        this.saving = false;
        this.errorMsg = 'Error al guardar la tarea.';
      }
    });
  }

  private doSaveToLibrary(updated: Task): void {
    // Sincronizamos el userId en el servicio por si aún no estaba fijado
    if (this.userId) {
      this.taskStorage.setUserId(this.userId);
    }
    this.taskStorage.addMyTask({
      origin: 'own',
      slogans: updated.slogans || '',
      description: updated.description || '',
      rules: updated.rules || '',
      variants: updated.variants || '',
      worktime: updated.worktime || '',
      space: updated.space || '',
      material: updated.material || '',
      work: updated.work || '',
      video: updated.video || '',
      estrategia: updated.estrategia || '',
      intencion: updated.intencion || '',
      imagenBoard: updated.imagenBoard || '',
      extraFields: updated.extraFields || '',
    });
    this.saving = false;
    this.savingLibrary = false;
    this.saved.emit(updated);
  }

  close(): void {
    this.closed.emit();
  }

  get tasksShopId(): number {
    return (this.editTask as any).tasksShopId || 0;
  }

  constructor(
    private trainingService: TrainingService,
    private taskStorage: TaskStorageService
  ) {}
}
