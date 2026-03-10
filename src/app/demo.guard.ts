import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { DemoService } from './core/services/demo/demo.service';

/**
 * En modo demo, exige que el usuario haya elegido un rol (Club / Coach / Player)
 * antes de entrar al dashboard. Si no hay rol, redirige a /demo-role.
 */
@Injectable({
  providedIn: 'root'
})
export class DemoGuard implements CanActivate {

  constructor(
    private demoService: DemoService,
    private router: Router,
  ) {}

  canActivate(_route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): boolean {
    if (!this.demoService.isDemoMode()) {
      return true;
    }
    if (this.demoService.getDemoRole()) {
      return true;
    }
    this.router.navigate(['/demo-role']);
    return false;
  }
}
