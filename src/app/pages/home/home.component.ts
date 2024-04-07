import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { RegisterService } from 'src/app/core/services/register/register.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
  screen: number = 1; // es 1 para el login, 2 para el registro y 3 para recordar contraseña
  rememberForm: FormGroup;

  constructor(
    private router: Router,
    private registerService: RegisterService,
    private snackBar: MatSnackBar,
  ) {
    this.rememberForm = new FormGroup({
      mail: new FormControl('', [Validators.required, Validators.email]),
    });
  }

  ngOnInit(): void {
  }

  toRegister(event: Event) {
    event.preventDefault();
    this.router.navigate(['/registro']);
  }

  toRemember(event: Event) {
    event.preventDefault();
    this.screen = 3;
  }

  sendMail(){
    if(this.rememberForm.valid){
      const fm = this.rememberForm.value;
      this.registerService.changePassByEmail(fm.mail).pipe().subscribe(
        res => {
          if(res){
            const snackBarConfig = new MatSnackBarConfig();
            snackBarConfig.duration = 5000;
            snackBarConfig.horizontalPosition = 'center';
            snackBarConfig.verticalPosition = 'bottom';
            this.snackBar.open('Correo electrónico enviado con éxito.', 'Cerrar', snackBarConfig);
          } else{
            const snackBarConfig = new MatSnackBarConfig();
            snackBarConfig.duration = 5000;
            snackBarConfig.horizontalPosition = 'center';
            snackBarConfig.verticalPosition = 'bottom';
            this.snackBar.open('Error en el envio del mail. Vuelve a intentarlo.', 'Cerrar', snackBarConfig);
          }
        }
      )
    }
  }

  get mailControl() {
    return this.rememberForm.get('mail');
  }

  toLogin(event: Event){
    event.preventDefault();
    this.screen = 1;
  }

}
