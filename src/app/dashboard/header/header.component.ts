import { Component, ElementRef, OnInit, Renderer2 } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBarConfig } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { GenreTypeModel, ProfileTypeModel, RegisterModel, ValidationUserModel } from 'src/app/core/models/users/register.model';
import { User } from 'src/app/core/models/users/user.model';
import { LoginService } from 'src/app/core/services/login/login.service';
import { PlayerId } from 'src/app/core/services/player/player.model';
import { RegisterService } from 'src/app/core/services/register/register.service';
import { TrainingService } from 'src/app/core/services/training/training.service';
import { ProfileComponent } from 'src/app/pages/profile/profile.component';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
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
  });;
  private usuarioAutenticado: BehaviorSubject<User | null> = new BehaviorSubject<User | null>(null);
  // Variable para controlar la visibilidad del modal
  showModal: boolean = false;

  nameUser: string = '';
  imgUser: string = '';
  selectedFile: File | null = null;
  imagePreviewUrl: string | ArrayBuffer | null = null;
  uploadedImageUrl: string | null = null; // Almacena la URL de la imagen subida
  showPreview: boolean = false;

  constructor(
    private router: Router,
    private loginService: LoginService,
    private dialog: MatDialog,
    private registerService: RegisterService,
    private formBuilder: FormBuilder,
    private renderer: Renderer2,
    private elementRef: ElementRef,
    private trainingService: TrainingService,
  ) { }

  ngOnInit(): void {
    this.loginService.usuarioActual.subscribe((user: User | null) => {
      this.usuarioActual = user;
      this.nameUser = user !== null ? user.firstName : '';
      this.imgUser = user !== null ? user.pictureUser : '';
      this.updateForm(); // Actualiza el formulario cuando cambia el usuario actual
    });
  }

  //metodo para el modo oscuro y claro
  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;

    //cambiamos primero todo el header
    const themeClass2 = '.theme-header';
    const header = document.getElementsByTagName('body')[0];
    const themeElement2 = header.querySelector(themeClass2);
    if (themeElement2) {
      this.renderer.setStyle(themeElement2, 'color', this.isDarkMode ? 'white' : 'black');
      this.renderer.setStyle(themeElement2, 'background-color', this.isDarkMode ? '#3a444e' : 'white');
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
      this.renderer.setStyle(card, 'color', this.isDarkMode ? 'white' : 'black');
      this.renderer.setStyle(card, 'background-color', this.isDarkMode ? '#3a444e' : 'white');
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
    this.router.navigate(['/dashboard/inicio']);
  }

  logOut(): void {
    // Llama al método cerrarSesion del servicio
    this.loginService.cerrarSesion();
  }

  saveChanges() {

    if (this.userForm.valid) {

      const today: Date = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
      const isoString: string = today.toISOString();
      const dateOnlyString: string = isoString.split('T')[0];
      const genreType: GenreTypeModel = new GenreTypeModel(
        this.userForm.value.genreType,
        this.userForm.value.genreType == 1 ? 'Masculino' : (this.userForm.value.genreType == 2 ? 'Femenino' : 'Otro')
      );
      const profileType: ProfileTypeModel = new ProfileTypeModel(2, 'Entrenador') //hardcodeado
      const validationUser: ValidationUserModel = new ValidationUserModel(2, 'Validado por mail');//hardcodeado
      
      const register: RegisterModel = new RegisterModel(
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
        dateOnlyString,
      );
      this.registerService.registerUser(register).pipe()
        .subscribe(
          (res: { data: null; }) => {
            if (res.data != null) {
              console.log('Guardado con éxito.');
              this.showModal = false;
            }
          })
    }
  }

  profile() {
    this.abrirModalCrearEquipo();
  }

  // Método para abrir el modal
  abrirModalCrearEquipo(): void {
    this.showModal = true;
  }

  // Método para cerrar el modal
  cerrarModal(): void {
    this.showModal = false;
  }

  updateForm() {
    if (this.usuarioActual) {
      this.userForm?.patchValue({
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
    this.selectedFile = event.target.files[0];
    if (this.selectedFile) {
        const reader = new FileReader();        
        reader.onload = (e: any) => {
            this.imagePreviewUrl = e.target.result;
            this.showPreview = true; // Mostrar vista previa
        };
        reader.readAsDataURL(this.selectedFile);
    }
}

onSubmit() {
  if (this.selectedFile) {
      console.log('Imagen seleccionada:', this.selectedFile);

      // Simulamos el envío de la imagen al servidor
      const userId = this.usuarioActual?.userId.toString();
      this.trainingService.createUpdateImgUser(userId!, this.selectedFile)
          .subscribe(
              (response) => {
                  this.imgUser = response.data;
                  this.uploadedImageUrl = this.imagePreviewUrl as string; // Actualizar imagen principal
                  this.showPreview = false; // Ocultar vista previa
                  this.cerrarModal();
              },
              error => {
                  console.error('Error al subir la imagen', error);
                  // Aquí puedes manejar el error si la subida de la imagen falla
                  this.showPreview = true; // Mantener la vista previa si la subida falla
              }
          );
  } else {
      console.log('Ninguna imagen seleccionada.');
  }
}

}
