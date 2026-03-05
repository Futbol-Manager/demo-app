import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { distinctUntilChanged, filter, take } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { LoginService } from 'src/app/core/services/login/login.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { User } from 'src/app/core/models/users/user.model';
import { Response } from 'src/app/core/services/models/response.model';
import { PlayerService } from 'src/app/core/services/player/player.service';
import { AiPageContextService } from 'src/app/core/services/ai-chat/ai-page-context.service';
import { ClubSubscriptionService } from 'src/app/core/services/subscription/club-subscription.service';
import { ClubPlanType } from 'src/app/core/models/subscription/club-subscription.model';
import { getSeasons, getCurrentSeasonString } from 'src/app/core/utils/season.utils';
import { environment } from 'src/environments/environment';
import { isDemoMode } from 'src/app/core/services/demo/demo-mode';
import { DEMO_IDS } from 'src/app/core/services/demo/demo.service';

@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.scss'],
})
export class InicioComponent implements OnInit {
  // =========================
  // Estado base
  // =========================
  teamTrainingCache = new Map<
    number,
    {
      trainingDays: string | null;
      nameCompleteTeam: string | null;
      levelLeague: string | null;
    }
  >();

  usuarioActual!: User;
  userId = 0;
  profileId = 0;
  clubId = 0;
  staffPermissions: string[] = [];
  clubPlanType: ClubPlanType | null = null;

  get hasStaffDashboard(): boolean {
    return this.staffPermissions.some(p => p.startsWith('DASHBOARD_'));
  }

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
  listTeam: any[] = [];
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

  constructor(
    private loginService: LoginService,
    private teamService: TeamService,
    private router: Router,
    private playerservice: PlayerService,
    private aiPageContext: AiPageContextService,
    private clubSubscriptionService: ClubSubscriptionService,
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

  /**
   * Suscripción al usuario actual: reacciona a cambios de rol (Club/Entrenador/Jugador).
   * Al cambiar el rol se limpia el estado y se recarga la vista correspondiente.
   */
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

  /**
   * Aplica el usuario actual al estado del componente y carga los datos del rol.
   * Se llama en la suscripción inicial y cada vez que cambia el rol (p. ej. desde el header).
   */
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

    // Limpiar datos del rol anterior para que no se muestre la vista previa
    this.listHijos = [];
    this.listTeam = [];
    this.datosCargando = true;
    this.yaRedirigido = false;

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
      return;
    }

    if (this.profileId === 2 || this.profileId === 6 || this.profileId === 7) {
      this.cargarListadoEquipos();
      return;
    }

    if (this.profileId > 2 && this.profileId < 6) {
      this.cargarJugadores();
      return;
    }

