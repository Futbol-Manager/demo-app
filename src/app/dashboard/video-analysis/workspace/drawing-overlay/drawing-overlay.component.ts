import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, Input, Output, EventEmitter } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PlayerStateService } from '../../services/player-state.service';

export interface DrawingShape {
  type: 'arrow' | 'line' | 'rect' | 'ellipse' | 'freehand' | 'text' | 'spotlight';
  points: number[];
  color: string;
  lineWidth: number;
  opacity: number;
  text?: string;
}

export interface DrawingData {
  shapes: DrawingShape[];
  width: number;
  height: number;
}

export interface SaveDrawingEvent {
  timestampMs: number;
  durationMs: number;
  drawingData: string;
}

@Component({
  selector: 'app-drawing-overlay',
  templateUrl: './drawing-overlay.component.html',
  styleUrls: ['./drawing-overlay.component.scss']
})
export class DrawingOverlayComponent implements OnInit, OnDestroy, AfterViewInit {

  @Input() active = false;
  @Output() saved = new EventEmitter<SaveDrawingEvent>();

  @ViewChild('drawingCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private destroy$ = new Subject<void>();
  private ctx!: CanvasRenderingContext2D;

  currentTool: 'arrow' | 'line' | 'rect' | 'ellipse' | 'freehand' | 'text' | 'spotlight' = 'arrow';
  currentColor = '#E74C3C';
  currentLineWidth = 3;
  currentOpacity = 1;
  drawingDurationMs = 3000;

  shapes: DrawingShape[] = [];
  undoStack: DrawingShape[][] = [];
  private isDrawing = false;
  private startX = 0;
  private startY = 0;
  private currentPoints: number[] = [];

  readonly tools = [
    { id: 'arrow', icon: 'bi-arrow-up-right', label: 'Flecha' },
    { id: 'line', icon: 'bi-dash-lg', label: 'Línea' },
    { id: 'rect', icon: 'bi-square', label: 'Rectángulo' },
    { id: 'ellipse', icon: 'bi-circle', label: 'Elipse' },
    { id: 'freehand', icon: 'bi-pencil', label: 'Dibujo libre' },
    { id: 'text', icon: 'bi-fonts', label: 'Texto' },
    { id: 'spotlight', icon: 'bi-bullseye', label: 'Spotlight' },
  ];

  readonly colors = ['#E74C3C', '#F39C12', '#2ECC71', '#3498DB', '#9B59B6', '#FFFFFF', '#000000'];

  constructor(private ps: PlayerStateService) {}

  ngOnInit(): void {
    this.ps.drawingModeToggle$.pipe(takeUntil(this.destroy$)).subscribe(active => {
      this.active = active;
      if (!active) {
        this.shapes = [];
        this.redraw();
      }
    });

    this.ps.activeDrawingTool$.pipe(takeUntil(this.destroy$)).subscribe(tool => {
      if (tool) this.currentTool = tool as any;
    });
  }

  ngAfterViewInit(): void {
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.resizeCanvas();

    const ro = new ResizeObserver(() => this.resizeCanvas());
    ro.observe(this.canvasRef.nativeElement.parentElement!);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private resizeCanvas(): void {
    const parent = this.canvasRef.nativeElement.parentElement!;
    const canvas = this.canvasRef.nativeElement;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
    this.redraw();
  }

  onMouseDown(event: MouseEvent): void {
    if (!this.active) return;
    this.isDrawing = true;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.startX = event.clientX - rect.left;
    this.startY = event.clientY - rect.top;

    if (this.currentTool === 'freehand') {
      this.currentPoints = [this.startX, this.startY];
    }

    if (this.currentTool === 'text') {
      const text = prompt('Texto:');
      if (text) {
        this.undoStack.push([...this.shapes]);
        this.shapes.push({
          type: 'text',
          points: [this.startX, this.startY],
          color: this.currentColor,
          lineWidth: this.currentLineWidth,
          opacity: this.currentOpacity,
          text
        });
        this.redraw();
      }
      this.isDrawing = false;
    }
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.isDrawing || !this.active) return;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (this.currentTool === 'freehand') {
      this.currentPoints.push(x, y);
    }

    this.redraw();
    this.drawPreview(x, y);
  }

  onMouseUp(event: MouseEvent): void {
    if (!this.isDrawing || !this.active) return;
    this.isDrawing = false;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (this.currentTool === 'text') return;

    this.undoStack.push([...this.shapes]);

    const points = this.currentTool === 'freehand'
      ? [...this.currentPoints]
      : [this.startX, this.startY, x, y];

    this.shapes.push({
      type: this.currentTool,
      points,
      color: this.currentColor,
      lineWidth: this.currentLineWidth,
      opacity: this.currentOpacity
    });

    this.currentPoints = [];
    this.redraw();
  }

  private drawPreview(endX: number, endY: number): void {
    const ctx = this.ctx;

    if (this.currentTool === 'spotlight') {
      // Combina todos los spotlights existentes + el nuevo que se está dibujando
      // en una única capa oscura con todos los agujeros a la vez.
      const previewShape: DrawingShape = {
        type: 'spotlight',
        points: [this.startX, this.startY, endX, endY],
        color: this.currentColor,
        lineWidth: this.currentLineWidth,
        opacity: 1
      };
      const allSpotlights = [
        ...this.shapes.filter(s => s.type === 'spotlight'),
        previewShape
      ];
      this.drawAllSpotlights(ctx, allSpotlights);
      return;
    }

    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = this.currentColor;
    ctx.lineWidth = this.currentLineWidth;

    if (this.currentTool === 'freehand' && this.currentPoints.length >= 4) {
      this.drawFreehand(ctx, this.currentPoints);
    } else if (this.currentTool !== 'text') {
      this.drawShape(ctx, this.currentTool, this.startX, this.startY, endX, endY);
    }

    ctx.restore();
  }

  private redraw(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    const spotlights = this.shapes.filter(s => s.type === 'spotlight');
    const others     = this.shapes.filter(s => s.type !== 'spotlight');

    // Dibuja formas normales (sin spotlight)
    for (const shape of others) {
      this.ctx.save();
      this.ctx.globalAlpha = shape.opacity;
      this.ctx.strokeStyle = shape.color;
      this.ctx.fillStyle   = shape.color;
      this.ctx.lineWidth   = shape.lineWidth;

      if (shape.type === 'freehand') {
        this.drawFreehand(this.ctx, shape.points);
      } else if (shape.type === 'text') {
        this.ctx.font = `bold ${16 + shape.lineWidth * 2}px system-ui`;
        this.ctx.fillText(shape.text || '', shape.points[0], shape.points[1]);
      } else {
        this.drawShape(this.ctx, shape.type, shape.points[0], shape.points[1], shape.points[2], shape.points[3]);
      }

      this.ctx.restore();
    }

    // Dibuja TODOS los spotlights como una única capa compuesta.
    // Si el usuario está dibujando un nuevo spotlight ahora mismo,
    // drawPreview() se encargará de incluirlo junto con los existentes.
    if (spotlights.length > 0 && !(this.isDrawing && this.currentTool === 'spotlight')) {
      this.drawAllSpotlights(this.ctx, spotlights);
    }
  }

  private drawShape(ctx: CanvasRenderingContext2D, type: string, x1: number, y1: number, x2: number, y2: number): void {
    ctx.beginPath();
    switch (type) {
      case 'arrow':
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headLen = 14;
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
        break;
      case 'line':
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        break;
      case 'rect':
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        break;
      case 'ellipse':
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        const rx = Math.abs(x2 - x1) / 2;
        const ry = Math.abs(y2 - y1) / 2;
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        break;
    }
  }

  private drawFreehand(ctx: CanvasRenderingContext2D, points: number[]): void {
    if (points.length < 4) return;
    ctx.beginPath();
    ctx.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) {
      ctx.lineTo(points[i], points[i + 1]);
    }
    ctx.stroke();
  }

