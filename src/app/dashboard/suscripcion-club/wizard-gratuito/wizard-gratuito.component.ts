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
        this.loadClubDataForForm();
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

  loadClubDataForForm(): void {
    if (this.clubId) {
      this.subscriptionService.getClubDataForForm(this.clubId).subscribe({
        next: (clubData) => {
          if (clubData) {
            this.registerForm.patchValue({
              clubName: clubData.clubName || '',
              contactEmail: clubData.email || '',
              contactPhone: clubData.phone || '',
              city: clubData.city || ''
            });
          } else {
            this.loadFallbackData();
          }
        },
        error: (error) => {
          this.loadFallbackData();
        }
      });
    }
  }

  loadFallbackData(): void {
    // Datos de respaldo basados en el usuario actual
    const clubName = this.currentUser?.firstName 
      ? `Club ${this.currentUser.firstName} ${this.currentUser.secondName || ''}`.trim()
      : 'Mi Club Deportivo';
    
    const fallbackData = {
      clubName: clubName,
      contactEmail: this.currentUser?.mail || '',
      contactPhone: this.currentUser?.mobile || '',
      city: 'Madrid' // Valor por defecto
    };
    
    this.registerForm.patchValue(fallbackData);
  }

  isRegisterFormValid(): boolean {
    return this.registerForm.valid;
  }

  // ── Step 2: Stripe Connect ───────────────────────────
  checkConnectStatus(): void {
    if (this.clubId) {
      this.subscriptionService.checkGratuitoStatus(this.clubId).subscribe({
        next: (response) => {
          if (response.success && response.connected) {
            this.connectStatus = 'active';
          } else {
            this.connectStatus = 'not_started';
          }
        },
        error: (error) => {
          console.error('Error checking connect status:', error);
          this.connectStatus = 'not_started';
        }
      });
    }
  }

  initiateStripeConnect(): void {
    this.connectLoading = true;
    const email = this.registerForm.get('contactEmail')?.value || '';
    
    // Crear cuenta Stripe automáticamente
    this.subscriptionService.createStripeAccount(this.clubId, email).subscribe({
      next: (result) => {
        if (result.success) {
          // Cuenta creada exitosamente
          this.connectStatus = 'active';
          this.connectLoading = false;
          
          // Auto avanzar al siguiente paso después de 1.5 segundos
          setTimeout(() => {
            this.nextStep();
          }, 1500);
        } else {
          console.error('Error creando cuenta Stripe:', result.error);
          this.connectStatus = 'restricted';
          this.connectLoading = false;
        }
      },
      error: (error) => {
        console.error('Error iniciando creación de cuenta:', error);
        this.connectStatus = 'restricted';
        this.connectLoading = false;
      }
    });
  }

  // ── Step 3: Commission Configuration ─────────────────
  loadCommissionConfig(): void {
    if (this.clubId) {
      this.subscriptionService.getGratuitoConfig(this.clubId).subscribe({
        next: (response) => {
          if (response.success && response.config) {
            this.commissionConfig = response.config;
            this.sphairaCut = response.config.sphairaPercent || 3;
            this.fixedFee = response.config.fixedFeePerTransaction || 0.25;
            this.clubCommissionPercent = response.config.clubPercent || 0;
          } else {
            // Valores por defecto si no hay configuración
            this.sphairaCut = 3;
            this.fixedFee = 0.25;
            this.clubCommissionPercent = 0;
          }
        },
        error: (error) => {
          console.error('Error loading commission config:', error);
          // Valores por defecto en caso de error
          this.sphairaCut = 3;
          this.fixedFee = 0.25;
          this.clubCommissionPercent = 0;
        }
      });
    }
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
    // Las calculaciones se realizan automáticamente en los getters locales
    // No es necesario hacer llamadas al servidor para cálculos simples
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

    // Para el plan gratuito, si el usuario llegó hasta aquí es porque ya completó
    // los pasos anteriores, incluyendo la creación de cuenta Stripe
    if (this.connectStatus === 'active') {
      // La conexión ya se verificó en pasos anteriores, proceder directamente
      this.activatePlan();
    } else {
      // Verificar una última vez el estado de Stripe Connect
      this.subscriptionService.checkGratuitoStatus(this.clubId).subscribe({
        next: (status) => {
          if (status.success && status.connected) {
            // El onboarding está completo, ahora activar el plan gratuito
            this.activatePlan();
          } else {
            // Como es plan gratuito y el usuario completó el wizard, activar anyway
            console.warn('Stripe Connect verification failed, but proceeding with free plan activation');
            this.activatePlan();
          }
        },
        error: (error) => {
          console.error('Error checking status for confirmation:', error);
          // Como es plan gratuito, activar de todas formas
          console.warn('Proceeding with free plan activation despite verification error');
          this.activatePlan();
        }
      });
    }
  }

  private activatePlan(): void {
    this.subscriptionService.activateGratuitoPlan(this.clubId).subscribe({
      next: (response) => {
        this.submitting = false;
        if (response.status === 200) {
          console.log('Plan gratuito activado exitosamente');
          // Navegar a la página de suscripciones donde se mostrará el plan activo
          this.router.navigate(['/dashboard/suscripcion-club'], {
            queryParams: { planActivated: 'true' }
          });
        } else {
          console.error('Error activando el plan:', response.error);
        }
      },
      error: (error) => {
        this.submitting = false;
        console.error('Error activando el plan gratuito:', error);
      }
    });
  }
}
