import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { isDemoMode } from '../demo/demo-mode';

export interface ClubCanvasMedia {
  id: number;
  clubId: number;
  fileName: string;
  url: string;
  originalName?: string;
  createdAt?: string;
}

/** Medios de canvas de ejemplo para el modo demo. */
const DEMO_MEDIA: ClubCanvasMedia[] = [
  { id: 1, clubId: 9001, fileName: 'escudo.png', url: '', originalName: 'escudo-club.png', createdAt: '2026-02-01T10:00:00' },
  { id: 2, clubId: 9001, fileName: 'campo.jpg', url: '', originalName: 'estadio-municipal.jpg', createdAt: '2026-02-03T10:00:00' },
];

@Injectable({ providedIn: 'root' })
export class ClubCanvasMediaService {
  private base = environment.apiUrl + 'club-canvas-media';

  constructor(private http: HttpClient) {}

  private headers(): { headers: HttpHeaders } {
    const token = localStorage.getItem('token');
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }

  getByClub(clubId: number): Observable<any> {
    if (isDemoMode()) {
      return of({ data: [...DEMO_MEDIA], status: 200 });
    }
    return this.http.get(`${this.base}/${clubId}`, this.headers());
  }

  upload(clubId: number, file: File): Observable<any> {
    if (isDemoMode()) {
      return of({
        data: {
          id: Date.now(), clubId, fileName: file.name, url: '',
          originalName: file.name, createdAt: new Date().toISOString(),
        },
        status: 200,
      });
    }
    const formData = new FormData();
    formData.append('file', file, file.name);
    const token = localStorage.getItem('token');
    return this.http.post(
      `${this.base}/${clubId}/upload`,
      formData,
      { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
    );
  }

  delete(mediaId: number): Observable<any> {
    if (isDemoMode()) {
      return of({ data: { id: mediaId, deleted: true }, status: 200 });
    }
    return this.http.delete(`${this.base}/${mediaId}`, this.headers());
  }
}
