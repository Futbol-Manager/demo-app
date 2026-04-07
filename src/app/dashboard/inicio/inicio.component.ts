import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { distinctUntilChanged, filter, take, tap, shareReplay, map, catchError } from 'rxjs/operators';
import { forkJoin, of, Observable, EMPTY, Subscription } from 'rxjs';
import { LoginService } from 'src/app/core/services/login/login.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { User } from 'src/app/core/models/users/user.model';
import { Response } from 'src/app/core/services/models/response.model';
import { PlayerService } from 'src/app/core/services/player/player.service';
import { AiPageContextService } from 'src/app/core/services/ai-chat/ai-page-context.service';
import { ClubSubscriptionService } from 'src/app/core/services/subscription/club-subscription.service';
import { ClubPlanType, FeatureLockData } from 'src/app/core/models/subscription/club-subscription.model';
import { getSeasons, getCurrentSeasonString } from 'src/app/core/utils/season.utils';
import { environment } from 'src/environments/environment';
import { isDemoMode } from 'src/app/core/services/demo/demo-mode';
import { DEMO_IDS } from 'src/app/core/services/demo/demo.service';
import { TutorialService } from 'src/app/core/services/tutorial/tutorial.service';
import { SportContextService } from 'src/app/core/services/sport/sport-context.service';

