import { Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { ActivatedRoute, Router } from '@angular/router';
import { LoginModel } from 'src/app/core/models/users/login.model';
import {
  GenreTypeModel,
  ProfileTypeModel,
  RegisterModel,
  ValidationUserModel,
} from 'src/app/core/models/users/register.model';
import { LoginService } from 'src/app/core/services/login/login.service';
import { RegisterService } from 'src/app/core/services/register/register.service';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ClubesListComponent } from './clubes-list/clubes-list.component';
import { ClubService } from 'src/app/core/services/club/club.service';
import { Club } from 'src/app/core/services/models/club.model';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent implements OnInit {
  registerFormClub: FormGroup;
  registerFormEntrenador: FormGroup;
  registerFormPadre!: FormGroup;
  registerFormPadreHijos!: FormGroup;
  selectedOption: number = 0;
  passwordsDoNotMatch: boolean = false;
  listaDeClubes: Club = new Club({});
  msgAge: boolean = false;
  playerID: number = 0;
  emailParam: string = '';
  isMenor!: number;
  isReadOnly: boolean = false;
  isReadOnlyMail: boolean = false;
  newRegistro: boolean = false;
  activeTab: 'padre' | 'hijos' = 'padre';
  selectOptions = [
    { value: '0', label: 'REGISTER.FORM.PROFILE_DEFAULT' },
    { value: '1', label: 'REGISTER.USER_TYPE.CLUB.TITLE' },
    { value: '2', label: 'REGISTER.USER_TYPE.COACH.TITLE' },
    { value: '3', label: 'REGISTER.USER_TYPE.PLAYER_PARENT.TITLE' },
    { value: '4', label: 'REGISTER.USER_TYPE.PLAYER.TITLE' },
    { value: '5', label: 'REGISTER.USER_TYPE.SCOUT.TITLE' },
  ];
  msgForm = false;
  showPPlayer = false;
  showModal = false;
  optionSelected = 0;
  showRegistro = false;
  showNextRegistro = false;
  btnRegistro = false;
  selected: number | 0 = 0;
  clubId = 0;
  passwordsDoNotSize = false;
  parentesco: number = 1;
  numHijos: number = 1;
  hijosVisibles: number[] = [];
  mailExiste = false;
  texBoton: string = 'Siguiente';
  btnFinalizar = false;
  estadoValidacionHijos: boolean[] = [];
  submittedEntrenador = false;
  isLoading = false;
  mensajePassword: string = '';
  passwordValida: boolean | null = null;

  staffRoleOptions = [
    { value: 2, label: 'REGISTER.ROLE.TRAINER' },
    { value: 6, label: 'REGISTER.ROLE.PHYSIO' },
    { value: 7, label: 'REGISTER.ROLE.NUTRITIONIST' },
  ];
  selectedStaffRole: number = 2;

  /* ── Password visibility toggles ── */
  showPassClub      = false;
  showPassClub2     = false;
  showPassCoach     = false;
  showPassCoach2    = false;
  showPassClubModal = false;

  /** Retorna 1-4 según fortaleza de la contraseña */
  getPasswordStrength(pwd: string): number {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 8)  score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) score++;
    return Math.max(1, score);
  }

  inputPassword: string = '';
  readonly realPassword = 'RegistroClubesST2025'; // la contraseña que quieras validar
  readonly realPasswordFede = 'LFP2000'; // la contraseña que quieras validar

  mailsOk = false;
  showModalClub = false;
  showModalCoach = false;
  form = this.fb.group(
    {
      email: ['', [Validators.required, Validators.email]],
      confirmEmail: ['', [Validators.required, Validators.email]],
    },
    { validators: [this.emailsMatchValidator()] },
  );

  showEmailAlert = false;

  constructor(
    private router: Router,
    private registerService: RegisterService,
    private loginService: LoginService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private clubService: ClubService,
    private route: ActivatedRoute,
    private translate: TranslateService,
  ) {
    this.registerFormClub = this.fb.group({
      comunicaciones: [false],
      name: ['', Validators.required],
      foundationDate: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      password2: ['', Validators.required],
      mobile: ['', Validators.required],
      terms: [false, Validators.requiredTrue],
    });

    this.registerFormEntrenador = this.fb.group({
      name: ['', Validators.required],
      surname: ['', Validators.required],
      birthdate: ['', Validators.required],
      genre: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      password2: ['', Validators.required],
      mobile: ['', Validators.required],
      terms: [false, Validators.requiredTrue],
      comunicaciones: [false],
      nameSon: [''],
    });

    this.registerFormPadre = this.fb.group({
      parentesco: [1, Validators.required],
      name: ['', Validators.required],
      surname: ['', Validators.required],
      birthdate: ['', Validators.required],
      genre: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      mobile: ['', Validators.required],
      password: ['', Validators.required],
      password2: ['', Validators.required],
      terms: [false, Validators.requiredTrue],
      comunicaciones: [false],
      confirmEmail: ['', [Validators.required, Validators.email]],
    });

    this.registerFormPadreHijos = this.fb.group({
      numHijos: [1, Validators.required],
      hijo1: [''],
      ape1: [''],
      fech1: [''],
      dni1: [''],
      hijo2: [''],
      ape2: [''],
      fech2: [''],
      dni2: [''],
      hijo3: [''],
      ape3: [''],
      fech3: [''],
      dni3: [''],
      hijo4: [''],
      ape4: [''],
      fech4: [''],
      dni4: [''],
      hijo5: [''],
      ape5: [''],
      fech5: [''],
      dni5: [''],
    });

    this.onParentescoChange();
  }

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      // Obtener el valor de teamId de los parámetros
      this.playerID = params['playerId'];
      this.emailParam = params['email'];
      this.isMenor = +params['isMenor'];
      this.clubId = +params['clubId'];
      //console.log('this.playerID =' + this.playerID + 'y this.emailParam =' + this.emailParam);
    });

    if (!Number.isNaN(this.clubId) && this.clubId != 0) {
      this.showNextRegistro = true;
      this.selectedOption = 3;
      this.isReadOnly = true;
      this.registerFormEntrenador.get('email')?.enable(); // Habilita el campo
      this.btnRegistro = true;
    } else {
      //let option = 0;
      if (this.isMenor !== undefined && !Number.isNaN(this.isMenor)) {
        this.showNextRegistro = true;
        if (this.isMenor === 0) {
          this.selectedOption = 4;
          //this.showPPlayer = true;
        } else if (this.isMenor === 1) {
          this.selectedOption = 3;
          this.texBoton = 'Registrarme';
          this.registerFormPadre.get('email')!.setValue(this.emailParam);
          //this.showPPlayer = true;
        } else if (this.isMenor === 2) {
          //este es club
          this.selectedOption = 1;
          this.emailParam = '';
          this.playerID = 0;
        } else if (this.isMenor === 3) {
          //este es entrenador
          this.selectedOption = 2;
          //this.emailParam = '';
          this.playerID = 0;
        } else if (this.isMenor === 4) {
          //este es scouter
          this.selectedOption = 5;
          this.emailParam = '';
          this.playerID = 0;
        }
        this.isReadOnly = true;
        // Establecer valor predeterminado para el campo email
        this.registerFormEntrenador.get('email')!.setValue(this.emailParam);

        /*if (this.emailParam !== '') {
          this.registerFormEntrenador.get('email')?.disable(); // Deshabilita el campo
        }*/
      } else {
        this.isMenor = -1;
        this.selectOptions = this.selectOptions.filter(
          (option) => option.value !== '4',
        );
        this.registerFormEntrenador.get('email')?.enable(); // Habilita el campo
      }
    }

    //console.log(this.emailParam);
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

        if (!this.passwordsDoNotSize)
          this.passwordsDoNotMatch = password !== password2;
      }
      if (passwordControl != null && passwordControl.value.length < 8) {
        this.passwordsDoNotSize = true;
      } else {
        this.passwordsDoNotSize = false;
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

        if (!this.passwordsDoNotSize)
          this.passwordsDoNotMatch = password !== password2;
      }
    }
  }

  selectClub() {
    this.clubService.getAllClubes().subscribe(
      (response) => {
        this.listaDeClubes = response.data;
        const dialogRef = this.dialog.open(ClubesListComponent, {
          data: { clubes: this.listaDeClubes }, // Pasamos la lista de clubes como datos al componente hijo
        });

        dialogRef.componentInstance.clubSeleccionadoChange.subscribe(
          (clubSeleccionado: any) => {
            // Aquí puedes manejar cualquier lógica relacionada con el club seleccionado
            console.log('Club seleccionado:', clubSeleccionado);
            // Asigna el club seleccionado al input del nombre del club en el componente padre
            if (this.registerFormClub) {
              this.registerFormClub
                .get('name')
                ?.setValue(clubSeleccionado.name);
            }
            // Cierra el modal o componente después de seleccionar el club
            dialogRef.close();
          },
        );
      },
      (error) => {
        console.error('Error al crear el equipo:', error);
        // Puedes manejar el error según tus necesidades
      },
    );
  }

  registerClub() {
    if (this.registerFormClub.valid) {
      const profileType: ProfileTypeModel = new ProfileTypeModel(1, 'Club');

      const storedValue = localStorage.getItem('federacionId');
      let federacionId = 1;
      if (storedValue !== null) {
        federacionId = Number(storedValue);
        console.log('FederacionId recuperado:', federacionId);
      } else {
        console.warn('No hay federacionId en localStorage');
      }

      const validationUser: ValidationUserModel = new ValidationUserModel(
        federacionId,
        'Pdte de validar mail',
      );
      const genreType: GenreTypeModel = new GenreTypeModel(3, 'Otro');

      const fv = this.registerFormClub.value;
      const register: RegisterModel = new RegisterModel(
        fv.mobile,
        fv.comunicaciones ? 1 : 0,
        profileType,
        fv.name,
        '',
        fv.foundationDate,
        genreType,
        fv.email,
        fv.password,
        0,
        this.playerID,
        fv.nameSon,
        validationUser,
      );

      if (register.mail === undefined) {
        if (this.emailParam != '') {
          register.mail = this.emailParam;
        }
      }
      this.registerService
        .registerUser(register)
        .pipe()
        .subscribe((res) => {
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
              'Ok',
              snackBarConfig,
            );
            //this.showModal = true;
            this.login(1);
          } else {
            const snackBarConfig = new MatSnackBarConfig();
            snackBarConfig.duration = 5000;
            snackBarConfig.horizontalPosition = 'center';
            snackBarConfig.verticalPosition = 'bottom';
            this.snackBar.open(
              this.translate.instant('CAL.TEXT_366'),
              this.translate.instant('APP.BUTTONS.CLOSE'),
              snackBarConfig,
            );
          }
        });
    } else {
      const snackBarConfig = new MatSnackBarConfig();
      snackBarConfig.duration = 5000;
      snackBarConfig.horizontalPosition = 'center';
      snackBarConfig.verticalPosition = 'top';
      this.snackBar.open(
        this.translate.instant('CAL.TEXT_365'),
        this.translate.instant('APP.BUTTONS.CLOSE'),
        snackBarConfig,
      );
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
  isInvalidEntrenador(controlName: string): boolean {
    const control = this.registerFormEntrenador.get(controlName);
    return !!(
      control &&
      control.invalid &&
      (control.touched || this.submittedEntrenador)
    );
  }
  submitEntrenador() {
    this.submittedEntrenador = true;
    this.msgForm = false;

    this.registerFormEntrenador.markAllAsTouched();

    if (this.registerFormEntrenador.invalid || this.passwordsDoNotMatch) {
      this.msgForm = true;
      return;
    }

    this.isLoading = true;
    this.registerEntrenador();
  }

  registerEntrenador() {
    if (!this.registerFormEntrenador.valid) {
      this.msgForm = true;
      this.isLoading = false;
      return;
    }

    const fv = this.registerFormEntrenador.value;

    /* ===== VALIDACIÓN EDAD ===== */
    if (!fv.birthdate) {
      alert('Introduce tu fecha de nacimiento.');
      this.isLoading = false;
      return;
    }

    const birth = new Date(fv.birthdate);
    const today = new Date();
    const age =
      today.getFullYear() -
      birth.getFullYear() -
      (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate())
        ? 1
        : 0);

    if (age < 18) {
      alert('Debes ser mayor de edad.');
      this.isLoading = false;
      return;
    }

    /* ===== MODELOS ===== */
    const profileNames: Record<number, string> = { 2: 'Entrenador', 6: 'Fisioterapeuta', 7: 'Nutricionista' };
    const finalProfileId = this.selectedStaffRole || 2;
    const profileType = new ProfileTypeModel(finalProfileId, profileNames[finalProfileId] || 'Entrenador');

    const validationUser = new ValidationUserModel(1, 'Pdte de validar mail');

    const genreType = new GenreTypeModel(
      fv.genre,
      fv.genre == 1 ? 'Masculino' : fv.genre == 2 ? 'Femenino' : 'Otro',
    );

    const register = new RegisterModel(
      fv.mobile,
      fv.comunicaciones ? 1 : 0,
      profileType,
      fv.name,
      fv.surname,
      fv.birthdate,
      genreType,
      fv.email ?? this.emailParam,
      fv.password,
      this.clubId || 0,
      this.playerID,
      fv.nameSon,
      validationUser,
    );

    /* ===== PETICIÓN ===== */
    this.registerService
      .registerUser(register)
      .pipe(
        finalize(() => {
          this.isLoading = false; // 🔥 SIEMPRE se ejecuta
        }),
      )
      .subscribe({
        next: (res) => {
          if (res?.data) {
            this.snackBar.open('Registro exitoso.', 'Cerrar', {
              duration: 5000,
              horizontalPosition: 'center',
              verticalPosition: 'bottom',
            });
            this.login(2);
          } else {
            this.snackBar.open(
              'Ese email ya está dado de alta. Prueba iniciar sesión.',
              'Cerrar',
              {
                duration: 20000,
                horizontalPosition: 'center',
                verticalPosition: 'bottom',
              },
            );
          }
        },
        error: () => {
          this.snackBar.open(
            'Error inesperado. Inténtalo de nuevo.',
            'Cerrar',
            {
              duration: 8000,
              horizontalPosition: 'center',
              verticalPosition: 'bottom',
            },
          );
        },
      });
  }

  login(profile: number) {
    if (profile == 1) {
      const fv = this.registerFormClub.value;
      const login: LoginModel = new LoginModel(
        (fv.email as string).trim(),
        (fv.password as string).trim(),
      );
      this.loginService
        .login(login)
        .pipe()
        .subscribe((res) => {
          if (res.data != null) {
            this.router.navigate(['/dashboard/inicio']);
          }
        });
    } else if (profile == 2) {
      const fv = this.registerFormEntrenador.value;
      const login: LoginModel = new LoginModel(
        (fv.email as string).trim(),
        (fv.password as string).trim(),
      );
      this.loginService
        .login(login)
        .pipe()
        .subscribe((res) => {
          if (res.data != null) {
            this.router.navigate(['/dashboard/inicio']);
          }
        });
    } else if (profile == 3) {
      const fv = this.registerFormPadre.value;
      const login: LoginModel = new LoginModel(
        (fv.email as string).trim(),
        (fv.password as string).trim(),
      );
      this.loginService
        .login(login)
        .pipe()
        .subscribe((res) => {
          if (res.data != null) {
            this.router.navigate(['/dashboard/inicio']);
          }
        });
    }
  }

  toLogin(event: Event) {
    event.preventDefault();
    this.router.navigate(['/demo-role']);
  }

  openModal(option: number) {
    switch (option) {
      case 1:
        this.registerClub();
        this.optionSelected = 1;
        break;
      case 2:
        this.registerEntrenador();
        this.optionSelected = 2;
        break;
    }
  }

  cerrarModal() {
    this.showModal = false;
  }

  goLogin() {
    this.login(this.optionSelected);
  }

  nextRegistro() {
    if (this.selectedOption == 1) {
      this.openConfirm();
    } else {
      this.showModalCoach = true;
    }
  }

  backRegistro() {
    this.showNextRegistro = false;
    this.btnRegistro = false;
  }

  select(option: number) {
    this.selected = option;
    this.selectedOption = option;
    //console.log(option);
  }

  checkMail() {
    const email = this.registerFormPadre.get('email')?.value;
    if (!email) return;

    if (!this.mailExiste) {
      this.registerService.validateMail(email).subscribe({
        next: (res) => {
          if (res.data === true) {
            alert(
              'Hemos detectado que ese mail ya existe, para seguir con el registro, introduce los datos correctos de esa cuenta incluida la contraseña.' +
                ' Si son correctos se completará el registro.',
            );
            //aqui se pone solo para que ponga la contraseña
            this.mailExiste = true;
            this.registerFormPadre.get('password')?.setValue('');
            this.registerFormPadre.get('password2')?.setValue('');
            return;
            // puedes mostrar una alerta o mensaje en el formulario
          } else {
            console.log('El correo está disponible');
            this.mailOk();
          }
        },
        error: (err) => {
          console.error('Error al validar el correo:', err);
        },
      });
    } else {
      this.mailOk();
    }
  }

  mailOk() {
    const parentesco = this.registerFormPadre.get('parentesco')?.value;
    if (this.validations()) {
      if (parentesco == 3) {
        this.finalizarRegistroJugador();
      } else {
        this.newRegistro = true;
        this.btnFinalizar = true;
      }
    }
  }

  validations(): boolean {
    const birthdate = this.registerFormPadre.get('birthdate')?.value;

    if (birthdate) {
      const birth = new Date(birthdate);
      const hoy = new Date();
      const edad = hoy.getFullYear() - birth.getFullYear();
      const mes = hoy.getMonth() - birth.getMonth();
      const dia = hoy.getDate() - birth.getDate();

      const esMayorDeEdad =
        edad > 18 || (edad === 18 && (mes > 0 || (mes === 0 && dia >= 0)));

      if (!esMayorDeEdad) {
        alert('Debes ser mayor de edad.');
        return false;
      }
    } else {
      alert('Introduce tu edad de nacimiento.');
      return false;
    }

    if (!this.registerFormPadre.get('terms')?.value) {
      alert(
        'Es obligatorio aceptar los terminos y condiciones para registrarse.',
      );
      return false;
    }

    return true;
  }

  volver() {
    this.newRegistro = false;
    this.btnFinalizar = true;
  }

  onParentescoChange(): void {
    const hijos = +this.registerFormPadreHijos.get('numHijos')?.value || 1;
    this.numHijos = hijos;
    this.hijosVisibles = Array.from({ length: hijos }, (_, i) => i);
  }

  checkPasswordMatchPadre(): void {
    const form = this.registerFormPadre;
    const pass = form.get('password')?.value;
    const pass2 = form.get('password2')?.value;
    this.passwordsDoNotMatch = pass !== pass2;
    this.passwordsDoNotSize = (pass?.length || 0) < 8;
  }

  finalizarRegistroPadre(): void {
    let text = '1 hijo.';
    if (this.numHijos > 1) {
      text = this.numHijos + ' hijos.';
    }

    const confirmacion = confirm(
      'Vas a crear ' +
        text +
        ' Si esto es correcto, dale a confirmar. Si tienes más hijos, vuelve al formulario y complétalo',
    );
    if (confirmacion) {
      if (this.estadoValidacionHijos.includes(false)) {
        alert(
          '🚫 Uno o más hijos ya existen en el sistema. Contacta con el club para que te envíen una invitación.',
        );
        return;
      }

      if (this.registerFormPadre.valid && this.registerFormPadreHijos.valid) {
        this.btnFinalizar = false;
        const padreData = {
          parentesco: this.registerFormPadre.get('parentesco')?.value,
          firstName: this.registerFormPadre.get('name')?.value,
          secondName: this.registerFormPadre.get('surname')?.value,
          birthdate: this.registerFormPadre.get('birthdate')?.value,
          genre: this.registerFormPadre.get('genre')?.value,
          mail: this.registerFormPadre.get('email')?.value,
          mobile: this.registerFormPadre.get('mobile')?.value,
          password: this.registerFormPadre.get('password')?.value,
          comunicaciones: this.registerFormPadre.get('comunicaciones')?.value
            ? 1
            : 0,
          clubId: this.clubId,
        };

        const hijosData = this.hijosVisibles.map((index) => ({
          nombre: this.registerFormPadreHijos.get('hijo' + (index + 1))?.value,
          apellidos: this.registerFormPadreHijos.get('ape' + (index + 1))
            ?.value,
          fechaNacimiento: this.registerFormPadreHijos.get('fech' + (index + 1))
            ?.value,
          dni: this.registerFormPadreHijos.get('dni' + (index + 1))?.value,
        }));

        let camposOk = true;
        for (let index = 0; index < hijosData.length; index++) {
          if (
            hijosData[index].nombre != '' &&
            hijosData[index].apellidos != '' &&
            hijosData[index].fechaNacimiento != '' &&
            hijosData[index].dni != ''
          )
            camposOk = false;
        }

        if (camposOk) {
          alert(
            'Por favor, rellena el nombre, los apellidos, la fecha de nacimiento y el DNI, si no tiene, escribe "No tiene DNI".',
          );
          this.btnFinalizar = true;
        } else {
          const datosCompletos = {
            padre: padreData,
            hijos: hijosData,
          };

          console.log('Datos completos para enviar:', datosCompletos);

          this.registerService.registerPadreHijos(datosCompletos).subscribe({
            next: (res) => {
              const snackBarConfig = new MatSnackBarConfig();
              snackBarConfig.duration = 5000;
              snackBarConfig.horizontalPosition = 'center';
              snackBarConfig.verticalPosition = 'bottom';

              if (res.data) {
                this.snackBar.open(
                  'Registro exitoso.',
                  'Cerrar',
                  snackBarConfig,
                );
                this.login(3); // o lo que tengas tras registrarse
              } else {
                snackBarConfig.duration = 20000;
                this.snackBar.open(
                  'Error en la contraseña.',
                  'Cerrar',
                  snackBarConfig,
                );
                this.registerFormPadre.get('password')?.setValue('');
                this.registerFormPadre.get('password2')?.setValue('');
                this.volver();
              }
            },
            error: (err) => {
              this.snackBar.open(
                'Error al registrar. Intenta de nuevo.',
                'Cerrar',
                {
                  duration: 5000,
                  horizontalPosition: 'center',
                  verticalPosition: 'bottom',
                },
              );
              console.error(err);
            },
          });
        }
      } else {
        console.warn('Formulario no válido');
      }
    }
  }

  finalizarRegistroJugador(): void {
    if (this.registerFormPadre.valid && this.mailsOk) {
      const padreData = {
        parentesco: this.registerFormPadre.get('parentesco')?.value,
        firstName: this.registerFormPadre.get('name')?.value,
        secondName: this.registerFormPadre.get('surname')?.value,
        birthdate: this.registerFormPadre.get('birthdate')?.value,
        genre: this.registerFormPadre.get('genre')?.value,
        mail: this.registerFormPadre.get('email')?.value,
        mobile: this.registerFormPadre.get('mobile')?.value,
        password: this.registerFormPadre.get('password')?.value,
        comunicaciones: this.registerFormPadre.get('comunicaciones')?.value
          ? 1
          : 0,
        clubId: this.clubId,
        mailExiste: this.mailExiste ? 1 : 0,
      };

      // Como el padre es el jugador, usamos sus propios datos como hijo único
      const hijosData = [
        {
          nombre: padreData.firstName,
          apellidos: padreData.secondName,
          fechaNacimiento: padreData.birthdate,
          dni: '', // Si lo tienes en otro campo, lo puedes incluir aquí
        },
      ];

      let camposOk = true;
      for (let index = 0; index < hijosData.length; index++) {
        if (
          hijosData[index].nombre != '' &&
          hijosData[index].apellidos != '' &&
          hijosData[index].fechaNacimiento != ''
        )
          camposOk = false;
      }

      if (camposOk) {
        alert(
          'Por favor, rellena el nombre, los apellidos y la fecha de nacimiento.',
        );
      } else {
        const datosCompletos = {
          padre: padreData,
          hijos: hijosData,
        };

        console.log('Datos completos para enviar:', datosCompletos);

        this.registerService.registerPadreHijos(datosCompletos).subscribe({
          next: (res) => {
            const snackBarConfig = new MatSnackBarConfig();
            snackBarConfig.duration = 5000;
            snackBarConfig.horizontalPosition = 'center';
            snackBarConfig.verticalPosition = 'bottom';

            if (res.data) {
              this.snackBar.open('Registro exitoso.', 'Cerrar', snackBarConfig);
              this.login(3); // o lo que tengas tras registrarse
            } else {
              snackBarConfig.duration = 20000;
              this.snackBar.open(
                'Revisa la contraseña.',
                'Cerrar',
                snackBarConfig,
              );
              this.registerFormPadre.get('password')?.setValue('');
              this.registerFormPadre.get('password2')?.setValue('');
              this.volver();
            }
          },
          error: (err) => {
            this.snackBar.open(
              'Error al registrar. Intenta de nuevo.',
              'Cerrar',
              {
                duration: 5000,
                horizontalPosition: 'center',
                verticalPosition: 'bottom',
              },
            );
            console.error(err);
          },
        });
      }
    } else {
      console.warn('Formulario no válido');
      alert('Revisa los emails');
    }
  }

  validateHijo(dni: string, index: number): void {
    if (!dni || dni.trim() === '') {
      alert('Debes introducir un DNI antes de validarlo.');
      this.estadoValidacionHijos[index] = false;
      return;
    }

    if (dni == '-') {
      this.estadoValidacionHijos[index] = true;
      return;
    }

    this.registerService.checkPlayerForDni(dni).subscribe({
      next: (res) => {
        if (res.data === true) {
          console.log('✅ Hijo válido con DNI:', dni);
          this.estadoValidacionHijos[index] = true;
        } else {
          alert(
            '🚫 El jugador ya existe. Contacta con el club para recibir invitación.',
          );
          this.estadoValidacionHijos[index] = false;
        }
      },
      error: (err) => {
        console.error('Error al validar el DNI:', err);
        this.estadoValidacionHijos[index] = false;
      },
    });
  }

  /** Llamado al dejar de escribir (blur) en cualquiera de los dos inputs */
  checkEmails(): void {
    const mail1 = this.registerFormPadre.get('email')?.value;
    const mail2 = this.registerFormPadre.get('confirmEmail')?.value;
    if (mail1 == '' || mail2 == '') return;
    if (mail1 != mail2) {
      alert('Los emails no coinciden, vuelve a escribirlos');
      this.registerFormPadre.get('email')!.setValue('');
      this.registerFormPadre.get('confirmEmail')!.setValue('');
    } else this.mailsOk = true;
  }

  openConfirmCoach() {
    this.showModalCoach = false;
    this.showModalClub = false;
    this.showNextRegistro = true;
    this.btnRegistro = true;
  }

  cerrarModalCoach() {
    this.showModalCoach = false;
  }

  openConfirm() {
    this.showModalClub = true;
  }

  cerrarModalClub() {
    this.showModalClub = false;
  }

  validatePassword() {
    this.mensajePassword = '';
    this.passwordValida = null;

    if (this.inputPassword === this.realPassword) {
      this.procesarPasswordCorrecta();
    } else if (
      this.inputPassword
        .toLowerCase()
        .includes(this.realPasswordFede.toLowerCase())
    ) {
      const partes = this.inputPassword.split('-');

      if (partes.length > 1) {
        const federacionId = partes[1];
        localStorage.setItem('federacionId', federacionId);
        console.log('FederacionId guardado:', federacionId);
      }

      this.procesarPasswordCorrecta();
    } else {
      this.mensajePassword = 'Contraseña incorrecta ❌';
      this.passwordValida = false;
    }
  }

  private emailsMatchValidator(): ValidatorFn {
    return (group: AbstractControl) => {
      const email = group.get('email')?.value?.trim().toLowerCase() || '';
      const confirm =
        group.get('confirmEmail')?.value?.trim().toLowerCase() || '';
      return email && confirm && email !== confirm
        ? { emailsMismatch: true }
        : null;
    };
  }

  private procesarPasswordCorrecta() {
    this.mensajePassword = 'Contraseña correcta ✅';
    this.passwordValida = true;

    this.showModalClub = false;
    this.showNextRegistro = true;
    this.btnRegistro = true;
  }
}
