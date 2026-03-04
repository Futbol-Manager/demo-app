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
        const profileId = user.profileType?.profileId ?? -1;
        const userId = user.userId ?? 0;
        // Federación: profileId 0 y no es el admin especial (userId !== 9)
        if (profileId === 0 && userId !== 9) {
          this.router.navigate(['/dashboard/inicio-federacion']);
        } else {
          this.router.navigate(['/dashboard/inicio']);
        }
        return false;
      })
    );
  }
}
