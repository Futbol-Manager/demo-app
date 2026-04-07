import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { User } from 'src/app/core/models/users/user.model';
import { LoginService } from 'src/app/core/services/login/login.service';
import { TeamNew } from 'src/app/core/services/team/team.model';
import { TeamService, EquiposListCache } from 'src/app/core/services/team/team.service';
import { Response } from 'src/app/core/services/models/response.model';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ClubService } from 'src/app/core/services/club/club.service';
import { distinctUntilChanged, filter, take } from 'rxjs/operators';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Location } from '@angular/common';
import { getSeasons, getCurrentSeasonString } from 'src/app/core/utils/season.utils';
import { TranslateService } from '@ngx-translate/core';
import { NotificationService } from 'src/app/core/services/notification/notification.service';
import { ConfirmationService } from 'src/app/core/services/confirmation/confirmation.service';
import { TutorialService } from 'src/app/core/services/tutorial/tutorial.service';
import { environment } from 'src/environments/environment';
import { isDemoMode } from 'src/app/core/services/demo/demo-mode';
import { DemoDataService } from 'src/app/core/services/demo/demo-data.service';
import { SportContextService } from 'src/app/core/services/sport/sport-context.service';
import { getSportConfig } from 'src/app/core/models/sport/sport-config.model';
import { sportLeagueLabel } from 'src/app/core/utils/sport-ui-i18n';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-inicio',
  templateUrl: './equipos.component.html',
  styleUrls: ['./equipos.component.scss'],
})
export class EquiposComponent implements OnInit, OnDestroy {
  crearEquipoForm: FormGroup;

  datosCargados: boolean = false;
  usuarioActual!: User | null;
  listTeam: any[] = []; // Define una variable para almacenar el listado de equipos
  listHijos: any[] = []; // Define una variable para almacenar el listado de hijos
  showModal = false;
  teamNew: TeamNew = new TeamNew(); // Modelo para el nuevo equipo
  clubList: any[] = [];
  clubId: number = 0;
  pictureClub = '';
  noPicture = false;

  /** Base URL para imagen del club (en demo: assets/images/user/) */
  get imageBaseUrlUser(): string {
    return environment.images + 'user/';
  }

  /** True cuando la app está en modo demo (para mostrar siempre el logo del club en las tarjetas). */
  get isDemo(): boolean {
    return !!(environment as { demo?: boolean }).demo;
  }

  /** URL del escudo para la tarjeta. En demo usa URL absoluta y SafeResourceUrl para que Angular no bloquee la carga. */
  getShieldImageSrc(team: { imgClub?: string }): string | SafeResourceUrl {
    const isDemoMode = (environment as { demo?: boolean }).demo;
    if (isDemoMode) {
      const path = '/assets/images/user/demo-club-logo.png';
      const fullUrl = typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin + path
        : path;
      return this.sanitizer.bypassSecurityTrustResourceUrl(fullUrl);
    }
    const name = team?.imgClub || this.pictureClub;
    if (!name) return '';
    return this.imageBaseUrlUser + name;
  }
  showModalSubirJugadores = false;
  showModalSubirJugadoresGesDesk = false;
  excelForm: FormGroup;
  fileName: string | null = null;
  showUploadButton: boolean = false;
  selectedFile: File | null = null;
  userId = 0;
  profileId = 0;
  datosNoCargados = false;
  datosCargando = true;
  numEquipos = 0;
  numPadresPagados = 0;
  clubOk = false;
  seasons = getSeasons();
  temporada = getCurrentSeasonString();
  federacion: number | null = null;
  showAlertAndroid = true;

  federaciones: string[] = [
    'Real Federación Española de Fútbol',
    'Federación Andaluza de Fútbol',
    'Federación Aragonesa de Fútbol',
    'Federación de Fútbol del Principado de Asturias',
    'Federación Balear de Fútbol',
    'Federación Canaria de Fútbol',
    'Federación Cántabra de Fútbol',
    'Federación Castellano-Manchega de Fútbol',
    'Federación de Castilla y León de Fútbol',
    'Federación Catalana de Fútbol',
    'Federación Extremeña de Fútbol',
    'Federación Gallega de Fútbol',
    'Federación de Fútbol de la Comunidad Valenciana',
    'Federación de Fútbol de Madrid',
    'Federación de Fútbol de la Región de Murcia',
    'Federación Navarra de Fútbol',
    'Federación Riojana de Fútbol',
    'Federación Vasca de Fútbol',
    'Federación Interinsular de Fútbol de Las Palmas',
    'Federación Interinsular de Fútbol de Tenerife',
  ];

  // Categorías por defecto (las que ya tienes)
  categoriasDefault = [
    { value: 27, label: 'Sin equipo' },
    { value: 15, label: 'Senior' },
    { value: 16, label: 'Juvenil' },
    { value: 17, label: 'Juvenil/Cadete Femenina' },
    { value: 18, label: 'Cadete' },
    { value: 19, label: 'Cadete/Infantil Femenina' },
    { value: 20, label: 'Infantil' },
    { value: 21, label: 'Infantil/Alevín Femenina' },
    { value: 22, label: 'Alevín' },
    { value: 23, label: 'Benjamín' },
    { value: 24, label: 'Benjamín/Prebenjamín Femenina' },
    { value: 25, label: 'Prebenjamín' },
    { value: 26, label: 'Debutante' },
  ];

