import {
  Component, OnInit, AfterViewInit, OnDestroy,
  Input, Output, EventEmitter,
  ViewChild, ElementRef, HostListener,
  NgZone
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { VideoAnalysisService } from '../../../../core/services/video-analysis/video-analysis.service';
import { ClipExportService } from '../../services/clip-export.service';
import { ScreenCaptureService } from '../../services/screen-capture.service';
import {
  AnalysisEvent, ClipAnnotation, DrawingElement, DrawingTool, DrawingPoint
} from '../../models/analysis.models';

declare var YT: any;

interface DragState {
  mode: 'move' | 'handle';
  handleIdx: number;
  startPct: DrawingPoint;
  origEl: DrawingElement;
}

@Component({
  selector: 'app-clip-annotation-editor',
  templateUrl: './clip-annotation-editor.component.html',
  styleUrls: ['./clip-annotation-editor.component.scss']
})
export class ClipAnnotationEditorComponent implements OnInit, AfterViewInit, OnDestroy {

  @Input() event!: AnalysisEvent;
  @Input() videoFile: File | null = null;
  @Input() youtubeId: string | null = null;
  @Input() userId = 0;
  @Output() closed = new EventEmitter<void>();
  @Output() annotationsSaved = new EventEmitter<ClipAnnotation[]>();

  // @ViewChild setter: fires every time Angular creates/destroys the video element
  // (the element lives inside *ngIf="view === 'clip'", so it is destroyed when the
  // frame-editor opens and recreated when we return to clip view).
  // We always reinitialise so the new element gets its src after each round-trip.
  @ViewChild('videoEl')
  set videoElRefSetter(ref: ElementRef<HTMLVideoElement> | undefined) {
    if (ref?.nativeElement) {
      this.videoEl = ref.nativeElement;
      if (this._rawVideoUrl) {
        this.videoEl.src = this._rawVideoUrl;
        this.videoEl.load();
      }
    } else {
      // Element removed from DOM (view switched away from 'clip')
      this.videoEl = null;
    }
  }
  @ViewChild('drawCanvas')       drawCanvasRef!:       ElementRef<HTMLCanvasElement>;
  @ViewChild('thumbCanvas')      thumbCanvasRef!:      ElementRef<HTMLCanvasElement>;
  @ViewChild('annotationCanvas') annotationCanvasRef!: ElementRef<HTMLCanvasElement>;

  private destroy$ = new Subject<void>();

  // ── View ──────────────────────────────────────────────────────────────────
  view: 'clip' | 'frame-editor' = 'clip';

  // ── Clip view ─────────────────────────────────────────────────────────────
  annotations: ClipAnnotation[] = [];
  isLoadingAnnotations = false;
  isSavingAll = false;

  // ── Video player ──────────────────────────────────────────────────────────
  currentRelMs = 0;
  clipDurationMs = 0;
  isPlaying = false;
  videoEl: HTMLVideoElement | null = null;
  private _rawVideoUrl = '';

  // Annotation overlay state
  showingAnnotation = false;
  private activeAnnotationTimer: ReturnType<typeof setTimeout> | null = null;
  private shownAnnotations = new Set<string>(); // keys of annotations shown in this playthrough

  // ── Frame editor ──────────────────────────────────────────────────────────
  editingAnnotation: ClipAnnotation | null = null;
  capturedFrameDataUrl = '';
  drawingElements: DrawingElement[] = [];
  undoStack: DrawingElement[][] = [];

  activeTool: DrawingTool = 'freeDraw';
  activeColor = '#ff3333';
  strokeWidth = 3;
  fontSize = 20;
  frameDurationSec = 3;

  // Drawing state (draw tools)
  private isDrawing = false;
  private mouseStart: DrawingPoint = { x: 0, y: 0 };
  private currentElement: DrawingElement | null = null;
  private bgImage: HTMLImageElement | null = null;

  // Selection state
  selectedElementId: string | null = null;
  private dragState: DragState | null = null;

  // Text tool
  showTextInput = false;
  textInputValue = '';
  textCursorPct: DrawingPoint = { x: 0, y: 0 };

  readonly TOOL_ICONS: Record<DrawingTool, string> = {
    select:     'bi-cursor',
    freeDraw:   'bi-pencil',
    circle:     'bi-circle',
    arrow:      'bi-arrow-up-right',
    line:       'bi-slash-lg',
    dashedLine: 'bi-dash',
    text:       'bi-fonts',
    spotlight:  'bi-brightness-high'
  };

  readonly TOOL_LABELS: Record<DrawingTool, string> = {
    select:     'Seleccionar',
    freeDraw:   'Trazo libre',
    circle:     'Círculo',
    arrow:      'Flecha',
    line:       'Línea',
    dashedLine: 'Línea discontinua',
    text:       'Texto',
    spotlight:  'Foco'
  };

  readonly PALETTE = [
    '#ff3333', '#ff9900', '#ffee00', '#33cc33',
    '#3399ff', '#cc33ff', '#ffffff', '#000000'
  ];

  readonly TOOLS: DrawingTool[] = [
    'select', 'freeDraw', 'circle', 'arrow', 'line', 'dashedLine', 'text', 'spotlight'
  ];

  // ── Download state ────────────────────────────────────────────────────────
  isDownloading = false;
  downloadProgress = 0;
  downloadStep = '';

  // ── YouTube mini-player ───────────────────────────────────────────────────
  private ytMiniPlayer: any = null;
  private ytMiniReady = false;
  private rafId: number | null = null;

  constructor(
    private analysisService: VideoAnalysisService,
    private clipExport: ClipExportService,
    private screenCapture: ScreenCaptureService,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    this.clipDurationMs = this.event.endTimeMs - this.event.startTimeMs;
    this.loadAnnotations();

    if (!this.youtubeId && this.videoFile) {
      this._rawVideoUrl = URL.createObjectURL(this.videoFile);
    }
  }

  ngAfterViewInit(): void {
    // El div #yt-mini-embed existe en el DOM solo después de que Angular renderiza el template
    if (this.youtubeId) {
      this.initYouTubeMiniPlayer();
    }
  }

  ngOnDestroy(): void {
    this.cancelAnnotationOverlay();
    this.destroy$.next();
    this.destroy$.complete();
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    if (this.videoEl) {
      this.videoEl.pause();
      this.videoEl.src = '';
      this.videoEl = null;
    }
    if (this._rawVideoUrl) URL.revokeObjectURL(this._rawVideoUrl);
    if (this.ytMiniPlayer) { try { this.ytMiniPlayer.destroy(); } catch {} }
  }

  // ── YouTube mini-player ───────────────────────────────────────────────────

  private initYouTubeMiniPlayer(): void {
    const create = () => {
      this.ytMiniPlayer = new YT.Player('yt-mini-embed', {
        videoId: this.youtubeId,
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1, start: Math.floor(this.event.startTimeMs / 1000) },
        events: {
          onReady: () => this.zone.run(() => {
            this.ytMiniReady = true;
            this.ytMiniPlayer.pauseVideo();
            this.startYtTimeLoop();
          }),
          onStateChange: (e: any) => this.zone.run(() => {
            if (e.data === YT.PlayerState.PLAYING) this.isPlaying = true;
            if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) this.isPlaying = false;
          })
        }
      });
    };

    if (typeof YT !== 'undefined' && YT.Player) {
      create();
    } else {
      if (!document.getElementById('yt-api-script')) {
        const tag = document.createElement('script');
        tag.id = 'yt-api-script';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
      (window as any)['onYouTubeIframeAPIReady'] = () => this.zone.run(() => create());
    }
  }

  private startYtTimeLoop(): void {
    const update = () => {
      if (this.ytMiniPlayer && this.ytMiniReady) {
        const absMs = (this.ytMiniPlayer.getCurrentTime?.() || 0) * 1000;
        this.zone.run(() => {
          if (absMs >= this.event.endTimeMs) {
            this.ytMiniPlayer.pauseVideo();
            this.ytMiniPlayer.seekTo(this.event.startTimeMs / 1000, true);
            this.isPlaying = false;
            this.currentRelMs = this.clipDurationMs;
          } else {
            this.currentRelMs = Math.max(0, absMs - this.event.startTimeMs);
          }
        });
      }
      this.rafId = requestAnimationFrame(update);
    };
    this.rafId = requestAnimationFrame(update);
  }

  // ── Tool switching ─────────────────────────────────────────────────────────

  setTool(tool: DrawingTool): void {
    this.activeTool = tool;
    if (tool !== 'select') {
      this.selectedElementId = null;
      this.dragState = null;
    }
    this.redrawCanvas();
  }

  // ── Video player ──────────────────────────────────────────────────────────

  onVideoMetaLoaded(e: Event): void {
    const video = e.target as HTMLVideoElement;
    if (!this.videoEl) this.videoEl = video;
    video.currentTime = this.event.startTimeMs / 1000;
  }

  onVideoTimeUpdate(e: Event): void {
    const video = e.target as HTMLVideoElement;
    if (!this.videoEl) this.videoEl = video;

    // Skip updates while an annotation overlay is showing
    if (this.showingAnnotation) return;

    const absMs = video.currentTime * 1000;

    if (absMs >= this.event.endTimeMs) {
      video.pause();
      video.currentTime = this.event.startTimeMs / 1000;
      this.isPlaying = false;
      this.currentRelMs = this.clipDurationMs;
      this.shownAnnotations.clear();
      return;
    }

    this.currentRelMs = Math.max(0, absMs - this.event.startTimeMs);

    // Check if we just passed any annotation frame
    const sorted = [...this.annotations].sort((a, b) => a.frameTimeMs - b.frameTimeMs);
    for (const ann of sorted) {
      const key = String(ann.id ?? ann.frameTimeMs);
      if (!this.shownAnnotations.has(key) && absMs >= ann.frameTimeMs) {
        this.shownAnnotations.add(key);
        this.showAnnotationOverlay(ann, video);
        return;
      }
    }
  }

  private showAnnotationOverlay(ann: ClipAnnotation, video: HTMLVideoElement): void {
    const canvas = this.annotationCanvasRef?.nativeElement;
    if (!canvas) return;

    video.pause();
    this.isPlaying = false;

    // Size canvas to video resolution
    canvas.width  = video.videoWidth  || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d')!;
    const W = canvas.width, H = canvas.height;

    // Capture current video frame as background
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(video, 0, 0, W, H);

    // Render all drawing elements on top
    for (const el of (ann.drawingData || [])) {
      this.renderElement(ctx, el, W, H);
    }

    this.showingAnnotation = true;

    // After frameDurationMs, hide overlay and resume
    this.activeAnnotationTimer = setTimeout(() => {
      this.showingAnnotation = false;
      this.activeAnnotationTimer = null;
      video.play().catch(() => {});
      this.isPlaying = true;
    }, ann.frameDurationMs);
  }

  private cancelAnnotationOverlay(): void {
    if (this.activeAnnotationTimer !== null) {
      clearTimeout(this.activeAnnotationTimer);
      this.activeAnnotationTimer = null;
    }
    this.showingAnnotation = false;
  }

  togglePlay(): void {
    if (this.youtubeId && this.ytMiniPlayer && this.ytMiniReady) {
      if (this.isPlaying) {
        this.ytMiniPlayer.pauseVideo();
      } else {
        const absMs = (this.ytMiniPlayer.getCurrentTime?.() || 0) * 1000;
        if (absMs >= this.event.endTimeMs) {
          this.ytMiniPlayer.seekTo(this.event.startTimeMs / 1000, true);
        }
        this.ytMiniPlayer.playVideo();
      }
      return;
    }

    if (this.showingAnnotation) {
      this.cancelAnnotationOverlay();
      this.videoEl?.play().catch(() => {});
      this.isPlaying = true;
      return;
    }
    const video = this.videoEl;
    if (!video) return;
    if (video.paused) {
      if (video.currentTime * 1000 >= this.event.endTimeMs) {
        video.currentTime = this.event.startTimeMs / 1000;
        this.shownAnnotations.clear();
      }
      video.play();
      this.isPlaying = true;
    } else {
      video.pause();
      this.isPlaying = false;
    }
  }

  seekVideo(e: Event): void {
    const relMs = +(e.target as HTMLInputElement).value;
    this.cancelAnnotationOverlay();
    const newAbsMs = this.event.startTimeMs + relMs;

    if (this.youtubeId && this.ytMiniPlayer && this.ytMiniReady) {
      this.ytMiniPlayer.seekTo(newAbsMs / 1000, true);
      this.currentRelMs = relMs;
      return;
    }

    for (const ann of this.annotations) {
      const key = String(ann.id ?? ann.frameTimeMs);
      if (ann.frameTimeMs >= newAbsMs) this.shownAnnotations.delete(key);
    }
    if (this.videoEl) {
      this.videoEl.currentTime = newAbsMs / 1000;
      this.currentRelMs = relMs;
    }
  }

  stepBack(): void {
    this.cancelAnnotationOverlay();
    if (this.youtubeId && this.ytMiniPlayer && this.ytMiniReady) {
      const t = Math.max(this.event.startTimeMs / 1000, (this.ytMiniPlayer.getCurrentTime?.() || 0) - 5);
      this.ytMiniPlayer.seekTo(t, true);
      return;
    }
    this.shownAnnotations.clear();
    if (this.videoEl) this.videoEl.currentTime =
      Math.max(this.event.startTimeMs / 1000, this.videoEl.currentTime - 5);
  }

  stepForward(): void {
    if (this.youtubeId && this.ytMiniPlayer && this.ytMiniReady) {
      const t = Math.min(this.event.endTimeMs / 1000, (this.ytMiniPlayer.getCurrentTime?.() || 0) + 5);
      this.ytMiniPlayer.seekTo(t, true);
      return;
    }
    if (this.videoEl) this.videoEl.currentTime =
      Math.min(this.event.endTimeMs / 1000, this.videoEl.currentTime + 5);
  }

  formatMs(ms: number): string {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  }

  // ── Annotations CRUD ──────────────────────────────────────────────────────

  loadAnnotations(): void {
    this.isLoadingAnnotations = true;
    this.analysisService.listClipAnnotations(this.event.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const raw: any[] = res.data || [];
          this.annotations = raw.map(a => ({
            id: a.id,
            eventId: a.eventId,
            frameTimeMs: a.frameTimeMs,
            frameDurationMs: a.frameDurationMs,
            drawingData: this.parseDrawingData(a.drawingData),
            sortOrder: a.sortOrder
          }));
          this.isLoadingAnnotations = false;
        },
        error: () => { this.isLoadingAnnotations = false; }
      });
  }

  private parseDrawingData(raw: any): DrawingElement[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try { return JSON.parse(raw); } catch { return []; }
  }

  // ── Capture frame ─────────────────────────────────────────────────────────

  captureCurrentFrame(existing?: ClipAnnotation): void {
    if (this.youtubeId) {
      this.captureYouTubeFrame(existing);
      return;
    }
    const video = this.videoEl;
    if (!video) return;
    video.pause();
    this.isPlaying = false;

    const tc = this.thumbCanvasRef.nativeElement;
    tc.width  = video.videoWidth  || 1280;
    tc.height = video.videoHeight || 720;
    tc.getContext('2d')!.drawImage(video, 0, 0, tc.width, tc.height);
    this.capturedFrameDataUrl = tc.toDataURL('image/jpeg', 0.95);

    const frameTimeMs = this.event.startTimeMs + this.currentRelMs;
    this.openFrameEditor(frameTimeMs, existing);
  }

  private captureYouTubeFrame(existing?: ClipAnnotation): void {
    if (this.ytMiniPlayer && this.ytMiniReady) {
      this.ytMiniPlayer.pauseVideo();
      this.isPlaying = false;
    }

    const frameTimeMs = this.event.startTimeMs + this.currentRelMs;
    const cropEl = document.getElementById('yt-mini-embed');

    // Solo intentar captura si ya hay un stream activo (para no mostrar el diálogo al anotar).
    // Si no hay stream, usar placeholder inmediatamente → el usuario dibuja encima.
    if (this.screenCapture.isActive) {
      this.screenCapture.grabFrame(cropEl).then(dataUrl => {
        this.zone.run(() => {
          this.capturedFrameDataUrl = dataUrl || this.buildPlaceholderFrame(frameTimeMs);
          this.openFrameEditor(frameTimeMs, existing);
        });
      }).catch(() => {
        this.zone.run(() => {
          this.capturedFrameDataUrl = this.buildPlaceholderFrame(frameTimeMs);
          this.openFrameEditor(frameTimeMs, existing);
        });
      });
    } else {
      // Sin captura de pantalla activa: usar placeholder de inmediato
      this.capturedFrameDataUrl = this.buildPlaceholderFrame(frameTimeMs);
      this.openFrameEditor(frameTimeMs, existing);
    }
  }

  private buildPlaceholderFrame(frameTimeMs: number): string {
    const canvas = document.createElement('canvas');
    canvas.width  = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 0, 720);
    grad.addColorStop(0, '#0f1923');
    grad.addColorStop(1, '#1a2a3a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1280, 720);

    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = 'bold 64px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('▶', 640, 340);

    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '24px Arial';
    ctx.fillText(`t = ${this.formatMs(frameTimeMs - this.event.startTimeMs)}`, 640, 420);

    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = '16px Arial';
    ctx.fillText('Frame de YouTube — dibuja encima para anotar', 640, 660);
    return canvas.toDataURL('image/jpeg', 0.9);
  }

  private openFrameEditor(frameTimeMs: number, existing?: ClipAnnotation): void {
    if (existing) {
      this.editingAnnotation = { ...existing };
      this.drawingElements   = existing.drawingData ? [...existing.drawingData] : [];
      this.frameDurationSec  = Math.round(existing.frameDurationMs / 1000) || 3;
    } else {
      this.editingAnnotation = {
        eventId: this.event.id, frameTimeMs,
        frameDurationMs: 3000, drawingData: [], sortOrder: this.annotations.length
      };
      this.drawingElements  = [];
      this.frameDurationSec = 3;
    }
    this.undoStack = [];
    this.selectedElementId = null;
    this.view = 'frame-editor';
    setTimeout(() => this.initDrawCanvas(), 50);
  }

  editAnnotation(ann: ClipAnnotation): void {
    if (this.youtubeId && this.ytMiniPlayer && this.ytMiniReady) {
      this.ytMiniPlayer.seekTo(ann.frameTimeMs / 1000, true);
      setTimeout(() => this.captureCurrentFrame(ann), 400);
      return;
    }
    if (this.videoEl) this.videoEl.currentTime = ann.frameTimeMs / 1000;
    setTimeout(() => this.captureCurrentFrame(ann), 200);
  }

  deleteAnnotation(ann: ClipAnnotation, e: Event): void {
    e.stopPropagation();
    if (!ann.id) { this.annotations = this.annotations.filter(a => a !== ann); return; }
    this.analysisService.deleteClipAnnotation(ann.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: () => { this.annotations = this.annotations.filter(a => a.id !== ann.id); } });
  }

  // ── Drawing canvas ────────────────────────────────────────────────────────

  private initDrawCanvas(): void {
    const canvas = this.drawCanvasRef?.nativeElement;
    if (!canvas) return;
    this.bgImage = null;
    const img = new Image();
    img.onload = () => {
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      this.bgImage = img;
      this.redrawCanvas();
    };
    img.src = this.capturedFrameDataUrl;
  }

  private getCanvasPct(e: MouseEvent | TouchEvent): DrawingPoint {
    const canvas = this.drawCanvasRef.nativeElement;
    const rect   = canvas.getBoundingClientRect();
    const clientX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;
    const clientY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;
    return {
      x: ((clientX - rect.left) / rect.width)  * 100,
      y: ((clientY - rect.top)  / rect.height) * 100
    };
  }

  // ── Canvas mouse / touch events ───────────────────────────────────────────

  onCanvasDown(e: MouseEvent | TouchEvent): void {
    e.preventDefault();
    const pos = this.getCanvasPct(e);

    // ── SELECT TOOL ───────────────────────────────────────────────────────
    if (this.activeTool === 'select') {
      // 1. Check handles on currently selected element first
      if (this.selectedElementId) {
        const selEl = this.drawingElements.find(el => el.id === this.selectedElementId);
        if (selEl) {
          for (const h of this.getHandlesPct(selEl)) {
            if (this.distPct(pos, h) < 3) {
              this.undoStack.push(this.cloneElements());
              this.dragState = { mode: 'handle', handleIdx: h.idx, startPct: pos, origEl: this.cloneEl(selEl) };
              return;
            }
          }
        }
      }
      // 2. Hit-test all elements (topmost first)
      for (let i = this.drawingElements.length - 1; i >= 0; i--) {
        const el = this.drawingElements[i];
        if (this.hitTestEl(el, pos)) {
          this.selectedElementId = el.id;
          this.undoStack.push(this.cloneElements());
          this.dragState = { mode: 'move', handleIdx: -1, startPct: pos, origEl: this.cloneEl(el) };
          this.redrawCanvas();
          return;
        }
      }
      // 3. Clicked empty space → deselect
      this.selectedElementId = null;
      this.dragState = null;
      this.redrawCanvas();
      return;
    }

    // ── DRAW TOOLS ────────────────────────────────────────────────────────
    if (this.activeTool === 'text') {
      this.textCursorPct  = pos;
      this.textInputValue = '';
      this.showTextInput  = true;
      return;
    }

    this.isDrawing  = true;
    this.mouseStart = pos;

    if (this.activeTool === 'freeDraw') {
      this.currentElement = this.newEl('freeDraw', { points: [pos] });
    } else if (this.activeTool === 'circle' || this.activeTool === 'spotlight') {
      this.currentElement = this.newEl(this.activeTool, { x: pos.x, y: pos.y, radius: 0 });
    } else {
      this.currentElement = this.newEl(this.activeTool, { x: pos.x, y: pos.y, x2: pos.x, y2: pos.y });
    }
  }

  onCanvasMove(e: MouseEvent | TouchEvent): void {
    e.preventDefault();
    const pos = this.getCanvasPct(e);

    // Select drag
    if (this.activeTool === 'select' && this.dragState) {
      this.drawingElements = this.drawingElements.map(el =>
        el.id === this.selectedElementId
          ? this.applyDrag(this.dragState!.origEl, this.dragState!.mode, this.dragState!.handleIdx, this.dragState!.startPct, pos)
          : el
      );
      this.redrawCanvas();
      return;
    }

    // Draw drag
    if (!this.isDrawing || !this.currentElement) return;

    if (this.activeTool === 'freeDraw') {
      this.currentElement.points!.push(pos);
    } else if (this.activeTool === 'circle' || this.activeTool === 'spotlight') {
      const dx = pos.x - this.mouseStart.x;
      const dy = pos.y - this.mouseStart.y;
      this.currentElement.radius = Math.sqrt(dx * dx + dy * dy);
    } else {
      this.currentElement.x2 = pos.x;
      this.currentElement.y2 = pos.y;
    }
    this.redrawCanvas();
  }

  onCanvasUp(e: MouseEvent | TouchEvent): void {
    e.preventDefault();

    // Select drag end
    if (this.activeTool === 'select') {
      this.dragState = null;
      this.redrawCanvas();
      return;
    }

    if (!this.isDrawing || !this.currentElement) return;
    this.isDrawing = false;

    if (this.activeTool !== 'freeDraw') {
      const dx = (this.currentElement.x2 ?? this.currentElement.x ?? 0) - (this.currentElement.x ?? 0);
      const dy = (this.currentElement.y2 ?? this.currentElement.y ?? 0) - (this.currentElement.y ?? 0);
      if (Math.sqrt(dx * dx + dy * dy) < 1 && this.activeTool !== 'spotlight' && this.activeTool !== 'circle') {
        this.currentElement = null;
        return;
      }
    }

    this.undoStack.push(this.cloneElements());
    this.drawingElements.push(this.currentElement);
    this.currentElement = null;
    this.redrawCanvas();
  }

  confirmText(): void {
    if (!this.textInputValue.trim()) { this.showTextInput = false; return; }
    this.undoStack.push(this.cloneElements());
    this.drawingElements.push(this.newEl('text', {
      x: this.textCursorPct.x, y: this.textCursorPct.y,
      text: this.textInputValue.trim(), fontSize: this.fontSize
    }));
    this.textInputValue = '';
    this.showTextInput  = false;
    this.redrawCanvas();
  }

  undo(): void {
    if (!this.undoStack.length) return;
    this.drawingElements = this.undoStack.pop()!;
    this.selectedElementId = null;
    this.redrawCanvas();
  }

  clearAll(): void {
    this.undoStack.push(this.cloneElements());
    this.drawingElements = [];
    this.selectedElementId = null;
    this.redrawCanvas();
  }

  deleteSelected(): void {
    if (!this.selectedElementId) return;
    this.undoStack.push(this.cloneElements());
    this.drawingElements = this.drawingElements.filter(e => e.id !== this.selectedElementId);
    this.selectedElementId = null;
    this.redrawCanvas();
  }

  // ── Selection helpers ─────────────────────────────────────────────────────

  private hitTestEl(el: DrawingElement, pos: DrawingPoint): boolean {
    const T = 2.5;
    switch (el.type) {
      case 'circle':
      case 'spotlight': {
        const dx = pos.x - el.x!;
        const dy = pos.y - el.y!;
        return Math.sqrt(dx * dx + dy * dy) <= (el.radius || 0) + T;
      }
      case 'arrow':
      case 'line':
      case 'dashedLine':
        return this.distToSegmentPct(pos, { x: el.x!, y: el.y! }, { x: el.x2!, y: el.y2! }) < T;
      case 'freeDraw': {
        if (!el.points?.length) return false;
        const bbox = this.getBBox(el);
        return pos.x >= bbox.x1 - T && pos.x <= bbox.x2 + T &&
               pos.y >= bbox.y1 - T && pos.y <= bbox.y2 + T;
      }
      case 'text': {
        const dx = pos.x - (el.x || 0);
        const dy = pos.y - (el.y || 0);
        return Math.abs(dx) < 12 && dy < 2 && dy > -8;
      }
    }
    return false;
  }

  /** Returns handle positions in canvas-% for the given element. */
  private getHandlesPct(el: DrawingElement): Array<DrawingPoint & { idx: number }> {
    switch (el.type) {
      case 'circle':
      case 'spotlight':
        return [
          { x: el.x!, y: el.y!, idx: 0 },
          { x: el.x! + (el.radius || 0), y: el.y!, idx: 1 }
        ];
      case 'arrow':
      case 'line':
      case 'dashedLine':
        return [
          { x: el.x!, y: el.y!, idx: 0 },
          { x: el.x2!, y: el.y2!, idx: 1 }
        ];
      case 'freeDraw': {
        const b = this.getBBox(el);
        return [
          { x: b.cx, y: b.cy, idx: 0 },
          { x: b.x2, y: b.y2, idx: 1 }
        ];
      }
      case 'text':
        return [{ x: el.x!, y: el.y!, idx: 0 }];
    }
    return [];
  }

  private applyDrag(orig: DrawingElement, mode: 'move' | 'handle', handleIdx: number,
                    startPct: DrawingPoint, currPct: DrawingPoint): DrawingElement {
    const dx = currPct.x - startPct.x;
    const dy = currPct.y - startPct.y;
    const r = this.cloneEl(orig);

    if (mode === 'move') {
      if (r.x  !== undefined) r.x  += dx;
      if (r.y  !== undefined) r.y  += dy;
      if (r.x2 !== undefined) r.x2 += dx;
      if (r.y2 !== undefined) r.y2 += dy;
      if (r.points) r.points = r.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
    } else {
      switch (orig.type) {
        case 'circle':
        case 'spotlight':
          if (handleIdx === 0) { r.x = (r.x || 0) + dx; r.y = (r.y || 0) + dy; }
          else {
            const ddx = currPct.x - (r.x || 0);
            const ddy = currPct.y - (r.y || 0);
            r.radius = Math.max(1, Math.sqrt(ddx * ddx + ddy * ddy));
          }
          break;
        case 'arrow':
        case 'line':
        case 'dashedLine':
          if (handleIdx === 0) { r.x  = (r.x  || 0) + dx; r.y  = (r.y  || 0) + dy; }
          else                 { r.x2 = (r.x2 || 0) + dx; r.y2 = (r.y2 || 0) + dy; }
          break;
        case 'freeDraw': {
          const b0 = this.getBBox(orig);
          const bW = b0.x2 - b0.x1 || 1;
          const bH = b0.y2 - b0.y1 || 1;
          const newX2 = b0.x2 + dx;
          const newY2 = b0.y2 + dy;
          const scaleX = (newX2 - b0.x1) / bW;
          const scaleY = (newY2 - b0.y1) / bH;
          r.points = orig.points!.map(p => ({
            x: b0.x1 + (p.x - b0.x1) * Math.max(0.1, scaleX),
            y: b0.y1 + (p.y - b0.y1) * Math.max(0.1, scaleY)
          }));
          break;
        }
        default:
          if (r.x !== undefined) r.x += dx;
          if (r.y !== undefined) r.y += dy;
      }
    }
    return r;
  }

  private distPct(a: DrawingPoint, b: DrawingPoint): number {
    const dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private distToSegmentPct(p: DrawingPoint, a: DrawingPoint, b: DrawingPoint): number {
    const dx = b.x - a.x, dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq > 0 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq : 0;
    t = Math.max(0, Math.min(1, t));
    const nx = a.x + t * dx, ny = a.y + t * dy;
    return Math.sqrt((p.x - nx) ** 2 + (p.y - ny) ** 2);
  }

  private getBBox(el: DrawingElement): { x1: number; y1: number; x2: number; y2: number; cx: number; cy: number } {
    const pts = el.points || [];
    if (!pts.length) return { x1: 0, y1: 0, x2: 0, y2: 0, cx: 0, cy: 0 };
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const x1 = Math.min(...xs), x2 = Math.max(...xs);
    const y1 = Math.min(...ys), y2 = Math.max(...ys);
    return { x1, y1, x2, y2, cx: (x1 + x2) / 2, cy: (y1 + y2) / 2 };
  }

  // ── Canvas rendering ──────────────────────────────────────────────────────

  private redrawCanvas(): void {
    const canvas = this.drawCanvasRef?.nativeElement;
    if (!canvas || !this.bgImage) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width, H = canvas.height;

    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(this.bgImage, 0, 0, W, H);

    const all = [...this.drawingElements, ...(this.currentElement ? [this.currentElement] : [])];
    for (const el of all) this.renderElement(ctx, el, W, H);

    // Selection handles
    if (this.selectedElementId && this.activeTool === 'select') {
      const sel = this.drawingElements.find(e => e.id === this.selectedElementId);
      if (sel) this.renderSelectionHandles(ctx, sel, W, H);
    }
  }

  private renderSelectionHandles(ctx: CanvasRenderingContext2D, el: DrawingElement, W: number, H: number): void {
    const px = (p: number) => p * W / 100;
    const py = (p: number) => p * H / 100;
    const HR = 6; // handle radius px

    ctx.save();
    ctx.setLineDash([5, 3]);
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 1.5;

    // Dashed selection outline per type
    switch (el.type) {
      case 'circle':
      case 'spotlight':
        ctx.beginPath();
        ctx.arc(px(el.x!), py(el.y!), px(el.radius || 0) + 4, 0, 2 * Math.PI);
        ctx.stroke();
        break;
      case 'arrow':
      case 'line':
      case 'dashedLine':
        ctx.beginPath();
        ctx.moveTo(px(el.x!), py(el.y!));
        ctx.lineTo(px(el.x2!), py(el.y2!));
        ctx.stroke();
        break;
      case 'freeDraw': {
        const b = this.getBBox(el);
        ctx.strokeRect(px(b.x1) - 4, py(b.y1) - 4, px(b.x2) - px(b.x1) + 8, py(b.y2) - py(b.y1) + 8);
        break;
      }
      case 'text': {
        const fSize = (el.fontSize || 20);
        ctx.strokeRect(px(el.x!) - 4, py(el.y!) - fSize - 2, 120, fSize + 8);
        break;
      }
    }
    ctx.setLineDash([]);

    // Handles (solid circles)
    for (const h of this.getHandlesPct(el)) {
      ctx.beginPath();
      ctx.arc(px(h.x), py(h.y), HR, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderElement(ctx: CanvasRenderingContext2D, el: DrawingElement, W: number, H: number): void {
    ctx.save();
    ctx.strokeStyle = el.color;
    ctx.fillStyle   = el.color;
    ctx.lineWidth   = el.strokeWidth;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.setLineDash([]);

    const px = (p: number) => p * W / 100;
    const py = (p: number) => p * H / 100;

    switch (el.type) {
      case 'freeDraw':
        if (!el.points || el.points.length < 2) break;
        ctx.beginPath();
        ctx.moveTo(px(el.points[0].x), py(el.points[0].y));
        for (let i = 1; i < el.points.length; i++)
          ctx.lineTo(px(el.points[i].x), py(el.points[i].y));
        ctx.stroke();
        break;

      case 'circle':
        ctx.beginPath();
        ctx.arc(px(el.x!), py(el.y!), px(el.radius || 0), 0, 2 * Math.PI);
        ctx.stroke();
        break;

      case 'arrow':
        this.drawArrow(ctx, px(el.x!), py(el.y!), px(el.x2!), py(el.y2!), el.strokeWidth);
        break;

      case 'line':
        ctx.beginPath();
        ctx.moveTo(px(el.x!), py(el.y!));
        ctx.lineTo(px(el.x2!), py(el.y2!));
        ctx.stroke();
        break;

      case 'dashedLine':
        ctx.setLineDash([8, 5]);
        ctx.beginPath();
        ctx.moveTo(px(el.x!), py(el.y!));
        ctx.lineTo(px(el.x2!), py(el.y2!));
        ctx.stroke();
        ctx.setLineDash([]);
        break;

      case 'text':
        ctx.font = `bold ${el.fontSize || 20}px Arial, sans-serif`;
        ctx.fillStyle  = el.color;
        ctx.strokeStyle = el.color === '#ffffff' ? '#000' : '#fff';
        ctx.lineWidth  = 2;
        ctx.strokeText(el.text || '', px(el.x!), py(el.y!));
        ctx.fillText(el.text || '', px(el.x!), py(el.y!));
        break;

      case 'spotlight': {
        const sx = px(el.x!), sy = py(el.y!), sr = px(el.radius || 10);
        ctx.save();
        // Draw dark overlay with a transparent hole over the circle using evenodd.
        // This correctly darkens everything OUTSIDE the circle while leaving
        // the inside bright (showing the video frame underneath).
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.beginPath();
        ctx.rect(0, 0, W, H);                              // outer rect (clockwise)
        ctx.arc(sx, sy, sr, 0, 2 * Math.PI, true);         // circle hole (counter-clockwise)
        ctx.fill('evenodd');
        // Border ring
        ctx.strokeStyle = el.color;
        ctx.lineWidth   = el.strokeWidth + 1;
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.restore();
        break;
      }
    }
    ctx.restore();
  }

  private drawArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number,
                    x2: number, y2: number, lineWidth: number): void {
    const headLen = Math.max(12, lineWidth * 4);
    const angle   = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath(); ctx.fill();
  }

  // ── Utilities ─────────────────────────────────────────────────────────────

  private cloneEl(el: DrawingElement): DrawingElement {
    return { ...el, points: el.points?.map(p => ({ ...p })) };
  }

  private cloneElements(): DrawingElement[] {
    return this.drawingElements.map(e => this.cloneEl(e));
  }

  private newEl(type: DrawingTool, extra: Partial<DrawingElement> = {}): DrawingElement {
    return { type, id: Math.random().toString(36).slice(2),
             color: this.activeColor, strokeWidth: this.strokeWidth, fontSize: this.fontSize, ...extra };
  }

  // ── Save / cancel ─────────────────────────────────────────────────────────

  saveFrame(): void {
    if (!this.editingAnnotation) return;
    const canvas = this.drawCanvasRef?.nativeElement;
    const thumbnailDataUrl = canvas ? canvas.toDataURL('image/jpeg', 0.8) : '';
    const updated: ClipAnnotation = {
      ...this.editingAnnotation,
      frameDurationMs: Math.round(this.frameDurationSec * 1000),
      drawingData: [...this.drawingElements],
      thumbnailDataUrl
    };

    if (updated.id) {
      this.analysisService.updateClipAnnotation(updated.id, {
        frameTimeMs: updated.frameTimeMs, frameDurationMs: updated.frameDurationMs,
        drawingData: JSON.stringify(updated.drawingData), sortOrder: updated.sortOrder
      }).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => { this.annotations = this.annotations.map(a => a.id === updated.id ? { ...updated } : a); }
      });
    } else {
      this.analysisService.createClipAnnotation(this.event.id, {
        frameTimeMs: updated.frameTimeMs, frameDurationMs: updated.frameDurationMs,
        drawingData: JSON.stringify(updated.drawingData), sortOrder: updated.sortOrder,
        createdBy: this.userId
      }).pipe(takeUntil(this.destroy$)).subscribe({
        next: (res: any) => {
          updated.id = res.data?.id;
          this.annotations = [...this.annotations, updated]
            .sort((a, b) => a.frameTimeMs - b.frameTimeMs)
            .map((a, i) => ({ ...a, sortOrder: i }));
        }
      });
    }
    this.view = 'clip';
    this.editingAnnotation = null;
    this.selectedElementId = null;
  }

  cancelFrame(): void {
    this.view = 'clip';
    this.editingAnnotation    = null;
    this.drawingElements      = [];
    this.capturedFrameDataUrl = '';
    this.selectedElementId    = null;
  }

  async downloadClip(): Promise<void> {
    if (this.isDownloading) return;
    this.isDownloading    = true;
    this.downloadProgress = 0;
    this.downloadStep     = 'Preparando…';

    const label = `${this.event.categoryName || 'clip'}_${this.msToHms(this.event.startTimeMs).replace(/:/g, '-')}`;

    try {
      if (this.youtubeId) {
        // ── YouTube: grabación de pantalla del mini-player ──
        await this.downloadYouTubeClip(label);
      } else if (this.videoFile) {
        // ── Local: FFmpeg ──
        if (!this.annotations.length) {
          this.downloadStep = 'Exportando…';
          await this.clipExport.exportClip(
            this.videoFile,
            this.event.startTimeMs,
            this.event.endTimeMs,
            label,
            (pct) => { this.downloadProgress = pct; }
          );
        } else {
          this.downloadStep = 'Preparando frames anotados…';
          const ready = await this.clipExport.prepareAnnotationThumbnails(this.videoFile, this.annotations);
          await this.clipExport.exportClipWithAnnotations(
            this.videoFile,
            this.event.startTimeMs,
            this.event.endTimeMs,
            label,
            ready,
            (pct)  => { this.downloadProgress = pct; },
            (step) => { this.downloadStep = step; }
          );
        }
      }
    } catch (err: any) {
      console.error('[CAE Download]', err);
      alert(`Error al exportar el clip:\n${err?.message || err}`);
    } finally {
      this.isDownloading    = false;
      this.downloadProgress = 0;
      this.downloadStep     = '';
    }
  }

  private async downloadYouTubeClip(label: string): Promise<void> {
    const durationMs = this.event.endTimeMs - this.event.startTimeMs;
    const step = (s: string) => { this.downloadStep = s; };
    const prog = (p: number) => { this.downloadProgress = p; };

    step('Posicionando vídeo…');
    prog(5);
    if (this.ytMiniPlayer && this.ytMiniReady) {
      this.ytMiniPlayer.seekTo(this.event.startTimeMs / 1000, true);
      this.ytMiniPlayer.pauseVideo();
    }
    await new Promise(r => setTimeout(r, 700));

    const cropEl = document.getElementById('yt-mini-embed');
    if (!this.screenCapture.isActive) step('Selecciona esta pestaña para compartir…');
    prog(10);

    let stream: MediaStream;
    try {
      stream = await this.screenCapture.acquireStream(cropEl);
    } catch {
      throw new Error('Se canceló la selección de pantalla.');
    }

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4';

    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    await new Promise<void>((resolve, reject) => {
      recorder.onstop = () => {
        prog(95);
        const blob = new Blob(chunks, { type: mimeType });
        const ext  = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `${label}.${ext}`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 3000);
        prog(100);
        resolve();
      };
      recorder.onerror = (e: any) => reject(e.error || new Error('MediaRecorder error'));

      recorder.start(500);
      step('Grabando…');
      prog(20);
      if (this.ytMiniPlayer && this.ytMiniReady) this.ytMiniPlayer.playVideo();

      let elapsed = 0;
      const iv = setInterval(() => {
        elapsed += 500;
        prog(20 + Math.min(73, Math.round((elapsed / durationMs) * 73)));
        step(`Grabando… ${Math.round(elapsed / 1000)}s / ${Math.round(durationMs / 1000)}s`);
      }, 500);

      setTimeout(() => {
        clearInterval(iv);
        if (this.ytMiniPlayer && this.ytMiniReady) this.ytMiniPlayer.pauseVideo();
        step('Finalizando…');
        recorder.stop();
      }, durationMs + 300);
    });
  }

  close(): void {
    this.annotationsSaved.emit([...this.annotations]);
    this.closed.emit();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private msToHms(ms: number): string {
    const s   = Math.floor(ms / 1000);
    const h   = Math.floor(s / 3600);
    const m   = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return [h, m, sec].map(v => String(v).padStart(2, '0')).join(':');
  }

  annotationRelMs(ann: ClipAnnotation): number {
    return ann.frameTimeMs - this.event.startTimeMs;
  }

  trackById(_: number, item: ClipAnnotation): any { return item.id ?? item.frameTimeMs; }

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    if (this.view === 'frame-editor') {
      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); this.undo(); }
      if (e.key === 'Escape') {
        if (this.selectedElementId) { this.selectedElementId = null; this.redrawCanvas(); }
        else { this.cancelFrame(); }
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedElementId) {
        e.preventDefault();
        this.deleteSelected();
      }
      if (e.key === 'Enter' && this.showTextInput) { this.confirmText(); }
    } else {
      if (e.key === ' ') { e.preventDefault(); this.togglePlay(); }
      if (e.key === 'Escape') { this.close(); }
    }
  }
}
