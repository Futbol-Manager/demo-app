import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { isDemoMode } from '../demo/demo-mode';

@Injectable({ providedIn: 'root' })
export class CoachSubscriptionService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private authHeaders(): HttpHeaders | undefined {
    const token = localStorage.getItem('token');
    return token ? new HttpHeaders({ 'Authorization': `Bearer ${token}` }) : undefined;
  }

  createCheckoutSession(
    userId: number,
    planType: 'monthly' | 'annual',
    successUrl: string,
    cancelUrl: string
  ): Observable<{ checkoutUrl: string; sessionId: string; success: boolean }> {
    const headers = this.authHeaders();
    if (!headers) return throwError(() => new Error('No auth token'));
    const url = `${this.base}stripe/coach/create-checkout`;
    return this.http.post<any>(url, { userId, planType, successUrl, cancelUrl }, { headers });
  }

  verifyCheckout(
    sessionId: string,
    userId: number
  ): Observable<{ success: boolean; planType: string }> {
    const headers = this.authHeaders();
    if (!headers) return throwError(() => new Error('No auth token'));
    const url = `${this.base}stripe/coach/verify-checkout`;
    return this.http.post<any>(url, { sessionId, userId }, { headers });
  }

  // ── Admin endpoints ──────────────────────────────────────────

  getAdminCoaches(): Observable<any> {
    if (isDemoMode()) {
      return of({ data: [{ userId: 1, belongsToClub: true, subscriptionPlan: '', dateFinal: '', monthsSubscribed: 0 }] });
    }
    const headers = this.authHeaders();
    if (!headers) return throwError(() => new Error('No auth token'));
    return this.http.get<any>(`${this.base}stripe/admin/coaches`, { headers });
  }

  getCoachInvoices(userId: number): Observable<any> {
    const headers = this.authHeaders();
    if (!headers) return throwError(() => new Error('No auth token'));
    return this.http.get<any>(`${this.base}stripe/admin/coaches/${userId}/invoices`, { headers });
  }
}
