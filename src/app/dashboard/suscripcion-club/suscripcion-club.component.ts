import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
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
      }
    });
  }

  goBack(): void {
    this.location.back();
  }

  loadData(): void {
    this.loading = true;
    // Load current subscription
    this.subscriptionService.getCurrentSubscription(this.clubId).subscribe(sub => {
      this.subscription = sub;
      // Load available plans
      this.subscriptionService.getAvailablePlans().subscribe(plans => {
        this.plans = plans;
        this.loading = false;
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
    if (this.subscription?.subscriptionId) {
      this.subscriptionService.cancelSubscription(this.subscription.subscriptionId).subscribe(res => {
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
    this.subscriptionService.setSubscription(null);
    this.subscription = null;
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
