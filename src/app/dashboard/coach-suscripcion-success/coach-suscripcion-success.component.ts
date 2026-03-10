import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoginService } from 'src/app/core/services/login/login.service';
import { CoachSubscriptionService } from 'src/app/core/services/stripe/coach-subscription.service';

@Component({
  selector: 'app-coach-suscripcion-success',
  templateUrl: './coach-suscripcion-success.component.html',
  styleUrls: ['./coach-suscripcion-success.component.scss']
})
export class CoachSuscripcionSuccessComponent implements OnInit {
  status: 'verifying' | 'success' | 'error' = 'verifying';
  planType = '';
  userId = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private loginService: LoginService,
    private coachSubscriptionService: CoachSubscriptionService
  ) {}

  ngOnInit(): void {
    const sessionId = this.route.snapshot.queryParamMap.get('session_id') ?? '';

    this.loginService.usuarioActual.subscribe((user: any) => {
      if (user) this.userId = user.userId;

      if (!sessionId || !this.userId) {
        this.status = 'error';
        return;
      }

      this.coachSubscriptionService.verifyCheckout(sessionId, this.userId).subscribe({
        next: (res: any) => {
          if (res?.success) {
            this.status = 'success';
            this.planType = res.planType === 'annual' ? 'Anual' : 'Mensual';
            sessionStorage.removeItem('coach_sub_status');
          } else {
            this.status = 'error';
          }
        },
        error: () => {
          this.status = 'error';
        }
      });
    });
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard/inicio']);
  }

  retry(): void {
    this.router.navigate(['/dashboard/suscripcion-coach']);
  }
}
