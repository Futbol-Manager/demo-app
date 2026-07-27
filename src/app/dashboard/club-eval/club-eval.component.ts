import { ChangeDetectionStrategy, Component, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil, skip, distinctUntilChanged } from 'rxjs/operators';
import { LoginService } from 'src/app/core/services/login/login.service';
import { ClubEvalService, ClubEvalConfig, PipelineStageGroup } from 'src/app/core/services/club-eval/club-eval.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { NotificationService } from 'src/app/core/services/notification/notification.service';
import { environment } from 'src/environments/environment';
import { getSelectedSeason } from 'src/app/core/utils/season.utils';
import { SeasonStateService } from 'src/app/core/services/season/season-state.service';

@Component({
  selector: 'app-club-eval',
  templateUrl: './club-eval.component.html',
  styleUrls: ['./club-eval.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClubEvalComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  clubId = 0;
  userId = 0;
  activeTab: 'players' | 'pipeline' = 'players';

  config: ClubEvalConfig | null = null;
  pipelineEnabled = true;

  // Players list
  players: any[] = [];
  playersLoading = false;
  playersSearch = '';

  // Pipeline
  pipelineData: PipelineStageGroup[] = [];
  pipelineLoading = false;

  // Team filter
  teams: any[] = [];
  selectedTeamId: number | null = null;

  // Sesiones pasadas (para editar)
  pastSessionDates: string[] = [];
  pastSessionsLoading = false;
  showPastSessions = false;

  imageBaseUrl: string = environment.images + 'user/';
  brokenPhotos: Record<number, boolean> = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private loginService: LoginService,
    private clubEvalService: ClubEvalService,
    private teamService: TeamService,
    private seasonState: SeasonStateService,
    private cdr: ChangeDetectorRef,
    private notification: NotificationService,
  ) {}

  ngOnInit(): void {
    this.clubId = +this.route.snapshot.paramMap.get('clubId')!;
    this.loginService.usuarioActual
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => { if (user) this.userId = user.userId ?? 0; this.cdr.markForCheck(); });
    this.loadConfig();
    this.loadTeams();

    // Recargar equipos al cambiar la temporada globalmente
    this.seasonState.season$.pipe(
      skip(1),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.selectedTeamId = null;
      this.teams = [];
      this.players = [];
      this.loadTeams();
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadConfig(): void {
    this.clubEvalService.getConfig(this.clubId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          if (res?.data) {
            this.config = res.data;
            this.pipelineEnabled = this.config!.pipelineEnabled === 1;
          }
          this.loadPlayers();
          if (this.pipelineEnabled) this.loadPipeline();
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadPlayers();
          this.cdr.markForCheck();
        }
      });
  }

  loadTeams(): void {
    const temporada = getSelectedSeason();
    this.teamService.getTeamsByClubForCombo(this.clubId, temporada)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.teams = res?.data || [];
          if (this.teams.length > 0 && !this.selectedTeamId) {
            this.selectedTeamId = this.teams[0].value;
            this.loadPlayers();
            this.loadPastSessionDates();
          }
          this.cdr.markForCheck();
        },
        error: () => this.notification.errorLoad()
      });
  }

  loadPlayers(): void {
    if (!this.clubId || !this.selectedTeamId) return;
    this.playersLoading = true;
    this.clubEvalService.getTeamPlayers(this.clubId, this.selectedTeamId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.players = res?.data || [];
          this.playersLoading = false;
          this.cdr.markForCheck();
        },
        error: () => { this.playersLoading = false; this.cdr.markForCheck(); }
      });
  }

  onTeamChange(teamId: number): void {
    this.selectedTeamId = +teamId;
    this.loadPlayers();
    this.loadPastSessionDates();
  }

  loadPastSessionDates(): void {
    if (!this.clubId || !this.selectedTeamId) return;
    this.pastSessionsLoading = true;
    this.clubEvalService.getTeamSessionDates(this.clubId, this.selectedTeamId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.pastSessionDates = res?.data || [];
          this.pastSessionsLoading = false;
          this.cdr.markForCheck();
        },
        error: () => { this.pastSessionsLoading = false; this.cdr.markForCheck(); }
      });
  }

  openPastSession(date: string): void {
    if (!this.selectedTeamId) return;
    this.router.navigate(
      ['/dashboard/club-eval', this.clubId, 'session', this.selectedTeamId],
      { queryParams: { date } }
    );
  }

  formatSessionDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return dateStr; }
  }

  loadPipeline(): void {
    this.pipelineLoading = true;
    this.clubEvalService.getPipeline(this.clubId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.pipelineData = res?.data || [];
          this.pipelineLoading = false;
          this.cdr.markForCheck();
        },
        error: () => { this.pipelineLoading = false; this.cdr.markForCheck(); }
      });
  }

  onTabChange(tab: 'players' | 'pipeline'): void {
    this.activeTab = tab;
    if (tab === 'pipeline') this.loadPipeline();
  }

  openPlayer(playerId: number): void {
    this.router.navigate(
      ['/dashboard/club-eval', this.clubId, 'player', playerId],
      { queryParams: { teamId: this.selectedTeamId } }
    );
  }

  openPipelinePlayer(playerId: number): void {
    this.openPlayer(playerId);
  }

  onMovePlayer(playerId: number, stageKey: string): void {
    this.clubEvalService.movePlayerStage(this.clubId, {
      playerId,
      stageKey,
      movedBy: this.userId
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.loadPipeline(); this.notification.success('COMMON.CHANGES_SAVED'); },
        error: () => this.notification.errorGeneric()
      });
  }

  openConfig(): void {
    this.router.navigate(['/dashboard/club-eval', this.clubId, 'config']);
  }

  openSession(): void {
    if (!this.selectedTeamId) return;
    this.router.navigate(['/dashboard/club-eval', this.clubId, 'session', this.selectedTeamId]);
  }

  openCompare(): void {
    if (!this.selectedTeamId) return;
    this.router.navigate(['/dashboard/club-eval', this.clubId, 'compare'],
      { queryParams: { teamId: this.selectedTeamId } });
  }

  goBack(): void {
    this.location.back();
  }

  get filteredPlayers(): any[] {
    const list = this.playersSearch
      ? this.players.filter(p =>
          (p.nombre + ' ' + (p.apellido || '')).toLowerCase().includes(this.playersSearch.toLowerCase()) ||
          (p.posicion || '').toLowerCase().includes(this.playersSearch.toLowerCase())
        )
      : [...this.players];

    return list.sort((a, b) => {
      const nameA = (a.nombre + ' ' + (a.apellido || '')).toLowerCase();
      const nameB = (b.nombre + ' ' + (b.apellido || '')).toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }

  pipelinePlayerCount(stageKey: string): number {
    const stage = this.pipelineData.find(s => s.stageKey === stageKey);
    return stage?.players?.length || 0;
  }

  onPhotoError(playerId: number): void {
    setTimeout(() => { this.brokenPhotos[playerId] = true; this.cdr.markForCheck(); });
  }
}
