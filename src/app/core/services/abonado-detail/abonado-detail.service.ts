import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { EMPTY, Observable, of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Response } from '../models/response.model';
import { isDemoMode } from '../demo/demo-mode';

/**
 * Sub-objeto que recibe el frontend al pedir la ficha detallada de un
 * abonado. Es el contrato del endpoint
 * {@code GET /rest/club/abonado/:abonadoId/club/:clubId/detail}.
 */
export interface AbonadoDetailResponse {
  abonado: AbonadoExtendido;
  abonadosTemporada: AbonadosTemporadaSummary | null;
  historicoPagos: AbonadoPagoSummary[];
  usesSeasonalSubs?: number | null;
}

export interface AbonadoExtendido {
  abonadoId: number;
  nombre: string;
  apellidos: string;
  imgPerfil: string;
  fechaDeNacimiento: string;
  estado: number;
  dni: string;
  mail: string;
  telefono: string;
  genero: string;
  direccion: string;
  ciudad: string;
  codigoPostal: string;
  provincia: string;
  pais: string;
  numeroSocio: string;
  profesion: string;
  iban: string;
  ibanTitular: string;
  notasInternas: string;
  contactoEmergenciaNombre: string;
  contactoEmergenciaTelefono: string;
  contactoEmergenciaRelacion: string;
  userId: number | null;
}

export interface AbonadosTemporadaSummary {
  abonadosTemporadaId: number;
  clubId: number;
  temporada: string;
  cuota: string;
  pagado: string;
  restante: string;
  estado: number;
  fechaCreate: string;
  fechaBaja: string;
  numFamiliares?: number;
}

export interface AbonadoPagoSummary {
  abonadoPagoHistoricoId: number;
  abonadosTemporadaId: number;
  cantidad: string;
  tipo: string;
  fechaCreate: string;
  fechaPago: string;
  metodo: string;
  comentario: string;
  estado: number;
}

export interface AbonadoDocumento {
  documentoId: number;
  abonadoId: number;
  clubId: number;
  tipo: string;
  nombreOriginal: string;
  fichero: string;
  mimeType: string;
  sizeBytes: number;
  fechaCreacion: string;
  usuarioSubidaId: number | null;
  descripcion: string;
  urlPath: string;
}

export interface AbonadoComunicacion {
  comunicacionId: number;
  abonadoId: number;
  clubId: number;
  canal: string;
  asunto: string;
  cuerpo: string;
  estado: string;
  fechaEnvio: string;
  usuarioEnvioId: number | null;
  errorMsg: string;
}

export interface AbonadoFamiliar {
  familiarId: number;
  abonadoId: number;
  clubId: number;
  relatedAbonadoId: number | null;
  relacion: string;
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string;
  fechaNacimiento: string;
  notas: string;
  fechaCreacion: string;
  relatedAbonado: RelatedAbonadoSummary | null;
}

export interface RelatedAbonadoSummary {
  abonadoId: number;
  nombre: string;
  apellidos: string;
  imgPerfil: string;
  estado: number;
  numeroSocio: string;
}

export interface AbonadoSearchResult {
  abonadoId: number;
  nombre: string;
  apellidos: string;
  imgPerfil: string;
  mail: string;
  estado: number;
  numeroSocio: string;
}

export interface AbonadoActividad {
  tipo: string;
  titulo: string;
  detalle: string;
  fecha: string;
  meta: string;
}

export interface AbonadoEstadoHistorico {
  id: number;
  abonadoId: number;
  clubId: number;
  estadoAnterior: number;
  estadoNuevo: number;
  motivo: string | null;
  changedByUserId: number | null;
  changedByUserName: string | null;
  changedAt: string;
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

export interface ClubPerk {
  perkId: number;
  clubId: number;
  titulo: string;
  descripcion: string;
  icono: string;
  maxCanjesPorSocio: number | null;
  activo: number;
  fechaCreacion: string;
  canjesUsados: number;
  canjesRestantes: number | null;
  canCanjear: boolean;
}

export interface AbonadoPerkCanje {
  canjeId: number;
  abonadoId: number;
  perkId: number;
  clubId: number;
  fechaCanje: string;
  validadorUserId: number | null;
  nota: string;
  perkTitulo: string;
  perkIcono: string;
}

export interface CarnetValidationResult {
  valid: boolean;
  reason: string | null;
  abonado: {
    abonadoId: number;
    clubId: number;
    nombre: string;
    apellidos: string;
    numeroSocio: string;
    imgPerfil: string;
    estado: number;
  } | null;
  perks: ClubPerk[];
}

/** Helper local: envuelve un mock en la forma estándar {@code Response}. */
function demoResp(data: any, status = 200): Response {
  return { data, status, error: null } as unknown as Response;
}

/**
 * Cliente HTTP para la pantalla de detalle del abonado. En modo demo
 * (demo.sphairatech.com / build demo) todas las llamadas devuelven datos
 * mock plausibles sin tocar la red.
 */
@Injectable({ providedIn: 'root' })
export class AbonadoDetailService {
  private baseUrl = environment.apiUrl + 'club';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  // ─────────────── mocks demo ───────────────

