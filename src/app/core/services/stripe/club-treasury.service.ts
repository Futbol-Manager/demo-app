import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { isDemoMode } from '../demo/demo-mode';
import { DemoDataService } from '../demo/demo-data.service';

/** Importe en una moneda concreta (saldo disponible/pendiente). */
export interface TreasuryMoney {
  amount: number;
  amountCents: number;
  currency: string;
}

/** Calendario con el que Stripe transfiere automáticamente al banco. */
export interface PayoutSchedule {
  interval?: string;
  weeklyAnchor?: string;
  monthlyAnchor?: number;
  delayDays?: number;
}

/** Resumen financiero de la cuenta Connect del club. */
export interface TreasurySummary {
  configured: boolean;
  accountId?: string;
  stripeDashboardUrl?: string;
  payoutsEnabled?: boolean;
  chargesEnabled?: boolean;
  detailsSubmitted?: boolean;
  defaultCurrency?: string;
  payoutSchedule?: PayoutSchedule;
  available?: TreasuryMoney[];
  pending?: TreasuryMoney[];
}

/** Una transferencia (payout) de Stripe al banco del club. */
export interface Payout {
  id: string;
  amount: number;
  amountCents: number;
  currency: string;
  status: string;
  arrivalDate?: number;
  created?: number;
  method?: string;
  type?: string;
  description?: string;
  failureCode?: string;
  failureMessage?: string;
  bankLast4?: string;
  bankName?: string;
}

export interface PayoutsPage {
  configured: boolean;
  payouts: Payout[];
  hasMore: boolean;
  nextCursor: string | null;
}

/** Un movimiento que compone un payout (cobro, fee, reembolso...). */
export interface PayoutTransaction {
  id: string;
  type: string;
  description?: string;
  amount: number;
  fee: number;
  net: number;
  currency: string;
  created?: number;
}

export interface PayoutTransactions {
  configured: boolean;
  payoutId: string;
  transactions: PayoutTransaction[];
  grossAmount: number;
  totalFee: number;
  netAmount: number;
  currency: string | null;
  hasMore: boolean;
}

/**
 * Servicio de solo lectura para la "Tesorería" del club (saldo, calendario de
 * payouts e historial de transferencias al banco). En modo demo devuelve datos
 * ficticios desde `DemoDataService`.
 */
@Injectable({ providedIn: 'root' })
export class ClubTreasuryService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private authHeaders(): HttpHeaders | undefined {
    const token = localStorage.getItem('token');
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
  }

  /** Resumen financiero: saldo, calendario de payouts y estado de la cuenta. */
  getSummary(clubId: number): Observable<TreasurySummary> {
    if (isDemoMode()) {
      return of(DemoDataService.getDemoTreasurySummary() as TreasurySummary);
    }
    const headers = this.authHeaders();
    if (!headers) return throwError(() => new Error('No auth token'));
    return this.http
      .get<any>(`${this.base}stripe/treasury/${clubId}/summary`, { headers })
      .pipe(map((res) => (res?.data ?? res) as TreasurySummary));
  }

  /** Historial paginado de transferencias (payouts) al banco. */
  getPayouts(clubId: number, limit = 20, startingAfter?: string): Observable<PayoutsPage> {
    if (isDemoMode()) {
      return of(DemoDataService.getDemoTreasuryPayouts() as PayoutsPage);
    }
    const headers = this.authHeaders();
    if (!headers) return throwError(() => new Error('No auth token'));
    let params = new HttpParams().set('limit', String(limit));
    if (startingAfter) params = params.set('startingAfter', startingAfter);
    return this.http
      .get<any>(`${this.base}stripe/treasury/${clubId}/payouts`, { headers, params })
      .pipe(
        map((res) => {
          const data = res?.data ?? res ?? {};
          return {
            configured: !!data.configured,
            payouts: (data.payouts ?? []) as Payout[],
            hasMore: !!data.hasMore,
            nextCursor: data.nextCursor ?? null,
          } as PayoutsPage;
        }),
      );
  }

  /** Desglose de una transferencia concreta (cobros que la componen + fees reales). */
  getPayoutTransactions(clubId: number, payoutId: string): Observable<PayoutTransactions> {
    if (isDemoMode()) {
      return of(DemoDataService.getDemoTreasuryPayoutTransactions(payoutId) as PayoutTransactions);
    }
    const headers = this.authHeaders();
    if (!headers) return throwError(() => new Error('No auth token'));
    return this.http
      .get<any>(`${this.base}stripe/treasury/${clubId}/payouts/${payoutId}/transactions`, { headers })
      .pipe(map((res) => (res?.data ?? res) as PayoutTransactions));
  }
}