    this.datosCargando = false;
  }

  private cargarTemporadaDesdeStorage(): void {
    const temporada = localStorage.getItem('temporada');
    if (temporada) {
      this.temporadaStoredValue = temporada;
      this.temporada = temporada;
    }
  }
  private obtenerUserIdPorPerfil(user: any): number {
    if (user.profileType.profileId === 0) {
      return Number(localStorage.getItem('userIdClub'));
    }
    return user.userId;
  }
  private resolverCargaInicialPorPerfil(): void {
    switch (true) {
      case this.profileId === 2:
      case this.profileId === 6:
      case this.profileId === 7:
        this.cargarListadoEquipos();
        break;

      case this.profileId > 2 && this.profileId < 6:
        // Una sola llamada que carga los hijos y comprueba datos incompletos
        this.cargarJugadores();
        break;

      default:
        this.datosCargando = false;
        break;
    }
  }
  /** Flag para evitar redirect loops cuando el jugador vuelve a inicio con datos incompletos */
  private yaRedirigido = false;

  private redirigirSiDatosIncompletos(): void {
    if (this.yaRedirigido) return;           // evita loop infinito de redirect
    const hijoIncompleto = this.listHijos.find((h) => !h.apellido);
    if (hijoIncompleto) {
      this.yaRedirigido = true;
      this.router.navigate(
        ['/dashboard/jugadores', hijoIncompleto.teamId],
        { replaceUrl: true }                 // reemplaza en el historial, no apila
      );
    }
  }

  // =========================
  // Plataforma

  // =========================
  irAPantallaClub(id: number): void {
    this.cargarClubId();
    // En modo demo asegurar clubId para que la navegación no se bloquee
    if (isDemoMode() && !this.clubId) {
      this.clubId = DEMO_IDS.clubId;
    }
    if (this.userId != 9) {
      if (!this.clubId) {
        console.warn('Intento de navegación sin clubId');
        return;
      }
    }

    if (this.profileId === 1 && this.clubPlanType === null) {
      const cachedPlan = localStorage.getItem(this.CLUB_PLAN_TYPE_KEY) as ClubPlanType | null;
      if (cachedPlan) {
        this.clubPlanType = cachedPlan;
      } else {
        this.cargarPlanSuscripcion();
      }
    }

    // Control de acceso para plan gratuito (en modo demo no restringir: todas las opciones llevan a su componente real)
    if (!isDemoMode() && this.profileId === 1 && this.clubPlanType === 'gratuito') {
      const allowedIds = [3, 6, 7, 9, 11]; // Cuadro mandos, Documentos, Pagos, Equipos, Asistente IA
      if (!allowedIds.includes(id)) {
        this.router.navigate(['/dashboard/suscripcion-club']);
        return;
      }
    }

    // Si clubPlanType es null (sin suscripción activa o API no disponible), acceso completo a todos los módulos

    switch (id) {
      case 2:
        this.router.navigate(['/dashboard/ropa', this.clubId]);
        break;
      case 3:
        this.router.navigate(['/dashboard/cuadro-de-mandos', this.clubId]);
        break;
      case 4:
        this.router.navigate(['/dashboard/patrocinadores', this.clubId]);
        break;
      case 6:
        this.router.navigate(['/dashboard/documentos-club', this.clubId]);
        break;
      case 7:
        this.router.navigate(['/dashboard/new-cuotas', this.clubId]);
        break;
      case 8:
        this.router.navigate(['/dashboard/notificaciones', this.clubId]);
        break;
      case 9:
        this.router.navigate(['/dashboard/equipos']);
        break;
      case 10:
        this.router.navigate(['/dashboard/admin-clubes']);
        break;
      case 11:
        this.router.navigate(['/dashboard/asistente-ia']);
        break;
      case 12:
        this.router.navigate(['/dashboard/scouting-club', this.clubId]);
        break;
      case 13:
        this.router.navigate(['/dashboard/club-videos', this.clubId]);
        break;
      case 14:
        this.router.navigate(['/dashboard/video-analysis']);
        break;
      case 15:
        this.router.navigate(['/dashboard/erp']);
        break;
      case 16:
        this.router.navigate(['/dashboard/staff-club']);
        break;
    }
  }

  navegarEquipoEntrenador(team: any): void {
    if (this.profileId === 6 || this.profileId === 7) {
      this.router.navigate(['/dashboard/menu-fisio', team.teamId, 0]);
    } else {
      this.router.navigate(['/dashboard/menu-entrenador', team.teamId, 0]);
    }
  }

  irACrearEquipo(): void {
    this.router.navigate(['/dashboard/equipos']);
  }

  // =========================
  // Cache inicial (evita skeleton innecesario)

  cerrarAlertaAndroid(): void {
    this.showAlertAndroid = false;
  }

  // =========================
  // Usuario (una sola vez)

  // =========================
  private detectarPlataforma(): void {
    const ua = navigator.userAgent || navigator.vendor;
    this.isAndroid = /android/i.test(ua);
    this.isiOS = /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window);
  }

  // =========================
  // Club (CRÍTICO)

  // =========================
  private inicializarDesdeCache(): void {
    const cachedClubOk = sessionStorage.getItem(this.CLUB_OK_KEY);
    const cachedClubId = sessionStorage.getItem(this.CLUB_ID_KEY);
    const cachedClubPlanType = localStorage.getItem(this.CLUB_PLAN_TYPE_KEY) as ClubPlanType | null;

    // Solo usar la caché si es un plan real (no 'gratuito' del bloque temporal eliminado)
    if (cachedClubPlanType && cachedClubPlanType !== 'gratuito') {
      this.clubPlanType = cachedClubPlanType;
    } else if (cachedClubPlanType === 'gratuito') {
      // Limpiar valor temporal incorrecto de sesiones anteriores
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
  }

  // =========================
  // Navegación (SEGURA)

  // =========================
  private cargarClubId(): void {
    this.teamService
      .getTeamByClub(this.userId.toString(), this.temporada)
      .pipe(take(1))
      .subscribe({
        next: (response: Response) => {
          this.clubId = response.data?.club?.clubId ?? 0;
          if (!this.clubId) {
            console.error('ClubId inválido');
            this.clubLoading = false;
            this.datosCargando = false;
            return;
          }

          // Cachear SIEMPRE
          sessionStorage.setItem(this.CLUB_ID_KEY, String(this.clubId));

          // Precargar estadísticas para el chatbot IA
          this.aiPageContext.preloadForClub(this.clubId, this.userId);

          this.verificarSuscripcion();
          this.cargarPlanSuscripcion();
        },
        error: () => {
          this.clubLoading = false;
          this.datosCargando = false;
        },
      });
  }

  // =========================
  private verificarSuscripcion(): void {
    this.teamService
      .getEstadoSuscripcion(this.userId, this.profileId)
      .pipe(take(1))
      .subscribe({
        next: (response: Response) => {
          if (response.data === 999) {
            this.clubOk = true;
          } else if (response.data < 1) {
            this.datosNoCargados = true;
          }

          sessionStorage.setItem(this.CLUB_OK_KEY, String(this.clubOk));

          this.clubLoading = false;
          this.datosCargando = false;
        },
        error: () => {
          this.clubLoading = false;
          this.datosCargando = false;
        },
      });
  }

  private cargarPlanSuscripcion(): void {
    if (this.profileId !== 1 || this.clubId <= 0) {
      this.clubPlanType = null;
      localStorage.removeItem(this.CLUB_PLAN_TYPE_KEY);
      return;
    }

    console.log('[INICIO DEBUG] Loading club subscription plan for clubId:', this.clubId);

    this.clubSubscriptionService.getCurrentClubPlan(this.clubId).pipe(take(1)).subscribe({
      next: (result: any) => {
        console.log('[INICIO DEBUG] Subscription API response:', result);
        this.clubPlanType = (result?.success && result?.plan?.planType)
          ? result.plan.planType as ClubPlanType
          : null;
        if (this.clubPlanType) {
          localStorage.setItem(this.CLUB_PLAN_TYPE_KEY, this.clubPlanType);
        } else {
          localStorage.removeItem(this.CLUB_PLAN_TYPE_KEY);
        }
        console.log('[INICIO DEBUG] Set clubPlanType to:', this.clubPlanType);
      },
      error: (err) => {
        console.log('[INICIO DEBUG] Subscription API error (acceso completo por defecto):', err);
        this.clubPlanType = null;
        localStorage.removeItem(this.CLUB_PLAN_TYPE_KEY);
      }
    });
  }

  navegarAOpcionesJugador(teamId: number, playerId: number): void {
    this.router.navigate(['/dashboard/opcionesjugador', teamId, playerId]);
  }

  cargarJugadores(): void {
    this.datosCargando = true;

    localStorage.setItem('temporada', this.temporada);
    this.temporadaStoredValue = this.temporada;

    this.teamService
      .getTeamByPlayer(this.userId.toString(), this.temporadaStoredValue)
      .pipe(take(1))
      .subscribe({
        next: (response: Response) => {
          const hijos = response?.data ?? [];
          this.listHijos = hijos.map((hijo: any) => ({
            ...hijo,
            nextMatch: null,
            trainingDays: null,
            teamNameComplete: null,
            teamLevelLeague: null,
          }));

          // Comprobar datos incompletos ANTES de hacer más peticiones
          this.redirigirSiDatosIncompletos();
          if (this.yaRedirigido) return;     // se está redirigiendo, no seguir

          if (!hijos.length) {
            this.listHijos = [];
            this.datosCargando = false;
            return;
          }

          // 🔹 Observables por jugador
          const requests = this.listHijos.map((hijo: any) =>
            forkJoin({
              nextMatch: this.playerservice
                .getListProximosPartidos(hijo.teamId)
                .pipe(
                  map((r: Response) =>
                    r?.data && r.data.length ? r.data[0] : null
                  ),
                  catchError(() => of(null))
                ),

              trainingDays: this.obtenerHorarioEntrenamiento(hijo.teamId),
            }).pipe(
              map((result) => ({
                hijo,
                ...result,
              }))
            )
          );

          // 🔹 Esperamos TODO
          forkJoin(requests).subscribe((results) => {
            results.forEach((res: any) => {
              res.hijo.nextMatch = res.nextMatch;

              res.hijo.trainingDays = res.trainingDays?.trainingDays ?? null;
              res.hijo.teamNameComplete =
                res.trainingDays?.nameCompleteTeam ?? null;
              res.hijo.teamLevelLeague = res.trainingDays?.levelLeague ?? null;
            });

            this.datosCargando = false;
          });
        },
        error: () => {
          this.listHijos = [];
          this.datosCargando = false;
        },
      });
  }

  cargarProximoPartido(hijo: any): void {
    this.playerservice.getListProximosPartidos(hijo.teamId).subscribe({
      next: (response: Response) => {
        if (response?.data && response.data.length > 0) {
          // Guardamos solo el próximo partido
          hijo.nextMatch = response.data[0];
        } else {
          hijo.nextMatch = null;
        }
      },
      error: () => {
        hijo.nextMatch = null;
      },
    });
  }
  obtenerHorarioEntrenamiento(teamId: number) {
    // 🔹 Cache
    if (this.teamTrainingCache.has(teamId)) {
      return of(this.teamTrainingCache.get(teamId)!);
    }

    return this.teamService.getTeamById(teamId.toString()).pipe(
      map((response: Response) => {
        const data = response?.data;

        const rawName = data?.nameCompleteTeam?.trim() ?? null;

        let cleanName: string | null = null;

        if (
          rawName &&
          !rawName.toLowerCase().includes('null') &&
          !rawName.toLowerCase().includes('sin equipo')
        ) {
          cleanName = rawName;
        }

        if (!cleanName) {
          cleanName = 'Sin equipo';
        }

        const teamInfo = {
          trainingDays:
            data?.trainingDays &&
              !data.trainingDays.toLowerCase().includes('null')
              ? data.trainingDays.trim()
              : null,

          nameCompleteTeam: cleanName,
          levelLeague: data?.levelLeague ?? null,
        };

        this.teamTrainingCache.set(teamId, teamInfo);
        return teamInfo;
      }),
      catchError(() => {
        const emptyInfo = {
          trainingDays: null,
          nameCompleteTeam: null,
          levelLeague: null,
        };

        this.teamTrainingCache.set(teamId, emptyInfo);
        return of(emptyInfo);
      })
    );
  }

  parseTrainingDays(trainingDays: string | null) {
    if (!trainingDays) {
      return null;
    }

    const dayMap: Record<string, string> = {
      L: 'DAYS.MONDAY',
      M: 'DAYS.TUESDAY',
      X: 'DAYS.WEDNESDAY',
      J: 'DAYS.THURSDAY',
      V: 'DAYS.FRIDAY',
      S: 'DAYS.SATURDAY',
      D: 'DAYS.SUNDAY',
    };

    const regex = /([LMXJVSD]):\s*([\d:]+-[\d:]+)/g;
    const result: { dayLabel: string; hours: string }[] = [];

    let match;
    while ((match = regex.exec(trainingDays)) !== null) {
      result.push({
        dayLabel: dayMap[match[1]],
        hours: match[2],
      });
    }

    return result;
  }

  cargarListadoEquipos(): void {
    localStorage.setItem('temporada', this.temporada);
    this.temporadaStoredValue = this.temporada;

    this.teamService
      .getTeams(this.userId.toString(), this.temporadaStoredValue)
      .subscribe(
        (response: Response) => {

          // Reset por seguridad
          this.listTeam = [];

          if (response?.data) {
            // Imagen del club
            if (response.data.picture) {
              this.pictureClub = response.data.picture;
              this.noPicture = true;
            } else {
              this.noPicture = false;
            }

            // Equipos
            if (
              Array.isArray(response.data.teams) &&
              response.data.teams.length > 0
            ) {
              this.listTeam = response.data.teams.map(
                (team: {
                  trainingDays?: string | null;
                  jugadoresPorEquipo?: number | null;
                  [key: string]: any;
                }) => ({
                  ...team,

                  trainingDays:
                    team.trainingDays &&
                      !team.trainingDays.toLowerCase().includes('null')
                      ? team.trainingDays
                      : null,

                  jugadoresPorEquipo: team.jugadoresPorEquipo ?? 0,
                })
              );
            } else {
              // Temporada sin equipos
              this.listTeam = [];
            }
          } else {
            console.error(
              'La respuesta del servicio no tiene la estructura esperada',
              response
            );
          }

          this.checkSuscripcion();
        },
        (error) => {
          console.error('Error al cargar el listado de equipos', error);
          this.listTeam = [];
          this.datosCargando = false;
        }
      );
  }

  checkSuscripcion() {
    //acceder a un endpoint que revisa la sus, si es null, ver si está dentro de la semana que se creo la cuenta
    //si ya paso la semana, se revisara luego la fecha de renovacion, si no paso aun, pues no hacer nada, si paso
    //revisar en stripe el estado, porque si esta bien, hay que actualizar la fecha y si esta mal, actualizar a F el valido y la fecha, si esta mal
    // avisar por un alert
    this.teamService
      .getEstadoSuscripcion(this.userId, this.profileId)
      .subscribe(
        (response: Response) => {
          this.numEquipos = response.data;
          if (response.data > 98) {
            //significa que es un club con plan gratuido
            //hay que ver si tiene mas de 50 padres que pagan cuota, de ser asi, desbloquear los menus
            /*this.teamService.getPlayersByTeamByClubVerify(this.userId, this.temporadaStoredValue).subscribe(
            (resp: Response) => {
              this.numPadresPagados = response.data;
              if (resp.data < 49) {
                //significa que lo puede tener todo
                this.clubOk = true;
              } else {
                //significa que no tiene acceso
              }
            },
            (error) => {
              console.error('Error al cargar el listado de equipos', error);
            }
          );*/

            //significa que lo puede tener todo
            this.clubOk = true;
          }

          if (response.data < 1) {
            //significa que NO es valido el acceso
            this.datosNoCargados = true;
          } else {
            //significa que está solo, sin club
            this.datosCargando = true;
            //this.clubOk = true;
          }
          this.datosCargando = false;
        },
        (error) => {
          console.error('Error al cargar el listado de equipos', error);
          this.datosCargando = false;
        }
      );
  }
}
