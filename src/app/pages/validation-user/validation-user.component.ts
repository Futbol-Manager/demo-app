import { Component, Input, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ValidatorFn,
  AbstractControl,
} from '@angular/forms';
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
import { ClubService } from 'src/app/core/services/club/club.service';
import { Club } from 'src/app/core/services/models/club.model';
import { Response } from 'src/app/core/services/models/response.model';
import { User } from 'src/app/core/models/users/user.model';

@Component({
  selector: 'app-validation-user',
  templateUrl: './validation-user.component.html',
  styleUrls: ['./validation-user.component.scss'],
})
export class ValidationUserComponent implements OnInit {
  private userId: number = 0;

  constructor(
    private router: Router,
    private registerService: RegisterService,
    private loginService: LoginService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private activatedRoute: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.getQueryParams();
  }

  getQueryParams() {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.userId = +params['userId'] || 0;
    });
  }

  validarUsuario() {
    this.registerService.validateUser(this.userId).subscribe({
      next: (res) => {
        if (res.data) {
          this.showSnack(
            'Usuario validado correctamente. Ya puedes iniciar sesión.',
            'success',
          );
          this.dialog.closeAll();
          this.router.navigate(['/home']);
        } else {
          this.showSnack(
            'No se ha podido validar el usuario. Inténtalo de nuevo.',
            'error',
          );
        }
      },
      error: () => {
        this.showSnack(
          'Error de conexión. Por favor, inténtalo más tarde.',
          'error',
        );
      },
    });
  }

  private showSnack(message: string, type: 'success' | 'error'): void {
    const config = new MatSnackBarConfig();
    config.duration = 5000;
    config.horizontalPosition = 'center';
    config.verticalPosition = 'bottom';
    config.panelClass =
      type === 'success' ? ['snackbar-success'] : ['snackbar-error'];

    this.snackBar.open(message, 'Cerrar', config);
  }
}
