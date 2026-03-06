import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, EMPTY, Observable, tap } from "rxjs";

import { LoginModel } from '../../models/users/login.model';
import { LoginResponse } from '../../models/users/login-response.model';
import { environment } from 'src/environments/environment';
import { User } from '../../models/users/user.model';
import { LOCALSTORAGESTRINGS } from '../../models/master/localstorage.enum';
// Utils
import { LocalStorage } from 'src/app/core/utils/local-storage';
import { Router } from '@angular/router';
import { Response } from 'src/app/core/services/models/response.model';
import { DemoService, DemoRole } from '../demo/demo.service';
import { DemoActivityService } from '../demo/demo-activity.service';



@Injectable({
  providedIn: 'root'
})
export class LoginService {

  private usuarioAutenticado: BehaviorSubject<User | null>;

  constructor(
    private http: HttpClient,
    private router: Router,
    private demoService: DemoService,
    private demoActivityService: DemoActivityService,
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

  /**
   * Login de demo 100% en front: solo email, sin llamar al backend.
   * Guarda usuario y token locales y redirige a selección de rol.
   */
  loginDemoLocal(email: string): void {
    const trimmed = (email || '').trim();
    if (!trimmed) return;
    const plain = {
      userId: 1,
      mail: trimmed,
      firstName: 'Usuario',
      secondName: 'Demo',
      idValidation: 2,
      profileType: { profileId: 2, profileName: 'Entrenador' },
      playerId: 0,
      playerIds: [] as number[],
      staffPermissions: [] as string[],
      birthdate: null,
      password: null,
      profile: null,
      pictureUser: 'demo-coach-avatar.svg',
      idGenre: null,
      dateCreate: null,
      nameSon: null,
      mobile: null,
      parentesco: null,
    };
    const token = 'demo-token-' + Date.now();
    localStorage.setItem('usuario', JSON.stringify(plain));
    localStorage.setItem('token', token);
    this['usuarioAutenticado'].next(new User(plain));
    this.router.navigate(['/demo-role']);
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

  /**
   * Cierra la sesión del usuario.
   * @param byInactivity — true cuando el logout es automático por inactividad
   */
  cerrarSesion(byInactivity = false): void {
    const token = localStorage.getItem('token');

    // En demo: enviar email + actividad al endpoint de producción antes de cerrar (email capturado en el login)
    if (this.demoService.isDemoMode()) {
      try {
        const raw = localStorage.getItem('usuario');
        if (raw) {
          const user = JSON.parse(raw);
          const email = (user && user.mail) ? String(user.mail).trim() : '';
          if (email) {
            this.demoActivityService.submitLead(email).subscribe({ error: () => {} });
          }
        }
      } catch (_) {}
    }

    // Emitir null ANTES de limpiar storage para que los guards reaccionen inmediatamente
    this['usuarioAutenticado'].next(null);

    // En demo no se llama al backend
    if (token && !this.demoService.isDemoMode()) {
      const url = environment.apiUrl + 'auth/logout';
      this.http.post(url, {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe({ error: () => {} });
    }

    localStorage.removeItem('usuario');
    localStorage.removeItem('token');
    if (this.demoService.isDemoMode()) {
      this.demoService.clearDemoRole();
    }

    const route = byInactivity ? ['/login'] : ['/home'];
    this.router.navigate(route, byInactivity ? { queryParams: { reason: 'inactivity' } } : {});
  }

  // Obtener el token almacenado en el localStorage
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  get usuarioActual(): Observable<User | null> {
    return this.usuarioAutenticado.asObservable();
  }

  /**
   * Cambia el rol (perfil) del usuario actual: Club (1), Entrenador (2) o Jugador (3).
   * Actualiza el estado, persiste en localStorage y opcionalmente navega.
   * Funciona en modo normal y en modo demo.
   */
  switchRole(profileId: 1 | 2 | 3, navigateToInicio = true): void {
    const raw = localStorage.getItem('usuario');
    if (!raw) return;
    let plain: any;
    try {
      plain = JSON.parse(raw);
    } catch {
      return;
    }
    if (!plain || typeof plain !== 'object') return;

    const profileNames: Record<number, string> = {
      1: 'Club',
      2: 'Entrenador',
      3: 'Jugador',
    };
    const profileName = profileNames[profileId] || 'Club';
    const demoAvatars: Record<number, string> = {
      1: 'demo-club-logo.png',
      2: 'demo-coach-avatar.svg',
      3: 'demo-player-avatar.svg',
    };
    const updated: any = {
      ...plain,
      profileType: { profileId, profileName },
    };
    if (this.demoService.isDemoMode()) {
      updated.pictureUser = demoAvatars[profileId];
    }

    localStorage.setItem('usuario', JSON.stringify(updated));
    this['usuarioAutenticado'].next(new User(updated));

    if (this.demoService.isDemoMode()) {
      const role: DemoRole = profileId === 1 ? 'club' : profileId === 2 ? 'coach' : 'player';
      this.demoService.setDemoRole(role);
    }

    if (navigateToInicio && this.router) {
      const route = this.getDashboardRouteForRole(profileId, plain);
      this.router.navigate(route);
    }
  }

  /**
   * Devuelve la ruta del dashboard. Siempre /dashboard/inicio para que la misma
   * pantalla muestre la información según el rol seleccionado (Club, Entrenador, Jugador).
   */
  private getDashboardRouteForRole(profileId: 1 | 2 | 3, _userPlain?: any): any[] {
    return ['/dashboard/inicio'];
  }

  /**
   * En modo demo: actualiza el usuario con el perfil del rol seleccionado,
   * guarda en localStorage, emite y navega al dashboard correspondiente.
   */
  setDemoUserAndNavigate(role: DemoRole): void {
    if (!this.demoService.isDemoMode()) return;
    const raw = localStorage.getItem('usuario');
    if (!raw) return;
    let user: User;
    try {
      user = JSON.parse(raw);
    } catch {
      return;
    }
    const profileNames = { club: 'Club', coach: 'Entrenador', player: 'Jugador' };
    const profileId = role === 'club' ? 1 : role === 'coach' ? 2 : 3;
    const demoAvatars = { club: 'demo-club-logo.png', coach: 'demo-coach-avatar.svg', player: 'demo-player-avatar.svg' };
    const updated = {
      ...user,
      profileType: {
        profileId,
        profileName: profileNames[role],
      },
      pictureUser: demoAvatars[role],
    };
    localStorage.setItem('usuario', JSON.stringify(updated));
    this['usuarioAutenticado'].next(updated);
    this.demoService.setDemoRole(role);
    // Los 3 roles van a inicio; el contenido cambia según profileId (Club/Entrenador/Jugador).
    this.router.navigate(['/dashboard/inicio']);
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
        return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
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
