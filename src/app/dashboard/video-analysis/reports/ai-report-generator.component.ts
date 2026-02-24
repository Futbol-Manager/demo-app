import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { VideoAnalysisService } from '../../../core/services/video-analysis/video-analysis.service';
import { PlayerStateService } from '../services/player-state.service';
import { AnalysisEvent, AnalysisCategory } from '../models/analysis.models';

@Component({
  selector: 'app-ai-report-generator',
  templateUrl: './ai-report-generator.component.html',
  styleUrls: ['./ai-report-generator.component.scss']
})
export class AiReportGeneratorComponent implements OnInit, OnDestroy {

  @Input() projectId = 0;
  @Input() clubId = 0;
  @Input() userId = 0;

  private destroy$ = new Subject<void>();

  events: AnalysisEvent[] = [];
  private categories: AnalysisCategory[] = [];
  private tagMap = new Map<number, string>();
  isGenerating = false;
  generatedReport: any = null;
  reportError = '';
  showPanel = false;

  reportOptions = {
    includeStats: true,
    includeHeatmap: true,
    includeTimeline: true,
    language: 'es',
    format: 'detailed'
  };

  constructor(
    private analysisService: VideoAnalysisService,
    private ps: PlayerStateService
  ) {}

  ngOnInit(): void {
    this.ps.events$.pipe(takeUntil(this.destroy$)).subscribe(events => {
      this.events = events;
    });
    this.ps.categories$.pipe(takeUntil(this.destroy$)).subscribe(cats => {
      this.categories = cats;
      this.tagMap.clear();
      for (const cat of cats) {
        for (const tag of cat.tags || []) {
          this.tagMap.set(tag.id, tag.name);
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  togglePanel(): void {
    this.showPanel = !this.showPanel;
  }

  generateReport(): void {
    if (this.events.length === 0) {
      this.reportError = 'No hay eventos etiquetados para generar un informe.';
      return;
    }

    this.isGenerating = true;
    this.reportError = '';
    this.generatedReport = null;

    const eventsSummary = this.buildEventsSummary();

    this.analysisService.generateAiReport(this.projectId, {
      clubId: this.clubId,
      userId: this.userId,
      eventsSummary,
      options: this.reportOptions
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.isGenerating = false;
          if (res.data) {
            this.generatedReport = res.data;
          }
        },
        error: (err) => {
          this.isGenerating = false;
          this.reportError = 'Error al generar el informe. Inténtalo de nuevo.';
        }
      });
  }

  private msToMatchTime(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  private buildEventsSummary(): any {
    const categoryCounts: { [key: string]: number } = {};
    const categoryTimes: { [key: string]: number } = {};
    const categoryDescriptors: { [key: string]: { [desc: string]: number } } = {};

    for (const e of this.events) {
      const catName = e.categoryName || 'Sin categoría';
      categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
      categoryTimes[catName] = (categoryTimes[catName] || 0) + (e.endTimeMs - e.startTimeMs);

      if (!categoryDescriptors[catName]) {
        categoryDescriptors[catName] = {};
      }
      for (const tagId of e.tagIds || []) {
        const tagName = this.tagMap.get(tagId) || `#${tagId}`;
        categoryDescriptors[catName][tagName] = (categoryDescriptors[catName][tagName] || 0) + 1;
      }
    }

    return {
      totalEvents: this.events.length,
      categoryCounts,
      categoryTimes,
      categoryDescriptors,
      firstEventMs: this.events.length > 0 ? this.events[0].startTimeMs : 0,
      lastEventMs: this.events.length > 0 ? this.events[this.events.length - 1].endTimeMs : 0,
      eventsWithPosition: this.events.filter(e => e.fieldX != null).length,
      events: this.events.map(e => ({
        button: e.categoryName || 'Sin categoría',
        matchTime: this.msToMatchTime(e.startTimeMs),
        startMs: e.startTimeMs,
        endMs: e.endTimeMs,
        durationSec: Math.round((e.endTimeMs - e.startTimeMs) / 1000),
        descriptors: (e.tagIds || []).map(id => this.tagMap.get(id) || `#${id}`),
        player: e.playerName || null,
        notes: e.notes || null,
        fieldX: e.fieldX ?? null,
        fieldY: e.fieldY ?? null
      }))
    };
  }

  get canGenerate(): boolean {
    return this.events.length > 0 && !this.isGenerating;
  }
}