  private demoAbonado(abonadoId: number): AbonadoExtendido {
    return {
      abonadoId,
      nombre: 'Lucía',
      apellidos: 'Fernández Gómez',
      imgPerfil: '',
      fechaDeNacimiento: '1988-04-12',
      estado: 1,
      dni: '45678912X',
      mail: 'lucia.fernandez@example.com',
      telefono: '612345678',
      genero: 'F',
      direccion: 'Calle Mayor 14, 3º B',
      ciudad: 'Valencia',
      codigoPostal: '46001',
      provincia: 'Valencia',
      pais: 'España',
      numeroSocio: 'S-0142',
      profesion: 'Fisioterapeuta',
      iban: 'ES76 2077 0024 0031 0257 5766',
      ibanTitular: 'Lucía Fernández Gómez',
      notasInternas: 'Socia desde 2015. Colabora en la organización de eventos del club.',
      contactoEmergenciaNombre: 'Marta Gómez',
      contactoEmergenciaTelefono: '699112233',
      contactoEmergenciaRelacion: 'Madre',
      userId: null,
    };
  }

  private demoTemporada(abonadoId: number, clubId: number): AbonadosTemporadaSummary {
    return {
      abonadosTemporadaId: 7000 + abonadoId,
      clubId,
      temporada: '2025/2026',
      cuota: '120',
      pagado: '120',
      restante: '0',
      estado: 2,
      fechaCreate: '2025-09-01',
      fechaBaja: '',
      numFamiliares: 2,
    };
  }

  private demoPagos(abonadoId: number): AbonadoPagoSummary[] {
    const atId = 7000 + abonadoId;
    return [
      {
        abonadoPagoHistoricoId: 9002,
        abonadosTemporadaId: atId,
        cantidad: '60',
        tipo: 'Pagado',
        fechaCreate: '2026-01-10',
        fechaPago: '2026-01-10',
        metodo: 'Tarjeta',
        comentario: 'Segundo plazo temporada 2025/2026',
        estado: 2,
      },
      {
        abonadoPagoHistoricoId: 9001,
        abonadosTemporadaId: atId,
        cantidad: '60',
        tipo: 'Pagado',
        fechaCreate: '2025-09-05',
        fechaPago: '2025-09-05',
        metodo: 'Transferencia',
        comentario: 'Primer plazo temporada 2025/2026',
        estado: 2,
      },
    ];
  }

  getDetail(abonadoId: number, clubId: number): Observable<Response> {
    if (isDemoMode()) {
      const data: AbonadoDetailResponse = {
        abonado: this.demoAbonado(abonadoId),
        abonadosTemporada: this.demoTemporada(abonadoId, clubId),
        historicoPagos: this.demoPagos(abonadoId),
        usesSeasonalSubs: 1,
      };
      return of(demoResp(data));
    }
    if (!localStorage.getItem('token')) return EMPTY;
    return this.http.get<Response>(
      `${this.baseUrl}/abonado/${abonadoId}/club/${clubId}/detail`,
      { headers: this.getHeaders() }
    );
  }

  patchAbonado(abonadoId: number, patch: Partial<AbonadoExtendido>): Observable<Response> {
    if (isDemoMode()) return of(demoResp({ abonadoId, ...patch }));
    if (!localStorage.getItem('token')) return EMPTY;
    return this.http.patch<Response>(
      `${this.baseUrl}/abonado/${abonadoId}`,
      patch,
      { headers: this.getHeaders() }
    );
  }

