import { Injectable } from '@angular/core';
import { ErpService } from './erp.service';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Singleton que gestiona el estado del consentimiento informado de IA para el ERP.
 * - Comprueba una sola vez por sesión si el usuario ya firmó.
 * - Expone showModal$ para que cualquier componente lo escuche.
 * - Una vez aceptado, marca la sesión como consentida sin volver a consultar el backend.
 */
@Injectable({ providedIn: 'root' })
export class ErpAiConsentService {

  /** true = el usuario ha firmado el aviso en esta sesión o en BD */
  private _consented = false;
  private _checked   = false;

  /** Emite true cuando hay que mostrar el modal */
  showModal$ = new BehaviorSubject<boolean>(false);

  /** Callback a ejecutar tras aceptar (la acción original que desencadenó el check) */
  private pendingAction: (() => void) | null = null;

  constructor(private erp: ErpService) {}

  get consented(): boolean { return this._consented; }

  /**
   * Comprueba si el usuario tiene consentimiento.
   * Si ya está en memoria o en sesión, devuelve true directamente.
   * Si no, consulta el backend.
   */
  checkAndEnsure(userId: number, clubId: number, onConsented: () => void): void {
    if (this._consented) { onConsented(); return; }

    // Comprobar sessionStorage para evitar llamadas repetidas en misma sesión
    const key = `erp_ai_consent_${userId}_${clubId}`;
    if (sessionStorage.getItem(key) === '1') {
      this._consented = true;
      onConsented();
      return;
    }

    if (!this._checked) {
      this._checked = true;
      this.erp.checkAiConsent(userId, clubId).subscribe({
        next: (res) => {
          if (res?.data?.accepted) {
            this._consented = true;
            sessionStorage.setItem(key, '1');
            onConsented();
          } else {
            this.pendingAction = onConsented;
            this.showModal$.next(true);
          }
        },
        error: () => {
          // En caso de error de red, mostrar el modal igualmente
          this.pendingAction = onConsented;
          this.showModal$.next(true);
        }
      });
    } else {
      this.pendingAction = onConsented;
      this.showModal$.next(true);
    }
  }

  /**
   * Llamado desde el modal cuando el usuario acepta.
   * Guarda en BD y ejecuta la acción pendiente.
   */
  accept(userId: number, clubId: number): void {
    const key = `erp_ai_consent_${userId}_${clubId}`;
    this.erp.saveAiConsent(userId, clubId).subscribe({
      next: () => {
        this._consented = true;
        this._checked   = true;
        sessionStorage.setItem(key, '1');
        this.showModal$.next(false);
        if (this.pendingAction) {
          const action = this.pendingAction;
          this.pendingAction = null;
          action();
        }
      },
      error: () => {
        alert('Error al guardar el consentimiento. Por favor, inténtalo de nuevo.');
      }
    });
  }

  dismiss(): void {
    this.pendingAction = null;
    this.showModal$.next(false);
  }
}
