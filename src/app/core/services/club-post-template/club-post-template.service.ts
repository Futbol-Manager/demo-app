import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { isDemoMode } from '../demo/demo-mode';

export interface ClubPostTemplate {
  id?: number;
  clubId: number;
  name: string;
  format: string;
  thumbnailUrl?: string;
  metadata?: string;
  createdAt?: string;
}

/** Plantillas de post de ejemplo para el modo demo. */
const DEMO_TEMPLATES: ClubPostTemplate[] = [
  { id: 1, clubId: 9001, name: 'Pre-partido clásico', format: 'square', createdAt: '2026-03-01T09:00:00' },
  { id: 2, clubId: 9001, name: 'Resultado destacado', format: 'square', createdAt: '2026-03-05T09:00:00' },
  { id: 3, clubId: 9001, name: 'Jornada del finde', format: 'story', createdAt: '2026-03-10T09:00:00' },
];

@Injectable({ providedIn: 'root' })
export class ClubPostTemplateService {
  private base = environment.apiUrl + 'club-templates';

  constructor(private http: HttpClient) {}

  private headers(): { headers: HttpHeaders } {
    const token = localStorage.getItem('token');
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }

  getTemplatesByClub(clubId: number): Observable<any> {
    if (isDemoMode()) {
      return of({ data: [...DEMO_TEMPLATES], status: 200 });
    }
    return this.http.get(`${this.base}/club/${clubId}`, this.headers());
  }

  createTemplate(template: ClubPostTemplate): Observable<any> {
    if (isDemoMode()) {
      return of({ data: { ...template, id: Date.now() }, status: 200 });
    }
    return this.http.post(this.base, template, this.headers());
  }

  deleteTemplate(templateId: number): Observable<any> {
    if (isDemoMode()) {
      return of({ data: { id: templateId, deleted: true }, status: 200 });
    }
    return this.http.delete(`${this.base}/${templateId}`, this.headers());
  }

  uploadThumbnail(templateId: number, blob: Blob): Observable<any> {
    if (isDemoMode()) {
      return of({ data: `demo-tpl-thumb-${templateId}.png`, status: 200 });
    }
    const formData = new FormData();
    formData.append('files', blob, `tpl-thumb-${templateId}.png`);
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.post(`${this.base}/upload-thumbnail/${templateId}`, formData, { headers });
  }
}
