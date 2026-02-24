import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-impute-payment-modal',
  templateUrl: './impute-payment-modal.component.html',
  styleUrls: ['./impute-payment-modal.component.scss']
})
export class ImputePaymentModalComponent implements OnChanges {

  @Input() clubId!: number;
  @Input() temporada!: string;
  @Input() player: any;
  @Input() pagosClub: any[] = [];
  @Input() visible = false;

  @Output() onSave = new EventEmitter<any>();
  @Output() onClose = new EventEmitter<void>();

  selectedPagoClubId: number | null = null;
  importe: number | null = null;
  metodo: string = '';
  metodoOtro: string = '';
  fechaPago: string = '';
  comentario: string = '';

  metodos = ['Efectivo', 'Transferencia bancaria', 'Bizum', 'Otro'];

  constructor(
    private translate: TranslateService,
    private toastr: ToastrService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.resetForm();
    }
  }

  resetForm(): void {
    this.selectedPagoClubId = this.pagosClub.length === 1 ? this.pagosClub[0].pagoClubId : null;
    this.importe = null;
    this.metodo = '';
    this.metodoOtro = '';
    this.fechaPago = new Date().toISOString().substring(0, 10);
    this.comentario = '';
    this.prefillImporte();
  }

  onPagoClubChange(): void {
    this.prefillImporte();
  }

  private prefillImporte(): void {
    if (!this.selectedPagoClubId) return;
    const pago = this.pagosClub.find(p => p.pagoClubId === this.selectedPagoClubId);
    if (pago?.importe != null) {
      this.importe = pago.importe;
    }
  }

  save(): void {
    if (!this.selectedPagoClubId) {
      this.toastr.warning(this.translate.instant('PAYMENTS.IMPUTE_MODAL.SELECT_CUOTA'));
      return;
    }
    if (!this.importe || this.importe <= 0) {
      this.toastr.warning(this.translate.instant('PAYMENTS.IMPUTE_MODAL.INVALID_AMOUNT'));
      return;
    }
    if (!this.metodo) {
      this.toastr.warning(this.translate.instant('PAYMENTS.IMPUTE_MODAL.SELECT_METHOD'));
      return;
    }

    const metodoFinal = this.metodo === 'Otro' ? this.metodoOtro.trim() || 'Otro' : this.metodo;

    this.onSave.emit({
      clubId: this.clubId,
      temporada: this.temporada,
      playerId: this.player?.playerId,
      pagoClubId: this.selectedPagoClubId,
      importe: this.importe,
      metodo: metodoFinal,
      fechaPago: this.fechaPago,
      comentario: this.comentario.trim()
    });
  }

  close(): void {
    this.onClose.emit();
  }
}
