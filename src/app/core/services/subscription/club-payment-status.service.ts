import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { ClubPaymentStatus, ClubPaymentStatusType } from '../../models/subscription/club-subscription.model';
import { isDemoMode } from '../demo/demo-mode';

@Injectable({
  providedIn: 'root'
})
export class ClubPaymentStatusService {

  private apiUrl = environment.apiUrl;
  private status$ = new BehaviorSubject<ClubPaymentStatus | null>(null);
  private loading$ = new BehaviorSubject<boolean>(false);

  constructor(private http: HttpClient) {}

  /** Estado actual de pago del club (cache por sesión). */
  getStatus(): ClubPaymentStatus | null {
    return this.status$.value;
  }

  getStatusObservable(): Observable<ClubPaymentStatus | null> {
    return this.status$.asObservable();
  }

  getLoadingObservable(): Observable<boolean> {
    return this.loading$.asObservable();
  }

  /** Indica si el acceso al dashboard debe bloquearse (más de 3 días sin pagar). */
  isBlocked(): boolean {
    return this.status$.value?.status === 'payment_required';
  }

  /** Indica si está en período de gracia (mostrar banner pero permitir uso). */
  isGracePeriod(): boolean {
    return this.status$.value?.status === 'grace_period';
  }

  /** Refresca el estado de pago desde el backend. En modo demo siempre "activo". */
  refresh(clubId: number): Observable<ClubPaymentStatus | null> {
    if (isDemoMode()) {
      const demoStatus: ClubPaymentStatus = {
        status: 'active',
        daysOverdue: 0,
        messageKey: 'CLUB_PAYMENT_STATUS.ACTIVE'
      };
      this.status$.next(demoStatus);
      this.loading$.next(false);
      return of(demoStatus);
    }
    if (clubId <= 0) {
      this.status$.next(null);
      return of(null);
    }
    this.loading$.next(true);
    return this.http.get<{ status?: number; data?: Record<string, unknown> }>(
      `${this.apiUrl}club-plan/${clubId}/payment-status`
    ).pipe(
      map(res => {
        const data = res?.data;
        if (!data || res.status !== 200) return null;
        const status: ClubPaymentStatus = {
          status: (data['status'] as ClubPaymentStatusType) || 'active',
          renewDate: data['renewDate'] as string | undefined,
          daysOverdue: Number(data['daysOverdue']) || 0,
          messageKey: (data['messageKey'] as string) || 'CLUB_PAYMENT_STATUS.ACTIVE'
        };
        return status;
      }),
      tap(status => {
        this.status$.next(status);
        this.loading$.next(false);
      }),
      catchError(() => {
        this.loading$.next(false);
        this.status$.next(null);
        return of(null);
      })
    );
  }

  /** Limpia el estado (p. ej. al cerrar sesión). */
  clear(): void {
    this.status$.next(null);
  }
}