  // Categorías específicas para Federación 14 (Cataluña)
  /*categoriasCatalanas = [
    'Juvenil',
    'Cadet',
    'Infantil S14',
    'Infantil S13',
    'Aleví S12',
    'Aleví S11',
    'Lúdica Aleví',
    'Benjamí S10',
    'Benjamí S9',
    'Lúdica Benjamí',
    'Prebenjamí S8',
    'Prebenjamí S7',
    'Lúdica Prebenjamí',
  ].map((label, index) => ({ value: 100 + index, label })); // usar valores altos si necesitas diferenciarlos */

  categoriasCatalanas = [
    { value: 28, label: 'Juvenil' },
    { value: 29, label: 'Cadet' },
    { value: 30, label: 'Infantil S14' },
    { value: 31, label: 'Infantil S13' },
    { value: 32, label: 'Aleví S12' },
    { value: 33, label: 'Aleví S11' },
    { value: 34, label: 'Lúdica Aleví' },
    { value: 35, label: 'Benjamí S10' },
    { value: 36, label: 'Benjamí S9' },
    { value: 37, label: 'Lúdica Benjamí' },
    { value: 38, label: 'Prebenjamí S8' },
    { value: 39, label: 'Prebenjamí S7' },
    { value: 40, label: 'Lúdica Prebenjamí' },
    { value: 41, label: 'Cadet S15' },
    { value: 42, label: 'Cadet S16' },
  ];

  nivelesDefault: { value: string; label: string }[] = [];
  private langSub?: Subscription;

  // Niveles específicos para Federación 14
  nivelesCatalanes = [
    'Primera Federació',
    'Segona Federació',
    'Tercera Federació',
    'Lliga Elit',
    'Primera Catalana',
    'Segona Catalana',
    'Tercera Catalana',
    'Quarta Catalana',
    'Divisió Honor',
    'Lliga Nacional',
    'Preferent',
    'Primera',
    'Segona',
    'Tercera',
    'Quarta',
    'No Federat',
  ].map((label) => ({ value: label, label }));

  // Variables visibles que cambian dinámicamente
  categoriasVisibles = [...this.categoriasDefault];
  nivelesVisibles = [...this.nivelesDefault];

  temporadaStoredValue = getCurrentSeasonString();
  isAndroid: boolean = false;
  isiOS: boolean = false;

  categoriaNombre: string = '';
  categoriasFiltradas: {
    categoryTypeId: number;
    categoryName: string;
    year: number;
  }[] = [];
  categoriasLista: {
    categoryTypeId: number;
    categoryName: string;
    year: number;
  }[] = [];
  mostrarDropdown: boolean = false;
  selectedCategoriaId: number | null = null;

  categoriaNivel: string = '';
  mostrarDropdown2: boolean = false;
  nivelesVisiblesFiltradas = [...this.nivelesDefault];

  appStoreUrl = 'https://apps.apple.com/es/app/sphaira-tech/id6745791142';
  playStore =
    'https://play.google.com/store/apps/details?id=com.futbol.sphairatech&pcampaignid=web_share';
  aceptoGestionNavegador = false;
  modalConfirAndroid = false;
  optionTienda = 1;

  // ── Multi-sport filter ────────────────────────────────────────────────────
  /** Catálogo completo de deportes con emoji y colores */
  readonly SPORTS = [
    { key: 'futbol',      emoji: '⚽', color: '#10b981', colorDark: '#065f46' },
    { key: 'baloncesto',  emoji: '🏀', color: '#f97316', colorDark: '#7c2d12' },
    { key: 'atletismo',   emoji: '🏃', color: '#0ea5e9', colorDark: '#0c4a6e' },
    { key: 'balonmano',   emoji: '🤾', color: '#8b5cf6', colorDark: '#4c1d95' },
    { key: 'voley',       emoji: '🏐', color: '#f59e0b', colorDark: '#78350f' },
    { key: 'rugby',       emoji: '🏉', color: '#ef4444', colorDark: '#7f1d1d' },
    { key: 'futbol-sala', emoji: '👟', color: '#84cc16', colorDark: '#365314' },
    { key: 'hockey',      emoji: '🏑', color: '#14b8a6', colorDark: '#134e4a' },
    { key: 'natacion',    emoji: '🏊', color: '#06b6d4', colorDark: '#164e63' },
    { key: 'tenis',       emoji: '🎾', color: '#f43f5e', colorDark: '#881337' },
  ];

  /** Filtro de deporte activo en la vista */
  sportFilter: string = 'all';

  /** Equipos filtrados por deporte — se actualiza con applyFilters() */
  filteredTeams: any[] = [];

  /** Deportes únicos presentes en los equipos cargados */
  uniqueSportsInTeams: { key: string; emoji: string }[] = [];

