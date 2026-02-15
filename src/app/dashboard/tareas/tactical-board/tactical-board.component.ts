import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ViewChild, ElementRef, HostListener
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import Konva from 'konva';
import { gsap } from 'gsap';

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

type ToolType = 'select' | 'pencil' | 'line' | 'arrow' | 'rect' | 'ellipse' | 'text' | 'eraser';

@Component({
  selector: 'app-tactical-board',
  templateUrl: './tactical-board.component.html',
  styleUrls: ['./tactical-board.component.scss']
})
export class TacticalBoardComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('boardContainer', { static: false }) boardContainer!: ElementRef<HTMLDivElement>;

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
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  canUndo = false;
  canRedo = false;

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

  /* colours for drawing tools */
  readonly COLORS = [
    '#ffffff', '#ff1744', '#2979ff', '#ffea00',
    '#00e676', '#ff9100', '#d500f9', '#000000'
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    public t: TranslateService
  ) {}

  /* ────────────────── Lifecycle ────────────────── */
  ngOnInit(): void {
    this.route.params.subscribe(p => {
      this.teamId = +p['teamId'] || 0;
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initStage(), 0);
  }

  ngOnDestroy(): void {
    if (this.stage) this.stage.destroy();
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
    const container = this.boardContainer.nativeElement;
    const w = container.clientWidth || 900;
    const h = container.clientHeight || 580;

    this.stage = new Konva.Stage({ container, width: w, height: h });

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
    this.captureKeyframe(true);
    this.saveUndoState();
  }

  private fitStage(): void {
    if (!this.stage || !this.boardContainer) return;
    const container = this.boardContainer.nativeElement;
    const w = container.clientWidth;
    const h = container.clientHeight;
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
  private drawPitch(): void {
    this.pitchLayer.destroyChildren();
    const W = this.PITCH_W;
    const H = this.PITCH_H;
    const lineW = 2;
    const c = '#ffffff';
    const grass1 = '#2e7d32';
    const grass2 = '#388e3c';

    const stripeW = W / 12;
    for (let i = 0; i < 12; i++) {
      this.pitchLayer.add(new Konva.Rect({
        x: i * stripeW, y: 0, width: stripeW, height: H,
        fill: i % 2 === 0 ? grass1 : grass2, listening: false
      }));
    }

    if (this.pitchStyle === 'blank') { this.pitchLayer.batchDraw(); return; }

    const ls = { stroke: c, strokeWidth: lineW, listening: false };

    this.pitchLayer.add(new Konva.Rect({ x: 0, y: 0, width: W, height: H, ...ls, fill: 'transparent' }));
    this.pitchLayer.add(new Konva.Line({ points: [W / 2, 0, W / 2, H], ...ls }));
    this.pitchLayer.add(new Konva.Circle({ x: W / 2, y: H / 2, radius: 73, ...ls, fill: 'transparent' }));
    this.pitchLayer.add(new Konva.Circle({ x: W / 2, y: H / 2, radius: 4, fill: c, listening: false }));

    const paW = 132; const paH = 322; const paY = (H - paH) / 2;
    this.pitchLayer.add(new Konva.Rect({ x: 0, y: paY, width: paW, height: paH, ...ls, fill: 'transparent' }));
    this.pitchLayer.add(new Konva.Rect({ x: W - paW, y: paY, width: paW, height: paH, ...ls, fill: 'transparent' }));

    const gaW = 44; const gaH = 146; const gaY = (H - gaH) / 2;
    this.pitchLayer.add(new Konva.Rect({ x: 0, y: gaY, width: gaW, height: gaH, ...ls, fill: 'transparent' }));
    this.pitchLayer.add(new Konva.Rect({ x: W - gaW, y: gaY, width: gaW, height: gaH, ...ls, fill: 'transparent' }));

    this.pitchLayer.add(new Konva.Circle({ x: 88, y: H / 2, radius: 4, fill: c, listening: false }));
    this.pitchLayer.add(new Konva.Circle({ x: W - 88, y: H / 2, radius: 4, fill: c, listening: false }));

    this.pitchLayer.add(new Konva.Arc({ x: 88, y: H / 2, innerRadius: 73, outerRadius: 73, angle: 106, rotation: -53, ...ls }));
    this.pitchLayer.add(new Konva.Arc({ x: W - 88, y: H / 2, innerRadius: 73, outerRadius: 73, angle: 106, rotation: 127, ...ls }));

    [{ x: 0, y: 0, r: 0 }, { x: W, y: 0, r: 90 }, { x: W, y: H, r: 180 }, { x: 0, y: H, r: 270 }]
      .forEach(corner => {
        this.pitchLayer.add(new Konva.Arc({
          x: corner.x, y: corner.y, innerRadius: 12, outerRadius: 12,
          angle: 90, rotation: corner.r, ...ls
        }));
      });

    const goalH = 58; const goalD = 16; const goalY = (H - goalH) / 2;
    this.pitchLayer.add(new Konva.Rect({ x: -goalD, y: goalY, width: goalD, height: goalH, stroke: '#bbb', strokeWidth: 2, fill: 'rgba(255,255,255,0.08)', listening: false }));
    this.pitchLayer.add(new Konva.Rect({ x: W, y: goalY, width: goalD, height: goalH, stroke: '#bbb', strokeWidth: 2, fill: 'rgba(255,255,255,0.08)', listening: false }));

    if (this.pitchStyle === 'half') {
      this.pitchLayer.add(new Konva.Rect({ x: 0, y: 0, width: W / 2, height: H, fill: grass1, listening: false }));
    }

    this.pitchLayer.batchDraw();
  }

  /* ────────────────── DRAWING TOOLS ────────────────── */
  setTool(tool: ToolType): void {
    this.activeTool = tool;
    this.showPlayerPanel = false;
    this.showColorPicker = false;
    this.showPlayerColorPicker = false;
    if (tool !== 'select') { this.deselectAll(); }
    this.stage.container().style.cursor =
      tool === 'select' ? 'default' :
      tool === 'eraser' ? 'not-allowed' : 'crosshair';
  }

  setColor(c: string): void {
    this.strokeColor = c;
    this.showColorPicker = false;
  }

  setPlayerColor(c: string): void {
    this.playerColor = c;
  }

  private bindDrawEvents(): void {
    this.stage.on('mousedown touchstart', (e: any) => this.onPointerDown(e));
    this.stage.on('mousemove touchmove', (e: any) => this.onPointerMove(e));
    this.stage.on('mouseup touchend', () => this.onPointerUp());
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
    const pos = this.getPointerPos();
    if (!pos) return;

    /* close popups when clicking canvas */
    this.showPlayerColorPicker = false;

    if (this.activeTool === 'select') {
      if (e.target === this.stage || e.target.getLayer() === this.pitchLayer) {
        this.deselectAll();
      }
      return;
    }

    if (this.activeTool === 'eraser') {
      const target = e.target;
      if (target && target.getLayer() === this.drawLayer &&
          target !== this.drawLayer && !(target instanceof Konva.Transformer)) {
        target.destroy();
        this.transformer.nodes([]);
        this.drawLayer.batchDraw();
        this.saveUndoState();
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
        tension: 0.3, hitStrokeWidth: 20,
        globalCompositeOperation: 'source-over',
        name: 'drawable'
      });
      this.drawLayer.add(this.currentLine);
      this.currentLine.moveToBottom();
    } else if (this.activeTool === 'line' || this.activeTool === 'arrow') {
      const cfg: any = {
        stroke: this.strokeColor, strokeWidth: this.strokeWidth,
        points: [pos.x, pos.y, pos.x, pos.y],
        lineCap: 'round', hitStrokeWidth: 20, name: 'drawable'
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
        fill: 'transparent', name: 'drawable'
      });
      this.previewLayer.add(this.currentShape);
    } else if (this.activeTool === 'ellipse') {
      this.currentShape = new Konva.Ellipse({
        x: pos.x, y: pos.y, radiusX: 0, radiusY: 0,
        stroke: this.strokeColor, strokeWidth: this.strokeWidth,
        fill: 'transparent', name: 'drawable'
      });
      this.previewLayer.add(this.currentShape);
    }
  }

  private onPointerMove(_e: any): void {
    if (!this.isDrawing) return;
    const pos = this.getPointerPos();
    if (!pos) return;

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
      this.currentLine.draggable(true);
      this.bindShapeEvents(this.currentLine);
      this.currentLine = null;
    }
    this.previewLayer.destroyChildren();
    this.drawLayer.batchDraw();
    this.saveUndoState();
  }

  /** Bind click-to-select, dblclick-to-edit, transform events on drawn shapes */
  private bindShapeEvents(shape: Konva.Shape): void {
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

    shape.on('dragend', () => { this.saveUndoState(); });
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
    /* delete selected drawn shape */
    if (this.selectedNode) {
      this.selectedNode.destroy();
      this.selectedNode = null;
      this.transformer.nodes([]);
      this.drawLayer.batchDraw();
      this.saveUndoState();
      return;
    }
    /* delete selected marker */
    if (this.selectedMarker) {
      this.removeMarker(this.selectedMarker);
      this.selectedMarker = null;
      return;
    }
  }

  clearDrawings(): void {
    const children = this.drawLayer.getChildren().slice();
    children.forEach(child => {
      if (!(child instanceof Konva.Transformer)) child.destroy();
    });
    this.selectedNode = null;
    this.transformer.nodes([]);
    this.drawLayer.batchDraw();
    this.saveUndoState();
  }

  /* ────────────────── UNDO / REDO ────────────────── */
  private saveUndoState(): void {
    const state = this.getDrawLayerJSON();
    this.undoStack.push(state);
    this.redoStack = [];
    if (this.undoStack.length > 50) this.undoStack.shift();
    this.canUndo = this.undoStack.length > 1;
    this.canRedo = false;
  }

  undo(): void {
    if (this.undoStack.length <= 1) return;
    const current = this.undoStack.pop()!;
    this.redoStack.push(current);
    const prev = this.undoStack[this.undoStack.length - 1];
    this.restoreDrawLayerFromJSON(prev);
    this.canUndo = this.undoStack.length > 1;
    this.canRedo = true;
  }

  redo(): void {
    if (this.redoStack.length === 0) return;
    const state = this.redoStack.pop()!;
    this.undoStack.push(state);
    this.restoreDrawLayerFromJSON(state);
    this.canUndo = this.undoStack.length > 1;
    this.canRedo = this.redoStack.length > 0;
  }

  private restoreDrawLayerFromJSON(json: string): void {
    try {
      this.drawLayer.getChildren().slice().forEach(child => {
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

    if (isBall) {
      this.ballPlaced = true;

      /* invisible hit circle for selection feedback */
      const hitCircle = new Konva.Circle({
        radius: 16,
        fill: 'transparent',
        stroke: 'transparent',
        strokeWidth: 2.5
      });

      const label = new Konva.Text({
        text: '⚽', fontSize: 24,
        fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif',
        listening: false, offsetX: 12, offsetY: 12
      });
      group.add(hitCircle);
      group.add(label);
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
    } else {
      const radius = 18;
      const fill = this.playerColor;
      const num = String(this.nextPlayerNumber);
      this.nextPlayerNumber++;

      const circle = new Konva.Circle({
        radius, fill,
        stroke: '#ffffff', strokeWidth: 2.5,
        shadowColor: 'rgba(0,0,0,0.5)',
        shadowBlur: 8, shadowOffset: { x: 1, y: 3 }, shadowOpacity: 0.6
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

      group.add(circle);
      group.add(label);
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
    }
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
      m.number = val;
      m.label.text(val);
      m.label.offsetX(val.length > 1 ? 7.5 : 4);
      m.group.visible(true);
      input.remove();
      this.markerLayer.batchDraw();
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
      this.drawLayer.getChildren().slice().forEach(child => {
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
  exportImage(): void {
    this.saveCurrentKeyframeState();
    this.deselectAll();
    setTimeout(() => {
      const dataURL = this.stage.toDataURL({ pixelRatio: 2 });
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
        frames.push(this.stage.toDataURL({ pixelRatio: 1 }));
        this.exportProgress = Math.round(((ki * framesPerTransition + f) / totalFrames) * 80);
      }
    }

    this.restoreKeyframe(this.keyframes.length - 1);
    for (let i = 0; i < 10; i++) {
      frames.push(this.stage.toDataURL({ pixelRatio: 1 }));
    }
    this.exportProgress = 85;

    try {
      const gifshot = (window as any).gifshot || await this.loadGifshot();
      gifshot.createGIF({
        images: frames,
        gifWidth: this.stage.width(),
        gifHeight: this.stage.height(),
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
  }

  /* ────────────────── NAVIGATION ────────────────── */
  goBack(): void {
    this.router.navigate(['/dashboard/tareas', this.teamId]);
  }
}
