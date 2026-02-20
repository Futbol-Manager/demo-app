import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { TeamService } from 'src/app/core/services/team/team.service';
import { AutoPaymentCuota, PlayerAutoPayment, SubscriptionStatus } from 'src/app/core/models/subscription/auto-payment.model';

type StatusFilter = 'all' | 'active' | 'failed' | 'paused' | 'canceled';

interface CuotaVM extends AutoPaymentCuota {
  expanded: boolean;
  statusFilter: StatusFilter;
  searchQuery: string;
}

@Component({
  selector: 'app-automatic-payments',
  templateUrl: './automatic-payments.component.html',
  styleUrls: ['./automatic-payments.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AutomaticPaymentsComponent implements OnChanges {
  @Input() clubId!: number;
  @Input() visible = false;

  cuotas: CuotaVM[] = [];
  isLoading = false;
  hasError = false;

  // Filtro global de estado
  globalStatus: StatusFilter = 'all';

  constructor(
    private teamService: TeamService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible && this.clubId) {
      this.load();
    }
  }

  load(): void {
    this.isLoading = true;
    this.hasError = false;
    this.cuotas = [];
    this.cd.markForCheck();

    this.teamService.getClubAutoPayments(this.clubId).subscribe({
      next: (res: any) => {
        const raw: AutoPaymentCuota[] = Array.isArray(res?.data) ? res.data : [];
        this.cuotas = raw.map((c) => ({
          ...c,
          expanded: false,
          statusFilter: 'all' as StatusFilter,
          searchQuery: '',
        }));
        this.isLoading = false;
        this.cd.markForCheck();
      },
      error: () => {
        this.hasError = true;
        this.isLoading = false;
        this.cd.markForCheck();
      },
    });
  }

  // ── Filtros por cuota ───────────────────────────────────────────

  filteredPlayers(cuota: CuotaVM): PlayerAutoPayment[] {
    return cuota.players.filter((p) => {
      const matchStatus = this.matchesStatus(p.status, cuota.statusFilter);
      const q = cuota.searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (p.playerName ?? '').toLowerCase().includes(q) ||
        (p.teamName ?? '').toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }

  private matchesStatus(status: string, filter: StatusFilter): boolean {
    if (filter === 'all') return true;
    if (filter === 'active') return status === 'active' || status === 'trialing';
    if (filter === 'failed') return status === 'past_due' || status === 'incomplete' || status === 'incomplete_expired' || status === 'unpaid';
    if (filter === 'paused') return status === 'paused';
    if (filter === 'canceled') return status === 'canceled';
    return true;
  }

  // ── Helpers de presentación ─────────────────────────────────────

  getStatusClass(status: string): string {
    if (!status) return 'badge-secondary';
    if (status === 'active' || status === 'trialing') return 'status-active';
    if (status === 'past_due' || status === 'incomplete' || status === 'incomplete_expired' || status === 'unpaid') return 'status-failed';
    if (status === 'paused') return 'status-paused';
    if (status === 'canceled') return 'status-canceled';
    return 'status-unknown';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      active: 'Activa',
      trialing: 'Período prueba',
      past_due: 'Pago vencido',
      incomplete: 'Incompleta',
      incomplete_expired: 'Expirada',
      unpaid: 'Sin pagar',
      paused: 'Pausada',
      canceled: 'Cancelada',
    };
    return map[status] ?? status ?? '—';
  }

  getPaymentStatusClass(status: string | null): string {
    if (!status) return 'pay-unknown';
    if (status === 'succeeded') return 'pay-success';
    if (status === 'requires_payment_method' || status === 'canceled') return 'pay-failed';
    if (status === 'processing' || status === 'requires_action') return 'pay-pending';
    return 'pay-unknown';
  }

  getPaymentStatusLabel(status: string | null): string {
    const map: Record<string, string> = {
      succeeded: 'Cobrado',
      processing: 'Procesando',
      requires_action: 'Requiere acción',
      requires_payment_method: 'Fallo de pago',
      canceled: 'Cancelado',
    };
    return status ? (map[status] ?? status) : '—';
  }

  formatAmount(cents: number | null, currency = 'eur'): string {
    if (cents == null) return '—';
    return (cents / 100).toLocaleString('es-ES', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
    });
  }

  formatDate(dt: string | null): string {
    if (!dt) return '—';
    return new Date(dt).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  formatInterval(intervalo: string | null, cuenta: string | null): string {
    if (!intervalo) return '';
    const map: Record<string, string> = {
      day: 'día(s)',
      week: 'semana(s)',
      month: 'mes(es)',
      year: 'año(s)',
    };
    const label = map[intervalo] ?? intervalo;
    return `Cada ${cuenta || 1} ${label}`;
  }

  hasFailure(p: PlayerAutoPayment): boolean {
    return !!(p.failureCode || p.failureMessage);
  }

  // ── Totales globales (calculados tras la carga) ─────────────────
  get totalActive():   number { return this.cuotas.reduce((s, c) => s + c.activeCount, 0); }
  get totalFailed():   number { return this.cuotas.reduce((s, c) => s + c.pastDueCount, 0); }
  get totalPaused():   number { return this.cuotas.reduce((s, c) => s + c.pausedCount, 0); }
  get totalCanceled(): number { return this.cuotas.reduce((s, c) => s + c.canceledCount, 0); }

  trackByCuota(_: number, c: AutoPaymentCuota) { return c.pagoClubId; }
  trackByPlayer(_: number, p: PlayerAutoPayment) { return p.subscriptionId; }
}
