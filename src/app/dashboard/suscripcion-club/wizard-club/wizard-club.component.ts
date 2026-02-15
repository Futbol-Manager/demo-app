import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { Location } from '@angular/common';
import { ClubSubscriptionService } from 'src/app/core/services/subscription/club-subscription.service';
import { LoginService } from 'src/app/core/services/login/login.service';
import { User } from 'src/app/core/models/users/user.model';
import {
  ClubEntityRegistration,
  ClubPlanCalculation,
  ContractData,
  CurrencyInfo,
} from 'src/app/core/models/subscription/club-subscription.model';

type WizardStep = 'entity' | 'players' | 'contract' | 'payment';

@Component({
  selector: 'app-wizard-club',
  templateUrl: './wizard-club.component.html',
  styleUrls: ['./wizard-club.component.scss']
})
export class WizardClubComponent implements OnInit {
  currentStep: WizardStep = 'entity';
  steps: WizardStep[] = ['entity', 'players', 'contract', 'payment'];

  currentUser: User | null = null;
  clubId = 0;
  loading = false;

  // Currency
  currencies: CurrencyInfo[] = [];
  selectedCurrency!: CurrencyInfo;
  showCurrencyDropdown = false;
  readonly BASE_PRICE_EUR = 5.00;

  // Step 1: Entity Registration
  entityForm!: FormGroup;

  // Step 2: Player Count
  playerCount = 0;
  calculation: ClubPlanCalculation | null = null;
  calculatingPrice = false;

  // Step 3: Contract
  contractData: ContractData | null = null;
  contractScrolledToEnd = false;
  contractAccepted = false;
  signatureName = '';

  // Step 4: Payment
  processingPayment = false;

  constructor(
    private router: Router,
    private location: Location,
    private fb: FormBuilder,
    private translate: TranslateService,
    private subscriptionService: ClubSubscriptionService,
    private loginService: LoginService
  ) {}

  ngOnInit(): void {
    // Init currency
    this.currencies = this.subscriptionService.getAvailableCurrencies();
    this.selectedCurrency = this.subscriptionService.getDefaultCurrency();

    this.initEntityForm();
    this.loginService.usuarioActual.subscribe((user: User | null) => {
      this.currentUser = user;
      if (user) {
        // Solo el perfil Club (1) puede acceder a los wizards de suscripción de club
        if ((user.profileType?.profileId || 0) !== 1) {
          this.router.navigate(['/dashboard/inicio']);
          return;
        }
        this.clubId = user.userId || 0;
      }
    });
  }

  // ── Currency helpers ─────────────────────────────────
  get localPricePerPlayer(): number {
    return this.subscriptionService.convertToLocal(this.BASE_PRICE_EUR, this.selectedCurrency);
  }

  get isEuro(): boolean {
    return this.selectedCurrency.code === 'EUR';
  }

  toggleCurrencyDropdown(): void {
    this.showCurrencyDropdown = !this.showCurrencyDropdown;
  }

  selectCurrency(currency: CurrencyInfo): void {
    this.selectedCurrency = currency;
    this.showCurrencyDropdown = false;
    if (this.playerCount > 0) {
      this.recalculate();
    }
  }

  // ── Navigation ───────────────────────────────────────
  goBack(): void {
    if (this.currentStep === 'entity') {
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
      if (this.currentStep === 'contract') {
        this.buildContractData();
      }
    }
  }

  goToStep(step: WizardStep): void {
    const targetIdx = this.steps.indexOf(step);
    const currentIdx = this.steps.indexOf(this.currentStep);
    if (targetIdx <= currentIdx + 1) {
      this.currentStep = step;
      if (step === 'contract') {
        this.buildContractData();
      }
    }
  }

  getStepIndex(): number {
    return this.steps.indexOf(this.currentStep);
  }

  isStepCompleted(step: WizardStep): boolean {
    return this.steps.indexOf(step) < this.steps.indexOf(this.currentStep);
  }

  // ── Step 1: Entity Registration ──────────────────────
  initEntityForm(): void {
    this.entityForm = this.fb.group({
      clubName: ['', [Validators.required, Validators.minLength(3)]],
      taxId: ['', [Validators.required, Validators.minLength(4)]],
      address: ['', Validators.required],
      city: ['', Validators.required],
      postalCode: ['', Validators.required],
      country: ['', Validators.required],
      responsibleName: ['', Validators.required],
      responsibleId: ['', Validators.required],
      responsibleEmail: ['', [Validators.required, Validators.email]],
      responsiblePhone: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  isEntityFormValid(): boolean {
    return this.entityForm.valid;
  }

  // ── Step 2: Player Count ─────────────────────────────
  incrementPlayers(): void {
    this.playerCount++;
    this.recalculate();
  }

  decrementPlayers(): void {
    if (this.playerCount > 0) {
      this.playerCount--;
      this.recalculate();
    }
  }

  onPlayerCountInput(event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    this.playerCount = isNaN(value) || value < 0 ? 0 : value;
    this.recalculate();
  }

  recalculate(): void {
    if (this.playerCount <= 0) {
      this.calculation = null;
      return;
    }
    this.calculatingPrice = true;
    this.subscriptionService.calculateClubPlan(this.playerCount, this.selectedCurrency).subscribe(calc => {
      this.calculation = calc;
      this.calculatingPrice = false;
    });
  }

  // ── Step 3: Contract ─────────────────────────────────
  buildContractData(): void {
    const entity = this.entityForm.value;
    const calc = this.calculation;
    this.contractData = {
      clubName: entity.clubName,
      taxId: entity.taxId,
      country: entity.country,
      responsibleName: entity.responsibleName,
      responsibleId: entity.responsibleId,
      playerCount: this.playerCount,
      pricePerPlayer: this.BASE_PRICE_EUR,
      totalBase: calc?.subtotal || (this.playerCount * this.BASE_PRICE_EUR),
      tax: calc?.taxAmount || 0,
      taxPercent: calc?.taxPercent || 0,
      totalWithTax: calc?.total || 0,
      currencyCode: this.selectedCurrency.code,
      currencySymbol: this.selectedCurrency.symbol,
      date: new Date().toLocaleDateString(this.translate.currentLang || 'es'),
      signatureUrl: '',
    };
  }

  onContractScroll(event: Event): void {
    const el = event.target as HTMLElement;
    const threshold = 50;
    this.contractScrolledToEnd = (el.scrollHeight - el.scrollTop - el.clientHeight) < threshold;
  }

  toggleContractAccepted(): void {
    this.contractAccepted = !this.contractAccepted;
  }

  isContractStepValid(): boolean {
    return this.contractScrolledToEnd && this.contractAccepted && this.signatureName.trim().length > 3;
  }

  submitContract(): void {
    if (!this.contractData || !this.isContractStepValid()) return;

    this.contractData.signatureUrl = this.signatureName;
    this.subscriptionService.submitContract(this.contractData).subscribe(res => {
      if (res.success) {
        this.nextStep();
      }
    });
  }

  // ── Step 4: Payment ──────────────────────────────────
  processPayment(): void {
    this.processingPayment = true;

    this.subscriptionService.createCheckoutSession(
      this.clubId,
      'club',
      'annual'
    ).subscribe(res => {
      if (res.url) {
        window.location.href = res.url;
      } else {
        this.processingPayment = false;
        this.router.navigate(['/dashboard/suscripcion-club']);
      }
    });
  }
}
