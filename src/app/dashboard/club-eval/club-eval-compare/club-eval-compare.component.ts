import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { LoginService } from 'src/app/core/services/login/login.service';
import {
  ClubEvalService, ClubEvalField, PlayerCompareResult, PlayerCompareData
} from 'src/app/core/services/club-eval/club-eval.service';
import { environment } from 'src/environments/environment';

Chart.register(...registerables);

const NAVY = '#002c40';
const GREEN = '#31b270';
const GRAY = '#9e9e9e';
const PLAYER_COLORS = [NAVY, GREEN, GRAY];

@Component({
  selector: 'app-club-eval-compare',
  templateUrl: './club-eval-compare.component.html',
  styleUrls: ['./club-eval-compare.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClubEvalCompareComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('compareChart') compareChartRef!: ElementRef<HTMLCanvasElement>;

  private destroy$ = new Subject<void>();
  private chart: Chart | null = null;

  clubId = 0;
  teamId = 0;
  imageBaseUrl: string = environment.images + 'user/';

  // All team players for selection
  teamPlayers: any[] = [];
  playersLoading = true;

  // Selected for comparison (max 3)
  selectedPlayerIds: number[] = [];

  // Compare result
  compareResult: PlayerCompareResult | null = null;
  compareLoading = false;
  chartReady = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private loginService: LoginService,
    private clubEvalService: ClubEvalService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.clubId = +this.route.snapshot.paramMap.get('clubId')!;
    this.teamId = +this.route.snapshot.queryParamMap.get('teamId')!;
    this.loadTeamPlayers();
  }

  ngAfterViewInit(): void {
    this.chartReady = true;
    if (this.compareResult) this.renderChart();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTeamPlayers(): void {
    if (!this.teamId) { this.playersLoading = false; return; }
    this.clubEvalService.getTeamPlayers(this.clubId, this.teamId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.teamPlayers = res?.data || [];
          this.playersLoading = false;
          this.cdr.markForCheck();
        },
        error: () => { this.playersLoading = false; this.cdr.markForCheck(); }
      });
  }

  togglePlayer(playerId: number): void {
    const idx = this.selectedPlayerIds.indexOf(playerId);
    if (idx > -1) {
      this.selectedPlayerIds.splice(idx, 1);
    } else if (this.selectedPlayerIds.length < 3) {
      this.selectedPlayerIds.push(playerId);
    }
    this.compareResult = null;
    this.chart?.destroy();
    this.chart = null;
  }

  isSelected(playerId: number): boolean {
    return this.selectedPlayerIds.includes(playerId);
  }

  compare(): void {
    if (this.selectedPlayerIds.length < 2) return;
    this.compareLoading = true;
    this.clubEvalService.comparePlayers(this.clubId, this.teamId, this.selectedPlayerIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.compareResult = res?.data || null;
          this.compareLoading = false;
          this.cdr.markForCheck();
          if (this.chartReady) setTimeout(() => this.renderChart(), 100);
        },
        error: () => { this.compareLoading = false; this.cdr.markForCheck(); }
      });
  }

  renderChart(): void {
    if (!this.compareResult || !this.compareChartRef) return;
    this.chart?.destroy();

    const labels = this.compareResult.fields;
    const datasets = this.compareResult.players.map((p, i) => ({
      label: p.nombre,
      data: labels.map(f => p.fieldAverages[f] ?? 0),
      backgroundColor: PLAYER_COLORS[i] + 'cc',
      borderColor: PLAYER_COLORS[i],
      borderWidth: 2,
      borderRadius: 6
    }));

    const config: ChartConfiguration = {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { color: '#002c40', font: { family: 'Plus Jakarta Sans', size: 13 } } },
          tooltip: { callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}/10`
          }}
        },
        scales: {
          y: { min: 0, max: 10, ticks: { stepSize: 1, color: '#636363' }, grid: { color: '#f4f4f4' } },
          x: { ticks: { color: '#002c40', font: { weight: 'bold' } } }
        }
      }
    };
    this.chart = new Chart(this.compareChartRef.nativeElement, config);
  }

  getPlayerColor(index: number): string {
    return PLAYER_COLORS[index] || GRAY;
  }

  goBack(): void { this.location.back(); }
}
