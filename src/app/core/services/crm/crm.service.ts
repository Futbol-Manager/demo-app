import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { Response } from 'src/app/core/services/models/response.model';

@Injectable({
  providedIn: 'root'
})
export class CrmService {

  private base = environment.apiUrl;

  private activityCache: { [page: number]: { data: any, timestamp: number } } = {};
  private recentActivityCache: { data: any, timestamp: number } | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Interactions
  getInteractions(clubId: number): Observable<Response> {
    return this.http.get<Response>(`${this.base}crm/interactions/${clubId}`, { headers: this.getHeaders() });
  }

  createInteraction(userId: number, body: { clubId: number, type: string, content: string }): Observable<Response> {
    return this.http.post<Response>(`${this.base}crm/interactions/${userId}`, body, { headers: this.getHeaders() });
  }

  // Club Status
  getClubStatus(clubId: number): Observable<Response> {
    return this.http.get<Response>(`${this.base}crm/status/${clubId}`, { headers: this.getHeaders() });
  }

  updateClubStatus(clubId: number, status: string, reason: string = ''): Observable<Response> {
    return this.http.put<Response>(`${this.base}crm/status/${clubId}/${status}`, { reason }, { headers: this.getHeaders() });
  }

  // Reminders
  getReminders(clubId: number): Observable<Response> {
    return this.http.get<Response>(`${this.base}crm/reminders/${clubId}`, { headers: this.getHeaders() });
  }

  getPendingReminders(userId: number): Observable<Response> {
    return this.http.get<Response>(`${this.base}crm/reminders/pending/${userId}`, { headers: this.getHeaders() });
  }

  createReminder(userId: number, body: { clubId: number, title: string, description: string, dueDate: string }): Observable<Response> {
    return this.http.post<Response>(`${this.base}crm/reminders/${userId}`, body, { headers: this.getHeaders() });
  }

  completeReminder(reminderId: number): Observable<Response> {
    return this.http.put<Response>(`${this.base}crm/reminders/complete/${reminderId}`, {}, { headers: this.getHeaders() });
  }

  getRecentInteractions(): Observable<Response> {
    return this.http.get<Response>(`${this.base}crm/interactions/recent`, { headers: this.getHeaders() });
  }

  getAtRiskClubs(): Observable<Response> {
    return this.http.get<Response>(`${this.base}crm/status/atrisk`, { headers: this.getHeaders() });
  }

  getAtRiskClubsAI(): Observable<Response> {
    return this.http.get<Response>(`${this.base}crm/status/atrisk-ai`, { headers: this.getHeaders() });
  }

  getRecentClubActivity(forceRefresh = false): Observable<Response> {
    if (!forceRefresh && this.recentActivityCache && (Date.now() - this.recentActivityCache.timestamp < this.CACHE_TTL)) {
      return of(this.recentActivityCache.data);
    }
    return this.http.get<Response>(`${this.base}crm/activity/recent`, { headers: this.getHeaders() }).pipe(
      tap(res => { this.recentActivityCache = { data: res, timestamp: Date.now() }; })
    );
  }

  getClubActivityPaginated(page: number = 0, size: number = 100, forceRefresh = false): Observable<Response> {
    if (!forceRefresh && this.activityCache[page] && (Date.now() - this.activityCache[page].timestamp < this.CACHE_TTL)) {
      return of(this.activityCache[page].data);
    }
    return this.http.get<Response>(`${this.base}crm/activity/paginated?page=${page}&size=${size}`, { headers: this.getHeaders() }).pipe(
      tap(res => { this.activityCache[page] = { data: res, timestamp: Date.now() }; })
    );
  }

  clearActivityCache(): void {
    this.activityCache = {};
    this.recentActivityCache = null;
  }
}
