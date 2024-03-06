import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NbToastrService } from '@nebular/theme';
import { finalize } from 'rxjs';
import { LoginModel } from 'src/app/core/models/users/login.model';
import { LoginService } from 'src/app/core/services/login/login.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
	public hidePassword = true;
  validationMessages = {
		mail: [],
		password: [],
	};

  constructor(
    private loginService: LoginService,
    private router: Router,
    private toastrService: NbToastrService,
  ) {
    this.loginForm = new FormGroup({
      mail: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', [Validators.required])
    });
  }

  ngOnInit(): void {
    this.resetForm();
  }

  login() {
    if (this.loginForm.valid) {
      const fv = this.loginForm.value;
      const login: LoginModel = new LoginModel(
				(fv.mail as string).trim(),
				(fv.password as string).trim(),
			);
      this.loginService.login(login).pipe()
      .subscribe(
        (res) => {
          if (res.data != null) {
            this.router.navigate(['/inicio']);
          } else{
            this.toastrService.show('El mail o la contraseña son incorrectos', 'Error al iniciar sesión', { status: 'error' });
          }
        })
    }
  }

  public resetForm() {
		this.loginForm.value.nick = "";
		this.loginForm.value.keyWord = "";
	}

  get mailControl() {
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
	}

}
