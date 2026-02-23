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

  requestPlan(clubId: number, requesterName: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${clubId}/request-plan`,
      { requesterName },
      { headers: this.getHeaders() }
    );
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

  // ── Carpetas ──────────────────────────────────────────────

  /**
   * Sincroniza las carpetas de equipo del club (idempotente).
   * Crea una carpeta por cada equipo activo que no tenga carpeta ya.
   * Devuelve la lista completa de carpetas actualizada.
   */
  syncTeamFolders(clubId: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${clubId}/sync-team-folders`, {}, { headers: this.getHeaders() });
  }

  addExternalLink(clubId: number, payload: {
    url: string; title?: string; tags?: string;
    folderId?: number | null; uploadedBy?: number;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${clubId}/link`, payload, { headers: this.getHeaders() });
  }

  getFolders(clubId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${clubId}/folders`, { headers: this.getHeaders() });
  }

  createFolder(clubId: number, name: string, color: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${clubId}/folder`, { name, color }, { headers: this.getHeaders() });
  }

  updateFolder(clubId: number, folderId: number, changes: { name?: string; color?: string }): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/${clubId}/folder/${folderId}`, changes, { headers: this.getHeaders() });
  }

  deleteFolder(clubId: number, folderId: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${clubId}/folder/${folderId}`, { headers: this.getHeaders() });
  }

  assignVideoFolder(clubId: number, videoId: number, folderId: number | null): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/${clubId}/video/${videoId}/folder`, { folderId }, { headers: this.getHeaders() });
  }

  // ── Google Drive ────────────────────────────────────────
  getDriveFileInfo(clubId: number, driveFileId: string, accessToken: string): Observable<any> {
    return this.http.get<any>(
      `${this.baseUrl}/${clubId}/drive/file-info?driveFileId=${encodeURIComponent(driveFileId)}&accessToken=${encodeURIComponent(accessToken)}`,
      { headers: this.getHeaders() }
    );
  }

  // ── Admin overrides ────────────────────────────────────────
  setVideoPlanAdmin(clubId: number, planKey: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl.replace('/club', '')}/admin/${clubId}/set-plan`,
      { planKey },
      { headers: this.getHeaders() }
    );
  }

  cancelVideoPlanAdmin(clubId: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl.replace('/club', '')}/admin/${clubId}/cancel-plan`,
      { headers: this.getHeaders() }
    );
  }

  importFromDrive(clubId: number, driveFileId: string, accessToken: string, meta: {
    title?: string; description?: string; tags?: string; folderId?: number; uploadedBy?: number;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${clubId}/drive/import`,
      { driveFileId, accessToken, ...meta },
      { headers: this.getHeaders() }
    );
  }

  exportToDrive(clubId: number, videoId: number, accessToken: string, filename: string): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/${clubId}/video/${videoId}/export-to-drive`,
      { accessToken, filename },
      { headers: this.getHeaders() }
    );
  }

  // ── Upload ─────────────────────────────────────────────
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
