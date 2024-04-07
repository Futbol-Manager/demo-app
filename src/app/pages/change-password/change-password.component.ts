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

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.scss']
})
export class ChangePasswordComponent implements OnInit {

  cambiarPassForm: FormGroup;
  passwordsDoNotMatch: boolean = false;

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

  ngOnInit(): void { }

  checkPasswordMatch() {
    const cambiarPassForm = this.cambiarPassForm;
    if (cambiarPassForm) {
      const passwordControl = cambiarPassForm.get('password');
      if (passwordControl) {
        const password = passwordControl.value;
        const password2 = cambiarPassForm.get('password2')?.value; // Uso del operador de navegación segura (?)
        this.passwordsDoNotMatch = password !== password2;
      }
    }
  }

  cambiarPass() {
    if (this.cambiarPassForm.valid) {}
  }

}
