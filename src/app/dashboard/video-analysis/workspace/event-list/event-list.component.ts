import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PlayerStateService } from '../../services/player-state.service';
import { AnalysisEvent, AnalysisCategory } from '../../models/analysis.models';

@Component({
  selector: 'app-event-list',
  templateUrl: './event-list.component.html',
  styleUrls: ['./event-list.component.scss']
})
export class EventListComponent implements OnInit, OnDestroy {

  @Output() eventDelete = new EventEmitter<AnalysisEvent>();
  @Output() eventEdit = new EventEmitter<AnalysisEvent>();

  private destroy$ = new Subject<void>();

  events: AnalysisEvent[] = [];
  filteredEvents: AnalysisEvent[] = [];
  categories: AnalysisCategory[] = [];
  selectedEventId: number | null = null;

  filterCategoryId: number | null = null;
  searchQuery = '';

  constructor(public ps: PlayerStateService) {}

  ngOnInit(): void {
    this.ps.events$.pipe(takeUntil(this.destroy$)).subscribe(events => {
      this.events = events;
      this.applyFilter();
    });

    this.ps.categories$.pipe(takeUntil(this.destroy$)).subscribe(cats => {
      this.categories = cats;
    });

    this.ps.selectedEventId$.pipe(takeUntil(this.destroy$)).subscribe(id => {
      this.selectedEventId = id;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  applyFilter(): void {
    let result = [...this.events];
    if (this.filterCategoryId) {
      result = result.filter(e => e.categoryId === this.filterCategoryId);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(e =>
        (e.categoryName || '').toLowerCase().includes(q) ||
        (e.notes || '').toLowerCase().includes(q) ||
        (e.playerName || '').toLowerCase().includes(q)
      );
    }
    this.filteredEvents = result;
  }

  selectEvent(event: AnalysisEvent): void {
    this.ps.selectEvent(event.id);
    this.ps.seekTo(event.startTimeMs);
  }

  onDelete(event: AnalysisEvent, e: Event): void {
    e.stopPropagation();
    this.eventDelete.emit(event);
  }

  onEdit(event: AnalysisEvent, e: Event): void {
    e.stopPropagation();
    this.eventEdit.emit(event);
  }

  clearFilter(): void {
    this.filterCategoryId = null;
    this.searchQuery = '';
    this.applyFilter();
  }

  setFilterCategory(categoryId: number | null): void {
    this.filterCategoryId = categoryId;
    this.applyFilter();
  }
}
