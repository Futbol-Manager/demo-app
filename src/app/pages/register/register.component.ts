import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NbToastrService } from '@nebular/theme';
import { LoginModel } from 'src/app/core/models/users/login.model';
import { GenreTypeModel, ProfileTypeModel, RegisterModel } from 'src/app/core/models/users/register.model';
import { LoginService } from 'src/app/core/services/login/login.service';
import { RegisterService } from 'src/app/core/services/register/register.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {

  registerForm: FormGroup;

  constructor(
    private router: Router,
    private registerService: RegisterService,
    private toastrService: NbToastrService,
    private loginService: LoginService,
  ) {
    this.registerForm = new FormGroup({
      rol: new FormControl('', [Validators.required]),
      nameClub: new FormControl('', [Validators.required]),
      name: new FormControl('', [Validators.required]),
      surname: new FormControl('', [Validators.required]),
      birthdate: new FormControl('', [Validators.required]),
      genre: new FormControl('', [Validators.required]),
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', [Validators.required]),
      password2: new FormControl('', [Validators.required])
    });
  }

  ngOnInit(): void {}

  back(){
    this.router.navigate(['/home']);
  }

  register(){
    if (this.registerForm.valid) {
      const fv = this.registerForm.value;
      const genreType: GenreTypeModel = new GenreTypeModel(
        fv.genre,
        fv.genre == 1 ? 'Masculino' : fv.genre == 2 ? 'Femenino' : 'Otro',
      )
      const profileType: ProfileTypeModel = new ProfileTypeModel(
        fv.rol,
        fv.rol == 1 ? 'Club' : 'Entrenador',
      )
      const register: RegisterModel = new RegisterModel(
        profileType,
        fv.name,
        fv.surname,
        fv.birthdate,
        genreType,
        fv.email,
        fv.password,
        0
      );
      this.registerService.registerUser(register).pipe()
      .subscribe(
        (res) => {
          if(res.data != null) {
            this.toastrService.show('Inicia sesión para iniciar', 'Registro Exitoso', { status: 'success' });
            // Llamando al método login después de un registro exitoso
            this.login();
          } else{
            this.toastrService.show('Intentalo de nuevo', 'Error en el registro', { status: 'error' });
          }
        })
    }
  }

  login() {
    // Aquí, llama al método login y realiza la redirección después de un inicio de sesión exitoso
    const fv = this.registerForm.value;
    const login: LoginModel = new LoginModel(
      (fv.email as string).trim(),
      (fv.password as string).trim(),
    );

    this.loginService.login(login).pipe()
      .subscribe(
        (res) => {
          if (res.data != null) {
            this.router.navigate(['/inicio']);
          }
        });
  }

}
