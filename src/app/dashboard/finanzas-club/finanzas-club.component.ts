import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import {
  ClubTreasuryService,
  Payout,
  PayoutTransactions,
  TreasuryMoney,
  TreasurySummary,
} from 'src/app/core/services/stripe/club-treasury.service';

/**
 * Pestaña "Tesorería / Finanzas" del club (solo lectura).
 * Puede vivir embebida (recibe `inputClubId`) o autónoma (lee `clubId` de ruta).
 */
@Component({
  selector: 'app-finanzas-club',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './finanzas-club.component.html',
  styleUrls: ['./finanzas-club.component.scss'],
})
export class FinanzasClubComponent implements OnInit {
  @Input() inputClubId?: number;

  clubId = 0;

  loadingSummary = true;
  loadingPayouts = true;
  loadingMore = false;
  summaryError = false;
  payoutsError = false;

  summary: TreasurySummary | null = null;
  payouts: Payout[] = [];
  hasMore = false;
  nextCursor: string | null = null;

  // ── Detalle de un payout (Fase 2) ────────────────────────────────
  expandedPayoutId: string | null = null;
  loadingTransactions = false;
  transactions: PayoutTransactions | null = null;

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private treasury: ClubTreasuryService,
    private cdr: ChangeDetectorRef,
  ) {}

  /** true cuando el componente vive embebido en otra pantalla (pestaña). */
  get embedded(): boolean {
    return this.inputClubId != null && this.inputClubId > 0;
  }

  ngOnInit(): void {
    this.clubId = this.inputClubId && this.inputClubId > 0
      ? this.inputClubId
      : +(this.route.snapshot.paramMap.get('clubId') ?? 0);
    if (!this.clubId) {
      this.clubId =
        Number(sessionStorage.getItem('clubId')) ||
        Number(localStorage.getItem('clubId')) ||
        0;
    }
    if (this.clubId > 0) {
      this.loadSummary();
      this.loadPayouts();
    } else {
      this.loadingSummary = false;
      this.loadingPayouts = false;
    }
  }

  goBack(): void {
    this.location.back();
  }

  // ── Carga de datos ───────────────────────────────────────────────
  loadSummary(): void {
    this.loadingSummary = true;
    this.summaryError = false;
    this.treasury.getSummary(this.clubId).subscribe({
      next: (s) => {
        this.summary = s;
        this.loadingSummary = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.summaryError = true;
        this.loadingSummary = false;
        this.cdr.markForCheck();
      },
    });
  }

  loadPayouts(): void {
    this.loadingPayouts = true;
    this.payoutsError = false;
    this.treasury.getPayouts(this.clubId, 20).subscribe({
      next: (page) => {
        this.payouts = page.payouts;
        this.hasMore = page.hasMore;
        this.nextCursor = page.nextCursor;
        this.loadingPayouts = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.payoutsError = true;
        this.loadingPayouts = false;
        this.cdr.markForCheck();
      },
    });
  }

  loadMore(): void {
    if (!this.hasMore || !this.nextCursor || this.loadingMore) return;
    this.loadingMore = true;
    this.treasury.getPayouts(this.clubId, 20, this.nextCursor).subscribe({
      next: (page) => {
        this.payouts = [...this.payouts, ...page.payouts];
        this.hasMore = page.hasMore;
        this.nextCursor = page.nextCursor;
        this.loadingMore = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingMore = false;
        this.cdr.markForCheck();
      },
    });
  }

  togglePayoutDetail(p: Payout): void {
    if (this.expandedPayoutId === p.id) {
      this.expandedPayoutId = null;
      this.transactions = null;
      return;
    }
    this.expandedPayoutId = p.id;
    this.transactions = null;
    this.loadingTransactions = true;
    this.treasury.getPayoutTransactions(this.clubId, p.id).subscribe({
      next: (tx) => {
        this.transactions = tx;
        this.loadingTransactions = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingTransactions = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ── Helpers de presentación ──────────────────────────────────────
  get isConfigured(): boolean {
    return !!this.summary?.configured;
  }

  get payoutsEnabled(): boolean {
    return !!this.summary?.payoutsEnabled;
  }

  get availablePrimary(): TreasuryMoney | null {
    return this.summary?.available?.[0] ?? null;
  }

  get pendingPrimary(): TreasuryMoney | null {
    return this.summary?.pending?.[0] ?? null;
  }

  formatMoney(amount: number | null | undefined, currency: string | null | undefined): string {
    if (amount == null) return '—';
    const cur = (currency ?? 'eur').toUpperCase();
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: cur,
      }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${cur}`;
    }
  }

  formatDate(epochSeconds: number | null | undefined): string {
    if (!epochSeconds) return '—';
    const d = new Date(epochSeconds * 1000);
    return d.toLocaleDateString();
  }

  statusLabelKey(status: string | null | undefined): string {
    switch ((status ?? '').toLowerCase()) {
      case 'paid':
        return 'FINANCE.STATUS_PAID';
      case 'pending':
        return 'FINANCE.STATUS_PENDING';
      case 'in_transit':
        return 'FINANCE.STATUS_IN_TRANSIT';
      case 'canceled':
        return 'FINANCE.STATUS_CANCELED';
      case 'failed':
        return 'FINANCE.STATUS_FAILED';
      default:
        return 'FINANCE.STATUS_UNKNOWN';
    }
  }

  statusClass(status: string | null | undefined): string {
    switch ((status ?? '').toLowerCase()) {
      case 'paid':
        return 'badge-status--paid';
      case 'pending':
      case 'in_transit':
        return 'badge-status--pending';
      case 'failed':
      case 'canceled':
        return 'badge-status--failed';
      default:
        return 'badge-status--other';
    }
  }

  get scheduleKey(): string | null {
    const interval = this.summary?.payoutSchedule?.interval;
    switch ((interval ?? '').toLowerCase()) {
      case 'daily':
        return 'FINANCE.SCHEDULE_DAILY';
      case 'weekly':
        return 'FINANCE.SCHEDULE_WEEKLY';
      case 'monthly':
        return 'FINANCE.SCHEDULE_MONTHLY';
      case 'manual':
        return 'FINANCE.SCHEDULE_MANUAL';
      default:
        return null;
    }
  }

  get scheduleParams(): Record<string, unknown> {
    const s = this.summary?.payoutSchedule;
    return {
      delayDays: s?.delayDays ?? 0,
      weeklyAnchor: s?.weeklyAnchor ?? '',
      monthlyAnchor: s?.monthlyAnchor ?? '',
    };
  }

  openStripeDashboard(): void {
    if (this.summary?.stripeDashboardUrl) {
      window.open(this.summary.stripeDashboardUrl, '_blank', 'noopener');
    }
  }

  trackByPayout(_i: number, p: Payout): string {
    return p.id;
  }
}
