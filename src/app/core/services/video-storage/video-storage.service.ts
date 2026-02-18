import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class VideoStorageService {

  private baseUrl = environment.apiUrl + 'video/club';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({ Authorization: 'Bearer ' + token });
  }

  getPlan(clubId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${clubId}/plan`, { headers: this.getHeaders() });
  }

  createCheckoutSession(clubId: number, planKey: string): Observable<any> {
    // clubId en la URL para recuperarlo tras la redirección de Stripe
    const successUrl = `${window.location.origin}/dashboard/video-plan-success?clubId=${clubId}`;
    const cancelUrl  = window.location.href;
    return this.http.post<any>(`${this.baseUrl}/${clubId}/checkout`,
      { planKey, successUrl, cancelUrl },
      { headers: this.getHeaders() }
    );
  }

  verifyCheckoutSession(clubId: number, sessionId: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${clubId}/checkout/verify`,
      { sessionId },
      { headers: this.getHeaders() }
    );
  }

  listVideos(clubId: number, watchlistId?: number): Observable<any> {
    let url = `${this.baseUrl}/${clubId}/videos`;
    if (watchlistId) url += `?watchlistId=${watchlistId}`;
    return this.http.get<any>(url, { headers: this.getHeaders() });
  }

  getVideoUrl(clubId: number, videoId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${clubId}/video/${videoId}/url`, { headers: this.getHeaders() });
  }

  deleteVideo(clubId: number, videoId: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${clubId}/video/${videoId}`, { headers: this.getHeaders() });
  }

  uploadVideo(clubId: number, uploadedBy: number, file: File, meta: {
    title?: string; description?: string; tags?: string;
    watchlistId?: number; playerName?: string;
  }): Observable<any> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('uploadedBy', String(uploadedBy));
    if (meta.title)       fd.append('title', meta.title);
    if (meta.description) fd.append('description', meta.description);
    if (meta.tags)        fd.append('tags', meta.tags);
    if (meta.watchlistId) fd.append('watchlistId', String(meta.watchlistId));
    if (meta.playerName)  fd.append('playerName', meta.playerName);

    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders({ Authorization: 'Bearer ' + token });
    return this.http.post<any>(`${this.baseUrl}/${clubId}/upload`, fd, { headers });
  }
}
