import { Component, Input, OnInit } from '@angular/core';
import {  FormBuilder, FormGroup, Validators, ValidatorFn, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { LoginModel } from 'src/app/core/models/users/login.model';
import { GenreTypeModel, ProfileTypeModel, RegisterModel, ValidationUserModel } from 'src/app/core/models/users/register.model';
import { LoginService } from 'src/app/core/services/login/login.service';
import { RegisterService } from 'src/app/core/services/register/register.service';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ClubesListComponent } from './clubes-list/clubes-list.component';
import { ClubService } from 'src/app/core/services/club/club.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {

  registerFormClub: FormGroup;
  registerFormEntrenador: FormGroup;
  selectedOption: number = 2;
  passwordsDoNotMatch: boolean = false;
  listaDeClubes: any;

  constructor(
    private router: Router,
    private registerService: RegisterService,
    private loginService: LoginService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private clubService: ClubService,
  ) {
    this.registerFormClub = this.fb.group({
      name: ['', Validators.required],
      foundationDate: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      password2: ['', Validators.required],
      terms: [false, Validators.requiredTrue],
    });

    this.registerFormEntrenador = this.fb.group({
      name: ['', Validators.required],
      surname: ['', Validators.required],
      birthdate: ['', Validators.required],
      genre: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      password2: ['', Validators.required],
      terms: [false, Validators.requiredTrue],
    });
  }

  ngOnInit(): void {}

  onOptionChange(event: any) {
    this.selectedOption = event.target.value;
    // Reiniciar el formulario que no se está utilizando
    if (this.selectedOption === 1) {
      this.registerFormEntrenador.reset(); // Reiniciar el formulario de Entrenador
    } else {
      this.registerFormClub.reset(); // Reiniciar el formulario de Club
    }
  }

  checkPasswordMatchEntrenador() {
    const registerFormEntrenador = this.registerFormEntrenador;
    if (registerFormEntrenador) {
      const passwordControl = registerFormEntrenador.get('password');
      if (passwordControl) {
        const password = passwordControl.value;
        const password2 = registerFormEntrenador.get('password2')?.value; // Uso del operador de navegación segura (?)
        this.passwordsDoNotMatch = password !== password2;
      }
    }
  }

  checkPasswordMatchClub() {
    const registerFormClub = this.registerFormClub;
    if (registerFormClub) {
      const passwordControl = registerFormClub.get('password');
      if (passwordControl) {
        const password = passwordControl.value;
        const password2 = registerFormClub.get('password2')?.value; // Uso del operador de navegación segura (?)
        this.passwordsDoNotMatch = password !== password2;
      }
    }
  }

  selectClub() {
    const dialogRef = this.dialog.open(ClubesListComponent, {
      data: { clubes: this.listaDeClubes } // Pasamos la lista de clubes como datos al componente hijo
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      // Aquí puedes manejar cualquier lógica relacionada con el resultado devuelto por el componente hijo
      if (result) {
        console.log('Club seleccionado:', result);
        // Puedes asignar el resultado a una variable, enviarlo a un servicio, etc.
      }
    });
    /*
    this.clubService.getAllClubes().subscribe(
      res => {
        this.listaDeClubes = res.data;
        const dialogRef = this.dialog.open(ClubesListComponent, {
          data: { clubes: this.listaDeClubes } // Pasamos la lista de clubes como datos al componente hijo
        });

        dialogRef.afterClosed().subscribe((result: any) => {
          // Aquí puedes manejar cualquier lógica relacionada con el resultado devuelto por el componente hijo
          if (result) {
            console.log('Club seleccionado:', result);
            // Puedes asignar el resultado a una variable, enviarlo a un servicio, etc.
          }
        });
      }
    )
    */
  }

  registerClub(){
    if (this.registerFormClub.valid) {
      const profileType: ProfileTypeModel = new ProfileTypeModel(1, 'Club');
      const validationUser: ValidationUserModel = new ValidationUserModel(1, 'Pdte de validar mail');
      const genreType: GenreTypeModel = new GenreTypeModel(
        3,
        'Otro'
        );
      const fv = this.registerFormClub.value;
      const register: RegisterModel = new RegisterModel(
        profileType,
        fv.name,
        '',
        fv.birthdate,
        genreType,
        fv.email,
        fv.password,
        0,
        validationUser
      );
      this.registerService.registerUser(register).pipe()
      .subscribe(
        (res) => {
          if(res.data != null) {
            const snackBarConfig = new MatSnackBarConfig();
            snackBarConfig.duration = 5000;
            snackBarConfig.horizontalPosition = 'center';
            snackBarConfig.verticalPosition = 'bottom';
            this.snackBar.open('Registro exitoso.', 'Cerrar', snackBarConfig);
            this.login(1);
          } else{
            const snackBarConfig = new MatSnackBarConfig();
            snackBarConfig.duration = 5000;
            snackBarConfig.horizontalPosition = 'center';
            snackBarConfig.verticalPosition = 'bottom';
            this.snackBar.open('Error en el registro. Vuelve a intentarlo.', 'Cerrar', snackBarConfig);
          }
        })
    }
  }

  registerEntrenador(){
    if (this.registerFormEntrenador.valid) {
      const profileType: ProfileTypeModel = new ProfileTypeModel(2, 'Entrenador');
      const validationUser: ValidationUserModel = new ValidationUserModel(1, 'Pdte de validar mail');
      const genreType: GenreTypeModel = new GenreTypeModel(
        this.registerFormEntrenador.value.genre,
        this.registerFormEntrenador.value.genre == 1 ? 'Masculino' : (this.registerFormEntrenador.value.genre == 2 ? 'Femenino' : 'Otro')
        );
      const fv = this.registerFormEntrenador.value;
      const register: RegisterModel = new RegisterModel(
        profileType,
        fv.name,
        fv.surname,
        fv.birthdate,
        genreType,
        fv.email,
        fv.password,
        0,
        validationUser
      );
      this.registerService.registerUser(register).pipe()
      .subscribe(
        (res) => {
          if(res.data != null) {
            const snackBarConfig = new MatSnackBarConfig();
            snackBarConfig.duration = 5000;
            snackBarConfig.horizontalPosition = 'center';
            snackBarConfig.verticalPosition = 'bottom';
            this.snackBar.open('Registro exitoso.', 'Cerrar', snackBarConfig);
            this.login(2);
          } else{
            const snackBarConfig = new MatSnackBarConfig();
            snackBarConfig.duration = 5000;
            snackBarConfig.horizontalPosition = 'center';
            snackBarConfig.verticalPosition = 'bottom';
            this.snackBar.open('Error en el registro. Vuelve a intentarlo.', 'Cerrar', snackBarConfig);
          }
        })
    }
  }

  login(profile: number) {
    if(profile == 1){
      const fv = this.registerFormClub.value;
      const login: LoginModel = new LoginModel(
        (fv.email as string).trim(),
        (fv.password as string).trim(),
      );
      this.loginService.login(login).pipe()
        .subscribe(
          (res) => {
            if (res.data != null) {
              this.router.navigate(['/dashboard/inicio']);
            }
          });
    } else{
      const fv = this.registerFormEntrenador.value;
      const login: LoginModel = new LoginModel(
        (fv.email as string).trim(),
        (fv.password as string).trim(),
      );
      this.loginService.login(login).pipe()
        .subscribe(
          (res) => {
            if (res.data != null) {
              this.router.navigate(['/dashboard/inicio']);
            }
          });
    }
  }

}
