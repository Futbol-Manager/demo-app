import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { take, map, tap } from 'rxjs/operators';
import { LoginService } from './core/services/login/login.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {

  constructor(
    private loginService: LoginService,
    private router: Router
  ) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.loginService.usuarioActual.pipe(
      take(1),
      map(user => {
        // Solo permite acceso si el usuario es el administrador (userId === 9)
        if (user && user.userId === 9) {
          return true;
        }
        
        // Si no es admin, redirige a inicio
        this.router.navigate(['/dashboard/inicio']);
        return false;
      })
    );
  }
}
