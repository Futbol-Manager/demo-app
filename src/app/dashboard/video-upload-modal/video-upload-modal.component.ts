import { Component, EventEmitter, Input, Output } from '@angular/core';
import { VideoStorageService } from 'src/app/core/services/video-storage/video-storage.service';

@Component({
  selector: 'app-video-upload-modal',
  templateUrl: './video-upload-modal.component.html',
  styleUrls: ['./video-upload-modal.component.scss']
})
export class VideoUploadModalComponent {

  @Input() clubId = 0;
  @Input() watchlistId?: number;
  @Input() playerName?: string;
  @Output() closed = new EventEmitter<void>();
  @Output() uploaded = new EventEmitter<any>();
  @Output() viewPlans = new EventEmitter<void>();

  selectedFile: File | null = null;
  title = '';
  tags = '';

  uploading = false;
  progress = 0;
  error = '';
  success = false;
  noPlanError = false;

  maxFileSizeMb = 512;

  constructor(private videoService: VideoStorageService) {}

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      const fakeEvent = { target: { files: event.dataTransfer!.files } } as unknown as Event;
      this.onFileSelected(fakeEvent);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      this.error = 'Solo se permiten archivos de vídeo.';
      return;
    }

    const sizeMb = file.size / 1024 / 1024;
    if (sizeMb > this.maxFileSizeMb) {
      this.error = `El archivo es demasiado grande (${sizeMb.toFixed(0)} MB). Máximo: ${this.maxFileSizeMb} MB.`;
      return;
    }

    this.selectedFile = file;
    this.error = '';
    if (!this.title) {
      this.title = file.name.replace(/\.[^.]+$/, '');
    }
  }

  formatSize(bytes: number): string {
    if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + ' GB';
    if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB';
    return bytes + ' B';
  }

  removeFile(): void {
    this.selectedFile = null;
    this.error = '';
    this.noPlanError = false;
  }

  upload(): void {
    if (!this.selectedFile || !this.title.trim()) return;

    this.uploading = true;
    this.progress = 10;
    this.error = '';

    const progressInterval = setInterval(() => {
      if (this.progress < 85) {
        this.progress += Math.random() * 8;
      }
    }, 600);

    const userId = Number(localStorage.getItem('userId')) || 0;
    this.videoService.uploadVideo(this.clubId, userId, this.selectedFile, {
      title: this.title,
      tags: this.tags,
      watchlistId: this.watchlistId,
      playerName: this.playerName
    }).subscribe({
      next: (res) => {
        clearInterval(progressInterval);
        this.progress = 100;
        const data = res?.data;
        const bodyStatus = res?.status ?? res?.error?.code;
        if (data) {
          setTimeout(() => {
            this.uploading = false;
            this.success = true;
            this.uploaded.emit(data);
          }, 400);
        } else if (bodyStatus === 402) {
          this.uploading = false;
          this.noPlanError = true;
          this.progress = 0;
        } else if (bodyStatus === 413) {
          this.uploading = false;
          this.error = res?.error?.msg || 'No hay suficiente espacio en tu plan.';
          this.progress = 0;
        } else {
          this.uploading = false;
          this.error = res?.error?.msg || 'Error al subir el vídeo. Inténtalo de nuevo.';
          this.progress = 0;
        }
      },
      error: (err) => {
        clearInterval(progressInterval);
        this.uploading = false;
        this.progress = 0;
        const statusCode = err?.status;
        if (statusCode === 402) {
          this.noPlanError = true;
          this.error = '';
        } else if (statusCode === 413) {
          this.error = err?.error?.error?.msg || err?.error?.message || 'No hay suficiente espacio en tu plan.';
        } else if (statusCode === 401 || statusCode === 403) {
          this.error = 'Sesión expirada. Por favor, recarga la página e inténtalo de nuevo.';
        } else {
          // err.error es el cuerpo JSON: { status, error: { code, msg }, data }
          const serverMsg = err?.error?.error?.msg || err?.error?.message;
          if (statusCode === 0 || !statusCode) {
            this.error = 'No se pudo conectar con el servidor. Comprueba que la API está en marcha y vuelve a intentarlo.';
          } else {
            this.error = serverMsg || `Error al subir el vídeo (código ${statusCode}).`;
          }
        }
      }
    });
  }
}
