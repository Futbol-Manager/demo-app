import {
  Component, OnInit, OnDestroy, Output, EventEmitter,
  HostListener, Input, NgZone
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PlayerStateService } from '../../services/player-state.service';
import { AnalysisCategory, AnalysisTag, AnalysisTemplate } from '../../models/analysis.models';

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

  @Input() projectId = 0;
  @Output() tagged = new EventEmitter<TaggingEvent>();

  private destroy$ = new Subject<void>();

  categories: AnalysisCategory[] = [];
  template: AnalysisTemplate | null = null;

  // Visibility
  isVisible = true;

  // Floating panel geometry
  floatX = 20;
  floatY = 70;
  panelW = 520;
  get canvasH(): number { return Math.round(this.panelW * 9 / 16); }
  get panelH(): number { return this.canvasH + 44; } // +44px header

  // Drag
  private isDragging = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;

  // Resize
  private isResizing = false;
  private resizeStartX = 0;
  private resizeStartW = 0;

  // Tagging state
  showDescriptorPopup = false;
  activeCategory: AnalysisCategory | null = null;
  selectedTagIds: number[] = [];
  pendingTimeMs = 0;
  popupLeft = 0;
  popupTop = 0;

  // Feedback
  showFeedback = false;
  lastTaggedCategory = '';
  lastTaggedTime = 0;

  constructor(public ps: PlayerStateService, private ngZone: NgZone) {}

  ngOnInit(): void {
    this.ps.categories$.pipe(takeUntil(this.destroy$)).subscribe(cats => {
      this.categories = cats.filter(c => !c.parentId);
    });
    this.ps.template$.pipe(takeUntil(this.destroy$)).subscribe(t => {
      this.template = t;
    });
    this.floatX = Math.max(20, window.innerWidth - this.panelW - 20);
    this.floatY = 70;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Shape helpers ──────────────────────────────────────────────────────────

  getShapeRadius(shape: string): string {
    switch (shape) {
      case 'CIRCLE': return '50%';
      case 'SQUARE': return '4px';
      default: return '8px';
    }
  }

  getShapeClip(shape: string): string {
    return shape === 'DIAMOND' ? 'polygon(50% 0%,100% 50%,50% 100%,0% 50%)' : 'none';
  }

  // ── Canvas background ──────────────────────────────────────────────────────

  get canvasBg(): string { return this.template?.bgColor || '#1a1a2e'; }

  // ── Drag ──────────────────────────────────────────────────────────────────

  onHeaderMouseDown(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('button')) return;
    event.preventDefault();
    this.isDragging = true;
    this.dragOffsetX = event.clientX - this.floatX;
    this.dragOffsetY = event.clientY - this.floatY;
  }

  // ── Resize ────────────────────────────────────────────────────────────────

  onResizeStart(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isResizing = true;
    this.resizeStartX = event.clientX;
    this.resizeStartW = this.panelW;
  }

  // ── Mouse events (document) ───────────────────────────────────────────────

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (this.isDragging) {
      this.floatX = Math.max(0, Math.min(window.innerWidth - this.panelW, event.clientX - this.dragOffsetX));
      this.floatY = Math.max(0, Math.min(window.innerHeight - 50, event.clientY - this.dragOffsetY));
    }
    if (this.isResizing) {
      const dx = event.clientX - this.resizeStartX;
      this.panelW = Math.max(320, Math.min(1200, this.resizeStartW + dx));
    }
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    this.isDragging = false;
    this.isResizing = false;
  }

  // ── Category click ────────────────────────────────────────────────────────

  onCategoryClick(event: MouseEvent, cat: AnalysisCategory): void {
    event.stopPropagation();
    this.pendingTimeMs = this.ps.state.currentTimeMs;
    this.activeCategory = cat;
    this.selectedTagIds = [];

    if (cat.tags && cat.tags.length > 0) {
      this.ps.pause();
      this.showDescriptorPopup = true;
      // Popup position: right of button if room, else left; below if room, else above
      this.popupLeft = cat.posX + cat.sizeW + 2 > 80
        ? Math.max(0, cat.posX - 38)
        : cat.posX + cat.sizeW + 2;
      this.popupTop = Math.max(0, Math.min(70, cat.posY));
    } else {
      this.emitTagEvent(cat, []);
    }
  }

  toggleTagId(id: number): void {
    const idx = this.selectedTagIds.indexOf(id);
    if (idx >= 0) this.selectedTagIds.splice(idx, 1);
    else this.selectedTagIds.push(id);
  }

  isTagSelected(id: number): boolean {
    return this.selectedTagIds.includes(id);
  }

  confirmTag(): void {
    if (!this.activeCategory) return;
    this.emitTagEvent(this.activeCategory, [...this.selectedTagIds]);
    this.showDescriptorPopup = false;
    this.activeCategory = null;
    this.ps.play();
  }

  cancelTag(): void {
    this.showDescriptorPopup = false;
    this.activeCategory = null;
    this.selectedTagIds = [];
    this.ps.play();
  }

  private emitTagEvent(cat: AnalysisCategory, tagIds: number[]): void {
    const timeMs = this.pendingTimeMs;
    const startTimeMs = Math.max(0, timeMs - (cat.preTimeSec * 1000));
    const endTimeMs = Math.min(this.ps.state.durationMs || timeMs + 10000, timeMs + (cat.postTimeSec * 1000));

    this.tagged.emit({ categoryId: cat.id, categoryName: cat.name, categoryColor: cat.color, tagIds, startTimeMs, endTimeMs });

    this.lastTaggedCategory = cat.name;
    this.lastTaggedTime = timeMs;
    this.showFeedback = true;
    setTimeout(() => this.ngZone.run(() => { this.showFeedback = false; }), 2000);
  }

  // ── Open in new window ────────────────────────────────────────────────────

  openInNewWindow(): void {
    if (!this.projectId) return;
    const url = `/dashboard/video-analysis/canvas-tagger/${this.projectId}`;
    window.open(url, `sphaira-tagger-${this.projectId}`, 'width=640,height=420,resizable=yes,scrollbars=no');
  }
}
