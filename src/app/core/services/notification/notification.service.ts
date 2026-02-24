import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';

@Injectable({ providedIn: 'root' })
export class NotificationService {

  constructor(
    private toastr: ToastrService,
    private translate: TranslateService
  ) {}

  /**
   * Muestra mensaje de éxito.
   * @param messageKey Clave i18n (ej: ACTIONS.SAVE_SUCCESS) o mensaje directo si no es una clave.
   */
  success(messageKey: string, useTranslation = true): void {
    const msg = useTranslation ? this.translate.instant(messageKey) : messageKey;
    this.toastr.success(msg);
  }

  /**
   * Muestra mensaje de error.
   */
  error(messageKey: string, useTranslation = true): void {
    const msg = useTranslation ? this.translate.instant(messageKey) : messageKey;
    this.toastr.error(msg);
  }

  /**
   * Muestra mensaje de advertencia.
   */
  warning(messageKey: string, useTranslation = true): void {
    const msg = useTranslation ? this.translate.instant(messageKey) : messageKey;
    this.toastr.warning(msg);
  }

  /**
   * Muestra mensaje informativo.
   */
  info(messageKey: string, useTranslation = true): void {
    const msg = useTranslation ? this.translate.instant(messageKey) : messageKey;
    this.toastr.info(msg);
  }

  /** Error genérico (ACTIONS.ERROR_GENERIC) */
  errorGeneric(): void {
    this.error('ACTIONS.ERROR_GENERIC');
  }

  /** Eliminado correctamente (ACTIONS.DELETE_SUCCESS) */
  deleteSuccess(): void {
    this.success('ACTIONS.DELETE_SUCCESS');
  }

  /** Guardado correctamente (ACTIONS.SAVE_SUCCESS) */
  saveSuccess(): void {
    this.success('ACTIONS.SAVE_SUCCESS');
  }
}
