import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';

export interface ConfirmationDialogData {
  /** Clave i18n del título (ej: ACTIONS.CONFIRM_DELETE_TITLE) o texto directo si no se usa key */
  titleKey?: string;
  /** Clave i18n del mensaje o texto directo */
  messageKey?: string;
  /** Título directo (si no se usa titleKey) */
  title?: string;
  /** Mensaje directo (si no se usa messageKey) */
  message?: string;
  /** Clave i18n del botón confirmar (ej: ACTIONS.DELETE) */
  confirmKey?: string;
  /** Clave i18n del botón cancelar */
  cancelKey?: string;
  /** Estilo del botón confirmar: 'primary' | 'warn' */
  confirmStyle?: 'primary' | 'warn';
}

@Component({
  selector: 'app-confirmation-dialog',
  templateUrl: './confirmation-dialog.component.html',
  styleUrls: ['./confirmation-dialog.component.scss']
})
export class ConfirmationDialogComponent {
  title = '';
  message = '';
  confirmText = '';
  cancelText = '';
  confirmStyle: 'primary' | 'warn' = 'primary';

  constructor(
    private dialogRef: MatDialogRef<ConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmationDialogData,
    private translate: TranslateService
  ) {
    this.title = data.title ?? (data.titleKey ? translate.instant(data.titleKey) : '');
    this.message = data.message ?? (data.messageKey ? translate.instant(data.messageKey) : '');
    this.confirmText = data.confirmKey ? translate.instant(data.confirmKey) : translate.instant('COMMON.ACCEPT');
    this.cancelText = data.cancelKey ? translate.instant(data.cancelKey) : translate.instant('COMMON.CANCEL');
    this.confirmStyle = data.confirmStyle ?? 'primary';
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
