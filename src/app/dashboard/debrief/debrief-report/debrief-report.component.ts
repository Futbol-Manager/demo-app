import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { DebriefService } from '../../../core/services/debrief/debrief.service';
import { DebriefReport, DebriefType, ReportSection } from '../../../core/models/debrief/debrief.model';
import { PdfExportService } from '../../../core/services/pdf-export/pdf-export.service';

@Component({
  selector: 'app-debrief-report',
  templateUrl: './debrief-report.component.html',
  styleUrls: ['./debrief-report.component.scss']
})
export class DebriefReportComponent implements OnInit {

  @ViewChild('reportContent') reportContentRef!: ElementRef<HTMLElement>;

  debriefId: number = 0;
  debriefType: DebriefType = 'training';
  report: DebriefReport | null = null;
  isLoading = true;
  isGenerating = false;
  isExporting = false;
  error: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private debriefService: DebriefService,
    private translate: TranslateService,
    private pdfExport: PdfExportService
  ) {}

  ngOnInit(): void {
    this.debriefId = +(this.route.snapshot.paramMap.get('debriefId') || '0');
    this.debriefType = (this.route.snapshot.paramMap.get('type') as DebriefType) || 'training';

    if (!this.debriefId) {
      this.error = 'No debrief ID provided';
      this.isLoading = false;
      return;
    }

    this.loadOrGenerateReport();
  }

  private loadOrGenerateReport(): void {
    this.debriefService.getReport(this.debriefId).subscribe({
      next: (existing) => {
        if (existing) {
          this.report = existing;
          this.isLoading = false;
          return;
        }

        this.isGenerating = true;
        const lang = this.translate.currentLang || 'es';

        this.debriefService.generateReport(this.debriefId, this.debriefType, lang).subscribe({
          next: (report) => {
            this.report = report;
            this.isLoading = false;
            this.isGenerating = false;
          },
          error: (err) => {
            console.error('Error generating report:', err);
            this.error = 'Error generating report';
            this.isLoading = false;
            this.isGenerating = false;
          }
        });
      },
      error: () => {
        this.error = 'Error loading report';
        this.isLoading = false;
      }
    });
  }

  regenerateReport(): void {
    this.isGenerating = true;
    this.error = '';
    const lang = this.translate.currentLang || 'es';

    this.debriefService.generateReport(this.debriefId, this.debriefType, lang).subscribe({
      next: (report) => {
        this.report = report;
        this.isGenerating = false;
      },
      error: (err) => {
        console.error('Error regenerating report:', err);
        this.error = 'Error regenerating report';
        this.isGenerating = false;
      }
    });
  }

  async downloadPdf(): Promise<void> {
    if (!this.reportContentRef || !this.report) return;
    this.isExporting = true;

    const typeLabel = this.isTraining
      ? this.translate.instant('DEBRIEF.REPORT.TRAINING_TITLE')
      : this.translate.instant('DEBRIEF.REPORT.MATCH_TITLE');

    const dateStr = this.report.generatedAt
      ? new Date(this.report.generatedAt).toLocaleDateString('es-ES')
      : new Date().toLocaleDateString('es-ES');

    const fileName = `informe-${this.isTraining ? 'entrenamiento' : 'partido'}-${this.debriefId}`;

    try {
      await this.pdfExport.exportReport(this.reportContentRef.nativeElement, {
        fileName,
        title: typeLabel,
        subtitle: `Generado el ${dateStr}`,
        type: this.isTraining ? 'training' : 'match'
      });
    } finally {
      this.isExporting = false;
    }
  }

  shareReport(): void {
    if (!this.report) return;

    const typeLabel = this.isTraining ? 'entrenamiento' : 'partido';
    const url = window.location.href;

    if (navigator.share) {
      navigator.share({
        title: `Informe de ${typeLabel} - Sphaira Tech`,
        text: `Informe IA de ${typeLabel} generado con Sphaira Tech`,
        url
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        // Could trigger a toast here
      }).catch(() => {});
    }
  }

  getSectionIcon(section: ReportSection): string {
    return section.icon || 'bi-file-text';
  }

  getRatingStars(rating: number | undefined): number[] {
    if (!rating) return [];
    return Array(Math.round(rating)).fill(0);
  }

  getEmptyStars(rating: number | undefined): number[] {
    if (!rating) return [];
    return Array(5 - Math.round(rating)).fill(0);
  }

  goBack(): void {
    window.history.back();
  }

  goToHistory(): void {
    this.debriefService.getDebrief(this.debriefId).subscribe({
      next: (debrief) => {
        if (debrief) {
          this.router.navigate(['/dashboard/debrief/history', debrief.teamId]);
        } else {
          window.history.back();
        }
      },
      error: () => {
        window.history.back();
      }
    });
  }

  get isTraining(): boolean {
    return this.debriefType === 'training';
  }
}
