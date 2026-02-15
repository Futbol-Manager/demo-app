import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { LoginService } from 'src/app/core/services/login/login.service';
import { InjuryService } from 'src/app/core/services/injury/injury.service';
import { Injury } from 'src/app/core/services/injury/injury.model';

@Component({
  selector: 'app-lesiones-club',
  templateUrl: './lesiones-club.component.html',
  styleUrls: ['./lesiones-club.component.scss']
})
export class LesionesClubComponent implements OnInit, OnDestroy {

  private subs: Subscription[] = [];
  clubId: number = 0;
  loading: boolean = true;

  // All club injuries
  allInjuries: Injury[] = [];
  filteredInjuries: Injury[] = [];

  // Filters
  filterTeam: string = '';
  filterStatus: 'all' | 'activa' | 'recuperacion' | 'cerrada' = 'all';
  filterSeverity: string = '';
  searchTerm: string = '';

  // Team list (derived from data)
  teams: string[] = [];

  // Stats
  get totalInjuries(): number { return this.allInjuries.length; }
  get activeInjuries(): number { return this.allInjuries.filter(i => i.status === 'activa').length; }
  get recoveringInjuries(): number { return this.allInjuries.filter(i => i.status === 'recuperacion').length; }
  get closedInjuries(): number { return this.allInjuries.filter(i => i.status === 'cerrada').length; }

  // Players with active injuries
  get playersAffected(): number {
    const playerIds = new Set(this.allInjuries.filter(i => i.status !== 'cerrada').map(i => i.playerId));
    return playerIds.size;
  }

  // By team stats
  teamStats: { team: string; total: number; active: number; }[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private loginService: LoginService,
    private injuryService: InjuryService
  ) {}

  ngOnInit(): void {
    this.clubId = +this.route.snapshot.paramMap.get('clubId')! || 0;
    this.loadClubInjuries();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  goBack(): void {
    this.router.navigate(['/dashboard/cuadro-de-mandos', this.clubId]);
  }

  private loadClubInjuries(): void {
    this.loading = true;
    this.subs.push(
      this.injuryService.getInjuriesByClub(this.clubId).subscribe(injuries => {
        this.allInjuries = injuries;
        this.buildTeamList();
        this.buildTeamStats();
        this.applyFilters();
        this.loading = false;
      })
    );
  }

  private buildTeamList(): void {
    const teamSet = new Set<string>();
    this.allInjuries.forEach(i => {
      if (i.playerName) {
        // Extract team hint from mock data or use generic
        teamSet.add(i.playerName);
      }
    });
    // Derive unique "team" names from the injuries (mock: we'll group by playerName)
    // In real backend, injuries would have teamId/teamName
    this.teams = [...teamSet];
  }

  private buildTeamStats(): void {
    const map: Record<string, { total: number; active: number }> = {};
    this.allInjuries.forEach(inj => {
      const key = inj.playerName || 'Sin asignar';
      if (!map[key]) map[key] = { total: 0, active: 0 };
      map[key].total++;
      if (inj.status !== 'cerrada') map[key].active++;
    });
    this.teamStats = Object.entries(map)
      .map(([team, stats]) => ({ team, ...stats }))
      .sort((a, b) => b.active - a.active);
  }

  applyFilters(): void {
    let result = [...this.allInjuries];

    if (this.filterStatus !== 'all') {
      result = result.filter(i => i.status === this.filterStatus);
    }
    if (this.filterSeverity) {
      result = result.filter(i => i.severity === this.filterSeverity);
    }
    if (this.filterTeam) {
      result = result.filter(i => i.playerName === this.filterTeam);
    }
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      result = result.filter(i =>
        (i.playerName || '').toLowerCase().includes(term) ||
        (i.zoneLabel || '').toLowerCase().includes(term) ||
        (i.type || '').toLowerCase().includes(term)
      );
    }

    // Sort: active first, then by date
    const statusOrder: Record<string, number> = { 'activa': 0, 'recuperacion': 1, 'cerrada': 2 };
    result.sort((a, b) => {
      const sa = statusOrder[a.status] ?? 9;
      const sb = statusOrder[b.status] ?? 9;
      if (sa !== sb) return sa - sb;
      return new Date(b.dateInjury).getTime() - new Date(a.dateInjury).getTime();
    });

    this.filteredInjuries = result;
  }

  setFilter(status: 'all' | 'activa' | 'recuperacion' | 'cerrada'): void {
    this.filterStatus = status;
    this.applyFilters();
  }

  clearFilters(): void {
    this.filterStatus = 'all';
    this.filterSeverity = '';
    this.filterTeam = '';
    this.searchTerm = '';
    this.applyFilters();
  }

  // ─── Helpers ──────────────────────────────────────────
  getSeverityColor(severity: string): string {
    switch (severity) {
      case 'leve': return '#20c997';
      case 'moderada': return '#ffc107';
      case 'grave': return '#dc3545';
      default: return '#6c757d';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'activa': return 'Activa';
      case 'recuperacion': return 'En recuperación';
      case 'cerrada': return 'Cerrada';
      default: return status;
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'activa': return 'bi-exclamation-circle-fill';
      case 'recuperacion': return 'bi-arrow-repeat';
      case 'cerrada': return 'bi-check-circle-fill';
      default: return 'bi-question-circle';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'activa': return '#dc3545';
      case 'recuperacion': return '#ffc107';
      case 'cerrada': return '#31b270';
      default: return '#6c757d';
    }
  }

  getDaysSinceInjury(dateInjury: string): number {
    const diff = new Date().getTime() - new Date(dateInjury).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }
}
