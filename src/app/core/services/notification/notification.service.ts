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

  /** Error al cargar datos */
  errorLoad(): void { this.error('COMMON.ERROR_LOAD'); }
  /** Exportado correctamente */
  exportSuccess(): void { this.success('COMMON.EXPORT_OK'); }
  /** Error al exportar */
  exportError(): void { this.error('COMMON.EXPORT_ERROR'); }
  /** Cambios guardados */
  changesSaved(): void { this.success('COMMON.CHANGES_SAVED'); }
  /** Descarga completa */
  downloadOk(): void { this.success('COMMON.DOWNLOAD_OK'); }
  /** Error al descargar */
  downloadError(): void { this.error('COMMON.DOWNLOAD_ERROR'); }
  /** Subida completada */
  uploadOk(): void { this.success('COMMON.UPLOAD_OK'); }
  /** Error al subir */
  uploadError(): void { this.error('COMMON.UPLOAD_ERROR'); }
}
