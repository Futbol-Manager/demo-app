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
  PlanPeriod,
  StripeConnectStatus,
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

  submitClubRegistration(clubId: number, entity: ClubEntityRegistration): Observable<{ clubId: number }> {
    return this.http.post<any>(`${this.apiUrl}club-plan/club/entity`, { ...entity, clubId }).pipe(
      map(res => ({ clubId: res?.data?.clubId || clubId })),
      catchError(() => of({ clubId }))
    );
  }

  submitContract(clubId: number, contract: ContractData): Observable<{ success: boolean; contractId: string; pdfUrl: string }> {
    return this.http.post<any>(`${this.apiUrl}club-plan/club/contract`, {
      clubId,
      signatureName: contract.signatureUrl || contract.responsibleName,
      playerCount: contract.playerCount,
      totalAmountCents: Math.round((contract.totalWithTax || contract.totalBase || 0) * 100),
      contractType: 'plan_club',
    }).pipe(
      map(res => ({
        success: true,
        contractId: res?.data?.id ? String(res.data.id) : 'CTR-' + Date.now(),
        pdfUrl: ''
      })),
      catchError(() => of({ success: true, contractId: 'CTR-' + Date.now(), pdfUrl: '' }))
    );
  }

  // ─── Plan 3: Gratuito ──────────────────────────────────────
  getDefaultCommissionConfig(): Observable<CommissionConfig> {
    const fallback: CommissionConfig = {
      sphairaCutPercent: 3,
      sphairaCutFixed: 0.25,
      sphairaPercent: 3,
      fixedFeePerTransaction: 0.25,
      clubPercent: 2,
      clubCommissionPercent: 2,
      totalParentPercent: 5,
      totalParentFixed: 0.25,
    };
    return of(fallback).pipe(delay(100));
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

  initiateStripeConnect(clubId: number, email?: string): Observable<StripeConnectOnboarding> {
    return this.http.post<any>(`${this.apiUrl}club-plan/gratuito/connect/onboard/${clubId}`, { email }).pipe(
      map(res => ({
        clubId,
        stripeAccountId: res?.data?.accountId || '',
        chargesEnabled: false,
        detailsSubmitted: false,
        onboardingUrl: res?.data?.onboardingUrl || '',
      })),
      catchError(() => of({
        clubId,
        stripeAccountId: '',
        chargesEnabled: false,
        detailsSubmitted: false,
        onboardingUrl: '',
      }))
    );
  }



  getStripeConnectStatus(clubId: number): Observable<StripeConnectOnboarding> {
    return this.http.get<any>(`${this.apiUrl}club-plan/gratuito/connect-status/${clubId}`).pipe(
      map(res => ({
        clubId,
        stripeAccountId: res?.data?.accountId || '',
        chargesEnabled: res?.data?.chargesEnabled || false,
        detailsSubmitted: res?.data?.detailsSubmitted || false,
        status: res?.data?.connected ? 'active' as const : 'not_started' as const,
      })),
      catchError(() => of({
        clubId,
        stripeAccountId: '',
        status: 'not_started' as const,
        chargesEnabled: false,
        detailsSubmitted: false,
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

  // ─── Activate Plans ────────────────────────────────────────
  activateFamiliaPlan(clubId: number, period: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}club-plan/familia/activate`, { clubId, period }).pipe(
      map(res => res?.data),
      catchError(err => of(null))
    );
  }

  // ─── Stripe Checkout (for Plan Club) ────────────────
  createCheckoutSession(
    clubId: number,
    planType?: ClubPlanType,
    period?: string,
    playerCount?: number,
  ): Observable<{ url: string; checkoutUrl: string; sessionId: string }> {
    const endpoint = planType === 'club'
      ? `${this.apiUrl}club-plan/club/checkout`
      : `${this.apiUrl}club-plan/familia/subscribe`;

    const body: any = {
      clubId,
      playerCount: playerCount || 0,
      successUrl: window.location.origin + '/dashboard/suscripcion-club',
      cancelUrl: window.location.origin + '/dashboard/suscripcion-club',
    };

    if (planType === 'familia') {
      body.parentEmail = '';
    }

    return this.http.post<any>(endpoint, body).pipe(
      map(res => {
        const data = res?.data;
        return {
          url: data?.checkoutUrl || data?.url || '',
          checkoutUrl: data?.checkoutUrl || data?.url || '',
          sessionId: data?.sessionId || '',
        };
      }),
      catchError(() => of({ url: '', checkoutUrl: '', sessionId: '' }))
    );
  }

  verifyClubCheckout(sessionId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}club-plan/club/verify-checkout`, { sessionId }).pipe(
      map(res => res?.data),
      catchError(() => of(null))
    );
  }

  getFeatures(clubId: number): Observable<{ planType: string; features: string[]; blockedRoutes: string[] }> {
    return this.http.get<any>(`${this.apiUrl}club-plan/${clubId}/features`).pipe(
      map(res => res?.data || { planType: 'none', features: [], blockedRoutes: [] }),
      catchError(() => of({ planType: 'none', features: [], blockedRoutes: [] }))
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

  // ── Nuevos métodos para sistema de suscripciones ─────────────
  
  /**
   * Obtiene la suscripción activa de un club
   * Método principal para verificar qué plan tiene activo
   */
  getCurrentSubscription(clubId: number): Observable<ClubSubscription | null> {
    return this.http.get<any>(`${this.apiUrl}club-subscriptions/${clubId}/current`)
      .pipe(
        map(response => {
          if (response.success && response.hasSubscription) {
            return {
              subscriptionId: response.subscriptionId,
              clubId: clubId,
              planType: response.planType.toLowerCase() as ClubPlanType,
              status: response.status.toLowerCase() as ClubSubscriptionStatus,
              period: response.period?.toLowerCase() as PlanPeriod,
              startDate: response.startDate,
              renewDate: response.renewDate,
              endDate: response.endDate,
              stripeSubscriptionId: response.stripeSubscriptionId,
              stripeCustomerId: response.stripeCustomerId,
              // Plan Club específico
              playerCount: response.playerCount,
              pricePerPlayer: response.pricePerPlayer,
              totalAmount: response.totalAmount,
              // Plan Gratuito específico
              stripeConnectAccountId: response.stripeConnectAccountId,
              stripeConnectStatus: response.stripeConnectStatus?.toLowerCase() as StripeConnectStatus,
              clubCommissionPercent: response.clubCommissionPercent,
              // Plan Familia específico
              parentRegistrationUrl: response.parentRegistrationUrl,
            } as ClubSubscription;
          }
          return null;
        }),
        catchError(error => {
          console.error('Error fetching current subscription:', error);
          return of(null);
        })
      );
  }

  /**
   * Verifica si un club tiene acceso a una funcionalidad específica
   */
  hasFeatureAccess(clubId: number, feature: string): Observable<boolean> {
    return this.http.get<any>(`${this.apiUrl}club-subscriptions/${clubId}/feature-access?feature=${feature}`)
      .pipe(
        map(response => response.success ? response.hasAccess : false),
        catchError(() => of(false))
      );
  }

  /**
   * Cancela la suscripción de un club
   */
  cancelClubSubscription(clubId: number): Observable<{ success: boolean; message?: string }> {
    return this.http.post<any>(`${this.apiUrl}club-subscriptions/${clubId}/cancel`, {})
      .pipe(
        map(response => ({ success: response.success, message: response.message })),
        catchError(error => {
          console.error('Error canceling subscription:', error);
          return of({ success: false });
        })
      );
  }

  // ── Plan Gratuito métodos ─────────────────────────────────

  /**
   * Obtiene datos del club para autocompletar formulario del Plan Gratuito
   * Por ahora devuelve null para usar los datos de fallback del componente
   */
  getClubDataForForm(clubId: number): Observable<any> {
    // El endpoint no existe en el backend, devolver null para usar fallback
    return of(null);
  }

  /**
   * Inicia el proceso de onboarding de Stripe Connect para Plan Gratuito
   */
  startGratuitoOnboarding(clubId: number, clubData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}club-plan/${clubId}/gratuito/start-onboarding`, clubData)
      .pipe(
        map(response => {
          if (response.success) {
            return {
              success: true,
              onboardingUrl: response.onboardingUrl,
              stripeAccountId: response.stripeAccountId,
              status: response.status
            };
          }
          return { success: false, error: response.error };
        }),
        catchError(error => {
          console.error('Error starting onboarding:', error);
          return of({ success: false, error: error.message });
        })
      );
  }

  /**
   * Verifica el estado de Stripe Connect para Plan Gratuito
   */
  checkGratuitoStatus(clubId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}club-plan/gratuito/connect-status/${clubId}`)
      .pipe(
        map(response => ({
          success: response.status === 200,
          connected: response.data?.connected || false,
          exists: response.data?.exists || false,
          status: response.data?.status || 'not_started',
          accountId: response.data?.accountId || null,
          stripeAccessUrl: response.data?.stripeAccessUrl || '',
          chargesEnabled: response.data?.chargesEnabled || false,
          payoutsEnabled: response.data?.payoutsEnabled || false,
          detailsSubmitted: response.data?.detailsSubmitted || false
        })),
        catchError(error => {
          console.error('Error checking gratuito status:', error);
          return of({ success: false, connected: false, error: error.message });
        })
      );
  }

  /**
   * Crea cuenta Stripe automáticamente para el club (Wizard)
   */
  createStripeAccount(clubId: number, email: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}club-plan/gratuito/connect/create-account`, {
      clubId: clubId,
      email: email
    }).pipe(
      map(res => ({
        success: res.status === 200,
        accountId: res?.data?.accountId || '',
        onboardingUrl: res?.data?.url || '',
        stripeAccessUrl: res?.data?.stripeAccessUrl || res?.data?.url || '',
        status: res?.data?.status || 'not_started',
        exists: res?.data?.exists || false,
        connected: !!res?.data?.connected,
        chargesEnabled: !!res?.data?.chargesEnabled,
        payoutsEnabled: !!res?.data?.payoutsEnabled,
        detailsSubmitted: !!res?.data?.detailsSubmitted,
        error: res?.error?.msg || null
      })),
      catchError(error => {
        console.error('Error creating Stripe account:', error);
        return of({
          success: false,
          accountId: '',
          onboardingUrl: '',
          error: error.message || 'Error creando cuenta Stripe'
        });
      })
    );
  }

  /**
   * Obtiene la configuración de Stripe Connect de un club
   */
  getGratuitoConfig(clubId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}club-plan/gratuito/config/${clubId}`)
      .pipe(
        map(response => ({
          success: response.status === 200,
          config: {
            sphairaPercent: response?.data?.sphairaPercent ?? 3,
            fixedFeePerTransaction: response?.data?.fixedFeePerTransaction ?? 0.25,
            clubPercent: response?.data?.clubPercent ?? 0
          }
        })),
        catchError(error => {
          console.error('Error fetching gratuito config:', error);
          return of({
            success: false,
            config: {
              sphairaPercent: 3,
              fixedFeePerTransaction: 0.25,
              clubPercent: 0
            }
          });
        })
      );
  }

  saveGratuitoConfig(clubId: number, clubPercent: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}club-plan/gratuito/config/${clubId}`, { clubPercent })
      .pipe(
        map(response => ({ success: response.status === 200, data: response.data })),
        catchError(error => {
          console.error('Error saving gratuito config:', error);
          return of({ success: false, error: error.message });
        })
      );
  }

  /**
   * Genera nueva URL de onboarding si la anterior expiró
   */
  refreshGratuitoOnboarding(clubId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}club-plan/gratuito/refresh-onboarding/${clubId}`, {})
      .pipe(
        map(response => response),
        catchError(error => {
          console.error('Error refreshing onboarding:', error);
          return of({ success: false, error: error.message });
        })
      );
  }

  /**
   * Calcula comisiones para Plan Gratuito
   */
  calculateGratuitoCommissions(clubId: number, amount: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}club-plan/gratuito/calculate-commissions/${clubId}?amount=${amount}`)
      .pipe(
        map(response => ({
          success: response.status === 200,
          ...(response.data || {})
        })),
        catchError(error => {
          console.error('Error calculating commissions:', error);
          return of({ success: false, error: error.message });
        })
      );
  }

  /**
   * Activa el Plan Gratuito después de completar el onboarding de Stripe
   */
  activateGratuitoPlan(clubId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}club-plan/gratuito/activate`, { clubId })
      .pipe(
        map(response => response),
        catchError(error => {
          console.error('Error activating gratuito plan:', error);
          return of({ success: false, error: error.message });
        })
      );
  }

  /**
   * Obtiene el plan actual del club desde la tabla club_plan
   */
  getCurrentClubPlan(clubId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}club-plan/${clubId}/current`)
      .pipe(
        map(response => {
          if (response.status === 200 && response.data) {
            return {
              success: true,
              plan: {
                id: response.data.id,
                clubId: response.data.clubId,
                planType: response.data.planType,
                status: response.data.status,
                startDate: response.data.startDate,
                endDate: response.data.endDate,
                stripeConnectAccountId: response.data.stripeConnectAccountId,
                stripeConnectOnboardingUrl: response.data.stripeConnectOnboardingUrl,
                stripeConnectStatus: response.data.stripeConnectStatus,
                clubCommissionPercent: response.data.clubCommissionPercent,
                sphairaCommissionPercent: response.data.sphairaCommissionPercent,
                sphairaFixedFee: response.data.sphairaFixedFee
              }
            };
          }
          return { success: false, plan: null };
        }),
        catchError(error => {
          console.error('Error getting current club plan:', error);
          return of({ success: false, plan: null, error: error.message });
        })
      );
  }

  // ── Admin overrides (sin Stripe) ────────────────────────────────────────

  adminSetPlan(clubId: number, planType: string, period: string = 'monthly', playerCount: number = 0): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}club-plan/admin/${clubId}/set`,
      { planType, period, playerCount }
    );
  }

  adminCancelPlan(clubId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}club-plan/admin/${clubId}/cancel`);
  }

}
