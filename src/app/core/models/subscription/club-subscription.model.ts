/**
 * Club Subscription Models
 * Defines the data structures for the 3 club subscription plans:
 * - Plan Familia (parent pays)
 * - Plan Club (5€/player/year)
 * - Plan Gratuito (free, commission-based)
 */

// ─── Plan Types ───────────────────────────────────────────────
export type ClubPlanType = 'familia' | 'club' | 'gratuito';
export type PlanPeriod = 'monthly' | 'annual';
export type PlayerStatus = 'INCOMPLETE' | 'UNPAID' | 'ACTIVE' | 'PAST_DUE';
export type ClubSubscriptionStatus = 'none' | 'active' | 'past_due' | 'cancelled' | 'trialing';
export type StripeConnectStatus = 'not_started' | 'pending' | 'active' | 'restricted';

// ─── Currency ─────────────────────────────────────────────────
export interface CurrencyInfo {
  code: string;       // ISO 4217 (EUR, USD, GBP, ...)
  symbol: string;     // €, $, £, ...
  rate: number;       // 1 EUR = X local (1 for EUR)
  name: string;       // "Euro", "US Dollar", ...
}

// ─── Plan Definitions ─────────────────────────────────────────
export interface PlanFeature {
  key: string;
  included: boolean;
}

export interface PlanPricing {
  monthly?: number;
  annual?: number;
  perPlayer?: number;
  clubShareMonthly?: number;
  clubShareAnnual?: number;
  sphairaCut?: number; // percentage
  fixedFee?: number;   // fixed fee per transaction
}

export interface ClubPlan {
  id: ClubPlanType;
  nameKey: string;        // i18n key
  descriptionKey: string; // i18n key
  pricing: PlanPricing;
  features: PlanFeature[];
  recommended?: boolean;
}

// ─── Club Subscription (Active) ──────────────────────────────
export interface ClubSubscription {
  subscriptionId: string;
  clubId: number;
  planType: ClubPlanType;
  status: ClubSubscriptionStatus;
  period?: PlanPeriod;
  startDate: string;
  renewDate?: string;
  endDate?: string;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  // Plan Club specific
  playerCount?: number;
  pricePerPlayer?: number;
  totalAmount?: number;
  // Plan Gratuito specific
  stripeConnectAccountId?: string;
  stripeConnectStatus?: StripeConnectStatus;
  clubCommissionPercent?: number;
  // Plan Familia specific
  parentRegistrationUrl?: string;
}

// ─── Plan 1: Familia — Parent Registration ───────────────────
export interface ParentRegistration {
  parentId?: number;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  phone: string;
  clubId: number;
}

export interface PlayerRegistration {
  playerId?: number;
  firstName: string;
  lastName: string;
  birthDate: string;
  photo?: string;
  dniBookUrl?: string;
  allergies?: string;
  parentId?: number;
  clubId: number;
  status?: PlayerStatus;
  subscriptionPeriod?: PlanPeriod;
  stripeSubscriptionId?: string;
}

export interface DuplicateCheckRequest {
  firstName: string;
  lastName: string;
  birthDate: string;
  clubId: number;
}

export interface DuplicateCheckResponse {
  isDuplicate: boolean;
  existingPlayerId?: number;
  existingPlayer?: { firstName: string; lastName: string };
  message?: string;
}

// ─── Plan 2: Club — Entity Registration ──────────────────────
export interface ClubEntityRegistration {
  clubName: string;
  taxId: string;        // CIF / VAT / EIN — any country
  address: string;
  postalCode: string;
  city: string;
  country: string;
  responsibleName: string;
  responsibleId: string; // DNI / Passport / National ID
  email: string;
  phone: string;
}

export interface ClubPlanCalculation {
  playerCount: number;
  pricePerPlayer: number;
  pricePerPlayerLocal: number;
  subtotal: number;
  subtotalLocal: number;
  taxPercent: number;
  taxAmount: number;
  taxAmountLocal: number;
  total: number;
  totalLocal: number;
  currencyCode: string;
  currencySymbol: string;
}

export interface ContractData {
  clubName: string;
  taxId: string;
  country: string;
  responsibleName: string;
  responsibleId: string;
  playerCount: number;
  pricePerPlayer: number;
  totalBase: number;
  tax: number;
  taxPercent: number;
  totalWithTax: number;
  currencyCode: string;
  currencySymbol: string;
  date: string;
  signatureUrl: string;
}

// ─── Plan 3: Gratuito — Stripe Connect ───────────────────────
export interface StripeConnectOnboarding {
  clubId: number;
  stripeAccountId?: string;
  status?: StripeConnectStatus;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  onboardingUrl?: string;
}

export interface CommissionConfig {
  sphairaCutPercent: number;       // Fixed 3%
  sphairaCutFixed: number;         // Fixed 0.25€
  sphairaPercent: number;          // alias for sphairaCutPercent
  fixedFeePerTransaction: number;  // alias for sphairaCutFixed
  clubPercent: number;             // alias for clubCommissionPercent
  clubCommissionPercent: number;   // Variable, set by club
  totalParentPercent: number;      // Computed
  totalParentFixed: number;        // = sphairaCutFixed
}

// ─── Feature Lock ────────────────────────────────────────────
export interface LockedFeature {
  routePattern: string;
  nameKey: string;         // i18n key for the feature name
  iconClass: string;
  requiredPlans: ClubPlanType[];
}

// ─── Dashboard Player View (Plan 1) ─────────────────────────
export interface PlayerDashboardEntry {
  playerId: number;
  firstName: string;
  lastName: string;
  birthDate: string;
  parentName: string;
  parentEmail: string;
  teamName?: string;
  status: PlayerStatus;
  subscriptionPeriod?: PlanPeriod;
  subscriptionStart?: string;
  lastPaymentDate?: string;
}
