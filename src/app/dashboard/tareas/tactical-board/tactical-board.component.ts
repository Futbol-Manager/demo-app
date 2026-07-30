import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ViewChild, ElementRef, HostListener, Input, Output, EventEmitter
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import Konva from 'konva';
import { gsap } from 'gsap';
import { TrainingService } from 'src/app/core/services/training/training.service';
import { TutorialService } from 'src/app/core/services/tutorial/tutorial.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { getSportConfig, SportConfig } from 'src/app/core/models/sport/sport-config.model';
import {
  SportElementDef,
  getCommonElements,
  getSportSpecificElements,
  findSportElementDef,
} from './sport-element.registry';

/* ──────────────── Interfaces ──────────────── */
interface PlayerMarker {
  id: string;
  group: Konva.Group;
  circle: Konva.Circle | null;
  label: Konva.Text;
  team: 'ball' | 'color';
  color: string;
  number: string;
}

interface Keyframe {
  id: number;
  label: string;
  positions: { [markerId: string]: { x: number; y: number } };
  drawings: string;
}

interface UndoState {
  drawJSON: string;
  markers: Array<{ id: string; team: 'ball' | 'color'; color: string; number: string; x: number; y: number }>;
  ballPlaced: boolean;
  nextPlayerNumber: number;
}

type ToolType = 'select' | 'pencil' | 'line' | 'arrow' | 'rect' | 'ellipse' | 'text' | 'eraser' | 'double-arrow' | 'curved-arrow' | 'polygon';

