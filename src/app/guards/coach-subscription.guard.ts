import { Injectable } from '@angular/core';
import { CanActivateChild, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { take, switchMap, map, catchError } from 'rxjs/operators';
import { LoginService } from '../core/services/login/login.service';
import { TeamService } from '../core/services/team/team.service';

const CACHE_KEY = 'coach_sub_status';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** Routes that should always be accessible regardless of subscription status. */
const EXEMPT_PATHS = [
  'suscripcion-coach',
  'coach-suscripcion-success',
  'suscripcion',
];

@Injectable({
  providedIn: 'root'
})
export class CoachSubscriptionGuard implements CanActivateChild {

  constructor(
    private loginService: LoginService,
    private teamService: TeamService,
    private router: Router
  ) {}

  canActivateChild(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    const path = state.url;

    // Allow payment pages through unconditionally
    if (EXEMPT_PATHS.some(p => path.includes(p))) {
      return of(true);
    }

    return this.loginService.usuarioActual.pipe(
      take(1),
      switchMap(user => {
        if (!user) return of(true); // AuthGuard handles login redirect

        const profileId = user.profileType?.profileId ?? 0;

        // Only check for standalone coaches (profileId 2)
        if (profileId !== 2) return of(true);

        const userId = user.userId;

        // Check cache to avoid repeated HTTP calls within the same session
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          try {
            const { value, ts } = JSON.parse(cached);
            if (Date.now() - ts < CACHE_TTL_MS) {
              if (value > 0) return of(true);
              this.router.navigate(['/dashboard/suscripcion-coach']);
              return of(false);
            }
          } catch { /* invalid cache, refetch */ }
        }

        return this.teamService.getEstadoSuscripcion(userId, 2).pipe(
          map((res: any) => {
            const status = res?.data ?? 0;
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({ value: status, ts: Date.now() }));
            if (status > 0) return true;
            this.router.navigate(['/dashboard/suscripcion-coach']);
            return false;
          }),
          catchError(() => of(true)) // On error, allow access (fail open)
        );
      })
    );
  }
}
