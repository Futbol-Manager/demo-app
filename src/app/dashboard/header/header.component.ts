import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBarConfig } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { GenreTypeModel, ProfileTypeModel, RegisterModel, ValidationUserModel } from 'src/app/core/models/users/register.model';
import { User } from 'src/app/core/models/users/user.model';
import { LoginService } from 'src/app/core/services/login/login.service';
import { RegisterService } from 'src/app/core/services/register/register.service';
import { ProfileComponent } from 'src/app/pages/profile/profile.component';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
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

  constructor(
    private router: Router,
    private loginService: LoginService,
    private dialog: MatDialog,
    private registerService: RegisterService,
    private formBuilder: FormBuilder,
  ) { }

  ngOnInit(): void {
    this.loginService.usuarioActual.subscribe((user: User | null) => {
      this.usuarioActual = user;
      this.updateForm(); // Actualiza el formulario cuando cambia el usuario actual
    });
  }

  goInicio(){
    this.router.navigate(['/dashboard/inicio']);
  }

  logOut(): void {
    // Llama al método cerrarSesion del servicio
    this.loginService.cerrarSesion();
  }

  saveChanges() {
    
    if(this.userForm.valid){

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
        validationUser,
        this.usuarioActual == null ? '' : this.usuarioActual.pictureUser,
        dateOnlyString,
      );
      this.registerService.registerUser(register).pipe()
      .subscribe(
        (res: { data: null; }) => {
          if(res.data != null) {
            console.log('Guardado con éxito.');
            this.showModal = false;
          }
        })
    }
  }

  profile(){
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

}