  /** Solo true cuando hay 2+ deportes distintos (para mostrar el filtro) */
  showSportFilter: boolean = false;

  /** Recalcula filteredTeams y uniqueSportsInTeams. Llamar tras cambiar listTeam o sportFilter. */
  applyFilters(): void {
    const withSport = this.listTeam.map((t: any) => ({
      ...t,
      sport: t.sport || 'futbol',
    }));
    const keys = [...new Set(withSport.map((t: any) => t.sport as string))];
    this.uniqueSportsInTeams = keys.map(k => {
      const s = this.SPORTS.find(sp => sp.key === k);
      return { key: k, emoji: s?.emoji ?? '🏟️' };
    });
    this.showSportFilter = keys.length > 1;
    if (this.sportFilter !== 'all' && !keys.includes(this.sportFilter)) {
      this.sportFilter = 'all';
    }
    this.filteredTeams = this.sportFilter === 'all'
      ? withSport
      : withSport.filter((t: any) => t.sport === this.sportFilter);
  }

  /** Cambia el filtro activo y recalcula */
  setSportFilter(key: string): void {
    this.sportFilter = key;
    this.applyFilters();
    if (this.federacion == null || this.federacion.toString() !== '10') {
      const sk = key === 'all' ? 'futbol' : key;
      this.syncNivelesFromSport(sk);
    }
  }

  /** Emoji del deporte (fallback ⚽) */
  getSportEmoji(sportKey: string | null | undefined): string {
    const sport = this.SPORTS.find(s => s.key === sportKey);
    return sport ? sport.emoji : '⚽';
  }

  constructor(
    private loginService: LoginService,
    private router: Router,
    private teamService: TeamService,
    private clubService: ClubService,
    private fb: FormBuilder,
    private location: Location,
    private translate: TranslateService,
    private notificationService: NotificationService,
    private confirmationService: ConfirmationService,
    private sanitizer: DomSanitizer,
    private tutorialService: TutorialService,
    private sportContextService: SportContextService,
    private cdr: ChangeDetectorRef
  ) {
    this.excelForm = this.fb.group({
      excelFile: [null],
    });
    this.crearEquipoForm = this.fb.group({
      categoryTypeId: [''],
      federacion: [''],
      levelLeague: [''],
      name: [''],
      objectiveTeam: [''],
      trainingDays: [''],
      opinionTeam: [''],
      categoriaNombre: [''],
    });
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }

  /** Opciones de liga (valor canónico en español del config, etiqueta traducida). */
  buildLeagueOptions(sportKey: string): { value: string; label: string }[] {
    const sk = !sportKey || sportKey === 'all' ? 'futbol' : sportKey;
    const opts = getSportConfig(sk).leagueOptions || [];
    return opts.map((label) => ({
      value: label,
      label: sportLeagueLabel(this.translate, sk, label),
    }));
  }

  private syncNivelesFromSport(sk: string): void {
    this.nivelesDefault = this.buildLeagueOptions(sk);
    this.nivelesVisibles = [...this.nivelesDefault];
    this.nivelesVisiblesFiltradas = [...this.nivelesDefault];
  }

