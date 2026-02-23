import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ExternalVideoService, ExternalClip, ExternalProject } from '../../../core/services/external-video/external-video.service';
import { LoginService } from '../../../core/services/login/login.service';

declare var YT: any;

// ── Estado de compilación de clips ──────────────────────────────────────────
type CompileState = 'idle' | 'requesting' | 'compiling' | 'done' | 'error';

@Component({
  selector: 'app-external-video-workspace',
  templateUrl: './external-video-workspace.component.html',
  styleUrls: ['./external-video-workspace.component.scss']
})
export class ExternalVideoWorkspaceComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  // ── Proyecto ────────────────────────────────────────────────────────────────
  project: ExternalProject | null = null;
  projectId = 0;
  clubId    = 0;
  userId    = 0;
  saving    = false;

  // Params desde la library (cuando se crea proyecto nuevo)
  paramVideoUrl    = '';
  paramTitle       = '';
  paramSourceType  = 'youtube';

  // ── YouTube Player ──────────────────────────────────────────────────────────
  private ytPlayer: any = null;
  playerReady   = false;
  playerError   = '';
  currentTimeSec = 0;
  duration       = 0;
  isPlaying      = false;
  private timeInterval: any = null;

  // ── Clip en edición ─────────────────────────────────────────────────────────
  pendingStart: number | null = null;   // tiempo marcado con "Inicio"
  newClipTitle = '';
  clips: ExternalClip[] = [];

  // Edición inline de un clip
  editingClip: ExternalClip | null = null;
  editTitle    = '';
  editNotes    = '';

  // ── Compilación por clip ─────────────────────────────────────────────────────
  compileState: CompileState = 'idle';
  compileIndex   = 0;          // clip en curso
  compileTotal   = 0;
  compileError   = '';
  compiledBlobs: { clip: ExternalClip; blob: Blob }[] = [];
  private captureStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private chunkBuffer: Blob[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private zone: NgZone,
    private extVideoService: ExternalVideoService,
    private loginService: LoginService
  ) {}

  ngOnInit(): void {
    // Leer clubId de múltiples fuentes por orden de prioridad
    this.clubId = Number(sessionStorage.getItem('clubId'))
               || Number(localStorage.getItem('clubId'))
               || 0;

    this.loginService.usuarioActual.pipe(takeUntil(this.destroy$)).subscribe(u => {
      if (u) this.userId = u.userId;
    });

    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      // Query param tiene prioridad máxima (viene pasado desde la biblioteca)
      if (params['clubId']) this.clubId = +params['clubId'];

      this.projectId       = params['projectId'] ? +params['projectId'] : 0;
      this.paramVideoUrl   = params['videoUrl']  || '';
      this.paramTitle      = params['title']     || '';
      this.paramSourceType = params['sourceType'] || 'youtube';

      if (!this.clubId) {
        this.playerError = 'No se pudo identificar el club. Vuelve a la biblioteca e inténtalo de nuevo.';
        return;
      }

      if (this.projectId) {
        this.loadProject();
      } else if (this.paramVideoUrl) {
        this.createAndOpen();
      }
    });
  }

  ngOnDestroy(): void {
    this.stopTimeInterval();
    this.releaseStream();
    if (this.ytPlayer) { try { this.ytPlayer.destroy(); } catch {} }
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Carga / Creación de proyecto ─────────────────────────────────────────────

  private loadProject(): void {
    this.extVideoService.getProject(this.projectId, this.clubId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.project = res?.data;
          this.clips   = res?.data?.clips || [];
          this.initYouTubePlayer();
        },
        error: () => this.playerError = 'No se pudo cargar el proyecto.'
      });
  }

  private createAndOpen(): void {
    this.extVideoService.createProject({
      clubId: this.clubId,
      createdBy: this.userId,
      title: this.paramTitle || this.paramVideoUrl,
      sourceType: this.paramSourceType,
      videoUrl: this.paramVideoUrl,
      videoTitle: this.paramTitle
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: res => {
        this.project   = res?.data;
        this.projectId = res?.data?.id;
        this.clips     = [];
        // Actualizar URL sin recargar
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { projectId: this.projectId },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
        this.initYouTubePlayer();
      },
      error: () => this.playerError = 'No se pudo crear el proyecto.'
    });
  }

  // ── YouTube IFrame API ────────────────────────────────────────────────────────

  /** true = YouTube embebido; false = VEO/externo (no embebible) */
  isEmbeddable = true;

  private initYouTubePlayer(): void {
    if (!this.project?.videoUrl) return;

    // VEO y otros sources que bloquean iframes → modo sin player
    if (this.project.sourceType === 'veo' || this.project.sourceType === 'external') {
      this.isEmbeddable = false;
      this.playerReady  = true; // Habilitar controles de clips sin necesidad del player
      return;
    }

    const videoId = this.extractYouTubeId(this.project.videoUrl);
    if (!videoId) {
      this.playerError = 'No se pudo extraer el ID del vídeo de YouTube.';
      return;
    }

    const loadApi = () => {
      if (typeof YT !== 'undefined' && YT.Player) {
        this.createPlayer(videoId);
      } else {
        // Carga el script de YouTube IFrame API una sola vez
        if (!document.getElementById('yt-api-script')) {
          const tag = document.createElement('script');
          tag.id  = 'yt-api-script';
          tag.src = 'https://www.youtube.com/iframe_api';
          document.head.appendChild(tag);
        }
        // El callback global que YouTube llama cuando está listo
        (window as any)['onYouTubeIframeAPIReady'] = () => {
          this.zone.run(() => this.createPlayer(videoId));
        };
      }
    };
    loadApi();
  }

  private createPlayer(videoId: string): void {
    this.ytPlayer = new YT.Player('yt-player-container', {
      videoId,
      playerVars: { rel: 0, modestbranding: 1, controls: 1 },
      events: {
        onReady: () => this.zone.run(() => {
          this.playerReady = true;
          this.duration = this.ytPlayer.getDuration();
          this.startTimeInterval();
        }),
        onStateChange: (event: any) => this.zone.run(() => {
          this.isPlaying = event.data === YT.PlayerState.PLAYING;
        }),
        onError: () => this.zone.run(() => {
          this.playerError = 'Error al cargar el vídeo. Comprueba que la URL es correcta y que el vídeo no está restringido.';
        })
      }
    });
  }

  private extractYouTubeId(url: string): string {
    const m = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : '';
  }

  // ── Controles del player ──────────────────────────────────────────────────────

  /** Modo manual: permite ajustar el tiempo actual cuando no hay player YouTube */
  setManualTime(sec: number): void {
    this.currentTimeSec = Math.max(0, sec);
  }

  openExternalVideo(): void {
    if (this.project?.videoUrl) {
      window.open(this.project.videoUrl, '_blank', 'noopener,noreferrer');
    }
  }

  togglePlay(): void {
    if (!this.ytPlayer || !this.playerReady) return;
    if (this.isPlaying) {
      this.ytPlayer.pauseVideo();
    } else {
      this.ytPlayer.playVideo();
    }
  }

  seekTo(sec: number): void {
    if (!this.ytPlayer || !this.playerReady) return;
    this.ytPlayer.seekTo(sec, true);
  }

  seekRelative(delta: number): void {
    this.seekTo(Math.max(0, this.currentTimeSec + delta));
  }

  private startTimeInterval(): void {
    this.stopTimeInterval();
    this.timeInterval = setInterval(() => {
      if (this.ytPlayer && this.playerReady) {
        this.zone.run(() => {
          this.currentTimeSec = this.ytPlayer.getCurrentTime() || 0;
        });
      }
    }, 250);
  }

  private stopTimeInterval(): void {
    if (this.timeInterval) { clearInterval(this.timeInterval); this.timeInterval = null; }
  }

  // ── Marcado de clips ──────────────────────────────────────────────────────────

  markStart(): void {
    this.pendingStart = this.currentTimeSec;
    this.newClipTitle = '';
  }

  cancelMark(): void {
    this.pendingStart = null;
    this.newClipTitle = '';
  }

  markEndAndSave(): void {
    if (this.pendingStart === null) return;
    const start = this.pendingStart;
    const end   = this.currentTimeSec;
    if (end <= start) { return; }

    const clip: Partial<ExternalClip> = {
      title: this.newClipTitle.trim() || `Clip ${this.clips.length + 1}`,
      startSec: Math.round(start * 1000) / 1000,
      endSec:   Math.round(end   * 1000) / 1000,
      displayOrder: this.clips.length
    };

    this.extVideoService.addClip(this.projectId, this.clubId, clip)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          if (res?.data) this.clips.push(res.data);
          this.pendingStart = null;
          this.newClipTitle = '';
        }
      });
  }

  deleteClip(clip: ExternalClip): void {
    if (!clip.id) return;
    this.extVideoService.deleteClip(this.projectId, clip.id, this.clubId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: () => { this.clips = this.clips.filter(c => c.id !== clip.id); } });
  }

  previewClip(clip: ExternalClip): void {
    this.seekTo(clip.startSec);
    if (this.ytPlayer) this.ytPlayer.playVideo();
    // Pausa automática al llegar al final del clip
    const dur = clip.endSec - clip.startSec;
    setTimeout(() => {
      if (this.ytPlayer) this.ytPlayer.pauseVideo();
    }, dur * 1000);
  }

  startEditClip(clip: ExternalClip): void {
    this.editingClip = clip;
    this.editTitle   = clip.title || '';
    this.editNotes   = clip.notes || '';
  }

  saveEditClip(): void {
    if (!this.editingClip?.id) return;
    const changes = { title: this.editTitle.trim(), notes: this.editNotes.trim() };
    this.extVideoService.updateClip(this.projectId, this.editingClip.id, this.clubId, changes)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          if (res?.data) {
            const idx = this.clips.findIndex(c => c.id === this.editingClip!.id);
            if (idx >= 0) this.clips[idx] = { ...this.clips[idx], ...res.data };
          }
          this.editingClip = null;
        }
      });
  }

  // ── Compilación por clip ──────────────────────────────────────────────────────

  async startCompile(): Promise<void> {
    if (!this.clips.length) return;
    this.compileState  = 'requesting';
    this.compileError  = '';
    this.compiledBlobs = [];

    // Solicitar captura de pantalla UNA SOLA VEZ
    try {
      this.captureStream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: { frameRate: 30 },
        audio: true
      });
    } catch (err: any) {
      this.compileState = 'error';
      this.compileError = err?.name === 'NotAllowedError'
        ? 'Permiso de captura denegado. Acepta la solicitud del navegador.'
        : 'No se pudo iniciar la captura de pantalla.';
      return;
    }

    // Si el usuario cierra la captura manualmente antes de terminar
    this.captureStream!.getVideoTracks()[0].onended = () => {
      this.zone.run(() => {
        if (this.compileState === 'compiling') {
          this.compileState = 'error';
          this.compileError = 'La captura de pantalla se cerró antes de terminar. Los clips guardados están disponibles.';
        }
      });
    };

    this.compileState = 'compiling';
    this.compileTotal = this.clips.length;
    this.compileIndex = 0;

    for (let i = 0; i < this.clips.length; i++) {
      if (this.compileState !== 'compiling') break;
      this.compileIndex = i + 1;
      try {
        const blob = await this.captureOneClip(this.clips[i]);
        this.compiledBlobs.push({ clip: this.clips[i], blob });
      } catch {
        // Si falla un clip, continúa con el siguiente
      }
    }

    this.releaseStream();
    this.compileState = 'done';
  }

  private captureOneClip(clip: ExternalClip): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const duration = clip.endSec - clip.startSec;
      const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
        .find(m => MediaRecorder.isTypeSupported(m)) || '';

      // Seek al inicio del clip y reproducir
      this.ytPlayer.seekTo(clip.startSec, true);
      this.ytPlayer.playVideo();

      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(this.captureStream!, mimeType ? { mimeType } : {});
      recorder.ondataavailable = e => { if (e.data?.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        this.ytPlayer.pauseVideo();
        resolve(new Blob(chunks, { type: recorder.mimeType || 'video/webm' }));
      };
      recorder.onerror = () => reject(new Error('MediaRecorder error'));

      // Pequeño delay para que el vídeo se estabilice antes de grabar
      setTimeout(() => {
        recorder.start(500);
        setTimeout(() => recorder.stop(), (duration * 1000) + 300);
      }, 800);
    });
  }

  downloadClip(item: { clip: ExternalClip; blob: Blob }, index: number): void {
    const url  = URL.createObjectURL(item.blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${item.clip.title || 'clip-' + (index + 1)}.webm`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  downloadAll(): void {
    this.compiledBlobs.forEach((item, i) => this.downloadClip(item, i));
  }

  resetCompile(): void {
    this.compileState  = 'idle';
    this.compiledBlobs = [];
    this.compileError  = '';
    this.releaseStream();
  }

  private releaseStream(): void {
    this.captureStream?.getTracks().forEach(t => t.stop());
    this.captureStream = null;
  }

  /** Para vídeos VEO (no embebibles): exporta la lista de clips como fichero de texto */
  exportTimestamps(): void {
    const title   = this.project?.title || 'proyecto';
    const videoUrl = this.project?.videoUrl || '';
    const lines: string[] = [
      `Proyecto: ${title}`,
      `Vídeo:    ${videoUrl}`,
      '',
      'CLIPS',
      '─────────────────────────────────',
      ...this.clips.map((c, i) =>
        `${String(i + 1).padStart(2, '0')}. ${c.title || 'Clip ' + (i + 1)}\n    ` +
        `Inicio: ${this.formatTime(c.startSec)}  (${c.startSec.toFixed(1)}s)\n    ` +
        `Fin:    ${this.formatTime(c.endSec)}  (${c.endSec.toFixed(1)}s)\n    ` +
        `Duración: ${this.formatTime(c.endSec - c.startSec)}\n` +
        (c.notes ? `    Notas: ${c.notes}\n` : '')
      ),
      '',
      `Exportado: ${new Date().toLocaleString('es-ES')}`
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `clips_${title.replace(/\s+/g, '_')}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────────

  formatTime(sec: number): string {
    const s = Math.floor(sec);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
    return `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
  }

  progressPercent(): number {
    return this.duration > 0 ? (this.currentTimeSec / this.duration) * 100 : 0;
  }

  seekFromBar(event: MouseEvent, bar: HTMLElement): void {
    const rect = bar.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    this.seekTo(pct * this.duration);
  }

  goBack(): void { this.router.navigate(['/dashboard/video-analysis']); }

  sourceIcon(): string {
    switch (this.project?.sourceType) {
      case 'youtube': return 'bi-youtube';
      case 'vimeo':   return 'bi-vimeo';
      case 'veo':     return 'bi-camera-video-fill';
      default:        return 'bi-link-45deg';
    }
  }
}
