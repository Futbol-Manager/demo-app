import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ClubSubscriptionService } from 'src/app/core/services/subscription/club-subscription.service';
import { ClubSubscription, ClubPlan, ClubPlanType } from 'src/app/core/models/subscription/club-subscription.model';
import { LoginService } from 'src/app/core/services/login/login.service';
import { User } from 'src/app/core/models/users/user.model';
import { Location } from '@angular/common';

@Component({
  selector: 'app-suscripcion-club',
  templateUrl: './suscripcion-club.component.html',
  styleUrls: ['./suscripcion-club.component.scss']
})
export class SuscripcionClubComponent implements OnInit {
  loading = true;
  datosCargados = false;
  currentUser: User | null = null;
  clubId = 0;
  profileId = 0;

  // Plan selection
  plans: ClubPlan[] = [];
  selectedPlan: ClubPlanType | null = null;

  // Active subscription
  subscription: ClubSubscription | null = null;
  showCancelConfirm = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private translate: TranslateService,
    private subscriptionService: ClubSubscriptionService,
    private loginService: LoginService
  ) {}

  ngOnInit(): void {
    this.loginService.usuarioActual.subscribe((user: User | null) => {
      this.currentUser = user;
      if (user) {
        this.profileId = user.profileType?.profileId || 0;

        // Solo el perfil Club (1) puede acceder a la suscripción de club
        if (this.profileId !== 1) {
          this.router.navigate(['/dashboard/inicio']);
          return;
        }

        this.clubId = user.userId || 0;
        this.loadData();
        
        // Escuchar parámetros de consulta para detectar cuando se activa un plan
        this.route.queryParams.subscribe(params => {
          if (params['planActivated'] === 'true') {
            console.log('Plan activated detected, reloading data...');
            // Recargar los datos después de activar un plan
            setTimeout(() => this.loadData(), 500);
            // Limpiar el parámetro de la URL
            this.router.navigate([], {
              relativeTo: this.route,
              queryParams: {}
            });
          }
        });
      }
    });
  }

  goBack(): void {
    this.location.back();
  }

  loadData(): void {
    this.loading = true;
    this.datosCargados = false;
    // Load current subscription with clubId
    this.subscriptionService.getCurrentClubPlan(this.clubId).subscribe(result => {
      if (result.success && result.plan) {
        // Mapear el plan actual al formato esperado por el componente
        this.subscription = {
          subscriptionId: result.plan.id,
          clubId: result.plan.clubId,
          planType: result.plan.planType,
          status: result.plan.status,
          period: 'monthly',
          startDate: result.plan.startDate,
          endDate: result.plan.endDate,
          stripeConnectAccountId: result.plan.stripeConnectAccountId,
          clubCommissionPercent: result.plan.clubCommissionPercent || 0
        };
      } else {
        this.subscription = null;
      }
      // Load available plans
      this.subscriptionService.getAvailablePlans().subscribe(plans => {
        this.plans = plans;
        this.loading = false;
        this.datosCargados = true;
      });
    });
  }

  selectPlan(planType: ClubPlanType): void {
    this.selectedPlan = planType;
    this.router.navigate(['/dashboard/suscripcion-club/wizard', planType]);
  }

  getPlanIcon(planType: ClubPlanType): string {
    switch (planType) {
      case 'familia': return 'bi-people-fill';
      case 'club': return 'bi-building';
      case 'gratuito': return 'bi-gift';
      default: return 'bi-star';
    }
  }

  getPlanColorClass(planType: ClubPlanType): string {
    switch (planType) {
      case 'familia': return 'plan-familia';
      case 'club': return 'plan-club';
      case 'gratuito': return 'plan-free';
      default: return '';
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'active': return 'badge-active';
      case 'past_due': return 'badge-warning';
      case 'cancelled': return 'badge-danger';
      case 'trialing': return 'badge-info';
      default: return 'badge-secondary';
    }
  }

  confirmCancel(): void {
    this.showCancelConfirm = true;
  }

  cancelSubscription(): void {
    if (this.clubId) {
      this.subscriptionService.cancelClubSubscription(this.clubId).subscribe(res => {
        if (res.success) {
          this.subscription = null;
          this.showCancelConfirm = false;
        }
      });
    }
  }

  dismissCancel(): void {
    this.showCancelConfirm = false;
  }

  changePlan(): void {
    // Reset subscription to show plan selection
    this.subscription = null;
    // Recargar los planes disponibles
    this.loadData();
  }

  getParentRegistrationUrl(): string {
    return this.subscriptionService.getParentRegistrationUrl(this.clubId);
  }

  copyRegistrationUrl(): void {
    const url = this.getParentRegistrationUrl();
    navigator.clipboard.writeText(url).then(() => {
      // Show success feedback
      this.urlCopied = true;
      setTimeout(() => this.urlCopied = false, 3000);
    });
  }

  urlCopied = false;
}
