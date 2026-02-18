import { Component, ElementRef, OnInit, Renderer2 } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBarConfig } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
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
import { environment } from 'src/environments/environment';
import { Dropdown } from 'bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { Response } from 'src/app/core/services/models/response.model';
import { getCurrentSeasonString } from 'src/app/core/utils/season.utils';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit {
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

  // Coach trial banner
  coachTrialActive = false;

  // AI Credits
  creditsAvailable = 0;
  creditsLoaded = false;
  showCreditsModal = false;

  // Detección de dispositivo y modal de descarga
  isAndroid = false;
  isiOS = false;
  isDesktop = true;
  showDownloadModal = false;
  downloadModalPlatform: 'android' | 'ios' = 'android';

  linkCopied = false;

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
    private aiChatService: AiChatService
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
    this.detectDevice();
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
      }

      // Cargar créditos IA
      if (this.userId > 0 && !this.creditsLoaded) {
        this.creditsLoaded = true;
        this.loadAiCredits();
      }
    });
  }

  loadAiCredits(): void {
    this.aiChatService.getCredits(this.userId).subscribe({
      next: info => { this.creditsAvailable = info.creditsAvailable; },
      error: () => { this.creditsAvailable = 0; }
    });
  }

  openCreditsModal(): void {
    this.showCreditsModal = true;
  }

  closeCreditsModal(): void {
    this.showCreditsModal = false;
    this.loadAiCredits();
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

  goToSugerencias(): void {
    this.router.navigate(['/dashboard/admin-sugerencias']);
  }

  goToSugerenciasUsuario(): void {
    this.router.navigate(['/dashboard/sugerencias-club']);
  }

  goToAdminClubes(): void {
    this.router.navigate(['/dashboard/admin-clubes']);
  }

  goToAdminSugerencias(): void {
    this.router.navigate(['/dashboard/admin-sugerencias']);
  }

  goToAdminCharts(): void {
    this.router.navigate(['/dashboard/admin-charts']);
  }

  goToAdminAiInsights(): void {
    this.router.navigate(['/dashboard/admin-ai-insights']);
  }

  goToAdminAiUsage(): void {
    this.router.navigate(['/dashboard/admin-ai-usage']);
  }

  goToAdminRegistros(): void {
    this.router.navigate(['/dashboard/admin-registros']);
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
  goToAdminCoaches(): void {
    this.router.navigate(['/dashboard/admin-coaches']);
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

  goInicio() {
    if (this.profileId == 0) {
      this.router.navigate(['/dashboard/inicio-federacion']);
    } else {
      this.router.navigate(['/dashboard/inicio']);
    }
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

  goSuscripcionClub() {
    this.showModal = false;
    this.router.navigate(['/dashboard/suscripcion-club']);
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