  updateEstado(
    abonadoId: number,
    estado: number,
    clubId: number,
    motivo: string = '',
  ): Observable<Response> {
    if (isDemoMode()) return of(demoResp({ abonadoId, clubId, estado }));
    if (!localStorage.getItem('token')) return EMPTY;
    const body = motivo && motivo.trim() ? { motivo: motivo.trim() } : {};
    return this.http.put<Response>(
      `${this.baseUrl}/abonado/${abonadoId}/estado/${estado}/club/${clubId}`,
      body,
      { headers: this.getHeaders() }
    );
  }

  getEstadoHistorico(abonadoId: number): Observable<Response> {
    if (isDemoMode()) {
      const data: AbonadoEstadoHistorico[] = [
        {
          id: 1,
          abonadoId,
          clubId: 9000,
          estadoAnterior: 2,
          estadoNuevo: 1,
          motivo: 'Aprobación de alta tras revisar documentación',
          changedByUserId: 1,
          changedByUserName: 'Admin Demo',
          changedAt: '2025-09-01T10:15:00',
        },
      ];
      return of(demoResp(data));
    }
    if (!localStorage.getItem('token')) return EMPTY;
    return this.http.get<Response>(
      `${this.baseUrl}/abonado/${abonadoId}/estado-historico`,
      { headers: this.getHeaders() }
    );
  }

  // =================== Pestaña Documentos ===================

  uploadDocumento(
    abonadoId: number,
    clubId: number,
    file: File,
    tipo: string,
    descripcion: string,
    usuarioSubidaId: number | null,
  ): Observable<Response> {
    if (isDemoMode()) {
      const doc: AbonadoDocumento = {
        documentoId: Date.now(),
        abonadoId,
        clubId,
        tipo: tipo || 'otros',
        nombreOriginal: file?.name || 'documento.pdf',
        fichero: 'demo-doc.pdf',
        mimeType: file?.type || 'application/pdf',
        sizeBytes: file?.size || 12345,
        fechaCreacion: new Date().toISOString(),
        usuarioSubidaId,
        descripcion: descripcion || '',
        urlPath: 'abonado/demo-doc.pdf',
      };
      return of(demoResp(doc));
    }
    if (!localStorage.getItem('token')) return EMPTY;
    const fd = new FormData();
    fd.append('file', file, file.name);
    const token = localStorage.getItem('token') || '';
    const params: any = { clubId: String(clubId) };
    if (tipo) params.tipo = tipo;
    if (descripcion) params.descripcion = descripcion;
    if (usuarioSubidaId !== null && usuarioSubidaId !== undefined)
      params.usuarioSubidaId = String(usuarioSubidaId);
    return this.http.post<Response>(
      `${this.baseUrl}/abonado/${abonadoId}/documento`,
      fd,
      {
        headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
        params,
      }
    );
  }

  listDocumentos(abonadoId: number): Observable<Response> {
    if (isDemoMode()) {
      const docs: AbonadoDocumento[] = [
        {
          documentoId: 3001,
          abonadoId,
          clubId: 9000,
          tipo: 'dni',
          nombreOriginal: 'DNI_Lucia.pdf',
          fichero: 'demo-dni.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 245678,
          fechaCreacion: '2025-09-01T09:00:00',
          usuarioSubidaId: 1,
          descripcion: 'Documento de identidad',
          urlPath: 'abonado/demo-dni.pdf',
        },
        {
          documentoId: 3002,
          abonadoId,
          clubId: 9000,
          tipo: 'certificado_medico',
          nombreOriginal: 'Certificado_medico.pdf',
          fichero: 'demo-medico.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 189234,
          fechaCreacion: '2025-09-03T12:30:00',
          usuarioSubidaId: 1,
          descripcion: 'Apto para la práctica deportiva',
          urlPath: 'abonado/demo-medico.pdf',
        },
      ];
      return of(demoResp(docs));
    }
    if (!localStorage.getItem('token')) return EMPTY;
    return this.http.get<Response>(
      `${this.baseUrl}/abonado/${abonadoId}/documentos`,
      { headers: this.getHeaders() }
    );
  }

  deleteDocumento(documentoId: number): Observable<Response> {
    if (isDemoMode()) return of(demoResp({ documentoId }));
    if (!localStorage.getItem('token')) return EMPTY;
    return this.http.delete<Response>(
      `${this.baseUrl}/abonado/documento/${documentoId}`,
      { headers: this.getHeaders() }
    );
  }

  buildDocumentoUrl(urlPath: string): string {
    if (!urlPath) return '';
    return environment.images + urlPath;
  }

  // =================== Pestaña Comunicaciones ===================

