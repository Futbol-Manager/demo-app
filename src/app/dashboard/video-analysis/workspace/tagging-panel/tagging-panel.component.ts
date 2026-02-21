import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PlayerStateService } from '../../services/player-state.service';
import { AnalysisCategory, AnalysisTag } from '../../models/analysis.models';

export interface TaggingEvent {
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  tagIds: number[];
  startTimeMs: number;
  endTimeMs: number;
}

@Component({
  selector: 'app-tagging-panel',
  templateUrl: './tagging-panel.component.html',
  styleUrls: ['./tagging-panel.component.scss']
})
export class TaggingPanelComponent implements OnInit, OnDestroy {

  @Output() tagged = new EventEmitter<TaggingEvent>();

  private destroy$ = new Subject<void>();

  categories: AnalysisCategory[] = [];
  expandedCategoryId: number | null = null;
  selectedTags: number[] = [];
  lastTaggedCategory: string | null = null;
  lastTaggedTime: number | null = null;
  showFeedback = false;

  constructor(public ps: PlayerStateService) {}

  ngOnInit(): void {
    this.ps.categories$.pipe(takeUntil(this.destroy$)).subscribe(cats => {
      this.categories = cats.filter(c => !c.parentId);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  tagCategory(category: AnalysisCategory): void {
    const currentTimeMs = this.ps.state.currentTimeMs;
    const halfDuration = (category.defaultDurationSec * 1000) / 2;
    const startTimeMs = Math.max(0, currentTimeMs - halfDuration);
    const endTimeMs = Math.min(this.ps.state.durationMs, currentTimeMs + halfDuration);

    this.tagged.emit({
      categoryId: category.id,
      categoryName: category.name,
      categoryColor: category.color,
      tagIds: [...this.selectedTags],
      startTimeMs,
      endTimeMs
    });

    this.lastTaggedCategory = category.name;
    this.lastTaggedTime = currentTimeMs;
    this.showFeedback = true;
    this.selectedTags = [];
    this.expandedCategoryId = null;

    setTimeout(() => { this.showFeedback = false; }, 1500);
  }

  expandCategory(category: AnalysisCategory): void {
    if (this.expandedCategoryId === category.id) {
      this.expandedCategoryId = null;
    } else {
      this.expandedCategoryId = category.id;
      this.selectedTags = [];
    }
  }

  toggleTag(tag: AnalysisTag): void {
    const idx = this.selectedTags.indexOf(tag.id);
    if (idx >= 0) {
      this.selectedTags.splice(idx, 1);
    } else {
      this.selectedTags.push(tag.id);
    }
  }

  isTagSelected(tagId: number): boolean {
    return this.selectedTags.includes(tagId);
  }

  tagAndClose(category: AnalysisCategory): void {
    this.tagCategory(category);
  }
}
