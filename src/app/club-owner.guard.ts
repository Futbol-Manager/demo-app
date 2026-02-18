import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { take, map } from 'rxjs/operators';
import { LoginService } from './core/services/login/login.service';

@Injectable({ providedIn: 'root' })
export class ClubOwnerGuard implements CanActivate {
  constructor(private loginService: LoginService, private router: Router) {}

  canActivate(): Observable<boolean> {
    return this.loginService.usuarioActual.pipe(
      take(1),
      map((user: any) => {
        const profileId = user?.profileType?.profileId ?? -1;
        if (profileId === 1) return true;
        this.router.navigate(['/dashboard/inicio']);
        return false;
      })
    );
  }
}
