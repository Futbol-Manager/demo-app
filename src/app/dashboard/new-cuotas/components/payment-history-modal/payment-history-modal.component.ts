import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ClubService } from '../../../../core/services/club/club.service';
import { Response } from '../../../../core/services/models/response.model';

@Component({
  selector: 'app-payment-history-modal',
  templateUrl: './payment-history-modal.component.html',
  styleUrls: ['./payment-history-modal.component.scss'],
})
export class PaymentHistoryModalComponent implements OnChanges {
  @Input() clubId!: number;
  @Input() temporada!: string;
  @Input() player: any;
  @Input() visible = false;

  @Output() onClose = new EventEmitter<void>();

  payments: any[] = [];
  loading = false;

  constructor(
    private clubService: ClubService,
    private translate: TranslateService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible && this.player) {
      this.loadHistory();
    }
  }

  loadHistory(): void {
    this.loading = true;
    this.payments = [];

    this.clubService
      .getListHistoryPagosByPlayer(this.clubId, this.temporada, this.player.playerId)
      .subscribe({
        next: (response: Response) => {
          if (response.data !== null) {
            this.payments = response.data;
          }
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  getMetodoLabel(metodo: string): string {
    if (!metodo) return 'Otro';
    const map: Record<string, string> = {
      Tarjeta: 'Stripe',
      Stripe: 'Stripe',
      Efectivo: 'Efectivo',
      'Transferencia bancaria': 'Transferencia',
      Transferencia: 'Transferencia',
      Bizum: 'Bizum',
    };
    return map[metodo] || 'Otro';
  }

  getMetodoKey(metodo: string): string {
    const label = this.getMetodoLabel(metodo).toLowerCase();
    const keyMap: Record<string, string> = {
      stripe: 'stripe',
      efectivo: 'efectivo',
      transferencia: 'transferencia',
      bizum: 'bizum',
    };
    return keyMap[label] ?? 'otro';
  }

  getMetodoIcon(metodo: string): string {
    const key = this.getMetodoKey(metodo);
    const iconMap: Record<string, string> = {
      stripe:        'bi-credit-card',
      efectivo:      'bi-cash-stack',
      transferencia: 'bi-bank',
      bizum:         'bi-phone',
      otro:          'bi-three-dots',
    };
    return iconMap[key] ?? 'bi-three-dots';
  }

  getInitials(nombre: string): string {
    if (!nombre) return '?';
    const parts = nombre.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return nombre.substring(0, 2).toUpperCase();
  }

  isRefund(importe: any): boolean {
    const val = parseFloat(String(importe).replace(',', '.'));
    return !isNaN(val) && val < 0;
  }

  getTotalPagado(): number {
    return this.payments.reduce((acc, p) => {
      const val = parseFloat(String(p.importe).replace(',', '.'));
      return acc + (isNaN(val) || val < 0 ? 0 : val);
    }, 0);
  }

  getTotalReembolsado(): number {
    return this.payments.reduce((acc, p) => {
      const val = parseFloat(String(p.importe).replace(',', '.'));
      return acc + (isNaN(val) || val >= 0 ? 0 : val);
    }, 0);
  }

  getUltimoPago(): Date | null {
    const pagos = this.payments.filter(p => p.datePago);
    if (pagos.length === 0) return null;
    return new Date(
      Math.max(...pagos.map(p => new Date(p.datePago).getTime()))
    );
  }

  isReceiptLink(comentario: string): boolean {
    return !!comentario && comentario.startsWith('http');
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('phm-overlay')) {
      this.close();
    }
  }

  close(): void {
    this.payments = [];
    this.onClose.emit();
  }
}
