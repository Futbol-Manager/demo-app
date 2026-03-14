import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, Renderer2, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBarConfig } from '@angular/material/snack-bar';
import { Router, NavigationEnd } from '@angular/router';
import { BehaviorSubject, Subject, fromEvent } from 'rxjs';
import { interval } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import {
  GenreTypeModel,
  ProfileTypeModel,
  RegisterModel,
  ValidationUserModel,
} from 'src/app/core/models/users/register.model';
import { User } from 'src/app/core/models/users/user.model';
import { LoginService } from 'src/app/core/services/login/login.service';
import { RegisterService } from 'src/app/core/services/register/register.service';
import { TrainingService } from 'src/app/core/services/training/training.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { ThemeService } from 'src/app/core/services/theme/theme.service';
import { SugerenciaService } from 'src/app/core/services/sugerencia/sugerencia.service';
import { AiChatService } from 'src/app/core/services/ai-chat/ai-chat.service';
import { ClubService } from 'src/app/core/services/club/club.service';
import { environment } from 'src/environments/environment';
import { isDemoMode } from 'src/app/core/services/demo/demo-mode';
import { Dropdown } from 'bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { Response } from 'src/app/core/services/models/response.model';
import { getCurrentSeasonString } from 'src/app/core/utils/season.utils';
import { InactivityService } from 'src/app/core/services/inactivity/inactivity.service';
import { TutorialService } from 'src/app/core/services/tutorial/tutorial.service';

