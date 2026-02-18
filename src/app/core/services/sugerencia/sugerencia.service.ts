import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Response } from 'src/app/core/services/models/response.model';

@Injectable({
    providedIn: 'root'
})
export class SugerenciaService {

    private base = environment.apiUrl;

    constructor(private http: HttpClient) { }

    private authHeaders(): HttpHeaders | undefined {
        const token = localStorage.getItem('token');
        return token ? new HttpHeaders({ 'Authorization': `Bearer ${token}` }) : undefined;
    }

    createSugerencia(body: { clubId: number; userId: number; title: string; description: string }): Observable<Response> {
        const headers = this.authHeaders();
        if (!headers) return throwError(() => new Error('No auth token'));
        const url = `${this.base}sugerencias`;
        return this.http.post<Response>(url, body, { headers });
    }

    getAllSugerencias(): Observable<Response> {
        const headers = this.authHeaders();
        if (!headers) return throwError(() => new Error('No auth token'));
        const url = `${this.base}sugerencias/admin`;
        return this.http.get<Response>(url, { headers });
    }

    getSugerenciasByClub(clubId: number): Observable<Response> {
        const headers = this.authHeaders();
        if (!headers) return throwError(() => new Error('No auth token'));
        const url = `${this.base}sugerencias/club/${clubId}`;
        return this.http.get<Response>(url, { headers });
    }

    getSugerenciasByUser(userId: number): Observable<Response> {
        const headers = this.authHeaders();
        if (!headers) return throwError(() => new Error('No auth token'));
        const url = `${this.base}sugerencias/user/${userId}`;
        return this.http.get<Response>(url, { headers });
    }

    countUnread(): Observable<Response> {
        const headers = this.authHeaders();
        if (!headers) return throwError(() => new Error('No auth token'));
        const url = `${this.base}sugerencias/count/unread`;
        return this.http.get<Response>(url, { headers });
    }

    updateStatus(id: number, status: string): Observable<Response> {
        const headers = this.authHeaders();
        if (!headers) return throwError(() => new Error('No auth token'));
        const url = `${this.base}sugerencias/${id}/status/${status}`;
        return this.http.put<Response>(url, {}, { headers });
    }

    respond(id: number, adminResponse: string): Observable<Response> {
        const headers = this.authHeaders();
        if (!headers) return throwError(() => new Error('No auth token'));
        const url = `${this.base}sugerencias/${id}/respond`;
        return this.http.put<Response>(url, adminResponse, { headers });
    }

    markAsRead(id: number): Observable<Response> {
        const headers = this.authHeaders();
        if (!headers) return throwError(() => new Error('No auth token'));
        const url = `${this.base}sugerencias/${id}/read`;
        return this.http.put<Response>(url, {}, { headers });
    }

    aiRespond(id: number, decision: string, reason: string): Observable<Response> {
        const headers = this.authHeaders();
        if (!headers) return throwError(() => new Error('No auth token'));
        const url = `${this.base}sugerencias/${id}/ai-respond`;
        return this.http.post<Response>(url, { decision, reason }, { headers });
    }

    countUnreadResponsesUser(userId: number): Observable<Response> {
        const headers = this.authHeaders();
        if (!headers) return throwError(() => new Error('No auth token'));
        const url = `${this.base}sugerencias/count/unread-user/${userId}`;
        return this.http.get<Response>(url, { headers });
    }

    markAllReadByUser(userId: number): Observable<Response> {
        const headers = this.authHeaders();
        if (!headers) return throwError(() => new Error('No auth token'));
        const url = `${this.base}sugerencias/mark-read-user/${userId}`;
        return this.http.put<Response>(url, {}, { headers });
    }

    archiveAllDone(): Observable<Response> {
        const headers = this.authHeaders();
        if (!headers) return throwError(() => new Error('No auth token'));
        const url = `${this.base}sugerencias/archive-all-done`;
        return this.http.put<Response>(url, {}, { headers });
    }

    hardDelete(id: number): Observable<Response> {
        const headers = this.authHeaders();
        if (!headers) return throwError(() => new Error('No auth token'));
        const url = `${this.base}sugerencias/${id}/hard-delete`;
        return this.http.delete<Response>(url, { headers });
    }
}
