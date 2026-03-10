import { Component, OnInit, OnDestroy, HostListener, NgZone } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { VideoAnalysisService } from '../../../core/services/video-analysis/video-analysis.service';
import { AnalysisCategory, AnalysisTag, AnalysisTemplate } from '../models/analysis.models';
import { TaggingEvent } from '../workspace/tagging-panel/tagging-panel.component';

@Component({
  selector: 'app-canvas-tagger-window',
  templateUrl: './canvas-tagger-window.component.html',
  styleUrls: ['./canvas-tagger-window.component.scss']
})
export class CanvasTaggerWindowComponent implements OnInit, OnDestroy {

  projectId = 0;
  clubId = 0;
  isLoading = true;
  template: AnalysisTemplate | null = null;
  categories: AnalysisCategory[] = [];
  descriptors: AnalysisTag[] = [];

  // ── State machine: idle / armed ──────────────────────────────────────────
  /** null = idle; set = armed (waiting for descriptor selection) */
  armedCategoryId: number | null = null;
  /** IDs of selected descriptors in the current armed session */
  selectedDescriptorIds: number[] = [];
  /** Time captured when the category was clicked */
  pendingTimeMs = 0;

  // Tag history (shown at bottom)
  tagHistory: { categoryName: string; categoryColor: string; timeMs: number; descriptorNames: string[] }[] = [];

  // Current time received from main window
  currentTimeMs = 0;

  private channel: BroadcastChannel | null = null;

  constructor(
    private route: ActivatedRoute,
    private analysisService: VideoAnalysisService,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.projectId = +(this.route.snapshot.paramMap.get('projectId') || '0');
    this.clubId = Number(sessionStorage.getItem('clubId')) || Number(localStorage.getItem('clubId')) || 0;
    this.loadProject();

    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(`sphaira-tagging-${this.projectId}`);
      this.channel.onmessage = (e) => {
        this.ngZone.run(() => {
          if (e.data.type === 'time-update') {
            this.currentTimeMs = e.data.timeMs;
          }
        });
      };
    }
  }

  ngOnDestroy(): void {
    this.channel?.close();
  }

  private loadProject(): void {
    this.analysisService.getProject(this.projectId, this.clubId)
      .subscribe({
        next: (res) => {
          const project = res.data;
          if (project?.templateId) {
            this.loadTemplate(project.templateId);
          } else {
            this.isLoading = false;
          }
        },
        error: () => { this.isLoading = false; }
      });
  }

  private loadTemplate(templateId: number): void {
    this.analysisService.getTemplate(templateId)
      .subscribe({
        next: (res) => {
          if (res.data) {
            this.template = res.data.template;
            const rawCategories: any[] = res.data.categories || [];
            this.categories = rawCategories.map((item: any) => {
              const cat = item.category ?? item;
              return { ...cat, tags: item.tags ?? [] } as AnalysisCategory;
            }).filter((c: AnalysisCategory) => !c.parentId);
            this.descriptors = res.data.descriptors || [];
          }
          this.isLoading = false;
        },
        error: () => { this.isLoading = false; }
      });
  }

  // ── Computed ──────────────────────────────────────────────────────────────

  get isArmed(): boolean { return this.armedCategoryId !== null; }
  get armedCategory(): AnalysisCategory | null {
    return this.categories.find(c => c.id === this.armedCategoryId) ?? null;
  }
  get selectedDescriptors(): AnalysisTag[] {
    return this.descriptors.filter(d => this.selectedDescriptorIds.includes(d.id));
  }

  get canvasBg(): string { return (this.template as any)?.bgColor || '#1a1a2e'; }

  // ── Shape helpers ─────────────────────────────────────────────────────────

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

  // ── State machine ─────────────────────────────────────────────────────────

  onCategoryClick(event: MouseEvent, cat: AnalysisCategory): void {
    event.stopPropagation();
    if (this.armedCategoryId === cat.id) {
      // Clicking the armed category again = cancel
      this.cancel();
      return;
    }
    // Arm the category
    this.armedCategoryId = cat.id;
    this.selectedDescriptorIds = [];
    this.pendingTimeMs = this.currentTimeMs;
    // Pause video while selecting descriptors
    this.channel?.postMessage({ type: 'pause' });
  }

  onDescriptorClick(event: MouseEvent, desc: AnalysisTag): void {
    event.stopPropagation();
    if (!this.isArmed) return;
    const idx = this.selectedDescriptorIds.indexOf(desc.id);
    if (idx >= 0) {
      this.selectedDescriptorIds.splice(idx, 1);
    } else {
      this.selectedDescriptorIds.push(desc.id);
    }
    // Re-trigger change detection
    this.selectedDescriptorIds = [...this.selectedDescriptorIds];
  }

  isDescriptorSelected(id: number): boolean {
    return this.selectedDescriptorIds.includes(id);
  }

  confirmTag(): void {
    if (!this.armedCategory) return;
    this.emitTagEvent(this.armedCategory, [...this.selectedDescriptorIds]);
    this.cancel(false);
    this.channel?.postMessage({ type: 'resume' });
  }

  cancel(resumeVideo = true): void {
    this.armedCategoryId = null;
    this.selectedDescriptorIds = [];
    if (resumeVideo) {
      this.channel?.postMessage({ type: 'resume' });
    }
  }

  private emitTagEvent(cat: AnalysisCategory, descriptorIds: number[]): void {
    const timeMs = this.pendingTimeMs;
    const startTimeMs = Math.max(0, timeMs - cat.preTimeSec * 1000);
    const endTimeMs = timeMs + cat.postTimeSec * 1000;

    const event: TaggingEvent = {
      categoryId: cat.id, categoryName: cat.name, categoryColor: cat.color,
      tagIds: descriptorIds, startTimeMs, endTimeMs
    };

    this.channel?.postMessage({ type: 'tag', event });

    // Add to history
    const descriptorNames = descriptorIds
      .map(id => this.descriptors.find(d => d.id === id)?.name)
      .filter(Boolean) as string[];
    this.tagHistory.unshift({ categoryName: cat.name, categoryColor: cat.color, timeMs, descriptorNames });
    if (this.tagHistory.length > 20) this.tagHistory.pop();
  }

  formatTime(ms: number): string {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  }

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      if (this.isArmed) { e.preventDefault(); this.cancel(); }
      return;
    }
    if ((e.key === 'Enter') && this.isArmed) {
      e.preventDefault();
      this.confirmTag();
      return;
    }
    // Category shortcut keys — arm the category (don't tag immediately)
    if (!this.isArmed && e.key.length === 1) {
      const cat = this.categories.find(c => c.shortcutKey?.toLowerCase() === e.key.toLowerCase());
      if (cat) {
        e.preventDefault();
        this.onCategoryClick(new MouseEvent('click'), cat);
      }
    }
  }
}
