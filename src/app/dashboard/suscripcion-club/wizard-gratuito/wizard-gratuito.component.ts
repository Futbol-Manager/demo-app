import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { Location } from '@angular/common';
import { ClubSubscriptionService } from 'src/app/core/services/subscription/club-subscription.service';
import { LoginService } from 'src/app/core/services/login/login.service';
import { User } from 'src/app/core/models/users/user.model';
import {
  CommissionConfig,
  StripeConnectOnboarding,
} from 'src/app/core/models/subscription/club-subscription.model';

type WizardStep = 'register' | 'connect' | 'commission' | 'confirm';

@Component({
  selector: 'app-wizard-gratuito',
  templateUrl: './wizard-gratuito.component.html',
  styleUrls: ['./wizard-gratuito.component.scss']
})
export class WizardGratuitoComponent implements OnInit {
  currentStep: WizardStep = 'register';
  steps: WizardStep[] = ['register', 'connect', 'commission', 'confirm'];

  currentUser: User | null = null;
  clubId = 0;
  loading = false;

  // Step 1: Basic Registration
  registerForm!: FormGroup;

  // Step 2: Stripe Connect
  connectStatus: 'not_started' | 'pending' | 'active' | 'restricted' = 'not_started';
  connectLoading = false;

  // Step 3: Commission Configuration
  commissionConfig: CommissionConfig | null = null;
  clubCommissionPercent = 0;
  exampleAmount = 50;
  sphairaCut = 3;
  fixedFee = 0.25;

  // Step 4: Confirmation
  submitting = false;

  constructor(
    private router: Router,
    private location: Location,
    private fb: FormBuilder,
    private translate: TranslateService,
    private subscriptionService: ClubSubscriptionService,
    private loginService: LoginService
  ) {}

  ngOnInit(): void {
    this.initRegisterForm();
    this.loginService.usuarioActual.subscribe((user: User | null) => {
      this.currentUser = user;
      if (user) {
        // Solo el perfil Club (1) puede acceder a los wizards de suscripción de club
        if ((user.profileType?.profileId || 0) !== 1) {
          this.router.navigate(['/dashboard/inicio']);
          return;
        }
        this.clubId = user.userId || 0;
        this.loadCommissionConfig();
        this.checkConnectStatus();
      }
    });
  }

  goBack(): void {
    if (this.currentStep === 'register') {
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
    return this.steps.indexOf(step) < this.steps.indexOf(this.currentStep);
  }

  // ── Step 1: Basic Registration ───────────────────────
  initRegisterForm(): void {
    this.registerForm = this.fb.group({
      clubName: ['', [Validators.required, Validators.minLength(3)]],
      contactEmail: ['', [Validators.required, Validators.email]],
      contactPhone: ['', [Validators.required, Validators.pattern(/^[6-9]\d{8}$/)]],
      city: ['', Validators.required],
    });
  }

  isRegisterFormValid(): boolean {
    return this.registerForm.valid;
  }

  // ── Step 2: Stripe Connect ───────────────────────────
  checkConnectStatus(): void {
    this.subscriptionService.getStripeConnectStatus(this.clubId).subscribe(status => {
      this.connectStatus = status.status || 'not_started';
    });
  }

  initiateStripeConnect(): void {
    this.connectLoading = true;
    this.subscriptionService.initiateStripeConnect(this.clubId).subscribe(res => {
      if (res.onboardingUrl) {
        // In production, redirect to Stripe Connect onboarding
        // For mock, simulate success
        window.open(res.onboardingUrl, '_blank');
        // After redirect back, status would be checked
        setTimeout(() => {
          this.connectStatus = 'active';
          this.connectLoading = false;
        }, 2000);
      } else {
        this.connectLoading = false;
      }
    });
  }

  // ── Step 3: Commission Configuration ─────────────────
  loadCommissionConfig(): void {
    this.subscriptionService.getDefaultCommissionConfig().subscribe(config => {
      this.commissionConfig = config;
      this.sphairaCut = config.sphairaPercent;
      this.fixedFee = config.fixedFeePerTransaction;
      this.clubCommissionPercent = config.clubPercent;
    });
  }

  onClubCommissionChange(value: number): void {
    this.clubCommissionPercent = Math.max(0, Math.min(50, value));
    this.recalculateCommission();
  }

  onSliderChange(event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.clubCommissionPercent = value;
    this.recalculateCommission();
  }

  recalculateCommission(): void {
    this.subscriptionService.recalculateCommission(
      this.exampleAmount,
      this.clubCommissionPercent
    ).subscribe(result => {
      // Update example calculations
    });
  }

  onExampleAmountChange(event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.exampleAmount = isNaN(value) || value < 0 ? 0 : value;
  }

  get totalCommissionPercent(): number {
    return this.sphairaCut + this.clubCommissionPercent;
  }

  get exampleSphairaFee(): number {
    return +(this.exampleAmount * this.sphairaCut / 100 + this.fixedFee).toFixed(2);
  }

  get exampleClubFee(): number {
    return +(this.exampleAmount * this.clubCommissionPercent / 100).toFixed(2);
  }

  get exampleTotalFee(): number {
    return +(this.exampleSphairaFee + this.exampleClubFee).toFixed(2);
  }

  get exampleParentPays(): number {
    return +(this.exampleAmount + this.exampleTotalFee).toFixed(2);
  }

  // ── Step 4: Confirmation ─────────────────────────────
  confirmSetup(): void {
    this.submitting = true;

    // Create the subscription with free plan
    this.subscriptionService.createCheckoutSession(
      this.clubId,
      'gratuito',
      'annual'
    ).subscribe(res => {
      // Free plan - no payment needed, just activate
      this.submitting = false;
      this.router.navigate(['/dashboard/suscripcion-club']);
    });
  }
}