@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InicioComponent implements OnInit, OnDestroy {

  private static readonly NO_TEAM_SENTINEL = '__NO_TEAM__';
  readonly noTeamValue = InicioComponent.NO_TEAM_SENTINEL;

  // =========================
  // Estado base
  // =========================
  teamTrainingCache = new Map<number, { trainingDays: string | null; nameCompleteTeam: string | null; levelLeague: string | null }>();

  usuarioActual!: User;
  userId = 0;
  profileId = 0;
  clubId = 0;
  staffPermissions: string[] = [];
  clubPlanType: ClubPlanType | null = null;

  // ── Feature lock modal ──
  lockedModalVisible = false;
  lockedModalData: FeatureLockData | null = null;

  private readonly LOCKED_FEATURES: Record<number, FeatureLockData> = {
    2: {
      nameKey: 'NAV.CLOTHES',
      iconClass: 'bi-backpack3',
      imageUrl: 'assets/images/jugadores.jpg',
      headlineKey: 'FEATURE_LOCK.CLOTHING.HEADLINE',
      descriptionKey: 'FEATURE_LOCK.CLOTHING.DESCRIPTION',
      benefitKeys: ['FEATURE_LOCK.CLOTHING.BENEFIT_1', 'FEATURE_LOCK.CLOTHING.BENEFIT_2', 'FEATURE_LOCK.CLOTHING.BENEFIT_3'],
    },
    4: {
      nameKey: 'NAV.SPONSORS',
      iconClass: 'bi-collection',
      imageUrl: 'assets/images/patrocinadores.jpg',
      headlineKey: 'FEATURE_LOCK.SPONSORS.HEADLINE',
      descriptionKey: 'FEATURE_LOCK.SPONSORS.DESCRIPTION',
      benefitKeys: ['FEATURE_LOCK.SPONSORS.BENEFIT_1', 'FEATURE_LOCK.SPONSORS.BENEFIT_2', 'FEATURE_LOCK.SPONSORS.BENEFIT_3'],
    },
    8: {
      nameKey: 'NAV.NOTIFICATIONS',
      iconClass: 'bi-bell-fill',
      imageUrl: 'assets/images/notificaciones.jpg',
      headlineKey: 'FEATURE_LOCK.NOTIFICATIONS.HEADLINE',
      descriptionKey: 'FEATURE_LOCK.NOTIFICATIONS.DESCRIPTION',
      benefitKeys: ['FEATURE_LOCK.NOTIFICATIONS.BENEFIT_1', 'FEATURE_LOCK.NOTIFICATIONS.BENEFIT_2', 'FEATURE_LOCK.NOTIFICATIONS.BENEFIT_3'],
    },
    12: {
      nameKey: 'NAV.SCOUTING',
      iconClass: 'bi-binoculars',
      imageUrl: 'assets/images/scouting.jpg',
      headlineKey: 'FEATURE_LOCK.SCOUTING.HEADLINE',
      descriptionKey: 'FEATURE_LOCK.SCOUTING.DESCRIPTION',
      benefitKeys: ['FEATURE_LOCK.SCOUTING.BENEFIT_1', 'FEATURE_LOCK.SCOUTING.BENEFIT_2', 'FEATURE_LOCK.SCOUTING.BENEFIT_3'],
    },
    13: {
      nameKey: 'NAV.VIDEO_LIBRARY',
      iconClass: 'bi-play-btn-fill',
      imageUrl: 'assets/images/video-biblioteca.jpg',
      headlineKey: 'FEATURE_LOCK.VIDEO_LIBRARY.HEADLINE',
      descriptionKey: 'FEATURE_LOCK.VIDEO_LIBRARY.DESCRIPTION',
      benefitKeys: ['FEATURE_LOCK.VIDEO_LIBRARY.BENEFIT_1', 'FEATURE_LOCK.VIDEO_LIBRARY.BENEFIT_2', 'FEATURE_LOCK.VIDEO_LIBRARY.BENEFIT_3'],
    },
    14: {
      nameKey: 'NAV.VIDEO_ANALYSIS',
      iconClass: 'bi-camera-reels',
      imageUrl: 'assets/images/video-analysis.jpg',
      headlineKey: 'FEATURE_LOCK.VIDEO_ANALYSIS.HEADLINE',
      descriptionKey: 'FEATURE_LOCK.VIDEO_ANALYSIS.DESCRIPTION',
      benefitKeys: ['FEATURE_LOCK.VIDEO_ANALYSIS.BENEFIT_1', 'FEATURE_LOCK.VIDEO_ANALYSIS.BENEFIT_2', 'FEATURE_LOCK.VIDEO_ANALYSIS.BENEFIT_3'],
    },
    16: {
      nameKey: 'INICIO.STAFF_MANAGEMENT',
      iconClass: 'bi-person-badge',
      imageUrl: 'assets/images/staff-club.jpg',
      headlineKey: 'FEATURE_LOCK.STAFF.HEADLINE',
      descriptionKey: 'FEATURE_LOCK.STAFF.DESCRIPTION',
      benefitKeys: ['FEATURE_LOCK.STAFF.BENEFIT_1', 'FEATURE_LOCK.STAFF.BENEFIT_2', 'FEATURE_LOCK.STAFF.BENEFIT_3'],
    },
  };

  private readonly FREE_ALLOWED_IDS = new Set([3, 6, 7, 9, 11, 17]);

  isFeatureLocked(featureId: number): boolean {
    return this.profileId === 1 && this.clubPlanType === 'gratuito' && !this.FREE_ALLOWED_IDS.has(featureId);
  }

  openLockedModal(featureId: number): void {
    this.lockedModalData = this.LOCKED_FEATURES[featureId] ?? null;
    this.lockedModalVisible = true;
    this.cdr.markForCheck();
  }

  closeLockModal(): void {
    this.lockedModalVisible = false;
    this.lockedModalData = null;
  }

  goToUpgrade(): void {
    this.closeLockModal();
    this.router.navigate(['/dashboard/suscripcion-club']);
  }

  get hasStaffDashboard(): boolean {
    return this.staffPermissions.some(p => p.startsWith('DASHBOARD_'));
  }

  get isDemo(): boolean { return isDemoMode() === true; }

  /** En modo demo mostramos siempre las tarjetas de Ropa, Patrocinadores, Notificaciones, Scouting, etc. */
  get showPremiumCards(): boolean {
    return isDemoMode() === true || (!this.clubLoading && this.clubOk);
  }

  /** Base URL para imágenes de usuario/equipo (en demo apunta a assets/images/user/) */
  get imageBaseUrlUser(): string {
    return environment.images + 'user/';
  }

  navegarStaff(route: string, needsClubId = false): void {
    const cId = this.clubId || Number(sessionStorage.getItem('clubId') ?? '0');
    if (needsClubId) {
      if (!cId) { console.warn('Staff: clubId no disponible aún'); return; }
      this.router.navigate([route, cId]);
    } else {
      this.router.navigate([route]);
    }
  }

  pictureClub = '';
  noPicture = false;
  clubOk = false;
  clubLoading = true;
  numEquipos = 0;
  datosCargando = true;
  datosNoCargados = false;

  isAndroid = false;
  isiOS = false;
  showAlertAndroid = true;
  listHijos: any[] = [];
  listTeam$: Observable<any[]> = EMPTY;
  clubList: any[] = [];

  seasons = getSeasons();
  temporada = getCurrentSeasonString();
  temporadaStoredValue = getCurrentSeasonString();
  federacion: number | null = null;

  // =========================
  // Cache keys
  // =========================
  private readonly CLUB_OK_KEY = 'clubOkResolved';
  private readonly CLUB_ID_KEY = 'clubId';
  private readonly CLUB_PLAN_TYPE_KEY = 'clubPlanType';

  private userSub: Subscription | null = null;
  private tutorialAutoStarted = false;
  private yaRedirigido = false;

  constructor(
    private loginService: LoginService,
    private teamService: TeamService,
    private router: Router,
    private playerservice: PlayerService,
    private aiPageContext: AiPageContextService,
    private clubSubscriptionService: ClubSubscriptionService,
    private tutorialService: TutorialService,
    private cdr: ChangeDetectorRef,
    private sportContextService: SportContextService,
  ) { }

  // =========================
  // Ciclo de vida
  // =========================
  ngOnInit(): void {
    this.yaRedirigido = false;
    this.detectarPlataforma();
    this.inicializarDesdeCache();
    this.cargarTemporadaDesdeStorage();
    this.setupUsuarioSubscription();
  }

  ngOnDestroy(): void {
    if (this.userSub) {
      this.userSub.unsubscribe();
      this.userSub = null;
    }
  }

  private setupUsuarioSubscription(): void {
    if (this.userSub) {
      this.userSub.unsubscribe();
    }
    this.userSub = this.loginService.usuarioActual.pipe(
      filter((u): u is User => !!u),
      distinctUntilChanged((a, b) =>
        a.profileType?.profileId === b.profileType?.profileId && a.userId === b.userId
      )
    ).subscribe((user) => {
      this.aplicarUsuarioYcargar(user);
    });
  }

  private getInicioTutorialScreenId(): string | null {
    if (this.profileId === 1) return 'dashboard-inicio';
    if (this.profileId === 2 || this.profileId === 6 || this.profileId === 7) return 'dashboard-inicio-coach';
    if (this.profileId === 3) return 'dashboard-inicio-player';
    return null;
  }

  private aplicarUsuarioYcargar(user: User): void {
    this.usuarioActual = user;
    this.profileId = user.profileType?.profileId ?? 0;
    this.userId = this.obtenerUserIdPorPerfil(user);
    this.staffPermissions = user.staffPermissions ?? [];

    if (user.userId === 9 && this.profileId !== 1 && this.profileId !== 2) {
      this.profileId = 2;
      this.userId = 9;
    }

    localStorage.setItem('userId', this.userId === 9 ? this.userId.toString() : '0');

    this.listHijos = [];
    this.listTeam$ = EMPTY;
    this.datosCargando = true;
    this.yaRedirigido = false;

    if (!this.tutorialAutoStarted) {
      this.tutorialAutoStarted = true;
      const screenId = this.getInicioTutorialScreenId();
      if (screenId) {
        setTimeout(() => this.tutorialService.start(screenId, true), 600);
      }
    }

    if (this.profileId === 1) {
      this.clubId = Number(sessionStorage.getItem(this.CLUB_ID_KEY) || '0');
      this.clubLoading = true;
      if (this.clubId > 0) {
        this.verificarSuscripcion();
        this.cargarPlanSuscripcion();
        this.cargarListadoEquipos();
      } else {
        this.cargarClubId();
      }
      this.cdr.markForCheck();
      return;
    }

    if (this.profileId === 2 || this.profileId === 6 || this.profileId === 7) {
      this.cargarListadoEquipos();
      this.cdr.markForCheck();
      return;
    }

    if (this.profileId > 2 && this.profileId < 6) {
      this.cargarJugadores();
      this.cdr.markForCheck();
      return;
    }

    this.datosCargando = false;
    this.cdr.markForCheck();
  }

  private cargarTemporadaDesdeStorage(): void {
    const temporada = localStorage.getItem('temporada');
    if (temporada) {
      this.temporadaStoredValue = temporada;
      this.temporada = temporada;
    }
  }

  cambiarTemporada(nuevaTemporada: string): void {
    if (this.temporada === nuevaTemporada) return;
    this.temporada = nuevaTemporada;
    this.temporadaStoredValue = nuevaTemporada;
    localStorage.setItem('temporada', nuevaTemporada);
    this.aiPageContext.invalidateClubCache();
    this.cdr.markForCheck();
  }

  cambiarTemporadaCoach(nuevaTemporada: string): void {
    this.cambiarTemporada(nuevaTemporada);
    this.cargarListadoEquipos();
  }

  private obtenerUserIdPorPerfil(user: any): number {
    if (user.profileType.profileId === 0) {
      return Number(localStorage.getItem('userIdClub'));
    }
    return user.userId;
  }

  private redirigirSiDatosIncompletos(): void {
    if (this.yaRedirigido) return;
    const hijoIncompleto = this.listHijos.find((h) => !h.apellido);
    if (hijoIncompleto) {
      this.yaRedirigido = true;
      this.router.navigate(['/dashboard/jugadores', hijoIncompleto.teamId], { replaceUrl: true });
    }
  }

  cerrarAlertaAndroid(): void {
    this.showAlertAndroid = false;
  }

  private detectarPlataforma(): void {
    const ua = navigator.userAgent || navigator.vendor;
    this.isAndroid = /android/i.test(ua);
    this.isiOS = /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window);
  }

  private inicializarDesdeCache(): void {
    const cachedClubOk = sessionStorage.getItem(this.CLUB_OK_KEY);
    const cachedClubId = sessionStorage.getItem(this.CLUB_ID_KEY);
    const cachedClubPlanType = localStorage.getItem(this.CLUB_PLAN_TYPE_KEY) as ClubPlanType | null;

    if (cachedClubPlanType && cachedClubPlanType !== 'gratuito') {
      this.clubPlanType = cachedClubPlanType;
    } else if (cachedClubPlanType === 'gratuito') {
      localStorage.removeItem(this.CLUB_PLAN_TYPE_KEY);
    }

    if (cachedClubOk !== null && cachedClubId !== null) {
      this.clubOk = cachedClubOk === 'true';
      this.clubId = Number(cachedClubId);
      this.clubLoading = false;
      if (this.clubId > 0) {
        this.aiPageContext.preloadForClub(this.clubId, this.userId);
      }
    }

    if (this.profileId === 1) {
      this.clubOk = true;
      this.clubLoading = false;
    }
  }

  // =========================
  // Club
  // =========================
  irAPantallaClub(id: number): void {
    if (isDemoMode() && !this.clubId) {
      this.clubId = DEMO_IDS.clubId;
    }

    if (this.userId !== 9 && !this.clubId) {
      this.teamService.getTeamByClub(this.userId.toString(), this.temporada).pipe(take(1)).subscribe({
        next: (response: Response) => {
          this.clubId = response.data?.club?.clubId ?? 0;
          if (!this.clubId && Array.isArray(response.data?.teams) && response.data.teams.length > 0) {
            const teamWithClub = response.data.teams.find((t: any) => t.clubId > 0);
            if (teamWithClub) this.clubId = teamWithClub.clubId;
          }
          if (!this.clubId) { console.warn('[INICIO] clubId inválido'); return; }
          sessionStorage.setItem(this.CLUB_ID_KEY, String(this.clubId));
          this.storeSeasonConfig(response.data?.club);
          this.cargarPlanSuscripcion();
          this.cdr.markForCheck();
          this.ejecutarNavegacion(id);
        },
        error: () => console.error('[INICIO] Error al cargar clubId para navegación'),
      });
      return;
    }

    if (this.profileId === 1 && this.clubPlanType === null) {
      const cachedPlan = localStorage.getItem(this.CLUB_PLAN_TYPE_KEY) as ClubPlanType | null;
      if (cachedPlan) this.clubPlanType = cachedPlan;
    }

    // En modo demo no restringir acceso
    if (!isDemoMode() && this.profileId === 1 && this.clubPlanType === 'gratuito') {
      if (!this.FREE_ALLOWED_IDS.has(id)) {
        this.openLockedModal(id);
        return;
      }
    }

    this.ejecutarNavegacion(id);
  }

  private ejecutarNavegacion(id: number): void {
    switch (id) {
      case 2:  this.router.navigate(['/dashboard/ropa', this.clubId]); break;
      case 3:  this.router.navigate(['/dashboard/cuadro-de-mandos', this.clubId]); break;
      case 4:  this.router.navigate(['/dashboard/patrocinadores', this.clubId]); break;
      case 6:  this.router.navigate(['/dashboard/documentos-club', this.clubId]); break;
      case 7:  this.router.navigate(['/dashboard/new-cuotas', this.clubId]); break;
      case 8:  this.router.navigate(['/dashboard/notificaciones', this.clubId]); break;
      case 9:  this.router.navigate(['/dashboard/equipos']); break;
      case 10: this.router.navigate(['/dashboard/inicio']); break;
      case 11: this.router.navigate(['/dashboard/asistente-ia']); break;
      case 12: this.router.navigate(['/dashboard/scouting-club', this.clubId]); break;
      case 13: this.router.navigate(['/dashboard/club-videos', this.clubId]); break;
      case 14: this.router.navigate(['/dashboard/video-analysis']); break;
      case 15: this.router.navigate(['/dashboard/erp']); break;
      case 16: this.router.navigate(['/dashboard/staff-club']); break;
      case 17: this.router.navigate(['/dashboard/tienda-club']); break;
      case 19: this.router.navigate(['/dashboard/club-post']); break;
    }
  }

  navegarEquipoEntrenador(team: any): void {
    if (team?.sport) {
      this.sportContextService.setSport(team.sport);
    }
    if (this.profileId === 6 || this.profileId === 7) {
      this.router.navigate(['/dashboard/menu-fisio', team.teamId, 0]);
    } else {
      this.router.navigate(['/dashboard/menu-entrenador', team.teamId, 0]);
    }
  }

  irACrearEquipo(): void {
    this.router.navigate(['/dashboard/equipos'], { queryParams: { openModal: 'true' } });
  }

  navegarAOpcionesJugador(teamId: number, playerId: number): void {
    this.router.navigate(['/dashboard/opcionesjugador', teamId, playerId]);
  }

  // =========================
  // Sport helpers
  // =========================
  getSportEmoji(sport: string): string {
    const map: Record<string, string> = {
      futbol: '⚽', baloncesto: '🏀', balonmano: '🤾', voley: '🏐',
      'futbol-americano': '🏈', rugby: '🏉', 'futbol-sala': '⚽',
      hockey: '🏒', waterpolo: '🤽', beisbol: '⚾', 'hockey-hielo': '🏒',
    };
    return map[sport?.toLowerCase()] ?? '⚽';
  }

  getSportKey(sport: string): string {
    return sport || 'futbol';
  }

  // =========================
  // Subscription / Club
  // =========================
  private cargarClubId(): void {
    this.teamService.getTeamByClub(this.userId.toString(), this.temporada).pipe(take(1)).subscribe({
      next: (response: Response) => {
        this.clubId = response.data?.club?.clubId ?? 0;
        if (!this.clubId && Array.isArray(response.data?.teams) && response.data.teams.length > 0) {
          const teamWithClub = response.data.teams.find((t: any) => t.clubId > 0);
          if (teamWithClub) this.clubId = teamWithClub.clubId;
        }
        if (this.clubId) {
          sessionStorage.setItem(this.CLUB_ID_KEY, String(this.clubId));
          this.aiPageContext.preloadForClub(this.clubId, this.userId);
          this.verificarSuscripcion();
          this.cargarPlanSuscripcion();
          this.storeSeasonConfig(response.data?.club);
        }
        this.datosCargando = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.clubLoading = false;
        this.datosCargando = false;
        this.cdr.markForCheck();
      },
    });
  }

  private storeSeasonConfig(club: any): void {
    if (!club) return;
    if (club.seasonStartMonth != null) localStorage.setItem('seasonStartMonth', String(club.seasonStartMonth));
    if (club.seasonStartDay != null) localStorage.setItem('seasonStartDay', String(club.seasonStartDay));
    if (club.seasonEarlyAccessDays != null) localStorage.setItem('seasonEarlyAccessDays', String(club.seasonEarlyAccessDays));
  }

  private verificarSuscripcion(): void {
    this.teamService.getEstadoSuscripcion(this.userId, this.profileId).pipe(take(1)).subscribe({
      next: (response: Response) => {
        if (response.data === 999 || response.data >= 1) {
          this.clubOk = true;
        } else if (response.data < 1) {
          if (this.profileId === 1 && this.clubId > 0) {
            this.clubOk = true;
          } else {
            this.datosNoCargados = true;
          }
        }
        sessionStorage.setItem(this.CLUB_OK_KEY, String(this.clubOk));
        this.clubLoading = false;
        this.datosCargando = false;
        this.cdr.markForCheck();
      },
      error: () => {
        if (this.profileId === 1 && this.clubId > 0) this.clubOk = true;
        this.clubLoading = false;
        this.datosCargando = false;
        this.cdr.markForCheck();
      },
    });
  }

  private cargarPlanSuscripcion(): void {
    if (this.profileId !== 1 || this.clubId <= 0) {
      this.clubPlanType = null;
      localStorage.removeItem(this.CLUB_PLAN_TYPE_KEY);
      return;
    }
    this.clubSubscriptionService.getCurrentClubPlan(this.clubId).pipe(take(1)).subscribe({
      next: (result: any) => {
        this.clubPlanType = (result?.success && result?.plan?.planType) ? result.plan.planType as ClubPlanType : null;
        if (this.clubPlanType) {
          localStorage.setItem(this.CLUB_PLAN_TYPE_KEY, this.clubPlanType);
          if (!this.clubOk) {
            this.clubOk = true;
            this.clubLoading = false;
            sessionStorage.setItem(this.CLUB_OK_KEY, 'true');
          }
        } else {
          localStorage.removeItem(this.CLUB_PLAN_TYPE_KEY);
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.clubPlanType = null;
        localStorage.removeItem(this.CLUB_PLAN_TYPE_KEY);
        this.cdr.markForCheck();
      },
    });
  }

  // =========================
  // Equipos (coach/club)
  // =========================
  cargarListadoEquipos(): void {
    localStorage.setItem('temporada', this.temporada);
    this.temporadaStoredValue = this.temporada;

    this.listTeam$ = this.teamService.getTeams(this.userId.toString(), this.temporadaStoredValue).pipe(
      tap((response: Response) => {
        if (response?.data?.picture) {
          this.pictureClub = response.data.picture;
          this.noPicture = true;
        } else {
          this.noPicture = false;
        }
      }),
      map((response: Response) => {
        if (!response?.data) return [];
        if (Array.isArray(response.data.teams) && response.data.teams.length > 0) {
          return response.data.teams.map((team: any) => ({
            ...team,
            trainingDays: team.trainingDays && !team.trainingDays.toLowerCase().includes('null')
              ? team.trainingDays : null,
            jugadoresPorEquipo: team.jugadoresPorEquipo ?? 0,
          }));
        }
        return [];
      }),
      tap(() => {
        this.checkSuscripcion();
        this.cdr.markForCheck();
      }),
      catchError(() => {
        this.datosCargando = false;
        this.cdr.markForCheck();
        return of([]);
      }),
      shareReplay(1),
    );
    this.cdr.markForCheck();
  }

  checkSuscripcion(): void {
    this.teamService.getEstadoSuscripcion(this.userId, this.profileId).subscribe(
      (response: Response) => {
        this.numEquipos = response.data;
        if (response.data > 98 || response.data >= 1) {
          this.clubOk = true;
        } else if (response.data < 1) {
          if (this.profileId === 1 && this.clubId > 0) {
            this.clubOk = true;
          } else {
            this.datosNoCargados = true;
          }
        }
        this.datosCargando = false;
        this.cdr.markForCheck();
      },
      () => {
        if (this.profileId === 1 && this.clubId > 0) this.clubOk = true;
        this.datosCargando = false;
        this.cdr.markForCheck();
      }
    );
  }

  /** Cuenta cuántos días de entrenamiento hay en la semana a partir del string de horarios */
  countTrainingDays(trainingDays: string | null): number {
    if (!trainingDays) return 0;
    const matches = trainingDays.match(/[LMXJVSD]:/g);
    return matches ? matches.length : 0;
  }

  /** Devuelve los 7 días de la semana con si tienen entrenamiento y el horario */
  getWeekSchedule(trainingDays: string | null): { key: string; label: string; active: boolean; hours: string }[] {
    const days = [
      { key: 'L', label: 'L' }, { key: 'M', label: 'M' }, { key: 'X', label: 'X' },
      { key: 'J', label: 'J' }, { key: 'V', label: 'V' }, { key: 'S', label: 'S' }, { key: 'D', label: 'D' },
    ];
    if (!trainingDays) return days.map(d => ({ ...d, active: false, hours: '' }));
    const regex = /([LMXJVSD]):\s*([\d:]+-[\d:]+)/g;
    const map: Record<string, string> = {};
    let match;
    while ((match = regex.exec(trainingDays)) !== null) {
      map[match[1]] = match[2];
    }
    return days.map(d => ({ ...d, active: !!map[d.key], hours: map[d.key] ?? '' }));
  }

  // =========================
  // Jugadores (padre/familia)
  // =========================
  cargarJugadores(): void {
    this.datosCargando = true;
    localStorage.setItem('temporada', this.temporada);
    this.temporadaStoredValue = this.temporada;

    this.teamService.getTeamByPlayer(this.userId.toString(), this.temporadaStoredValue).pipe(take(1)).subscribe({
      next: (response: Response) => {
        const hijos = response?.data ?? [];
        this.listHijos = hijos.map((hijo: any) => ({
          ...hijo,
          nextMatch: null,
          trainingDays: null,
          teamNameComplete: null,
          teamLevelLeague: null,
        }));

        this.redirigirSiDatosIncompletos();
        if (this.yaRedirigido) return;

        if (!hijos.length) {
          this.listHijos = [];
          this.datosCargando = false;
          this.cdr.markForCheck();
          return;
        }

        const requests = this.listHijos.map((hijo: any) =>
          forkJoin({
            nextMatch: this.playerservice.getListProximosPartidos(hijo.teamId).pipe(
              map((r: Response) => r?.data && r.data.length ? r.data[0] : null),
              catchError(() => of(null))
            ),
            trainingDays: this.obtenerHorarioEntrenamiento(hijo.teamId),
          }).pipe(map((result) => ({ hijo, ...result })))
        );

        forkJoin(requests).subscribe((results) => {
          results.forEach((res: any) => {
            res.hijo.nextMatch = res.nextMatch;
            res.hijo.trainingDays = res.trainingDays?.trainingDays ?? null;
            res.hijo.teamNameComplete = res.trainingDays?.nameCompleteTeam ?? null;
            res.hijo.teamLevelLeague = res.trainingDays?.levelLeague ?? null;
          });
          this.datosCargando = false;
          this.cdr.markForCheck();
        });
      },
      error: () => {
        this.listHijos = [];
        this.datosCargando = false;
        this.cdr.markForCheck();
      },
    });
  }

  cargarProximoPartido(hijo: any): void {
    this.playerservice.getListProximosPartidos(hijo.teamId).subscribe({
      next: (response: Response) => {
        hijo.nextMatch = response?.data && response.data.length > 0 ? response.data[0] : null;
        this.cdr.markForCheck();
      },
      error: () => {
        hijo.nextMatch = null;
        this.cdr.markForCheck();
      },
    });
  }

  obtenerHorarioEntrenamiento(teamId: number) {
    if (this.teamTrainingCache.has(teamId)) {
      return of(this.teamTrainingCache.get(teamId)!);
    }
    return this.teamService.getTeamById(teamId.toString()).pipe(
      map((response: Response) => {
        const data = response?.data;
        const rawName = data?.nameCompleteTeam?.trim() ?? null;
        let cleanName: string | null = null;
        if (rawName && !rawName.toLowerCase().includes('null') && !rawName.toLowerCase().includes('sin equipo')) {
          cleanName = rawName;
        }
        if (!cleanName) cleanName = InicioComponent.NO_TEAM_SENTINEL;
        const teamInfo = {
          trainingDays: data?.trainingDays && !data.trainingDays.toLowerCase().includes('null')
            ? data.trainingDays.trim() : null,
          nameCompleteTeam: cleanName,
          levelLeague: data?.levelLeague ?? null,
        };
        this.teamTrainingCache.set(teamId, teamInfo);
        return teamInfo;
      }),
      catchError(() => {
        const emptyInfo = { trainingDays: null, nameCompleteTeam: null, levelLeague: null };
        this.teamTrainingCache.set(teamId, emptyInfo);
        return of(emptyInfo);
      })
    );
  }

  parseTrainingDays(trainingDays: string | null) {
    if (!trainingDays) return null;
    const dayMap: Record<string, string> = {
      L: 'DAYS.MONDAY', M: 'DAYS.TUESDAY', X: 'DAYS.WEDNESDAY',
      J: 'DAYS.THURSDAY', V: 'DAYS.FRIDAY', S: 'DAYS.SATURDAY', D: 'DAYS.SUNDAY',
    };
    const regex = /([LMXJVSD]):\s*([\d:]+-[\d:]+)/g;
    const result: { dayLabel: string; hours: string }[] = [];
    let match;
    while ((match = regex.exec(trainingDays)) !== null) {
      result.push({ dayLabel: dayMap[match[1]], hours: match[2] });
    }
    return result;
  }

  // =========================
  // trackBy helpers
  // =========================
  trackBySeason(_: number, s: any): any { return s.value; }
  trackByTeamId(_: number, team: any): any { return team.teamId ?? team.id ?? team; }
  trackByHijoId(_: number, hijo: any): any { return hijo.playerId ?? hijo.id ?? hijo; }
  trackByIndex(index: number): number { return index; }
}
