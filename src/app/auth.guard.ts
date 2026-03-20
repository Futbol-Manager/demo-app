// auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { tap, take, map } from 'rxjs/operators';
import { LoginService } from './core/services/login/login.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private loginService: LoginService, private router: Router) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean> | Promise<boolean> | boolean {
    return this.loginService.usuarioActual.pipe(
      take(1),  // Toma solo un valor y completa la suscripción
      tap(user => {
        if (!user) {
          // En demo-app, la entrada siempre es /demo-role
          this.router.navigate(['/demo-role'], {
            queryParams: { returnUrl: state.url }
          });
        }
      }),
      map(user => !!user)  // Convierte el resultado en un booleano
    );
  }
}