/** Intervalo en ms para refrescar listado y contador de notificaciones */
const NOTIFICATIONS_POLL_INTERVAL_MS = 45_000;

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  isDarkMode: boolean = false;
  coachBelongsToClub = false;
  usuarioActual!: User | null;
  userForm: FormGroup = this.formBuilder.group({
    pictureUser: [''],
    firstName: [''],
    secondName: [''],
    mail: [''],
    birthdate: [''],
    genreType: [''],
    mobile: [''],
  });

  private usuarioAutenticado: BehaviorSubject<User | null> =
    new BehaviorSubject<User | null>(null);
  // Variable para controlar la visibilidad del modal
  showModal: boolean = false;

  nameUser: string = '';
  imgUser: string = '';
  mobile: string = '';
  selectedFile: File | null = null;
  imagePreviewUrl: string | ArrayBuffer | null = null;
  uploadedImageUrl: string | null = null; // Almacena la URL de la imagen subida
  showPreview: boolean = false;

  showbtnupimg = false;
  uploadingPhoto = false;
  userId: number = 0;
  profileId = 0;
  idValidation = 1;
  imageBaseUrl: string = environment.images + 'user/';

  /** URL del avatar para mostrar: en demo usa assets (demo-club-logo, demo-coach-avatar, demo-player-avatar). */
  getDisplayAvatarUrl(): string {
    if ((environment as { demo?: boolean }).demo) {
      const name = this.imgUser || (this.profileId === 1 ? 'demo-club-logo.png' : this.profileId === 2 ? 'demo-coach-avatar.svg' : 'demo-player-avatar.svg');
      return 'assets/images/user/' + name;
    }
    if (!this.imgUser) return '';
    if (this.imgUser.startsWith('http') || this.imgUser.startsWith('/')) return this.imgUser;
    return this.imageBaseUrl + this.imgUser;
  }

  showModalIdioma = false;
  selectedLang: string = 'es';

  showPasswordSection = false;
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  passwordError = '';
  passwordSuccess = '';
  savingPassword = false;
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  unreadSugerencias = 0;
  unreadSugerenciasUser = 0;
  unreadHeaderNotifications = 0;
  headerNotifications: Array<{
    correoRecibidoId: number;
    asunto: string;
    remitente: string;
    fechaCreate: string;
    leido: number;
    previewText: string;
  }> = [];
  expandedNotificationId: number | null = null;
  loadingPreviewId: number | null = null;

  // Coach trial banner
  coachTrialActive = false;

  /** Tutorial: screenId según la ruta actual (dashboard-inicio | cuadro-de-mandos) */
  currentTutorialScreenId: string = 'dashboard-inicio';

  // Theme animation
  themeAnimating = false;

  // Notification modal
  showNotificationModal = false;
  modalNotification: { correoRecibidoId: number; asunto: string; remitente: string; fechaCreate: string; leido: number; previewText: string } | null = null;
  loadingModalBody = false;
  modalBodyText = '';

  // Detección de dispositivo y modal de descarga
  isAndroid = false;
  isiOS = false;
  isDesktop = true;
  showDownloadModal = false;
  downloadModalPlatform: 'android' | 'ios' = 'android';

  linkCopied = false;

  get isDemoMode(): boolean {
    return !!isDemoMode();
  }

  readonly playStoreUrl = 'https://play.google.com/store/apps/details?id=com.futbol.sphairatech&pcampaignid=web_share';
  readonly appStoreUrl = 'https://apps.apple.com/es/app/sphaira-tech/id6745791142';

  constructor(
    private router: Router,
    private loginService: LoginService,
    private dialog: MatDialog,
    private registerService: RegisterService,
    private formBuilder: FormBuilder,
    private renderer: Renderer2,
    private elementRef: ElementRef,
    private trainingService: TrainingService,
    private teamService: TeamService,
    private translate: TranslateService,
    public themeService: ThemeService,
    private sugerenciaService: SugerenciaService,
    private aiChatService: AiChatService,
    private clubService: ClubService,
    private cdr: ChangeDetectorRef,
    public inactivityService: InactivityService,
    private tutorialService: TutorialService,
  ) {
    const lang = localStorage.getItem('lang');
    if (lang) {
      this.selectedLang = lang;
    }
    // Sync isDarkMode with ThemeService
    this.themeService.mode$.subscribe(mode => {
      this.isDarkMode = mode === 'dark';
    });
  }

  ngOnInit(): void {
    this.inactivityService.start();
    this.detectDevice();
    this.updateTutorialScreenIdFromRoute(this.router.url);
    this.router.events.pipe(takeUntil(this.destroy$)).subscribe(e => {
      if (e instanceof NavigationEnd) this.updateTutorialScreenIdFromRoute(e.urlAfterRedirects || e.url);
    });
    this.loginService.usuarioActual.subscribe((user: User | null) => {
      this.usuarioActual = user;
      this.profileId = this.usuarioActual!.profileType.profileId;
      this.idValidation = this.usuarioActual!.idValidation;
      this.nameUser = user !== null ? user.firstName : '';
      this.userId = user !== null ? user.userId : 0;
      this.imgUser = user !== null ? user.pictureUser : '';
      this.mobile = user !== null ? user.mobile : '';

      // Override admin: userId=9 siempre se comporta como Coach (profileId 2)
      if (this.userId === 9 && this.profileId !== 1 && this.profileId !== 2) {
        this.profileId = 2;
      }

      this.updateForm(); // Actualiza el formulario cuando cambia el usuario actual

      // Si es Coach (profileId === 2), comprobamos si pertenece a un club
      if (this.profileId === 2 && this.userId > 0) {
        this.checkCoachBelongsToClub();
      }

      // Cargar sugerencias no leidas para el admin
      if (this.userId === 9) {
        this.loadUnreadSugerencias();
      }

      // Cargar respuestas no leídas de sugerencias para el usuario normal
      if (this.userId > 0 && this.userId !== 9) {
        this.loadUnreadSugerenciasUser();
        this.loadHeaderNotifications();
      }

      // Recalcular tutorial de inicio por rol: en /dashboard/inicio el screenId depende de profileId
      this.updateTutorialScreenIdFromRoute(this.router.url);
      this.cdr.markForCheck();
    });

    // Actualizar listado y contador de notificaciones cada cierto tiempo
    interval(NOTIFICATIONS_POLL_INTERVAL_MS)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.userId > 0 && this.userId !== 9 && this.canShowUserNotificationsBell()) {
          this.loadHeaderNotifications();
        }
      });

    // Al volver a la pestaña, verificar que la sesión siga válida; si el token expiró (401), el interceptor cierra sesión
    fromEvent(document, 'visibilitychange')
      .pipe(
        takeUntil(this.destroy$),
        filter(() => document.visibilityState === 'visible')
      )
      .subscribe(() => {
        if (this.userId > 0) {
          this.registerService.getUserById(this.userId).subscribe({ error: () => {} });
        }
      });
  }

  ngOnDestroy(): void {
    this.inactivityService.stop();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Actualiza el screenId del tutorial según la URL (para mostrar el tutorial de la pantalla actual). */
  private updateTutorialScreenIdFromRoute(url: string): void {
    if (url.includes('info-jugadores')) {
      this.currentTutorialScreenId = 'info-jugadores';
    } else if (url.includes('info-entrenadores')) {
      this.currentTutorialScreenId = 'info-entrenadores';
    } else if (url.includes('estadisticas-jugadores-club')) {
      this.currentTutorialScreenId = 'estadisticas-jugadores-club';
    } else if (url.includes('estadisticas-equipos-club')) {
      this.currentTutorialScreenId = 'estadisticas-equipos-club';
    } else if (url.includes('informacion_equipo') && url.includes('asistencia')) {
      this.currentTutorialScreenId = 'asistencia';
    } else if (url.includes('informacion_equipo')) {
      this.currentTutorialScreenId = 'informacion-equipo';
    } else if (url.includes('estadisticas_equipo')) {
      this.currentTutorialScreenId = 'estadisticas-equipo';
    } else if (url.includes('estadisticas_jugadores')) {
      this.currentTutorialScreenId = 'estadisticas-jugadores';
    } else if (url.includes('/jugador/')) {
      this.currentTutorialScreenId = 'jugador';
    } else if (url.includes('/jugadores/') || (url.includes('jugadores') && !url.includes('estadisticas_jugadores') && !url.includes('info-jugadores'))) {
      this.currentTutorialScreenId = 'jugadores';
    } else if (url.includes('calendario-club')) {
      this.currentTutorialScreenId = 'calendario-club';
    } else if (url.includes('calendario')) {
      this.currentTutorialScreenId = 'calendario';
    } else if (url.includes('tactical-board')) {
      this.currentTutorialScreenId = 'tactical-board';
    } else if (url.includes('tareas-catalog')) {
      this.currentTutorialScreenId = 'tareas-catalog';
    } else if (url.includes('tareas-historial')) {
      this.currentTutorialScreenId = 'tareas-historial';
    } else if (url.includes('tareas-favoritas')) {
      this.currentTutorialScreenId = 'tareas-favoritas';
    } else if (url.includes('tareas-mis')) {
      this.currentTutorialScreenId = 'tareas-mis';
    } else if (url.includes('tareas')) {
      this.currentTutorialScreenId = 'tareas';
    } else if (url.includes('menu-club')) {
      this.currentTutorialScreenId = 'menu-club';
    } else if (url.includes('menu-fisio')) {
      this.currentTutorialScreenId = 'menu-fisio';
    } else if (url.includes('menu-entrenador')) {
      this.currentTutorialScreenId = 'menu-entrenador';
    } else if (url.includes('perfil-entrenador')) {
      this.currentTutorialScreenId = 'perfil-entrenador';
    } else if (url.includes('documentos-entrenador')) {
      this.currentTutorialScreenId = 'documentos-entrenador';
    } else if (url.includes('documentos-jugador')) {
      this.currentTutorialScreenId = 'documentos-jugador';
    } else if (url.includes('scouting-player-profile')) {
      this.currentTutorialScreenId = 'scouting-player-profile';
    } else if (url.includes('scouting-player')) {
      this.currentTutorialScreenId = 'scouting-player';
    } else if (url.includes('opcionesjugador')) {
      this.currentTutorialScreenId = 'opcionesjugador';
    } else if (url.includes('cuadro-de-mandos')) {
      this.currentTutorialScreenId = 'cuadro-de-mandos';
    } else if (url.includes('erp')) {
      this.currentTutorialScreenId = 'erp';
    } else if (url.includes('entrenadores') && !url.includes('info-entrenadores')) {
      this.currentTutorialScreenId = 'entrenadores';
    } else if (url.includes('equipos')) {
      this.currentTutorialScreenId = 'equipos';
    } else if (url.includes('documentos-club')) {
      this.currentTutorialScreenId = 'documentos-club';
    } else if (url.includes('new-cuotas')) {
      this.currentTutorialScreenId = 'new-cuotas';
    } else if (url.includes('cuotas')) {
      this.currentTutorialScreenId = 'cuotas';
    } else if (url.includes('ropa-jugador')) {
      this.currentTutorialScreenId = 'ropa-jugador';
    } else if (url.includes('ropa')) {
      this.currentTutorialScreenId = 'ropa';
    } else if (url.includes('patrocinadores-usuario')) {
      this.currentTutorialScreenId = 'patrocinadores-usuario';
    } else if (url.includes('patrocinadores')) {
      this.currentTutorialScreenId = 'patrocinadores';
    } else if (url.includes('notificaciones-federacion')) {
      this.currentTutorialScreenId = 'dashboard-inicio';
    } else if (url.includes('notificaciones')) {
      this.currentTutorialScreenId = 'notificaciones';
    } else if (url.includes('staff-club')) {
      this.currentTutorialScreenId = 'staff-club';
    } else if (url.includes('scouting-club')) {
      this.currentTutorialScreenId = 'scouting-club';
    } else if (url.includes('club-videos')) {
      this.currentTutorialScreenId = 'club-videos';
    } else if (url.includes('video-analysis')) {
      this.currentTutorialScreenId = 'video-analysis';
    } else if (url.includes('clasificacion-resultados')) {
      this.currentTutorialScreenId = 'clasificacion-resultados';
    } else if (url.includes('partidos-entrevistas')) {
      this.currentTutorialScreenId = 'partidos-entrevistas';
    } else if (url.includes('lesiones-club')) {
      this.currentTutorialScreenId = 'dashboard-inicio';
    } else if (url.includes('lesiones') && url.includes('playerId=')) {
      this.currentTutorialScreenId = 'lesiones-jugador';
    } else if (url.includes('lesiones')) {
      this.currentTutorialScreenId = 'lesiones';
    } else if (url.includes('asistente-ia-coach')) {
      this.currentTutorialScreenId = 'asistente-ia-coach';
    } else if (url.includes('debrief/templates')) {
      this.currentTutorialScreenId = 'debrief-templates';
    } else if (url.includes('debrief/training')) {
      this.currentTutorialScreenId = 'debrief-training';
    } else if (url.includes('debrief/match')) {
      this.currentTutorialScreenId = 'debrief-match';
    } else if (url.includes('debrief/history') || url.includes('debrief/history/')) {
      this.currentTutorialScreenId = 'debrief-history';
    } else if (url.includes('debrief/report')) {
      this.currentTutorialScreenId = 'debrief-report';
    } else if (url.includes('contabilidad')) {
      this.currentTutorialScreenId = 'contabilidad';
    } else if (url.includes('historial-pagos-club')) {
      this.currentTutorialScreenId = 'historial-pagos-club';
    } else if (url.includes('abonados')) {
      this.currentTutorialScreenId = 'abonados';
    } else if (url.includes('listado-clubes')) {
      this.currentTutorialScreenId = 'dashboard-inicio';
    } else if (url.includes('sugerencias-club')) {
      this.currentTutorialScreenId = 'sugerencias-club';
    } else if (url.includes('coach-suscripcion-success')) {
      this.currentTutorialScreenId = 'coach-suscripcion-success';
    } else if (url.includes('suscripcion-coach')) {
      this.currentTutorialScreenId = 'suscripcion-coach';
    } else if (url.includes('suscripcion-club/wizard')) {
      this.currentTutorialScreenId = 'suscripcion-club-wizard';
    } else if (url.includes('suscripcion-club')) {
      this.currentTutorialScreenId = 'suscripcion-club';
    } else if (url.includes('individual-training')) {
      this.currentTutorialScreenId = 'individual-training';
    } else if (url.includes('inicio-deportes')) {
      this.currentTutorialScreenId = 'inicio-deportes';
    } else if (url.includes('suscripcion/') && !url.includes('suscripcion-club')) {
      this.currentTutorialScreenId = 'suscripcion';
    } else if (url.includes('asistente-ia')) {
      this.currentTutorialScreenId = 'asistente-ia';
    } else {
      // Dashboard inicio: tutorial según tipo de usuario (club / coach / player)
      const pid = this.profileId;
      if (pid === 2 || pid === 6 || pid === 7) {
        this.currentTutorialScreenId = 'dashboard-inicio-coach';
      } else if (pid === 3) {
        this.currentTutorialScreenId = 'dashboard-inicio-player';
      } else {
        this.currentTutorialScreenId = 'dashboard-inicio';
      }
    }
    this.cdr.markForCheck();
  }

  /** Abre el tutorial de la pantalla actual. */
  openTutorial(): void {
    this.tutorialService.start(this.currentTutorialScreenId, true);
  }

  /**
   * Comprueba si el entrenador pertenece a un club.
   * Si el servicio devuelve un clubId > 0, el coach pertenece a un club
   * y NO debe ver la suscripción del coach.
   */
  private checkCoachBelongsToClub(): void {
    this.teamService.getTeamByClub(this.userId.toString(), getCurrentSeasonString()).subscribe({
      next: (response: Response) => {
        const clubId = response.data?.club?.clubId ?? 0;
        this.coachBelongsToClub = clubId > 0;
        if (!this.coachBelongsToClub) {
          this.checkCoachTrialStatus();
        }
      },
      error: () => {
        this.coachBelongsToClub = false;
        this.checkCoachTrialStatus();
      }
    });
  }

  private checkCoachTrialStatus(): void {
    this.teamService.getEstadoSuscripcion(this.userId, 2).subscribe({
      next: (res: any) => {
        const status = res?.data ?? 0;
        // status = 1 means trial active (no subscription, within 3 days of registration)
        // status = 0 means trial expired (guard will redirect)
        // status > 1 means active subscription
        this.coachTrialActive = status === 1;
      },
      error: () => { this.coachTrialActive = false; }
    });
  }

  goToCoachSubscription(): void {
    this.router.navigate(['/dashboard/suscripcion-coach']);
  }

  private loadUnreadSugerencias(): void {
    this.sugerenciaService.countUnread().subscribe({
      next: (response: Response) => {
        this.unreadSugerencias = response?.data ?? 0;
      },
      error: () => {
        this.unreadSugerencias = 0;
      }
    });
  }

  private loadUnreadSugerenciasUser(): void {
    this.sugerenciaService.countUnreadResponsesUser(this.userId).subscribe({
      next: (response: Response) => {
        this.unreadSugerenciasUser = response?.data ?? 0;
      },
      error: () => {
        this.unreadSugerenciasUser = 0;
      }
    });
  }

  private loadHeaderNotifications(): void {
    if (!this.canShowUserNotificationsBell() || this.userId <= 0) {
      this.unreadHeaderNotifications = 0;
      this.headerNotifications = [];
      return;
    }
    this.clubService.getListCorreos(this.userId).subscribe({
      next: (response: Response) => {
        const recibidos = response?.data?.recibidos ?? [];
        const sorted = [...recibidos].sort((a: any, b: any) =>
          new Date(b.fechaCreate || 0).getTime() - new Date(a.fechaCreate || 0).getTime()
        );
        this.unreadHeaderNotifications = sorted.filter((m: any) => m.leido === 0).length;
        this.headerNotifications = sorted.slice(0, 5).map((m: any) => ({
          correoRecibidoId: m.correoRecibidoId,
          asunto: m.asunto || this.translate.instant('HEADER.NOTIFICATIONS.NO_SUBJECT'),
          remitente: m.remitente || '',
          fechaCreate: m.fechaCreate || '',
          leido: m.leido ?? 1,
          previewText: this.getPreviewFromBody(m.body)
        }));
      },
      error: () => {
        this.unreadHeaderNotifications = 0;
        this.headerNotifications = [];
      }
    });
  }

  canShowUserNotificationsBell(): boolean {
    if (this.userId === 9) return false;
    return this.profileId === 1 || this.profileId === 2 || this.profileId === 6 || this.profileId === 7 || (this.profileId > 2 && this.profileId < 6);
  }

  goToNotificationsCenter(): void {
    this.router.navigate(['/dashboard/notificaciones-usuario', this.userId]);
  }

  openHeaderNotification(notification: { correoRecibidoId: number; leido: number }): void {
    if (notification?.correoRecibidoId && notification.leido === 0) {
      this.clubService.openCorreoRecibido(notification.correoRecibidoId).subscribe({
        next: () => {
          const idx = this.headerNotifications.findIndex(n => n.correoRecibidoId === notification.correoRecibidoId);
          if (idx !== -1) this.headerNotifications[idx].leido = 1;
          this.unreadHeaderNotifications = Math.max(0, this.unreadHeaderNotifications - 1);
          this.goToNotificationsCenter();
        },
        error: () => this.goToNotificationsCenter()
      });
      return;
    }
    this.goToNotificationsCenter();
  }

  formatHeaderNotificationDate(fechaStr: string): string {
    if (!fechaStr) return '';
    const d = new Date(fechaStr);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  formatNotificationCount(count: number): string {
    if (!count || count <= 0) return '0';
    return count > 99 ? '99+' : `${count}`;
  }

  getPreviewFromBody(body: string | undefined): string {
    if (body == null || typeof body !== 'string') return '';
    let text = body.trim();
    if (!text) return '';
    try {
      if (/^[A-Za-z0-9+/]+=*$/.test(text.replace(/\s/g, '')) && !text.includes('<')) {
        try {
          text = decodeURIComponent(escape(atob(text)));
        } catch (_) {
          text = atob(text);
        }
      }
    } catch (_) { /* no base64 */ }
    if (typeof document !== 'undefined') {
      const div = document.createElement('div');
      div.innerHTML = text;
      text = (div.textContent || div.innerText || '').trim();
    } else {
      text = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }
    const max = 160;
    return text.length <= max ? text : text.slice(0, max) + '…';
  }

  toggleNotificationPreview(id: number): void {
    const isExpanding = this.expandedNotificationId !== id;
    this.expandedNotificationId = isExpanding ? id : null;
    this.loadingPreviewId = null;

    if (isExpanding) {
      const notification = this.headerNotifications.find(n => n.correoRecibidoId === id);
      if (notification && !notification.previewText) {
        this.loadingPreviewId = id;
        this.cdr.markForCheck();
        this.clubService.getCorreoRecibido(id).subscribe({
          next: (response: Response) => {
            const data = response?.data as { body?: string } | null;
            const body = data?.body ?? (typeof response?.data === 'string' ? response.data : '');
            const preview = this.getPreviewFromBody(body);
            const idx = this.headerNotifications.findIndex(n => n.correoRecibidoId === id);
            if (idx !== -1) {
              const list = [...this.headerNotifications];
              list[idx] = { ...list[idx], previewText: preview };
              this.headerNotifications = list;
            }
            if (this.loadingPreviewId === id) this.loadingPreviewId = null;
            this.cdr.markForCheck();
          },
          error: () => {
            this.loadingPreviewId = null;
            this.cdr.markForCheck();
          }
        });
      }
    }
  }

  isNotificationExpanded(id: number): boolean {
    return this.expandedNotificationId === id;
  }

  /** Cierra todos los dropdowns del header (perfil, ayuda, etc.) */
  private cerrarDropdowns(): void {
    document.querySelectorAll('[data-bs-toggle="dropdown"]').forEach(el => {
      const dd = Dropdown.getInstance(el as HTMLElement);
      if (dd) dd.hide();
    });
  }

  openNotificationModal(notification: { correoRecibidoId: number; asunto: string; remitente: string; fechaCreate: string; leido: number; previewText: string }): void {
    this.cerrarDropdowns();

    this.modalNotification = notification;
    this.showNotificationModal = true;
    this.loadingModalBody = true;
    this.modalBodyText = '';

    if (notification.leido === 0) {
      this.clubService.openCorreoRecibido(notification.correoRecibidoId).subscribe({
        next: () => {
          const idx = this.headerNotifications.findIndex(n => n.correoRecibidoId === notification.correoRecibidoId);
          if (idx !== -1) this.headerNotifications[idx].leido = 1;
          this.unreadHeaderNotifications = Math.max(0, this.unreadHeaderNotifications - 1);
        }
      });
    }

    this.clubService.getCorreoRecibido(notification.correoRecibidoId).subscribe({
      next: (response: Response) => {
        const data = response?.data as { body?: string } | null;
        const body = data?.body ?? (typeof response?.data === 'string' ? response.data : '');
        this.modalBodyText = this.getFullBodyText(body);
        this.loadingModalBody = false;
      },
      error: () => { this.loadingModalBody = false; }
    });
  }

  closeNotificationModal(): void {
    this.showNotificationModal = false;
    this.modalNotification = null;
    this.modalBodyText = '';
  }

  getFullBodyText(body: string | undefined): string {
    if (body == null || typeof body !== 'string') return '';
    let text = body.trim();
    if (!text) return '';
    try {
      if (/^[A-Za-z0-9+/]+=*$/.test(text.replace(/\s/g, '')) && !text.includes('<')) {
        try { text = decodeURIComponent(escape(atob(text))); } catch (_) { text = atob(text); }
      }
    } catch (_) {}
    if (typeof document !== 'undefined') {
      const div = document.createElement('div');
      div.innerHTML = text;
      text = (div.textContent || div.innerText || '').trim();
    } else {
      text = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }
    return text;
  }

  goToSugerencias(): void {
    this.router.navigate(['/dashboard/inicio']);
  }

  goToSugerenciasUsuario(): void {
    this.router.navigate(['/dashboard/sugerencias-club']);
  }

  goToAdminClubes(): void {
    this.router.navigate(['/dashboard/inicio']);
  }

  goToAdminSugerencias(): void {
    this.router.navigate(['/dashboard/inicio']);
  }

  goToAdminCharts(): void {
    this.router.navigate(['/dashboard/inicio']);
  }

  goToAdminAiInsights(): void {
    this.router.navigate(['/dashboard/inicio']);
  }

  goToAdminAiUsage(): void {
    this.router.navigate(['/dashboard/inicio']);
  }

  goToAdminRegistros(): void {
    this.router.navigate(['/dashboard/inicio']);
  }

  private detectDevice(): void {
    const ua = navigator.userAgent || navigator.vendor || '';
    this.isAndroid = /android/i.test(ua);
    this.isiOS = /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window);
    this.isDesktop = !this.isAndroid && !this.isiOS;
  }

  getQrUrl(platform: 'android' | 'ios'): string {
    const url = platform === 'android' ? this.playStoreUrl : this.appStoreUrl;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
  }

  openDownloadModal(platform: 'android' | 'ios'): void {
    this.downloadModalPlatform = platform;
    this.showDownloadModal = true;
  }

  closeDownloadModal(): void {
    this.showDownloadModal = false;
    this.linkCopied = false;
  }

  copyDownloadLink(): void {
    const url = this.downloadModalPlatform === 'android' ? this.playStoreUrl : this.appStoreUrl;
    navigator.clipboard.writeText(url).then(() => {
      this.linkCopied = true;
      setTimeout(() => this.linkCopied = false, 2000);
    });
  }

  goToAdminCoaches(): void {
    this.router.navigate(['/dashboard/inicio']);
  }

  goToAdminProspector(): void {
    this.router.navigate(['/dashboard/inicio']);
  }

  goToRrss(): void {
    this.router.navigate(['/dashboard/inicio']);
  }

  ngAfterViewInit() {
    document
      .querySelectorAll('[data-bs-toggle="dropdown"]')
      .forEach((el) => Dropdown.getOrCreateInstance(el as HTMLElement));
  }

  /** Select theme mode */
  selectTheme(mode: 'light' | 'dark'): void {
    this.themeService.setMode(mode);
  }

  /** Toggle between light and dark with animation */
  toggleTheme(): void {
    if (this.themeAnimating) return;
    this.themeAnimating = true;
    const newMode = this.isDarkMode ? 'light' : 'dark';
    this.themeService.setMode(newMode);
    setTimeout(() => { this.themeAnimating = false; }, 550);
  }

  goInicio() {
    this.router.navigate(['/dashboard/inicio']);
  }

  logOut(): void {
    // Llama al método cerrarSesion del servicio
    this.loginService.cerrarSesion();
  }

  saveChanges() {
    if (this.userForm.valid) {
      const today: Date = new Date(
        Date.UTC(
          new Date().getUTCFullYear(),
          new Date().getUTCMonth(),
          new Date().getUTCDate()
        )
      );
      const isoString: string = today.toISOString();
      const dateOnlyString: string = isoString.split('T')[0];
      const genreType: GenreTypeModel = new GenreTypeModel(
        this.userForm.value.genreType,
        this.userForm.value.genreType == 1
          ? 'Masculino'
          : this.userForm.value.genreType == 2
          ? 'Femenino'
          : 'Otro'
      );

      const profileType: ProfileTypeModel = new ProfileTypeModel(
        this.profileId,
        'Entrenador'
      ); //hardcodeado
      const validationUser: ValidationUserModel = new ValidationUserModel(
        this.idValidation,
        'Validado por mail'
      ); //hardcodeado

      const register: RegisterModel = new RegisterModel(
        this.userForm.value.mobile,
        this.userForm.value.comunicaciones,
        profileType,
        this.userForm.value.firstName,
        this.userForm.value.secondName,
        this.userForm.value.birthdate,
        genreType,
        this.userForm.value.mail,
        this.usuarioActual == null ? '' : this.usuarioActual.password,
        this.usuarioActual == null ? 0 : this.usuarioActual.userId,
        this.usuarioActual == null ? 0 : this.usuarioActual.playerId,
        this.usuarioActual == null ? '' : this.usuarioActual.nameSon,
        validationUser,
        this.usuarioActual == null ? '' : this.usuarioActual.pictureUser,
        dateOnlyString
      );
      this.registerService
        .registerUserV2(register)
        .pipe()
        .subscribe((res: { data: any }) => {
          if (res.data != null) {
            //console.log('Guardado con éxito.');
            this.nameUser = res.data.firstName;
            this.showModal = false;
          }
        });
    }
  }

  profile() {
    this.showModal = true;
  }

  abrirModalIdioma() {
    this.showModalIdioma = true;
  }

  /**
   * Cambia el rol del usuario (Club, Entrenador, Jugador) y navega al inicio del dashboard.
   */
  cambiarRol(profileId: 1 | 2 | 3): void {
    this.loginService.switchRole(profileId, true);
    this.cerrarDropdowns();
  }

  cerrarModalIdioma() {
    this.showModalIdioma = false;
  }

  cambiarIdioma() {
    localStorage.setItem('lang', this.selectedLang);
    this.translate.use(this.selectedLang);
    this.cerrarModalIdioma();
  }

  // Método para abrir el modal
  abrirModalCrearEquipo(): void {
    this.showModal = true;
  }

  // Método para cerrar el modal
  cerrarModal() {
    this.showModal = false;
    this.showPreview = false;
    this.showbtnupimg = false;
  }

  updateForm() {
    if (this.usuarioActual) {
      this.userForm?.patchValue({
        mobile: this.usuarioActual.mobile || '',
        pictureUser: this.usuarioActual.pictureUser || '',
        firstName: this.usuarioActual.firstName || '',
        secondName: this.usuarioActual.secondName || '',
        mail: this.usuarioActual.mail || '',
        birthdate: this.usuarioActual.birthdate || '',
        genreType: this.usuarioActual.idGenre || '',
      });
    }
  }

  get mailControl() {
    return this.userForm.get('mail');
  }

  onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      this.showbtnupimg = false;
      return;
    }

    this.selectedFile = file;

    // Mostrar preview inmediatamente
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.imagePreviewUrl = e.target.result;
      this.showPreview = true;
    };
    reader.readAsDataURL(file);

    // Subir automáticamente sin necesidad de pulsar "Guardar"
    this.onSubmit();
  }

  onSubmit() {
    if (!this.selectedFile) return;

    const userId = this.usuarioActual?.userId.toString();
    if (!userId) return;

    this.uploadingPhoto = true;
    this.showbtnupimg = false;

    this.trainingService
      .createUpdateImgUser(userId, this.selectedFile)
      .subscribe(
        (response) => {
          this.uploadingPhoto = false;
          this.imgUser = response.data;
          this.uploadedImageUrl = this.imagePreviewUrl as string;
          this.showPreview = false;

          // Actualizar foto en localStorage para reflejarse en toda la app
          const storedUser = localStorage.getItem('usuario');
          if (storedUser) {
            try {
              const userData = JSON.parse(storedUser);
              if (response?.data) userData.pictureUser = response.data;
              localStorage.setItem('usuario', JSON.stringify(userData));
            } catch (e) {}
          }

          this.cerrarModal();
        },
        (error) => {
          this.uploadingPhoto = false;
          console.error('Error al subir la imagen', error);
          this.showPreview = true;
        }
      );
  }

  goSuscripcion() {
    this.showModal = false;
    if (this.profileId === 2 && !this.coachBelongsToClub) {
      this.router.navigate(['/dashboard/suscripcion-coach']);
    } else {
      this.router.navigate(['/dashboard/suscripcion', this.userId]);
    }
  }

  goSuscripcionClub(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.showModal = false;
    window.open('https://appsphairatech.com/planes', '_blank');
  }

  cambiarPassword(): void {
    this.passwordError = '';
    this.passwordSuccess = '';

    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.passwordError = 'Rellena todos los campos.';
      return;
    }
    if (this.newPassword.length < 6) {
      this.passwordError = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.passwordError = 'Las contraseñas no coinciden.';
      return;
    }

    this.savingPassword = true;
    this.registerService.verifyAndChangePassword(this.userId, this.currentPassword, this.newPassword).subscribe({
      next: (res: any) => {
        if (res?.data === 'wrong_password') {
          this.passwordError = 'La contraseña actual no es correcta.';
          this.savingPassword = false;
        } else {
          this.passwordSuccess = 'Contraseña actualizada correctamente.';
          this.savingPassword = false;
          this.currentPassword = '';
          this.newPassword = '';
          this.confirmPassword = '';
          setTimeout(() => {
            this.showPasswordSection = false;
            this.passwordSuccess = '';
          }, 2000);
        }
      },
      error: () => {
        this.passwordError = 'Error al actualizar la contraseña. Inténtalo de nuevo.';
        this.savingPassword = false;
      }
    });
  }
}