  ngOnInit(): void {
    this.syncNivelesFromSport('futbol');
    this.langSub = this.translate.onLangChange.subscribe(() => {
      const sk = this.sportFilter !== 'all' ? this.sportFilter : 'futbol';
      if (this.federacion == null || this.federacion.toString() !== '10') {
        this.syncNivelesFromSport(sk);
      }
      this.cdr.markForCheck();
    });

    setTimeout(() => this.tutorialService.start('equipos', true), 600);

    const userAgent = navigator.userAgent || navigator.vendor;

    this.isAndroid = /android/i.test(userAgent);
    this.isiOS = /iPad|iPhone|iPod/.test(userAgent) && !('MSStream' in window);
    if (
      localStorage.getItem('temporada') != null &&
      localStorage.getItem('temporada') != undefined
    ) {
      this.temporadaStoredValue = localStorage.getItem('temporada')!.toString();
      this.temporada = this.temporadaStoredValue;
    }

    this.loginService.usuarioActual
      .pipe(
        filter((user) => !!user),
        take(1) // Una sola carga para evitar bloqueos por emisiones repetidas
      )
      .subscribe((user) => {
        this.usuarioActual = user;
        this.profileId = this.usuarioActual!.profileType.profileId;
        this.userId = this.usuarioActual!.userId;

        if (this.profileId === 0) {
          const storedClubUserId = Number(localStorage.getItem('userIdClub'));
          if (storedClubUserId > 0) {
            this.userId = storedClubUserId;
          }
        }

        // Override admin: si el profileId real no es club ni coach,
        // forzar como coach para que funcione correctamente
        if (this.usuarioActual!.userId === 9 && this.profileId !== 1 && this.profileId !== 2) {
          this.userId = 9;
          this.profileId = 2;
        }

        if (this.profileId === 2) {
          this.cargarListadoEquipos();
        } else if (this.profileId < 2) {
          this.cargarListadoEquiposForClub();
        } else if (this.profileId > 2) {
          this.teamService
            .getTeamByPlayer(this.userId.toString(), this.temporadaStoredValue)
            .subscribe(
              (response: Response) => {
                this.datosCargando = false;
                if (response?.data != null) {
                  this.listHijos = Array.isArray(response.data) ? response.data : [];
                  this.datosCargados = true;
                  let goToDatos = false;
                  let teamId = 0;
                  for (let a = 0; a < this.listHijos.length; a++) {
                    if (this.listHijos[a].apellido == null) {
                      goToDatos = true;
                      teamId = this.listHijos[a].teamId;
                      break;
                    }
                  }
                  if (goToDatos) {
                    this.router.navigate(['/dashboard/jugadores', teamId]);
                  }
                }
              },
              (error) => {
                console.error('Error al cargar el listado de equipos', error);
                this.datosCargando = false;
                this.datosCargados = true;
              }
            );
        }
      });

    const storedValue = localStorage.getItem('federacionSeleccionada');
    if (storedValue !== null) {
      this.federacion = +storedValue;

      if (this.federacion.toString() === '10') {
        this.categoriasVisibles = [...this.categoriasCatalanas];
        this.nivelesVisibles = [...this.nivelesCatalanes];
      } else {
        this.categoriasVisibles = [...this.categoriasDefault];
        const sk = this.sportFilter !== 'all' ? this.sportFilter : 'futbol';
        this.syncNivelesFromSport(sk);
      }
    }

    // Escuchar cambios en el campo
    /*this.crearEquipoForm.get('categoriaNombre')?.valueChanges.subscribe(value => {
      this.onInputCategoria(value);
    });*/
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

  guardarFederacion() {
    if (this.federacion !== null) {
      localStorage.setItem(
        'federacionSeleccionada',
        this.federacion.toString()
      );
    }

    if (this.federacion != null && this.federacion.toString() === '10') {
      this.categoriasVisibles = [...this.categoriasCatalanas];
      this.nivelesVisibles = [...this.nivelesCatalanes];
    } else {
      this.categoriasVisibles = [...this.categoriasDefault];
      const sk = this.sportFilter !== 'all' ? this.sportFilter : 'futbol';
      this.syncNivelesFromSport(sk);
    }
  }

  copyLink() {
    const link = 'https://appsphairatech.com/registro-padres/' + this.clubId;
    //const link = 'localhost:4200/registro-padres/' + this.clubId;

    navigator.clipboard
      .writeText(link)
      .then(() => {
        console.log('Enlace copiado al portapapeles:', link);
        this.notificationService.success('EQUIPOS.LINK_COPIED');
      })
      .catch((err) => {
        console.error('Error al copiar el enlace:', err);
        this.notificationService.error('EQUIPOS.LINK_COPY_ERROR');
      });
  }

  /** Aplica datos desde la caché para mostrar la lista al instante al volver. */
  private applyEquiposCache(cache: EquiposListCache): void {
    this.listTeam = Array.isArray(cache.listTeam) ? [...cache.listTeam] : [];
    this.pictureClub = cache.pictureClub ?? '';
    this.noPicture = cache.noPicture ?? false;
    if (cache.clubId != null) this.clubId = cache.clubId;
    if (cache.numEquipos != null) this.numEquipos = cache.numEquipos;
    if (cache.datosNoCargados != null) this.datosNoCargados = cache.datosNoCargados;
    if (cache.clubOk != null) this.clubOk = cache.clubOk;
  }

  checkSuscripcion() {
    this.applyFilters();
    if (isDemoMode()) {
      this.numEquipos = 999;
      this.clubOk = true;
      this.datosCargados = true;
      this.datosCargando = false;
      return;
    }
    this.teamService
      .getEstadoSuscripcion(this.userId, this.profileId)
      .subscribe({
        next: (response: Response) => {
          this.numEquipos = response?.data ?? 0;
          if (this.numEquipos === 999) {
            this.clubOk = true;
          }
          if (this.numEquipos < 1) {
            this.datosNoCargados = true;
          } else {
            this.datosCargados = true;
          }
          this.datosCargando = false;
          this.teamService.setEquiposCache(this.userId, this.temporadaStoredValue, this.profileId, {
            numEquipos: this.numEquipos,
            datosNoCargados: this.datosNoCargados,
            clubOk: this.clubOk,
          });
        },
        error: (error) => {
          console.error('Error al cargar el listado de equipos', error);
          this.datosCargando = false;
          this.datosCargados = true;
        },
      });
  }

  // Método para cargar el listado de equipos
  cargarListadoEquipos(): void {
    localStorage.setItem('temporada', this.temporada);
    this.temporadaStoredValue = this.temporada;

    const cached = this.teamService.getEquiposCache(this.userId, this.temporadaStoredValue, this.profileId);
    if (cached && cached.listTeam.length > 0) {
      this.applyEquiposCache(cached);
      this.datosCargando = false;
      this.datosCargados = true;
    }

    this.teamService
      .getTeams(this.userId.toString(), this.temporadaStoredValue)
      .subscribe({
        next: (response: Response) => {
          if (response?.data) {
            if (response.data.picture != null) {
              this.pictureClub = response.data.picture;
              this.noPicture = true;
            }
            this.listTeam = Array.isArray(response.data.teams) ? response.data.teams : [];
            this.teamService.setEquiposCache(this.userId, this.temporadaStoredValue, this.profileId, {
              listTeam: this.listTeam,
              pictureClub: this.pictureClub,
              noPicture: this.noPicture,
            });
          } else {
            this.listTeam = [];
          }
          this.checkSuscripcion();
        },
        error: (error) => {
          console.error('Error al cargar el listado de equipos', error);
          this.datosCargando = false;
          this.listTeam = [];
          this.checkSuscripcion();
        },
      });
  }
  goBack(): void {
    this.location.back();
  }
  cargarJugadores() {
    localStorage.setItem('temporada', this.temporada);
    this.temporadaStoredValue = this.temporada;

    this.teamService
      .getTeamByPlayer(this.userId.toString(), this.temporadaStoredValue)
      .subscribe(
        (response: Response) => {
          if (response.data !== null) {
            this.listHijos = response.data;
            this.datosCargados = true;

            let goToDatos = false;
            let teamId = 0;
            for (let a = 0; a < this.listHijos.length; a++) {
              if (this.listHijos[a].apellido == null) {
                goToDatos = true;
                teamId = this.listHijos[a].teamId;
                break;
              }
            }

            if (goToDatos) {
              this.router.navigate(['/dashboard/jugadores', teamId]);
            }
          } else {
            console.error(
              'La respuesta del servicio no tiene la estructura esperada',
              response
            );
          }
        },
        (error) => {
          console.error('Error al cargar el listado de equipos', error);
        }
      );

  }

  cargarListadoEquiposForClub(): void {
    localStorage.setItem('temporada', this.temporada);
    this.temporadaStoredValue = this.temporada;

    if (isDemoMode()) {
      const demoData = DemoDataService.getDemoTeamByClubResponse();
      this.clubId = demoData.club?.clubId ?? 9001;
      this.pictureClub = demoData.club?.picture ?? 'demo-club-logo.png';
      this.noPicture = true;
      this.listTeam = demoData.teams ?? [];
      this.checkSuscripcion();
      return;
    }

    const cached = this.teamService.getEquiposCache(this.userId, this.temporadaStoredValue, this.profileId);
    if (cached && cached.listTeam.length > 0) {
      this.applyEquiposCache(cached);
      this.datosCargando = false;
      this.datosCargados = true;
    }

    this.teamService
      .getTeamByClub(this.userId.toString(), this.temporadaStoredValue)
      .subscribe({
        next: (response: Response) => {
          if (response?.data) {
            this.clubId = response.data.club?.clubId ?? 0;
            if (response.data.club?.picture != null) {
              this.pictureClub = response.data.club.picture;
              this.noPicture = true;
            }
            this.listTeam = Array.isArray(response.data.teams) ? response.data.teams : [];
            this.teamService.setEquiposCache(this.userId, this.temporadaStoredValue, this.profileId, {
              listTeam: this.listTeam,
              pictureClub: this.pictureClub,
              noPicture: this.noPicture,
              clubId: this.clubId,
            });
          } else {
            this.listTeam = [];
          }
          this.checkSuscripcion();
        },
        error: (error) => {
          console.error('Error al cargar el listado de equipos', error);
          this.datosCargando = false;
          this.listTeam = [];
          this.checkSuscripcion();
        },
      });
  }

  // Método para cargar el listado de clubes
  cargarListadoClubes(): void {
    this.clubService.getAllClubsRegistered().subscribe(
      (response: Response) => {
        if (response.data.length > 0) {
          this.clubList = response.data;
        }
      },
      (error) => {
        console.error('Error al cargar el listado de clubes', error);
      }
    );
  }

  cerrarSesion(): void {
    // Llama al método cerrarSesion del servicio
    this.loginService.cerrarSesion();
  }

  verPerfil() { }

  // Método para abrir el modal de creación de equipo
  abrirModalCrearEquipo(): void {
    this.obtenerCategorias();
    let accessSusOk = false;
    //revisar el numero de equipos que hay y puede tener
    if (this.profileId === 2) {
      //comparar con el numero exacto
      if (this.listTeam.length < this.numEquipos) {
        accessSusOk = true;
      }
    } else if (this.profileId === 1) {
      //comparar con uno menos ya que estara el Sin Equipo
      if (this.listTeam.length < this.numEquipos + 1) {
        accessSusOk = true;
      }
    }

    if (!accessSusOk) {
      this.confirmationService.confirm({
        titleKey: 'EQUIPOS.SUBSCRIPTION_REQUIRED_TITLE',
        messageKey: 'EQUIPOS.SUBSCRIPTION_REQUIRED_MESSAGE',
        confirmKey: 'EQUIPOS.GO_TO_SUBSCRIPTION',
        cancelKey: 'COMMON.CANCEL',
        confirmStyle: 'warn'
      }).subscribe(confirmed => {
        if (confirmed) {
          this.router.navigate(['/dashboard/suscripcion', this.userId]);
        }
      });
    } else {
      this.showModal = true;
    }
  }

  // Método para cerrar el modal de creación de equipo
  cerrarModal(): void {
    this.showModal = false;
    // Limpiar los datos del nuevo equipo al cerrar el modal si es necesario
    this.teamNew = new TeamNew();
    this.crearEquipoForm.get('categoriaNombre')?.reset();
    this.crearEquipoForm.get('levelLeague')?.reset();
    this.categoriaNivel = '';
  }

  // Método para crear un nuevo equipo
  crearEquipo(): void {
    if (this.crearEquipoForm.valid) {
      if (this.selectedCategoriaId != null && this.selectedCategoriaId != 0) {
        // Recoge los campos del modal y asigna al objeto nuevoEquipo
        this.teamNew = {
          teamId: 0, // O el valor por defecto que desees para teamId
          levelLeague: this.crearEquipoForm.value.levelLeague || '',
          name: this.crearEquipoForm.value.name || '',
          objectiveTeam: this.crearEquipoForm.value.objectiveTeam || '',
          opinionTeam: this.crearEquipoForm.value.opinionTeam || '',
          trainingDays: this.crearEquipoForm.value.trainingDays || '',
          categoryType: {
            categoryTypeId: this.selectedCategoriaId!,
            year: 0,
            categoryName: '',
          },
          clubId: this.clubId || 0,
          userId: 0,
          temporada: this.temporadaStoredValue, //TODO aqui debe de coger el año de la temporada actual
          dateCreate: '',
          dateUpdate: '',
        };

        // Llamada al servicio para crear el equipo
        this.teamService.createUpdateTeam(this.userId, this.teamNew).subscribe(
          (resp) => {
            // Manejar la respuesta según tus necesidades
            //console.log('Equipo creado con éxito:', response);

            // Cargar nuevamente el listado de equipos después de la creación exitosa
            //this.cargarListadoEquipos();
            const newTeam = {
              category: this.categoriaNombre,
              levelLeague: this.categoriaNivel,
              name: resp.data.name,
              teamId: resp.data.teamId,
            };
            this.listTeam.push(newTeam);
            this.applyFilters();
            this.teamService.setEquiposCache(this.userId, this.temporadaStoredValue, this.profileId, {
              listTeam: this.listTeam,
            });

            // Cerrar el modal después de crear el equipo
            this.cerrarModal();
          },
          (error) => {
            console.error('Error al crear el equipo:', error);
            // Puedes manejar el error según tus necesidades
          }
        );
      } else {
        this.notificationService.warning('EQUIPOS.SELECT_CATEGORY_FIRST');
        return;
      }
    }
  }

  // Método para confirmar la eliminación del equipo
  confirmarEliminarEquipo(team: any, index: number): void {
    let name = [team.category, team.levelLeague, team.name].filter(Boolean).join(' ');
    
    this.confirmationService.confirm({
      titleKey: 'EQUIPOS.DELETE_TEAM_TITLE',
      message: this.translate.instant('EQUIPOS.DELETE_TEAM_MESSAGE', { name }),
      confirmKey: 'ACTIONS.DELETE',
      cancelKey: 'COMMON.CANCEL',
      confirmStyle: 'warn'
    }).subscribe(confirmed => {
      if (confirmed) {
        // Llama al método para eliminar el equipo
        this.eliminarEquipo(team.teamId, index);
      }
    });
  }

  // Método para eliminar el equipo
  eliminarEquipo(teamId: number, index: number): void {
    //hacemos un borrado logico
    this.teamService.deleteLogicTeam(teamId.toString()).subscribe(
      (response) => {
        console.log('Equipo eliminado con éxito:', response);
        this.listTeam.splice(index, 1);
        this.teamService.setEquiposCache(this.userId, this.temporadaStoredValue, this.profileId, {
          listTeam: this.listTeam,
        });
        this.notificationService.success('EQUIPOS.TEAM_DELETED_SUCCESS');
      },
      (error) => {
        console.error('Error al eliminar el equipo:', error);
        this.notificationService.error('EQUIPOS.TEAM_DELETED_ERROR');
      }
    );
  }

  // Método para navegar a la pantalla de calendario
  navegarACalendario(teamId: number, playerId: number): void {
    const team = this.filteredTeams?.find((t: any) => t.teamId === teamId);
    if (team?.sport) {
      this.sportContextService.setSport(team.sport);
    }
    switch (this.profileId) {
      case 0:
      case 1:
        this.router.navigate(['/dashboard/menu-club', teamId]);
        break;
      case 2:
        this.router.navigate(['/dashboard/menu-entrenador', teamId, playerId]);
        break;
    }
  }

  // Método para navegar a la pantalla de calendario
  navegarAOpcionesJugador(teamId: number, playerId: number): void {
    // Puedes ajustar la ruta según tu estructura de rutas
    this.router.navigate(['/dashboard/opcionesjugador', teamId, playerId]);
  }

  navegarAScouting(playerId: number): void {
    // Puedes ajustar la ruta según tu estructura de rutas
    this.router.navigate(['/dashboard/scouting-player', playerId]);
  }

  irAPantalla(id: number): void {
    switch (id) {
      case 1:
        const msg =
          'Este apartado de "Cuotas" está obsoleto, solo está disponible para que ' +
          'aquellos clubs que lo hayan usado previamente puedan visualizar sus datos, por favor, ' +
          'accede al nuevo apartado "New Cuotas" para llevar un registro de tus pagos';
        this.router.navigate(['/dashboard/contabilidad', this.clubId]);
        break;
      case 2:
        this.router.navigate(['/dashboard/ropa', this.clubId]);
        break;
      case 3:
        this.router.navigate(['/dashboard/cuadro-de-mandos', this.clubId]);
        break;
      case 4:
        this.router.navigate(['/dashboard/patrocinadores', this.clubId]);
        break;
      case 5:
        this.router.navigate(['/dashboard/notificaciones', this.clubId]);
        break;
      case 6:
        this.router.navigate(['/dashboard/documentos-club', this.clubId]);
        break;
      case 7:
        this.router.navigate(['/dashboard/new-cuotas', this.clubId]);
        break;
      case 8:
        this.router.navigate(['/dashboard/inicio']);
        break;
      case 9:
        this.router.navigate(['/dashboard/inicio']);
        break;
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file.name.endsWith('.xlsx')) {
        this.fileName = file.name;
        this.selectedFile = file;
        this.showUploadButton = true;
        this.excelForm.patchValue({
          excelFile: file,
        });
      } else {
        this.fileName = null;
        this.selectedFile = null;
        this.showUploadButton = false;
        this.notificationService.warning('EQUIPOS.SELECT_XLSX_FILE');
      }
    }
  }

