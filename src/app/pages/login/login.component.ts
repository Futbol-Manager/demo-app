import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoginModel } from 'src/app/core/models/users/login.model';
import { LoginService } from 'src/app/core/services/login/login.service';

import { MatSnackBar, MatSnackBarConfig, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import {MatButtonModule} from '@angular/material/button';
import {MatSelectModule} from '@angular/material/select';
import {MatFormFieldModule} from '@angular/material/form-field';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
	public hidePassword = true;

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
          if (res.data != null) {
            snackbarOn = false;
            this.router.navigate(['/dashboard/inicio']);
          }
        }, (err) => {
          const snackBarConfig = new MatSnackBarConfig();
          snackBarConfig.duration = 5000;
          snackBarConfig.horizontalPosition = 'center';
          snackBarConfig.verticalPosition = 'bottom';
          this.snackBar.open('Inicio de sesión fallido. Verifica tu correo electrónico y contraseña.', 'Cerrar', snackBarConfig);
        }
      );
    }
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
