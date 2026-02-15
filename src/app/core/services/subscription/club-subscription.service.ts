import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  ClubSubscription,
  ClubPlan,
  ClubPlanType,
  ClubPlanCalculation,
  ContractData,
  ClubEntityRegistration,
  CommissionConfig,
  StripeConnectOnboarding,
  DuplicateCheckRequest,
  DuplicateCheckResponse,
  PlayerDashboardEntry,
  PlayerRegistration,
  ParentRegistration,
  LockedFeature,
  ClubSubscriptionStatus,
  CurrencyInfo,
} from '../../models/subscription/club-subscription.model';

@Injectable({
  providedIn: 'root'
})
export class ClubSubscriptionService {

  private apiUrl = environment.apiUrl;

  // Current club subscription state (mock)
  private currentSubscription$ = new BehaviorSubject<ClubSubscription | null>(null);

  // Reference price in EUR
  private readonly BASE_PRICE_EUR = 5.00;

  // Static exchange rates (mock — replace with real API)
  private readonly CURRENCY_MAP: Record<string, CurrencyInfo> = {
    EUR: { code: 'EUR', symbol: '€', rate: 1, name: 'Euro' },
    USD: { code: 'USD', symbol: '$', rate: 1.08, name: 'US Dollar' },
    GBP: { code: 'GBP', symbol: '£', rate: 0.86, name: 'British Pound' },
    MXN: { code: 'MXN', symbol: '$', rate: 18.50, name: 'Peso Mexicano' },
    ARS: { code: 'ARS', symbol: '$', rate: 950.00, name: 'Peso Argentino' },
    CLP: { code: 'CLP', symbol: '$', rate: 1020.00, name: 'Peso Chileno' },
    COP: { code: 'COP', symbol: '$', rate: 4350.00, name: 'Peso Colombiano' },
    BRL: { code: 'BRL', symbol: 'R$', rate: 5.30, name: 'Real Brasileño' },
    PEN: { code: 'PEN', symbol: 'S/', rate: 3.95, name: 'Sol Peruano' },
    UYU: { code: 'UYU', symbol: '$', rate: 42.00, name: 'Peso Uruguayo' },
    JPY: { code: 'JPY', symbol: '¥', rate: 162.00, name: 'Japanese Yen' },
    CHF: { code: 'CHF', symbol: 'CHF', rate: 0.95, name: 'Swiss Franc' },
    SEK: { code: 'SEK', symbol: 'kr', rate: 11.20, name: 'Swedish Krona' },
    NOK: { code: 'NOK', symbol: 'kr', rate: 11.50, name: 'Norwegian Krone' },
    DKK: { code: 'DKK', symbol: 'kr', rate: 7.46, name: 'Danish Krone' },
    PLN: { code: 'PLN', symbol: 'zł', rate: 4.32, name: 'Polish Złoty' },
    CZK: { code: 'CZK', symbol: 'Kč', rate: 25.30, name: 'Czech Koruna' },
    AUD: { code: 'AUD', symbol: 'A$', rate: 1.65, name: 'Australian Dollar' },
    CAD: { code: 'CAD', symbol: 'C$', rate: 1.47, name: 'Canadian Dollar' },
    TRY: { code: 'TRY', symbol: '₺', rate: 34.00, name: 'Turkish Lira' },
    INR: { code: 'INR', symbol: '₹', rate: 90.00, name: 'Indian Rupee' },
    MAD: { code: 'MAD', symbol: 'MAD', rate: 10.80, name: 'Moroccan Dirham' },
  };

  constructor(private http: HttpClient) {}

