import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Location } from '@angular/common';
import { ClubSubscriptionService } from 'src/app/core/services/subscription/club-subscription.service';
import { LoginService } from 'src/app/core/services/login/login.service';
import { User } from 'src/app/core/models/users/user.model';
import {
  PlanPeriod,
} from 'src/app/core/models/subscription/club-subscription.model';

type WizardStep = 'pricing' | 'share';

@Component({
  selector: 'app-wizard-familia',
  templateUrl: './wizard-familia.component.html',
  styleUrls: ['./wizard-familia.component.scss']
})
export class WizardFamiliaComponent implements OnInit {
  currentStep: WizardStep = 'pricing';
  steps: WizardStep[] = ['pricing', 'share'];

  currentUser: User | null = null;
  clubId = 0;
  loading = false;

  // Step 1: Pricing & Revenue Estimation
  selectedPeriod: PlanPeriod = 'monthly';
  estimatedPlayers = 0;

  // Step 2: Share URL
  registrationUrl = '';
  urlCopied = false;

  // Activating plan
  activating = false;

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
        // Solo el perfil Club (1) puede acceder a los wizards de suscripción de club
        if ((user.profileType?.profileId || 0) !== 1) {
          this.router.navigate(['/dashboard/inicio']);
          return;
        }
        this.clubId = user.userId || 0;
        this.registrationUrl = this.subscriptionService.getParentRegistrationUrl(this.clubId);
      }
    });
  }

  goBack(): void {
    if (this.currentStep === 'pricing') {
      this.location.back();
    } else {
      const idx = this.steps.indexOf(this.currentStep);
      if (idx > 0) {
        this.currentStep = this.steps[idx - 1];
      }
    }
  }

  nextStep(): void {
    const idx = this.steps.indexOf(this.currentStep);
    if (idx < this.steps.length - 1) {
      this.currentStep = this.steps[idx + 1];
    }
  }

  goToStep(step: WizardStep): void {
    const targetIdx = this.steps.indexOf(step);
    const currentIdx = this.steps.indexOf(this.currentStep);
    if (targetIdx <= currentIdx + 1) {
      this.currentStep = step;
    }
  }

  getStepIndex(): number {
    return this.steps.indexOf(this.currentStep);
  }

  isStepCompleted(step: WizardStep): boolean {
    const stepIdx = this.steps.indexOf(step);
    const currentIdx = this.steps.indexOf(this.currentStep);
    return stepIdx < currentIdx;
  }

  // ── Step 1: Pricing & Revenue Estimation ─────────────
  get monthlyPrice(): number { return 2.99; }
  get annualPrice(): number { return 29.99; }
  get clubShareMonthly(): number { return 1.00; }
  get clubShareAnnual(): number { return 10.00; }

  get annualSaving(): string {
    const monthlyCostYear = this.monthlyPrice * 12;
    const saving = monthlyCostYear - this.annualPrice;
    return saving.toFixed(2);
  }

  selectPeriod(period: PlanPeriod): void {
    this.selectedPeriod = period;
  }

  incrementPlayers(): void {
    this.estimatedPlayers++;
  }

  decrementPlayers(): void {
    if (this.estimatedPlayers > 0) {
      this.estimatedPlayers--;
    }
  }

  onPlayerCountInput(event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    this.estimatedPlayers = isNaN(value) || value < 0 ? 0 : value;
  }

  get estimatedClubRevenueMonthly(): number {
    return +(this.estimatedPlayers * this.clubShareMonthly).toFixed(2);
  }

  get estimatedClubRevenueAnnual(): number {
    return +(this.estimatedPlayers * this.clubShareAnnual).toFixed(2);
  }

  get estimatedClubRevenue(): number {
    return this.selectedPeriod === 'monthly'
      ? this.estimatedClubRevenueMonthly
      : this.estimatedClubRevenueAnnual;
  }

  get estimatedClubRevenueYearly(): number {
    return this.selectedPeriod === 'monthly'
      ? +(this.estimatedClubRevenueMonthly * 12).toFixed(2)
      : this.estimatedClubRevenueAnnual;
  }

  // ── Step 2: Share URL ────────────────────────────────
  copyUrl(): void {
    navigator.clipboard.writeText(this.registrationUrl).then(() => {
      this.urlCopied = true;
      setTimeout(() => this.urlCopied = false, 3000);
    });
  }

  shareViaWhatsApp(): void {
    const text = this.translate.instant('CLUB_PLANS.WIZARD_FAMILIA.SHARE_MESSAGE', { url: this.registrationUrl });
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }

  shareViaEmail(): void {
    const subject = this.translate.instant('CLUB_PLANS.WIZARD_FAMILIA.SHARE_SUBJECT');
    const body = this.translate.instant('CLUB_PLANS.WIZARD_FAMILIA.SHARE_MESSAGE', { url: this.registrationUrl });
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  }

  // ── Activate Plan ────────────────────────────────────
  activatePlan(): void {
    this.activating = true;
    this.subscriptionService.activateFamiliaPlan(this.clubId, this.selectedPeriod).subscribe({
      next: () => {
        this.activating = false;
        this.router.navigate(['/dashboard/suscripcion-club']);
      },
      error: () => {
        this.activating = false;
      }
    });
  }
}
