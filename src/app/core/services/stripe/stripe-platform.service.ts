import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { loadStripe, Stripe, StripeConstructorOptions } from '@stripe/stripe-js';
import { environment } from 'src/environments/environment';
import { isDemoMode } from '../demo/demo-mode';

/**
 * Configuración Stripe efectiva para un club concreto. Se obtiene del backend
 * en `GET /rest/stripe/config/{clubId}` y refleja en qué plataforma Stripe
 * (España legacy vs Suiza Sphaira Group) opera el club.
 */
export interface StripeClubConfig {
  platform: 'ES' | 'CH';
  publishableKey: string;
  /** Solo presente en CH (direct charges): cuenta Connect del club. */
  stripeAccount?: string;
}

/**
 * Servicio que resuelve la plataforma Stripe correcta por club y entrega
 * instancias `Stripe` ya inicializadas con la `pk` y, en caso CH, el header
 * `stripeAccount` para direct charges.
 *
 * En modo demo devuelve siempre la configuración de fallback ES (sin llamar
 * al backend), ya que los cobros reales están capados en el demo.
 */
@Injectable({ providedIn: 'root' })
export class StripePlatformService {
  private cache: Map<number, Observable<StripeClubConfig>> = new Map();
  private stripeInstances: Map<string, Promise<Stripe | null>> = new Map();

  constructor(private http: HttpClient) {}

  getClubConfig(clubId: number): Observable<StripeClubConfig> {
    if (isDemoMode() || !clubId || clubId <= 0) {
      return of(this.fallbackEsConfig());
    }
    const cached = this.cache.get(clubId);
    if (cached) return cached;

    const url = `${environment.apiUrl}stripe/config/${clubId}`;
    const obs = this.http.get<any>(url).pipe(
      map(res => {
        const data = res?.data ?? res;
        const cfg: StripeClubConfig = {
          platform: (data?.platform === 'CH' ? 'CH' : 'ES'),
          publishableKey: data?.publishableKey || environment.stripePublicKey,
          stripeAccount: data?.stripeAccount || undefined,
        };
        return cfg;
      }),
      catchError(() => of(this.fallbackEsConfig())),
      shareReplay(1),
    );
    this.cache.set(clubId, obs);
    return obs;
  }

  async getStripeForClub(clubId: number): Promise<{ stripe: Stripe | null; config: StripeClubConfig }> {
    const cfg = await this.getClubConfig(clubId).toPromise() ?? this.fallbackEsConfig();
    const instanceKey = `${cfg.publishableKey}|${cfg.stripeAccount ?? ''}`;
    let promise = this.stripeInstances.get(instanceKey);
    if (!promise) {
      const opts: StripeConstructorOptions | undefined = cfg.stripeAccount
        ? { stripeAccount: cfg.stripeAccount }
        : undefined;
      promise = loadStripe(cfg.publishableKey, opts);
      this.stripeInstances.set(instanceKey, promise);
    }
    const stripe = await promise;
    return { stripe, config: cfg };
  }

  invalidate(clubId: number): void {
    this.cache.delete(clubId);
  }

  private fallbackEsConfig(): StripeClubConfig {
    return {
      platform: 'ES',
      publishableKey: environment.stripePublicKey,
    };
  }
}
