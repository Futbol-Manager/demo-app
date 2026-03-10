import { Component, Input, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LoginModel } from 'src/app/core/models/users/login.model';
import { LoginService } from 'src/app/core/services/login/login.service';
import { ChangeDetectorRef } from '@angular/core';

import {
  MatSnackBar,
  MatSnackBarConfig,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { User } from 'src/app/core/models/users/user.model';
import { take } from 'rxjs';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  /** URL a la que redirigir tras login exitoso (pasada desde HomeComponent o AuthGuard) */
  @Input() returnUrl: string = '';

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
  loginError = false;
  loginErrorKey: string = '';

  token = '';

  /** True si el build es demo o si la app se carga desde el dominio de demo (ej. demo.sphairatech.com) */
  private static isDemoByHostname(): boolean {
    if (typeof window === 'undefined') return false;
    const h = window.location.hostname.toLowerCase();
    return h === 'demo.sphairatech.com' || h.startsWith('demo.');
  }

  /** En modo demo solo se pide email y se llama a demo-login (build demo o URL de demo) */
  get isDemoMode(): boolean {
    return !!(environment as { demo?: boolean }).demo || LoginComponent.isDemoByHostname();
  }

  constructor(
    private loginService: LoginService,
    private router: Router,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute, //private translate: TranslateService
    private cdr: ChangeDetectorRef
  ) {
    const isDemo = !!(environment as { demo?: boolean }).demo || LoginComponent.isDemoByHostname();
    const passwordValidators = isDemo ? [] : [Validators.required];
    this.loginForm = new FormGroup({
      mail: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', passwordValidators),
    });

    /*const saved = localStorage.getItem('lang') || 'es';
    translate.addLangs(['es', 'en']);
    translate.setDefaultLang('es');
    translate.use(saved);*/
  }

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.token = params['token'];

      if (this.token) {
        this.loginGloouds();
      } else {
        this.initLoginForm();
      }
    });
    this.loginForm.valueChanges.subscribe(() => {
      if (this.loginError) {
        this.loginError = false;
        this.loginErrorKey = '';
      }
    });
  }

  /** Redirige a returnUrl si existe, o a la ruta por defecto según el perfil */
  private _navigateAfterLogin(profileId?: number, userId?: number): void {
    if (this.returnUrl) {
      this.router.navigateByUrl(this.returnUrl);
      return;
    }
    if (profileId === 0 && userId !== 9) {
      this.router.navigate(['/dashboard/inicio']);
    } else {
      this.router.navigate(['/dashboard/inicio']);
    }
  }

  loginGloouds() {
    this.loginService
      .loginGloouds(this.token)
      .pipe(take(1))
      .subscribe(
        (res) => {
          if (res.data?.userDTO?.idValidation > 1) {
            this._navigateAfterLogin();
          }
        },
        (err) => {
          console.error('Error en loginGloouds:', err);
        }
      );
  }

  login() {
    this.loginError = false;

    if (this.isDemoMode) {
      const email = (this.loginForm.get('mail')?.value as string)?.trim();
      if (!email) {
        this.loginError = true;
        this.loginErrorKey = 'LOGIN.EMAIL_REQUIRED';
        this.cdr.detectChanges();
        return;
      }
      this.loginService.loginDemoLocal(email);
      return;
    }

    if (this.loginForm.valid) {
      const fv = this.loginForm.value;

      const login: LoginModel = new LoginModel(
        (fv.mail as string).trim(),
        (fv.password as string).trim()
      );

      this.loginService.login(login).subscribe({
        next: (res) => {
          if (res?.data?.ok === true && res.data.userDTO?.idValidation > 1) {
            // ✅ Login correcto
            const profileId = res.data.userDTO.profileType.profileId;
            const userId    = res.data.userDTO.userId;
            this._navigateAfterLogin(profileId, userId);

            return;
          }

          if (res?.data?.ok === true && res.data.userDTO?.idValidation === 1) {
            // ⚠️ Usuario no verificado
            this.enviarMail();
            this.loginError = true;
            this.loginErrorKey = 'LOGIN.ERROR.NOT_VERIFIED';
            this.cdr.detectChanges();
            return;
          }

          this.loginError = true;
          this.loginErrorKey = 'LOGIN.ERROR.INVALID_CREDENTIALS';
          this.cdr.detectChanges();
        },

        error: (err) => {
          if (err.status === 401) {
            this.loginError = true;
            this.loginErrorKey = 'LOGIN.ERROR.INVALID_CREDENTIALS';
            this.cdr.detectChanges();
          } else {
            this.loginError = true;
            this.loginErrorKey = 'LOGIN.ERROR.GENERIC';
            this.cdr.detectChanges();
          }
        },
      });
    }
  }

  enviarMail() {
    const fv = this.loginForm.value;
    const login: LoginModel = new LoginModel(
      (fv.mail as string).trim(),
      (fv.password as string).trim()
    );
    this.loginService
      .resendMailWelcome(login)
      .pipe()
      .subscribe((res) => {
        if (res) {
          const snackBarConfig = new MatSnackBarConfig();
          snackBarConfig.duration = 10000;
          snackBarConfig.horizontalPosition = 'center';
          snackBarConfig.verticalPosition = 'top';
          this.snackBar.open(
            'Correo electrónico enviado para verificar la cuenta. Por favor revisa tu bandeja de entrada o spam para validar tu cuenta.',
            'Cerrar',
            snackBarConfig
          );
        }
      });
  }

  public resetForm() {
    this.loginForm.value.nick = '';
    this.loginForm.value.keyWord = '';
  }

  initLoginForm(): void {
    this.loginForm = this.fb.group({
      mail: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
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
