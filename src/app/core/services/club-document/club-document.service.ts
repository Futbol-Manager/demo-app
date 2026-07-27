import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { EMPTY, Observable, of } from 'rxjs';

import { environment } from 'src/environments/environment';
import { Response } from 'src/app/core/services/models/response.model';
import { ClubDocument } from 'src/app/core/services/abonado/abonado.service';
import { isDemoMode } from '../demo/demo-mode';

export const CLUB_DOCUMENT_CATEGORIES = [
  'estatutos',
  'normativa',
  'circular',
  'calendario',
  'formulario',
  'otros',
] as const;

export type ClubDocumentCategoria = (typeof CLUB_DOCUMENT_CATEGORIES)[number];

/** Helper local: envuelve un mock en la forma estándar {@code Response}. */
function demoResp(data: any, status = 200): Response {
  return { data, status, error: null } as unknown as Response;
}

/**
 * Servicio Angular del módulo de documentos del club — lado admin. En
 * modo demo devuelve documentos mock y simula subidas/borrados con éxito.
 */
@Injectable({ providedIn: 'root' })
export class ClubDocumentService {
  constructor(private http: HttpClient) {}

  private authHeaders(): HttpHeaders | null {
    const token = localStorage.getItem('token');
    if (!token) return null;
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private demoDocs(clubId: number): ClubDocument[] {
    return [
      {
        id: 8001,
        clubId,
        categoria: 'estatutos',
        titulo: 'Estatutos del club 2025',
        descripcion: 'Versión aprobada en asamblea general.',
        nombreOriginal: 'Estatutos_2025.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 356789,
        pinned: true,
        notifiedAbonados: true,
        createdByUserId: 1,
        createdByUserName: 'Admin Demo',
        createdAt: '2025-08-15T10:00:00',
        updatedAt: '2025-08-15T10:00:00',
      },
      {
        id: 8002,
        clubId,
        categoria: 'circular',
        titulo: 'Calendario de partidos',
        descripcion: 'Fechas y horarios de la temporada 2025/2026.',
        nombreOriginal: 'Calendario_25_26.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 128456,
        pinned: false,
        notifiedAbonados: true,
        createdByUserId: 1,
        createdByUserName: 'Admin Demo',
        createdAt: '2025-09-01T09:00:00',
        updatedAt: '2025-09-01T09:00:00',
      },
      {
        id: 8003,
        clubId,
        categoria: 'normativa',
        titulo: 'Normativa de uso de instalaciones',
        descripcion: null,
        nombreOriginal: 'Normativa_instalaciones.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 98765,
        pinned: false,
        notifiedAbonados: false,
        createdByUserId: 1,
        createdByUserName: 'Admin Demo',
        createdAt: '2025-09-10T14:00:00',
        updatedAt: '2025-09-10T14:00:00',
      },
    ];
  }

  list(clubId: number): Observable<Response> {
    if (isDemoMode()) return of(demoResp(this.demoDocs(clubId)));
    const h = this.authHeaders();
    if (!h) return EMPTY;
    return this.http.get<Response>(
      `${environment.apiUrl}club-document/${clubId}/list`,
      { headers: h },
    );
  }

  upload(
    clubId: number,
    file: File,
    payload: {
      titulo: string;
      descripcion?: string;
      categoria: ClubDocumentCategoria;
      pinned?: boolean;
      notify?: boolean;
    },
  ): Observable<Response> {
    if (isDemoMode()) {
      const doc: ClubDocument = {
        id: Date.now(),
        clubId,
        categoria: payload.categoria,
        titulo: payload.titulo,
        descripcion: payload.descripcion ?? null,
        nombreOriginal: file?.name || 'documento.pdf',
        mimeType: file?.type || 'application/pdf',
        sizeBytes: file?.size || 100000,
        pinned: !!payload.pinned,
        notifiedAbonados: !!payload.notify,
        createdByUserId: 1,
        createdByUserName: 'Admin Demo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return of(demoResp(doc));
    }
    const h = this.authHeaders();
    if (!h) return EMPTY;
    const form = new FormData();
    form.append('file', file, file.name);
    form.append('titulo', payload.titulo);
    if (payload.descripcion) form.append('descripcion', payload.descripcion);
    form.append('categoria', payload.categoria);
    form.append('pinned', payload.pinned ? 'true' : 'false');
    form.append('notify', payload.notify ? 'true' : 'false');
    return this.http.post<Response>(
      `${environment.apiUrl}club-document/${clubId}/upload`,
      form,
      { headers: h },
    );
  }

  togglePin(clubId: number, docId: number, pinned: boolean): Observable<Response> {
    if (isDemoMode()) return of(demoResp({ id: docId, pinned }));
    const h = this.authHeaders();
    if (!h) return EMPTY;
    return this.http.put<Response>(
      `${environment.apiUrl}club-document/${clubId}/${docId}/pin/${pinned}`,
      null,
      { headers: h },
    );
  }

  delete(clubId: number, docId: number): Observable<Response> {
    if (isDemoMode()) return of(demoResp({ id: docId }));
    const h = this.authHeaders();
    if (!h) return EMPTY;
    return this.http.delete<Response>(
      `${environment.apiUrl}club-document/${clubId}/${docId}`,
      { headers: h },
    );
  }

  download(clubId: number, docId: number): Observable<Blob> {
    if (isDemoMode()) {
      return of(new Blob(
        [`Documento demo ${docId} del club ${clubId}.`],
        { type: 'text/plain' },
      ));
    }
    const h = this.authHeaders();
    if (!h) return EMPTY;
    return this.http.get(
      `${environment.apiUrl}club-document/${clubId}/${docId}/download`,
      { headers: h, responseType: 'blob' },
    );
  }

  static getUsedCategorias(docs: ClubDocument[]): ClubDocumentCategoria[] {
    const used = new Set(docs.map((d) => d.categoria as ClubDocumentCategoria));
    return CLUB_DOCUMENT_CATEGORIES.filter((c) => used.has(c));
  }
}