  // ─── Currency ───────────────────────────────────────────────
  getAvailableCurrencies(): CurrencyInfo[] {
    return Object.values(this.CURRENCY_MAP)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  getCurrency(code: string): CurrencyInfo {
    return this.CURRENCY_MAP[code] || this.CURRENCY_MAP['EUR'];
  }

  getDefaultCurrency(): CurrencyInfo {
    // Try to detect from browser locale
    try {
      const locale = navigator.language || 'es-ES';
      const parts = locale.split('-');
      const country = (parts[1] || parts[0]).toUpperCase();
      const countryToCurrency: Record<string, string> = {
        ES: 'EUR', FR: 'EUR', DE: 'EUR', IT: 'EUR', PT: 'EUR', NL: 'EUR', BE: 'EUR', AT: 'EUR', IE: 'EUR', FI: 'EUR', GR: 'EUR',
        US: 'USD', GB: 'GBP', MX: 'MXN', AR: 'ARS', CL: 'CLP', CO: 'COP', BR: 'BRL', PE: 'PEN', UY: 'UYU',
        JP: 'JPY', CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN', CZ: 'CZK',
        AU: 'AUD', CA: 'CAD', TR: 'TRY', IN: 'INR', MA: 'MAD',
      };
      const currCode = countryToCurrency[country] || 'EUR';
      return this.getCurrency(currCode);
    } catch {
      return this.CURRENCY_MAP['EUR'];
    }
  }

  convertToLocal(eurAmount: number, currency: CurrencyInfo): number {
    return +(eurAmount * currency.rate).toFixed(2);
  }

  // ─── Plan Definitions ───────────────────────────────────────
  getAvailablePlans(): Observable<ClubPlan[]> {
    const plans: ClubPlan[] = [
      {
        id: 'familia',
        nameKey: 'CLUB_PLANS.PLAN_FAMILIA.NAME',
        descriptionKey: 'CLUB_PLANS.PLAN_FAMILIA.DESCRIPTION',
        pricing: {
          monthly: 2.99,
          annual: 29.99,
          clubShareMonthly: 1.00,
          clubShareAnnual: 10.00,
        },
        features: [
          { key: 'CLUB_PLANS.FEATURES.PARENT_PAYS', included: true },
          { key: 'CLUB_PLANS.FEATURES.CLUB_REVENUE', included: true },
          { key: 'CLUB_PLANS.FEATURES.STRIPE_CONNECT', included: true },
          { key: 'CLUB_PLANS.FEATURES.MASS_REGISTRATION', included: true },
          { key: 'CLUB_PLANS.FEATURES.PLAYER_DASHBOARD', included: true },
          { key: 'CLUB_PLANS.FEATURES.COACH_MODULE', included: true },
          { key: 'CLUB_PLANS.FEATURES.STATS_PRO', included: true },
          { key: 'CLUB_PLANS.FEATURES.VIDEO_ANALYSIS', included: true },
          { key: 'CLUB_PLANS.FEATURES.INJURIES', included: true },
          { key: 'CLUB_PLANS.FEATURES.DOCUMENTS', included: true },
          { key: 'CLUB_PLANS.FEATURES.PAYMENTS_MODULE', included: true },
        ],
      },
      {
        id: 'club',
        nameKey: 'CLUB_PLANS.PLAN_CLUB.NAME',
        descriptionKey: 'CLUB_PLANS.PLAN_CLUB.DESCRIPTION',
        pricing: {
          perPlayer: 5.00,
        },
        features: [
          { key: 'CLUB_PLANS.FEATURES.CLUB_PAYS', included: true },
          { key: 'CLUB_PLANS.FEATURES.ALL_MODULES', included: true },
          { key: 'CLUB_PLANS.FEATURES.COACH_MODULE', included: true },
          { key: 'CLUB_PLANS.FEATURES.STATS_PRO', included: true },
          { key: 'CLUB_PLANS.FEATURES.VIDEO_ANALYSIS', included: true },
          { key: 'CLUB_PLANS.FEATURES.INJURIES', included: true },
          { key: 'CLUB_PLANS.FEATURES.DOCUMENTS', included: true },
          { key: 'CLUB_PLANS.FEATURES.PAYMENTS_MODULE', included: true },
          { key: 'CLUB_PLANS.FEATURES.DIGITAL_CONTRACT', included: true },
          { key: 'CLUB_PLANS.FEATURES.PRIORITY_SUPPORT', included: true },
          { key: 'CLUB_PLANS.FEATURES.EXPORT_FEDERATION', included: true },
        ],
        recommended: true,
      },
      {
        id: 'gratuito',
        nameKey: 'CLUB_PLANS.PLAN_FREE.NAME',
        descriptionKey: 'CLUB_PLANS.PLAN_FREE.DESCRIPTION',
        pricing: {
          sphairaCut: 3,
          fixedFee: 0.25,
        },
        features: [
          { key: 'CLUB_PLANS.FEATURES.FREE_LICENSE', included: true },
          { key: 'CLUB_PLANS.FEATURES.PLAYER_DASHBOARD', included: true },
          { key: 'CLUB_PLANS.FEATURES.DOCUMENTS', included: true },
          { key: 'CLUB_PLANS.FEATURES.PAYMENTS_MODULE', included: true },
          { key: 'CLUB_PLANS.FEATURES.COACH_MODULE', included: false },
          { key: 'CLUB_PLANS.FEATURES.STATS_PRO', included: false },
          { key: 'CLUB_PLANS.FEATURES.VIDEO_ANALYSIS', included: false },
          { key: 'CLUB_PLANS.FEATURES.INJURIES', included: false },
          { key: 'CLUB_PLANS.FEATURES.PRIORITY_SUPPORT', included: false },
        ],
      },
    ];
    return of(plans).pipe(delay(300));
  }

  // ─── Subscription State ─────────────────────────────────────
  getCurrentSubscription(clubId: number): Observable<ClubSubscription | null> {
    // TODO: Replace with real API call
    // return this.http.get<ClubSubscription>(`${this.apiUrl}club/${clubId}/subscription`);
    return this.currentSubscription$.asObservable();
  }

  getSubscriptionObservable(): Observable<ClubSubscription | null> {
    return this.currentSubscription$.asObservable();
  }

  // Mock: set subscription locally (will be replaced by API)
  setSubscription(sub: ClubSubscription | null): void {
    this.currentSubscription$.next(sub);
  }

  // ─── Plan 1: Familia ────────────────────────────────────────
  getParentRegistrationUrl(clubId: number): string {
    return `${window.location.origin}/register?clubId=${clubId}`;
  }

  checkDuplicatePlayer(req: DuplicateCheckRequest): Observable<DuplicateCheckResponse> {
    // TODO: Replace with real API call
    // return this.http.post<DuplicateCheckResponse>(`${this.apiUrl}player/check-duplicate`, req);
    return of({ isDuplicate: false }).pipe(delay(500));
  }

  registerParent(parent: ParentRegistration): Observable<{ parentId: number }> {
    // TODO: Replace with real API call
    return of({ parentId: Math.floor(Math.random() * 10000) }).pipe(delay(800));
  }

  registerPlayer(player: PlayerRegistration): Observable<{ success: boolean; playerId: number }> {
    // TODO: Replace with real API call
    return of({ success: true, playerId: Math.floor(Math.random() * 10000) }).pipe(delay(800));
  }

  getPlayersDashboard(clubId: number): Observable<PlayerDashboardEntry[]> {
    // TODO: Replace with real API call
    // return this.http.get<PlayerDashboardEntry[]>(`${this.apiUrl}club/${clubId}/players-status`);
    const mock: PlayerDashboardEntry[] = [
      {
        playerId: 1, firstName: 'Lucas', lastName: 'García', birthDate: '2015-03-12',
        parentName: 'Carlos García', parentEmail: 'carlos@email.com', teamName: 'Alevín A',
        status: 'ACTIVE', subscriptionPeriod: 'monthly', subscriptionStart: '2025-09-01', lastPaymentDate: '2026-02-01'
      },
      {
        playerId: 2, firstName: 'María', lastName: 'López', birthDate: '2014-07-22',
        parentName: 'Ana López', parentEmail: 'ana@email.com', teamName: 'Infantil B',
        status: 'UNPAID', subscriptionPeriod: undefined, subscriptionStart: undefined, lastPaymentDate: undefined
      },
      {
        playerId: 3, firstName: 'Pablo', lastName: 'Martínez', birthDate: '2016-01-05',
        parentName: 'Pedro Martínez', parentEmail: 'pedro@email.com', teamName: 'Benjamín A',
        status: 'ACTIVE', subscriptionPeriod: 'annual', subscriptionStart: '2025-09-01', lastPaymentDate: '2025-09-01'
      },
      {
        playerId: 4, firstName: 'Sofía', lastName: 'Hernández', birthDate: '2015-11-18',
        parentName: 'Laura Hernández', parentEmail: 'laura@email.com', teamName: undefined,
        status: 'INCOMPLETE', subscriptionPeriod: undefined, subscriptionStart: undefined, lastPaymentDate: undefined
      },
      {
        playerId: 5, firstName: 'Daniel', lastName: 'Ruiz', birthDate: '2013-05-30',
        parentName: 'Miguel Ruiz', parentEmail: 'miguel@email.com', teamName: 'Cadete A',
        status: 'PAST_DUE', subscriptionPeriod: 'monthly', subscriptionStart: '2025-10-01', lastPaymentDate: '2026-01-01'
      },
    ];
    return of(mock).pipe(delay(600));
  }

  // ─── Plan 2: Club (5€/player — equivalent in local currency) ─
  calculateClubPlan(playerCount: number, currency?: CurrencyInfo): Observable<ClubPlanCalculation> {
    const cur = currency || this.CURRENCY_MAP['EUR'];
    const pricePerPlayer = this.BASE_PRICE_EUR;
    const pricePerPlayerLocal = +(pricePerPlayer * cur.rate).toFixed(2);
    const subtotal = +(playerCount * pricePerPlayer).toFixed(2);
    const subtotalLocal = +(playerCount * pricePerPlayerLocal).toFixed(2);
    // Taxes are applied at checkout by Stripe based on country — we show estimated 0% here
    const taxPercent = 0;
    const taxAmount = 0;
    const taxAmountLocal = 0;
    const total = subtotal;
    const totalLocal = subtotalLocal;
    return of({
      playerCount, pricePerPlayer, pricePerPlayerLocal,
      subtotal, subtotalLocal,
      taxPercent, taxAmount, taxAmountLocal,
      total, totalLocal,
      currencyCode: cur.code, currencySymbol: cur.symbol,
    }).pipe(delay(300));
  }

  submitClubRegistration(entity: ClubEntityRegistration): Observable<{ clubId: number }> {
    // TODO: Replace with real API call
    return of({ clubId: Math.floor(Math.random() * 10000) }).pipe(delay(800));
  }

  submitContract(contract: ContractData): Observable<{ success: boolean; contractId: string; pdfUrl: string }> {
    // TODO: Replace with real API call
    return of({
      success: true,
      contractId: 'CTR-' + Date.now(),
      pdfUrl: '/assets/contract-preview.pdf'
    }).pipe(delay(1000));
  }

  // ─── Plan 3: Gratuito ──────────────────────────────────────
  getDefaultCommissionConfig(): Observable<CommissionConfig> {
    const config: CommissionConfig = {
      sphairaCutPercent: 3,
      sphairaCutFixed: 0.25,
      sphairaPercent: 3,
      fixedFeePerTransaction: 0.25,
      clubPercent: 2,
      clubCommissionPercent: 2,
      totalParentPercent: 5,
      totalParentFixed: 0.25,
    };
    return of(config).pipe(delay(300));
  }

  recalculateCommission(exampleAmount: number, clubPercent: number): Observable<CommissionConfig> {
    return this.getDefaultCommissionConfig().pipe(
      delay(200),
      map(base => ({
        ...base,
        clubPercent: clubPercent,
        clubCommissionPercent: clubPercent,
        totalParentPercent: base.sphairaCutPercent + clubPercent,
      }))
    );
  }

  initiateStripeConnect(clubId: number): Observable<StripeConnectOnboarding> {
    // TODO: Replace with real Stripe Connect onboarding API call
    return of({
      clubId,
      stripeAccountId: 'acct_mock_' + clubId,
      chargesEnabled: false,
      detailsSubmitted: false,
      onboardingUrl: 'https://connect.stripe.com/setup/s/mock-onboarding',
    }).pipe(delay(1000));
  }

  getStripeConnectStatus(clubId: number): Observable<StripeConnectOnboarding> {
    // TODO: Replace with real API call
    return of({
      clubId,
      stripeAccountId: 'acct_mock_' + clubId,
      status: 'not_started' as const,
      chargesEnabled: true,
      detailsSubmitted: true,
    }).pipe(delay(500));
  }

  // ─── Feature Locking ────────────────────────────────────────
  getLockedFeatures(): LockedFeature[] {
    return [
      {
        routePattern: 'menu-entrenador',
        nameKey: 'CLUB_PLANS.LOCKED.COACH_TRAINING',
        iconClass: 'bi-clipboard-data',
        requiredPlans: ['familia', 'club'],
      },
      {
        routePattern: 'estadisticas',
        nameKey: 'CLUB_PLANS.LOCKED.STATS_PRO',
        iconClass: 'bi-graph-up-arrow',
        requiredPlans: ['familia', 'club'],
      },
      {
        routePattern: 'tareas',
        nameKey: 'CLUB_PLANS.LOCKED.TASKS',
        iconClass: 'bi-list-task',
        requiredPlans: ['familia', 'club'],
      },
    ];
  }

  isFeatureLocked(routePath: string, currentPlan: ClubPlanType | null): boolean {
    if (!currentPlan) return false; // No plan = not restricted (legacy clubs)
    const lockedFeatures = this.getLockedFeatures();
    const match = lockedFeatures.find(f => routePath.includes(f.routePattern));
    if (!match) return false;
    return !match.requiredPlans.includes(currentPlan);
  }

  // ─── Stripe Checkout (for Plan 1 & Plan 2) ────────────────
  createCheckoutSession(
    clubId: number,
    planType?: ClubPlanType,
    period?: string,
    playerCount?: number,
  ): Observable<{ url: string; checkoutUrl: string; sessionId: string }> {
    // TODO: Replace with real API call to create Stripe Checkout Session
    // return this.http.post(`${this.apiUrl}stripe/create-checkout`, { clubId, planType, period, playerCount });
    const checkoutUrl = 'https://checkout.stripe.com/pay/mock-session';
    return of({
      url: checkoutUrl,
      checkoutUrl,
      sessionId: 'cs_mock_' + Date.now(),
    }).pipe(delay(1000));
  }

  cancelSubscription(subscriptionId: string): Observable<{ success: boolean }> {
    // TODO: Replace with real API call
    return of({ success: true }).pipe(delay(800));
  }

  reactivateSubscription(subscriptionId: string): Observable<{ success: boolean }> {
    // TODO: Replace with real API call
    return of({ success: true }).pipe(delay(800));
  }
}
