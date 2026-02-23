import { Injectable } from '@angular/core';

/**
 * Servicio de captura de pantalla reutilizable con recorte por canvas.
 *
 * Pide permiso UNA sola vez por sesión y mantiene el MediaStream activo.
 *
 * Estrategia de recorte:
 *   - Region Capture API (cropTo) tiene un bug conocido en Chrome: cuando el elemento
 *     contiene un <video> acelerado por hardware (p. ej. el iframe de YouTube), el
 *     stream resultante muestra el fotograma congelado aunque el audio sí se mueve.
 *   - Solución: capturamos el tab completo y, en un bucle requestAnimationFrame,
 *     dibujamos solo el área del elemento indicado en un <canvas>. El MediaRecorder
 *     graba el stream del canvas, obteniendo vídeo fluido sin restricciones cross-origin.
 */
@Injectable({ providedIn: 'root' })
export class ScreenCaptureService {

  private rawStream: MediaStream | null = null;
  private canvasStream: MediaStream | null = null;
  private sourceVideo: HTMLVideoElement | null = null;
  private cropCanvas: HTMLCanvasElement | null = null;
  private cropCtx: CanvasRenderingContext2D | null = null;
  private rafId: number | null = null;
  private currentCropElement: Element | null = null;

  /** true si el stream de captura está activo */
  get isActive(): boolean {
    return !!(this.rawStream?.active && this.rawStream.getVideoTracks()[0]?.readyState === 'live');
  }

  /**
   * Obtiene un MediaStream listo para grabar.
   * - Si ya hay uno activo y el elemento no ha cambiado, lo reutiliza.
   * - Si se pasa `cropElement`, devuelve un stream del canvas recortado.
   * - Si no se pasa `cropElement`, devuelve el stream raw completo.
   */
  async acquireStream(cropElement?: Element | null): Promise<MediaStream> {
    if (this.isActive) {
      if (cropElement && cropElement !== this.currentCropElement) {
        // Actualizar coordenadas de recorte en el bucle existente
        this.currentCropElement = cropElement;
        this.updateCropCoords();
      }
      return this.canvasStream ?? this.rawStream!;
    }

    // Solicitar nueva captura de pantalla.
    // preferCurrentTab:true → Chrome muestra diálogo simplificado para la pestaña actual.
    const stream = await (navigator.mediaDevices as any).getDisplayMedia({
      video: { frameRate: 30, displaySurface: 'browser' },
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      preferCurrentTab: true
    });

    this.rawStream = stream;
    stream.getVideoTracks()[0]?.addEventListener('ended', () => this.release());

    if (cropElement) {
      this.currentCropElement = cropElement;
      this.canvasStream = await this.buildCanvasCropStream(stream, cropElement);
      return this.canvasStream;
    }

    return stream;
  }

  /**
   * Captura un fotograma del área recortada.
   * Si el canvas ya está activo, devuelve su contenido inmediatamente (sin dialogo).
   */
  async grabFrame(cropElement?: Element | null): Promise<string | null> {
    try {
      // Si el canvas ya está dibujando, tomar snapshot directo (sin diálogo)
      if (this.isActive && this.cropCanvas) {
        return this.cropCanvas.toDataURL('image/jpeg', 0.92);
      }

      // Adquirir stream (puede mostrar diálogo si no hay uno activo)
      await this.acquireStream(cropElement);

      if (this.cropCanvas) {
        // Esperar un frame para que el canvas tenga contenido
        await new Promise(r => setTimeout(r, 100));
        return this.cropCanvas.toDataURL('image/jpeg', 0.92);
      }

      // Fallback: capturar frame del stream raw
      if (this.rawStream) {
        const [track] = this.rawStream.getVideoTracks();
        if (track && 'ImageCapture' in window) {
          const ic = new (window as any).ImageCapture(track);
          const bitmap: ImageBitmap = await ic.grabFrame();
          const canvas = document.createElement('canvas');
          canvas.width  = bitmap.width;
          canvas.height = bitmap.height;
          canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
          bitmap.close();
          return canvas.toDataURL('image/jpeg', 0.92);
        }
        return await this.grabFrameViaVideo(this.rawStream);
      }

      return null;
    } catch {
      return null;
    }
  }

