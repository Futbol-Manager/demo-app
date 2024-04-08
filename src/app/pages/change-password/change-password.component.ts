import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ValidatorFn, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LoginModel } from 'src/app/core/models/users/login.model';
import { GenreTypeModel, ProfileTypeModel, RegisterModel, ValidationUserModel } from 'src/app/core/models/users/register.model';
import { LoginService } from 'src/app/core/services/login/login.service';
import { RegisterService } from 'src/app/core/services/register/register.service';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ClubService } from 'src/app/core/services/club/club.service';
import { Club } from 'src/app/core/services/models/club.model';
import { Response } from 'src/app/core/services/models/response.model';
import { User } from 'src/app/core/models/users/user.model';

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.scss']
})
export class ChangePasswordComponent implements OnInit {

  cambiarPassForm: FormGroup;
  passwordsDoNotMatch: boolean = true;
  private userId: number = 0;
  usuario!: User | null;

  constructor(
    private router: Router,
    private registerService: RegisterService,
    private loginService: LoginService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private activatedRoute: ActivatedRoute,
  ) {
    this.cambiarPassForm = this.fb.group({
      password: ['', Validators.required],
      password2: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.getQueryParams();
  }

  getQueryParams() {
    this.activatedRoute.queryParams.subscribe(params => {
      this.userId = +params['userId'] || 0;
    });
    console.log(this.userId);
  }

  checkPasswordMatch() {
    const cambiarPassForm = this.cambiarPassForm;
    if (cambiarPassForm) {
      const passwordControl = cambiarPassForm.get('password');
      if (passwordControl) {
        const password = passwordControl.value;
        const password2 = cambiarPassForm.get('password2')?.value;
        this.passwordsDoNotMatch = password !== password2;
      }
    }
  }

  cambiarPass() {
    if (this.cambiarPassForm.valid) {
      this.registerService.getUserById(this.userId).subscribe(
        res => {
          if(res.data){
            const register: RegisterModel = new RegisterModel(
              res.data.profileType,
              res.data.firstName,
              res.data.secondName,
              res.data.birthdate,
              res.data.genreType,
              res.data.mail,
              this.cambiarPassForm.value.password,
              res.data.userId,
              res.data.validationUser,
              res.data.pictureUser,
              res.data.dateCreate,
              res.data.dateEdit,
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
      )
    }
  }

}