  listComunicaciones(abonadoId: number): Observable<Response> {
    if (isDemoMode()) {
      const coms: AbonadoComunicacion[] = [
        {
          comunicacionId: 4001,
          abonadoId,
          clubId: 9000,
          canal: 'EMAIL',
          asunto: 'Bienvenida al club',
          cuerpo: 'Hola Lucía, ¡bienvenida a la temporada 2025/2026!',
          estado: 'SENT',
          fechaEnvio: '2025-09-01T11:00:00',
          usuarioEnvioId: 1,
          errorMsg: '',
        },
        {
          comunicacionId: 4002,
          abonadoId,
          clubId: 9000,
          canal: 'PUSH',
          asunto: 'Recordatorio de cuota',
          cuerpo: 'Recuerda que el segundo plazo vence el 10 de enero.',
          estado: 'SENT',
          fechaEnvio: '2026-01-02T09:30:00',
          usuarioEnvioId: 1,
          errorMsg: '',
        },
      ];
      return of(demoResp(coms));
    }
    if (!localStorage.getItem('token')) return EMPTY;
    return this.http.get<Response>(
      `${this.baseUrl}/abonado/${abonadoId}/comunicaciones`,
      { headers: this.getHeaders() }
    );
  }

  sendComunicacion(
    abonadoId: number,
    clubId: number,
    canal: 'EMAIL' | 'PUSH' | 'EMAIL_PUSH' | 'SMS',
    asunto: string,
    cuerpo: string,
    usuarioEnvioId: number | null,
  ): Observable<Response> {
    if (isDemoMode()) {
      const com: AbonadoComunicacion = {
        comunicacionId: Date.now(),
        abonadoId,
        clubId,
        canal,
        asunto,
        cuerpo,
        estado: 'SENT',
        fechaEnvio: new Date().toISOString(),
        usuarioEnvioId,
        errorMsg: '',
      };
      return of(demoResp(com));
    }
    if (!localStorage.getItem('token')) return EMPTY;
    return this.http.post<Response>(
      `${this.baseUrl}/abonado/${abonadoId}/comunicar`,
      { clubId, canal, asunto, cuerpo, usuarioEnvioId },
      { headers: this.getHeaders() }
    );
  }

  // =================== Pestaña Familiares ===================

  listFamiliares(abonadoId: number): Observable<Response> {
    if (isDemoMode()) {
      const fams: AbonadoFamiliar[] = [
        {
          familiarId: 5001,
          abonadoId,
          clubId: 9000,
          relatedAbonadoId: null,
          relacion: 'hijo',
          nombre: 'Pablo',
          apellidos: 'Fernández Ruiz',
          email: '',
          telefono: '',
          fechaNacimiento: '2012-06-20',
          notas: '',
          fechaCreacion: '2025-09-01T09:00:00',
          relatedAbonado: null,
        },
        {
          familiarId: 5002,
          abonadoId,
          clubId: 9000,
          relatedAbonadoId: 5100,
          relacion: 'conyuge',
          nombre: 'Sergio',
          apellidos: 'Ruiz Martín',
          email: 'sergio.ruiz@example.com',
          telefono: '655443322',
          fechaNacimiento: '1986-11-03',
          notas: 'Comparte cuota familiar.',
          fechaCreacion: '2025-09-01T09:05:00',
          relatedAbonado: {
            abonadoId: 5100,
            nombre: 'Sergio',
            apellidos: 'Ruiz Martín',
            imgPerfil: '',
            estado: 1,
            numeroSocio: 'S-0143',
          },
        },
      ];
      return of(demoResp(fams));
    }
    if (!localStorage.getItem('token')) return EMPTY;
    return this.http.get<Response>(
      `${this.baseUrl}/abonado/${abonadoId}/familiares`,
      { headers: this.getHeaders() }
    );
  }

  addFamiliar(
    abonadoId: number,
    clubId: number,
    payload: Partial<AbonadoFamiliar>,
  ): Observable<Response> {
    if (isDemoMode()) {
      const fam: AbonadoFamiliar = {
        familiarId: Date.now(),
        abonadoId,
        clubId,
        relatedAbonadoId: payload.relatedAbonadoId ?? null,
        relacion: payload.relacion || 'familiar',
        nombre: payload.nombre || '',
        apellidos: payload.apellidos || '',
        email: payload.email || '',
        telefono: payload.telefono || '',
        fechaNacimiento: payload.fechaNacimiento || '',
        notas: payload.notas || '',
        fechaCreacion: new Date().toISOString(),
        relatedAbonado: payload.relatedAbonado ?? null,
      };
      return of(demoResp(fam));
    }
    if (!localStorage.getItem('token')) return EMPTY;
    return this.http.post<Response>(
      `${this.baseUrl}/abonado/${abonadoId}/familiar`,
      { ...payload, clubId },
      { headers: this.getHeaders() }
    );
  }

