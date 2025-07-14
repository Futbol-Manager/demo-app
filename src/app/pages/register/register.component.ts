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
import { contains } from 'jquery';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
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

  selectOptions = [
    { value: "0", label: "¿Eres un club o un entrenador?" },
    { value: "1", label: "Club" },
    { value: "2", label: "Entrenador" },
    // Opciones eliminadas
    { value: "3", label: "Jugador/Padre" },
    { value: "4", label: "Jugador" },
    { value: "5", label: "Scouter" }
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
      comunicaciones: [false],
      name: [''],
      surname: ['', Validators.required],
      birthdate: ['', Validators.required],
      genre: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      password2: ['', Validators.required],
      mobile: ['', Validators.required],
      terms: [false, Validators.requiredTrue],
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
      comunicaciones: [false]
    });

    this.registerFormPadreHijos = this.fb.group({
      numHijos: [1, Validators.required],
      hijo1: [''], ape1: [''], fech1: [''], dni1: [''],
      hijo2: [''], ape2: [''], fech2: [''], dni2: [''],
      hijo3: [''], ape3: [''], fech3: [''], dni3: [''],
      hijo4: [''], ape4: [''], fech4: [''], dni4: [''],
      hijo5: [''], ape5: [''], fech5: [''], dni5: ['']
    });

    this.onParentescoChange();
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
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
        } else if (this.isMenor === 2) { //este es club
          this.selectedOption = 1;
          this.emailParam = '';
          this.playerID = 0;
        } else if (this.isMenor === 3) { //este es entrenador 
          this.selectedOption = 2;
          //this.emailParam = '';
          this.playerID = 0;
        } else if (this.isMenor === 4) { //este es scouter 
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
        this.selectOptions = this.selectOptions.filter(option => option.value !== "4");
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
        fv.mobile,
        fv.comunicaciones ? 1 : 0,
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

      if (register.mail === undefined) {
        if (this.emailParam != '') {
          register.mail = this.emailParam;
        }
      }
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
              //this.showModal = true;
              this.login(1);
            } else {
              const snackBarConfig = new MatSnackBarConfig();
              snackBarConfig.duration = 5000;
              snackBarConfig.horizontalPosition = 'center';
              snackBarConfig.verticalPosition = 'bottom';
              this.snackBar.open('Ese email ya está dado de alta, prueba a iniciar sesión o date de alta con un email diferente.', 'Cerrar', snackBarConfig);
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

      this.msgForm = false;
      const fv = this.registerFormEntrenador.value;
      let id = 0;
      if (this.clubId != 0) {
        id = this.clubId;
      }
      const register: RegisterModel = new RegisterModel(
        fv.mobile,
        fv.comunicaciones ? 1 : 0,
        profileType,
        fv.name,
        fv.surname,
        fv.birthdate,
        genreType,
        fv.email,
        fv.password,
        id,
        this.playerID,
        fv.nameSon,
        validationUser
      );

      const birthdate = register.birthdate;

      if (birthdate) {
        const birth = new Date(birthdate);
        const hoy = new Date();
        const edad = hoy.getFullYear() - birth.getFullYear();
        const mes = hoy.getMonth() - birth.getMonth();
        const dia = hoy.getDate() - birth.getDate();

        const esMayorDeEdad = edad > 18 || (edad === 18 && (mes > 0 || (mes === 0 && dia >= 0)));

        if (!esMayorDeEdad) {
          alert('Debes ser mayor de edad.');
          return;
        }
      } else {
        alert('Introduce tu edad de nacimiento.');
        return;
      }

      if (register.mail === undefined) {
        if (this.emailParam != '') {
          register.mail = this.emailParam;
        }
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
              //this.showModal = true;
            } else {
              const snackBarConfig = new MatSnackBarConfig();
              snackBarConfig.duration = 20000;
              snackBarConfig.horizontalPosition = 'center';
              snackBarConfig.verticalPosition = 'bottom';
              this.snackBar.open('Ese email ya está dado de alta, prueba a iniciar sesión o date de alta con un email diferente.', 'Cerrar', snackBarConfig);
            }
          })
    } else
      this.msgForm = true;
  }

  registerPadreSinHijos() {
    //esto es porque ha recibido una invitación como localhost:4200/registro/{playerId}/{email}/{rol}
    if (this.registerFormPadre.valid) {
      const padreData = {
        parentesco: this.registerFormPadre.get('parentesco')?.value,
        firstName: this.registerFormPadre.get('name')?.value,
        secondName: this.registerFormPadre.get('surname')?.value,
        birthdate: this.registerFormPadre.get('birthdate')?.value,
        genre: this.registerFormPadre.get('genre')?.value,
        mail: this.registerFormPadre.get('email')?.value,
        mobile: this.registerFormPadre.get('mobile')?.value,
        password: this.registerFormPadre.get('password')?.value,
        aceptaComunicaciones: this.registerFormPadre.get('comunicaciones')?.value ? 1 : 0,
        clubId: 0,
        playerId: this.playerID,
        mailExiste: this.mailExiste ? 1 : 0
      };

      // Como el padre es el jugador, usamos sus propios datos como hijo único
      const hijosData = [{}];

      const datosCompletos = {
        padre: padreData,
        hijos: hijosData
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
            this.snackBar.open('Revisa la contraseña.', 'Cerrar', snackBarConfig);
            this.registerFormPadre.get('password')?.setValue('');
            this.registerFormPadre.get('password2')?.setValue('');
            this.volver();
          }
        },
        error: (err) => {
          this.snackBar.open('Error al registrar. Intenta de nuevo.', 'Cerrar', {
            duration: 5000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom'
          });
          console.error(err);
        }
      });

      // Aquí puedes llamar al servicio que envíe `datosCompletos` al backend
    } else {
      console.warn('Formulario no válido');
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
    } else if (profile == 2) {
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
    } else if (profile == 3) {
      const fv = this.registerFormPadre.value;
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
    this.showNextRegistro = true;
    this.btnRegistro = true;
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
            alert('Hemos detectado que ese mail ya existe, para seguir con el registro, introduce los datos correctos de esa cuenta incluida la contraseña.' +
              ' Si son correctos se completará el registro.'
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
        }
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

      const esMayorDeEdad = edad > 18 || (edad === 18 && (mes > 0 || (mes === 0 && dia >= 0)));

      if (!esMayorDeEdad) {
        alert('Debes ser mayor de edad.');
        return false;
      }
    } else {
      alert('Introduce tu edad de nacimiento.');
      return false;
    }

    if (!this.registerFormPadre.get('terms')?.value) {
      alert('Es obligatorio aceptar los terminos y condiciones para registrarse.');
      return false;
    }

    return true;
  }

  numHijo() {
    if (this.registerFormPadre.get('email')?.value.includes('gmail.con')) {
      alert('Revisa el correo, has puesto gmail.con con una N y no una M');
    } else if (this.playerID != undefined && this.playerID != 0) {
      if (this.validations()) {
        this.registerPadreSinHijos();
      }
    } else {
      this.checkMail();
    }
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
    let text = '1 hijo.'
    if (this.numHijos > 1) {
      text = this.numHijos + ' hijos.';
    }

    const confirmacion = confirm('Vas a crear ' + text + ' Si esto es correcto, dale a confirmar. Si tienes más hijos, vuelve al formulario y complétalo');
    if (confirmacion) {
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
          aceptaComunicaciones: this.registerFormPadre.get('comunicaciones')?.value ? 1 : 0,
          clubId: this.clubId
        };

        const hijosData = this.hijosVisibles.map(index => ({
          nombre: this.registerFormPadreHijos.get('hijo' + (index + 1))?.value,
          apellidos: this.registerFormPadreHijos.get('ape' + (index + 1))?.value,
          fechaNacimiento: this.registerFormPadreHijos.get('fech' + (index + 1))?.value,
          dni: this.registerFormPadreHijos.get('dni' + (index + 1))?.value
        }));

        let camposOk = true;
        for (let index = 0; index < hijosData.length; index++) {
          if (hijosData[index].nombre != '' && hijosData[index].apellidos != '' && hijosData[index].fechaNacimiento != '') camposOk = false;
        }

        if (camposOk) {
          alert('Por favor, rellena el nombre, los apellidos y la fecha de nacimiento.');
          this.btnFinalizar = true;
        } else {
          const datosCompletos = {
            padre: padreData,
            hijos: hijosData
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
                this.snackBar.open('Error en la contraseña.', 'Cerrar', snackBarConfig);
                this.registerFormPadre.get('password')?.setValue('');
                this.registerFormPadre.get('password2')?.setValue('');
                this.volver();
              }
            },
            error: (err) => {
              this.snackBar.open('Error al registrar. Intenta de nuevo.', 'Cerrar', {
                duration: 5000,
                horizontalPosition: 'center',
                verticalPosition: 'bottom'
              });
              console.error(err);
            }
          });
        }
      } else {
        console.warn('Formulario no válido');
      }
    }
  }

  finalizarRegistroJugador(): void {
    if (this.registerFormPadre.valid) {
      const padreData = {
        parentesco: this.registerFormPadre.get('parentesco')?.value,
        firstName: this.registerFormPadre.get('name')?.value,
        secondName: this.registerFormPadre.get('surname')?.value,
        birthdate: this.registerFormPadre.get('birthdate')?.value,
        genre: this.registerFormPadre.get('genre')?.value,
        mail: this.registerFormPadre.get('email')?.value,
        mobile: this.registerFormPadre.get('mobile')?.value,
        password: this.registerFormPadre.get('password')?.value,
        aceptaComunicaciones: this.registerFormPadre.get('comunicaciones')?.value ? 1 : 0,
        clubId: this.clubId,
        mailExiste: this.mailExiste ? 1 : 0
      };

      // Como el padre es el jugador, usamos sus propios datos como hijo único
      const hijosData = [
        {
          nombre: padreData.firstName,
          apellidos: padreData.secondName,
          fechaNacimiento: padreData.birthdate,
          dni: '' // Si lo tienes en otro campo, lo puedes incluir aquí
        }
      ];

      let camposOk = true;
      for (let index = 0; index < hijosData.length; index++) {
        if (hijosData[index].nombre != '' && hijosData[index].apellidos != '' && hijosData[index].fechaNacimiento != '') camposOk = false;
      }

      if (camposOk) {
        alert('Por favor, rellena el nombre, los apellidos y la fecha de nacimiento.');
      } else {
        const datosCompletos = {
          padre: padreData,
          hijos: hijosData
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
              this.snackBar.open('Revisa la contraseña.', 'Cerrar', snackBarConfig);
              this.registerFormPadre.get('password')?.setValue('');
              this.registerFormPadre.get('password2')?.setValue('');
              this.volver();
            }
          },
          error: (err) => {
            this.snackBar.open('Error al registrar. Intenta de nuevo.', 'Cerrar', {
              duration: 5000,
              horizontalPosition: 'center',
              verticalPosition: 'bottom'
            });
            console.error(err);
          }
        });
      }
    } else {
      console.warn('Formulario no válido');
    }
  }

}