  /**
   * Dibuja UNA SOLA capa oscura sobre todo el canvas y abre un agujero
   * por cada spotlight de la lista. Así varios focos comparten la misma
   * capa de oscuridad y ninguno tapa al otro.
   */
  private drawAllSpotlights(ctx: CanvasRenderingContext2D, spotlights: DrawingShape[]): void {
    const canvas = this.canvasRef.nativeElement;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalCompositeOperation = 'destination-out';
    for (const shape of spotlights) {
      const cx = (shape.points[0] + shape.points[2]) / 2;
      const cy = (shape.points[1] + shape.points[3]) / 2;
      const rx = Math.abs(shape.points[2] - shape.points[0]) / 2;
      const ry = Math.abs(shape.points[3] - shape.points[1]) / 2;
      if (rx < 1 || ry < 1) continue;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }

  setTool(tool: string): void {
    this.currentTool = tool as any;
    this.ps.setDrawingTool(tool);
  }

  undo(): void {
    if (this.undoStack.length === 0) return;
    this.shapes = this.undoStack.pop()!;
    this.redraw();
  }

  clearAll(): void {
    this.undoStack.push([...this.shapes]);
    this.shapes = [];
    this.redraw();
  }

  saveDrawing(): void {
    const canvas = this.canvasRef.nativeElement;
    const data: DrawingData = {
      shapes: this.shapes,
      width: canvas.width,
      height: canvas.height
    };

    this.saved.emit({
      timestampMs: this.ps.state.currentTimeMs,
      durationMs: this.drawingDurationMs,
      drawingData: JSON.stringify(data)
    });

    this.shapes = [];
    this.undoStack = [];
    this.redraw();
  }
}
