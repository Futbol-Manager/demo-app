import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
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

  constructor(
    private loginService: LoginService,
    private router: Router,
  ) {
    this.loginForm = new FormGroup({
      mail: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', [Validators.required])
    });
  }

  ngOnInit(): void {
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
          }
        })
    }
  }

}
