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
  AnalysisEvent, ClipAnnotation, DrawingElement, DrawingTool, DrawingPoint,
  ClipCaption, CaptionStyle, CAPTION_STYLE_CONFIG, AnimatedDrawingOverlay
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
  @ViewChild('animCanvas')       animCanvasRef!:       ElementRef<HTMLCanvasElement>;

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
    select:       'bi-cursor',
    freeDraw:     'bi-pencil',
    circle:       'bi-circle',
    arrow:        'bi-arrow-up-right',
    line:         'bi-slash-lg',
    dashedLine:   'bi-dash',
    text:         'bi-fonts',
    spotlight:    'bi-brightness-high',
    playerLine:   'bi-people-fill',
    curvedArrow:  'bi-arrow-return-right',
    filledZone:   'bi-square-fill',
    topSpotlight: 'bi-triangle-fill'
  };

  readonly TOOL_LABELS: Record<DrawingTool, string> = {
    select:       'Seleccionar  (V)',
    freeDraw:     'Trazo libre  (P)',
    circle:       'Círculo  (C)',
    arrow:        'Flecha  (A)',
    line:         'Línea  (L)',
    dashedLine:   'Línea discontinua  (D)',
    text:         'Texto  (T)',
    spotlight:    'Foco  (F)',
    playerLine:   'Línea de jugadores  (J)',
    curvedArrow:  'Flecha curva  (Q)',
    filledZone:   'Zona sombreada  (Z)',
    topSpotlight: 'Cono de luz (foco de estadio)'
  };

  readonly TOOL_GROUPS: { label: string; tools: DrawingTool[] }[] = [
    { label: 'Selección',  tools: ['select'] },
    { label: 'Dibujo',    tools: ['freeDraw', 'line', 'dashedLine', 'arrow', 'curvedArrow'] },
    { label: 'Formas',    tools: ['circle', 'filledZone', 'spotlight', 'topSpotlight'] },
    { label: 'Táctica',   tools: ['playerLine'] },
    { label: 'Texto',     tools: ['text'] },
  ];

  readonly PALETTE = [
    '#ff3333', '#ff9900', '#ffee00', '#33cc33',
    '#3399ff', '#cc33ff', '#ffffff', '#000000'
  ];

  readonly TOOLS: DrawingTool[] = [
    'select', 'freeDraw', 'circle', 'arrow', 'line', 'dashedLine',
    'text', 'spotlight', 'playerLine', 'curvedArrow', 'filledZone', 'topSpotlight'
  ];

  /** Etiquetas ultra-cortas visibles bajo cada icono de herramienta */
  readonly TOOL_SHORT: Record<DrawingTool, string> = {
    select:       'Sel.',
    freeDraw:     'Libre',
    circle:       'Circ.',
    arrow:        'Flecha',
    line:         'Línea',
    dashedLine:   'Disct.',
    text:         'Texto',
    spotlight:    'Foco',
    playerLine:   'Jugad.',
    curvedArrow:  'Curva',
    filledZone:   'Zona',
    topSpotlight: 'Cono'
  };

  /** Índice de la herramienta activa según TOOLS (para atajos 1-9) */
  private readonly SHORTCUT_TOOLS: DrawingTool[] = [
    'select', 'freeDraw', 'circle', 'arrow', 'line', 'dashedLine',
    'text', 'spotlight', 'playerLine'
  ];

  // ── Player line tool state ────────────────────────────────────────────────
  /** Elemento playerLine que se está construyendo punto a punto */
  playerLineInProgress: DrawingElement | null = null;
  /** Posición actual del ratón mientras se dibuja una playerLine (para preview) */
  playerLinePreviewPos: DrawingPoint | null = null;
  /** Radio de los círculos de jugador en % (relativo al ancho del canvas) */
  playerRadius = 4;

  // ── Curved arrow in-progress ──────────────────────────────────────────────
  /** Punto de control de la flecha curva: se establece al soltar el ratón (2.º click) */
  private curvedArrowPhase: 0 | 1 | 2 = 0;

  // ── Playback speed ────────────────────────────────────────────────────────
  playbackRate = 1;
  readonly SPEED_OPTIONS = [0.25, 0.5, 1, 2];

  // ── Toolbar flotante: posición y orientación ─────────────────────────────
  /** Posición X en px dentro del cae-canvas-wrap (null = centrar con CSS) */
  toolbarX: number | null = null;
  /** Posición Y en px dentro del cae-canvas-wrap */
  toolbarY = 10;
  /** true = orientación vertical, false = horizontal */
  toolbarV = false;
  _tbDragging  = false;
  private _tbDragSX    = 0;  // clientX inicial del drag
  private _tbDragSY    = 0;  // clientY inicial del drag
  private _tbDragIX    = 0;  // toolbarX al inicio del drag
  private _tbDragIY    = 0;  // toolbarY al inicio del drag

  // ── Download state ────────────────────────────────────────────────────────
  isDownloading = false;
  downloadProgress = 0;
  downloadStep = '';

  // ── Captions (notas de texto sobre el vídeo en reproducción) ─────────────
  readonly CAPTION_STYLES = Object.entries(CAPTION_STYLE_CONFIG) as [CaptionStyle, typeof CAPTION_STYLE_CONFIG[CaptionStyle]][];
  captions: ClipCaption[] = [];
  /** Captions visibles en el instante actual del vídeo */
  activeCaptions: ClipCaption[] = [];
  /** Panel de captions visible en la columna derecha */
  showCaptionPanel = false;
  /** Formulario inline para añadir nueva caption */
  showAddCaption   = false;
  newCaptionText     = '';
  newCaptionStyle: CaptionStyle = 'default';
  newCaptionDuration = 4;    // segundos
  newCaptionStartSec = 0;    // segundos — se inicializa al abrir el formulario

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
    this.loadCaptions();

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

  // ── Toolbar drag ─────────────────────────────────────────────────────────

  startToolbarDrag(e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();
    // Si aún no se ha arrastrado, calculamos la posición actual del toolbar
    // leyendo su boundingRect relativa al canvas-wrap
    if (this.toolbarX === null) {
      const wrap = this.drawCanvasRef?.nativeElement?.parentElement as HTMLElement | null;
      const bar  = (e.currentTarget as HTMLElement).closest('.cae-floating-bar') as HTMLElement | null;
      if (wrap && bar) {
        const wr = wrap.getBoundingClientRect();
        const br = bar.getBoundingClientRect();
        this.toolbarX = br.left - wr.left;
        this.toolbarY = br.top  - wr.top;
      }
    }
    this._tbDragging = true;
    this._tbDragSX   = e.clientX;
    this._tbDragSY   = e.clientY;
    this._tbDragIX   = this.toolbarX ?? 10;
    this._tbDragIY   = this.toolbarY;
  }

  @HostListener('document:mousemove', ['$event'])
  onDocumentMouseMove(e: MouseEvent): void {
    if (!this._tbDragging) return;
    const wrap = this.drawCanvasRef?.nativeElement?.parentElement as HTMLElement | null;
    const maxX = wrap ? wrap.offsetWidth  - 60 : window.innerWidth;
    const maxY = wrap ? wrap.offsetHeight - 40 : window.innerHeight;
    this.toolbarX = Math.max(0, Math.min(maxX, this._tbDragIX + (e.clientX - this._tbDragSX)));
    this.toolbarY = Math.max(0, Math.min(maxY, this._tbDragIY + (e.clientY - this._tbDragSY)));
  }

  @HostListener('document:mouseup')
  onDocumentMouseUp(): void {
    this._tbDragging = false;
  }

  toggleToolbarOrientation(): void {
    this.toolbarV = !this.toolbarV;
    // Reajustamos la posición para que no salga del canvas
    const wrap = this.drawCanvasRef?.nativeElement?.parentElement as HTMLElement | null;
    if (wrap && this.toolbarX !== null) {
      this.toolbarX = Math.min(this.toolbarX, wrap.offsetWidth  - 60);
      this.toolbarY = Math.min(this.toolbarY, wrap.offsetHeight - 60);
    }
  }

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    // No disparar si el foco está en un input/textarea
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    // ── Clip view ──
    if (this.view === 'clip') {
      if (e.code === 'Space') { e.preventDefault(); this.togglePlay(); }
      if (e.code === 'ArrowLeft')  this.stepFrame(-1);
      if (e.code === 'ArrowRight') this.stepFrame(1);
      return;
    }

    // ── Frame editor view ──
    if (e.code === 'Escape') {
      if (this.playerLineInProgress) { this.cancelPlayerLine(); return; }
      if (this.showTextInput) { this.showTextInput = false; return; }
    }
    if (e.code === 'Enter') {
      if (this.playerLineInProgress) { e.preventDefault(); this.finalizePlayerLine(); return; }
    }
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') { e.preventDefault(); this.undo(); return; }
    if (e.code === 'Delete' || e.code === 'Backspace') {
      // Si hay playerLine en progreso, Backspace elimina el último punto
      if (e.code === 'Backspace' && this.playerLineInProgress) {
        this.removeLastPlayerLinePoint();
        e.preventDefault();
        return;
      }
      this.deleteSelected();
      return;
    }

    // Mover elemento seleccionado con flechas
    if (this.selectedElementId) {
      const D = 0.5;
      if (e.code === 'ArrowLeft')  { e.preventDefault(); this.nudgeSelected(-D, 0); return; }
      if (e.code === 'ArrowRight') { e.preventDefault(); this.nudgeSelected(D, 0);  return; }
      if (e.code === 'ArrowUp')    { e.preventDefault(); this.nudgeSelected(0, -D); return; }
      if (e.code === 'ArrowDown')  { e.preventDefault(); this.nudgeSelected(0, D);  return; }
    }

    // Atajos 1-9 para herramientas
    const num = parseInt(e.key, 10);
    if (num >= 1 && num <= this.SHORTCUT_TOOLS.length) {
      this.setTool(this.SHORTCUT_TOOLS[num - 1]);
      return;
    }

    // Atajos de letra
    const shortcutMap: Record<string, DrawingTool> = {
      v: 'select', p: 'freeDraw', c: 'circle', a: 'arrow',
      l: 'line', d: 'dashedLine', t: 'text', f: 'spotlight',
      j: 'playerLine', q: 'curvedArrow', z: 'filledZone'
    };
    if (!e.ctrlKey && !e.metaKey) {
      const tool = shortcutMap[e.key.toLowerCase()];
      if (tool) { this.setTool(tool); }
    }
  }

  /** Mueve el elemento seleccionado dx/dy en % */
  private nudgeSelected(dx: number, dy: number): void {
    if (!this.selectedElementId) return;
    this.undoStack.push(this.cloneElements());
    this.drawingElements = this.drawingElements.map(el => {
      if (el.id !== this.selectedElementId) return el;
      const r = this.cloneEl(el);
      if (r.x  !== undefined) r.x  += dx;
      if (r.y  !== undefined) r.y  += dy;
      if (r.x2 !== undefined) r.x2 += dx;
      if (r.y2 !== undefined) r.y2 += dy;
      if (r.points) r.points = r.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
      return r;
    });
    this.redrawCanvas();
  }

  // ── Tool switching ─────────────────────────────────────────────────────────

  setTool(tool: DrawingTool): void {
    if (this.playerLineInProgress) this.cancelPlayerLine();
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

    // Actualizar captions activas (sin pausar el vídeo)
    this.computeActiveCaptions();

    // Renderizar dibujos animados activos
    if (!this.showingAnnotation) this.renderAnimatedDrawings();

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

    // En thumbnails y exports el canvas ocupa 100% del tamaño visual → escala 1
    // (el canvas se exporta a su resolución interna, texto debe quedar proporcional)
    this._fontPxScale = 1;

    // Render all drawing elements on top
    const drawingData = ann.drawingData || [];
    const darkEls = drawingData.filter(el => el.type === 'spotlight' || el.type === 'playerLine');
    for (const el of drawingData) {
      if (el.type !== 'spotlight' && el.type !== 'playerLine') {
        this.renderElement(ctx, el, W, H);
      }
    }
    if (darkEls.length > 0) this.renderDarkLayer(ctx, darkEls, W, H);

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

  /** Avanza o retrocede 1 fotograma (~1/30 s) */
  stepFrame(dir: 1 | -1): void {
    const frameSec = 1 / 30;
    if (this.youtubeId && this.ytMiniPlayer && this.ytMiniReady) {
      const t = this.ytMiniPlayer.getCurrentTime?.() || 0;
      this.ytMiniPlayer.seekTo(Math.max(this.event.startTimeMs / 1000,
        Math.min(this.event.endTimeMs / 1000, t + dir * frameSec)), true);
      return;
    }
    if (!this.videoEl) return;
    this.videoEl.pause();
    this.isPlaying = false;
    this.cancelAnnotationOverlay();
    const newT = Math.max(this.event.startTimeMs / 1000,
      Math.min(this.event.endTimeMs / 1000, this.videoEl.currentTime + dir * frameSec));
    this.videoEl.currentTime = newT;
  }

  /** Cambia la velocidad de reproducción */
  setSpeed(rate: number): void {
    this.playbackRate = rate;
    if (this.videoEl) this.videoEl.playbackRate = rate;
    if (this.ytMiniPlayer?.setPlaybackRate) this.ytMiniPlayer.setPlaybackRate(rate);
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

  stepForward(): void {
    this.cancelAnnotationOverlay();
    if (this.youtubeId && this.ytMiniPlayer && this.ytMiniReady) {
      const t = Math.min(this.event.endTimeMs / 1000, (this.ytMiniPlayer.getCurrentTime?.() || 0) + 5);
      this.ytMiniPlayer.seekTo(t, true);
      return;
    }
    if (this.videoEl) {
      this.videoEl.currentTime = Math.min(this.event.endTimeMs / 1000, this.videoEl.currentTime + 5);
      this.currentRelMs = Math.min(this.clipDurationMs, this.currentRelMs + 5000);
    }
  }

  stepBack(): void {
    this.cancelAnnotationOverlay();
    if (this.youtubeId && this.ytMiniPlayer && this.ytMiniReady) {
      const t = Math.max(this.event.startTimeMs / 1000, (this.ytMiniPlayer.getCurrentTime?.() || 0) - 5);
      this.ytMiniPlayer.seekTo(t, true);
      return;
    }
    if (this.videoEl) {
      this.videoEl.currentTime = Math.max(this.event.startTimeMs / 1000, this.videoEl.currentTime - 5);
      this.currentRelMs = Math.max(0, this.currentRelMs - 5000);
    }
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
      // Preservar 0 (sin pausa) — el || 3 anterior lo machacaba convirtiendo 0 en 3
      this.frameDurationSec  = existing.frameDurationMs > 0
        ? (Math.round(existing.frameDurationMs / 1000) || 1)
        : 0;
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

  // ── Captions ─────────────────────────────────────────────────────────────

  private captionsKey(): string {
    return `cae_captions_${this.event.id}`;
  }

  private loadCaptions(): void {
    try {
      const raw = localStorage.getItem(this.captionsKey());
      this.captions = raw ? JSON.parse(raw) : [];
    } catch { this.captions = []; }
  }

  private saveCaptions(): void {
    localStorage.setItem(this.captionsKey(), JSON.stringify(this.captions));
  }

  computeActiveCaptions(): void {
    const t = this.currentRelMs;
    this.activeCaptions = this.captions.filter(
      c => t >= c.startMs && t < c.startMs + c.durationMs
    );
  }

  openAddCaption(): void {
    this.newCaptionStartSec = Math.round(this.currentRelMs / 100) / 10; // redondear a 1 decimal
    this.showAddCaption = true;
  }

  confirmAddCaption(): void {
    if (!this.newCaptionText.trim()) return;
    const startMs  = Math.max(0, Math.min(this.clipDurationMs, Math.round(this.newCaptionStartSec * 1000)));
    const caption: ClipCaption = {
      id:         Math.random().toString(36).slice(2),
      text:       this.newCaptionText.trim(),
      startMs,
      durationMs: this.newCaptionDuration * 1000,
      style:      this.newCaptionStyle
    };
    this.captions = [...this.captions, caption].sort((a, b) => a.startMs - b.startMs);
    this.saveCaptions();
    this.newCaptionText = '';
    this.showAddCaption = false;
    this.computeActiveCaptions();
  }

  cancelAddCaption(): void {
    this.newCaptionText = '';
    this.showAddCaption = false;
  }

  updateCaptionStartMs(caption: ClipCaption, sec: number): void {
    caption.startMs = Math.max(0, Math.min(this.clipDurationMs, Math.round(sec * 1000)));
    this.captions = [...this.captions].sort((a, b) => a.startMs - b.startMs);
    this.saveCaptions();
    this.computeActiveCaptions();
  }

  updateCaptionDuration(caption: ClipCaption, sec: number): void {
    caption.durationMs = Math.max(1000, Math.round(sec * 1000));
    this.saveCaptions();
    this.computeActiveCaptions();
  }

  updateCaptionText(caption: ClipCaption, text: string): void {
    caption.text = text;
    this.saveCaptions();
  }

  deleteCaption(id: string): void {
    this.captions = this.captions.filter(c => c.id !== id);
    this.saveCaptions();
    this.computeActiveCaptions();
  }

  seekToCaption(caption: ClipCaption): void {
    const absMs = this.event.startTimeMs + caption.startMs;
    this.shownAnnotations.clear();
    if (this.youtubeId && this.ytMiniPlayer && this.ytMiniReady) {
      this.ytMiniPlayer.seekTo(absMs / 1000, true);
    } else if (this.videoEl) {
      this.videoEl.currentTime = absMs / 1000;
    }
    this.currentRelMs = caption.startMs;
    this.computeActiveCaptions();
  }

  captionCssColor(style: CaptionStyle): string {
    return CAPTION_STYLE_CONFIG[style]?.color ?? '#ffffff';
  }

  captionIcon(style: CaptionStyle): string {
    return CAPTION_STYLE_CONFIG[style]?.icon ?? 'bi-chat-text-fill';
  }

  // ── Animated drawings (dibujos sobre vídeo en reproducción) ─────────────

  /** Dibujos animados activos en este instante (renderizados en animCanvas) */
  private _activeAnimEls: DrawingElement[] = [];

  /** Todos los drawings con startMs de todas las anotaciones */
  private get _allAnimatedEls(): DrawingElement[] {
    const els: DrawingElement[] = [];
    for (const ann of this.annotations) {
      for (const el of ann.drawingData || []) {
        if (el.startMs != null) els.push(el);
      }
    }
    return els;
  }

  /** Elemento seleccionado tiene animación configurada */
  get selectedElHasAnimation(): boolean {
    return this.getSelectedEl()?.startMs != null;
  }

  getSelectedEl(): DrawingElement | undefined {
    return this.drawingElements.find(e => e.id === this.selectedElementId);
  }

  annHasAnimatedDrawings(ann: ClipAnnotation): boolean {
    return (ann.drawingData || []).some(e => e.startMs != null);
  }

  /** Activa/desactiva la animación del elemento seleccionado */
  toggleElementAnimation(): void {
    const el = this.getSelectedEl();
    if (!el) return;
    this.undoStack.push(this.cloneElements());
    if (el.startMs != null) {
      // Desactivar: quitar timing
      delete el.startMs;
      delete el.animDurationMs;
    } else {
      // Activar: usar el tiempo del frame actual como startMs por defecto
      const frameRelMs = (this.editingAnnotation?.frameTimeMs ?? this.event.startTimeMs) - this.event.startTimeMs;
      el.startMs        = Math.max(0, frameRelMs);
      el.animDurationMs = 3000;
    }
    this.redrawCanvas();
  }

  setElementStartMs(ms: number): void {
    const el = this.getSelectedEl();
    if (!el) return;
    el.startMs = Math.max(0, Math.min(ms, this.clipDurationMs - (el.animDurationMs ?? 1000)));
    this.redrawCanvas();
  }

  setElementAnimDuration(ms: number): void {
    const el = this.getSelectedEl();
    if (!el) return;
    el.animDurationMs = Math.max(500, ms);
    this.redrawCanvas();
  }

  /** Si la anotación activa tiene pausa (frameDurationSec > 0) */
  get annotationPauses(): boolean {
    return this.frameDurationSec > 0;
  }

  /**
   * Activa/desactiva la pausa del vídeo en el frame de la anotación activa.
   * IMPORTANTE: actualiza frameDurationSec porque saveFrame() lo usa directamente
   * para escribir frameDurationMs (editingAnnotation es una copia, no la referencia real).
   */
  setAnnotationPauses(pause: boolean): void {
    if (!this.editingAnnotation) return;
    this.frameDurationSec = pause ? Math.max(1, this.frameDurationSec) : 0;
    this.editingAnnotation.frameDurationMs = this.frameDurationSec * 1000;
  }

  renderAnimatedDrawings(): void {
    const canvas = this.animCanvasRef?.nativeElement;
    const video  = this.videoEl;
    if (!canvas) return;

    const active = this._allAnimatedEls.filter(
      el => el.startMs! <= this.currentRelMs && this.currentRelMs < el.startMs! + (el.animDurationMs ?? 3000)
    );

    if (active.length === 0 && this._activeAnimEls.length === 0) return; // nada que hacer
    this._activeAnimEls = active;

    // Dimensionar canvas al tamaño del vídeo
    const W = video?.videoWidth  || canvas.width  || 1280;
    const H = video?.videoHeight || canvas.height || 720;
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width  = W;
      canvas.height = H;
    }

    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, W, H);

    if (active.length === 0) return;

    // Usar _fontPxScale = 1 porque este canvas se muestra a su resolución interna
    const savedScale = this._fontPxScale;
    this._fontPxScale = 1;

    const darkEls = active.filter(el => el.type === 'spotlight' || el.type === 'playerLine');
    for (const el of active) {
      if (el.type !== 'spotlight' && el.type !== 'playerLine') {
        this.renderElement(ctx, el, W, H);
      }
    }
    if (darkEls.length > 0) this.renderDarkLayer(ctx, darkEls, W, H);

    this._fontPxScale = savedScale;
  }

  /**
   * Para cada DrawingElement con startMs, renderiza un PNG transparente
   * a la resolución nativa del vídeo y devuelve el overlay con timing absoluto.
   * El PNG puede contener transparencia: se usa como overlay en el MP4 exportado.
   */
  async prepareAnimatedOverlays(): Promise<AnimatedDrawingOverlay[]> {
    const video = this.videoEl;
    const W = video?.videoWidth  || 1280;
    const H = video?.videoHeight || 720;
    const overlays: AnimatedDrawingOverlay[] = [];

    const savedScale = this._fontPxScale;
    this._fontPxScale = 1; // renderizar a resolución interna del vídeo

    for (const ann of this.annotations) {
      for (const el of ann.drawingData || []) {
        if (el.startMs == null) continue;

        const canvas = document.createElement('canvas');
        canvas.width  = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, W, H); // fondo transparente

        if (el.type === 'spotlight' || el.type === 'playerLine') {
          this.renderDarkLayer(ctx, [el], W, H);
        } else {
          this.renderElement(ctx, el, W, H);
        }

        overlays.push({
          pngDataUrl:  canvas.toDataURL('image/png'),
          startMsAbs:  el.startMs + this.event.startTimeMs,
          durationMs:  el.animDurationMs ?? 3000,
          width:       W,
          height:      H
        });
      }
    }

    this._fontPxScale = savedScale;
    return overlays;
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

    // ── TOP SPOTLIGHT: un solo clic coloca el cono ───────────────────────
    if (this.activeTool === 'topSpotlight') {
      this.undoStack.push(this.cloneElements());
      const r  = this.playerRadius * 2.5;            // base radius proporcional
      const h  = Math.min(pos.y, r * 4);             // altura del cono hacia arriba
      const el = this.newEl('topSpotlight', {
        x:      pos.x,
        y:      pos.y,
        radius: r,
        y2:     Math.max(0, pos.y - h)               // punta del cono (arriba)
      });
      this.drawingElements = [...this.drawingElements, el];
      this.redrawCanvas();
      return;
    }

    // ── PLAYER LINE: añadir punto en cada click ───────────────────────────
    if (this.activeTool === 'playerLine') {
      if (!this.playerLineInProgress) {
        this.undoStack.push(this.cloneElements());
        this.playerLineInProgress = this.newEl('playerLine', {
          points: [{ ...pos, r: this.playerRadius }],
          radius: this.playerRadius
        });
      } else {
        // Cada punto guarda su propio radio (perspectiva)
        this.playerLineInProgress.points!.push({ ...pos, r: this.playerRadius });
      }
      this.redrawCanvas();
      return;
    }

    // ── CURVED ARROW: 1.º click = inicio, mouse move = extremo, 2.º click = punto de control
    if (this.activeTool === 'curvedArrow') {
      if (this.curvedArrowPhase === 0) {
        this.isDrawing  = true;
        this.mouseStart = pos;
        this.currentElement = this.newEl('curvedArrow', { x: pos.x, y: pos.y, x2: pos.x, y2: pos.y, cpx: pos.x, cpy: pos.y });
        this.curvedArrowPhase = 1;
      } else if (this.curvedArrowPhase === 1) {
        // Finaliza la flecha curva en el release del ratón (ver onCanvasUp)
      }
      return;
    }

    this.isDrawing  = true;
    this.mouseStart = pos;

    if (this.activeTool === 'freeDraw') {
      this.currentElement = this.newEl('freeDraw', { points: [pos] });
    } else if (this.activeTool === 'circle' || this.activeTool === 'spotlight') {
      this.currentElement = this.newEl(this.activeTool, { x: pos.x, y: pos.y, radius: 0 });
    } else if (this.activeTool === 'filledZone') {
      this.currentElement = this.newEl('filledZone', { x: pos.x, y: pos.y, x2: pos.x, y2: pos.y, fillOpacity: 0.35 });
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

    // Player line preview
    if (this.activeTool === 'playerLine' && this.playerLineInProgress) {
      this.playerLinePreviewPos = pos;
      this.redrawCanvas();
      return;
    }

    // Draw drag
    if (!this.isDrawing || !this.currentElement) return;

    if (this.activeTool === 'freeDraw') {
      this.currentElement.points!.push(pos);
    } else if (this.activeTool === 'curvedArrow' && this.curvedArrowPhase === 1) {
      // Actualiza el extremo de la flecha curva mientras se arrastra
      this.currentElement!.x2 = pos.x;
      this.currentElement!.y2 = pos.y;
      // El punto de control sigue al centro por defecto
      this.currentElement!.cpx = (this.currentElement!.x! + pos.x) / 2;
      this.currentElement!.cpy = (this.currentElement!.y! + pos.y) / 2 - 10;
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

    // Player line: puntos se añaden en Down, no en Up
    if (this.activeTool === 'playerLine') return;

    // Curved arrow: al soltar se guarda el extremo y se finaliza
    if (this.activeTool === 'curvedArrow' && this.curvedArrowPhase === 1 && this.currentElement) {
      const dx = (this.currentElement.x2! - this.currentElement.x!);
      const dy = (this.currentElement.y2! - this.currentElement.y!);
      if (Math.sqrt(dx * dx + dy * dy) >= 1) {
        this.undoStack.push(this.cloneElements());
        this.drawingElements.push(this.currentElement);
      }
      this.currentElement = null;
      this.curvedArrowPhase = 0;
      this.isDrawing = false;
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

  /**
   * Convierte las coordenadas canvas% del texto a píxeles dentro del cae-canvas-wrap,
   * de modo que el overlay aparece exactamente encima del punto donde el usuario hizo clic.
   * Ajusta verticalmente para que la baseline coincida (restando ~fontSize CSS px).
   */
  get textInputLeft(): string {
    const canvas = this.drawCanvasRef?.nativeElement as HTMLCanvasElement;
    if (!canvas) return this.textCursorPct.x + '%';
    const cRect = canvas.getBoundingClientRect();
    const wRect = canvas.parentElement?.getBoundingClientRect();
    if (!wRect) return this.textCursorPct.x + '%';
    const leftPx = (cRect.left - wRect.left) + (this.textCursorPct.x / 100) * cRect.width;
    return leftPx + 'px';
  }

  get textInputTop(): string {
    const canvas = this.drawCanvasRef?.nativeElement as HTMLCanvasElement;
    if (!canvas) return this.textCursorPct.y + '%';
    const cRect = canvas.getBoundingClientRect();
    const wRect = canvas.parentElement?.getBoundingClientRect();
    if (!wRect) return this.textCursorPct.y + '%';
    // La baseline en canvas está en click_y. El texto se dibuja hacia ARRIBA desde la baseline.
    // El overlay tiene el texto empezando desde arriba: restamos fontSize para alinear.
    const topPx = (cRect.top - wRect.top) + (this.textCursorPct.y / 100) * cRect.height - this.fontSize;
    return topPx + 'px';
  }

  confirmText(): void {
    if (!this.textInputValue.trim()) { this.showTextInput = false; return; }
    const canvas = this.drawCanvasRef?.nativeElement as HTMLCanvasElement;
    // Guardar el tamaño en % de la altura del canvas para renderizado independiente de resolución
    const clientH     = canvas?.clientHeight || 400;
    const fontSizePct = (this.fontSize / clientH) * 100;
    this.undoStack.push(this.cloneElements());
    this.drawingElements.push(this.newEl('text', {
      x: this.textCursorPct.x, y: this.textCursorPct.y,
      text: this.textInputValue.trim(), fontSize: this.fontSize, fontSizePct
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

  /** Confirma la línea de jugadores en progreso (mínimo 2 puntos) */
  finalizePlayerLine(): void {
    if (!this.playerLineInProgress) return;
    if ((this.playerLineInProgress.points?.length ?? 0) >= 2) {
      this.drawingElements.push(this.playerLineInProgress);
    } else {
      this.undoStack.pop(); // revierte el undo guardado al inicio
    }
    this.playerLineInProgress = null;
    this.playerLinePreviewPos = null;
    this.redrawCanvas();
  }

  /** Cancela la línea de jugadores en progreso */
  cancelPlayerLine(): void {
    if (this.playerLineInProgress) {
      this.undoStack.pop();
    }
    this.playerLineInProgress = null;
    this.playerLinePreviewPos = null;
    this.redrawCanvas();
  }

  /** Elimina el último punto de la línea de jugadores en progreso (Backspace) */
  removeLastPlayerLinePoint(): void {
    if (!this.playerLineInProgress?.points?.length) return;
    this.playerLineInProgress.points = this.playerLineInProgress.points.slice(0, -1);
    if (this.playerLineInProgress.points.length === 0) {
      // Si no quedan puntos, cancelar
      this.cancelPlayerLine();
    } else {
      this.redrawCanvas();
    }
  }

  // ── Selection helpers ─────────────────────────────────────────────────────

  private hitTestEl(el: DrawingElement, pos: DrawingPoint): boolean {
    // Si el elemento está rotado, desrotamos la posición del mouse antes del hit test
    const rotation = (el.rotation || 0);
    let testPos = pos;
    if (rotation !== 0) {
      const bounds = this.getElementBoundsInPct(el);
      const angle  = -rotation * Math.PI / 180; // inverso
      testPos = this.rotatePt(pos.x, pos.y, bounds.cx, bounds.cy, angle);
    }
    const T = 2.5;
    switch (el.type) {
      case 'circle':
      case 'spotlight': {
        const dx = testPos.x - el.x!;
        const dy = testPos.y - el.y!;
        return Math.sqrt(dx * dx + dy * dy) <= (el.radius || 0) + T;
      }
      case 'arrow':
      case 'curvedArrow':
      case 'line':
      case 'dashedLine':
        return this.distToSegmentPct(testPos, { x: el.x!, y: el.y! }, { x: el.x2!, y: el.y2! }) < T;
      case 'filledZone': {
        const x1 = Math.min(el.x!, el.x2!), x2 = Math.max(el.x!, el.x2!);
        const y1 = Math.min(el.y!, el.y2!), y2 = Math.max(el.y!, el.y2!);
        return testPos.x >= x1 && testPos.x <= x2 && testPos.y >= y1 && testPos.y <= y2;
      }
      case 'playerLine': {
        if (!el.points?.length) return false;
        return el.points.some(p => this.distPct(testPos, p) <= (el.radius || 4) + T);
      }
      case 'freeDraw': {
        if (!el.points?.length) return false;
        const bbox = this.getBBox(el);
        return testPos.x >= bbox.x1 - T && testPos.x <= bbox.x2 + T &&
               testPos.y >= bbox.y1 - T && testPos.y <= bbox.y2 + T;
      }
      case 'topSpotlight': {
        const r    = el.radius || 5;
        const tipY = el.y2 !== undefined ? el.y2 : (el.y! - r * 4);
        const yBot = el.y!, yTop = tipY;
        if (testPos.y < Math.min(yTop, yBot) - T || testPos.y > Math.max(yTop, yBot) + T) return false;
        const height = Math.abs(yBot - yTop) || 1;
        // El cono va de punta (arriba) a base ancha (abajo)
        const frac     = (testPos.y - yTop) / (yBot - yTop);
        const halfW    = r * Math.max(0, frac);
        return Math.abs(testPos.x - el.x!) <= halfW + T;
      }
      case 'text': {
        const dx = testPos.x - (el.x || 0);
        const dy = testPos.y - (el.y || 0);
        return Math.abs(dx) < 12 && dy < 2 && dy > -8;
      }
    }
    return false;
  }

  /** Returns handle positions in canvas-% for the given element. */
  private getHandlesPct(el: DrawingElement): Array<DrawingPoint & { idx: number }> {
    const angle  = ((el.rotation || 0) * Math.PI) / 180;
    const bounds = this.getElementBoundsInPct(el);
    const { cx, cy } = bounds;
    // Rota un punto alrededor del centro del elemento para los handles
    const rot = (px: number, py: number) => this.rotatePt(px, py, cx, cy, angle);

    // Handle de rotación (por encima): idx = 100
    const rotHandle = { ...rot(cx, bounds.y1 - 8), idx: 100 };

    // 4 corners de escala: TL=101, TR=102, BL=103, BR=104
    const corners = [
      { ...rot(bounds.x1, bounds.y1), idx: 101 },
      { ...rot(bounds.x2, bounds.y1), idx: 102 },
      { ...rot(bounds.x1, bounds.y2), idx: 103 },
      { ...rot(bounds.x2, bounds.y2), idx: 104 },
    ];

    // Handles específicos por tipo (para edición de forma)
    let typeHandles: Array<DrawingPoint & { idx: number }> = [];
    switch (el.type) {
      case 'circle':
      case 'spotlight':
        // centro + borde (resize radio)
        typeHandles = [
          { ...rot(el.x!, el.y!), idx: 0 },
          { ...rot(el.x! + (el.radius || 0), el.y!), idx: 1 }
        ];
        break;
      case 'arrow': case 'curvedArrow': case 'line': case 'dashedLine':
        typeHandles = [
          { ...rot(el.x!, el.y!), idx: 0 },
          { ...rot(el.x2!, el.y2!), idx: 1 }
        ];
        break;
      case 'playerLine': {
        const pts = el.points || [];
        // Handles de centro (mover): idx = i
        const centers = pts.map((p, i) => ({ x: p.x, y: p.y, idx: i }));
        // Handles de borde (resize radio): idx = pts.length + i
        const edges = pts.map((p, i) => ({
          x: p.x + (p.r ?? el.radius ?? this.playerRadius),
          y: p.y,
          idx: pts.length + i
        }));
        return [...centers, ...edges];
      }
      case 'topSpotlight': {
        const r    = el.radius || 5;
        const tipY = el.y2 !== undefined ? el.y2 : (el.y! - r * 4);
        typeHandles = [
          { ...rot(el.x!, el.y!), idx: 0 },           // base center (mover)
          { ...rot(el.x! + r, el.y!), idx: 1 },        // borde derecho (radio)
          { ...rot(el.x!, tipY),      idx: 2 }          // punta del cono (altura)
        ];
        break;
      }
      case 'text':
        typeHandles = [{ ...rot(el.x!, el.y!), idx: 0 }];
        break;
      default:
        break;
    }

    return [rotHandle, ...corners, ...typeHandles];
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
      // ── Handle universal: rotación (idx 100) ──────────────────────────────
      if (handleIdx === 100) {
        const bounds = this.getElementBoundsInPct(orig);
        const angle1 = Math.atan2(startPct.y - bounds.cy, startPct.x - bounds.cx);
        const angle2 = Math.atan2(currPct.y - bounds.cy, currPct.x - bounds.cx);
        const delta  = (angle2 - angle1) * (180 / Math.PI);
        r.rotation = ((orig.rotation || 0) + delta + 360) % 360;
        return r;
      }

      // ── Handles de escala (idx 101-104): escalar respecto al corner opuesto ─
      if (handleIdx >= 101 && handleIdx <= 104) {
        const bounds = this.getElementBoundsInPct(orig);
        // Corner opuesto al que se arrastra
        const oppMap: Record<number, { ox: number; oy: number }> = {
          101: { ox: bounds.x2, oy: bounds.y2 }, // TL → opp = BR
          102: { ox: bounds.x1, oy: bounds.y2 }, // TR → opp = BL
          103: { ox: bounds.x2, oy: bounds.y1 }, // BL → opp = TR
          104: { ox: bounds.x1, oy: bounds.y1 }, // BR → opp = TL
        };
        const opp = oppMap[handleIdx];
        const origW = Math.abs(bounds.x2 - bounds.x1) || 1;
        const origH = Math.abs(bounds.y2 - bounds.y1) || 1;
        const newW  = Math.abs(currPct.x - opp.ox);
        const newH  = Math.abs(currPct.y - opp.oy);
        const sx    = newW / origW;
        const sy    = newH / origH;
        const scale = (v: number, origin: number, s: number) => origin + (v - origin) * s;

        // Texto: escalar fontSizePct (y fontSize como fallback)
        if (r.type === 'text') {
          const uniformScale = (sx + sy) / 2;
          // fontSizePct tiene prioridad — escalar siempre ambos para mantener consistencia
          if (r.fontSizePct != null) {
            r.fontSizePct = Math.max(0.2, r.fontSizePct * uniformScale);
          }
          r.fontSize = Math.max(6, Math.round((r.fontSize || 20) * uniformScale));
          // Mantener la posición del corner opuesto fija desplazando el ancla (x,y)
          if (r.x !== undefined) r.x = scale(r.x, opp.ox, sx);
          if (r.y !== undefined) r.y = scale(r.y, opp.oy, sy);
          return r;
        }

        // Resto de elementos: escalar coordenadas
        if (r.x  !== undefined) r.x  = scale(r.x,  opp.ox, sx);
        if (r.y  !== undefined) r.y  = scale(r.y,  opp.oy, sy);
        if (r.x2 !== undefined) r.x2 = scale(r.x2, opp.ox, sx);
        if (r.y2 !== undefined) r.y2 = scale(r.y2, opp.oy, sy);
        if (r.radius !== undefined) r.radius = Math.max(0.5, r.radius * ((sx + sy) / 2));
        if (r.points) r.points = r.points.map(p => ({ x: scale(p.x, opp.ox, sx), y: scale(p.y, opp.oy, sy) }));
        return r;
      }

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
        case 'curvedArrow':
        case 'line':
        case 'dashedLine':
        case 'filledZone':
          if (handleIdx === 0) { r.x  = (r.x  || 0) + dx; r.y  = (r.y  || 0) + dy; }
          else                 { r.x2 = (r.x2 || 0) + dx; r.y2 = (r.y2 || 0) + dy; }
          break;
        case 'playerLine': {
          const nPts = r.points?.length || 0;
          if (handleIdx < nPts) {
            // Mover círculo individual (mantener su radio propio)
            r.points = r.points!.map((p, i) =>
              i === handleIdx ? { ...p, x: p.x + dx, y: p.y + dy } : p
            );
          } else {
            // Redimensionar radio del círculo individual (handle de borde)
            const ptIdx = handleIdx - nPts;
            if (r.points && ptIdx < r.points.length) {
              const pt = r.points[ptIdx];
              const newRadius = Math.max(1, this.distPct(currPct, { x: pt.x, y: pt.y }));
              r.points = r.points.map((p, i) =>
                i === ptIdx ? { ...p, r: newRadius } : p
              );
            }
          }
          break;
        }
        case 'topSpotlight':
          if (handleIdx === 0) {
            // Mover base + mantener offset relativo de la punta
            const tipY0  = orig.y2 !== undefined ? orig.y2 : (orig.y! - (orig.radius || 5) * 4);
            const offset = tipY0 - orig.y!;
            r.x  = (r.x  || 0) + dx;
            r.y  = (r.y  || 0) + dy;
            r.y2 = r.y! + offset;
          } else if (handleIdx === 1) {
            // Cambiar radio de la base
            r.radius = Math.max(1, Math.abs(currPct.x - (r.x || 0)));
          } else if (handleIdx === 2) {
            // Mover la punta (ajustar altura del cono)
            r.y2 = currPct.y;
          }
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

  /** Bounding box de un elemento en espacio % (sin rotación) */
  private getElementBoundsInPct(el: DrawingElement): { cx: number; cy: number; x1: number; y1: number; x2: number; y2: number } {
    switch (el.type) {
      case 'circle':
      case 'spotlight': {
        const r = el.radius || 0;
        return { cx: el.x!, cy: el.y!, x1: el.x! - r, y1: el.y! - r, x2: el.x! + r, y2: el.y! + r };
      }
      case 'arrow': case 'curvedArrow': case 'line': case 'dashedLine': case 'filledZone': {
        const x1 = Math.min(el.x!, el.x2!), x2 = Math.max(el.x!, el.x2!);
        const y1 = Math.min(el.y!, el.y2!), y2 = Math.max(el.y!, el.y2!);
        return { cx: (x1 + x2) / 2, cy: (y1 + y2) / 2, x1, y1, x2, y2 };
      }
      case 'freeDraw': case 'playerLine': {
        const b = this.getBBox(el);
        return { cx: b.cx, cy: b.cy, x1: b.x1, y1: b.y1, x2: b.x2, y2: b.y2 };
      }
      case 'topSpotlight': {
        const r    = el.radius || 5;
        const tipY = el.y2 !== undefined ? el.y2 : (el.y! - r * 4);
        const y1   = Math.min(tipY, el.y!);
        const y2   = Math.max(tipY, el.y!);
        return { cx: el.x!, cy: (y1 + y2) / 2, x1: el.x! - r, y1, x2: el.x! + r, y2 };
      }
      case 'text': {
        const canvasEl  = this.drawCanvasRef?.nativeElement as HTMLCanvasElement | undefined;
        const canvasW   = canvasEl?.width  || 1920;
        const canvasH   = canvasEl?.height || 1080;
        // Tamaño de fuente en píxeles internos del canvas
        const fontPxCanvas = el.fontSizePct != null
          ? el.fontSizePct * canvasH / 100
          : (el.fontSize || 20) * this._fontPxScale;
        // Convertir a % del sistema de coordenadas de almacenamiento
        const fontH_pct = fontPxCanvas / canvasH * 100;
        const charW_pct = fontPxCanvas * 0.58 / canvasW * 100;
        const wPct      = Math.min(85, charW_pct * (el.text?.length || 5));
        return {
          cx: el.x! + wPct / 2,
          cy: el.y! - fontH_pct / 2,
          x1: el.x!,
          y1: el.y! - fontH_pct,
          x2: el.x! + wPct,
          y2: el.y! + fontH_pct * 0.15,
        };
      }
      default:
        return { cx: 0, cy: 0, x1: 0, y1: 0, x2: 0, y2: 0 };
    }
  }

  /**
   * Rota un punto (px, py) alrededor del centro (cx, cy) por `angle` radianes.
   * Trabaja en espacio mixto (%,%), pero la escala x/y puede diferir en píxeles.
   * Para los handles visuales aplicamos la corrección de aspecto (ar = W/H).
   */
  private rotatePt(px: number, py: number, cx: number, cy: number, angle: number, ar = 1): DrawingPoint {
    const dx = (px - cx) * ar, dy = py - cy;
    return {
      x: cx + (dx * Math.cos(angle) - dy * Math.sin(angle)) / ar,
      y: cy + (dx * Math.sin(angle) + dy * Math.cos(angle))
    };
  }

  /** Convierte un color hex (#rrggbb o #rgb) a rgba(r,g,b,alpha) para gradientes */
  private hexToRgba(color: string, alpha: number): string {
    if (color.startsWith('#')) {
      let h = color.slice(1);
      if (h.length === 3) h = h.split('').map(c => c + c).join('');
      const r = parseInt(h.substring(0, 2), 16);
      const g = parseInt(h.substring(2, 4), 16);
      const b = parseInt(h.substring(4, 6), 16);
      if (!isNaN(r)) return `rgba(${r},${g},${b},${alpha})`;
    }
    // fallback para rgb()
    return color.replace(/rgb\(/, 'rgba(').replace(')', `,${alpha})`);
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

  /**
   * Factor de escala para fontSize: convierte px CSS (como se muestra en el input)
   * a px del canvas interno, de forma que el texto se vea del mismo tamaño visual.
   * Se recalcula en cada redraw porque el canvas puede redimensionarse.
   */
  private _fontPxScale = 1;

  private redrawCanvas(): void {
    const canvas = this.drawCanvasRef?.nativeElement;
    if (!canvas || !this.bgImage) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width, H = canvas.height;

    // Actualizar escala: canvas interno vs tamaño de display real
    const displayH = canvas.clientHeight || H;
    this._fontPxScale = displayH > 0 ? H / displayH : 1;

    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(this.bgImage, 0, 0, W, H);

    // Incluir: elementos guardados + elemento en curso + playerLine en progreso
    const committed = this.drawingElements;
    const inProgress = this.currentElement ? [this.currentElement] : [];
    const playerLineEl = this.playerLineInProgress ? [this.playerLineInProgress] : [];
    const all = [...committed, ...inProgress, ...playerLineEl];

    // Elementos que requieren capa oscura compartida: spotlight + playerLine
    const darkLayerEls = all.filter(el => el.type === 'spotlight' || el.type === 'playerLine');
    // El resto se dibuja directamente
    for (const el of all) {
      if (el.type !== 'spotlight' && el.type !== 'playerLine') {
        this.renderElement(ctx, el, W, H);
      }
    }

    // Capa oscura única con todos los agujeros (spotlights + jugadores del playerLine)
    if (darkLayerEls.length > 0) {
      this.renderDarkLayer(ctx, darkLayerEls, W, H);
    }

    // Preview de playerLine: línea discontinua hasta la posición actual del ratón
    if (this.playerLineInProgress && this.playerLinePreviewPos && this.playerLineInProgress.points!.length > 0) {
      const pts0 = this.playerLineInProgress.points!;
      const lastPt = pts0[pts0.length - 1];
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = this.playerLineInProgress.color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(lastPt.x * W / 100, lastPt.y * H / 100);
      ctx.lineTo(this.playerLinePreviewPos.x * W / 100, this.playerLinePreviewPos.y * H / 100);
      ctx.stroke();
      ctx.restore();
    }

    // Selection handles
    if (this.selectedElementId && this.activeTool === 'select') {
      const sel = this.drawingElements.find(e => e.id === this.selectedElementId);
      if (sel) this.renderSelectionHandles(ctx, sel, W, H);
    }
  }

  /**
   * Renderiza UNA SOLA capa oscura compartida con agujeros para:
   *  - spotlight: círculo grande con agujero
   *  - playerLine: círculos de jugador en cada punto + líneas de conexión encima
   * Usa canvas offscreen para no borrar la imagen de fondo del canvas principal.
   */
  private renderDarkLayer(ctx: CanvasRenderingContext2D, els: DrawingElement[], W: number, H: number): void {
    const px = (p: number) => p * W / 100;
    const py = (p: number) => p * H / 100;

    const offscreen = document.createElement('canvas');
    offscreen.width  = W;
    offscreen.height = H;
    const off = offscreen.getContext('2d')!;

    off.fillStyle = 'rgba(0,0,0,0.65)';
    off.fillRect(0, 0, W, H);

    off.globalCompositeOperation = 'destination-out';

    for (const el of els) {
      if (el.type === 'spotlight') {
        const sx = px(el.x!), sy = py(el.y!), sr = px(el.radius || 10);
        off.beginPath();
        off.arc(sx, sy, sr, 0, 2 * Math.PI);
        off.fill();
      } else if (el.type === 'playerLine' && el.points?.length) {
        for (const p of el.points) {
          const pr = px(p.r ?? el.radius ?? this.playerRadius);
          off.beginPath();
          off.arc(px(p.x), py(p.y), pr, 0, 2 * Math.PI);
          off.fill();
        }
      }
    }

    off.globalCompositeOperation = 'source-over';
    ctx.drawImage(offscreen, 0, 0);

    // Bordes y líneas de conexión encima de la capa oscura
    ctx.save();
    for (const el of els) {
      ctx.strokeStyle = el.color;
      ctx.lineWidth   = el.strokeWidth + 1;

      if (el.type === 'spotlight') {
        const sx = px(el.x!), sy = py(el.y!), sr = px(el.radius || 10);
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (el.type === 'playerLine' && el.points?.length) {
        const pts = el.points;

        // Líneas de conexión entre jugadores
        ctx.lineWidth = el.strokeWidth;
        ctx.beginPath();
        ctx.moveTo(px(pts[0].x), py(pts[0].y));
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(px(pts[i].x), py(pts[i].y));
        }
        ctx.stroke();

        // Bordes de los círculos de jugador (radio individual)
        ctx.lineWidth = el.strokeWidth + 1;
        for (const p of pts) {
          const pr = px(p.r ?? el.radius ?? this.playerRadius);
          ctx.beginPath();
          ctx.arc(px(p.x), py(p.y), pr, 0, 2 * Math.PI);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  private renderSelectionHandles(ctx: CanvasRenderingContext2D, el: DrawingElement, W: number, H: number): void {
    const px = (p: number) => p * W / 100;
    const py = (p: number) => p * H / 100;
    const HR = 6;
    const RAD_HR = 8; // radio del handle de rotación
    const angle = ((el.rotation || 0) * Math.PI) / 180;
    const bounds = this.getElementBoundsInPct(el);
    const cxPx = px(bounds.cx), cyPx = py(bounds.cy);
    const ar = W / H; // aspect ratio para corregir la rotación en espacio %

    ctx.save();
    ctx.translate(cxPx, cyPx);
    ctx.rotate(angle);
    ctx.translate(-cxPx, -cyPx);

    // ── Bounding box punteado ──────────────────────────────────────────────
    ctx.setLineDash([5, 3]);
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 1.5;

    if (el.type === 'circle' || el.type === 'spotlight') {
      ctx.beginPath();
      ctx.arc(px(el.x!), py(el.y!), px(el.radius || 0) + 5, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (el.type === 'playerLine') {
      // para playerLine no hay bbox estándar, solo los handles individuales
    } else {
      const bx1 = px(bounds.x1) - 5, by1 = py(bounds.y1) - 5;
      const bw  = px(bounds.x2) - px(bounds.x1) + 10;
      const bh  = py(bounds.y2) - py(bounds.y1) + 10;
      ctx.strokeRect(bx1, by1, bw, bh);
    }
    ctx.setLineDash([]);

    // ── Handle de rotación (por encima del bbox) ───────────────────────────
    if (el.type !== 'playerLine') {
      const rhY = py(bounds.y1) - 28;
      ctx.beginPath();
      ctx.moveTo(cxPx, py(bounds.y1) - 5);
      ctx.lineTo(cxPx, rhY);
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Círculo dorado = handle de rotación
      ctx.beginPath();
      ctx.arc(cxPx, rhY, RAD_HR, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffd700';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // ── Handles de escala/movimiento (blancos) ────────────────────────────
    const handles = this.getHandlesPct(el);
    const nPts    = el.type === 'playerLine' ? (el.points?.length || 0) : 0;

    for (const h of handles) {
      if (h.idx === 100) continue; // rotación ya dibujado
      const hpx = px(h.x), hpy = py(h.y);

      if (el.type === 'playerLine' && h.idx >= nPts) {
        // Handle de resize de círculo jugador → pequeño círculo naranja
        ctx.beginPath();
        ctx.arc(hpx, hpy, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#ff9f43';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (h.idx >= 101) {
        // Corners universales de escala → cuadrados blancos
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2;
        ctx.fillRect(hpx - HR, hpy - HR, HR * 2, HR * 2);
        ctx.strokeRect(hpx - HR, hpy - HR, HR * 2, HR * 2);
      } else {
        // Handle de centro (mover) → círculo blanco
        ctx.beginPath();
        ctx.arc(hpx, hpy, HR, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
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

    // Aplicar rotación alrededor del centro del elemento
    if (el.rotation && el.rotation !== 0) {
      const bounds = this.getElementBoundsInPct(el);
      const cxPx = bounds.cx * W / 100;
      const cyPx = bounds.cy * H / 100;
      ctx.translate(cxPx, cyPx);
      ctx.rotate(el.rotation * Math.PI / 180);
      ctx.translate(-cxPx, -cyPx);
    }

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

      case 'text': {
        // fontSizePct (% de H) tiene prioridad — garantiza tamaño consistente
        // independientemente de la resolución del canvas. Fallback: CSS px × scale.
        const scaledFont = el.fontSizePct != null
          ? Math.round(el.fontSizePct * H / 100)
          : Math.round((el.fontSize || 20) * this._fontPxScale);
        ctx.font        = `bold ${scaledFont}px Arial, sans-serif`;
        ctx.fillStyle   = el.color;
        ctx.strokeStyle = el.color === '#ffffff' ? '#000000' : '#ffffff';
        ctx.lineWidth   = Math.max(1, scaledFont * 0.04);
        ctx.textBaseline = 'alphabetic';
        ctx.textAlign    = 'left';
        ctx.strokeText(el.text || '', px(el.x!), py(el.y!));
        ctx.fillText(el.text || '', px(el.x!), py(el.y!));
        break;
      }

      case 'spotlight':
      case 'playerLine':
        // Gestionados por renderDarkLayer() en redrawCanvas().
        break;

      case 'curvedArrow': {
        const cpx = px(el.cpx ?? (el.x! + el.x2!) / 2);
        const cpy = py(el.cpy ?? (el.y! + el.y2!) / 2 - 10);
        const x1 = px(el.x!), y1 = py(el.y!), x2 = px(el.x2!), y2 = py(el.y2!);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(cpx, cpy, x2, y2);
        ctx.stroke();
        // Cabeza de flecha en el extremo
        const dx = x2 - cpx, dy = y2 - cpy;
        const angle = Math.atan2(dy, dx);
        const hl = Math.max(12, el.strokeWidth * 4);
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - hl * Math.cos(angle - Math.PI / 6), y2 - hl * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(x2 - hl * Math.cos(angle + Math.PI / 6), y2 - hl * Math.sin(angle + Math.PI / 6));
        ctx.closePath(); ctx.fill();
        break;
      }

      case 'filledZone': {
        const x1 = px(Math.min(el.x!, el.x2!));
        const y1 = py(Math.min(el.y!, el.y2!));
        const rw = px(Math.abs(el.x2! - el.x!));
        const rh = py(Math.abs(el.y2! - el.y!));
        ctx.globalAlpha = el.fillOpacity ?? 0.35;
        ctx.fillStyle = el.color;
        ctx.fillRect(x1, y1, rw, rh);
        ctx.globalAlpha = 1;
        ctx.strokeRect(x1, y1, rw, rh);
        break;
      }

      case 'topSpotlight': {
        // Cono de luz de estadio: punta arriba, base elipse abajo
        const bx   = px(el.x!);
        const by   = py(el.y!);
        const rx   = px(el.radius || 5);              // radio horizontal de la base
        const ry   = rx * 0.28;                       // radio vertical (elipse plana, perspectiva)
        const tipY = el.y2 !== undefined
          ? py(el.y2)
          : by - rx * 4;                              // punta del cono

        // ── Relleno del cono (gradiente transparente arriba → color abajo) ──
        const grad = ctx.createLinearGradient(bx, tipY, bx, by);
        grad.addColorStop(0,    'transparent');
        grad.addColorStop(0.55, this.hexToRgba(el.color, 0.12));
        grad.addColorStop(1,    this.hexToRgba(el.color, 0.38));

        ctx.beginPath();
        ctx.moveTo(bx, tipY);                         // punta
        ctx.lineTo(bx - rx, by);                      // borde izquierdo de la base
        // Arco inferior de la elipse (de izq. a der. pasando por la parte baja)
        ctx.ellipse(bx, by, rx, ry, 0, Math.PI, 0, false);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // ── Líneas laterales del cono (semitransparentes) ──────────────────
        ctx.globalAlpha = 0.55;
        ctx.lineWidth   = Math.max(1, el.strokeWidth);
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = el.color;
        ctx.beginPath();
        ctx.moveTo(bx, tipY);
        ctx.lineTo(bx - rx, by);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bx, tipY);
        ctx.lineTo(bx + rx, by);
        ctx.stroke();

        // ── Elipse de la base (más opaca = zona iluminada en el suelo) ─────
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.9;
        ctx.lineWidth   = el.strokeWidth;
        ctx.beginPath();
        ctx.ellipse(bx, by, rx, ry, 0, 0, 2 * Math.PI);
        ctx.stroke();

        // Relleno semiopaco de la elipse base
        ctx.globalAlpha = 0.3;
        ctx.fillStyle   = el.color;
        ctx.fill();

        // ── Brillo central (estrella pequeña en la base) ───────────────────
        ctx.globalAlpha = 0.6;
        const starR = rx * 0.15;
        ctx.beginPath();
        ctx.arc(bx, by, starR, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.globalAlpha = 1;
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

    console.warn(`[CAE Download] START — youtubeId=${this.youtubeId}, videoFile=${!!this.videoFile}, annotations=${this.annotations.length}`);

    try {
      if (this.youtubeId) {
        // ── YouTube: grabación de pantalla del mini-player ──
        await this.downloadYouTubeClip(label);
      } else if (this.videoFile) {
        // ── Local: FFmpeg ──
        // Preparar dibujos animados como PNG overlay (independiente de si hay freeze frames)
        this.downloadStep = 'Preparando dibujos animados…';
        const animOverlays = await this.prepareAnimatedOverlays();
        console.warn(`[CAE Download] animOverlays: ${animOverlays.length}`,
          animOverlays.map(o => ({ startMsAbs: o.startMsAbs, durationMs: o.durationMs, W: o.width, H: o.height })));
        console.warn(`[CAE Download] annotations: ${this.annotations.length}`,
          this.annotations.map(a => ({ frameTimeMs: a.frameTimeMs, drawingData: a.drawingData?.map(d => ({ id: d.id, type: d.type, startMs: d.startMs })) })));

        if (!this.annotations.length && !animOverlays.length) {
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
            animOverlays,
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

}
