import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-payment-form-modal',
  templateUrl: './payment-form-modal.component.html',
  styleUrls: ['./payment-form-modal.component.scss']
})
export class PaymentFormModalComponent implements OnChanges {

  @Input() clubId!: number;
  @Input() temporada!: string;
  @Input() teams: any[] = [];
  @Input() pago: any = null;
  @Input() visible = false;

  @Output() onSave = new EventEmitter<any>();
  @Output() onClose = new EventEmitter<void>();

  titulo = '';
  descripcion = '';
  importe: number | null = null;
  fechaLimite = '';
  obligatorio = false;
  tipoCobro = 0;
  selectedTeamIds: number[] = [];

  intervalo = 'month';
  intervaloCuenta = 1;
  fechaInicio = '';
  fechaFin = '';

  periodos = [
    { value: 'day', labelKey: 'PAYMENTS.INTERVAL_DAY' },
    { value: 'week', labelKey: 'PAYMENTS.INTERVAL_WEEK' },
    { value: 'month', labelKey: 'PAYMENTS.INTERVAL_MONTH' },
    { value: 'year', labelKey: 'PAYMENTS.INTERVAL_YEAR' },
  ];

  constructor(private translate: TranslateService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.loadForm();
    }
  }

  private loadForm(): void {
    if (this.pago) {
      this.titulo = this.pago.titulo || '';
      this.descripcion = this.pago.descripcion || '';
      this.importe = this.pago.importe != null ? Number(this.pago.importe) : null;
      this.fechaLimite = this.pago.fechaLimite || '';
      this.obligatorio = !!this.pago.obligatorio;
      this.tipoCobro = this.pago.tipoCobro ?? 0;
      this.selectedTeamIds = this.pago.listTeams ? [...this.pago.listTeams] : [];
      this.intervalo = this.pago.intervalo || 'month';
      this.intervaloCuenta = this.pago.intervaloCuenta || 1;
      this.fechaInicio = this.pago.fechaInicio || '';
      this.fechaFin = this.pago.fechaFin || '';
    } else {
      this.resetForm();
    }
  }

  private resetForm(): void {
    this.titulo = '';
    this.descripcion = '';
    this.importe = null;
    this.fechaLimite = '';
    this.obligatorio = false;
    this.tipoCobro = 0;
    this.selectedTeamIds = [];
    this.intervalo = 'month';
    this.intervaloCuenta = 1;
    this.fechaInicio = '';
    this.fechaFin = '';
  }

  get isEdit(): boolean {
    return this.pago != null;
  }

  get isSuscripcion(): boolean {
    return this.tipoCobro === 2;
  }

  toggleTeam(teamId: number): void {
    const idx = this.selectedTeamIds.indexOf(teamId);
    if (idx >= 0) {
      this.selectedTeamIds.splice(idx, 1);
    } else {
      this.selectedTeamIds.push(teamId);
    }
  }

  isTeamSelected(teamId: number): boolean {
    return this.selectedTeamIds.includes(teamId);
  }

  get allTeamsSelected(): boolean {
    return this.teams.length > 0 && this.selectedTeamIds.length === this.teams.length;
  }

  toggleSelectAll(): void {
    if (this.allTeamsSelected) {
      this.selectedTeamIds = [];
    } else {
      this.selectedTeamIds = this.teams.map(t => t.value);
    }
  }

  save(): void {
    const data: any = {
      clubId: this.clubId,
      temporada: this.temporada,
      titulo: this.titulo,
      descripcion: this.descripcion,
      importe: this.importe != null ? String(this.importe) : '',
      fechaLimite: this.fechaLimite,
      obligatorio: this.obligatorio ? 1 : 0,
      tipoCobro: this.tipoCobro,
      listTeams: this.selectedTeamIds,
    };

    if (this.isEdit && this.pago.pagoClubId) {
      data.pagoClubId = this.pago.pagoClubId;
    }

    if (this.isSuscripcion) {
      data.intervalo = this.intervalo;
      data.intervaloCuenta = this.intervaloCuenta;
      data.fechaInicio = this.fechaInicio || null;
      data.fechaFin = this.fechaFin || null;
    }

    this.onSave.emit(data);
  }

  close(): void {
    this.onClose.emit();
  }
}