@Component({
  selector: 'app-tactical-board',
  templateUrl: './tactical-board.component.html',
  styleUrls: ['./tactical-board.component.scss']
})
export class TacticalBoardComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('boardContainer', { static: false }) boardContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('addPlayerBtn', { static: false }) addPlayerBtn!: ElementRef<HTMLButtonElement>;

  /** Modo tarea: la pizarra se abre embebida desde el editor de tarea */
  @Input() taskMode: boolean = false;
  @Input() taskId: number = 0;
  @Input() trainingId: number = 0;
  @Input() userId: number = 0;
  @Input() sport: string = 'futbol';
  @Output() imagenGuardada = new EventEmitter<string>();
  @Output() archivoGenerado = new EventEmitter<File>();
  @Output() cerrar = new EventEmitter<void>();

  sportConfig: SportConfig = getSportConfig('futbol');
  commonElements: SportElementDef[] = [];
  sportSpecificElements: SportElementDef[] = [];

  savingTask: boolean = false;
  saveTaskError: string = '';
  saveTaskSuccess: boolean = false;

  /* ── state ── */
  teamId = 0;
  activeTool: ToolType = 'select';
  strokeColor = '#ffffff';
  strokeWidth = 3;
  showColorPicker = false;
  showPlayerPanel = false;
  pitchStyle: 'full' | 'half' | 'blank' = 'full';

  /* player config */
  ballPlaced = false;
  playerColor = '#2979ff';
  nextPlayerNumber = 1;
  showPlayerColorPicker = false;
  /** Posición del dropdown de colores (fixed respecto al viewport). */
  dropdownPosition = { top: 0, left: 0 };

  readonly PLAYER_COLORS = [
    '#2979ff', '#ff1744', '#ffea00', '#00e676',
    '#ff9100', '#d500f9', '#00b0ff', '#ffffff',
    '#f50057', '#76ff03', '#ff6d00', '#e040fb'
  ];

  /* keyframe animation */
  keyframes: Keyframe[] = [];
  activeKeyframe = 0;
  isPlaying = false;
  animSpeed = 1;

  /* export */
  isExporting = false;
  exportProgress = 0;

  /* undo/redo */
  private undoStack: UndoState[] = [];
  private redoStack: UndoState[] = [];
  canUndo = false;
  canRedo = false;

  /* save/load state */
  hasUnsavedChanges = false;
  private initialStateHash = '';
  showExitConfirm = false;
  private readonly STORAGE_KEY_BOARD = 'tactical_board_autosave';
  private readonly STORAGE_KEY_META = 'tactical_board_metadata';
  showSaveSuccess = false;
  lastSavedTime: string | null = null;
  private isLoadingState = false;

  /* eraser drag */
  private eraserActive = false;

  /* rubber-band multi-select */
  private isSelecting = false;
  private selectionStartPos = { x: 0, y: 0 };
  private selectionRect: Konva.Rect | null = null;
  private selectedMarkers: PlayerMarker[] = [];

  /* ── Konva objects ── */
  private stage!: Konva.Stage;
  private pitchLayer!: Konva.Layer;
  private drawLayer!: Konva.Layer;
  private markerLayer!: Konva.Layer;
  private previewLayer!: Konva.Layer;
  private transformer!: Konva.Transformer;

  private markers: PlayerMarker[] = [];
  private isDrawing = false;
  private currentLine: Konva.Line | null = null;
  private currentShape: Konva.Shape | null = null;
  private drawStartPos = { x: 0, y: 0 };
  private selectedNode: Konva.Node | null = null;
  private selectedMarker: PlayerMarker | null = null;

  /* pitch dimensions (logical, then scaled) */
  private readonly PITCH_W = 1050;
  private readonly PITCH_H = 680;
  private scaleRatio = 1;
  private resizeObserver: ResizeObserver | null = null;

  /* colours for drawing tools */
  readonly COLORS = [
    '#ffffff', '#ff1744', '#2979ff', '#ffea00',
    '#00e676', '#ff9100', '#d500f9', '#000000'
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    public t: TranslateService,
    private trainingService: TrainingService,
    private tutorialService: TutorialService,
    private teamService: TeamService
  ) {}

  /* ────────────────── Lifecycle ────────────────── */
  ngOnInit(): void {
    setTimeout(() => this.tutorialService.start('tactical-board', true), 600);

    this.route.params.subscribe(p => {
      this.teamId = +p['teamId'] || 0;

      if (this.teamId) {
        this.teamService.getTeamById(String(this.teamId)).subscribe((res: any) => {
          const teamData = res?.data ?? res;
          if (teamData?.sport) {
            this.sport = teamData.sport;
          }
          this.refreshSportConfig();
          if (this.pitchLayer) {
            this.drawPitch();
          }
        });
      } else {
        this.refreshSportConfig();
      }
    });

    this.refreshSportConfig();
  }

  private refreshSportConfig(): void {
    this.sportConfig = getSportConfig(this.sport);
    this.commonElements = getCommonElements();
    this.sportSpecificElements = getSportSpecificElements(this.sport);
  }

  get ballEmoji(): string {
    const map: Record<string, string> = {
      futbol: '⚽', baloncesto: '🏀', balonmano: '🤾', voley: '🏐',
      'futbol-americano': '🏈', rugby: '🏉', 'futbol-sala': '⚽',
      hockey: '🏑', waterpolo: '🤽', beisbol: '⚾', 'hockey-hielo': '🏒'
    };
    return map[this.sport] || '⚽';
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initStage();
      this.loadAutosave();
      this.observeContainerResize();
    }, 0);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.stage) this.stage.destroy();
  }

  /** Ajusta el canvas cuando el contenedor cambia de tamaño (responsive / overlay) */
  private observeContainerResize(): void {
    if (!this.boardContainer?.nativeElement || typeof ResizeObserver === 'undefined') return;
    this.resizeObserver = new ResizeObserver(() => {
      if (this.stage && this.boardContainer) this.fitStage();
    });
    this.resizeObserver.observe(this.boardContainer.nativeElement);
    // En overlay/modal el contenedor puede recibir tamaño tras el layout; refit con un pequeño retraso
    if (this.taskMode) {
      [100, 250, 500].forEach(delay =>
        setTimeout(() => { if (this.stage && this.boardContainer) this.fitStage(); }, delay)
      );
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    this.fitStage();
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    /* Delete / Supr → remove selected element */
    if (e.key === 'Delete') {
      this.deleteSelected();
      e.preventDefault();
      return;
    }
    /* Ctrl+Z → undo */
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      this.undo();
      e.preventDefault();
      return;
    }
    /* Ctrl+Shift+Z or Ctrl+Y → redo */
    if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') ||
        ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
      this.redo();
      e.preventDefault();
      return;
    }
    /* Escape → deselect */
    if (e.key === 'Escape') {
      this.deselectAll();
    }
  }

  /* ────────────────── INIT ────────────────── */
  private initStage(): void {
    this.isLoadingState = true;

    const container = this.boardContainer.nativeElement;
    const w = Math.max(container.clientWidth || 0, 400);
    const h = Math.max(container.clientHeight || 0, 320);

    this.stage = new Konva.Stage({ container, width: w, height: h });
    // Mejora UX táctil: evita que el navegador haga scroll/zoom al arrastrar en la pizarra
    try {
      const el = this.stage.container();
      el.style.touchAction = 'none';
      (el.style as any).webkitUserSelect = 'none';
      el.style.userSelect = 'none';
      (el.style as any).webkitTouchCallout = 'none';
    } catch { /* noop */ }

    this.pitchLayer = new Konva.Layer();
    this.drawLayer = new Konva.Layer();
    this.markerLayer = new Konva.Layer();
    this.previewLayer = new Konva.Layer({ listening: false });

    this.stage.add(this.pitchLayer);
    this.stage.add(this.drawLayer);
    this.stage.add(this.markerLayer);
    this.stage.add(this.previewLayer);

    /* transformer for resizing drawn shapes */
    this.transformer = new Konva.Transformer({
      rotateEnabled: true,
      enabledAnchors: [
        'top-left', 'top-right', 'bottom-left', 'bottom-right',
        'middle-left', 'middle-right', 'top-center', 'bottom-center'
      ],
      borderStroke: '#00c853',
      borderStrokeWidth: 2,
      anchorStroke: '#00c853',
      anchorFill: '#ffffff',
      anchorSize: 8,
      anchorCornerRadius: 2,
      padding: 2,
      keepRatio: false
    });
    this.drawLayer.add(this.transformer);

    this.fitStage();
    this.drawPitch();
    this.bindDrawEvents();
    this.bindDragCursor();
    this.captureKeyframe(true);
    this.saveUndoState();
    this.initialStateHash = this.getCurrentStateHash();

    this.isLoadingState = false;
  }

  private fitStage(): void {
    if (!this.stage || !this.boardContainer) return;
    const container = this.boardContainer.nativeElement;
    const w = Math.max(container.clientWidth || 0, 400);
    const h = Math.max(container.clientHeight || 0, 320);
    this.scaleRatio = Math.min(w / this.PITCH_W, h / this.PITCH_H);
    this.stage.width(w);
    this.stage.height(h);
    const offsetX = (w - this.PITCH_W * this.scaleRatio) / 2;
    const offsetY = (h - this.PITCH_H * this.scaleRatio) / 2;
    [this.pitchLayer, this.drawLayer, this.markerLayer, this.previewLayer].forEach(l => {
      l.scale({ x: this.scaleRatio, y: this.scaleRatio });
      l.position({ x: offsetX, y: offsetY });
    });
    this.stage.batchDraw();
  }

  /* ────────────────── PITCH DRAWING ────────────────── */
  /* ─────────── Pitch background helpers ─────────── */

  /** Franjas verticales estilo césped rayado (fútbol, futsal, rugby, hockey hierba, NFL). */
  private addVerticalGrassStripes(stripCount: number, colorEven: string, colorOdd: string): void {
    const W = this.PITCH_W;
    const H = this.PITCH_H;
    const sw = W / stripCount;
    for (let i = 0; i < stripCount; i++) {
      this.pitchLayer.add(new Konva.Rect({ x: i * sw, y: 0, width: sw, height: H, fill: i % 2 === 0 ? colorEven : colorOdd, listening: false }));
    }
  }

  /** Fondo liso para deportes sin apariencia de césped rayado. */
  private addSolidPitchFill(fill: string): void {
    this.pitchLayer.add(new Konva.Rect({ x: 0, y: 0, width: this.PITCH_W, height: this.PITCH_H, fill, listening: false }));
  }

  private drawPitch(): void {
    this.pitchLayer.destroyChildren();
    if (this.pitchStyle === 'blank') { this.pitchLayer.batchDraw(); return; }

    switch (this.sport) {
      case 'baloncesto':        this.drawBasketballCourt();        break;
      case 'balonmano':         this.drawHandballCourt();          break;
      case 'voley':             this.drawVolleyballCourt();        break;
      case 'futbol-sala':       this.drawFutsalCourt();            break;
      case 'waterpolo':         this.drawWaterpoloCourt();         break;
      case 'rugby':             this.drawRugbyPitch();             break;
      case 'hockey':            this.drawHockeyCourt();            break;
      case 'hockey-hielo':      this.drawIceHockeyCourt();         break;
      case 'futbol-americano':  this.drawAmericanFootballField();  break;
      case 'beisbol':           this.drawBaseballField();          break;
      case 'futbol':
      default:                  this.drawFootballPitch();          break;
    }
  }

  // FIFA proportions: W=1050=105m, H=680=68m → 10px/m
  private drawFootballPitch(): void {
    const W = this.PITCH_W;
    const H = this.PITCH_H;
    const c = '#ffffff';
    const grass1 = '#2e7d32';
    const grass2 = '#388e3c';
    const ls = { stroke: c, strokeWidth: 2, listening: false };

    this.addVerticalGrassStripes(14, grass1, grass2);

    this.pitchLayer.add(new Konva.Rect({ x: 0, y: 0, width: W, height: H, ...ls, fill: 'transparent' }));
    this.pitchLayer.add(new Konva.Line({ points: [W / 2, 0, W / 2, H], ...ls }));
    this.pitchLayer.add(new Konva.Circle({ x: W / 2, y: H / 2, radius: 91, ...ls, fill: 'transparent' }));
    this.pitchLayer.add(new Konva.Circle({ x: W / 2, y: H / 2, radius: 4, fill: c, listening: false }));

    const paW = 165; const paH = 403; const paY = (H - paH) / 2;
    this.pitchLayer.add(new Konva.Rect({ x: 0, y: paY, width: paW, height: paH, ...ls, fill: 'rgba(255,255,255,0.03)' }));
    this.pitchLayer.add(new Konva.Rect({ x: W - paW, y: paY, width: paW, height: paH, ...ls, fill: 'rgba(255,255,255,0.03)' }));

    const gaW = 55; const gaH = 183; const gaY = (H - gaH) / 2;
    this.pitchLayer.add(new Konva.Rect({ x: 0, y: gaY, width: gaW, height: gaH, ...ls, fill: 'transparent' }));
    this.pitchLayer.add(new Konva.Rect({ x: W - gaW, y: gaY, width: gaW, height: gaH, ...ls, fill: 'transparent' }));

    this.pitchLayer.add(new Konva.Circle({ x: 110, y: H / 2, radius: 4, fill: c, listening: false }));
    this.pitchLayer.add(new Konva.Circle({ x: W - 110, y: H / 2, radius: 4, fill: c, listening: false }));

    this.pitchLayer.add(new Konva.Arc({ x: 110, y: H / 2, innerRadius: 91, outerRadius: 91, angle: 105, rotation: -52.5, ...ls }));
    this.pitchLayer.add(new Konva.Arc({ x: W - 110, y: H / 2, innerRadius: 91, outerRadius: 91, angle: 105, rotation: 127.5, ...ls }));

    [{ x: 0, y: 0, r: 0 }, { x: W, y: 0, r: 90 }, { x: W, y: H, r: 180 }, { x: 0, y: H, r: 270 }]
      .forEach(cn => this.pitchLayer.add(new Konva.Arc({ x: cn.x, y: cn.y, innerRadius: 10, outerRadius: 10, angle: 90, rotation: cn.r, ...ls })));

    const goalH = 73; const goalD = 24; const goalY = (H - goalH) / 2;
    this.pitchLayer.add(new Konva.Rect({ x: -goalD, y: goalY, width: goalD, height: goalH, stroke: '#cccccc', strokeWidth: 2, fill: 'rgba(255,255,255,0.1)', listening: false }));
    this.pitchLayer.add(new Konva.Rect({ x: W, y: goalY, width: goalD, height: goalH, stroke: '#cccccc', strokeWidth: 2, fill: 'rgba(255,255,255,0.1)', listening: false }));

    if (this.pitchStyle === 'half') {
      this.pitchLayer.add(new Konva.Rect({ x: 0, y: 0, width: W / 2, height: H, fill: grass1, listening: false }));
    }

    this.pitchLayer.batchDraw();
  }

  // NBA proportions: W=1050=28.65m, H=680=15.24m
  private drawBasketballCourt(): void {
    const W = this.PITCH_W;
    const H = this.PITCH_H;
    const c = '#ffffff';
    const orange = '#e65100';
    const parquet = '#b97228';
    const ls = { stroke: c, strokeWidth: 2, listening: false };
    const ols = { stroke: orange, strokeWidth: 2, listening: false };

    this.addSolidPitchFill(parquet);
    this.pitchLayer.add(new Konva.Rect({ x: 0, y: 0, width: W, height: H, ...ls, fill: 'transparent' }));
    this.pitchLayer.add(new Konva.Line({ points: [W / 2, 0, W / 2, H], ...ls }));

    const cR = 82;
    this.pitchLayer.add(new Konva.Circle({ x: W / 2, y: H / 2, radius: cR, ...ls, fill: 'transparent' }));
    this.pitchLayer.add(new Konva.Circle({ x: W / 2, y: H / 2, radius: 30, ...ls, fill: 'transparent' }));
    this.pitchLayer.add(new Konva.Circle({ x: W / 2, y: H / 2, radius: 4, fill: c, listening: false }));

    const keyH = 218; const keyW = 212; const keyY = (H - keyH) / 2;
    this.pitchLayer.add(new Konva.Rect({ x: 0, y: keyY, width: keyW, height: keyH, stroke: c, strokeWidth: 2, fill: 'rgba(160,80,10,0.28)', listening: false }));
    this.pitchLayer.add(new Konva.Rect({ x: W - keyW, y: keyY, width: keyW, height: keyH, stroke: c, strokeWidth: 2, fill: 'rgba(160,80,10,0.28)', listening: false }));

    const ftR = 82;
    this.pitchLayer.add(new Konva.Arc({ x: keyW, y: H / 2, innerRadius: ftR, outerRadius: ftR, angle: 180, rotation: -90, ...ls }));
    this.pitchLayer.add(new Konva.Arc({ x: keyW, y: H / 2, innerRadius: ftR, outerRadius: ftR, angle: 180, rotation: 90, stroke: c, strokeWidth: 2, dash: [8, 6], listening: false }));
    this.pitchLayer.add(new Konva.Arc({ x: W - keyW, y: H / 2, innerRadius: ftR, outerRadius: ftR, angle: 180, rotation: 90, ...ls }));
    this.pitchLayer.add(new Konva.Arc({ x: W - keyW, y: H / 2, innerRadius: ftR, outerRadius: ftR, angle: 180, rotation: -90, stroke: c, strokeWidth: 2, dash: [8, 6], listening: false }));

    const hashLen = 16;
    for (let i = 1; i <= 4; i++) {
      const hx = (keyW / 5) * i;
      [[hx, keyY - hashLen, hx, keyY], [hx, keyY + keyH, hx, keyY + keyH + hashLen],
       [W - hx, keyY - hashLen, W - hx, keyY], [W - hx, keyY + keyH, W - hx, keyY + keyH + hashLen]]
        .forEach(pts => this.pitchLayer.add(new Konva.Line({ points: pts, stroke: c, strokeWidth: 2, listening: false })));
    }

    const basketX = 57; const boardHalf = 28;
    const bxL = basketX + 20; const bxR = W - basketX - 20;
    this.pitchLayer.add(new Konva.Rect({ x: basketX - 2, y: H / 2 - boardHalf, width: 4, height: boardHalf * 2, stroke: orange, strokeWidth: 3, fill: 'rgba(230,81,0,0.15)', listening: false }));
    this.pitchLayer.add(new Konva.Circle({ x: bxL, y: H / 2, radius: 18, stroke: orange, strokeWidth: 3, fill: 'transparent', listening: false }));
    this.pitchLayer.add(new Konva.Rect({ x: W - basketX - 2, y: H / 2 - boardHalf, width: 4, height: boardHalf * 2, stroke: orange, strokeWidth: 3, fill: 'rgba(230,81,0,0.15)', listening: false }));
    this.pitchLayer.add(new Konva.Circle({ x: bxR, y: H / 2, radius: 18, stroke: orange, strokeWidth: 3, fill: 'transparent', listening: false }));

    const resR = 46;
    this.pitchLayer.add(new Konva.Arc({ x: bxL, y: H / 2, innerRadius: resR, outerRadius: resR, angle: 180, rotation: -90, ...ols }));
    this.pitchLayer.add(new Konva.Arc({ x: bxR, y: H / 2, innerRadius: resR, outerRadius: resR, angle: 180, rotation: 90, ...ols }));

    const threeR = 247; const cornerY = 41;
    this.pitchLayer.add(new Konva.Line({ points: [0, cornerY, bxL, cornerY], stroke: c, strokeWidth: 2, listening: false }));
    this.pitchLayer.add(new Konva.Line({ points: [0, H - cornerY, bxL, H - cornerY], stroke: c, strokeWidth: 2, listening: false }));
    this.pitchLayer.add(new Konva.Arc({ x: bxL, y: H / 2, innerRadius: threeR, outerRadius: threeR, angle: 128, rotation: -64, ...ls }));
    this.pitchLayer.add(new Konva.Line({ points: [W, cornerY, bxR, cornerY], stroke: c, strokeWidth: 2, listening: false }));
    this.pitchLayer.add(new Konva.Line({ points: [W, H - cornerY, bxR, H - cornerY], stroke: c, strokeWidth: 2, listening: false }));
    this.pitchLayer.add(new Konva.Arc({ x: bxR, y: H / 2, innerRadius: threeR, outerRadius: threeR, angle: 128, rotation: 116, ...ls }));

    this.pitchLayer.batchDraw();
  }

  // IHF proportions: W=1050=40m, H=680=20m
  private drawHandballCourt(): void {
    const W = this.PITCH_W;
    const H = this.PITCH_H;
    const courtBlue = '#1976d2';
    const c = '#ffffff';
    const ls = { stroke: c, strokeWidth: 2, listening: false };
    const dash9 = { stroke: c, strokeWidth: 2, dash: [12, 8], listening: false };

    this.addSolidPitchFill(courtBlue);
    this.pitchLayer.add(new Konva.Rect({ x: 0, y: 0, width: W, height: H, ...ls, fill: 'transparent' }));
    this.pitchLayer.add(new Konva.Line({ points: [W / 2, 0, W / 2, H], ...ls }));
    this.pitchLayer.add(new Konva.Circle({ x: W / 2, y: H / 2, radius: 51, ...ls, fill: 'transparent' }));

    const goalHalf = 51; const r6 = 157; const r9 = 236;
    const tp = H / 2 - goalHalf; const bp = H / 2 + goalHalf;

    this.pitchLayer.add(new Konva.Arc({ x: 0, y: tp, innerRadius: r6, outerRadius: r6, angle: 90, rotation: -90, ...ls }));
    this.pitchLayer.add(new Konva.Line({ points: [r6, tp, r6, bp], ...ls }));
    this.pitchLayer.add(new Konva.Arc({ x: 0, y: bp, innerRadius: r6, outerRadius: r6, angle: 90, rotation: 0, ...ls }));
    this.pitchLayer.add(new Konva.Arc({ x: W, y: tp, innerRadius: r6, outerRadius: r6, angle: 90, rotation: 180, ...ls }));
    this.pitchLayer.add(new Konva.Line({ points: [W - r6, tp, W - r6, bp], ...ls }));
    this.pitchLayer.add(new Konva.Arc({ x: W, y: bp, innerRadius: r6, outerRadius: r6, angle: 90, rotation: 90, ...ls }));

    this.pitchLayer.add(new Konva.Arc({ x: 0, y: tp, innerRadius: r9, outerRadius: r9, angle: 90, rotation: -90, ...dash9 }));
    this.pitchLayer.add(new Konva.Line({ points: [r9, tp, r9, bp], ...dash9 }));
    this.pitchLayer.add(new Konva.Arc({ x: 0, y: bp, innerRadius: r9, outerRadius: r9, angle: 90, rotation: 0, ...dash9 }));
    this.pitchLayer.add(new Konva.Arc({ x: W, y: tp, innerRadius: r9, outerRadius: r9, angle: 90, rotation: 180, ...dash9 }));
    this.pitchLayer.add(new Konva.Line({ points: [W - r9, tp, W - r9, bp], ...dash9 }));
    this.pitchLayer.add(new Konva.Arc({ x: W, y: bp, innerRadius: r9, outerRadius: r9, angle: 90, rotation: 90, ...dash9 }));

    this.pitchLayer.add(new Konva.Circle({ x: 184, y: H / 2, radius: 5, fill: c, listening: false }));
    this.pitchLayer.add(new Konva.Circle({ x: W - 184, y: H / 2, radius: 5, fill: c, listening: false }));
    this.pitchLayer.add(new Konva.Line({ points: [184, H / 2 - 34, 184, H / 2 + 34], stroke: c, strokeWidth: 2, dash: [8, 6], listening: false }));
    this.pitchLayer.add(new Konva.Line({ points: [W - 184, H / 2 - 34, W - 184, H / 2 + 34], stroke: c, strokeWidth: 2, dash: [8, 6], listening: false }));

    const sub = 118;
    [[W / 2 - sub, 0], [W / 2 + sub, 0], [W / 2 - sub, H - 12], [W / 2 + sub, H - 12]]
      .forEach(([x, y]) => this.pitchLayer.add(new Konva.Line({ points: [x, y as number, x, (y as number) + 12], ...ls })));

    const goalH2 = 102; const goalD2 = 22; const goalY2 = (H - goalH2) / 2;
    this.pitchLayer.add(new Konva.Rect({ x: -goalD2, y: goalY2, width: goalD2, height: goalH2, stroke: '#cccccc', strokeWidth: 3, fill: 'rgba(255,255,255,0.1)', listening: false }));
    this.pitchLayer.add(new Konva.Rect({ x: W, y: goalY2, width: goalD2, height: goalH2, stroke: '#cccccc', strokeWidth: 3, fill: 'rgba(255,255,255,0.1)', listening: false }));

    this.pitchLayer.batchDraw();
  }

  // FIVB: W=1050=24m, H=680=15m
  private drawVolleyballCourt(): void {
    const W = this.PITCH_W;
    const H = this.PITCH_H;
    const freeZone = '#283593';   // zona libre, tono más oscuro
    const court = '#3949ab';      // pista de juego (Taraflex)
    const c = '#ffffff';
    const ls = { stroke: c, strokeWidth: 2, listening: false };

    this.addSolidPitchFill(freeZone);

    const padX = 130; const padY = 136;
    const cW = W - 2 * padX; const cH = H - 2 * padY;
    this.pitchLayer.add(new Konva.Rect({ x: padX, y: padY, width: cW, height: cH, stroke: c, strokeWidth: 3, fill: court, listening: false }));

    const netX = W / 2;
    this.pitchLayer.add(new Konva.Line({ points: [netX, padY - 22, netX, padY + cH + 22], stroke: '#ffeb3b', strokeWidth: 5, listening: false }));

    const bandH = 8;
    for (let i = 0; i < 5; i++) {
      const col = i % 2 === 0 ? '#cc0000' : '#ffffff';
      this.pitchLayer.add(new Konva.Rect({ x: netX - 3, y: padY + i * bandH, width: 6, height: bandH, fill: col, listening: false }));
      this.pitchLayer.add(new Konva.Rect({ x: netX - 3, y: padY + cH - bandH * (i + 1), width: 6, height: bandH, fill: col, listening: false }));
    }

    const atk = cW / 6;
    this.pitchLayer.add(new Konva.Line({ points: [netX - atk, padY, netX - atk, padY + cH], ...ls }));
    this.pitchLayer.add(new Konva.Line({ points: [netX + atk, padY, netX + atk, padY + cH], ...ls }));

    this.pitchLayer.batchDraw();
  }

  // FIFA Futsal: W=1050=40m, H=680=20m
  private drawFutsalCourt(): void {
    const W = this.PITCH_W;
    const H = this.PITCH_H;
    const court = '#1565c0';
    const penFill = '#0d47a1';
    const c = '#ffffff';
    const ls = { stroke: c, strokeWidth: 2, listening: false };

    // Pista de resina azul (pabellón), no césped
    this.addSolidPitchFill(court);
    this.pitchLayer.add(new Konva.Rect({ x: 0, y: 0, width: W, height: H, ...ls, fill: 'transparent' }));
    this.pitchLayer.add(new Konva.Line({ points: [W / 2, 0, W / 2, H], ...ls }));
    this.pitchLayer.add(new Konva.Circle({ x: W / 2, y: H / 2, radius: 76, ...ls, fill: 'transparent' }));
    this.pitchLayer.add(new Konva.Circle({ x: W / 2, y: H / 2, radius: 4, fill: c, listening: false }));

    const penR = 157;
    this.pitchLayer.add(new Konva.Arc({ x: 0, y: H / 2, innerRadius: 0, outerRadius: penR, angle: 180, rotation: -90, fill: penFill, listening: false }));
    this.pitchLayer.add(new Konva.Arc({ x: W, y: H / 2, innerRadius: 0, outerRadius: penR, angle: 180, rotation: 90, fill: penFill, listening: false }));
    this.pitchLayer.add(new Konva.Arc({ x: 0, y: H / 2, innerRadius: penR, outerRadius: penR, angle: 180, rotation: -90, ...ls }));
    this.pitchLayer.add(new Konva.Arc({ x: W, y: H / 2, innerRadius: penR, outerRadius: penR, angle: 180, rotation: 90, ...ls }));

    this.pitchLayer.add(new Konva.Circle({ x: 157, y: H / 2, radius: 4, fill: c, listening: false }));
    this.pitchLayer.add(new Konva.Circle({ x: W - 157, y: H / 2, radius: 4, fill: c, listening: false }));
    this.pitchLayer.add(new Konva.Circle({ x: 255, y: H / 2, radius: 4, fill: c, listening: false }));
    this.pitchLayer.add(new Konva.Circle({ x: W - 255, y: H / 2, radius: 4, fill: c, listening: false }));

    [{ x: 0, y: 0, r: 0 }, { x: W, y: 0, r: 90 }, { x: W, y: H, r: 180 }, { x: 0, y: H, r: 270 }]
      .forEach(cn => this.pitchLayer.add(new Konva.Arc({ x: cn.x, y: cn.y, innerRadius: 20, outerRadius: 20, angle: 90, rotation: cn.r, ...ls })));

    const goalH3 = 102; const goalD3 = 23; const goalY3 = (H - goalH3) / 2;
    this.pitchLayer.add(new Konva.Rect({ x: -goalD3, y: goalY3, width: goalD3, height: goalH3, stroke: '#cccccc', strokeWidth: 2, fill: 'rgba(255,255,255,0.08)', listening: false }));
    this.pitchLayer.add(new Konva.Rect({ x: W, y: goalY3, width: goalD3, height: goalH3, stroke: '#cccccc', strokeWidth: 2, fill: 'rgba(255,255,255,0.08)', listening: false }));

    this.pitchLayer.batchDraw();
  }

  // Olympic water polo: W=1050=30m, H=680=20m
  private drawWaterpoloCourt(): void {
    const W = this.PITCH_W;
    const H = this.PITCH_H;
    const pool = '#0d47a1';   // agua profunda de piscina
    const c = '#ffffff';
    const ls = { stroke: c, strokeWidth: 2, listening: false };

    this.addSolidPitchFill(pool);
    for (let i = -H; i < W + H; i += 30) {
      this.pitchLayer.add(new Konva.Line({ points: [i, 0, i + H, H], stroke: 'rgba(255,255,255,0.04)', strokeWidth: 12, listening: false }));
    }
    this.pitchLayer.add(new Konva.Rect({ x: 0, y: 0, width: W, height: H, ...ls, fill: 'transparent' }));
    this.pitchLayer.add(new Konva.Line({ points: [W / 2, 0, W / 2, H], stroke: '#ffffff', strokeWidth: 3, listening: false }));

    const m2 = Math.round(2 / 30 * W);
    this.pitchLayer.add(new Konva.Line({ points: [m2, 0, m2, H], stroke: '#e53935', strokeWidth: 2, listening: false }));
    this.pitchLayer.add(new Konva.Line({ points: [W - m2, 0, W - m2, H], stroke: '#e53935', strokeWidth: 2, listening: false }));

    const m5 = Math.round(5 / 30 * W);
    this.pitchLayer.add(new Konva.Line({ points: [m5, 0, m5, H], stroke: '#fdd835', strokeWidth: 2, listening: false }));
    this.pitchLayer.add(new Konva.Line({ points: [W - m5, 0, W - m5, H], stroke: '#fdd835', strokeWidth: 2, listening: false }));

    const m6 = Math.round(6 / 30 * W);
    this.pitchLayer.add(new Konva.Line({ points: [m6, H / 2 - 28, m6, H / 2 + 28], stroke: '#ffffff', strokeWidth: 2, dash: [8, 6], listening: false }));
    this.pitchLayer.add(new Konva.Line({ points: [W - m6, H / 2 - 28, W - m6, H / 2 + 28], stroke: '#ffffff', strokeWidth: 2, dash: [8, 6], listening: false }));

    const bands = [{ x: m2, col: '#e53935' }, { x: m5, col: '#fdd835' }, { x: W / 2, col: '#ffffff' }, { x: W - m5, col: '#fdd835' }, { x: W - m2, col: '#e53935' }];
    bands.forEach(b => this.pitchLayer.add(new Konva.Rect({ x: b.x - 4, y: 8, width: 8, height: 22, fill: b.col, listening: false })));

    const goalH4 = 102; const goalD4 = 18; const goalY4 = (H - goalH4) / 2;
    this.pitchLayer.add(new Konva.Rect({ x: -goalD4, y: goalY4, width: goalD4, height: goalH4, stroke: '#bbbbbb', strokeWidth: 3, fill: 'rgba(255,255,255,0.12)', listening: false }));
    this.pitchLayer.add(new Konva.Rect({ x: W, y: goalY4, width: goalD4, height: goalH4, stroke: '#bbbbbb', strokeWidth: 3, fill: 'rgba(255,255,255,0.12)', listening: false }));

    this.pitchLayer.batchDraw();
  }

  // World Rugby: W=1050=120m (100m play+2×10m in-goal), H=680=70m
  private drawRugbyPitch(): void {
    const W = this.PITCH_W;
    const H = this.PITCH_H;
    const grass1 = '#33691e'; const grass2 = '#558b2f';
    const c = '#ffffff';
    const ls = { stroke: c, strokeWidth: 2, listening: false };

    this.addVerticalGrassStripes(12, grass1, grass2);
    this.pitchLayer.add(new Konva.Rect({ x: 0, y: 0, width: W, height: H, ...ls, fill: 'transparent' }));

    const inGoal = 88;
    this.pitchLayer.add(new Konva.Rect({ x: 0, y: 0, width: inGoal, height: H, stroke: c, strokeWidth: 2, fill: 'rgba(255,255,255,0.06)', listening: false }));
    this.pitchLayer.add(new Konva.Rect({ x: W - inGoal, y: 0, width: inGoal, height: H, stroke: c, strokeWidth: 2, fill: 'rgba(255,255,255,0.06)', listening: false }));

    const scaleX = (W - 2 * inGoal) / 100;
    const scaleY = H / 70;

    this.pitchLayer.add(new Konva.Line({ points: [W / 2, 0, W / 2, H], ...ls }));

    const m10L = W / 2 - 10 * scaleX; const m10R = W / 2 + 10 * scaleX;
    this.pitchLayer.add(new Konva.Line({ points: [m10L, 0, m10L, H], stroke: 'rgba(255,255,255,0.55)', strokeWidth: 1.5, listening: false }));
    this.pitchLayer.add(new Konva.Line({ points: [m10R, 0, m10R, H], stroke: 'rgba(255,255,255,0.55)', strokeWidth: 1.5, listening: false }));

    const m22L = inGoal + 22 * scaleX; const m22R = W - inGoal - 22 * scaleX;
    this.pitchLayer.add(new Konva.Line({ points: [m22L, 0, m22L, H], stroke: 'rgba(255,255,255,0.55)', strokeWidth: 1.5, listening: false }));
    this.pitchLayer.add(new Konva.Line({ points: [m22R, 0, m22R, H], stroke: 'rgba(255,255,255,0.55)', strokeWidth: 1.5, listening: false }));

    const l5 = 5 * scaleY; const l15 = 15 * scaleY;
    [m22L, m22R, m10L, m10R, W / 2].forEach(x => {
      [[x - 6, l5, x + 6, l5], [x - 6, H - l5, x + 6, H - l5],
       [x - 6, l15, x + 6, l15], [x - 6, H - l15, x + 6, H - l15]]
        .forEach(pts => this.pitchLayer.add(new Konva.Line({ points: pts, stroke: c, strokeWidth: 2, listening: false })));
    });

    const postGap = Math.round(5.6 * scaleY);
    const postLen = 75; const crossAt = 30;
    const topPost = H / 2 - postGap / 2; const botPost = H / 2 + postGap / 2;

    this.pitchLayer.add(new Konva.Line({ points: [inGoal, topPost, inGoal - postLen, topPost], stroke: c, strokeWidth: 2.5, listening: false }));
    this.pitchLayer.add(new Konva.Line({ points: [inGoal, botPost, inGoal - postLen, botPost], stroke: c, strokeWidth: 2.5, listening: false }));
    this.pitchLayer.add(new Konva.Line({ points: [inGoal - crossAt, topPost, inGoal - crossAt, botPost], stroke: c, strokeWidth: 2.5, listening: false }));
    this.pitchLayer.add(new Konva.Line({ points: [W - inGoal, topPost, W - inGoal + postLen, topPost], stroke: c, strokeWidth: 2.5, listening: false }));
    this.pitchLayer.add(new Konva.Line({ points: [W - inGoal, botPost, W - inGoal + postLen, botPost], stroke: c, strokeWidth: 2.5, listening: false }));
    this.pitchLayer.add(new Konva.Line({ points: [W - inGoal + crossAt, topPost, W - inGoal + crossAt, botPost], stroke: c, strokeWidth: 2.5, listening: false }));

    this.pitchLayer.batchDraw();
  }

  // FIH field hockey: W=1050=91.4m, H=680=55m
  private drawHockeyCourt(): void {
    const W = this.PITCH_W;
    const H = this.PITCH_H;
    const grass1 = '#1b5e20'; const grass2 = '#2e7d32';
    const c = '#ffffff';
    const ls = { stroke: c, strokeWidth: 2, listening: false };

    this.addVerticalGrassStripes(16, grass1, grass2);
    this.pitchLayer.add(new Konva.Rect({ x: 0, y: 0, width: W, height: H, ...ls, fill: 'transparent' }));
    this.pitchLayer.add(new Konva.Line({ points: [W / 2, 0, W / 2, H], ...ls }));

    this.pitchLayer.add(new Konva.Circle({ x: W / 2, y: H / 2, radius: 52, ...ls, fill: 'transparent' }));
    this.pitchLayer.add(new Konva.Circle({ x: W / 2, y: H / 2, radius: 4, fill: c, listening: false }));

    const m23 = Math.round(23 / 91.4 * W);
    this.pitchLayer.add(new Konva.Line({ points: [m23, 0, m23, H], stroke: 'rgba(255,255,255,0.5)', strokeWidth: 1.5, dash: [12, 6], listening: false }));
    this.pitchLayer.add(new Konva.Line({ points: [W - m23, 0, W - m23, H], stroke: 'rgba(255,255,255,0.5)', strokeWidth: 1.5, dash: [12, 6], listening: false }));

    const dR = 168; const goalHalf5 = 23;
    const tp5 = H / 2 - goalHalf5; const bp5 = H / 2 + goalHalf5;

    this.pitchLayer.add(new Konva.Arc({ x: 0, y: tp5, innerRadius: dR, outerRadius: dR, angle: 90, rotation: -90, ...ls }));
    this.pitchLayer.add(new Konva.Line({ points: [dR, tp5, dR, bp5], ...ls }));
    this.pitchLayer.add(new Konva.Arc({ x: 0, y: bp5, innerRadius: dR, outerRadius: dR, angle: 90, rotation: 0, ...ls }));
    this.pitchLayer.add(new Konva.Arc({ x: W, y: tp5, innerRadius: dR, outerRadius: dR, angle: 90, rotation: 180, ...ls }));
    this.pitchLayer.add(new Konva.Line({ points: [W - dR, tp5, W - dR, bp5], ...ls }));
    this.pitchLayer.add(new Konva.Arc({ x: W, y: bp5, innerRadius: dR, outerRadius: dR, angle: 90, rotation: 90, ...ls }));

    const pen1 = Math.round(6.4 / 91.4 * W); const pen2 = Math.round(10 / 91.4 * W);
    this.pitchLayer.add(new Konva.Circle({ x: pen1, y: H / 2, radius: 4, fill: c, listening: false }));
    this.pitchLayer.add(new Konva.Circle({ x: W - pen1, y: H / 2, radius: 4, fill: c, listening: false }));
    this.pitchLayer.add(new Konva.Circle({ x: pen2, y: H / 2, radius: 4, fill: c, listening: false }));
    this.pitchLayer.add(new Konva.Circle({ x: W - pen2, y: H / 2, radius: 4, fill: c, listening: false }));

    const goalH5 = 46; const goalD5 = 24; const goalY5 = (H - goalH5) / 2;
    this.pitchLayer.add(new Konva.Rect({ x: -goalD5, y: goalY5, width: goalD5, height: goalH5, stroke: '#cccccc', strokeWidth: 2, fill: 'rgba(255,255,255,0.1)', listening: false }));
    this.pitchLayer.add(new Konva.Rect({ x: W, y: goalY5, width: goalD5, height: goalH5, stroke: '#cccccc', strokeWidth: 2, fill: 'rgba(255,255,255,0.1)', listening: false }));

    this.pitchLayer.batchDraw();
  }

  // NHL ice hockey: W=1050=60.96m, H=680=25.91m
  private drawIceHockeyCourt(): void {
    const W = this.PITCH_W;
    const H = this.PITCH_H;
    const ice1 = '#d8eaf8';
    const c = '#1a1a2e';
    const red = '#cc0000'; const blue = '#0033cc';

    this.addSolidPitchFill(ice1);

    this.pitchLayer.add(new Konva.Rect({ x: 4, y: 4, width: W - 8, height: H - 8, cornerRadius: 80, stroke: '#1a1a2e', strokeWidth: 6, fill: 'transparent', listening: false }));
    this.pitchLayer.add(new Konva.Line({ points: [W / 2, 0, W / 2, H], stroke: red, strokeWidth: 5, listening: false }));

    const blueLine = Math.round(22.86 / 60.96 * W);
    this.pitchLayer.add(new Konva.Line({ points: [blueLine, 0, blueLine, H], stroke: blue, strokeWidth: 4, listening: false }));
    this.pitchLayer.add(new Konva.Line({ points: [W - blueLine, 0, W - blueLine, H], stroke: blue, strokeWidth: 4, listening: false }));

    const goalLine = Math.round(4 / 60.96 * W);
    this.pitchLayer.add(new Konva.Line({ points: [goalLine, 0, goalLine, H], stroke: red, strokeWidth: 2, listening: false }));
    this.pitchLayer.add(new Konva.Line({ points: [W - goalLine, 0, W - goalLine, H], stroke: red, strokeWidth: 2, listening: false }));

    const faceR = Math.round(4.57 / 25.91 * H);
    this.pitchLayer.add(new Konva.Circle({ x: W / 2, y: H / 2, radius: faceR, stroke: red, strokeWidth: 2, fill: 'rgba(204,0,0,0.05)', listening: false }));
    this.pitchLayer.add(new Konva.Circle({ x: W / 2, y: H / 2, radius: 8, fill: red, listening: false }));

    const zoneX = Math.round(16.8 / 60.96 * W);
    const zoneY = Math.round(6.7 / 25.91 * H);
    [[zoneX, zoneY], [zoneX, H - zoneY], [W - zoneX, zoneY], [W - zoneX, H - zoneY]]
      .forEach(([x, y]) => {
        this.pitchLayer.add(new Konva.Circle({ x, y, radius: faceR, stroke: red, strokeWidth: 2, fill: 'rgba(204,0,0,0.05)', listening: false }));
        this.pitchLayer.add(new Konva.Circle({ x, y, radius: 6, fill: red, listening: false }));
        const hm = 20; const hr = faceR + 16;
        [[x - hr, y - hm, x - hr, y + hm], [x + hr, y - hm, x + hr, y + hm]]
          .forEach(pts => this.pitchLayer.add(new Konva.Line({ points: pts, stroke: red, strokeWidth: 2, listening: false })));
      });

    const creaseR = Math.round(1.83 / 25.91 * H);
    this.pitchLayer.add(new Konva.Arc({ x: goalLine, y: H / 2, innerRadius: creaseR, outerRadius: creaseR, angle: 180, rotation: -90, stroke: red, strokeWidth: 2, fill: 'rgba(130,180,240,0.4)', listening: false }));
    this.pitchLayer.add(new Konva.Arc({ x: W - goalLine, y: H / 2, innerRadius: creaseR, outerRadius: creaseR, angle: 180, rotation: 90, stroke: red, strokeWidth: 2, fill: 'rgba(130,180,240,0.4)', listening: false }));

    const goalH6 = creaseR * 2; const goalD6 = 21; const goalY6 = (H - goalH6) / 2;
    this.pitchLayer.add(new Konva.Rect({ x: goalLine - goalD6, y: goalY6, width: goalD6, height: goalH6, stroke: red, strokeWidth: 2, fill: 'rgba(204,0,0,0.15)', listening: false }));
    this.pitchLayer.add(new Konva.Rect({ x: W - goalLine, y: goalY6, width: goalD6, height: goalH6, stroke: red, strokeWidth: 2, fill: 'rgba(204,0,0,0.15)', listening: false }));

    this.pitchLayer.batchDraw();
  }

  // NFL American football: W=1050=120yd, H=680=53.3yd
  private drawAmericanFootballField(): void {
    const W = this.PITCH_W;
    const H = this.PITCH_H;
    const grass1 = '#1a5c1a'; const grass2 = '#235c23';
    const c = '#ffffff';
    const gold = '#ffd700';

    this.addVerticalGrassStripes(20, grass1, grass2);
    this.pitchLayer.add(new Konva.Rect({ x: 0, y: 0, width: W, height: H, stroke: c, strokeWidth: 3, fill: 'transparent', listening: false }));

    const endZ = Math.round(10 / 120 * W);
    this.pitchLayer.add(new Konva.Rect({ x: 0, y: 0, width: endZ, height: H, stroke: c, strokeWidth: 2, fill: 'rgba(255,255,255,0.07)', listening: false }));
    this.pitchLayer.add(new Konva.Rect({ x: W - endZ, y: 0, width: endZ, height: H, stroke: c, strokeWidth: 2, fill: 'rgba(255,255,255,0.07)', listening: false }));

    const fieldW = W - 2 * endZ;
    const yPx = fieldW / 100;

    for (let y = 5; y <= 95; y += 5) {
      const x = endZ + y * yPx;
      this.pitchLayer.add(new Konva.Line({ points: [x, 0, x, H], stroke: c, strokeWidth: y % 10 === 0 ? 2 : 1.2, listening: false }));
    }

    this.pitchLayer.add(new Konva.Line({ points: [W / 2, 0, W / 2, H], stroke: gold, strokeWidth: 3, listening: false }));

    const hashY1 = H / 3; const hashY2 = 2 * H / 3; const hashLen = 10;
    for (let y = 0; y <= 100; y += 5) {
      const x = endZ + y * yPx;
      [[x - hashLen / 2, hashY1, x + hashLen / 2, hashY1], [x - hashLen / 2, hashY2, x + hashLen / 2, hashY2]]
        .forEach(pts => this.pitchLayer.add(new Konva.Line({ points: pts, stroke: c, strokeWidth: 1, listening: false })));
    }

    ['1 0', '2 0', '3 0', '4 0', '5 0', '4 0', '3 0', '2 0', '1 0'].forEach((num, i) => {
      const x = endZ + (10 + i * 10) * yPx;
      this.pitchLayer.add(new Konva.Text({ x: x - 14, y: H / 2 - 12, text: num, fontSize: 18, fontStyle: 'bold', fill: 'rgba(255,255,255,0.5)', fontFamily: 'Arial', listening: false }));
    });

    const pgap = 60; const pAbove = 65; const crossAt2 = 30;
    [[0, 1], [W, -1]].forEach(([xPos, dir]) => {
      this.pitchLayer.add(new Konva.Line({ points: [xPos, H / 2, (xPos as number) + (dir as number) * crossAt2, H / 2], stroke: gold, strokeWidth: 3, listening: false }));
      this.pitchLayer.add(new Konva.Line({ points: [(xPos as number) + (dir as number) * crossAt2, H / 2 - pgap / 2, (xPos as number) + (dir as number) * crossAt2, H / 2 + pgap / 2], stroke: gold, strokeWidth: 3, listening: false }));
      this.pitchLayer.add(new Konva.Line({ points: [(xPos as number) + (dir as number) * crossAt2, H / 2 - pgap / 2, (xPos as number) + (dir as number) * (crossAt2 + pAbove), H / 2 - pgap / 2], stroke: gold, strokeWidth: 3, listening: false }));
      this.pitchLayer.add(new Konva.Line({ points: [(xPos as number) + (dir as number) * crossAt2, H / 2 + pgap / 2, (xPos as number) + (dir as number) * (crossAt2 + pAbove), H / 2 + pgap / 2], stroke: gold, strokeWidth: 3, listening: false }));
    });

    this.pitchLayer.batchDraw();
  }

  // Baseball: overhead view
  private drawBaseballField(): void {
    const W = this.PITCH_W;
    const H = this.PITCH_H;

    this.pitchLayer.add(new Konva.Rect({ x: 0, y: 0, width: W, height: H, fill: '#2e7d32', listening: false }));

    const homeX = W / 2;
    const homeY = H - 50;
    const ofR = Math.min(homeY - 10, W / 2 - 10);

    for (let r = 50; r < ofR - 30; r += 36) {
      const even = Math.floor(r / 36) % 2 === 0;
      this.pitchLayer.add(new Konva.Arc({ x: homeX, y: homeY, innerRadius: r, outerRadius: r + 18, angle: 90, rotation: -135, fill: even ? '#338a38' : '#2e7d32', stroke: 'transparent', listening: false }));
    }

    this.pitchLayer.add(new Konva.Arc({ x: homeX, y: homeY, innerRadius: ofR - 30, outerRadius: ofR, angle: 90, rotation: -135, fill: '#c4934a', stroke: 'transparent', listening: false }));

    const lineLen = ofR * 1.05;
    this.pitchLayer.add(new Konva.Line({ points: [homeX, homeY, homeX - lineLen * 0.707, homeY - lineLen * 0.707], stroke: '#ffffff', strokeWidth: 2, listening: false }));
    this.pitchLayer.add(new Konva.Line({ points: [homeX, homeY, homeX + lineLen * 0.707, homeY - lineLen * 0.707], stroke: '#ffffff', strokeWidth: 2, listening: false }));

    const bp = Math.round(Math.min(W, H) * 0.28);
    const fp = { x: homeX + bp, y: homeY - bp };
    const sp = { x: homeX, y: homeY - 2 * bp };
    const tp = { x: homeX - bp, y: homeY - bp };

    const icX = homeX; const icY = homeY - bp;
    this.pitchLayer.add(new Konva.Circle({ x: icX, y: icY, radius: bp * 1.08, fill: '#c4934a', listening: false }));
    this.pitchLayer.add(new Konva.Line({ points: [homeX, homeY, fp.x, fp.y, sp.x, sp.y, tp.x, tp.y, homeX, homeY], stroke: '#4caf50', strokeWidth: 0, fill: '#4caf50', closed: true, listening: false }));

    const mndX = homeX; const mndY = Math.round(homeY - bp * 0.672);
    this.pitchLayer.add(new Konva.Circle({ x: mndX, y: mndY, radius: 20, fill: '#a0784a', stroke: '#8b6035', strokeWidth: 2, listening: false }));

    this.pitchLayer.add(new Konva.Line({ points: [homeX, homeY, fp.x, fp.y, sp.x, sp.y, tp.x, tp.y, homeX, homeY], stroke: '#c4934a', strokeWidth: 7, listening: false }));

    [[fp.x, fp.y], [sp.x, sp.y], [tp.x, tp.y]].forEach(([bx, by]) => {
      this.pitchLayer.add(new Konva.Rect({ x: bx, y: by, width: 13, height: 13, fill: '#ffffff', rotation: 45, offsetX: 6.5, offsetY: 6.5, listening: false }));
    });
    this.pitchLayer.add(new Konva.Rect({ x: homeX, y: homeY, width: 14, height: 14, fill: '#ffffff', rotation: 45, offsetX: 7, offsetY: 7, listening: false }));

    this.pitchLayer.add(new Konva.Rect({ x: homeX + 10, y: homeY - 22, width: 26, height: 44, stroke: '#ffffff', strokeWidth: 1.5, fill: 'transparent', listening: false }));
    this.pitchLayer.add(new Konva.Rect({ x: homeX - 36, y: homeY - 22, width: 26, height: 44, stroke: '#ffffff', strokeWidth: 1.5, fill: 'transparent', listening: false }));

    this.pitchLayer.add(new Konva.Circle({ x: homeX - lineLen * 0.707 + 4, y: homeY - lineLen * 0.707 + 4, radius: 5, fill: '#ffd700', listening: false }));
    this.pitchLayer.add(new Konva.Circle({ x: homeX + lineLen * 0.707 - 4, y: homeY - lineLen * 0.707 + 4, radius: 5, fill: '#ffd700', listening: false }));

    this.pitchLayer.batchDraw();
  }

  /* ────────────────── DRAWING TOOLS ────────────────── */
  setTool(tool: ToolType): void {
    this.activeTool = tool;
    this.showPlayerPanel = false;
    this.showColorPicker = false;
    if (tool !== 'select') { this.deselectAll(); }
    this.stage.container().style.cursor =
      tool === 'select' ? 'default' : 'crosshair';
  }

  setColor(c: string): void {
    this.strokeColor = c;
    this.showColorPicker = false;
  }

  setPlayerColor(c: string): void {
    this.playerColor = c;
  }

  /** Despliega/oculta la paleta de colores para añadir jugador (solo en toolbar). */
  togglePlayerColorPicker(): void {
    this.showPlayerColorPicker = !this.showPlayerColorPicker;
    this.showPlayerPanel = false;
    this.showColorPicker = false;
    if (this.showPlayerColorPicker) {
      this.activeTool = 'select';
      setTimeout(() => this.updateDropdownPosition(), 0);
    }
  }

  /** Actualiza la posición del dropdown para que quede debajo del botón "Añadir jugador". */
  private updateDropdownPosition(): void {
    const btn = this.addPlayerBtn?.nativeElement;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    this.dropdownPosition = {
      top: rect.bottom + 4,
      left: rect.left
    };
  }

  /** Elige un color y añade un jugador (círculo) con ese color; el dropdown se mantiene abierto. */
  addPlayerWithColor(c: string): void {
    this.setPlayerColor(c);
    this.addPlayer('color');
  }

  private bindDrawEvents(): void {
    this.stage.on('mousedown touchstart', (e: any) => this.onPointerDown(e));
    this.stage.on('mousemove touchmove', (e: any) => this.onPointerMove(e));
    this.stage.on('mouseup touchend', () => this.onPointerUp());
  }

  /** Cursor grab/grabbing al pasar sobre elementos arrastrables y durante el drag */
  private bindDragCursor(): void {
    const container = this.stage.container();
    const setCursor = (c: string) => { try { container.style.cursor = c; } catch { } };

    this.stage.on('mouseover', (e: any) => {
      if (this.isPlaying) return;
      const target = e.target;
      if (this.isDraggableNode(target)) setCursor('grab');
      else setCursor(this.activeTool === 'select' ? 'default' : 'crosshair');
    });
    this.stage.on('mouseout', () => setCursor(this.activeTool === 'select' ? 'default' : 'crosshair'));
    this.stage.on('dragstart', () => setCursor('grabbing'));
    this.stage.on('dragend', () => setCursor(this.activeTool === 'select' ? 'default' : 'crosshair'));
  }

  private isDraggableNode(node: any): boolean {
    if (!node || node === this.stage) return false;
    return this.isMarkerDragTarget(node) || this.isDrawableDragTarget(node);
  }

  /** Limita el arrastre al área del campo en coordenadas del stage (Konva pasa pos en píxeles del stage, no del layer) */
  private getPitchDragBoundFunc(): (this: Konva.Node, pos: { x: number; y: number }) => { x: number; y: number } {
    const pitchW = this.PITCH_W;
    const pitchH = this.PITCH_H;
    const margin = 120;
    return function(this: Konva.Node, pos: { x: number; y: number }) {
      const layer = this.getLayer();
      const stage = this.getStage();
      if (!layer || !stage) return pos;
      const scaleX = layer.scaleX();
      const scaleY = layer.scaleY();
      const ox = layer.x();
      const oy = layer.y();
      const minX = ox - margin * scaleX;
      const maxX = ox + pitchW * scaleX + margin * scaleX;
      const minY = oy - margin * scaleY;
      const maxY = oy + pitchH * scaleY + margin * scaleY;
      return {
        x: Math.max(minX, Math.min(maxX, pos.x)),
        y: Math.max(minY, Math.min(maxY, pos.y))
      };
    };
  }

  /** Aplica opciones de arrastre consistentes: menos distancia para iniciar, límite al campo */
  private applyDraggableOptions(node: Konva.Node): void {
    if (node && typeof (node as any).draggable === 'function') {
      (node as any).draggable(true);
      (node as any).dragDistance(3);
      (node as any).dragBoundFunc(this.getPitchDragBoundFunc());
    }
  }

  private preventTouchScroll(e: any): void {
    const evt: any = e?.evt;
    if (!evt || evt.cancelable === false) return;
    const isTouch = (typeof evt.type === 'string' && evt.type.startsWith('touch')) || evt.pointerType === 'touch';
    if (isTouch) evt.preventDefault();
  }

  /** true si el target (o alguno de sus padres) es un elemento draggable del markerLayer */
  private isMarkerDragTarget(target: any): boolean {
    return !!this.getDraggableMarkerGroup(target);
  }

  /** Devuelve el grupo draggable del markerLayer que contiene al target (balón o jugador). Solución definitiva para arrastre. */
  private getDraggableMarkerGroup(target: any): Konva.Group | null {
    if (!target || target === this.stage) return null;
    const layer = target.getLayer?.();
    if (layer !== this.markerLayer) return null;
    let n: any = target;
    while (n && n !== this.stage) {
      if (n instanceof Konva.Group && typeof n.draggable === 'function' && n.draggable()) return n;
      n = n.getParent?.();
    }
    return null;
  }

  /** true si el target (o alguno de sus padres) es un elemento draggable del drawLayer (shapes) */
  private isDrawableDragTarget(target: any): boolean {
    return !!this.getDraggableDrawNode(target);
  }

  /** Devuelve el nodo draggable del drawLayer que contiene al target (figura dibujada). Para arrastre consistente. */
  private getDraggableDrawNode(target: any): Konva.Node | null {
    if (!target || target === this.stage) return null;
    const layer = target.getLayer?.();
    if (layer !== this.drawLayer) return null;
    let n: any = target;
    while (n && n !== this.stage) {
      if (n instanceof Konva.Transformer) return null;
      if (typeof n.draggable === 'function' && n.draggable()) return n;
      n = n.getParent?.();
    }
    return null;
  }

  private getPointerPos(): { x: number; y: number } | null {
    const pos = this.stage.getPointerPosition();
    if (!pos) return null;
    const layer = this.drawLayer;
    return {
      x: (pos.x - layer.x()) / layer.scaleX(),
      y: (pos.y - layer.y()) / layer.scaleY()
    };
  }

  private onPointerDown(e: any): void {
    if (this.isPlaying) return;
    this.preventTouchScroll(e);
    const pos = this.getPointerPos();
    if (!pos) return;

    const target = e?.target;
    // No iniciar dibujo ni selección: dejar que Konva gestione el arrastre cuando se hace clic en marcador o figura
    if (this.getDraggableMarkerGroup(target)) return;
    if (this.activeTool !== 'eraser' && this.getDraggableDrawNode(target)) return;

    if (this.activeTool === 'select') {
      const clickedEmpty = e.target === this.stage ||
        (e.target.getLayer && e.target.getLayer() === this.pitchLayer);
      if (clickedEmpty) {
        this.deselectAll();
        /* start rubber-band selection */
        this.isSelecting = true;
        this.selectionStartPos = { x: pos.x, y: pos.y };
        this.selectionRect = new Konva.Rect({
          x: pos.x, y: pos.y, width: 0, height: 0,
          stroke: '#00c853', strokeWidth: 1.5 / this.scaleRatio,
          dash: [6, 3], fill: 'rgba(0, 200, 83, 0.08)', listening: false
        });
        this.previewLayer.add(this.selectionRect);
      }
      return;
    }

    if (this.activeTool === 'eraser') {
      this.eraserActive = true;
      const target = e.target;
      if (target && target.getLayer && target.getLayer() === this.drawLayer &&
          !(target instanceof Konva.Transformer)) {
        target.destroy();
        this.transformer.nodes([]);
        this.drawLayer.batchDraw();
      }
      return;
    }

    if (this.activeTool === 'text') {
      this.addText(pos.x, pos.y);
      return;
    }

    this.isDrawing = true;
    this.drawStartPos = { x: pos.x, y: pos.y };

    if (this.activeTool === 'pencil') {
      this.currentLine = new Konva.Line({
        stroke: this.strokeColor,
        strokeWidth: this.strokeWidth,
        points: [pos.x, pos.y],
        lineCap: 'round', lineJoin: 'round',
        tension: 0.3, hitStrokeWidth: 24,
        globalCompositeOperation: 'source-over',
        name: 'drawable'
      });
      this.drawLayer.add(this.currentLine);
      this.currentLine.moveToBottom();
    } else if (this.activeTool === 'line' || this.activeTool === 'arrow') {
      const cfg: any = {
        stroke: this.strokeColor, strokeWidth: this.strokeWidth,
        points: [pos.x, pos.y, pos.x, pos.y],
        lineCap: 'round', hitStrokeWidth: 24, name: 'drawable'
      };
      if (this.activeTool === 'arrow') {
        cfg.pointerLength = 12; cfg.pointerWidth = 10;
      }
      this.currentShape = new Konva.Arrow(cfg);
      this.previewLayer.add(this.currentShape);
    } else if (this.activeTool === 'rect') {
      this.currentShape = new Konva.Rect({
        x: pos.x, y: pos.y, width: 0, height: 0,
        stroke: this.strokeColor, strokeWidth: this.strokeWidth,
        fill: 'transparent', name: 'drawable',
        hitStrokeWidth: 16
      });
      this.previewLayer.add(this.currentShape);
    } else if (this.activeTool === 'ellipse') {
      this.currentShape = new Konva.Ellipse({
        x: pos.x, y: pos.y, radiusX: 0, radiusY: 0,
        stroke: this.strokeColor, strokeWidth: this.strokeWidth,
        fill: 'transparent', name: 'drawable',
        hitStrokeWidth: 16
      });
      this.previewLayer.add(this.currentShape);
    }
  }

  private onPointerMove(_e: any): void {
    this.preventTouchScroll(_e);
    const pos = this.getPointerPos();
    if (!pos) return;

    /* rubber-band selection drag */
    if (this.isSelecting && this.selectionRect) {
      const x = Math.min(this.selectionStartPos.x, pos.x);
      const y = Math.min(this.selectionStartPos.y, pos.y);
      const w = Math.abs(pos.x - this.selectionStartPos.x);
      const h = Math.abs(pos.y - this.selectionStartPos.y);
      this.selectionRect.setAttrs({ x, y, width: w, height: h });
      this.previewLayer.batchDraw();
      return;
    }

    /* eraser drag-to-erase */
    if (this.eraserActive) {
      const stagePos = this.stage.getPointerPosition();
      if (!stagePos) return;
      const hit = this.drawLayer.getIntersection(stagePos);
      if (hit && !(hit instanceof Konva.Transformer)) {
        hit.destroy();
        this.drawLayer.batchDraw();
      }
      return;
    }

    if (!this.isDrawing) return;

    if (this.activeTool === 'pencil' && this.currentLine) {
      const pts = this.currentLine.points();
      pts.push(pos.x, pos.y);
      this.currentLine.points(pts);
      this.drawLayer.batchDraw();
    } else if ((this.activeTool === 'line' || this.activeTool === 'arrow') && this.currentShape) {
      (this.currentShape as Konva.Arrow).points([
        this.drawStartPos.x, this.drawStartPos.y, pos.x, pos.y
      ]);
      this.previewLayer.batchDraw();
    } else if (this.activeTool === 'rect' && this.currentShape) {
      const r = this.currentShape as Konva.Rect;
      r.width(pos.x - this.drawStartPos.x);
      r.height(pos.y - this.drawStartPos.y);
      this.previewLayer.batchDraw();
    } else if (this.activeTool === 'ellipse' && this.currentShape) {
      const el = this.currentShape as Konva.Ellipse;
      el.radiusX(Math.abs(pos.x - this.drawStartPos.x));
      el.radiusY(Math.abs(pos.y - this.drawStartPos.y));
      el.position({
        x: (this.drawStartPos.x + pos.x) / 2,
        y: (this.drawStartPos.y + pos.y) / 2
      });
      this.previewLayer.batchDraw();
    }
  }

  private onPointerUp(): void {
    /* finalize rubber-band selection */
    if (this.isSelecting) {
      this.isSelecting = false;
      if (this.selectionRect) {
        const selBox = this.selectionRect.getClientRect();
        this.selectionRect.destroy();
        this.selectionRect = null;
        this.previewLayer.batchDraw();

        if (selBox.width > 4 || selBox.height > 4) {
          const selectedShapes: Konva.Node[] = [];
          this.drawLayer.getChildren().forEach((child: Konva.Node) => {
            if (child instanceof Konva.Transformer) return;
            const box = child.getClientRect();
            if (this.rectsIntersect(selBox, box)) {
              selectedShapes.push(child);
            }
          });

          this.selectedMarkers = [];
          this.markers.forEach(m => {
            const mBox = m.group.getClientRect();
            if (this.rectsIntersect(selBox, mBox)) {
              this.selectedMarkers.push(m);
              if (m.circle) {
                m.circle.stroke('#00c853');
                m.circle.strokeWidth(3.5);
              }
            }
          });

          if (selectedShapes.length > 0) {
            this.transformer.nodes(selectedShapes);
            this.selectedNode = selectedShapes[0];
            this.drawLayer.batchDraw();
          }
          this.markerLayer.batchDraw();
        }
      }
      return;
    }

    /* finalize eraser */
    if (this.eraserActive) {
      this.eraserActive = false;
      this.saveUndoState();
      return;
    }

    if (!this.isDrawing) return;
    this.isDrawing = false;

    if (this.currentShape) {
      this.currentShape.remove();
      const clone = this.currentShape.clone({
        listening: true, draggable: true, name: 'drawable'
      }) as Konva.Shape;
      this.drawLayer.add(clone);
      clone.moveToBottom();
      this.bindShapeEvents(clone);
      this.currentShape = null;
    }
    if (this.currentLine) {
      this.applyDraggableOptions(this.currentLine);
      this.bindShapeEvents(this.currentLine);
      this.currentLine = null;
    }
    this.previewLayer.destroyChildren();
    this.drawLayer.batchDraw();
    this.saveUndoState();
  }

  /** Bind click-to-select, dblclick-to-edit, transform events on drawn shapes */
  private bindShapeEvents(shape: Konva.Shape): void {
    this.applyDraggableOptions(shape);
    shape.on('click tap', (e: any) => {
      if (this.activeTool === 'eraser') {
        shape.destroy();
        this.transformer.nodes([]);
        this.drawLayer.batchDraw();
        this.saveUndoState();
        e.cancelBubble = true;
        return;
      }
      if (this.activeTool !== 'select') return;
      e.cancelBubble = true;
      this.selectNode(shape);
    });

    shape.on('dblclick dbltap', (e: any) => {
      if (shape instanceof Konva.Text) {
        this.editTextInline(shape);
        e.cancelBubble = true;
      }
    });

    /* Flotante: al arrastrar pasa al frente y sombra de elevación */
    shape.on('dragstart', () => {
      shape.moveToTop();
      this.transformer?.moveToTop();
      (shape as any).setAttrs({
        shadowColor: 'rgba(0,0,0,0.4)',
        shadowBlur: 12,
        shadowOffset: { x: 0, y: 4 },
        shadowOpacity: 1
      });
      this.drawLayer.batchDraw();
    });
    shape.on('dragend', () => {
      (shape as any).setAttrs({
        shadowColor: undefined,
        shadowBlur: 0,
        shadowOffset: { x: 0, y: 0 },
        shadowOpacity: undefined
      });
      this.drawLayer.batchDraw();
      this.saveUndoState();
    });
    shape.on('transformend', () => { this.saveUndoState(); });
  }

  /* ────────────────── TEXT ────────────────── */
  private addText(x: number, y: number): void {
    const text = new Konva.Text({
      x, y, text: '',
      fontSize: 20, fill: this.strokeColor,
      draggable: true,
      fontFamily: 'Inter, Arial, sans-serif',
      fontStyle: 'bold', name: 'drawable',
      padding: 4
    });
    this.drawLayer.add(text);
    text.moveToBottom();
    this.bindShapeEvents(text);
    this.drawLayer.batchDraw();
    setTimeout(() => this.editTextInline(text), 50);
  }

  private editTextInline(textNode: Konva.Text): void {
    this.transformer.nodes([]);
    this.drawLayer.batchDraw();

    const textPosition = textNode.absolutePosition();
    const stageBox = this.stage.container().getBoundingClientRect();
    const areaPosition = {
      x: stageBox.left + textPosition.x,
      y: stageBox.top + textPosition.y
    };
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.value = textNode.text();
    textarea.style.position = 'fixed';
    textarea.style.top = areaPosition.y + 'px';
    textarea.style.left = areaPosition.x + 'px';
    textarea.style.width = Math.max((textNode.width() || 160) * this.scaleRatio, 140) + 'px';
    textarea.style.minHeight = '40px';
    textarea.style.fontSize = textNode.fontSize() * this.scaleRatio + 'px';
    textarea.style.border = '2px solid #00c853';
    textarea.style.padding = '6px 8px';
    textarea.style.borderRadius = '8px';
    textarea.style.outline = 'none';
    textarea.style.background = 'rgba(0,0,0,0.88)';
    textarea.style.color = (textNode.fill() as string) || '#fff';
    textarea.style.fontWeight = 'bold';
    textarea.style.fontFamily = 'Inter, Arial, sans-serif';
    textarea.style.zIndex = '10000';
    textarea.style.resize = 'both';
    textarea.style.overflow = 'hidden';
    textarea.style.lineHeight = '1.3';
    textarea.placeholder = this.t.instant('TBOARD.TEXT_PLACEHOLDER') || 'Escribe aquí...';
    textarea.focus();
    textarea.select();
    textNode.visible(false);
    this.drawLayer.batchDraw();

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      const val = textarea.value.trim();
      if (val) {
        textNode.text(val);
        textNode.visible(true);
      } else {
        textNode.destroy();
      }
      textarea.remove();
      this.drawLayer.batchDraw();
      this.saveUndoState();
    };

    textarea.addEventListener('blur', finish);
    textarea.addEventListener('keydown', (ev: KeyboardEvent) => {
      if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); textarea.blur(); }
      if (ev.key === 'Escape') { textarea.value = textNode.text(); textarea.blur(); }
      ev.stopPropagation();
    });
  }

  /* ────────────────── SELECTION & TRANSFORM ────────────────── */
  private selectNode(node: Konva.Node): void {
    this.deselectAll();
    this.selectedNode = node;
    this.transformer.nodes([node]);
    this.drawLayer.batchDraw();
  }

  deselectAll(): void {
    this.selectedNode = null;
    this.selectedMarker = null;
    this.selectedMarkers = [];
    if (this.transformer) {
      this.transformer.nodes([]);
      this.drawLayer?.batchDraw();
    }
    /* deselect marker visual */
    this.markers.forEach(m => {
      if (m.circle) {
        m.circle.strokeWidth(2.5);
        m.circle.stroke('#ffffff');
      }
    });
    this.markerLayer?.batchDraw();
  }

  deleteSelected(): void {
    let changed = false;

    /* delete all shapes in transformer (multi-select or single) */
    const nodes = this.transformer.nodes();
    if (nodes.length > 0) {
      nodes.forEach((n: Konva.Node) => n.destroy());
      this.transformer.nodes([]);
      this.selectedNode = null;
      this.drawLayer.batchDraw();
      changed = true;
    }

    /* delete multi-selected markers */
    if (this.selectedMarkers.length > 0) {
      this.selectedMarkers.forEach(m => {
        if (m.team === 'ball') this.ballPlaced = false;
        m.group.destroy();
        this.markers = this.markers.filter(mk => mk.id !== m.id);
      });
      this.selectedMarkers = [];
      this.markerLayer.batchDraw();
      changed = true;
    }

    /* delete single selected marker (click) */
    if (this.selectedMarker) {
      this.removeMarker(this.selectedMarker);
      this.selectedMarker = null;
      changed = true;
    }

    if (changed) {
      this.saveUndoState();
      this.onMarkerChanged();
    }
  }

  clearDrawings(): void {
    const children = this.drawLayer.getChildren().slice();
    children.forEach((child: Konva.Node) => {
      if (!(child instanceof Konva.Transformer)) child.destroy();
    });
    this.selectedNode = null;
    this.transformer.nodes([]);
    this.drawLayer.batchDraw();
    this.saveUndoState();
    // saveUndoState already calls checkForChanges and autosave
  }

  /* ────────────────── UNDO / REDO ────────────────── */
  private captureFullState(): UndoState {
    return {
      drawJSON: this.getDrawLayerJSON(),
      markers: this.markers.map(m => ({
        id: m.id, team: m.team, color: m.color,
        number: m.number, x: m.group.x(), y: m.group.y()
      })),
      ballPlaced: this.ballPlaced,
      nextPlayerNumber: this.nextPlayerNumber
    };
  }

  private saveUndoState(): void {
    this.undoStack.push(this.captureFullState());
    this.redoStack = [];
    if (this.undoStack.length > 50) this.undoStack.shift();
    this.canUndo = this.undoStack.length > 1;
    this.canRedo = false;
    this.checkForChanges();
    this.autosave();
  }

  undo(): void {
    if (this.undoStack.length <= 1) return;
    const current = this.undoStack.pop()!;
    this.redoStack.push(current);
    const prev = this.undoStack[this.undoStack.length - 1];
    this.restoreFullState(prev);
    this.canUndo = this.undoStack.length > 1;
    this.canRedo = true;
    this.checkForChanges();
    this.autosave();
  }

  redo(): void {
    if (this.redoStack.length === 0) return;
    const state = this.redoStack.pop()!;
    this.undoStack.push(state);
    this.restoreFullState(state);
    this.canUndo = this.undoStack.length > 1;
    this.canRedo = this.redoStack.length > 0;
    this.checkForChanges();
    this.autosave();
  }

  private restoreFullState(state: UndoState): void {
    this.restoreDrawLayerFromJSON(state.drawJSON);
    this.restoreMarkersFromState(state);
  }

  private restoreDrawLayerFromJSON(json: string): void {
    try {
      this.drawLayer.getChildren().slice().forEach((child: Konva.Node) => {
        if (!(child instanceof Konva.Transformer)) child.destroy();
      });
      this.transformer.nodes([]);
      this.selectedNode = null;
      const parsed = JSON.parse(json);
      if (parsed.children) {
        parsed.children.forEach((childJson: any) => {
          if (childJson.className === 'Transformer') return;
          const node = Konva.Node.create(JSON.stringify(childJson));
          this.drawLayer.add(node);
          node.moveToBottom();
          if (node instanceof Konva.Shape) {
            (node as Konva.Shape).draggable(true);
            this.bindShapeEvents(node as Konva.Shape);
          }
        });
      }
      this.drawLayer.batchDraw();
    } catch { /* silently ignore */ }
  }

  private restoreMarkersFromState(state: UndoState): void {
    const prevLoading = this.isLoadingState;
    this.isLoadingState = true;

    /* remove all current markers */
    this.markers.forEach(m => m.group.destroy());
    this.markers = [];
    this.selectedMarker = null;
    this.selectedMarkers = [];
    this.ballPlaced = false;

    /* recreate markers from state */
    state.markers.forEach(m => {
      if (m.team === 'ball') {
        this.addPlayer('ball');
        const marker = this.markers.find(mk => mk.team === 'ball');
        if (marker) {
          marker.id = m.id;
          marker.group.name(m.id);
          marker.group.position({ x: m.x, y: m.y });
        }
      } else {
        this.playerColor = m.color;
        this.addPlayer('color');
        const marker = this.markers[this.markers.length - 1];
        if (marker) {
          marker.id = m.id;
          marker.group.name(m.id);
          marker.group.position({ x: m.x, y: m.y });
          marker.number = m.number;
          marker.label.text(m.number);
          marker.label.offsetX(m.number.length > 1 ? 7.5 : 4);
        }
      }
    });
    this.ballPlaced = state.ballPlaced;
    this.nextPlayerNumber = state.nextPlayerNumber;
    this.markerLayer.batchDraw();

    this.isLoadingState = prevLoading;
  }

  /* ────────────────── PLAYER MARKERS ────────────────── */
  togglePlayerPanel(): void {
    this.showPlayerPanel = !this.showPlayerPanel;
    this.showColorPicker = false;
    if (this.showPlayerPanel) this.activeTool = 'select';
  }

  addPlayer(type: 'color' | 'ball'): void {
    if (type === 'ball' && this.ballPlaced) return;

    const id = type + '_' + Date.now();
    const isBall = type === 'ball';

    const cx = this.PITCH_W / 2;
    const cy = this.PITCH_H / 2;
    const group = new Konva.Group({ x: cx, y: cy, draggable: true, name: id });
    this.applyDraggableOptions(group);

    if (isBall) {
      this.ballPlaced = true;

      const label = new Konva.Text({
        text: this.ballEmoji, fontSize: 24,
        fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif',
        listening: false, offsetX: 12, offsetY: 12
      });
      /* Área de agarre grande (radio 30) encima del emoji para mover el balón con facilidad */
      const hitCircle = new Konva.Circle({
        x: 0, y: 0, radius: 30,
        fill: 'transparent',
        stroke: 'transparent',
        strokeWidth: 0,
        listening: true,
        hitStrokeWidth: 0
      });
      group.add(label);
      group.add(hitCircle);
      this.markerLayer.add(group);
      this.markerLayer.batchDraw();

      const marker: PlayerMarker = {
        id, group, circle: hitCircle, label,
        team: 'ball', color: '', number: ''
      };
      this.markers.push(marker);
      group.on('click tap', () => this.selectMarker(marker));
      group.on('dblclick dbltap', () => this.removeMarker(marker));
      group.on('contextmenu', (e: any) => {
        e.evt.preventDefault();
        this.removeMarker(marker);
      });
      group.on('dragstart', () => {
        group.moveToTop();
        group.setAttrs({
          shadowColor: 'rgba(0,0,0,0.35)',
          shadowBlur: 14,
          shadowOffset: { x: 0, y: 6 },
          shadowOpacity: 1
        });
        this.markerLayer.batchDraw();
      });
      group.on('dragend', () => {
        group.setAttrs({
          shadowColor: undefined,
          shadowBlur: 0,
          shadowOffset: { x: 0, y: 0 },
          shadowOpacity: undefined
        });
        this.markerLayer.batchDraw();
        this.onMarkerChanged();
      });
    } else {
      const radius = 18;
      const fill = this.playerColor;
      const num = String(this.nextPlayerNumber);
      this.nextPlayerNumber++;

      const circle = new Konva.Circle({
        radius, fill,
        stroke: '#ffffff', strokeWidth: 2.5,
        shadowColor: 'rgba(0,0,0,0.5)',
        shadowBlur: 8, shadowOffset: { x: 1, y: 3 }, shadowOpacity: 0.6,
        listening: false
      });
      const label = new Konva.Text({
        text: num, fontSize: 13,
        fill: this.getContrastColor(fill),
        fontStyle: 'bold',
        fontFamily: 'Inter, Arial, sans-serif',
        align: 'center', verticalAlign: 'middle',
        listening: false,
        offsetX: num.length > 1 ? 7.5 : 4,
        offsetY: 6
      });
      /* Área de agarre encima (misma idea que el balón): un solo hijo con listening: true, añadido al final */
      const hitArea = new Konva.Circle({
        x: 0, y: 0, radius: 26,
        fill: 'transparent',
        stroke: 'transparent',
        strokeWidth: 0,
        listening: true
      });
      group.add(circle);
      group.add(label);
      group.add(hitArea);
      this.markerLayer.add(group);
      this.markerLayer.batchDraw();

      const marker: PlayerMarker = {
        id, group, circle, label,
        team: 'color', color: fill, number: num
      };
      this.markers.push(marker);

      /* click = select, dblclick = edit number, right-click = remove */
      group.on('click tap', () => this.selectMarker(marker));
      group.on('dblclick dbltap', () => this.editMarkerNumber(marker));
      group.on('contextmenu', (e: any) => {
        e.evt.preventDefault();
        this.removeMarker(marker);
      });
      group.on('dragstart', () => {
        group.moveToTop();
        group.setAttrs({
          shadowColor: 'rgba(0,0,0,0.35)',
          shadowBlur: 14,
          shadowOffset: { x: 0, y: 6 },
          shadowOpacity: 1
        });
        this.markerLayer.batchDraw();
      });
      group.on('dragend', () => {
        group.setAttrs({
          shadowColor: undefined,
          shadowBlur: 0,
          shadowOffset: { x: 0, y: 0 },
          shadowOpacity: undefined
        });
        this.markerLayer.batchDraw();
        this.onMarkerChanged();
      });
    }

    // Register the change after adding the marker
    this.onMarkerChanged();
  }

  private selectMarker(m: PlayerMarker): void {
    this.deselectAll();
    this.selectedMarker = m;
    if (m.circle) {
      m.circle.stroke('#00c853');
      m.circle.strokeWidth(3.5);
    }
    this.markerLayer.batchDraw();
  }

  private editMarkerNumber(m: PlayerMarker): void {
    if (m.team === 'ball') return;
    const stageBox = this.stage.container().getBoundingClientRect();
    const absPos = m.group.absolutePosition();
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 3;
    input.value = m.number;
    input.style.position = 'fixed';
    input.style.left = (stageBox.left + absPos.x - 20) + 'px';
    input.style.top = (stageBox.top + absPos.y - 20) + 'px';
    input.style.width = '40px';
    input.style.height = '40px';
    input.style.textAlign = 'center';
    input.style.fontSize = '15px';
    input.style.fontWeight = 'bold';
    input.style.border = '2px solid #00c853';
    input.style.borderRadius = '50%';
    input.style.background = m.color || 'rgba(0,0,0,0.85)';
    input.style.color = this.getContrastColor(m.color || '#000000');
    input.style.outline = 'none';
    input.style.zIndex = '10000';
    input.style.fontFamily = 'Inter, Arial, sans-serif';
    document.body.appendChild(input);
    input.focus();
    input.select();

    m.group.visible(false);
    this.markerLayer.batchDraw();

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      const val = input.value.trim() || m.number;
      const changed = val !== m.number;
      m.number = val;
      m.label.text(val);
      m.label.offsetX(val.length > 1 ? 7.5 : 4);
      m.group.visible(true);
      input.remove();
      this.markerLayer.batchDraw();
      if (changed) {
        this.onMarkerChanged();
      }
    };

    input.addEventListener('blur', finish);
    input.addEventListener('keydown', (ev: KeyboardEvent) => {
      if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
      if (ev.key === 'Escape') { input.value = m.number; input.blur(); }
      ev.stopPropagation();
    });
  }

  private removeMarker(m: PlayerMarker): void {
    m.group.destroy();
    this.markers = this.markers.filter(x => x.id !== m.id);
    if (m.team === 'ball') this.ballPlaced = false;
    if (this.selectedMarker?.id === m.id) this.selectedMarker = null;
    this.markerLayer.batchDraw();
    this.onMarkerChanged();
  }

  private rectsIntersect(r1: { x: number; y: number; width: number; height: number },
                         r2: { x: number; y: number; width: number; height: number }): boolean {
    return !(r2.x > r1.x + r1.width || r2.x + r2.width < r1.x ||
             r2.y > r1.y + r1.height || r2.y + r2.height < r1.y);
  }

  private onMarkerChanged(): void {
    if (this.isLoadingState) return;
    this.checkForChanges();
    this.autosave();
  }

  private getContrastColor(hex: string): string {
    try {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.6 ? '#000000' : '#ffffff';
    } catch {
      return '#ffffff';
    }
  }

  /* ────────────────── KEYFRAME SYSTEM ────────────────── */
  captureKeyframe(isInit = false): void {
    const positions: { [id: string]: { x: number; y: number } } = {};
    this.markers.forEach(m => {
      positions[m.id] = { x: m.group.x(), y: m.group.y() };
    });
    const drawings = this.getDrawLayerJSON();

    if (isInit && this.keyframes.length === 0) {
      this.keyframes.push({ id: 1, label: '1', positions, drawings });
      this.activeKeyframe = 0;
    } else {
      if (this.keyframes[this.activeKeyframe]) {
        this.keyframes[this.activeKeyframe].positions = positions;
        this.keyframes[this.activeKeyframe].drawings = drawings;
      }
      const nextId = this.keyframes.length + 1;
      this.keyframes.push({
        id: nextId, label: String(nextId),
        positions: { ...positions }, drawings
      });
      this.activeKeyframe = this.keyframes.length - 1;
    }
    this.checkForChanges();
    this.autosave();
  }

  goToKeyframe(index: number): void {
    if (this.isPlaying) return;
    this.saveCurrentKeyframeState();
    this.activeKeyframe = index;
    this.restoreKeyframe(index);
  }

  removeKeyframe(index: number): void {
    if (this.keyframes.length <= 1) return;
    this.keyframes.splice(index, 1);
    this.keyframes.forEach((kf, i) => { kf.label = String(i + 1); kf.id = i + 1; });
    if (this.activeKeyframe >= this.keyframes.length) {
      this.activeKeyframe = this.keyframes.length - 1;
    }
    this.restoreKeyframe(this.activeKeyframe);
    this.checkForChanges();
    this.autosave();
  }

  private saveCurrentKeyframeState(): void {
    if (!this.keyframes[this.activeKeyframe]) return;
    const positions: { [id: string]: { x: number; y: number } } = {};
    this.markers.forEach(m => {
      positions[m.id] = { x: m.group.x(), y: m.group.y() };
    });
    this.keyframes[this.activeKeyframe].positions = positions;
    this.keyframes[this.activeKeyframe].drawings = this.getDrawLayerJSON();
  }

  private restoreKeyframe(index: number): void {
    const kf = this.keyframes[index];
    if (!kf) return;
    this.markers.forEach(m => {
      const pos = kf.positions[m.id];
      if (pos) m.group.position(pos);
    });
    this.markerLayer.batchDraw();
    this.restoreDrawLayer(kf.drawings);
  }

  private getDrawLayerJSON(): string {
    this.transformer.nodes([]);
    return this.drawLayer.toJSON();
  }

  private restoreDrawLayer(json: string): void {
    try {
      this.drawLayer.getChildren().slice().forEach((child: Konva.Node) => {
        if (!(child instanceof Konva.Transformer)) child.destroy();
      });
      this.transformer.nodes([]);
      this.selectedNode = null;
      const parsed = JSON.parse(json);
      if (parsed.children) {
        parsed.children.forEach((childJson: any) => {
          if (childJson.className === 'Transformer') return;
          const node = Konva.Node.create(JSON.stringify(childJson));
          this.drawLayer.add(node);
          node.moveToBottom();
          if (node instanceof Konva.Shape) {
            (node as Konva.Shape).draggable(true);
            this.bindShapeEvents(node as Konva.Shape);
          }
        });
      }
      this.drawLayer.batchDraw();
    } catch { /* silently ignore */ }
  }

  /* ────────────────── ANIMATION PLAYBACK ────────────────── */
  playAnimation(): void {
    if (this.keyframes.length < 2 || this.isPlaying) return;
    this.saveCurrentKeyframeState();
    this.isPlaying = true;
    this.deselectAll();
    this.animateFromKeyframe(0);
  }

  stopAnimation(): void {
    this.isPlaying = false;
    gsap.killTweensOf('*');
    this.markers.forEach(m => gsap.killTweensOf(m.group));
  }

  private animateFromKeyframe(fromIndex: number): void {
    if (!this.isPlaying || fromIndex >= this.keyframes.length - 1) {
      this.isPlaying = false;
      return;
    }
    const fromKf = this.keyframes[fromIndex];
    const toKf = this.keyframes[fromIndex + 1];
    this.activeKeyframe = fromIndex;
    this.restoreKeyframe(fromIndex);

    const tl = gsap.timeline({
      onComplete: () => {
        this.activeKeyframe = fromIndex + 1;
        this.restoreDrawLayer(toKf.drawings);
        setTimeout(() => this.animateFromKeyframe(fromIndex + 1), 200);
      }
    });

    this.markers.forEach(m => {
      const from = fromKf.positions[m.id];
      const to = toKf.positions[m.id];
      if (from && to && (from.x !== to.x || from.y !== to.y)) {
        tl.to(m.group, {
          x: to.x, y: to.y,
          duration: this.animSpeed, ease: 'power2.inOut',
          onUpdate: () => { this.markerLayer.batchDraw(); }
        }, 0);
      }
    });
  }

  /* ────────────────── EXPORT ────────────────── */
  /**
   * Toda exportación (imagen PNG y GIF) se genera SIEMPRE en formato horizontal
   * (proporción del campo 1050×680) para que al crear la tarea y subir la imagen
   * se vea correctamente en listados y detalle.
   */
  /**
   * Devuelve la imagen actual del tablero en formato horizontal (data URL), lista
   * para subir como imagen de tarea. Usar al crear/guardar tarea desde la pizarra.
   */
  getHorizontalImageDataURL(pixelRatio: number = 2): string {
    return this.getHorizontalExportDataURL(pixelRatio);
  }

  /**
   * Exporta el contenido actual del tablero en formato horizontal (proporción campo)
   * para previsualización y descarga consistente en todos los dispositivos.
   */
  private getHorizontalExportDataURL(pixelRatio: number): string {
    const W = this.PITCH_W;
    const H = this.PITCH_H;
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    document.body.appendChild(container);
    const offStage = new Konva.Stage({ container, width: W, height: H });
    [this.pitchLayer, this.drawLayer, this.markerLayer].forEach(layer => {
      const clone = layer.clone();
      clone.scale({ x: 1, y: 1 });
      clone.position({ x: 0, y: 0 });
      offStage.add(clone);
    });
    const dataURL = offStage.toDataURL({ pixelRatio });
    offStage.destroy();
    document.body.removeChild(container);
    return dataURL;
  }

  exportImage(): void {
    this.saveCurrentKeyframeState();
    this.deselectAll();
    setTimeout(() => {
      const dataURL = this.getHorizontalExportDataURL(2);
      this.downloadFile(dataURL, 'tactical-board.png');
    }, 50);
  }

  async exportGif(): Promise<void> {
    if (this.keyframes.length < 2) { this.exportImage(); return; }
    this.isExporting = true;
    this.exportProgress = 0;
    this.deselectAll();

    const frames: string[] = [];
    const framesPerTransition = 20;
    const totalFrames = (this.keyframes.length - 1) * framesPerTransition;

    for (let ki = 0; ki < this.keyframes.length - 1; ki++) {
      const fromKf = this.keyframes[ki];
      const toKf = this.keyframes[ki + 1];
      this.restoreDrawLayer(fromKf.drawings);

      for (let f = 0; f < framesPerTransition; f++) {
        const tt = f / framesPerTransition;
        this.markers.forEach(m => {
          const from = fromKf.positions[m.id];
          const to = toKf.positions[m.id];
          if (from && to) {
            m.group.position({
              x: from.x + (to.x - from.x) * tt,
              y: from.y + (to.y - from.y) * tt
            });
          }
        });
        this.markerLayer.batchDraw();
        if (f === Math.floor(framesPerTransition / 2)) {
          this.restoreDrawLayer(toKf.drawings);
        }
        frames.push(this.getHorizontalExportDataURL(1));
        this.exportProgress = Math.round(((ki * framesPerTransition + f) / totalFrames) * 80);
      }
    }

    this.restoreKeyframe(this.keyframes.length - 1);
    for (let i = 0; i < 10; i++) {
      frames.push(this.getHorizontalExportDataURL(1));
    }
    this.exportProgress = 85;

    /* Tamaño horizontal del campo (proporción 1050x680); escala reducida para GIF más liviano */
    const gifW = 525;
    const gifH = 340;
    try {
      const gifshot = (window as any).gifshot || await this.loadGifshot();
      gifshot.createGIF({
        images: frames,
        gifWidth: gifW,
        gifHeight: gifH,
        interval: 0.05, numFrames: frames.length,
        frameDuration: 1, sampleInterval: 10,
        progressCallback: (p: number) => {
          this.exportProgress = 85 + Math.round(p * 15);
        }
      }, (obj: any) => {
        if (!obj.error) this.downloadFile(obj.image, 'tactical-animation.gif');
        this.isExporting = false;
        this.exportProgress = 0;
        this.restoreKeyframe(this.activeKeyframe);
      });
    } catch {
      this.isExporting = false;
      this.exportProgress = 0;
      this.restoreKeyframe(this.activeKeyframe);
    }
  }

  /** Construye el GIF a partir de los keyframes y devuelve la data URL (para guardar en tarea). Retorna null si hay error o hay < 2 keyframes. */
  private buildGifDataURL(): Promise<string | null> {
    if (this.keyframes.length < 2) return Promise.resolve(null);
    this.saveCurrentKeyframeState();
    this.deselectAll();
    const frames: string[] = [];
    const framesPerTransition = 20;
    const totalFrames = (this.keyframes.length - 1) * framesPerTransition;

    for (let ki = 0; ki < this.keyframes.length - 1; ki++) {
      const fromKf = this.keyframes[ki];
      const toKf = this.keyframes[ki + 1];
      this.restoreDrawLayer(fromKf.drawings);
      for (let f = 0; f < framesPerTransition; f++) {
        const tt = f / framesPerTransition;
        this.markers.forEach(m => {
          const from = fromKf.positions[m.id];
          const to = toKf.positions[m.id];
          if (from && to) {
            m.group.position({
              x: from.x + (to.x - from.x) * tt,
              y: from.y + (to.y - from.y) * tt
            });
          }
        });
        this.markerLayer.batchDraw();
        if (f === Math.floor(framesPerTransition / 2)) this.restoreDrawLayer(toKf.drawings);
        frames.push(this.getHorizontalExportDataURL(1));
      }
    }
    this.restoreKeyframe(this.keyframes.length - 1);
    for (let i = 0; i < 10; i++) frames.push(this.getHorizontalExportDataURL(1));

    const gifW = 525;
    const gifH = 340;
    return new Promise((resolve) => {
      this.loadGifshot()
        .then((gifshot: any) => {
          gifshot.createGIF({
            images: frames,
            gifWidth: gifW,
            gifHeight: gifH,
            interval: 0.05,
            numFrames: frames.length,
            frameDuration: 1,
            sampleInterval: 10
          }, (obj: any) => {
            this.restoreKeyframe(this.activeKeyframe);
            resolve(obj.error ? null : obj.image);
          });
        })
        .catch(() => {
          this.restoreKeyframe(this.activeKeyframe);
          resolve(null);
        });
    });
  }

  private loadGifshot(): Promise<any> {
    return new Promise((resolve, reject) => {
      if ((window as any).gifshot) { resolve((window as any).gifshot); return; }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/gifshot@0.4.5/dist/gifshot.min.js';
      script.onload = () => resolve((window as any).gifshot);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  private downloadFile(dataURL: string, filename: string): void {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /* ────────────────── PITCH STYLE ────────────────── */
  setPitchStyle(style: 'full' | 'half' | 'blank'): void {
    this.pitchStyle = style;
    this.drawPitch();
    this.checkForChanges();
    this.autosave();
  }

  /* ────────────────── SAVE/LOAD STATE ────────────────── */
  private getCurrentStateHash(): string {
    try {
      const state = {
        draw: this.getDrawLayerJSON(),
        markers: this.markers.map(m => ({
          id: m.id,
          team: m.team,
          color: m.color,
          number: m.number,
          x: m.group.x(),
          y: m.group.y()
        })),
        keyframes: this.keyframes
      };
      return JSON.stringify(state);
    } catch {
      return '';
    }
  }

  private checkForChanges(): void {
    if (this.isLoadingState) return;
    const currentHash = this.getCurrentStateHash();
    this.hasUnsavedChanges = currentHash !== this.initialStateHash;
  }

  private autosave(): void {
    if (this.isLoadingState || !this.hasUnsavedChanges) return;
    this.writeToStorage();
  }

  private writeToStorage(): void {
    try {
      const state = {
        draw: this.getDrawLayerJSON(),
        markers: this.markers.map(m => ({
          id: m.id,
          team: m.team,
          color: m.color,
          number: m.number,
          x: m.group.x(),
          y: m.group.y()
        })),
        keyframes: this.keyframes,
        pitchStyle: this.pitchStyle,
        ballPlaced: this.ballPlaced,
        nextPlayerNumber: this.nextPlayerNumber
      };
      localStorage.setItem(this.STORAGE_KEY_BOARD, JSON.stringify(state));
      localStorage.setItem(this.STORAGE_KEY_META, JSON.stringify({
        teamId: this.teamId,
        savedAt: new Date().toISOString()
      }));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }

  private loadAutosave(): void {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY_BOARD);
      const meta = localStorage.getItem(this.STORAGE_KEY_META);
      if (!raw || !meta) return;

      const metaData = JSON.parse(meta);
      if (metaData.teamId !== this.teamId) return;

      const savedDate = new Date(metaData.savedAt);
      const hoursSince = (Date.now() - savedDate.getTime()) / (1000 * 60 * 60);
      if (hoursSince > 48) {
        this.clearAutosave();
        return;
      }

      const state = JSON.parse(raw);

      // Set loading flag to prevent triggering change detection
      this.isLoadingState = true;

      // Restore pitch style
      if (state.pitchStyle) {
        this.pitchStyle = state.pitchStyle;
        this.drawPitch();
      }

      // Restore markers (preserve original IDs for keyframe compatibility)
      if (state.markers && Array.isArray(state.markers)) {
        state.markers.forEach((m: any) => {
          if (m.team === 'ball') {
            this.addPlayer('ball');
            const marker = this.markers.find(mk => mk.team === 'ball');
            if (marker) {
              marker.id = m.id;
              marker.group.name(m.id);
              marker.group.position({ x: m.x, y: m.y });
            }
          } else {
            this.playerColor = m.color;
            this.addPlayer('color');
            const marker = this.markers[this.markers.length - 1];
            if (marker) {
              marker.id = m.id;
              marker.group.name(m.id);
              marker.group.position({ x: m.x, y: m.y });
              marker.number = m.number;
              marker.label.text(m.number);
              marker.label.offsetX(m.number.length > 1 ? 7.5 : 4);
            }
          }
        });
        this.ballPlaced = state.ballPlaced || false;
        this.nextPlayerNumber = state.nextPlayerNumber || 1;
      }

      // Restore drawings
      if (state.draw) {
        this.restoreDrawLayer(state.draw);
      }

      // Restore keyframes
      if (state.keyframes && Array.isArray(state.keyframes)) {
        this.keyframes = state.keyframes;
        this.activeKeyframe = Math.min(this.activeKeyframe, this.keyframes.length - 1);
      }

      // Force redraw all layers to render restored positions
      this.markerLayer.batchDraw();
      this.drawLayer.batchDraw();
      this.stage.batchDraw();

      // Done loading, update initial state and clear flag
      this.isLoadingState = false;
      this.initialStateHash = this.getCurrentStateHash();
      this.hasUnsavedChanges = false;
    } catch (error) {
      console.warn('Failed to load autosave:', error);
      this.isLoadingState = false;
      this.clearAutosave();
    }
  }

  private clearAutosave(): void {
    localStorage.removeItem(this.STORAGE_KEY_BOARD);
    localStorage.removeItem(this.STORAGE_KEY_META);
  }

  saveBoard(): void {
    this.writeToStorage();
    this.initialStateHash = this.getCurrentStateHash();
    this.hasUnsavedChanges = false;
    
    // Show success message
    this.showSaveSuccess = true;
    this.lastSavedTime = new Date().toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    // Hide message after 3 seconds
    setTimeout(() => {
      this.showSaveSuccess = false;
    }, 3000);
  }

  /* ────────────────── NAVIGATION ────────────────── */
  goBack(): void {
    if (this.taskMode) {
      this.cerrar.emit();
      return;
    }
    if (this.hasUnsavedChanges) {
      this.showExitConfirm = true;
    } else {
      this.performExit();
    }
  }

  onExitConfirmed(): void {
    this.showExitConfirm = false;
    this.clearAutosave();
    this.performExit();
  }

  onExitCancelled(): void {
    this.showExitConfirm = false;
  }

  onSaveAndExit(): void {
    this.showExitConfirm = false;
    this.saveBoard();
    this.performExit();
  }

  private performExit(): void {
    this.router.navigate(['/dashboard/tareas', this.teamId]);
  }

  /* ────────────────── GUARDAR EN TAREA ────────────────── */
  guardarEnTarea(): void {
    if (!this.stage || this.savingTask) return;
    this.savingTask = true;
    this.saveTaskError = '';
    const hasSequence = this.keyframes.length >= 2;

    const finishWithFile = (file: File) => {
      if (!this.taskId) {
        this.savingTask = false;
        this.saveTaskSuccess = true;
        setTimeout(() => { this.saveTaskSuccess = false; }, 3000);
        this.archivoGenerado.emit(file);
        return;
      }
      this.trainingService.createUpdateImgTask(0, this.taskId, file, this.userId).subscribe({
        next: (resp: any) => {
          const nombre: string = resp?.data || '';
          this.savingTask = false;
          if (nombre) {
            this.saveTaskSuccess = true;
            setTimeout(() => { this.saveTaskSuccess = false; }, 3000);
            this.imagenGuardada.emit(nombre);
          } else {
            this.saveTaskError = 'No se pudo guardar.';
          }
        },
        error: () => {
          this.savingTask = false;
          this.saveTaskError = 'Error al subir a la tarea.';
        }
      });
    };

    if (hasSequence) {
      this.isExporting = true;
      this.exportProgress = 0;
      this.buildGifDataURL()
        .then(gifDataUrl => {
          this.isExporting = false;
          this.exportProgress = 0;
          if (gifDataUrl) {
            fetch(gifDataUrl)
              .then(res => res.blob())
              .then(blob => {
                const file = new File([blob], `pizarra_tarea_${this.taskId || 'nueva'}.gif`, { type: 'image/gif' });
                finishWithFile(file);
              })
              .catch(() => {
                this.savingTask = false;
                this.saveTaskError = 'Error al generar el GIF.';
              });
          } else {
            this.savingTask = false;
            this.saveTaskError = 'No se pudo generar el GIF. Usa PNG (sin secuencia).';
          }
        })
        .catch(() => {
          this.isExporting = false;
          this.exportProgress = 0;
          this.savingTask = false;
          this.saveTaskError = 'Error al generar el GIF.';
        });
      return;
    }

    const dataUrl = this.stage.toDataURL({ pixelRatio: 2, mimeType: 'image/png' });
    fetch(dataUrl)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], `pizarra_tarea_${this.taskId || 'nueva'}.png`, { type: 'image/png' });
        finishWithFile(file);
      })
      .catch(() => {
        this.savingTask = false;
        this.saveTaskError = 'Error al exportar el canvas.';
      });
  }
}
