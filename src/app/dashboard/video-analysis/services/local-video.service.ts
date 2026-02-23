import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export type FingerprintResult = 'match' | 'size_mismatch' | 'duration_warning';

export interface LocalVideoMeta {
  fileName: string;
  fileSize: number;
  durationMs: number;
}

@Injectable({ providedIn: 'root' })
export class LocalVideoService {

  private currentFile: File | null = null;
  private currentBlobUrl: string | null = null;
  private currentMeta: LocalVideoMeta | null = null;

  get file(): File | null { return this.currentFile; }
  get blobUrl(): string | null { return this.currentBlobUrl; }
  get meta(): LocalVideoMeta | null { return this.currentMeta; }

  setFile(file: File, meta: LocalVideoMeta): void {
    this.revoke();
    this.currentFile = file;
    this.currentMeta = meta;
    this.currentBlobUrl = URL.createObjectURL(file);
  }

  revoke(): void {
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }
    this.currentFile = null;
    this.currentMeta = null;
  }

  hasFile(): boolean {
    return this.currentFile !== null && this.currentBlobUrl !== null;
  }

  verifyFingerprint(expectedSize: number | undefined, expectedDurationMs: number | undefined): FingerprintResult {
    if (!this.currentMeta) return 'size_mismatch';

    if (expectedSize != null && this.currentMeta.fileSize !== expectedSize) {
      return 'size_mismatch';
    }

    if (expectedDurationMs != null) {
      const diff = Math.abs(this.currentMeta.durationMs - expectedDurationMs);
      if (diff > 2000) {
        return 'duration_warning';
      }
    }

    return 'match';
  }

  static extractMeta(file: File): Promise<LocalVideoMeta> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      const blobUrl = URL.createObjectURL(file);
      video.src = blobUrl;

      video.onloadedmetadata = () => {
        const durationMs = Math.round(video.duration * 1000);
        URL.revokeObjectURL(blobUrl);
        resolve({
          fileName: file.name,
          fileSize: file.size,
          durationMs
        });
      };

      video.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        reject(new Error('No se pudo leer la información del archivo de vídeo.'));
      };
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  formatDuration(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  /**
   * Descarga un vídeo desde una URL remota mostrando progreso.
   * Emite valores 0–99 con el porcentaje descargado y finaliza emitiendo 100 cuando
   * el archivo ya está en memoria y listo en el LocalVideoService.
   * @param authToken  JWT token para cabecera Authorization (necesario si la URL es del proxy de la API)
   */
  loadFromUrl(url: string, fileName: string, contentType = 'video/mp4', authToken?: string): Observable<number> {
    return new Observable<number>(observer => {
      (async () => {
        try {
          this.revoke();
          const headers: Record<string, string> = {};
          if (authToken) headers['Authorization'] = 'Bearer ' + authToken;
          const response = await fetch(url, { headers });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          const contentLength = Number(response.headers.get('Content-Length') || '0');
          const reader = response.body!.getReader();
          const chunks: Uint8Array[] = [];
          let received = 0;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            received += value.length;
            if (contentLength > 0) {
              observer.next(Math.min(99, Math.round((received / contentLength) * 99)));
            }
          }

          const blob = new Blob(chunks, { type: contentType });
          const file = new File([blob], fileName, { type: contentType });
          const meta = await LocalVideoService.extractMeta(file);
          this.setFile(file, meta);
          observer.next(100);
          observer.complete();
        } catch (err: any) {
          observer.error(err);
        }
      })();
    });
  }
}
