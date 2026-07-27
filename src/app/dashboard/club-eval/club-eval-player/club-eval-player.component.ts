import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ClubEvalFormComponent } from '../club-eval-form/club-eval-form.component';
import { LoginService } from 'src/app/core/services/login/login.service';
import { NotificationService } from 'src/app/core/services/notification/notification.service';
import { ConfirmationService } from 'src/app/core/services/confirmation/confirmation.service';
import {
  ClubEvalService,
  ClubEvalConfig,
  ClubEvalField,
  ClubPlayerEvaluation,
  ClubPlayerGoal,
  PlayerStats,
  PlayerStatsData
} from 'src/app/core/services/club-eval/club-eval.service';
import { Chart, ChartDataset, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-club-eval-player',
  templateUrl: './club-eval-player.component.html',
  styleUrls: ['./club-eval-player.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClubEvalPlayerComponent implements OnInit, OnDestroy, AfterViewInit {

  private destroy$ = new Subject<void>();

  @ViewChild('evolutionChart') evolutionChartRef!: ElementRef;
  @ViewChild('radarFirst') radarFirstRef!: ElementRef;
  @ViewChild('radarLast') radarLastRef!: ElementRef;

  clubId = 0;
  playerId = 0;
  teamId = 0;
  userId = 0;

  config: ClubEvalConfig | null = null;
  activeFields: ClubEvalField[] = [];

  evaluations: ClubPlayerEvaluation[] = [];
  loading = false;

  // Gráficos Chart.js
  evolutionChart: Chart | null = null;
  radarFirstChart: Chart | null = null;
  radarLastChart: Chart | null = null;

  // Form de evaluación
  showEvalForm = false;
  editingEval: ClubPlayerEvaluation | null = null;

  // AI Report
  aiReportLoading = false;
  aiReport: string | null = null;
  showAiReport = false;

  // Pipeline history
  pipelineHistory: any[] = [];
  showPipelineHistory = false;

  // Deltas (primera vs última)
  deltas: { fieldKey: string; fieldLabel: string; first: number; last: number; delta: number }[] = [];

  // Estadísticas de partido
  playerStats: PlayerStats | null = null;
  statsLoading = false;
  selectedStatsType = 'totals'; // 'totals' | tipo de partido
  availableStatTypes: string[] = [];

  // Objetivos por campo
  goals: { [fieldKey: string]: number } = {};
  goalsSaving = false;

  // PDF
  pdfLoading = false;

  private chartsReady = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private loginService: LoginService,
    private clubEvalService: ClubEvalService,
    private translateService: TranslateService,
    private notification: NotificationService,
    private confirmationService: ConfirmationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.clubId = +this.route.snapshot.paramMap.get('clubId')!;
    this.playerId = +this.route.snapshot.paramMap.get('playerId')!;
    this.teamId = +(this.route.snapshot.queryParamMap.get('teamId') ?? 0);
    this.loginService.usuarioActual
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => { if (user) this.userId = user.userId ?? 0; this.cdr.markForCheck(); });
    this.loadAll();
  }

  ngAfterViewInit(): void {
    this.chartsReady = true;
    if (this.evaluations.length > 0) {
      setTimeout(() => this.renderCharts(), 100);
    }
  }

  ngOnDestroy(): void {
    this.evolutionChart?.destroy();
    this.radarFirstChart?.destroy();
    this.radarLastChart?.destroy();
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAll(): void {
    this.loadConfig();
    this.loadEvaluations();
    this.loadPipelineHistory();
    this.loadPlayerStats();
    this.loadGoals();
  }

  loadConfig(): void {
    this.clubEvalService.getConfig(this.clubId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          if (res?.data) {
            this.config = res.data;
            this.activeFields = this.config!.fields?.filter(f => f.active === 1) || [];
          }
          this.cdr.markForCheck();
        },
        error: () => this.notification.errorLoad()
      });
  }

  loadEvaluations(): void {
    this.loading = true;
    this.clubEvalService.getPlayerEvaluations(this.clubId, this.playerId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.evaluations = res?.data || [];
          this.computeDeltas();
          this.loading = false;
          this.cdr.markForCheck();
          if (this.chartsReady) {
            setTimeout(() => this.renderCharts(), 100);
          }
        },
        error: () => { this.loading = false; this.cdr.markForCheck(); }
      });
  }

  loadPipelineHistory(): void {
    this.clubEvalService.getPlayerPipelineHistory(this.clubId, this.playerId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.pipelineHistory = (res?.data || []).map((entry: any, idx: number, arr: any[]) => ({
            ...entry,
            isLatest: idx === arr.length - 1
          }));
          this.cdr.markForCheck();
        },
        error: () => this.notification.errorLoad()
      });
  }

  loadGoals(): void {
    this.clubEvalService.getPlayerGoals(this.clubId, this.playerId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const list: ClubPlayerGoal[] = res?.data || [];
          this.goals = {};
          list.forEach(g => { this.goals[g.fieldKey] = g.targetScore; });
          this.cdr.markForCheck();
        },
        error: () => this.notification.errorLoad()
      });
  }

  saveGoals(): void {
    this.goalsSaving = true;
    const payload: ClubPlayerGoal[] = this.activeFields
      .filter(f => this.goals[f.fieldKey] != null && this.goals[f.fieldKey] >= 0)
      .map(f => ({ fieldKey: f.fieldKey, targetScore: this.goals[f.fieldKey] }));
    this.clubEvalService.savePlayerGoals(this.clubId, this.playerId, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.goalsSaving = false;
          this.notification.saveSuccess();
          this.cdr.markForCheck();
          setTimeout(() => this.renderEvolutionChart(), 50);
        },
        error: () => { this.goalsSaving = false; this.notification.errorGeneric(); this.cdr.markForCheck(); }
      });
  }

  async exportPdf(): Promise<void> {
    this.pdfLoading = true;
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas')
      ]);

      const element = document.getElementById('player-eval-content');
      if (!element) { this.pdfLoading = false; this.cdr.markForCheck(); return; }

      const canvas = await html2canvas(element, { scale: 1.5, useCORS: true, allowTaint: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const pageW = 210;
      const pageH = 297;
      const marginX = 10;
      const footerH = 10;          // espacio reservado al pie
      const contentH = pageH - footerH - 6;
      const imgW = pageW - marginX * 2;
      const imgH = (canvas.height * imgW) / canvas.width;

      const addFooter = (doc: any, pageNum: number, totalPages: number) => {
        const fy = pageH - 6;
        // Línea separadora
        doc.setDrawColor(49, 178, 112);
        doc.setLineWidth(0.4);
        doc.line(marginX, fy - 2, pageW - marginX, fy - 2);
        // Logo texto "sphaira" en verde
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(49, 178, 112);
        doc.text('sphaira', marginX, fy + 1.5);
        // Subtexto "tech" en navy
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(0, 44, 64);
        doc.text('tech', marginX + 11, fy + 1.5);
        // Página a la derecha
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text(`${pageNum} / ${totalPages}`, pageW - marginX, fy + 1.5, { align: 'right' });
      };

      let y = 10;
      let pageNum = 1;

      if (imgH <= contentH) {
        pdf.addImage(imgData, 'PNG', marginX, y, imgW, imgH);
        addFooter(pdf, 1, 1);
      } else {
        // Calcula número total de páginas
        const totalPages = Math.ceil(imgH / contentH);
        let remainingH = imgH;
        let srcY = 0;

        while (remainingH > 0) {
          const sliceH = Math.min(remainingH, contentH);
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = Math.round((sliceH * canvas.width) / imgW);
          const ctx = sliceCanvas.getContext('2d')!;
          ctx.drawImage(canvas, 0, srcY, canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height);
          pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', marginX, y, imgW, sliceH);
          addFooter(pdf, pageNum, totalPages);
          remainingH -= sliceH;
          srcY += sliceCanvas.height;
          if (remainingH > 0) { pdf.addPage(); y = 10; pageNum++; }
        }
      }

      const today = new Date().toISOString().split('T')[0];
      pdf.save(`informe-jugador-${this.playerId}-${today}.pdf`);
    } finally {
      this.pdfLoading = false;
      this.cdr.markForCheck();
    }
  }

  loadPlayerStats(): void {
    this.statsLoading = true;
    this.clubEvalService.getPlayerStats(this.clubId, this.playerId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          if (res?.data) {
            this.playerStats = res.data as PlayerStats;
            this.availableStatTypes = Object.keys(this.playerStats.byType || {}).sort();
          }
          this.statsLoading = false;
          this.cdr.markForCheck();
        },
        error: () => { this.statsLoading = false; this.cdr.markForCheck(); }
      });
  }

  get currentStats(): PlayerStatsData | null {
    if (!this.playerStats) return null;
    if (this.selectedStatsType === 'totals') return this.playerStats.totals;
    return this.playerStats.byType[this.selectedStatsType] || null;
  }

  computeDeltas(): void {
    if (this.evaluations.length < 2) {
      this.deltas = [];
      return;
    }
    const first = this.evaluations[0];
    const last = this.evaluations[this.evaluations.length - 1];
    this.deltas = this.activeFields.map(f => {
      const firstScore = first.scores?.find(s => s.fieldKey === f.fieldKey)?.score || 0;
      const lastScore = last.scores?.find(s => s.fieldKey === f.fieldKey)?.score || 0;
      return {
        fieldKey: f.fieldKey,
        fieldLabel: f.fieldLabel,
        first: firstScore,
        last: lastScore,
        delta: lastScore - firstScore
      };
    });
  }

  renderCharts(): void {
    this.renderEvolutionChart();
    this.renderRadarCharts();
  }

  renderEvolutionChart(): void {
    this.evolutionChart?.destroy();
    if (!this.evolutionChartRef || this.evaluations.length === 0) return;

    const labels = this.evaluations.map(e => e.evaluationDate || '');
    const colors = [
      '#31b270', '#002c40', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#ec4899'
    ];

    const datasets: ChartDataset<'line'>[] = this.activeFields.map((field, i) => ({
      label: field.fieldLabel,
      data: this.evaluations.map(e => e.scores?.find(s => s.fieldKey === field.fieldKey)?.score || 0),
      borderColor: colors[i % colors.length],
      backgroundColor: colors[i % colors.length] + '20',
      tension: 0.4,
      pointRadius: 5,
      pointHoverRadius: 7,
      fill: false
    }));

    // Goal lines (dashed horizontal) for each field that has a goal
    this.activeFields.forEach((field, i) => {
      const target = this.goals[field.fieldKey];
      if (target != null && target > 0) {
        datasets.push({
          label: `${field.fieldLabel} (meta)`,
          data: labels.map(() => target),
          borderColor: colors[i % colors.length],
          backgroundColor: 'transparent',
          borderDash: [6, 4],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
          tension: 0
        } as ChartDataset<'line'>);
      }
    });

    const ctx = this.evolutionChartRef.nativeElement.getContext('2d');
    this.evolutionChart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12 } },
          tooltip: { mode: 'index', intersect: false }
        },
        scales: {
          y: { min: 0, max: 10, ticks: { stepSize: 1 }, grid: { color: '#f0f0f0' } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  renderRadarCharts(): void {
    this.radarFirstChart?.destroy();
    this.radarLastChart?.destroy();
    if (!this.radarFirstRef || !this.radarLastRef || this.evaluations.length === 0) return;

    const labels = this.activeFields.map(f => f.fieldLabel);
    const first = this.evaluations[0];
    const last = this.evaluations[this.evaluations.length - 1];

    const firstData = this.activeFields.map(f => first.scores?.find(s => s.fieldKey === f.fieldKey)?.score || 0);
    const lastData = this.activeFields.map(f => last.scores?.find(s => s.fieldKey === f.fieldKey)?.score || 0);

    const radarOptions: any = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        r: {
          min: 0, max: 10, ticks: { stepSize: 2, font: { size: 10 } },
          pointLabels: { font: { size: 11, weight: '600' } }
        }
      }
    };

    const ctxFirst = this.radarFirstRef.nativeElement.getContext('2d');
    this.radarFirstChart = new Chart(ctxFirst, {
      type: 'radar',
      data: {
        labels,
        datasets: [{
          label: first.evaluationDate || 'Primera',
          data: firstData,
          borderColor: '#002c40',
          backgroundColor: 'rgba(0,44,64,0.15)',
          pointBackgroundColor: '#002c40'
        }]
      },
      options: radarOptions
    });

    const ctxLast = this.radarLastRef.nativeElement.getContext('2d');
    this.radarLastChart = new Chart(ctxLast, {
      type: 'radar',
      data: {
        labels,
        datasets: [{
          label: last.evaluationDate || 'Última',
          data: lastData,
          borderColor: '#31b270',
          backgroundColor: 'rgba(49,178,112,0.15)',
          pointBackgroundColor: '#31b270'
        }]
      },
      options: radarOptions
    });
  }

  openNewEval(): void {
    this.editingEval = null;
    this.showEvalForm = true;
  }

  openEditEval(eval_: ClubPlayerEvaluation): void {
    this.editingEval = { ...eval_ };
    this.showEvalForm = true;
  }

  onEvalSaved(): void {
    this.showEvalForm = false;
    this.editingEval = null;
    this.loadEvaluations();
  }

  deleteEval(evalId: number): void {
    const msg = this.translateService.instant('CLUB_EVAL.PLAYER.DELETE_CONFIRM');
    this.confirmationService.confirm({ message: msg, confirmStyle: 'warn' }).subscribe(ok => {
      if (!ok) return;
      this.clubEvalService.deleteEvaluation(this.clubId, evalId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { this.loadEvaluations(); this.notification.deleteSuccess(); this.cdr.markForCheck(); },
          error: () => this.notification.errorGeneric()
        });
    });
  }

  generateAiReport(): void {
    this.aiReportLoading = true;
    this.aiReport = null;
    this.clubEvalService.generateAiReport(this.clubId, this.playerId, this.userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.aiReport = res?.data?.report || null;
          this.aiReportLoading = false;
          this.showAiReport = true;
          this.cdr.markForCheck();
        },
        error: () => {
          this.aiReportLoading = false;
          this.notification.errorGeneric();
          this.cdr.markForCheck();
        }
      });
  }

  getScoreForField(eval_: ClubPlayerEvaluation, fieldKey: string): number {
    return eval_.scores?.find(s => s.fieldKey === fieldKey)?.score || 0;
  }

  getStars(rating: number): number[] {
    return Array(5).fill(0).map((_, i) => i + 1);
  }

  goBack(): void {
    this.location.back();
  }
}