  uploadExcel(): void {
    if (this.excelForm.valid && this.selectedFile) {
      const formData = new FormData();
      formData.append('excelFile', this.selectedFile);

      this.clubService.uploadExcel(this.clubId, this.selectedFile).subscribe(
        (response: Response) => {
          console.log('Archivo subido con éxito', response);
          // Aquí puedes manejar la respuesta del servidor
          this.showModalSubirJugadores = false;
          this.notificationService.success('EQUIPOS.PLAYERS_UPLOADED_SUCCESS');
          //this.router.navigate(['/dashboard/inicio']);
        },
        (error) => {
          console.error('Error al subir el archivo', error);
          // Aquí puedes manejar el error
        }
      );

      console.log('Archivo cargado:', this.selectedFile);
    } else {
      console.error('Formulario inválido o archivo no seleccionado');
    }
  }

  uploadExcelGesDesk(): void {
    if (this.excelForm.valid && this.selectedFile) {
      const formData = new FormData();
      formData.append('excelFile', this.selectedFile);

      this.clubService
        .uploadExcelGesDesk(this.clubId, this.selectedFile)
        .subscribe(
          (response: Response) => {
            console.log('Archivo subido con éxito', response);
            // Aquí puedes manejar la respuesta del servidor
            this.showModalSubirJugadores = false;
            this.notificationService.success('EQUIPOS.PLAYERS_UPLOADED_SUCCESS');
            //this.router.navigate(['/dashboard/inicio']);
          },
          (error) => {
            console.error('Error al subir el archivo', error);
            // Aquí puedes manejar el error
          }
        );

      console.log('Archivo cargado:', this.selectedFile);
    } else {
      console.error('Formulario inválido o archivo no seleccionado');
    }
  }

