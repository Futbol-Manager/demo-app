import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { EMPTY, Observable, Subscription, interval } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Response } from 'src/app/core/services/models/response.model';

interface TrackingEvent {
  t: string;  // HH:mm:ss
  a: string;  // NAV, CLK, FRM, ERR
  p: string;  // path actual
  d: string;  // descripcion legible
}

@Injectable({
  providedIn: 'root'
})
export class TrackingService implements OnDestroy {

  private sessionId: number | null = null;
  private eventBuffer: TrackingEvent[] = [];
  private flushInterval: Subscription | null = null;
  private readonly FLUSH_INTERVAL_MS = 30000;

  constructor(private http: HttpClient) {
    window.addEventListener('beforeunload', this.onBeforeUnload.bind(this));
  }

  ngOnDestroy(): void {
    this.stopSession();
    window.removeEventListener('beforeunload', this.onBeforeUnload.bind(this));
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  startSession(): void {
    const usuario = localStorage.getItem('usuario');
    if (!usuario) return;

    const user = JSON.parse(usuario);
    const userId = user.userId;
    const profileType = user.profileType?.profileId ?? 0;
    const clubIdStr = sessionStorage.getItem('clubId');
    const clubId = clubIdStr ? parseInt(clubIdStr, 10) : null;

    const body = { userId, clubId, profileType };
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.post<Response>(
      environment.apiUrl + 'tracking/start',
      body,
      { headers: this.getAuthHeaders() }
    ).subscribe({
      next: (resp) => {
        if (resp && resp.data && resp.data.sessionId) {
          this.sessionId = resp.data.sessionId;
          this.startFlushTimer();
        }
      },
      error: (err) => {
        console.warn('[Tracking] Error starting session:', err);
      }
    });
  }

  stopSession(): void {
    this.flushBuffer();
    if (this.flushInterval) {
      this.flushInterval.unsubscribe();
      this.flushInterval = null;
    }
    if (this.sessionId !== null) {
      const token = localStorage.getItem('token');
      if (token) {
        this.http.post<Response>(
          environment.apiUrl + 'tracking/end',
          { sessionId: this.sessionId },
          { headers: this.getAuthHeaders() }
        ).subscribe({
          next: () => { this.sessionId = null; },
          error: () => { this.sessionId = null; }
        });
      } else {
        this.sessionId = null;
      }
    }
  }

  trackNavigation(path: string, description: string): void {
    this.addEvent('NAV', path, description);
  }

  trackClick(description: string): void {
    const path = window.location.pathname;
    this.addEvent('CLK', path, description);
  }

  trackFormSubmit(description: string): void {
    const path = window.location.pathname;
    this.addEvent('FRM', path, description);
  }

  trackError(description: string): void {
    const path = window.location.pathname;
    this.addEvent('ERR', path, description);
  }

  private addEvent(action: string, path: string, description: string): void {
    if (this.sessionId === null) return;

    const now = new Date();
    const t = now.toTimeString().substring(0, 8); // HH:mm:ss

    this.eventBuffer.push({ t, a: action, p: path, d: description });
  }

  private startFlushTimer(): void {
    if (this.flushInterval) return;
    this.flushInterval = interval(this.FLUSH_INTERVAL_MS).subscribe(() => {
      this.flushBuffer();
    });
  }

  private flushBuffer(): void {
    if (this.sessionId === null || this.eventBuffer.length === 0) return;

    const events = [...this.eventBuffer];
    this.eventBuffer = [];
    const eventsJson = JSON.stringify(events);

    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.post<Response>(
      environment.apiUrl + 'tracking/batch',
      { sessionId: this.sessionId, events: eventsJson },
      { headers: this.getAuthHeaders() }
    ).subscribe({
      error: (err) => {
        console.warn('[Tracking] Error flushing events:', err);
        this.eventBuffer = [...events, ...this.eventBuffer];
      }
    });
  }

  private onBeforeUnload(): void {
    if (this.sessionId === null) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    if (this.eventBuffer.length > 0) {
      const batchPayload = JSON.stringify({
        sessionId: this.sessionId,
        events: JSON.stringify(this.eventBuffer)
      });
      navigator.sendBeacon(
        environment.apiUrl + 'tracking/batch',
        new Blob([batchPayload], { type: 'application/json' })
      );
      this.eventBuffer = [];
    }

    const endPayload = JSON.stringify({ sessionId: this.sessionId });
    navigator.sendBeacon(
      environment.apiUrl + 'tracking/end',
      new Blob([endPayload], { type: 'application/json' })
    );
  }

  // Metodos para el admin
  getSessionsByClub(clubId: number): Observable<Response> {
    const token = localStorage.getItem('token');
    if (token) {
      return this.http.get<Response>(
        environment.apiUrl + 'tracking/sessions/' + clubId,
        { headers: this.getAuthHeaders() }
      );
    } else {
      return EMPTY;
    }
  }

  getSessionDetail(sessionId: number): Observable<Response> {
    const token = localStorage.getItem('token');
    if (token) {
      return this.http.get<Response>(
        environment.apiUrl + 'tracking/session/' + sessionId,
        { headers: this.getAuthHeaders() }
      );
    } else {
      return EMPTY;
    }
  }
}
