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
    if (!metodo) return '-';
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

  isReceiptLink(comentario: string): boolean {
    return !!comentario && comentario.startsWith('http');
  }

  close(): void {
    this.payments = [];
    this.onClose.emit();
  }
}
