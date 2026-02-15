import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { DebriefService } from '../../../core/services/debrief/debrief.service';
import { DebriefReport, DebriefType, ReportSection } from '../../../core/models/debrief/debrief.model';

@Component({
  selector: 'app-debrief-report',
  templateUrl: './debrief-report.component.html',
  styleUrls: ['./debrief-report.component.scss']
})
export class DebriefReportComponent implements OnInit {

  debriefId: number = 0;
  debriefType: DebriefType = 'training';
  report: DebriefReport | null = null;
  isLoading = true;
  isGenerating = false;
  error: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private debriefService: DebriefService,
    private translate: TranslateService
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
    // First try to load an existing report
    this.debriefService.getReport(this.debriefId).subscribe({
      next: (existing) => {
        if (existing) {
          this.report = existing;
          this.isLoading = false;
          return;
        }

        // Generate new report
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

  shareReport(): void {
    // TODO: Implementar compartir informe (PDF, correo, etc.)
    console.log('Share report:', this.debriefId);
  }

  get isTraining(): boolean {
    return this.debriefType === 'training';
  }
}
