import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { distinctUntilChanged, filter, take } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { LoginService } from 'src/app/core/services/login/login.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { User } from 'src/app/core/models/users/user.model';
import { Response } from 'src/app/core/services/models/response.model';
import { PlayerService } from 'src/app/core/services/player/player.service';
import { getSeasons, getCurrentSeasonString } from 'src/app/core/utils/season.utils';

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

  constructor(
    private loginService: LoginService,
    private teamService: TeamService,
    private router: Router,
    private playerservice: PlayerService
  ) { }

  // =========================
  // Ciclo de vida
  // =========================
  ngOnInit(): void {
    this.yaRedirigido = false;               // reset del flag al re-entrar
    this.cargarUsuario();
    this.detectarPlataforma();
    this.inicializarDesdeCache();
    this.cargarTemporadaDesdeStorage();
    this.inicializarUsuario();
    // cargarListadoEquipos y cargarJugadores ya se invocan dentro de
    // cargarUsuario / inicializarUsuario según el perfil → evitamos llamadas
    // duplicadas que provocaban race-conditions para profileId >= 3.
  }
  private cargarTemporadaDesdeStorage(): void {
    const temporada = localStorage.getItem('temporada');
    if (temporada) {
      this.temporadaStoredValue = temporada;
      this.temporada = temporada;
    }
  }
  private inicializarUsuario(): void {
    this.loginService.usuarioActual
      .pipe(filter(Boolean), take(1))
      .subscribe((user) => {
        this.usuarioActual = user!;
        this.profileId = user!.profileType.profileId;
        this.userId = this.obtenerUserIdPorPerfil(user!);

        //controlamos que sea espinosa el admin
        localStorage.setItem('userId', this.userId == 9 ? this.userId.toString() : '0');

        this.resolverCargaInicialPorPerfil();
      });
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
        this.cargarListadoEquipos();
        break;

      case this.profileId > 2:
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
    if (this.userId != 9) {
      // ⛔ BLOQUEO ABSOLUTO
      if (!this.clubId) {
        console.warn('Intento de navegación sin clubId');
        return;
      }
    }

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
    }
  }

  navegarEquipoEntrenador(team: any): void {
    this.router.navigate(['/dashboard/menu-entrenador', team.teamId, 0]);
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

    if (cachedClubOk !== null && cachedClubId !== null) {
      this.clubOk = cachedClubOk === 'true';
      this.clubId = Number(cachedClubId);
      this.clubLoading = false;
    }
  }

  // =========================
  // Suscripción

  // =========================
  private cargarUsuario(): void {
    //seteamos a 0 para reiniciar el valor    
    localStorage.setItem('userId', '0');

    this.loginService.usuarioActual
      .pipe(filter(Boolean), take(1))
      .subscribe((user) => {
        this.usuarioActual = user!;
        this.profileId = user!.profileType.profileId;
        this.userId = user!.userId;

        // Solo club/entrenador necesitan clubId y suscripción
        if (this.profileId <= 2) {
          if (this.clubId > 0) {
            this.verificarSuscripcion();
          } else {
            this.cargarClubId();
          }
          // Cargar equipos solo para club/entrenador (ya se llama también en resolverCargaInicialPorPerfil para coach)
          if (this.profileId === 1) {
            this.cargarListadoEquipos();
          }
        }
        // Para jugador (profileId >= 3) ya se dispara cargarHijos() + cargarJugadores()
        // desde inicializarUsuario → resolverCargaInicialPorPerfil, no duplicamos aquí.
      });
  }

  // =========================
  // Navegación (SEGURA)

  // =========================
  private cargarClubId(): void {
    this.teamService
      .getTeamByClub(this.userId.toString(), '2025')
      .pipe(take(1))
      .subscribe({
        next: (response: Response) => {
          this.clubId = response.data?.club?.clubId ?? 0;
          console.log("CLUBID", this.clubId)
          if (!this.clubId) {
            console.error('ClubId inválido');
            this.clubLoading = false;
            this.datosCargando = false;
            return;
          }

          // Cachear SIEMPRE
          sessionStorage.setItem(this.CLUB_ID_KEY, String(this.clubId));

          this.verificarSuscripcion();
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
          console.log('PROX:', hijo.nextMatch);
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