  updateFamiliar(familiarId: number, payload: Partial<AbonadoFamiliar>): Observable<Response> {
    if (isDemoMode()) return of(demoResp({ familiarId, ...payload }));
    if (!localStorage.getItem('token')) return EMPTY;
    return this.http.patch<Response>(
      `${this.baseUrl}/abonado/familiar/${familiarId}`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  deleteFamiliar(familiarId: number): Observable<Response> {
    if (isDemoMode()) return of(demoResp({ familiarId }));
    if (!localStorage.getItem('token')) return EMPTY;
    return this.http.delete<Response>(
      `${this.baseUrl}/abonado/familiar/${familiarId}`,
      { headers: this.getHeaders() }
    );
  }

  searchAbonados(clubId: number, q: string, excludeAbonadoId: number | null): Observable<Response> {
    if (isDemoMode()) {
      const results: AbonadoSearchResult[] = [
        {
          abonadoId: 5100,
          nombre: 'Sergio',
          apellidos: 'Ruiz Martín',
          imgPerfil: '',
          mail: 'sergio.ruiz@example.com',
          estado: 1,
          numeroSocio: 'S-0143',
        },
        {
          abonadoId: 5101,
          nombre: 'Carmen',
          apellidos: 'López Díaz',
          imgPerfil: '',
          mail: 'carmen.lopez@example.com',
          estado: 1,
          numeroSocio: 'S-0144',
        },
      ].filter(r => r.abonadoId !== excludeAbonadoId
        && (!q || (`${r.nombre} ${r.apellidos}`.toLowerCase().includes(q.toLowerCase()))));
      return of(demoResp(results));
    }
    if (!localStorage.getItem('token')) return EMPTY;
    const params: any = {};
    if (q) params.q = q;
    if (excludeAbonadoId != null) params.exclude = String(excludeAbonadoId);
    return this.http.get<Response>(
      `${this.baseUrl}/club/${clubId}/abonados/search`,
      { headers: this.getHeaders(), params }
    );
  }

  // =================== Pestaña Actividad ===================

  getActividad(abonadoId: number): Observable<Response> {
    if (isDemoMode()) {
      const acts: AbonadoActividad[] = [
        { tipo: 'CREATED', titulo: 'Alta de socio', detalle: 'Se creó la ficha del socio', fecha: '2025-09-01T09:00:00', meta: '' },
        { tipo: 'PAYMENT_RECEIVED', titulo: 'Pago recibido', detalle: 'Primer plazo (60 €)', fecha: '2025-09-05T10:00:00', meta: '{"cantidad":"60"}' },
        { tipo: 'DOC_UPLOADED', titulo: 'Documento subido', detalle: 'Certificado médico', fecha: '2025-09-03T12:30:00', meta: '' },
        { tipo: 'COM_SENT', titulo: 'Comunicación enviada', detalle: 'Email de bienvenida', fecha: '2025-09-01T11:00:00', meta: '' },
        { tipo: 'PAYMENT_RECEIVED', titulo: 'Pago recibido', detalle: 'Segundo plazo (60 €)', fecha: '2026-01-10T10:00:00', meta: '{"cantidad":"60"}' },
      ];
      return of(demoResp(acts));
    }
    if (!localStorage.getItem('token')) return EMPTY;
    return this.http.get<Response>(
      `${this.baseUrl}/abonado/${abonadoId}/actividad`,
      { headers: this.getHeaders() }
    );
  }

  // =================== Pestaña Carnet + Beneficios ===================

  getCarnet(abonadoId: number): Observable<Response> {
    if (isDemoMode()) {
      const carnet: AbonadoCarnet = {
        abonadoId,
        clubId: 9000,
        nombre: 'Lucía',
        apellidos: 'Fernández Gómez',
        numeroSocio: 'S-0142',
        imgPerfil: '',
        estado: 1,
        fechaAlta: '2015-09-01',
        clubName: 'Club Deportivo Sphaira',
        clubLogo: '',
        qrToken: `DEMO-CARNET-${abonadoId}-${Math.floor(Date.now() / 1000)}`,
        expEpoch: Math.floor(Date.now() / 1000) + 3600,
      };
      return of(demoResp(carnet));
    }
    if (!localStorage.getItem('token')) return EMPTY;
    return this.http.get<Response>(
      `${this.baseUrl}/abonado/${abonadoId}/carnet`,
      { headers: this.getHeaders() }
    );
  }

  uploadAbonadoPhoto(abonadoId: number, clubId: number, file: File): Observable<Response> {
    if (isDemoMode()) return of(demoResp('abonado_demo.jpg'));
    if (!localStorage.getItem('token')) return EMPTY;
    const form = new FormData();
    form.append('file', file);
    const headers = this.getHeaders().delete('Content-Type');
    return this.http.post<Response>(
      `${this.baseUrl}/abonado/${abonadoId}/photo?clubId=${clubId}`,
      form,
      { headers }
    );
  }

  listAbonadoPerks(abonadoId: number): Observable<Response> {
    if (isDemoMode()) {
      const perks: ClubPerk[] = [
        {
          perkId: 6001,
          clubId: 9000,
          titulo: 'Entrada gratuita partido home',
          descripcion: 'Acceso libre a los partidos como local durante la temporada.',
          icono: '🎟️',
          maxCanjesPorSocio: null,
          activo: 1,
          fechaCreacion: '2025-08-01',
          canjesUsados: 2,
          canjesRestantes: null,
          canCanjear: true,
        },
        {
          perkId: 6002,
          clubId: 9000,
          titulo: 'Descuento 20% en tienda',
          descripcion: 'Descuento en equipaciones y merchandising del club.',
          icono: '🛍️',
          maxCanjesPorSocio: 3,
          activo: 1,
          fechaCreacion: '2025-08-01',
          canjesUsados: 1,
          canjesRestantes: 2,
          canCanjear: true,
        },
      ];
      return of(demoResp(perks));
    }
    if (!localStorage.getItem('token')) return EMPTY;
    return this.http.get<Response>(
      `${this.baseUrl}/abonado/${abonadoId}/perks`,
      { headers: this.getHeaders() }
    );
  }

  listAbonadoCanjes(abonadoId: number): Observable<Response> {
    if (isDemoMode()) {
      const canjes: AbonadoPerkCanje[] = [
        {
          canjeId: 7001,
          abonadoId,
          perkId: 6001,
          clubId: 9000,
          fechaCanje: '2025-10-15T18:00:00',
          validadorUserId: 1,
          nota: 'Partido jornada 5',
          perkTitulo: 'Entrada gratuita partido home',
          perkIcono: '🎟️',
        },
      ];
      return of(demoResp(canjes));
    }
    if (!localStorage.getItem('token')) return EMPTY;
    return this.http.get<Response>(
      `${this.baseUrl}/abonado/${abonadoId}/perk-canjes`,
      { headers: this.getHeaders() }
    );
  }

  canjearPerk(
    abonadoId: number,
    perkId: number,
    validadorUserId: number | null,
    nota: string,
  ): Observable<Response> {
    if (isDemoMode()) {
      const canje: AbonadoPerkCanje = {
        canjeId: Date.now(),
        abonadoId,
        perkId,
        clubId: 9000,
        fechaCanje: new Date().toISOString(),
        validadorUserId,
        nota: nota || '',
        perkTitulo: 'Beneficio',
        perkIcono: '🎁',
      };
      return of(demoResp(canje));
    }
    if (!localStorage.getItem('token')) return EMPTY;
    return this.http.post<Response>(
      `${this.baseUrl}/abonado/${abonadoId}/perk/${perkId}/canjear`,
      { validadorUserId, nota },
      { headers: this.getHeaders() }
    );
  }

  validateCarnet(token: string): Observable<Response> {
    if (isDemoMode()) {
      const result: CarnetValidationResult = {
        valid: true,
        reason: null,
        abonado: {
          abonadoId: 5001,
          clubId: 9000,
          nombre: 'Lucía',
          apellidos: 'Fernández Gómez',
          numeroSocio: 'S-0142',
          imgPerfil: '',
          estado: 1,
        },
        perks: [],
      };
      return of(demoResp(result));
    }
    if (!localStorage.getItem('token')) return EMPTY;
    return this.http.post<Response>(
      `${this.baseUrl}/carnet/validate`,
      { token },
      { headers: this.getHeaders() }
    );
  }
}
