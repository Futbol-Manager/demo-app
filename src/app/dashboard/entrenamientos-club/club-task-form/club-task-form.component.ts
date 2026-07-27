import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, concat } from 'rxjs';

import { Response } from 'src/app/core/services/models/response.model';
import { ClubTask, ClubTaskService } from 'src/app/core/services/training/club-task.service';

/**
 * Formulario modal (crear / editar) de una tarea del club, reutilizable.
 *
 * <p>Encapsula la subida de vídeo + imagen/GIF (vídeo primero) y el guardado.
 * Lo usan tanto "Tareas del club" como el selector de tareas de una metodología.
 * El padre controla su visibilidad con {@code *ngIf}: crea el componente para
 * abrir el modal y lo destruye al recibir {@code closed}.
 */
@Component({
  selector: 'app-club-task-form',
  templateUrl: './club-task-form.component.html',
  styleUrls: ['./club-task-form.component.scss'],
})
export class ClubTaskFormComponent implements OnInit {

  @Input() clubId = 0;
  /** Tarea a editar; {@code null} para crear una nueva. */
  @Input() task: ClubTask | null = null;

  /** Emitido tras guardar (y subir media) correctamente. */
  @Output() saved = new EventEmitter<void>();
  /** Emitido al cerrar/cancelar el modal. */
  @Output() closed = new EventEmitter<void>();

  saving = false;
  error = '';
  editingId: number | null = null;
  form: ClubTask = {};

  // --- Media (imagen/gif + vídeo) ---
  selectedImageFile: File | null = null;
  imagePreviewUrl: string | null = null;
  videoMode: 'link' | 'upload' = 'link';
  selectedVideoFile: File | null = null;
  videoPreviewUrl: string | null = null;

  readonly imageAccept = 'image/png,image/jpeg,image/gif,image/webp';
  readonly videoAccept = 'video/mp4,video/webm,video/quicktime,video/ogg';
  private readonly maxVideoBytes = 50 * 1024 * 1024;
  private readonly maxImageBytes = 15 * 1024 * 1024;

  constructor(private clubTaskService: ClubTaskService) {}

  ngOnInit(): void {
    if (this.task) {
      this.editingId = this.task.clubTaskId ?? null;
      this.form = { ...this.task };
      this.videoMode = this.isUploadedVideoUrl(this.task.video) ? 'upload' : 'link';
    } else {
      this.editingId = null;
      this.form = {};
      this.videoMode = 'link';
    }
  }

  cancel(): void {
    this.resetMedia();
    this.closed.emit();
  }

  save(): void {
    if (!this.form.title || !this.form.title.trim()) {
      this.error = 'ENTRENAMIENTOS.ERROR_TITLE_REQUIRED';
      return;
    }
    if (!this.form.description || !this.form.description.trim()) {
      this.error = 'ENTRENAMIENTOS.ERROR_DESCRIPTION_REQUIRED';
      return;
    }
    if (this.videoMode === 'upload' && this.selectedVideoFile) {
      this.form.video = '';
    }
    this.saving = true;
    this.error = '';
    const obs = this.editingId
      ? this.clubTaskService.update(this.clubId, this.editingId, this.form)
      : this.clubTaskService.create(this.clubId, this.form);
    obs.subscribe({
      next: (res: Response) => {
        if (res?.status === 200) {
          const savedId = this.editingId ?? (res.data as ClubTask | undefined)?.clubTaskId ?? null;
          this.uploadPendingMedia(savedId);
        } else {
          this.saving = false;
          this.error = 'ENTRENAMIENTOS.ERROR_SAVE';
        }
      },
      error: () => {
        this.saving = false;
        this.error = 'ENTRENAMIENTOS.ERROR_SAVE';
      },
    });
  }

  /** Sube secuencialmente el vídeo (primero) y la imagen/gif tras crear/actualizar la tarea. */
  private uploadPendingMedia(taskId: number | null): void {
    const uploads: Observable<Response>[] = [];
    if (taskId && this.videoMode === 'upload' && this.selectedVideoFile) {
      uploads.push(this.clubTaskService.uploadVideo(this.clubId, taskId, this.selectedVideoFile));
    }
    if (taskId && this.selectedImageFile) {
      uploads.push(this.clubTaskService.uploadImage(this.clubId, taskId, this.selectedImageFile));
    }
    if (uploads.length === 0) {
      this.finishSave();
      return;
    }
    concat(...uploads).subscribe({
      error: () => {
        this.saving = false;
        this.error = 'ENTRENAMIENTOS.ERROR_MEDIA_UPLOAD';
      },
      complete: () => this.finishSave(),
    });
  }

  private finishSave(): void {
    this.saving = false;
    this.resetMedia();
    this.saved.emit();
  }

  // ----------------------------------------------------------------- media

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length > 0 ? input.files[0] : null;
    if (!file) {
      return;
    }
    if (file.size > this.maxImageBytes) {
      this.error = 'ENTRENAMIENTOS.ERROR_IMAGE_TOO_LARGE';
      input.value = '';
      return;
    }
    this.error = '';
    this.revokeImagePreview();
    this.selectedImageFile = file;
    this.imagePreviewUrl = URL.createObjectURL(file);
  }

  removeImage(): void {
    this.revokeImagePreview();
    this.selectedImageFile = null;
    this.form.imagenBoard = '';
  }

  onVideoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length > 0 ? input.files[0] : null;
    if (!file) {
      return;
    }
    if (file.size > this.maxVideoBytes) {
      this.error = 'ENTRENAMIENTOS.ERROR_VIDEO_TOO_LARGE';
      input.value = '';
      return;
    }
    this.error = '';
    this.revokeVideoPreview();
    this.selectedVideoFile = file;
    this.videoPreviewUrl = URL.createObjectURL(file);
  }

  removeVideoFile(): void {
    this.revokeVideoPreview();
    this.selectedVideoFile = null;
    if (this.isUploadedVideoUrl(this.form.video)) {
      this.form.video = '';
    }
  }

  setVideoMode(mode: 'link' | 'upload'): void {
    this.videoMode = mode;
  }

  /** URL de la imagen actual del formulario (preview local o imagen ya guardada). */
  formImageUrl(): string | null {
    if (this.imagePreviewUrl) {
      return this.imagePreviewUrl;
    }
    return this.form.imagenBoard ? this.clubTaskService.imageBaseUrl + this.form.imagenBoard : null;
  }

  isGif(name?: string | null): boolean {
    return !!name && /\.gif(\?|$)/i.test(name);
  }

  isUploadedVideoUrl(url?: string | null): boolean {
    return !!url && /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(url);
  }

  private revokeImagePreview(): void {
    if (this.imagePreviewUrl) {
      URL.revokeObjectURL(this.imagePreviewUrl);
      this.imagePreviewUrl = null;
    }
  }

  private revokeVideoPreview(): void {
    if (this.videoPreviewUrl) {
      URL.revokeObjectURL(this.videoPreviewUrl);
      this.videoPreviewUrl = null;
    }
  }

  private resetMedia(): void {
    this.revokeImagePreview();
    this.revokeVideoPreview();
    this.selectedImageFile = null;
    this.selectedVideoFile = null;
  }
}
