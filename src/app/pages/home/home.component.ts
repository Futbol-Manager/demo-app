import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {MatSnackBar, MatSnackBarConfig} from '@angular/material/snack-bar';
import {ActivatedRoute, Router} from '@angular/router';
import {RegisterService} from 'src/app/core/services/register/register.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
  screen: number = 1; // es 1 para el login, 2 para el registro y 3 para recordar contraseña
  rememberForm: FormGroup;
  /** URL de retorno pasada desde la app móvil para redirigir tras login */
  returnUrl: string = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private registerService: RegisterService,
    private snackBar: MatSnackBar,
  ) {
    this.rememberForm = new FormGroup({
      mail: new FormControl('', [Validators.required, Validators.email]),
    });
  }

  get mailControl() {
    return this.rememberForm.get('mail');
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      this.returnUrl = params.get('returnUrl') ?? '';
    });
  }

  get loginLogoSrc(): string {
    const isDark = typeof document !== 'undefined' && document.body.classList.contains('dark');
    return isDark ? 'assets/images/logosphairaw.png' : 'assets/images/Logo_SphairaTech1.png';
  }

  toRegister(event: Event) {
    event.preventDefault();
    this.router.navigate(['/registro']);
  }

  toRemember(event: Event) {
    event.preventDefault();
    this.screen = 3;
  }

  sendMail() {
    if (this.rememberForm.valid) {
      const fm = this.rememberForm.value;
      this.registerService.changePassByEmail(fm.mail).pipe().subscribe(
        res => {
          if (res) {
            const snackBarConfig = new MatSnackBarConfig();
            snackBarConfig.duration = 5000;
            snackBarConfig.horizontalPosition = 'center';
            snackBarConfig.verticalPosition = 'top';
            this.snackBar.open('Correo electrónico enviado con éxito.', 'Cerrar', snackBarConfig);
            this.screen = 1;
          } else {
            const snackBarConfig = new MatSnackBarConfig();
            snackBarConfig.duration = 5000;
            snackBarConfig.horizontalPosition = 'center';
            snackBarConfig.verticalPosition = 'top';
            this.snackBar.open('Error en el envio del mail. Vuelve a intentarlo.', 'Cerrar', snackBarConfig);
          }
        }
      )
    }
  }

  toLogin(event: Event) {
    event.preventDefault();
    this.screen = 1;
  }

}