  /** Libera todos los recursos */
  release(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.rawStream) {
      this.rawStream.getTracks().forEach(t => t.stop());
      this.rawStream = null;
    }
    if (this.sourceVideo) {
      this.sourceVideo.srcObject = null;
      this.sourceVideo = null;
    }
    this.canvasStream   = null;
    this.cropCanvas     = null;
    this.cropCtx        = null;
    this.currentCropElement = null;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Crea un MediaStream de un canvas que dibuja, en cada frame, solo
   * el área del elemento indicado del stream de captura completo.
   * Esto evita el bug de fotograma congelado de la Region Capture API.
   */
  private buildCanvasCropStream(stream: MediaStream, element: Element): Promise<MediaStream> {
    return new Promise<MediaStream>((resolve, reject) => {
      const video = document.createElement('video');
      video.muted     = true;
      video.srcObject = stream;
      this.sourceVideo = video;

      video.onloadedmetadata = () => {
        const rect = element.getBoundingClientRect();

        const canvas = document.createElement('canvas');
        canvas.width  = Math.max(1, Math.round(rect.width));
        canvas.height = Math.max(1, Math.round(rect.height));
        const ctx = canvas.getContext('2d')!;
        this.cropCanvas = canvas;
        this.cropCtx    = ctx;

        // Calcular coordenadas de recorte en el espacio del stream
        this.updateCropCoords();

        const draw = () => {
          if (video.readyState >= 2 && this.cropCtx && this.cropCanvas) {
            const { sx, sy, sw, sh } = this.getCropCoords();
            this.cropCtx.drawImage(video, sx, sy, sw, sh, 0, 0, this.cropCanvas.width, this.cropCanvas.height);
          }
          this.rafId = requestAnimationFrame(draw);
        };

        video.play().then(() => {
          draw();

          const canvasStream = canvas.captureStream(30);
          // Añadir pista de audio del stream original
          stream.getAudioTracks().forEach(t => canvasStream.addTrack(t));

          this.canvasStream = canvasStream;
          resolve(canvasStream);
        }).catch(reject);
      };

      video.onerror = reject;
    });
  }

  // Coordenadas de recorte calculadas del elemento en el espacio del stream
  private cropSx = 0; private cropSy = 0; private cropSw = 1; private cropSh = 1;

  private updateCropCoords(): void {
    if (!this.sourceVideo || !this.currentCropElement) return;
    const video = this.sourceVideo;
    // El stream captura el viewport; getBoundingClientRect() da coords relativas al viewport
    const rect   = this.currentCropElement.getBoundingClientRect();
    const scaleX = video.videoWidth  / window.innerWidth;
    const scaleY = video.videoHeight / window.innerHeight;
    this.cropSx = Math.round(rect.left * scaleX);
    this.cropSy = Math.round(rect.top  * scaleY);
    this.cropSw = Math.max(1, Math.round(rect.width  * scaleX));
    this.cropSh = Math.max(1, Math.round(rect.height * scaleY));

    // Actualizar tamaño del canvas al del elemento
    if (this.cropCanvas) {
      this.cropCanvas.width  = Math.max(1, Math.round(rect.width));
      this.cropCanvas.height = Math.max(1, Math.round(rect.height));
    }
  }

  private getCropCoords() {
    return { sx: this.cropSx, sy: this.cropSy, sw: this.cropSw, sh: this.cropSh };
  }

  private grabFrameViaVideo(stream: MediaStream): Promise<string> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.muted     = true;
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        video.play().then(() => {
          const canvas = document.createElement('canvas');
          canvas.width  = video.videoWidth  || 1280;
          canvas.height = video.videoHeight || 720;
          canvas.getContext('2d')!.drawImage(video, 0, 0);
          video.pause();
          video.srcObject = null;
          resolve(canvas.toDataURL('image/jpeg', 0.92));
        }).catch(reject);
      };
      video.onerror = reject;
    });
  }
}
