import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface AiChatResponse {
  success: boolean;
  response?: string;
  creditsRemaining?: number;
  tokensUsed?: number;
  error?: string;
  message?: string;
}

export interface AiCreditsInfo {
  creditsFree: number;
  creditsPurchased: number;
  creditsUsed: number;
  creditsAvailable: number;
}

export interface AiUsageClub {
  clubId: number;
  totalMessages: number;
  totalCost: number;
  usersUsage: AiUsageUser[];
  recentLogs: any[];
}

export interface AiUsageUser {
  userId: number;
  userName?: string;
  totalMessages: number;
  totalCost: number;
}

export interface AiGlobalUsage {
  totalMessages: number;
  totalCost: number;
  totalCostUser: number;
  dailyUsage: { date: string; count: number }[];
  clubsUsage: { clubId: number; clubName?: string; totalMessages: number; totalCost: number }[];
}

@Injectable({
  providedIn: 'root'
})
export class AiChatService {

  private baseUrl = environment.apiUrl + 'ai';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * Envía un mensaje al asistente IA. Consume 1 crédito.
   */
  sendMessage(userId: number, clubId: number | null, screenContext: string, message: string, apiKeyType: string = 'users'): Observable<AiChatResponse> {
    const body = { userId, clubId, screenContext, message, apiKeyType };
    return this.http.post<AiChatResponse>(`${this.baseUrl}/chat`, body, { headers: this.getHeaders() }).pipe(
      timeout(45000),
      catchError(err => {
        console.error('[AiChatService] Error:', err);
        const isTimeout = err?.name === 'TimeoutError';
        return of({
          success: false,
          error: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
          message: isTimeout
            ? 'La respuesta tardó demasiado. Inténtalo de nuevo.'
            : 'Error de conexión. Inténtalo de nuevo.'
        });
      })
    );
  }

  /**
   * Obtiene los créditos del usuario.
   */
  getCredits(userId: number): Observable<AiCreditsInfo> {
    return this.http.get<AiCreditsInfo>(`${this.baseUrl}/credits/${userId}`, { headers: this.getHeaders() }).pipe(
      timeout(10000),
      catchError(err => {
        console.error('[AiChatService] Error getting credits:', err);
        return of({ creditsFree: 50, creditsPurchased: 0, creditsUsed: 0, creditsAvailable: 50 });
      })
    );
  }

  /**
   * Uso de IA por club (admin).
   */
  getUsageByClub(clubId: number): Observable<AiUsageClub> {
    return this.http.get<AiUsageClub>(`${this.baseUrl}/usage/club/${clubId}`, { headers: this.getHeaders() });
  }

  /**
   * Uso de IA por usuario (admin).
   */
  getUsageByUser(userId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/usage/user/${userId}`, { headers: this.getHeaders() });
  }

  /**
   * KPIs globales de uso de IA (admin).
   */
  getGlobalUsage(): Observable<AiGlobalUsage> {
    return this.http.get<AiGlobalUsage>(`${this.baseUrl}/usage/global`, { headers: this.getHeaders() });
  }

  /**
   * Comprar créditos (via Stripe). Agrega directamente sin pago.
   */
  purchaseCredits(userId: number, amount: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/credits/purchase`, { userId, amount }, { headers: this.getHeaders() });
  }

  /**
   * Crea una Stripe Checkout Session para comprar créditos.
   * Redirige al usuario a la pagina de pago de Stripe.
   */
  createCheckoutSession(userId: number, credits: number, priceEur: number): Observable<{ success: boolean; checkoutUrl?: string; sessionId?: string; error?: string }> {
    const successUrl = window.location.origin + '/dashboard/ai-credits-success';
    const cancelUrl = window.location.href;

    return this.http.post<any>(`${this.baseUrl}/credits/checkout`, {
      userId,
      credits,
      priceEur,
      successUrl,
      cancelUrl,
    }, { headers: this.getHeaders() }).pipe(
      timeout(15000),
      catchError(err => {
        console.error('[AiChatService] Checkout error:', err);
        return of({ success: false, error: 'Error al crear sesión de pago.' });
      })
    );
  }

  /**
   * Verifica el pago de una Checkout Session y acredita los créditos.
   */
  verifyCheckoutSession(sessionId: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/credits/checkout/verify`, { sessionId }, { headers: this.getHeaders() }).pipe(
      timeout(15000),
      catchError(err => {
        console.error('[AiChatService] Verify error:', err);
        return of({ success: false, error: 'Error al verificar pago.' });
      })
    );
  }
}
