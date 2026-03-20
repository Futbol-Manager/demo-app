import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError, switchMap, take } from 'rxjs/operators';
import { LoginService } from '../core/services/login/login.service';
import { ClubSubscriptionService } from '../core/services/subscription/club-subscription.service';

@Injectable({
  providedIn: 'root'
})
export class ClubPlanGuard implements CanActivate {

  constructor(
    private loginService: LoginService,
    private subscriptionService: ClubSubscriptionService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.loginService.usuarioActual.pipe(
      take(1),
      switchMap(user => {
        if (!user) {
          this.router.navigate(['/demo-role']);
          return of(false);
        }

        const profileId = user.profileType?.profileId || 0;

        // Only enforce plan restrictions for Club profile (profileId=1)
        if (profileId !== 1) {
          return of(true);
        }

        const clubId = user.userId || 0;
        if (clubId <= 0) return of(true);

        return this.subscriptionService.getFeatures(clubId).pipe(
          map(featureData => {
            const blockedRoutes: string[] = featureData.blockedRoutes || [];
            const currentPath = state.url;

            const isBlocked = blockedRoutes.some(blocked =>
              currentPath.includes(blocked)
            );

            if (isBlocked) {
              this.router.navigate(['/dashboard/suscripcion-club'], {
                queryParams: { upgrade: true, from: currentPath }
              });
              return false;
            }

            return true;
          }),
          catchError(() => of(true))
        );
      })
    );
  }
}