  openModalSubirJugadores() {
    this.showModalSubirJugadores = true;
  }

  cerrarModalSubirJugadores() {
    this.showModalSubirJugadores = false;
  }

  openModalSubirJugadoresGesDesk() {
    this.showModalSubirJugadoresGesDesk = true;
  }

  cerrarModalSubirJugadoresGesDesk() {
    this.showModalSubirJugadoresGesDesk = false;
  }

  goSuscripcion() {
    this.showModal = false;
    this.router.navigate(['/dashboard/suscripcion', this.userId]);
  }

  cerrarAlertaAndroid(): void {
    this.showAlertAndroid = false;
  }

  onInputCategoria(event: Event): void {
    const value = (event.target as HTMLInputElement).value;

    if (value.length >= 4) {
      // Lógica para buscar categorías
      console.log('Buscando categorías con:', value);
      this.categoriaNombre = value;
      this.buscarCategorias(value);
    } else {
      //this.categoriasFiltradas = [];
      this.mostrarDropdown = false;
    }
  }

  buscarCategorias(nombre: string): void {
    this.categoriasFiltradas = this.categoriasLista.filter((cat) =>
      cat.categoryName.toLowerCase().includes(nombre.toLowerCase())
    );
    this.mostrarDropdown = true;

    // Aquí harías la llamada real al backend, por ahora lo simulamos:
    /*this.categoriasFiltradas = [
      { id: 1, text: 'Cadete' },
      { id: 2, text: 'Juvenil' }
    ].filter(cat => cat.text.toLowerCase().includes(nombre.toLowerCase()));*/
  }

