import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { LoginService } from 'src/app/core/services/login/login.service';
import { InjuryService } from 'src/app/core/services/injury/injury.service';
import { Injury, InjuryStatus, getStatusDef } from 'src/app/core/services/injury/injury.model';
import { NotificationService } from 'src/app/core/services/notification/notification.service';
import { ConfirmationService } from 'src/app/core/services/confirmation/confirmation.service';

@Component({
  selector: 'app-lesiones-club',
  templateUrl: './lesiones-club.component.html',
  styleUrls: ['./lesiones-club.component.scss']
})
export class LesionesClubComponent implements OnInit, OnDestroy {

  private subs: Subscription[] = [];
  clubId: number = 0;
  loading: boolean = true;
  loadError: string | null = null;

  // All club injuries
  allInjuries: Injury[] = [];
  filteredInjuries: Injury[] = [];

  // Filters
  filterTeam: string = '';
  filterStatus: 'all' | InjuryStatus = 'all';
  filterSeverity: string = '';
  searchTerm: string = '';

  // Team list (derived from data — uses teamName or "Equipo {teamId}" as fallback)
  teams: { id: number; name: string }[] = [];

  // Stats
  get totalInjuries(): number { return this.allInjuries.length; }
  get activeInjuries(): number { return this.allInjuries.filter(i => i.status === 'baja').length; }
  get recoveringInjuries(): number { return this.allInjuries.filter(i => i.status === 'readaptacion').length; }
  get closedInjuries(): number { return this.allInjuries.filter(i => i.status === 'alta').length; }

  // Players with active injuries
  get playersAffected(): number {
    const playerIds = new Set(this.allInjuries.filter(i => i.status !== 'alta').map(i => i.playerId));
    return playerIds.size;
  }

  // By team stats
  teamStats: { team: string; total: number; active: number; }[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private loginService: LoginService,
    private injuryService: InjuryService,
    private translate: TranslateService,
    private notificationService: NotificationService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.clubId = +this.route.snapshot.paramMap.get('clubId')! || 0;
    if (!this.clubId) {
      this.clubId = Number(sessionStorage.getItem('clubId')) || Number(localStorage.getItem('clubId')) || 0;
    }
    if (this.clubId) {
      this.loadClubInjuries();
    } else {
      this.loading = false;
      this.loadError = 'No se ha seleccionado ningún club.';
    }
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  goBack(): void {
    this.router.navigate(['/dashboard/cuadro-de-mandos', this.clubId]);
  }

  retryLoad(): void {
    this.loadError = null;
    if (this.clubId) this.loadClubInjuries();
  }

  private loadClubInjuries(): void {
    this.loading = true;
    this.loadError = null;
    this.subs.push(
      this.injuryService.getInjuriesByClub(this.clubId).subscribe({
        next: (injuries) => {
          this.allInjuries = Array.isArray(injuries) ? injuries : [];
          this.buildTeamList();
          this.buildTeamStats();
          this.applyFilters();
          this.loading = false;
        },
        error: () => {
          this.allInjuries = [];
          this.filteredInjuries = [];
          this.teams = [];
          this.teamStats = [];
          this.loading = false;
          this.loadError = 'No se pudieron cargar las lesiones del club.';
        }
      })
    );
  }

  private buildTeamList(): void {
    const teamMap = new Map<number, string>();
    this.allInjuries.forEach(i => {
      if (i.teamId) {
        const name = i.teamName || `Equipo ${i.teamId}`;
        teamMap.set(i.teamId, name);
      }
    });
    this.teams = [...teamMap.entries()].map(([id, name]) => ({ id, name }));
  }

  private buildTeamStats(): void {
    const map: Record<string, { total: number; active: number }> = {};
    this.allInjuries.forEach(inj => {
      const key = inj.teamName || (inj.teamId ? `Equipo ${inj.teamId}` : 'Sin equipo');
      if (!map[key]) map[key] = { total: 0, active: 0 };
      map[key].total++;
      if (inj.status !== 'alta') map[key].active++;
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
      result = result.filter(i => {
        const tName = i.teamName || (i.teamId ? `Equipo ${i.teamId}` : 'Sin equipo');
        return tName === this.filterTeam;
      });
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
    const statusOrder: Record<string, number> = { 'baja': 0, 'fisioterapia': 1, 'readaptacion': 2, 'condicionado': 3, 'alta': 4 };
    result.sort((a, b) => {
      const sa = statusOrder[a.status] ?? 9;
      const sb = statusOrder[b.status] ?? 9;
      if (sa !== sb) return sa - sb;
      return new Date(b.dateInjury).getTime() - new Date(a.dateInjury).getTime();
    });

    this.filteredInjuries = result;
  }

  setFilter(status: 'all' | InjuryStatus): void {
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

  getSeverityTranslation(severity: string): string {
    const severityKey = severity.toUpperCase();
    return this.translate.instant(`INJURIES_CLUB.SEVERITY.${severityKey}`);
  }

  /** Usa la definición del modelo (baja, fisioterapia, readaptacion, condicionado, alta) para etiqueta, icono y color */
  getStatusDef(status: string) {
    return getStatusDef(status as InjuryStatus);
  }

  getDaysSinceInjury(dateInjury: string): number {
    const diff = new Date().getTime() - new Date(dateInjury).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }
}
