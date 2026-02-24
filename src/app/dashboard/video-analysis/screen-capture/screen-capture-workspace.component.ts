import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { LocalVideoService } from '../services/local-video.service';
import { VideoAnalysisService } from '../../../core/services/video-analysis/video-analysis.service';
import { LoginService } from '../../../core/services/login/login.service';
import { AnalysisTemplate } from '../models/analysis.models';

type RecState = 'idle' | 'recording' | 'processing' | 'ready';

@Component({
  selector: 'app-screen-capture-workspace',
  templateUrl: './screen-capture-workspace.component.html',
  styleUrls: ['./screen-capture-workspace.component.scss']
})
export class ScreenCaptureWorkspaceComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  // Parámetros de entrada (vienen del router)
  videoTitle  = 'Vídeo externo';
  sourceType  = 'external';
  externalUrl = '';
  iframeSrc!: SafeResourceUrl;

  // Estado de grabación
  recState: RecState = 'idle';
  recSeconds   = 0;
  recTimerRef: any = null;
  recError     = '';

  // MediaRecorder internals
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  // Crear proyecto
  templates: AnalysisTemplate[] = [];
  selectedTemplateId = 0;
  projectTitle       = '';
  isCreating         = false;
  createError        = '';
  clubId = 0;
  userId = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sanitizer: DomSanitizer,
    private localVideoService: LocalVideoService,
    private analysisService: VideoAnalysisService,
    private loginService: LoginService
  ) {}

  ngOnInit(): void {
    this.clubId = Number(sessionStorage.getItem('clubId')) || Number(localStorage.getItem('clubId')) || 0;
    this.loginService.usuarioActual.pipe(takeUntil(this.destroy$)).subscribe(u => {
      if (u) this.userId = u.userId;
    });

    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.videoTitle  = params['title']      || 'Vídeo externo';
      this.sourceType  = params['sourceType'] || 'external';
      this.externalUrl = params['externalUrl'] || '';
      this.projectTitle = `Análisis – ${this.videoTitle}`;
      if (this.externalUrl) {
        this.iframeSrc = this.sanitizer.bypassSecurityTrustResourceUrl(this.externalUrl);
      }
    });

    this.analysisService.listTemplates(this.clubId).pipe(takeUntil(this.destroy$)).subscribe({
      next: res => {
        this.templates = res.data || [];
        if (this.templates.length > 0) this.selectedTemplateId = this.templates[0].id;
      },
      error: () => {}
    });
  }

  ngOnDestroy(): void {
    this.stopStreams();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Grabación de pantalla ────────────────────────────────

  get recLabel(): string {
    const m = Math.floor(this.recSeconds / 60);
    const s = this.recSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  sourceLabel(): string {
    switch (this.sourceType) {
      case 'youtube': return 'YouTube';
      case 'vimeo':   return 'Vimeo';
      case 'veo':     return 'VEO';
      default:        return 'Vídeo externo';
    }
  }

  async startRecording(): Promise<void> {
    this.recError = '';
    try {
      this.mediaStream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: { frameRate: 30 },
        audio: true
      });

      // Detectar el mejor formato soportado
      const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
        .find(m => MediaRecorder.isTypeSupported(m)) || '';

      this.recordedChunks = [];
      this.mediaRecorder = new MediaRecorder(this.mediaStream!, mimeType ? { mimeType } : {});

      this.mediaRecorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) this.recordedChunks.push(e.data);
      };

      this.mediaRecorder.onstop = () => this.onRecordingStopped();

      // Si el usuario cierra la ventana de captura manualmente
      this.mediaStream!.getVideoTracks()[0].onended = () => {
        if (this.recState === 'recording') this.stopRecording();
      };

      this.mediaRecorder.start(1000); // chunk cada segundo
      this.recState = 'recording';
      this.recSeconds = 0;
      this.recTimerRef = setInterval(() => this.recSeconds++, 1000);
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') {
        this.recError = 'Permiso de captura denegado. Acepta la solicitud del navegador para continuar.';
      } else {
        this.recError = 'Error al iniciar la captura de pantalla: ' + (err?.message || err);
      }
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    clearInterval(this.recTimerRef);
    this.recState = 'processing';
  }

  private async onRecordingStopped(): Promise<void> {
    this.stopStreams();
    if (this.recordedChunks.length === 0) {
      this.recError = 'No se grabaron datos. Vuelve a intentarlo.';
      this.recState = 'idle';
      return;
    }

    const mimeType = this.mediaRecorder?.mimeType || 'video/webm';
    const blob = new Blob(this.recordedChunks, { type: mimeType });
    const ext  = mimeType.includes('mp4') ? 'mp4' : 'webm';
    const file = new File([blob], `${this.videoTitle}.${ext}`, { type: mimeType });

    try {
      const meta = await LocalVideoService.extractMeta(file);
      this.localVideoService.setFile(file, meta);
      this.recState = 'ready';
    } catch {
      this.recError = 'No se pudo procesar el vídeo grabado. Inténtalo de nuevo.';
      this.recState = 'idle';
    }
  }

  private stopStreams(): void {
    this.mediaStream?.getTracks().forEach(t => t.stop());
    this.mediaStream = null;
  }

  // ── Crear proyecto de análisis ───────────────────────────

  createProject(): void {
    if (!this.localVideoService.hasFile()) return;
    if (!this.projectTitle.trim()) { this.createError = 'El título es obligatorio.'; return; }
    if (!this.selectedTemplateId)  { this.createError = 'Selecciona una plantilla.'; return; }

    this.isCreating  = true;
    this.createError = '';

    const meta = this.localVideoService.meta!;
    const body = {
      clubId: this.clubId,
      createdBy: this.userId,
      videoId: undefined,
      title: this.projectTitle.trim(),
      description: `Grabación de pantalla – ${this.sourceLabel()}`,
      templateId: this.selectedTemplateId,
      localFileName: meta.fileName,
      localFileSize: meta.fileSize,
      localFileDurationMs: meta.durationMs
    };

    this.analysisService.createProject(body).pipe(takeUntil(this.destroy$)).subscribe({
      next: res => {
        this.isCreating = false;
        if (res?.data?.id) {
          this.router.navigate(['/dashboard/video-analysis/workspace', res.data.id]);
        } else {
          this.createError = 'El servidor no devolvió el proyecto creado. Inténtalo de nuevo.';
        }
      },
      error: err => {
        this.isCreating = false;
        this.createError = err?.error?.message || 'Error al crear el proyecto.';
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard/video-analysis']);
  }
}