  onInputNivel(event: Event): void {
    const value = (event.target as HTMLInputElement).value;

    if (value.length >= 4) {
      // Lógica para buscar categorías
      console.log('Buscando niveles con:', value);
      this.categoriaNivel = value;
      this.buscarNivel(value);
    } else {
      //this.categoriasFiltradas = [];
      this.mostrarDropdown2 = false;
    }
  }

  buscarNivel(nombre: string): void {
    this.nivelesVisiblesFiltradas = this.nivelesVisibles.filter((n) =>
      n.label.toLowerCase().includes(nombre.toLowerCase())
    );
    this.mostrarDropdown2 = true;
  }

  seleccionarCategoria(cat: {
    categoryTypeId: number;
    categoryName: string;
  }): void {
    this.categoriaNombre = cat.categoryName;
    this.selectedCategoriaId = cat.categoryTypeId;
    this.mostrarDropdown = false;
    this.crearEquipoForm.get('categoriaNombre')?.setValue(this.categoriaNombre);
  }

  seleccionarNivel(nivel: any): void {
    this.categoriaNivel = nivel;
    this.crearEquipoForm.get('levelLeague')?.setValue(this.categoriaNivel);
  }

  crearCategoria(nombre: string): void {
    if (!nombre.trim()) return;

    // Aquí iría tu llamada real al backend:
    const dto = { categoryTypeId: 0, categoryName: nombre, year: 0 };

    this.clubService.updateCreateCategoryType(dto).subscribe({
      next: (res) => {
        this.selectedCategoriaId = res.data.categoryTypeId;
        this.categoriaNombre = dto.categoryName;
        this.mostrarDropdown = false;
        // Opcionalmente: podrías añadirla a la lista si la quieres mostrar después
        this.categoriasFiltradas.unshift(res.data);
      },
      error: (err) => {
        console.error(err);
        this.notificationService.error('EQUIPOS.UPLOAD_ERROR');
      },
    });
  }

