import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Modal reutilizable para confirmar un cambio de estado de abonado con
 * un campo opcional "motivo" (Bloque 6). Lo usan tanto la lista del
 * club como la ficha individual para todas las transiciones:
 *
 * - approve   (2 → 1)
 * - reject    (2 → 0)
 * - deactivate(1 → 0)
 * - reactivate(0 → 1)
 *
 * El motivo es opcional y SIEMPRE privado del club. Cuando se deja
 * vacío, la fila del histórico se guarda sin motivo. El bulk del
 * Bloque 5 NO usa este modal (mantiene su propio confirm sin motivo).
 */
@Component({
  selector: 'app-abonado-estado-modal',
  templateUrl: './abonado-estado-modal.component.html',
  styleUrls: ['./abonado-estado-modal.component.scss'],
})
export class AbonadoEstadoModalComponent {
  /** Acción a confirmar. Determina título, mensaje y color del botón. */
  @Input() action: 'approve' | 'reject' | 'deactivate' | 'reactivate' = 'approve';

  /** Nombre completo del abonado para personalizar el copy. */
  @Input() abonadoNombre = '';

  /** Mientras `saving=true` los botones se bloquean y se muestra spinner. */
  @Input() saving = false;

  /** Emite el motivo (puede ser cadena vacía → no se guarda motivo). */
  @Output() confirm = new EventEmitter<string>();

  /** Emite cuando el usuario cancela. */
  @Output() cancel = new EventEmitter<void>();

  motivo = '';

  /** Clave i18n del título según la acción. */
  get titleKey(): string {
    switch (this.action) {
      case 'approve':    return 'SUBS.REASON.TITLE_APPROVE';
      case 'reject':     return 'SUBS.REASON.TITLE_REJECT';
      case 'deactivate': return 'SUBS.REASON.TITLE_DEACTIVATE';
      case 'reactivate': return 'SUBS.REASON.TITLE_REACTIVATE';
    }
  }

  /** Clave i18n del subtítulo descriptivo. */
  get subtitleKey(): string {
    switch (this.action) {
      case 'approve':    return 'SUBS.REASON.SUB_APPROVE';
      case 'reject':     return 'SUBS.REASON.SUB_REJECT';
      case 'deactivate': return 'SUBS.REASON.SUB_DEACTIVATE';
      case 'reactivate': return 'SUBS.REASON.SUB_REACTIVATE';
    }
  }

  /** Clave i18n del CTA de confirmación. */
  get confirmKey(): string {
    switch (this.action) {
      case 'approve':    return 'SUBS.REASON.CTA_APPROVE';
      case 'reject':     return 'SUBS.REASON.CTA_REJECT';
      case 'deactivate': return 'SUBS.REASON.CTA_DEACTIVATE';
      case 'reactivate': return 'SUBS.REASON.CTA_REACTIVATE';
    }
  }

  /** Color del botón principal. */
  get isWarn(): boolean {
    return this.action === 'reject' || this.action === 'deactivate';
  }

  /** Icono Bootstrap del header. */
  get headerIcon(): string {
    switch (this.action) {
      case 'approve':    return 'bi-check-circle-fill';
      case 'reject':     return 'bi-x-circle-fill';
      case 'deactivate': return 'bi-pause-circle-fill';
      case 'reactivate': return 'bi-arrow-counterclockwise';
    }
  }

  onConfirm(): void {
    if (this.saving) return;
    this.confirm.emit(this.motivo.trim());
  }

  onCancel(): void {
    if (this.saving) return;
    this.cancel.emit();
  }

  /** Cierre con tecla Escape sobre el overlay. */
  onBackdrop(ev: MouseEvent): void {
    if (ev.target === ev.currentTarget) this.onCancel();
  }
}
