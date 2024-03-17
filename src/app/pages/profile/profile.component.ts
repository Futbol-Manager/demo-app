import { Component, OnInit } from '@angular/core';
import { User } from 'src/app/core/models/users/user.model';
import { LoginService } from 'src/app/core/services/login/login.service';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { GenreTypeModel, ProfileTypeModel, RegisterModel, ValidationUserModel } from 'src/app/core/models/users/register.model';
import { RegisterService } from 'src/app/core/services/register/register.service';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { LoginModel } from 'src/app/core/models/users/login.model';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  usuarioActual!: User | null;
  userForm: FormGroup;
  private usuarioAutenticado: BehaviorSubject<User | null> = new BehaviorSubject<User | null>(null);

  constructor(
    private loginService: LoginService,
    private formBuilder: FormBuilder,
    private registerService: RegisterService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
  ) {
      this.loginService.usuarioActual.subscribe(user => {
        this.usuarioActual = user;
        this.updateForm(); // Actualiza el formulario cuando cambia el usuario actual
      });

      // Inicializa el formulario
      this.userForm = this.formBuilder.group({
        pictureUser: [''],
        firstName: [''],
        secondName: [''],
        mail: [''],
        birthdate: [''],
        genreType: [''],
      });

      // Actualiza el formulario con los datos del usuario actual
      this.updateForm();
  }

  ngOnInit(): void {
    if(this.usuarioActual != null){

    }
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

  saveChanges(){
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
        (res) => {
          if(res.data != null) {
            const snackBarConfig = new MatSnackBarConfig();
            snackBarConfig.duration = 5000;
            snackBarConfig.horizontalPosition = 'center';
            snackBarConfig.verticalPosition = 'bottom';
            this.snackBar.open('Actualización de datos exitosa.', 'Cerrar', snackBarConfig);
            this.dialog.closeAll();
          } else{
            const snackBarConfig = new MatSnackBarConfig();
            snackBarConfig.duration = 5000;
            snackBarConfig.horizontalPosition = 'center';
            snackBarConfig.verticalPosition = 'bottom';
            this.snackBar.open('Error al modificar datos. Vuelve a intentarlo.', 'Cerrar', snackBarConfig);
          }
        })
    }
  }

}