  /**
   * Nombre completo del equipo para mostrar: "Nombre - Liga" (liga a la que pertenece).
   * Si no hay liga, solo el nombre del equipo.
   */
  getTeamFullName(team: any): string {
    const namePart = (team?.name ?? team?.nameTeam ?? team?.category ?? '').toString().trim();
    const leaguePart = (team?.levelLeague ?? '').toString().trim();
    if (leaguePart) {
      return namePart ? `${namePart} - ${leaguePart}` : leaguePart;
    }
    return namePart || (team?.category ?? '');
  }

  getCategoryIcon(category: string | null | undefined): string {
    const cat = (category ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Senior / profesional
    if (/senior|sénior/.test(cat))           return 'assets/iconos/entrenador.svg';

    // Juvenil
    if (/juvenil|juvenile|junior/.test(cat)) return 'assets/iconos/jugador-de-futbol.svg';

    // Cadete / Cadet / Infantil (S13, S14, S15, S16...)
    if (/cadete|cadet|infantil/.test(cat))   return 'assets/iconos/jugador-de-futbol.svg';

    // Alevín / Aleví
    if (/alevin|alevi/.test(cat))            return 'assets/iconos/balon-de-futbol.svg';

    // Benjamín / Benjamí
    if (/benjamin|benjami/.test(cat))        return 'assets/iconos/balon-de-futbol.svg';

    // Prebenjamín / Prebenjamí
    if (/prebenjamin|prebenjami/.test(cat))  return 'assets/iconos/balon-de-futbol.svg';

    // Debutante / Lúdica
    if (/debutante|ludica|ludic/.test(cat))  return 'assets/iconos/balon-de-futbol.svg';

    // Por defecto: escudo genérico
    return 'assets/iconos/divisa.svg';
  }

  dropTeam(event: CdkDragDrop<any[]>) {
    moveItemInArray(this.listTeam, event.previousIndex, event.currentIndex);
  }

  crearNivel(nombre: string): void {
    if (!nombre.trim()) return;
    this.seleccionarNivel(nombre);
  }

  ocultarDropdownConRetraso(): void {
    setTimeout(() => {
      this.mostrarDropdown = false;
    }, 200);
  }

  ocultarDropdownConRetrasoNivel(): void {
    setTimeout(() => {
      this.mostrarDropdown2 = false;
    }, 200);
  }

  obtenerCategorias() {
    this.categoriasFiltradas = [];
    this.crearEquipoForm.get('categoriaNombre')?.reset();
    this.categoriaNombre = '';
    this.clubService.getListCategorias().subscribe(
      (response: Response) => {
        this.categoriasLista = response.data;
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  openSuscriptionModal(option: number): void {
    this.optionTienda = option;
    this.aceptoGestionNavegador = false;
    this.modalConfirAndroid = true;
  }

  onAceptarDescarga(): void {
    if (!this.aceptoGestionNavegador) {
      this.notificationService.warning('EQUIPOS.ACCEPT_BROWSER_MANAGEMENT');
      return;
    }
    // Cierra el modal y abre la Store
    this.modalConfirAndroid = false;
    if (this.optionTienda == 1)
      //1 es android y 2 iphone
      window.open(this.playStore, '_blank');
    else window.open(this.appStoreUrl, '_blank');
  }

  closeModalConfirAndroid() {
    this.modalConfirAndroid = false;
  }
}
