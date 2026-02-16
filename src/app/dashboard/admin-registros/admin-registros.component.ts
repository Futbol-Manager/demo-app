import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Location } from '@angular/common';
import { TeamService } from 'src/app/core/services/team/team.service';
import { Response } from 'src/app/core/services/models/response.model';

@Component({
  selector: 'app-admin-registros',
  templateUrl: './admin-registros.component.html',
  styleUrls: ['./admin-registros.component.scss']
})
export class AdminRegistrosComponent implements OnInit, AfterViewInit {

  data: any = null;
  loading = true;
  error = false;

  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

  private dataReady = false;
  private viewReady = false;

  constructor(
    private location: Location,
    private teamService: TeamService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.tryRenderChart();
  }

  goBack(): void { this.location.back(); }

  loadData(): void {
    this.loading = true;
    this.teamService.getAdminRegistrations().subscribe({
      next: (res: Response) => {
        this.data = res?.data || null;
        this.loading = false;
        this.dataReady = true;
        this.tryRenderChart();
      },
      error: () => {
        this.loading = false;
        this.error = true;
      }
    });
  }

  private tryRenderChart(): void {
    if (!this.dataReady || !this.viewReady || !this.chartCanvas) return;
    const canvas = this.chartCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx || !this.data) return;

    const clubs = this.data.monthlyClubs || [];
    const players = this.data.monthlyPlayers || [];
    const labels = clubs.map((c: any) => c.month?.substring(5) || '');
    const clubVals = clubs.map((c: any) => c.count);
    const playerVals = players.map((p: any) => p.count);

    const maxVal = Math.max(...clubVals, ...playerVals, 1);
    const W = canvas.width = canvas.offsetWidth * 2;
    const H = canvas.height = 400;
    const pad = { top: 30, right: 30, bottom: 40, left: 50 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;

    ctx.clearRect(0, 0, W, H);
    ctx.scale(1, 1);

    // Grid
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (chartH / 4) * i;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
      ctx.fillStyle = '#94a3b8'; ctx.font = '20px Archivo, sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(String(Math.round(maxVal * (4 - i) / 4)), pad.left - 8, y + 5);
    }

    // Labels
    const step = labels.length > 1 ? chartW / (labels.length - 1) : chartW;
    ctx.fillStyle = '#64748b'; ctx.font = '18px Archivo, sans-serif'; ctx.textAlign = 'center';
    labels.forEach((l: string, i: number) => {
      ctx.fillText(l, pad.left + step * i, H - 10);
    });

    // Draw line
    const drawLine = (vals: number[], color: string) => {
      if (vals.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineJoin = 'round';
      vals.forEach((v: number, i: number) => {
        const x = pad.left + step * i;
        const y = pad.top + chartH - (v / maxVal) * chartH;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
      // Dots
      vals.forEach((v: number, i: number) => {
        const x = pad.left + step * i;
        const y = pad.top + chartH - (v / maxVal) * chartH;
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = color; ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      });
    };

    drawLine(clubVals, '#31b270');
    drawLine(playerVals, '#0fa3e8');

    // Legend
    ctx.font = '18px Archivo, sans-serif';
    ctx.fillStyle = '#31b270'; ctx.fillRect(W - 200, 10, 14, 14);
    ctx.fillStyle = '#1e293b'; ctx.textAlign = 'left'; ctx.fillText('Clubes', W - 180, 22);
    ctx.fillStyle = '#0fa3e8'; ctx.fillRect(W - 110, 10, 14, 14);
    ctx.fillStyle = '#1e293b'; ctx.fillText('Jugadores', W - 90, 22);
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'CLUB': return 'bi-shield-shaded';
      case 'PLAYER': return 'bi-person-badge';
      case 'COACH': return 'bi-clipboard2-check';
      default: return 'bi-person';
    }
  }

  getTypeLabel(type: string): string {
    switch (type) {
      case 'CLUB': return 'Club';
      case 'PLAYER': return 'Jugador';
      case 'COACH': return 'Entrenador';
      default: return type;
    }
  }
}
