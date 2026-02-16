import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { TeamService } from 'src/app/core/services/team/team.service';
import { Response } from 'src/app/core/services/models/response.model';

@Component({
  selector: 'app-admin-ai-insights',
  templateUrl: './admin-ai-insights.component.html',
  styleUrls: ['./admin-ai-insights.component.scss']
})
export class AdminAiInsightsComponent implements OnInit {

  insights: any = null;
  isLoading = true;
  error = false;

  constructor(
    private teamService: TeamService,
    private router: Router,
    private location: Location
  ) { }

  ngOnInit(): void {
    this.loadInsights();
  }

  goBack(): void {
    this.location.back();
  }

  loadInsights(): void {
    this.isLoading = true;
    this.error = false;
    this.teamService.getAdminAIInsights().subscribe({
      next: (response: Response) => {
        if (response?.data) {
          this.insights = response.data;
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.error = true;
      }
    });
  }

  getRiskColor(riesgo: string): string {
    switch (riesgo) {
      case 'ALTO': return 'bg-danger';
      case 'MEDIO': return 'bg-warning';
      case 'BAJO': return 'bg-info';
      default: return 'bg-secondary';
    }
  }

  goToClub(clubId: number): void {
    this.router.navigate(['/dashboard/admin-club-detail', clubId]);
  }
}
