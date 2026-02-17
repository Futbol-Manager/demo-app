import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { delay, map, catchError } from 'rxjs/operators';
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
    // TODO: Backend necesita endpoint GET /rest/club/{clubId}/subscription
    // Por ahora, intentamos obtener el estado desde el endpoint existente de Stripe
    return this.http.get<any>(`${this.apiUrl}stripe/getestadosuscripcion/${clubId}/1`).pipe(
      map(res => {
        if (res?.data) {
          this.currentSubscription$.next(res.data);
          return res.data;
        }
        return this.currentSubscription$.value;
      }),
      catchError(() => this.currentSubscription$.asObservable())
    );
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

  // TODO: Backend necesita endpoint POST /rest/player/check-duplicate
  checkDuplicatePlayer(req: DuplicateCheckRequest): Observable<DuplicateCheckResponse> {
    return this.http.post<any>(`${this.apiUrl}player/check-duplicate`, req).pipe(
      map(res => res?.data || { isDuplicate: false }),
      catchError(() => of({ isDuplicate: false }))
    );
  }

  // TODO: Backend necesita endpoint POST /rest/club/register-parent
  registerParent(parent: ParentRegistration): Observable<{ parentId: number }> {
    return this.http.post<any>(`${this.apiUrl}club/register-parent`, parent).pipe(
      map(res => res?.data || { parentId: 0 }),
      catchError(() => of({ parentId: Math.floor(Math.random() * 10000) }))
    );
  }

  // TODO: Backend necesita endpoint POST /rest/club/register-player-subscription
  registerPlayer(player: PlayerRegistration): Observable<{ success: boolean; playerId: number }> {
    return this.http.post<any>(`${this.apiUrl}club/register-player-subscription`, player).pipe(
      map(res => res?.data || { success: true, playerId: 0 }),
      catchError(() => of({ success: true, playerId: Math.floor(Math.random() * 10000) }))
    );
  }

  // TODO: Backend necesita endpoint GET /rest/club/{clubId}/players-status
  getPlayersDashboard(clubId: number): Observable<PlayerDashboardEntry[]> {
    return this.http.get<any>(`${this.apiUrl}club/${clubId}/players-status`).pipe(
      map(res => res?.data || []),
      catchError(() => of([]))
    );
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

  // TODO: Backend necesita endpoint POST /rest/club/register-entity
  submitClubRegistration(entity: ClubEntityRegistration): Observable<{ clubId: number }> {
    return this.http.post<any>(`${this.apiUrl}club/register-entity`, entity).pipe(
      map(res => res?.data || { clubId: 0 }),
      catchError(() => of({ clubId: Math.floor(Math.random() * 10000) }))
    );
  }

  // TODO: Backend necesita endpoint POST /rest/club/contract
  submitContract(contract: ContractData): Observable<{ success: boolean; contractId: string; pdfUrl: string }> {
    return this.http.post<any>(`${this.apiUrl}club/contract`, contract).pipe(
      map(res => res?.data || { success: false, contractId: '', pdfUrl: '' }),
      catchError(() => of({
        success: true,
        contractId: 'CTR-' + Date.now(),
        pdfUrl: '/assets/contract-preview.pdf'
      }))
    );
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

  // TODO: Backend necesita endpoint POST /rest/stripe/connect/onboard/{clubId}
  initiateStripeConnect(clubId: number): Observable<StripeConnectOnboarding> {
    return this.http.get<any>(`${this.apiUrl}stripe/create-account/club/${clubId}`).pipe(
      map(res => res?.data || { clubId, stripeAccountId: '', chargesEnabled: false, detailsSubmitted: false }),
      catchError(() => of({
        clubId,
        stripeAccountId: 'acct_mock_' + clubId,
        chargesEnabled: false,
        detailsSubmitted: false,
        onboardingUrl: 'https://connect.stripe.com/setup/s/mock-onboarding',
      }))
    );
  }

  // TODO: Backend necesita endpoint GET /rest/stripe/connect/status/{clubId}
  getStripeConnectStatus(clubId: number): Observable<StripeConnectOnboarding> {
    return this.http.get<any>(`${this.apiUrl}stripe/connect/status/${clubId}`).pipe(
      map(res => res?.data || { clubId, chargesEnabled: false, detailsSubmitted: false }),
      catchError(() => of({
        clubId,
        stripeAccountId: 'acct_mock_' + clubId,
        status: 'not_started' as const,
        chargesEnabled: true,
        detailsSubmitted: true,
      }))
    );
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
    return this.http.post<any>(`${this.apiUrl}stripe/subscriptions/create-plan`, {
      clubId, planType, period, playerCount
    }).pipe(
      map(res => {
        const data = res?.data;
        return {
          url: data?.checkoutUrl || data?.url || '',
          checkoutUrl: data?.checkoutUrl || data?.url || '',
          sessionId: data?.sessionId || '',
        };
      }),
      catchError(() => {
        const checkoutUrl = 'https://checkout.stripe.com/pay/mock-session';
        return of({ url: checkoutUrl, checkoutUrl, sessionId: 'cs_mock_' + Date.now() });
      })
    );
  }

  cancelSubscription(subscriptionId: string): Observable<{ success: boolean }> {
    return this.http.post<any>(`${this.apiUrl}stripe/cancel-subscription`, {
      suscripcionStripeId: subscriptionId
    }).pipe(
      map(res => ({ success: !!res?.data })),
      catchError(() => of({ success: false }))
    );
  }

  reactivateSubscription(subscriptionId: string): Observable<{ success: boolean }> {
    return this.http.post<any>(`${this.apiUrl}stripe/reactivate-subscription`, {
      suscripcion: { suscripcionStripeId: subscriptionId }
    }).pipe(
      map(res => ({ success: !!res?.data })),
      catchError(() => of({ success: false }))
    );
  }
}
