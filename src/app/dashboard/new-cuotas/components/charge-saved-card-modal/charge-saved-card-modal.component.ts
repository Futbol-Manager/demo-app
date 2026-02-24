import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { TeamService } from '../../../../core/services/team/team.service';

@Component({
  selector: 'app-charge-saved-card-modal',
  templateUrl: './charge-saved-card-modal.component.html',
  styleUrls: ['./charge-saved-card-modal.component.scss']
})
export class ChargeSavedCardModalComponent implements OnChanges {

  @Input() player: any;
  @Input() clubId!: number;
  @Input() accountId!: string;
  @Input() pagosClub: any[] = [];
  @Input() visible = false;

  @Output() onClose = new EventEmitter<void>();
  @Output() onCharged = new EventEmitter<any>();

  savedCards: any[] = [];
  selectedCardId: number | null = null;
  selectedPagoClubId: number | null = null;
  loading = false;
  charging = false;

  constructor(
    private teamService: TeamService,
    private translate: TranslateService,
    private toastr: ToastrService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible && this.player) {
      this.reset();
      this.loadSavedCards();
    }
  }

  private reset(): void {
    this.selectedCardId = null;
    this.selectedPagoClubId = this.pagosClub.length === 1 ? this.pagosClub[0].pagoClubId : null;
    this.charging = false;
  }

  private loadSavedCards(): void {
    this.loading = true;
    this.teamService.getSavedCards(this.player.playerId, this.clubId).subscribe({
      next: (resp: any) => {
        this.savedCards = resp?.data ?? [];
        this.loading = false;
      },
      error: () => {
        this.toastr.error(this.translate.instant('PAYMENTS.CHARGE_MODAL.LOAD_CARDS_ERROR'));
        this.loading = false;
      }
    });
  }

  get selectedPago(): any {
    return this.pagosClub.find(p => p.pagoClubId === this.selectedPagoClubId) ?? null;
  }

  getCardBrandIcon(brand: string): string {
    switch ((brand || '').toLowerCase()) {
      case 'visa': return 'fab fa-cc-visa';
      case 'mastercard': return 'fab fa-cc-mastercard';
      case 'amex': return 'fab fa-cc-amex';
      default: return 'fas fa-credit-card';
    }
  }

  charge(): void {
    if (!this.selectedCardId) {
      this.toastr.warning(this.translate.instant('PAYMENTS.CHARGE_MODAL.SELECT_CARD'));
      return;
    }
    if (!this.selectedPagoClubId || !this.selectedPago) {
      this.toastr.warning(this.translate.instant('PAYMENTS.CHARGE_MODAL.SELECT_CUOTA'));
      return;
    }

    this.charging = true;
    const body = {
      savedCardId: this.selectedCardId,
      amount: this.selectedPago.importe,
      clubId: this.clubId,
      accountId: this.accountId,
      pagoClubId: this.selectedPagoClubId,
      playerId: this.player.playerId
    };

    this.teamService.chargeSavedCard(body).subscribe({
      next: (resp: any) => {
        this.toastr.success(this.translate.instant('PAYMENTS.CHARGE_MODAL.SUCCESS'));
        this.charging = false;
        this.onCharged.emit(resp);
      },
      error: () => {
        this.toastr.error(this.translate.instant('PAYMENTS.CHARGE_MODAL.ERROR'));
        this.charging = false;
      }
    });
  }

  close(): void {
    this.onClose.emit();
  }
}
