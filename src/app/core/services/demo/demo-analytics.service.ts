import { Injectable } from '@angular/core';
import { DemoService } from './demo.service';

/**
 * Eventos de embudo de la demo.
 *
 * Hasta ahora solo se medía el PageView del píxel de Meta y un único evento Lead
 * al generar el cupón, así que no había forma de saber en qué pantalla abandona
 * el visitante. Estos eventos permiten reconstruir el recorrido completo:
 * intro → rol → email → pantallas visitadas → CTA de suscripción.
 */
export type DemoFunnelEvent =
  | 'demo_intro_start'
  | 'demo_intro_complete'
  | 'demo_intro_skip'
  | 'demo_role_selected'
  | 'demo_email_submitted'
  | 'demo_coupon_generated'
  | 'demo_started'
  | 'demo_screen_view'
  | 'demo_role_switch'
  | 'demo_cta_subscribe'
  | 'demo_tutorial_start'
  | 'demo_session_end'
  // Recorrido guiado de hitos y oferta Club Fundador
  | 'demo_journey_go'
  | 'demo_journey_step'
  | 'demo_journey_complete'
  | 'demo_journey_dismiss'
  | 'demo_offer_view'
  | 'demo_offer_close'
  | 'demo_offer_cta'
  | 'demo_offer_whatsapp';

@Injectable({ providedIn: 'root' })
export class DemoAnalyticsService {
  constructor(private demoService: DemoService) {}

  /** Envía un evento de embudo a GA4 (y a Meta cuando es una conversión). */
  track(event: DemoFunnelEvent, params: Record<string, unknown> = {}): void {
    if (!this.demoService.isDemoMode()) return;

    const payload = {
      ...params,
      demo_role: this.demoService.getDemoRole() || 'none',
    };

    const gtag = (window as any).gtag;
    if (typeof gtag === 'function') {
      try {
        gtag('event', event, payload);
      } catch {
        // Nunca romper la demo por un fallo de analítica
      }
    }
  }

  /** Conversión relevante para la optimización de campañas de Meta. */
  trackMetaConversion(event: 'Lead' | 'ViewContent' | 'InitiateCheckout', params: Record<string, unknown> = {}): void {
    if (!this.demoService.isDemoMode()) return;

    const fbq = (window as any).fbq;
    if (typeof fbq === 'function') {
      try {
        fbq('track', event, params);
      } catch {
        // idem
      }
    }
  }
}
