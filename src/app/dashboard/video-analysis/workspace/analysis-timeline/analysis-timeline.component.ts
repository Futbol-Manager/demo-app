import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PlayerStateService } from '../../services/player-state.service';
import { AnalysisEvent } from '../../models/analysis.models';

@Component({
  selector: 'app-analysis-timeline',
  templateUrl: './analysis-timeline.component.html',
  styleUrls: ['./analysis-timeline.component.scss']
})
export class AnalysisTimelineComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('timelineCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('timelineContainer', { static: true }) containerRef!: ElementRef<HTMLDivElement>;

  private destroy$ = new Subject<void>();
  private ctx!: CanvasRenderingContext2D;
  private animFrameId: number | null = null;

  events: AnalysisEvent[] = [];
  currentTimeMs = 0;
  durationMs = 0;

  zoomLevel = 1;
  scrollOffset = 0;
  private isDragging = false;

  hoveredEvent: AnalysisEvent | null = null;
  tooltipX = 0;
  tooltipY = 0;

  constructor(public ps: PlayerStateService) {}

  ngOnInit(): void {
    this.ps.events$.pipe(takeUntil(this.destroy$)).subscribe(events => {
      this.events = events;
      this.draw();
    });

    this.ps.state$.pipe(takeUntil(this.destroy$)).subscribe(state => {
      this.currentTimeMs = state.currentTimeMs;
      this.durationMs = state.durationMs;
    });

    this.ps.selectedEventId$.pipe(takeUntil(this.destroy$)).subscribe(() => this.draw());
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.resizeCanvas();
    this.startDrawLoop();

    const ro = new ResizeObserver(() => this.resizeCanvas());
    ro.observe(this.containerRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
  }

  private resizeCanvas(): void {
    const container = this.containerRef.nativeElement;
    const canvas = this.canvasRef.nativeElement;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = container.clientWidth * dpr;
    canvas.height = container.clientHeight * dpr;
    canvas.style.width = container.clientWidth + 'px';
    canvas.style.height = container.clientHeight + 'px';
    this.ctx.scale(dpr, dpr);
    this.draw();
  }

  private startDrawLoop(): void {
    const loop = () => {
      this.draw();
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  private draw(): void {
    if (!this.ctx) return;
    const canvas = this.canvasRef.nativeElement;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, w, h);

    if (this.durationMs === 0) return;

    const visibleDuration = this.durationMs / this.zoomLevel;
    const startMs = this.scrollOffset;
    const endMs = startMs + visibleDuration;
    const pxPerMs = w / visibleDuration;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
    ctx.fillRect(0, 0, w, h);

    // Time markers
    const interval = this.getTimeInterval(visibleDuration);
    ctx.fillStyle = '#6c757d';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';

    for (let t = Math.ceil(startMs / interval) * interval; t <= endMs; t += interval) {
      const x = (t - startMs) * pxPerMs;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(x, 0, 1, h);
      ctx.fillStyle = '#6c757d';
      ctx.fillText(this.ps.formatTime(t), x, h - 4);
    }

    // Event blocks
    const rowHeight = 26;
    const selectedId = this.ps.selectedEventId$.value;

    for (const event of this.events) {
      if (event.endTimeMs < startMs || event.startTimeMs > endMs) continue;

      const x1 = Math.max(0, (event.startTimeMs - startMs) * pxPerMs);
      const x2 = Math.min(w, (event.endTimeMs - startMs) * pxPerMs);
      const blockW = Math.max(x2 - x1, 3);
      const y = 6;

      ctx.fillStyle = event.categoryColor || '#3498db';
      ctx.globalAlpha = event.id === selectedId ? 1 : 0.7;
      ctx.beginPath();
      this.drawRoundRect(ctx, x1, y, blockW, rowHeight, 4);
      ctx.fill();

      if (event.id === selectedId) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (blockW > 40) {
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 1;
        ctx.font = 'bold 10px system-ui';
        ctx.textAlign = 'left';
        ctx.fillText(
          (event.categoryName || '').substring(0, Math.floor(blockW / 6)),
          x1 + 4, y + 16
        );
      }

      ctx.globalAlpha = 1;
    }

    // Playhead
    const playheadX = (this.currentTimeMs - startMs) * pxPerMs;
    if (playheadX >= 0 && playheadX <= w) {
      ctx.fillStyle = '#E74C3C';
      ctx.fillRect(playheadX - 1, 0, 2, h);

      ctx.beginPath();
      ctx.moveTo(playheadX - 5, 0);
      ctx.lineTo(playheadX + 5, 0);
      ctx.lineTo(playheadX, 8);
      ctx.closePath();
      ctx.fillStyle = '#E74C3C';
      ctx.fill();
    }
  }

  private getTimeInterval(visibleDurationMs: number): number {
    const targetTicks = 10;
    const raw = visibleDurationMs / targetTicks;
    const intervals = [1000, 2000, 5000, 10000, 15000, 30000, 60000, 120000, 300000, 600000];
    return intervals.find(i => i >= raw) || 600000;
  }

  onCanvasClick(event: MouseEvent): void {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const w = rect.width;
    const visibleDuration = this.durationMs / this.zoomLevel;
    const clickedTimeMs = this.scrollOffset + (x / w) * visibleDuration;

    const clickedEvent = this.findEventAt(clickedTimeMs, event.clientY - rect.top);
    if (clickedEvent) {
      this.ps.selectEvent(clickedEvent.id);
      this.ps.seekTo(clickedEvent.startTimeMs);
    } else {
      this.ps.seekTo(clickedTimeMs);
      this.ps.selectEvent(null);
    }
  }

  onCanvasMouseMove(event: MouseEvent): void {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const w = rect.width;
    const visibleDuration = this.durationMs / this.zoomLevel;
    const hoverTimeMs = this.scrollOffset + (x / w) * visibleDuration;

    this.hoveredEvent = this.findEventAt(hoverTimeMs, y);
    if (this.hoveredEvent) {
      this.tooltipX = event.clientX;
      this.tooltipY = event.clientY - 40;
    }
  }

  onCanvasMouseLeave(): void {
    this.hoveredEvent = null;
  }

  private findEventAt(timeMs: number, _y: number): AnalysisEvent | null {
    for (const e of this.events) {
      if (timeMs >= e.startTimeMs && timeMs <= e.endTimeMs) {
        return e;
      }
    }
    return null;
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    if (event.ctrlKey) {
      const delta = event.deltaY > 0 ? -0.2 : 0.2;
      this.zoomLevel = Math.max(1, Math.min(50, this.zoomLevel + delta * this.zoomLevel));
    } else {
      const visibleDuration = this.durationMs / this.zoomLevel;
      const scrollAmount = visibleDuration * 0.1 * (event.deltaY > 0 ? 1 : -1);
      this.scrollOffset = Math.max(0, Math.min(this.durationMs - visibleDuration, this.scrollOffset + scrollAmount));
    }
  }

  zoomIn(): void {
    this.zoomLevel = Math.min(50, this.zoomLevel * 1.3);
  }

  zoomOut(): void {
    this.zoomLevel = Math.max(1, this.zoomLevel / 1.3);
  }

  resetZoom(): void {
    this.zoomLevel = 1;
    this.scrollOffset = 0;
  }

  centerOnPlayhead(): void {
    const visibleDuration = this.durationMs / this.zoomLevel;
    this.scrollOffset = Math.max(0, this.currentTimeMs - visibleDuration / 2);
  }

  private drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    r = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
  }
}
