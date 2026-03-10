import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { take, map } from 'rxjs/operators';
import { LoginService } from './core/services/login/login.service';

const ADMIN_USER_IDS = [9];

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  constructor(private loginService: LoginService, private router: Router) {}

  canActivate(): Observable<boolean> {
    return this.loginService.usuarioActual.pipe(
      take(1),
      map((user: any) => {
        const profileId = user?.profileType?.profileId ?? -1;
        const userId = user?.userId ?? -1;
        if (profileId === 0 || ADMIN_USER_IDS.includes(userId)) return true;
        this.router.navigate(['/dashboard/inicio']);
        return false;
      })
    );
  }
}
