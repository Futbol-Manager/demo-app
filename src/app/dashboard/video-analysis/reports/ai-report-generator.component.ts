import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { VideoAnalysisService } from '../../../core/services/video-analysis/video-analysis.service';
import { PlayerStateService } from '../services/player-state.service';
import { AnalysisEvent } from '../models/analysis.models';

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

  private buildEventsSummary(): any {
    const categoryCounts: { [key: string]: number } = {};
    const categoryTimes: { [key: string]: number } = {};

    for (const e of this.events) {
      const name = e.categoryName || 'Sin categoría';
      categoryCounts[name] = (categoryCounts[name] || 0) + 1;
      categoryTimes[name] = (categoryTimes[name] || 0) + (e.endTimeMs - e.startTimeMs);
    }

    return {
      totalEvents: this.events.length,
      categoryCounts,
      categoryTimes,
      firstEventMs: this.events.length > 0 ? this.events[0].startTimeMs : 0,
      lastEventMs: this.events.length > 0 ? this.events[this.events.length - 1].endTimeMs : 0,
      eventsWithPosition: this.events.filter(e => e.fieldX != null).length,
      events: this.events.map(e => ({
        category: e.categoryName,
        startMs: e.startTimeMs,
        endMs: e.endTimeMs,
        player: e.playerName,
        notes: e.notes,
        fieldX: e.fieldX,
        fieldY: e.fieldY
      }))
    };
  }

  get canGenerate(): boolean {
    return this.events.length > 0 && !this.isGenerating;
  }
}
