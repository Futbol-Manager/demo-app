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
import { environment } from 'src/environments/environment';
import { Dropdown } from 'bootstrap';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit {
  isDarkMode: boolean = false;
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
  selectedLang: string = 'es'; // Idioma actual por defecto

  constructor(
    private router: Router,
    private loginService: LoginService,
    private dialog: MatDialog,
    private registerService: RegisterService,
    private formBuilder: FormBuilder,
    private renderer: Renderer2,
    private elementRef: ElementRef,
    private trainingService: TrainingService,
    private translate: TranslateService
  ) {
    const lang = localStorage.getItem('lang');
    if (lang) {
      this.selectedLang = lang;
    }
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
    });
  }

  ngAfterViewInit() {
    document
      .querySelectorAll('[data-bs-toggle="dropdown"]')
      .forEach((el) => Dropdown.getOrCreateInstance(el as HTMLElement));
  }

  //metodo para el modo oscuro y claro
  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;

    //cambiamos primero todo el header
    const themeClass2 = '.theme-header';
    const header = document.getElementsByTagName('body')[0];
    const themeElement2 = header.querySelector(themeClass2);
    if (themeElement2) {
      this.renderer.setStyle(
        themeElement2,
        'color',
        this.isDarkMode ? 'white' : 'black'
      );
      this.renderer.setStyle(
        themeElement2,
        'background-color',
        this.isDarkMode ? '#3a444e' : 'white'
      );
    }

    const submenu = document.getElementById('submenu');
    if (submenu) {
      if (this.isDarkMode) {
        submenu.style.backgroundColor = '#3a444e';
      } else {
        submenu.style.backgroundColor = 'white';
      }
    }

    const span = document.getElementById('span');
    const span2 = document.getElementById('span2');
    const span3 = document.getElementById('span3');
    if (span && span2 && span3) {
      if (this.isDarkMode) {
        span.style.color = 'white';
        span2.style.color = 'white';
        span3.style.color = 'white';
      } else {
        span.style.color = 'black';
        span2.style.color = 'black';
        span3.style.color = 'black';
      }
    }
    //cambiamos todo el body
    //cambiamos los card
    const cardElements = document.querySelectorAll('.card');
    cardElements.forEach((card) => {
      this.renderer.setStyle(
        card,
        'color',
        this.isDarkMode ? 'white' : 'black'
      );
      this.renderer.setStyle(
        card,
        'background-color',
        this.isDarkMode ? '#3a444e' : 'white'
      );
    });
    //cambiamos el calendario
    const calendar = document.getElementById('tableCalendar');
    if (calendar) {
      if (this.isDarkMode) {
        calendar.style.backgroundColor = '#3a444e';
      } else {
        calendar.style.backgroundColor = 'white';
      }
    }

    const numDia = document.querySelectorAll('.numero-dia');
    numDia.forEach((dia) => {
      this.renderer.setStyle(dia, 'color', this.isDarkMode ? 'white' : 'black');
    });

    if (this.isDarkMode) {
      document.body.style.backgroundColor = '#343a40';
      document.body.style.color = 'white';
    } else {
      document.body.style.backgroundColor = '#fafbfe';
      document.body.style.color = 'black';
    }
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
}
