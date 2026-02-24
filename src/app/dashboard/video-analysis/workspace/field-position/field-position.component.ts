import { Component, Output, EventEmitter, Input } from '@angular/core';

export interface FieldPositionEvent {
  x: number;
  y: number;
}

@Component({
  selector: 'app-field-position',
  templateUrl: './field-position.component.html',
  styleUrls: ['./field-position.component.scss']
})
export class FieldPositionComponent {

  @Input() positions: { x: number; y: number; color?: string }[] = [];
  @Input() interactive = true;
  @Input() showHeatmap = false;
  @Output() positionSelected = new EventEmitter<FieldPositionEvent>();

  lastClickX: number | null = null;
  lastClickY: number | null = null;

  onFieldClick(event: MouseEvent): void {
    if (!this.interactive) return;
    const svg = event.currentTarget as SVGElement;
    const rect = svg.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    this.lastClickX = x;
    this.lastClickY = y;
    this.positionSelected.emit({ x, y });
  }

  getHeatmapOpacity(cellX: number, cellY: number): number {
    if (!this.showHeatmap || this.positions.length === 0) return 0;
    const cellSize = 0.1;
    const count = this.positions.filter(p =>
      p.x >= cellX && p.x < cellX + cellSize &&
      p.y >= cellY && p.y < cellY + cellSize
    ).length;
    const maxCount = Math.max(1, ...this.getHeatmapCounts());
    return count / maxCount;
  }

  private heatmapCountsCache: number[] | null = null;
  private getHeatmapCounts(): number[] {
    if (this.heatmapCountsCache) return this.heatmapCountsCache;
    const counts: number[] = [];
    for (let x = 0; x < 1; x += 0.1) {
      for (let y = 0; y < 1; y += 0.1) {
        const cellSize = 0.1;
        const count = this.positions.filter(p =>
          p.x >= x && p.x < x + cellSize &&
          p.y >= y && p.y < y + cellSize
        ).length;
        counts.push(count);
      }
    }
    this.heatmapCountsCache = counts;
    return counts;
  }

  get heatmapCells(): { x: number; y: number; opacity: number }[] {
    if (!this.showHeatmap) return [];
    this.heatmapCountsCache = null;
    const cells: { x: number; y: number; opacity: number }[] = [];
    for (let x = 0; x < 1; x += 0.1) {
      for (let y = 0; y < 1; y += 0.1) {
        const opacity = this.getHeatmapOpacity(x, y);
        if (opacity > 0) {
          cells.push({ x, y, opacity });
        }
      }
    }
    return cells;
  }
}
