import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoginService } from 'src/app/core/services/login/login.service';
import { CoachSubscriptionService } from 'src/app/core/services/stripe/coach-subscription.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-suscripcion-coach',
  templateUrl: './suscripcion-coach.component.html',
  styleUrls: ['./suscripcion-coach.component.scss']
})
export class SuscripcionCoachComponent implements OnInit {
  userId = 0;
  userName = '';
  loadingPlan: 'monthly' | 'annual' | null = null;

  readonly plans = [
    {
      type: 'monthly' as const,
      label: 'Mensual',
      price: '3,99',
      priceSuffix: '/ mes',
      priceNote: 'Facturado mensualmente',
      savings: null,
      popular: false,
      icon: 'bi-calendar-month'
    },
    {
      type: 'annual' as const,
      label: 'Anual',
      price: '29,99',
      priceSuffix: '/ año',
      priceNote: '≈ 2,50 € / mes — ahorras un 37%',
      savings: 'Ahorra 17,89 €',
      popular: true,
      icon: 'bi-calendar-check'
    }
  ];

  constructor(
    private loginService: LoginService,
    private coachSubscriptionService: CoachSubscriptionService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loginService.usuarioActual.subscribe((user: any) => {
      if (user) {
        this.userId = user.userId;
        this.userName = user.firstName ?? '';
      }
    });
  }

  selectPlan(planType: 'monthly' | 'annual'): void {
    if (this.loadingPlan) return;
    this.loadingPlan = planType;
    const origin = window.location.origin;
    const successUrl = `${origin}/dashboard/coach-suscripcion-success`;
    const cancelUrl  = `${origin}/dashboard/suscripcion-coach`;

    this.coachSubscriptionService.createCheckoutSession(this.userId, planType, successUrl, cancelUrl).subscribe({
      next: (res: any) => {
        if (res?.checkoutUrl) {
          window.location.href = res.checkoutUrl;
        } else {
          this.loadingPlan = null;
          this.toastr.error('No se pudo iniciar el pago. Inténtalo de nuevo.');
        }
      },
      error: () => {
        this.loadingPlan = null;
        this.toastr.error('Error al conectar con el servidor de pagos.');
      }
    });
  }
}
