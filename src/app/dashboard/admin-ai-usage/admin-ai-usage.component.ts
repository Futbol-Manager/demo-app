import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { AiChatService, AiGlobalUsage } from 'src/app/core/services/ai-chat/ai-chat.service';
import { Chart } from 'chart.js/auto';

@Component({
  selector: 'app-admin-ai-usage',
  templateUrl: './admin-ai-usage.component.html',
  styleUrls: ['./admin-ai-usage.component.scss']
})
export class AdminAiUsageComponent implements OnInit, OnDestroy {

  @ViewChild('chartDaily') chartDailyRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartClubs') chartClubsRef!: ElementRef<HTMLCanvasElement>;

  isLoading = true;
  error = false;

  totalMessages = 0;
  totalCostOpenAI = 0;
  totalCostUser = 0;
  totalProfit = 0;
  dailyUsage: { date: string; count: number }[] = [];
  clubsUsage: { clubId: number; clubName?: string; totalMessages: number; totalCost: number }[] = [];

  selectedClubId: number | null = null;
  clubDetail: any = null;
  isLoadingClub = false;

  private chartDaily: Chart | null = null;
  private chartClubs: Chart | null = null;

  constructor(
    private aiChatService: AiChatService,
    private location: Location,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadGlobalUsage();
  }

  ngOnDestroy(): void {
    if (this.chartDaily) this.chartDaily.destroy();
    if (this.chartClubs) this.chartClubs.destroy();
  }

  goBack(): void {
    this.location.back();
  }

  loadGlobalUsage(): void {
    this.isLoading = true;
    this.error = false;
    this.aiChatService.getGlobalUsage().subscribe({
      next: (data: AiGlobalUsage) => {
        this.totalMessages = data.totalMessages;
        this.totalCostOpenAI = data.totalCost;
        this.totalCostUser = data.totalCostUser;
        this.totalProfit = data.totalCostUser - data.totalCost;
        this.dailyUsage = data.dailyUsage || [];
        this.clubsUsage = data.clubsUsage || [];
        this.isLoading = false;
        setTimeout(() => this.renderCharts(), 100);
      },
      error: () => {
        this.isLoading = false;
        this.error = true;
      }
    });
  }

  loadClubDetail(clubId: number): void {
    this.selectedClubId = clubId;
    this.isLoadingClub = true;
    this.aiChatService.getUsageByClub(clubId).subscribe({
      next: (data) => {
        this.clubDetail = data;
        this.isLoadingClub = false;
      },
      error: () => {
        this.isLoadingClub = false;
      }
    });
  }

  closeClubDetail(): void {
    this.selectedClubId = null;
    this.clubDetail = null;
  }

  goToClub(clubId: number): void {
    this.router.navigate(['/dashboard/admin-club-detail', clubId]);
  }

  private renderCharts(): void {
    this.renderDailyChart();
    this.renderClubsChart();
  }

  private renderDailyChart(): void {
    if (!this.chartDailyRef?.nativeElement || this.dailyUsage.length === 0) return;
    if (this.chartDaily) this.chartDaily.destroy();

    const labels = this.dailyUsage.map(d => {
      const date = new Date(d.date);
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    });
    const values = this.dailyUsage.map(d => d.count);

    this.chartDaily = new Chart(this.chartDailyRef.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Mensajes por dia',
          data: values,
          borderColor: '#31b270',
          backgroundColor: 'rgba(49, 178, 112, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#31b270',
          pointRadius: 4,
          pointHoverRadius: 6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0 }
          }
        }
      }
    });
  }

  private renderClubsChart(): void {
    if (!this.chartClubsRef?.nativeElement || this.clubsUsage.length === 0) return;
    if (this.chartClubs) this.chartClubs.destroy();

    const sorted = [...this.clubsUsage].sort((a, b) => b.totalMessages - a.totalMessages).slice(0, 10);
    const labels = sorted.map(c => c.clubName || `Club ${c.clubId}`);
    const values = sorted.map(c => c.totalMessages);

    this.chartClubs = new Chart(this.chartClubsRef.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Mensajes',
          data: values,
          backgroundColor: '#002c40',
          borderRadius: 6,
          barThickness: 28,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { precision: 0 }
          }
        }
      }
    });
  }

  formatCurrency(value: number): string {
    return value.toFixed(4) + ' $';
  }
}
