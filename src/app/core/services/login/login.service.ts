import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from "rxjs";

import { LoginModel } from '../../models/users/login.model';
import { LoginResponse } from '../../models/users/login-response.model';
import { environment } from 'src/environments/environment';
import { User } from '../../models/users/user.model';
import { LOCALSTORAGESTRINGS } from '../../models/master/localstorage.enum';
// Utils
import { LocalStorage } from 'src/app/core/utils/local-storage';
import { Router } from '@angular/router';



@Injectable({
  providedIn: 'root'
})
export class LoginService {

  private usuarioAutenticado: BehaviorSubject<User | null> = new BehaviorSubject<User | null>(null);

  constructor(
    private http: HttpClient,
    private router: Router,
    //private localStorage: LocalStorage
  ) { }

  login(login: LoginModel): Observable<LoginResponse> {
    const url: string = environment.apiUrl + 'auth/login';
    //return this.http.post<LoginResponse>(url, login);
    // Realiza la solicitud de inicio de sesión
    return this.http.post<LoginResponse>(url, login).pipe(
      tap(response => {
        // Guarda el usuario en el localStorage al iniciar sesión
        // Guarda el usuario y el token en el localStorage al iniciar sesión
        localStorage.setItem('usuario', JSON.stringify(response.data.userDTO));
        localStorage.setItem('token', response.data.tokenAcces);

        // Actualiza el BehaviorSubject con el usuario autenticado
        this['usuarioAutenticado'].next(response.data.userDTO);
      })
    );
  }

  cerrarSesion(): void {
    // Elimina el usuario y el token del localStorage al cerrar sesión
    localStorage.removeItem('usuario');
    localStorage.removeItem('token');

    // Puedes redirigir a la página de inicio de sesión o a donde desees después de cerrar sesión
    this.router.navigate(['/home']);
  }

  // Obtener el token almacenado en el localStorage
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  get usuarioActual(): Observable<User | null> {
    return this.usuarioAutenticado.asObservable();
  }

}
