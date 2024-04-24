import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ValidatorFn, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LoginModel } from 'src/app/core/models/users/login.model';
import { GenreTypeModel, ProfileTypeModel, RegisterModel, ValidationUserModel } from 'src/app/core/models/users/register.model';
import { LoginService } from 'src/app/core/services/login/login.service';
import { RegisterService } from 'src/app/core/services/register/register.service';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ClubesListComponent } from './clubes-list/clubes-list.component';
import { ClubService } from 'src/app/core/services/club/club.service';
import { Club } from 'src/app/core/services/models/club.model';

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
  listaDeClubes: Club = new Club({});
  msgAge: boolean = false;
  playerID: number = 0;
  emailParam: string = '';
  isMenor!: number;
  isReadOnly: boolean = false;
  isReadOnlyMail: boolean = false;

  selectOptions = [
    { value: "1", label: "Club" },
    { value: "2", label: "Entrenador" },
    // Opciones eliminadas
    { value: "3", label: "Padre o tutor" },
    { value: "4", label: "Jugador" }
  ];

  constructor(
    private router: Router,
    private registerService: RegisterService,
    private loginService: LoginService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private clubService: ClubService,
    private route: ActivatedRoute,
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
      nameSon: [''],
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      // Obtener el valor de teamId de los parámetros
      this.playerID = params['playerId'];
      this.emailParam = params['email'];
      this.isMenor = +params['isMenor'];
      //console.log('this.playerID =' + this.playerID + 'y this.emailParam =' + this.emailParam);
    });

    let option = 0;
    if (this.isMenor !== undefined && !Number.isNaN(this.isMenor)) {
      if (this.isMenor === 0) {
        this.selectedOption = 4;
      } else {
        this.selectedOption = 3;
      }
      this.isReadOnly = true;
      // Establecer valor predeterminado para el campo email
      this.registerFormEntrenador.get('email')!.setValue(this.emailParam);
    } else {
      this.selectOptions = this.selectOptions.filter(option => option.value !== "3" && option.value !== "4");
    }
  }

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
    this.clubService.getAllClubes().subscribe(
      (response) => {
        this.listaDeClubes = response.data;
        const dialogRef = this.dialog.open(ClubesListComponent, {
          data: { clubes: this.listaDeClubes } // Pasamos la lista de clubes como datos al componente hijo
        });

        dialogRef.componentInstance.clubSeleccionadoChange.subscribe((clubSeleccionado: any) => {
          // Aquí puedes manejar cualquier lógica relacionada con el club seleccionado
          console.log('Club seleccionado:', clubSeleccionado);
          // Asigna el club seleccionado al input del nombre del club en el componente padre
          if (this.registerFormClub) {
            this.registerFormClub.get('name')?.setValue(clubSeleccionado.name);
          }
          // Cierra el modal o componente después de seleccionar el club
          dialogRef.close();
        });
      },
      (error) => {
        console.error('Error al crear el equipo:', error);
        // Puedes manejar el error según tus necesidades
      }
    );
  }

  registerClub() {
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
        this.playerID,
        fv.nameSon,
        validationUser
      );

      this.registerService.registerUser(register).pipe()
        .subscribe(
          (res) => {
            if (res.data != null) {
              const snackBarConfig = new MatSnackBarConfig();
              snackBarConfig.horizontalPosition = 'center';
              snackBarConfig.verticalPosition = 'top';

              this.snackBar.open(
                `¡Gracias por registrarte!\n\n
                Hemos enviado un email de confirmación a la dirección de correo electrónico que nos proporcionaste.
                Por favor, revisa tu bandeja de entrada y sigue las instrucciones contenidas en el correo para completar tu registro.\n\n
                Si no encuentras el correo de confirmación, te recomendamos revisar tu carpeta de spam o correo no deseado, ya que a veces los mensajes pueden terminar allí por error.
                Si aún así no encuentras el correo, por favor, contáctanos en info@sphairatech.com para que podamos asistirte.\n\n
                ¡Esperamos verte pronto!`,
                'Ok', snackBarConfig
              );
              this.login(1);
            } else {
              const snackBarConfig = new MatSnackBarConfig();
              snackBarConfig.duration = 5000;
              snackBarConfig.horizontalPosition = 'center';
              snackBarConfig.verticalPosition = 'bottom';
              this.snackBar.open('Error en el registro. Vuelve a intentarlo.', 'Cerrar', snackBarConfig);
            }
          })
    }
  }

  calculateAge(birthdate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthdate.getFullYear();
    const m = today.getMonth() - birthdate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthdate.getDate())) {
      age--;
    }
    return age;
  }

  registerEntrenador() {
    if (this.registerFormEntrenador.valid) {
      const profileType: ProfileTypeModel = new ProfileTypeModel(this.selectedOption, 'Entrenador');
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
        this.playerID,
        fv.nameSon,
        validationUser
      );

      const age = this.calculateAge(new Date(fv.birthdate));
      if (age < 14) {
        this.msgAge = true;
        return;
      }

      this.registerService.registerUser(register).pipe()
        .subscribe(
          (res) => {
            if (res.data != null) {
              const snackBarConfig = new MatSnackBarConfig();
              snackBarConfig.duration = 5000;
              snackBarConfig.horizontalPosition = 'center';
              snackBarConfig.verticalPosition = 'bottom';
              this.snackBar.open('Registro exitoso.', 'Cerrar', snackBarConfig);
              this.login(2);
            } else {
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
    if (profile == 1) {
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
    } else {
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

  toLogin(event: Event) {
    event.preventDefault();
    this.router.navigate(['/home']);
  }

}
