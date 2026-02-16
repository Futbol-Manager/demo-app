import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Location } from '@angular/common';
import { TeamService } from 'src/app/core/services/team/team.service';
import { Response } from 'src/app/core/services/models/response.model';

@Component({
  selector: 'app-admin-charts',
  templateUrl: './admin-charts.component.html',
  styleUrls: ['./admin-charts.component.scss']
})
export class AdminChartsComponent implements OnInit, AfterViewInit {

  @ViewChild('lineCanvas', { static: false }) lineCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('doughnutCanvas', { static: false }) doughnutCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barCanvas', { static: false }) barCanvasRef!: ElementRef<HTMLCanvasElement>;

  loading = true;
  data: any = null;

  // Colors
  private readonly COLOR_CLUBS = '#0d6efd';
  private readonly COLOR_PLAYERS = '#198754';
  private readonly COLOR_COACHES = '#fd7e14';
  private readonly COLOR_ACTIVE = '#198754';
  private readonly COLOR_INACTIVE = '#6c757d';

  private viewReady = false;
  private dataReady = false;

  constructor(
    private teamService: TeamService,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.teamService.getAdminStats().subscribe({
      next: (response: Response) => {
        if (response?.data) {
          this.data = response.data;
        }
        this.loading = false;
        this.dataReady = true;
        this.tryRenderCharts();
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.tryRenderCharts();
  }

  goBack(): void {
    this.location.back();
  }

  /** Render charts only when both data and view are ready */
  private tryRenderCharts(): void {
    if (!this.viewReady || !this.dataReady || !this.data) return;

    setTimeout(() => {
      this.drawLineChart();
      this.drawDoughnutChart();
      this.drawBarChart();
    });
  }

  // ─── LINE CHART ───────────────────────────────────────────────
  private drawLineChart(): void {
    const canvas = this.lineCanvasRef?.nativeElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    const clubGrowth: { month: string; count: number }[] = this.data.clubGrowth ?? [];
    const playerGrowth: { month: string; count: number }[] = this.data.playerGrowth ?? [];
    const coachGrowth: { month: string; count: number }[] = this.data.coachGrowth ?? [];

    const allCounts = [
      ...clubGrowth.map(d => d.count),
      ...playerGrowth.map(d => d.count),
      ...coachGrowth.map(d => d.count)
    ];
    const maxVal = Math.max(...allCounts, 1);
    const months = clubGrowth.map(d => d.month);
    const n = months.length || 1;

    const padding = { top: 30, right: 24, bottom: 50, left: 52 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    ctx.clearRect(0, 0, w, h);

    // Grid lines
    const gridLines = 5;
    ctx.strokeStyle = '#e9ecef';
    ctx.lineWidth = 1;
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#6c757d';
    ctx.textAlign = 'right';

    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartH / gridLines) * i;
      const val = Math.round(maxVal - (maxVal / gridLines) * i);

      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();

      ctx.fillText(val.toString(), padding.left - 8, y + 4);
    }

    // X-axis labels
    ctx.textAlign = 'center';
    ctx.fillStyle = '#6c757d';
    months.forEach((month, i) => {
      const x = padding.left + (chartW / (n - 1 || 1)) * i;
      ctx.save();
      ctx.translate(x, h - padding.bottom + 16);
      ctx.rotate(-Math.PI / 6);
      ctx.fillText(month, 0, 0);
      ctx.restore();
    });

    const toX = (i: number) => padding.left + (chartW / (n - 1 || 1)) * i;
    const toY = (v: number) => padding.top + chartH - (v / maxVal) * chartH;

    const drawLine = (data: { count: number }[], color: string) => {
      if (data.length < 2) return;

      // Area fill
      ctx.beginPath();
      ctx.moveTo(toX(0), toY(data[0].count));
      for (let i = 1; i < data.length; i++) {
        const xc = (toX(i - 1) + toX(i)) / 2;
        const yc = (toY(data[i - 1].count) + toY(data[i].count)) / 2;
        ctx.quadraticCurveTo(toX(i - 1), toY(data[i - 1].count), xc, yc);
      }
      ctx.lineTo(toX(data.length - 1), toY(data[data.length - 1].count));
      ctx.lineTo(toX(data.length - 1), padding.top + chartH);
      ctx.lineTo(toX(0), padding.top + chartH);
      ctx.closePath();
      ctx.fillStyle = color + '18';
      ctx.fill();

      // Line
      ctx.beginPath();
      ctx.moveTo(toX(0), toY(data[0].count));
      for (let i = 1; i < data.length; i++) {
        const xc = (toX(i - 1) + toX(i)) / 2;
        const yc = (toY(data[i - 1].count) + toY(data[i].count)) / 2;
        ctx.quadraticCurveTo(toX(i - 1), toY(data[i - 1].count), xc, yc);
      }
      ctx.lineTo(toX(data.length - 1), toY(data[data.length - 1].count));
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();

      // Dots
      data.forEach((d, i) => {
        ctx.beginPath();
        ctx.arc(toX(i), toY(d.count), 4, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    };

    drawLine(clubGrowth, this.COLOR_CLUBS);
    drawLine(playerGrowth, this.COLOR_PLAYERS);
    drawLine(coachGrowth, this.COLOR_COACHES);

    // Legend
    const legends = [
      { label: 'Clubes', color: this.COLOR_CLUBS },
      { label: 'Jugadores', color: this.COLOR_PLAYERS },
      { label: 'Entrenadores', color: this.COLOR_COACHES }
    ];

    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    let legendX = padding.left;
    const legendY = 16;

    legends.forEach(l => {
      ctx.fillStyle = l.color;
      ctx.beginPath();
      ctx.arc(legendX + 6, legendY, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#343a40';
      ctx.textAlign = 'left';
      ctx.fillText(l.label, legendX + 16, legendY + 4);
      legendX += ctx.measureText(l.label).width + 36;
    });
  }

  // ─── DOUGHNUT CHART ───────────────────────────────────────────
  private drawDoughnutChart(): void {
    const canvas = this.doughnutCanvasRef?.nativeElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const active = this.data.suscripcionesActivas ?? 0;
    const inactive = this.data.suscripcionesInactivas ?? 0;
    const total = active + inactive || 1;

    const cx = w / 2;
    const cy = h / 2 - 10;
    const outerR = Math.min(cx, cy) - 30;
    const innerR = outerR * 0.58;

    const slices = [
      { value: active, color: this.COLOR_ACTIVE, label: 'Activas' },
      { value: inactive, color: this.COLOR_INACTIVE, label: 'Inactivas' }
    ];

    let startAngle = -Math.PI / 2;
    const gap = 0.04;

    slices.forEach(slice => {
      const sliceAngle = (slice.value / total) * (Math.PI * 2);
      if (sliceAngle <= 0) return;

      ctx.beginPath();
      ctx.arc(cx, cy, outerR, startAngle + gap / 2, startAngle + sliceAngle - gap / 2);
      ctx.arc(cx, cy, innerR, startAngle + sliceAngle - gap / 2, startAngle + gap / 2, true);
      ctx.closePath();
      ctx.fillStyle = slice.color;
      ctx.fill();

      // Shadow effect
      ctx.shadowColor = slice.color + '40';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      startAngle += sliceAngle;
    });

    // Center text
    ctx.fillStyle = '#1a1a2e';
    ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(total.toString(), cx, cy - 6);

    ctx.fillStyle = '#6c757d';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Total', cx, cy + 16);

    // Legend below the doughnut
    const legendY = cy + outerR + 30;
    let legendX = cx - 80;

    slices.forEach(slice => {
      // Color dot
      ctx.beginPath();
      ctx.arc(legendX, legendY, 6, 0, Math.PI * 2);
      ctx.fillStyle = slice.color;
      ctx.fill();

      // Label
      ctx.fillStyle = '#343a40';
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${slice.label}: ${slice.value}`, legendX + 12, legendY);

      legendX += 100;
    });
  }

  // ─── HORIZONTAL BAR CHART ─────────────────────────────────────
  get barCanvasHeight(): number {
    const clubs = this.data?.topClubsByPlayers ?? [];
    return Math.max(clubs.length * 48 + 60, 200);
  }

  private drawBarChart(): void {
    const canvas = this.barCanvasRef?.nativeElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const clubs: { nombre: string; jugadores: number }[] = this.data.topClubsByPlayers ?? [];
    if (clubs.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const padding = { top: 16, right: 60, bottom: 16, left: 140 };
    const chartW = w - padding.left - padding.right;
    const barH = 28;
    const barGap = 20;
    const maxVal = Math.max(...clubs.map(c => c.jugadores), 1);

    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    clubs.forEach((club, i) => {
      const y = padding.top + i * (barH + barGap);
      const barWidth = (club.jugadores / maxVal) * chartW;

      // Club name (left)
      ctx.fillStyle = '#343a40';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const displayName = club.nombre.length > 20 ? club.nombre.substring(0, 18) + '…' : club.nombre;
      ctx.fillText(displayName, padding.left - 12, y + barH / 2);

      // Bar background
      ctx.fillStyle = '#f0f0f0';
      this.roundRect(ctx, padding.left, y, chartW, barH, 6);
      ctx.fill();

      // Animated bar with gradient
      const gradient = ctx.createLinearGradient(padding.left, 0, padding.left + barWidth, 0);
      gradient.addColorStop(0, this.COLOR_CLUBS);
      gradient.addColorStop(1, '#4dabf7');
      ctx.fillStyle = gradient;
      this.roundRect(ctx, padding.left, y, Math.max(barWidth, 6), barH, 6);
      ctx.fill();

      // Value label
      ctx.fillStyle = '#343a40';
      ctx.textAlign = 'left';
      ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(club.jugadores.toString(), padding.left + barWidth + 8, y + barH / 2);
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    });
  }

  /** Draws a rounded rectangle path */
  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    w: number, h: number,
    r: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
