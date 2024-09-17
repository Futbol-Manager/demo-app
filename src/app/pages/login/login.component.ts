import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoginModel } from 'src/app/core/models/users/login.model';
import { LoginService } from 'src/app/core/services/login/login.service';

import { MatSnackBar, MatSnackBarConfig, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { User } from 'src/app/core/models/users/user.model';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  public hidePassword = true;
  verificarCuenta: boolean = false;
  datosUser!: User | null;

  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'bottom';

  validationMessages = {
    mail: [],
    password: [],
  };

  constructor(
    private loginService: LoginService,
    private router: Router,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
  ) {
    this.loginForm = new FormGroup({
      mail: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', [Validators.required])
    });
  }

  ngOnInit(): void {
    //this.resetForm();
    this.initLoginForm();
  }

  login() {
    if (this.loginForm.valid) {
      let snackbarOn = true;
      const fv = this.loginForm.value;
      const login: LoginModel = new LoginModel(
        (fv.mail as string).trim(),
        (fv.password as string).trim(),
      );
      this.loginService.login(login).pipe()
        .subscribe(
          (res) => {
            if (res.data != null && res.data.userDTO.idValidation == 2) { //usuario ya validado
              snackbarOn = false;
              this.router.navigate(['/dashboard/inicio']);
            } else if (res.data != null && res.data.userDTO.idValidation == 1) {
              let fechaCreacion: Date = new Date(res.data.userDTO.dateCreate);
              // Obtener la fecha actual
              let fechaActual: Date = new Date();
              // Calcular la diferencia en milisegundos entre las dos fechas y convertirla a días
              let diferenciaMilisegundos: number = fechaActual.getTime() - fechaCreacion.getTime();
              let diferenciaDias: number = diferenciaMilisegundos / (1000 * 3600 * 24);
              if (diferenciaDias < 3) { //si no han pasado 3 dias se le deja entrar pero se avisa que debe verificar la cuenta con el enlace enviado a su mail
                const snackBarConfig = new MatSnackBarConfig();
                snackBarConfig.duration = 10000;
                snackBarConfig.horizontalPosition = 'center';
                snackBarConfig.verticalPosition = 'top';
                this.snackBar.open('Aún no has verificado tu cuenta, por favor revisa tu bandeja de entrada o spam del correo electrónico para validar tu cuenta.', 'Cerrar', snackBarConfig);
                this.router.navigate(['/dashboard/inicio']);
              } else { //ya han pasado mas de 3 dias, por lo que debes verificar tu cuenta si o si
                if (!this.verificarCuenta) {
                  const snackBarConfig = new MatSnackBarConfig();
                  snackBarConfig.duration = 10000;
                  snackBarConfig.horizontalPosition = 'center';
                  snackBarConfig.verticalPosition = 'top';
                  this.snackBar.open('Vuelve a intentarlo.', 'Cerrar', snackBarConfig);
                }
                this.verificarCuenta = true;
                //this.datosUser = res.data.userDTO;
              }
            } else {
              let msg = '';
              if (res.error.code == 1)
                msg = 'La cuenta de email no existe.';
              else
                msg = 'La contraseña es incorrecta.';

              const snackBarConfig = new MatSnackBarConfig();
              snackBarConfig.duration = 10000;
              snackBarConfig.horizontalPosition = 'center';
              snackBarConfig.verticalPosition = 'top';
              this.snackBar.open(msg, 'Cerrar', snackBarConfig);

            }
          }, (err) => {
            console.log(err);
            /*const snackBarConfig = new MatSnackBarConfig();
            snackBarConfig.duration = 5000;
            snackBarConfig.horizontalPosition = 'center';
            snackBarConfig.verticalPosition = 'bottom';
            this.snackBar.open('Inicio de sesión fallido. Verifica tu correo electrónico y contraseña.', 'Cerrar', snackBarConfig);*/
          }
        );
    }
  }

  enviarMail() {
    const fv = this.loginForm.value;
    const login: LoginModel = new LoginModel(
      (fv.mail as string).trim(),
      (fv.password as string).trim(),
    );
    this.loginService.resendMailWelcome(login).pipe().subscribe((res) => {
      if (res) {
        const snackBarConfig = new MatSnackBarConfig();
        snackBarConfig.duration = 10000;
        snackBarConfig.horizontalPosition = 'center';
        snackBarConfig.verticalPosition = 'top';
        this.snackBar.open('Correo electrónico enviado. Por favor revisa tu bandeja de entrada o spam para validar tu cuenta.', 'Cerrar', snackBarConfig);
      }
    });
  }

  public resetForm() {
    this.loginForm.value.nick = "";
    this.loginForm.value.keyWord = "";
  }

  initLoginForm(): void {
    this.loginForm = this.fb.group({
      mail: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  /*get mailControl() {
    if (this.loginForm) {
      return this.loginForm.get("mail");
    } else {
      return null;
    }
  }

  get passwordControl() {
    if (this.loginForm) {
      return this.loginForm.get("password");
    } else {
      return null;
    }
  }*/

  get mailControl() {
    return this.loginForm.get('mail');
  }

  get passwordControl() {
    return this.loginForm.get('password');
  }

}
