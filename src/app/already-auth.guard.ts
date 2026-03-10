import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { LoginService } from './core/services/login/login.service';

/**
 * Guard para rutas públicas (home, login).
 * Si el usuario ya está autenticado, redirige al dashboard (inicio o inicio-federación según rol).
 * Así se evita que al pulsar "atrás" quede en login/home cuando ya hay sesión.
 */
@Injectable({
  providedIn: 'root'
})
export class AlreadyAuthGuard implements CanActivate {

  constructor(
    private loginService: LoginService,
    private router: Router
  ) {}

  canActivate(
    _route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.loginService.usuarioActual.pipe(
      take(1),
      map(user => {
        if (!user) {
          return true;
        }
        // Usuario ya autenticado: ir al dashboard (inicio)
        this.router.navigate(['/dashboard/inicio']);
        return false;
      })
    );
  }
}
