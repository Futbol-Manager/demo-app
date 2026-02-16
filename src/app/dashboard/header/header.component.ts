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
import { environment } from 'src/environments/environment';
import { Dropdown } from 'bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { Response } from 'src/app/core/services/models/response.model';

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
    public themeService: ThemeService
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
    this.loginService.usuarioActual.subscribe((user: User | null) => {
      this.usuarioActual = user;
      this.profileId = this.usuarioActual!.profileType.profileId;
      this.idValidation = this.usuarioActual!.idValidation;
      this.nameUser = user !== null ? user.firstName : '';
      this.userId = user !== null ? user.userId : 0;
      this.imgUser = user !== null ? user.pictureUser : '';
      this.mobile = user !== null ? user.mobile : '';
      this.updateForm(); // Actualiza el formulario cuando cambia el usuario actual

      // Si es Coach (profileId === 2), comprobamos si pertenece a un club
      if (this.profileId === 2 && this.userId > 0) {
        this.checkCoachBelongsToClub();
      }
    });
  }

  /**
   * Comprueba si el entrenador pertenece a un club.
   * Si el servicio devuelve un clubId > 0, el coach pertenece a un club
   * y NO debe ver la suscripción del coach.
   */
  private checkCoachBelongsToClub(): void {
    this.teamService.getTeamByClub(this.userId.toString(), '2025').subscribe({
      next: (response: Response) => {
        const clubId = response.data?.club?.clubId ?? 0;
        this.coachBelongsToClub = clubId > 0;
      },
      error: () => {
        this.coachBelongsToClub = false;
      }
    });
  }

  ngAfterViewInit() {
    document
      .querySelectorAll('[data-bs-toggle="dropdown"]')
      .forEach((el) => Dropdown.getOrCreateInstance(el as HTMLElement));
  }

  /** Select theme mode (dark is currently disabled) */
  selectTheme(mode: 'light' | 'dark'): void {
    if (mode === 'dark') return; // Dark mode disabled for now
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
    console.log(this.profileId);
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
    if (
      event.target.files[0].type === 'image/png' ||
      event.target.files[0].type === 'image/jpeg'
    ) {
      this.selectedFile = event.target.files[0];
      this.showbtnupimg = true;
      if (this.selectedFile) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.imagePreviewUrl = e.target.result;
          this.showPreview = true; // Mostrar vista previa
        };
        reader.readAsDataURL(this.selectedFile);
      }
    } else {
      this.showbtnupimg = false;
    }
  }

  onSubmit() {
    if (this.selectedFile) {
      //console.log('Imagen seleccionada:', this.selectedFile);

      // Simulamos el envío de la imagen al servidor
      const userId = this.usuarioActual?.userId.toString();
      this.trainingService
        .createUpdateImgUser(userId!, this.selectedFile)
        .subscribe(
          (response) => {
            this.imgUser = response.data;
            this.uploadedImageUrl = this.imagePreviewUrl as string; // Actualizar imagen principal
            this.showPreview = false; // Ocultar vista previa
            this.cerrarModal();
          },
          (error) => {
            console.error('Error al subir la imagen', error);
            // Aquí puedes manejar el error si la subida de la imagen falla
            this.showPreview = true; // Mantener la vista previa si la subida falla
          }
        );
    } else {
      console.log('Ninguna imagen seleccionada.');
    }
  }

  goSuscripcion() {
    this.showModal = false;
    this.router.navigate(['/dashboard/suscripcion', this.userId]);
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
