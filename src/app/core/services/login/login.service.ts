import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from "rxjs";

import { LoginModel } from '../../models/users/login.model';
import { LoginResponse } from '../../models/users/login-response.model';
import { environment } from 'src/environments/environment';
import { User } from '../../models/users/user.model';
import { LOCALSTORAGESTRINGS } from '../../models/master/localstorage.enum';
// Utils
import { LocalStorage } from 'src/app/core/utils/local-storage';
import { Router } from '@angular/router';
import { Response } from 'src/app/core/services/models/response.model';



@Injectable({
  providedIn: 'root'
})
export class LoginService {

  private usuarioAutenticado: BehaviorSubject<User | null>;

  constructor(
    private http: HttpClient,
    private router: Router,
    //private localStorage: LocalStorage
  ) {
    // Restaurar el usuario desde localStorage al iniciar la app (recarga de página / recompilación)
    const usuarioGuardado = localStorage.getItem('usuario');
    const token = localStorage.getItem('token');

    if (usuarioGuardado && token) {
      try {
        const user: User = JSON.parse(usuarioGuardado);
        this.usuarioAutenticado = new BehaviorSubject<User | null>(user);
      } catch (e) {
        // Si el JSON está corrupto, limpiar y empezar sin sesión
        localStorage.removeItem('usuario');
        localStorage.removeItem('token');
        this.usuarioAutenticado = new BehaviorSubject<User | null>(null);
      }
    } else {
      this.usuarioAutenticado = new BehaviorSubject<User | null>(null);
    }
  }

  login(login: LoginModel): Observable<LoginResponse> {
    const url: string = environment.apiUrl + 'auth/login';
    //return this.http.post<LoginResponse>(url, login);
    // Realiza la solicitud de inicio de sesión
    return this.http.post<LoginResponse>(url, login).pipe(
      tap(response => {
        if(response.data){
          // Guarda el usuario en el localStorage al iniciar sesión
          // Guarda el usuario y el token en el localStorage al iniciar sesión
          localStorage.setItem('usuario', JSON.stringify(response.data.userDTO));
          localStorage.setItem('token', response.data.tokenAcces);
          // Actualiza el BehaviorSubject con el usuario autenticado
          this['usuarioAutenticado'].next(response.data.userDTO);
        }
      })
    );
  }

  loginGloouds(token: string): Observable<LoginResponse> {
    const url: string = environment.apiUrl + `auth/login-gloouds/${token}`;
    return this.http.get<LoginResponse>(url).pipe(
      tap(response => {
        if (response.data) {
          // Guarda el usuario en el localStorage al iniciar sesión
          localStorage.setItem('usuario', JSON.stringify(response.data.userDTO));
          localStorage.setItem('token', response.data.tokenAcces);
          // Actualiza el BehaviorSubject con el usuario autenticado
          this['usuarioAutenticado'].next(response.data.userDTO);
        }
      })
    );
  }

  resendMailWelcome(login: LoginModel) {
    const url: string = environment.apiUrl + `auth/resendMailWelcome`;
    return this.http.post<any>(url, login);
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
    
  getlistallusers(): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
        // Configura las cabeceras con el token para la solicitud HTTP
        const headers = new HttpHeaders({
            'Authorization': `Bearer ${token}`
        });

        // Construye la URL para la solicitud
        const url: string = environment.apiUrl + `user/getlistallusers`;

        // Realiza la solicitud HTTP con las cabeceras configuradas
        return this.http.get<Response>(url, { headers });
    } else {
        // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
        return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
}

  /*actualizarImagenUsuario(imgUser: string) {
    const currentUser = this.usuarioAutenticado.value;
    if (currentUser) {
      const updatedUser = {
        ...currentUser,
        imgUser: imgUser
      };

      // Guardar el usuario actualizado en localStorage
      localStorage.setItem('usuario', JSON.stringify(updatedUser));

      // Emitir el usuario actualizado
      this.usuarioAutenticado.next(updatedUser);
    }
  }*/

}
