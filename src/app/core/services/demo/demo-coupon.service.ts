import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface DemoCouponResponse {
  code: string;
  discountPercent: number;
  expiresAt: string;
  status: 'created' | 'existing' | 'error';
  message: string;
}

const SESSION_KEY_COUPON  = 'demoCouponCode';
const SESSION_KEY_SHOWN   = 'demoCouponModalShown';

@Injectable({ providedIn: 'root' })
export class DemoCouponService {

  private readonly baseUrl = (environment as any).demoLeadApiUrl ?? '';

  constructor(private http: HttpClient) {}

  /**
   * Llama al backend para generar (o recuperar) un cupón de demo para el email dado.
   * Si el backend falla devuelve null sin bloquear el flujo.
   */
  generateCoupon(email: string): Observable<DemoCouponResponse | null> {
    const base = this.baseUrl.replace(/\/$/, '');
    return this.http.post<DemoCouponResponse>(
      `${base}/public/demo-coupon/generate`,
      { email }
    ).pipe(
      catchError(() => of(null))
    );
  }

  /** Persiste el código del cupón en sessionStorage para autoaplicarlo al suscribirse. */
  saveCouponToSession(code: string): void {
    sessionStorage.setItem(SESSION_KEY_COUPON, code);
  }

  /** Recupera el código del cupón desde sessionStorage. */
  getCouponFromSession(): string | null {
    return sessionStorage.getItem(SESSION_KEY_COUPON);
  }

  /** Elimina el cupón de sessionStorage (p.e. al cerrar sesión). */
  clearCouponFromSession(): void {
    sessionStorage.removeItem(SESSION_KEY_COUPON);
  }

  /** Devuelve true si el modal de email/cupón ya se mostró en esta sesión. */
  wasModalShown(): boolean {
    return sessionStorage.getItem(SESSION_KEY_SHOWN) === 'true';
  }

  /** Marca que el modal ya se mostró en esta sesión. */
  markModalShown(): void {
    sessionStorage.setItem(SESSION_KEY_SHOWN, 'true');
  }

  /** Construye la URL de suscripción con el cupón pre-aplicado como query param. */
  buildSubscriptionUrl(basePlanUrl: string, couponCode: string | null): string {
    if (!couponCode) return basePlanUrl;
    const separator = basePlanUrl.includes('?') ? '&' : '?';
    return `${basePlanUrl}${separator}coupon=${encodeURIComponent(couponCode)}`;
  }
}
