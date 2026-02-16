import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { take, switchMap, map, catchError } from 'rxjs/operators';
import { LoginService } from './core/services/login/login.service';
import { ClubService } from './core/services/club/club.service';
import { Response } from './core/services/models/response.model';

@Injectable({
  providedIn: 'root'
})
export class ClubOwnerGuard implements CanActivate {

  constructor(
    private loginService: LoginService,
    private clubService: ClubService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    const urlClubId = +route.params['clubId'];
    if (!urlClubId) {
      this.router.navigate(['/dashboard/inicio']);
      return of(false);
    }

    return this.loginService.usuarioActual.pipe(
      take(1),
      switchMap(user => {
        if (!user) {
          this.router.navigate(['/home']);
          return of(false);
        }

        const userId = user.userId;

        // Admin global (userId === 9) puede acceder a cualquier club
        if (userId === 9) {
          return of(true);
        }

        // Verificar en sessionStorage primero (optimización)
        const cachedClubId = sessionStorage.getItem('clubId');
        if (cachedClubId && +cachedClubId === urlClubId) {
          return of(true);
        }

        // Verificar contra el backend
        return this.clubService.getClubByUserId(userId).pipe(
          map((res: Response) => {
            if (res?.data) {
              // res.data puede ser un número (clubId directo) o un objeto/array de clubs
              const data = res.data;

              // Caso 1: El backend devuelve directamente el clubId como número
              if (typeof data === 'number' && data === urlClubId) {
                sessionStorage.setItem('clubId', String(urlClubId));
                return true;
              }

              // Caso 2: El backend devuelve un objeto o array de clubs
              if (typeof data === 'object') {
                const clubs = Array.isArray(data) ? data : [data];
                const belongs = clubs.some((c: any) =>
                  (c.clubId || c.club?.clubId || c.id) === urlClubId
                );

                if (belongs) {
                  sessionStorage.setItem('clubId', String(urlClubId));
                  return true;
                }
              }
            }

            this.router.navigate(['/dashboard/inicio']);
            return false;
          }),
          catchError(() => {
            this.router.navigate(['/dashboard/inicio']);
            return of(false);
          })
        );
      })
    );
  }
}
