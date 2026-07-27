import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { EMPTY, Observable, of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Response } from 'src/app/core/services/models/response.model';
import { isDemoMode } from '../demo/demo-mode';

export interface AbonadoSeasonInfo {
  abonadosTemporadaId: number;
  temporada: string;
  cuota: string;
  pagado: string;
  restante: string;
  estadoPago: number;
  fechaBaja: string | null;
}

export interface AbonadoClubInfo {
  clubId: number;
  name: string;
  imgPerfil: string | null;
  usesSeasonalSubs?: number | null;
}

export interface AbonadoSelf {
  abonadoId: number;
  nombre: string;
  apellidos: string;
  mail: string;
  telefono: string | null;
  dni: string | null;
  fechaNacimiento: string | null;
  genero: string | null;
  direccion: string | null;
  imgPerfil: string | null;
  estado: number;
  userId: number | null;
}

export interface AbonadoPaymentHistoryItem {
  abonadoPagoHistoricoId: number;
  abonadosTemporadaId: number;
  tipo: string;
  metodo: string | null;
  cantidad: string;
  fechaPago: string | null;
  fechaCreate: string | null;
  comentario: string | null;
}

export interface AbonadoDashboard {
  abonado: AbonadoSelf;
  club: AbonadoClubInfo | null;
  season: AbonadoSeasonInfo | null;
  paymentHistory: AbonadoPaymentHistoryItem[];
}

export interface ClubDocument {
  id: number;
  clubId: number;
  categoria: string;
  titulo: string;
  descripcion: string | null;
  nombreOriginal: string;
  mimeType: string | null;
  sizeBytes: number;
  pinned: boolean;
  notifiedAbonados: boolean;
  createdByUserId: number | null;
  createdByUserName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AbonadoCarnet {
  abonadoId: number;
  clubId: number;
  nombre: string;
  apellidos: string;
  numeroSocio: string;
  imgPerfil: string;
  estado: number;
  fechaAlta: string;
  clubName: string;
  clubLogo: string;
  qrToken: string;
  expEpoch: number;
}

/** Helper local: envuelve un mock en la forma estándar {@code Response}. */
function demoResp(data: any, status = 200): Response {
  return { data, status, error: null } as unknown as Response;
}

/**
 * Servicio Angular para los endpoints del abonado autenticado. En modo
 * demo devuelve un dashboard mock plausible sin tocar la red.
 */
@Injectable({ providedIn: 'root' })
export class AbonadoService {
  constructor(private http: HttpClient) {}

  private demoDashboard(): AbonadoDashboard {
    return {
      abonado: {
        abonadoId: 5001,
        nombre: 'Lucía',
        apellidos: 'Fernández Gómez',
        mail: 'lucia.fernandez@example.com',
        telefono: '612345678',
        dni: '45678912X',
        fechaNacimiento: '1988-04-12',
        genero: 'F',
        direccion: 'Calle Mayor 14, 3º B',
        imgPerfil: null,
        estado: 1,
        userId: 5001,
      },
      club: {
        clubId: 9000,
        name: 'Club Deportivo Sphaira',
        imgPerfil: null,
        usesSeasonalSubs: 1,
      },
      season: {
        abonadosTemporadaId: 7001,
        temporada: '2025/2026',
        cuota: '120',
        pagado: '120',
        restante: '0',
        estadoPago: 2,
        fechaBaja: null,
      },
      paymentHistory: [
        {
          abonadoPagoHistoricoId: 9002,
          abonadosTemporadaId: 7001,
          tipo: 'Pagado',
          metodo: 'Tarjeta',
          cantidad: '60',
          fechaPago: '2026-01-10',
          fechaCreate: '2026-01-10',
          comentario: 'Segundo plazo temporada 2025/2026',
        },
        {
          abonadoPagoHistoricoId: 9001,
          abonadosTemporadaId: 7001,
          tipo: 'Pagado',
          metodo: 'Transferencia',
          cantidad: '60',
          fechaPago: '2025-09-05',
          fechaCreate: '2025-09-05',
          comentario: 'Primer plazo temporada 2025/2026',
        },
      ],
    };
  }

  private demoCarnet(): AbonadoCarnet {
    return {
      abonadoId: 5001,
      clubId: 9000,
      nombre: 'Lucía',
      apellidos: 'Fernández Gómez',
      numeroSocio: 'S-0142',
      imgPerfil: '',
      estado: 1,
      fechaAlta: '2015-09-01',
      clubName: 'Club Deportivo Sphaira',
      clubLogo: '',
      qrToken: `DEMO-CARNET-5001-${Math.floor(Date.now() / 1000)}`,
      expEpoch: Math.floor(Date.now() / 1000) + 3600,
    };
  }

  getMyDashboard(): Observable<Response> {
    if (isDemoMode()) return of(demoResp(this.demoDashboard()));
    const token = localStorage.getItem('token');
    if (!token) return EMPTY;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<Response>(environment.apiUrl + 'abonado/me', { headers });
  }

  getMyCarnet(): Observable<Response> {
    if (isDemoMode()) return of(demoResp(this.demoCarnet()));
    const token = localStorage.getItem('token');
    if (!token) return EMPTY;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<Response>(environment.apiUrl + 'abonado/me/carnet', { headers });
  }

  getMyPrintCarnet(): Observable<Response> {
    if (isDemoMode()) {
      const carnet = this.demoCarnet();
      carnet.expEpoch = Math.floor(Date.now() / 1000) + 365 * 24 * 3600;
      return of(demoResp(carnet));
    }
    const token = localStorage.getItem('token');
    if (!token) return EMPTY;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<Response>(environment.apiUrl + 'abonado/me/carnet/print', { headers });
  }

  getMyDocuments(): Observable<Response> {
    if (isDemoMode()) {
      const docs: ClubDocument[] = [
        {
          id: 8001,
          clubId: 9000,
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
          clubId: 9000,
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
      ];
      return of(demoResp(docs));
    }
    const token = localStorage.getItem('token');
    if (!token) return EMPTY;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<Response>(environment.apiUrl + 'abonado/me/documents', { headers });
  }

  downloadMyDocument(docId: number): Observable<Blob> {
    if (isDemoMode()) {
      return of(new Blob(
        [`Documento demo ${docId}. Contenido de ejemplo para el modo demostración.`],
        { type: 'text/plain' },
      ));
    }
    const token = localStorage.getItem('token');
    if (!token) return EMPTY;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get(
      `${environment.apiUrl}abonado/me/documents/${docId}/download`,
      { headers, responseType: 'blob' },
    );
  }
}
