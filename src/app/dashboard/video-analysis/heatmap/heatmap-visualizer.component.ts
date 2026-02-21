import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PlayerStateService } from '../services/player-state.service';
import { AnalysisEvent, AnalysisCategory } from '../models/analysis.models';

@Component({
  selector: 'app-heatmap-visualizer',
  templateUrl: './heatmap-visualizer.component.html',
  styleUrls: ['./heatmap-visualizer.component.scss']
})
export class HeatmapVisualizerComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  events: AnalysisEvent[] = [];
  categories: AnalysisCategory[] = [];
  filteredEvents: AnalysisEvent[] = [];

  filterCategoryId: number | null = null;
  filterPlayerId: number | null = null;

  positions: { x: number; y: number; color?: string }[] = [];

  statsBreakdown: { name: string; color: string; count: number; percent: number }[] = [];
  totalEvents = 0;
  eventsWithPosition = 0;

  constructor(private ps: PlayerStateService) {}

  ngOnInit(): void {
    this.ps.events$.pipe(takeUntil(this.destroy$)).subscribe(events => {
      this.events = events;
      this.applyFilters();
    });

    this.ps.categories$.pipe(takeUntil(this.destroy$)).subscribe(cats => {
      this.categories = cats;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  applyFilters(): void {
    let result = [...this.events];
    if (this.filterCategoryId) {
      result = result.filter(e => e.categoryId === this.filterCategoryId);
    }
    if (this.filterPlayerId) {
      result = result.filter(e => e.playerId === this.filterPlayerId);
    }
    this.filteredEvents = result;
    this.totalEvents = result.length;

    this.positions = result
      .filter(e => e.fieldX != null && e.fieldY != null)
      .map(e => ({ x: e.fieldX!, y: e.fieldY!, color: e.categoryColor }));

    this.eventsWithPosition = this.positions.length;
    this.buildStats(result);
  }

  private buildStats(events: AnalysisEvent[]): void {
    const counts = new Map<number, number>();
    for (const e of events) {
      counts.set(e.categoryId, (counts.get(e.categoryId) || 0) + 1);
    }

    this.statsBreakdown = [];
    for (const [catId, count] of counts.entries()) {
      const cat = this.categories.find(c => c.id === catId);
      this.statsBreakdown.push({
        name: cat?.name || `Cat ${catId}`,
        color: cat?.color || '#6c757d',
        count,
        percent: events.length > 0 ? Math.round((count / events.length) * 100) : 0
      });
    }
    this.statsBreakdown.sort((a, b) => b.count - a.count);
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  goBack(): void {
    window.history.back();
  }
}
