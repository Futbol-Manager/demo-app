import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../../shared/confirmation-dialog/confirmation-dialog.component';

@Injectable({ providedIn: 'root' })
export class ConfirmationService {

  constructor(private dialog: MatDialog) {}

  /**
   * Abre un diálogo de confirmación.
   * @param data Título y mensaje por clave i18n o texto directo.
   * @returns Observable<boolean>: true si confirma, false si cancela.
   */
  confirm(data: ConfirmationDialogData): Observable<boolean> {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data,
      width: '90%',
      maxWidth: '440px',
      panelClass: 'confirmation-dialog-panel',
      disableClose: false
    });
    return dialogRef.afterClosed();
  }

  /**
   * Confirmación estándar de eliminación (usa claves ACTIONS).
   * @param customMessageKey Clave i18n del mensaje (si no se usa customMessage).
   * @param customMessage Texto directo del mensaje (prioritario sobre customMessageKey).
   */
  confirmDelete(customMessageKey?: string, customMessage?: string): Observable<boolean> {
    return this.confirm({
      titleKey: 'ACTIONS.CONFIRM_DELETE_TITLE',
      messageKey: customMessage ? undefined : (customMessageKey ?? 'ACTIONS.CONFIRM_DELETE_MESSAGE'),
      message: customMessage,
      confirmKey: 'ACTIONS.DELETE',
      cancelKey: 'COMMON.CANCEL',
      confirmStyle: 'warn'
    });
  }
}
