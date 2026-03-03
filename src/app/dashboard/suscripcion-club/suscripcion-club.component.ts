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
  activePlanInfo: ClubPlan | null = null;

  // Active subscription
  subscription: ClubSubscription | null = null;
  showCancelConfirm = false;
  editingClubCommission = false;
  commissionDraft = 0;
  savingClubCommission = false;
  commissionEditError = '';
  readonly maxClubCommissionPercent = 30;

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
          stripeConnectOnboardingUrl: result.plan.stripeConnectOnboardingUrl,
          stripeConnectStatus: result.plan.stripeConnectStatus || 'not_started',
          clubCommissionPercent: result.plan.clubCommissionPercent || 0
        };
        this.commissionDraft = this.subscription.clubCommissionPercent || 0;
        this.editingClubCommission = false;
        this.commissionEditError = '';
      } else {
        this.subscription = null;
        this.activePlanInfo = null;
      }
      // Load available plans
      this.subscriptionService.getAvailablePlans().subscribe(plans => {
        this.plans = [...plans].sort((a, b) => this.getPlanOrder(a.id) - this.getPlanOrder(b.id));
        this.syncActivePlanInfo();
        this.loading = false;
        this.datosCargados = true;
      });
    });
  }

  private syncActivePlanInfo(): void {
    if (!this.subscription) {
      this.activePlanInfo = null;
      return;
    }

    this.activePlanInfo = this.plans.find(plan => plan.id === this.subscription?.planType) || null;
  }

  private getPlanOrder(planType: ClubPlanType): number {
    switch (planType) {
      case 'gratuito':
        return 0;
      case 'familia':
        return 1;
      case 'club':
        return 2;
      default:
        return 99;
    }
  }

  selectPlan(planType: ClubPlanType): void {
    if (this.isPlanComingSoon(planType)) {
      return;
    }
    this.selectedPlan = planType;
    this.router.navigate(['/dashboard/suscripcion-club/wizard', planType]);
  }

  isPlanComingSoon(planType: ClubPlanType): boolean {
    return planType !== 'gratuito';
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
    this.activePlanInfo = null;
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

  openStripe(): void {
    const accountId = this.subscription?.stripeConnectAccountId;
    const url = accountId
      ? `https://dashboard.stripe.com/${accountId}/dashboard`
      : (this.subscription?.stripeConnectOnboardingUrl || 'https://dashboard.stripe.com');

    window.open(url, '_blank', 'noopener,noreferrer');
  }

  startEditClubCommission(): void {
    if (!this.subscription || this.subscription.planType !== 'gratuito') return;
    this.commissionDraft = this.subscription.clubCommissionPercent ?? 0;
    this.editingClubCommission = true;
    this.commissionEditError = '';
  }

  cancelEditClubCommission(): void {
    this.editingClubCommission = false;
    this.commissionDraft = this.subscription?.clubCommissionPercent ?? 0;
    this.commissionEditError = '';
  }

  saveClubCommission(): void {
    if (!this.subscription || this.subscription.planType !== 'gratuito' || this.savingClubCommission) return;

    const normalizedValue = Number(this.commissionDraft);
    if (Number.isNaN(normalizedValue) || normalizedValue < 0 || normalizedValue > this.maxClubCommissionPercent) {
      this.commissionEditError = `El porcentaje debe estar entre 0 y ${this.maxClubCommissionPercent}.`;
      return;
    }

    this.savingClubCommission = true;
    this.commissionEditError = '';

    this.subscriptionService.saveGratuitoConfig(this.clubId, normalizedValue).subscribe(response => {
      if (response?.success) {
        if (this.subscription) {
          this.subscription.clubCommissionPercent = normalizedValue;
        }
        this.commissionDraft = normalizedValue;
        this.editingClubCommission = false;
      } else {
        this.commissionEditError = response?.error || 'No se pudo guardar la comisión.';
      }
      this.savingClubCommission = false;
    }, () => {
      this.commissionEditError = 'No se pudo guardar la comisión.';
      this.savingClubCommission = false;
    });
  }

  urlCopied = false;
}
