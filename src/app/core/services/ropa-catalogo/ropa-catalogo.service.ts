import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { EMPTY, Observable } from 'rxjs';
export interface RopaTabla {
  prendas: RopaCatalogoPrenda[];
  jugadores: JugadorTablaRopa[];
  selecciones: RopaCatalogoSeleccion[];
}

export interface JugadorTablaRopa {
  playerId: number;
  nombre: string;
  apellido: string;
  nick: string;
  picturePlayer: string;
}
import { environment } from 'src/environments/environment';
import { Response } from 'src/app/core/services/models/response.model';

export interface RopaCatalogoPrenda {
  prendaId: number;
  clubId: number;
  teamId: number | null;
  nombre: string;
  descripcion: string;
  categoria: string;
  temporada: string;
  imagenUrl: string;
  imagenNombre: string;
  activo: number;
  createdAt: string;
  tallas: RopaCatalogoTalla[];
}

export interface RopaCatalogoTalla {
  tallaId: number;
  prendaId: number;
  nombreTalla: string;
  orden: number;
}

export interface RopaCatalogoSeleccion {
  seleccionId: number;
  playerId: number;
  prendaId: number;
  tallaId: number;
  estado: string;
  updatedAt: string;
  nombreJugador?: string;
  nombreTalla?: string;
  nombrePrenda?: string;
}

export interface RopaDocumentoGeneral {
  documentoId: number;
  clubId: number;
  teamId: number | null;
  nombre: string;
  descripcion: string;
  temporada: string;
  archivoUrl: string;
  archivoNombre: string;
  tipoMime: string;
  activo: number;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class RopaCatalogoService {
  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders | null {
    const token = localStorage.getItem('token');
    if (!token) return null;
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  // ─── PRENDAS ──────────────────────────────────────────────────────────────

  getPrendasByClub(clubId: number, temporada: string): Observable<Response> {
    const headers = this.getHeaders();
    if (!headers) return EMPTY;
    return this.http.get<Response>(`${environment.apiUrl}ropa-catalogo/prendas/${clubId}/${temporada}`, { headers });
  }

  getPrendasByTeam(clubId: number, teamId: number, temporada: string): Observable<Response> {
    const headers = this.getHeaders();
    if (!headers) return EMPTY;
    return this.http.get<Response>(`${environment.apiUrl}ropa-catalogo/prendas/team/${clubId}/${teamId}/${temporada}`, { headers });
  }

  createPrenda(data: Partial<RopaCatalogoPrenda>, imagen?: File): Observable<Response> {
    const headers = this.getHeaders();
    if (!headers) return EMPTY;
    const formData = new FormData();
    formData.append('data', JSON.stringify(data));
    if (imagen) formData.append('imagen', imagen);
    return this.http.post<Response>(`${environment.apiUrl}ropa-catalogo/prendas`, formData, { headers });
  }

  updatePrenda(data: Partial<RopaCatalogoPrenda>, imagen?: File): Observable<Response> {
    const headers = this.getHeaders();
    if (!headers) return EMPTY;
    const formData = new FormData();
    formData.append('data', JSON.stringify(data));
    if (imagen) formData.append('imagen', imagen);
    return this.http.put<Response>(`${environment.apiUrl}ropa-catalogo/prendas`, formData, { headers });
  }

  deletePrenda(prendaId: number): Observable<Response> {
    const headers = this.getHeaders();
    if (!headers) return EMPTY;
    return this.http.delete<Response>(`${environment.apiUrl}ropa-catalogo/prendas/${prendaId}`, { headers });
  }

  // ─── TALLAS ───────────────────────────────────────────────────────────────

  addTalla(talla: Partial<RopaCatalogoTalla>): Observable<Response> {
    const headers = this.getHeaders();
    if (!headers) return EMPTY;
    return this.http.post<Response>(`${environment.apiUrl}ropa-catalogo/tallas`, talla, { headers });
  }

  deleteTalla(tallaId: number): Observable<Response> {
    const headers = this.getHeaders();
    if (!headers) return EMPTY;
    return this.http.delete<Response>(`${environment.apiUrl}ropa-catalogo/tallas/${tallaId}`, { headers });
  }

  // ─── SELECCIONES ─────────────────────────────────────────────────────────

  getSeleccionesPlayer(playerId: number, temporada: string): Observable<Response> {
    const headers = this.getHeaders();
    if (!headers) return EMPTY;
    return this.http.get<Response>(`${environment.apiUrl}ropa-catalogo/selecciones/player/${playerId}/${temporada}`, { headers });
  }

  getSeleccionesByPrenda(prendaId: number): Observable<Response> {
    const headers = this.getHeaders();
    if (!headers) return EMPTY;
    return this.http.get<Response>(`${environment.apiUrl}ropa-catalogo/selecciones/prenda/${prendaId}`, { headers });
  }

  saveSeleccion(seleccion: Partial<RopaCatalogoSeleccion>): Observable<Response> {
    const headers = this.getHeaders();
    if (!headers) return EMPTY;
    return this.http.post<Response>(`${environment.apiUrl}ropa-catalogo/selecciones`, seleccion, { headers });
  }

  // ─── TABLA TALLAS (VISTA CLUB) ────────────────────────────────────────────

  getTablaByTeam(clubId: number, teamId: number, temporada: string): Observable<Response> {
    const headers = this.getHeaders();
    if (!headers) return EMPTY;
    return this.http.get<Response>(`${environment.apiUrl}ropa-catalogo/tabla/${clubId}/${teamId}/${temporada}`, { headers });
  }

  // ─── DOCUMENTOS ───────────────────────────────────────────────────────────

  getDocumentosByClub(clubId: number, temporada: string): Observable<Response> {
    const headers = this.getHeaders();
    if (!headers) return EMPTY;
    return this.http.get<Response>(`${environment.apiUrl}ropa-catalogo/documentos/${clubId}/${temporada}`, { headers });
  }

  uploadDocumento(data: Partial<RopaDocumentoGeneral>, archivo: File): Observable<Response> {
    const headers = this.getHeaders();
    if (!headers) return EMPTY;
    const formData = new FormData();
    formData.append('data', JSON.stringify(data));
    formData.append('archivo', archivo);
    return this.http.post<Response>(`${environment.apiUrl}ropa-catalogo/documentos`, formData, { headers });
  }

  deleteDocumento(documentoId: number): Observable<Response> {
    const headers = this.getHeaders();
    if (!headers) return EMPTY;
    return this.http.delete<Response>(`${environment.apiUrl}ropa-catalogo/documentos/${documentoId}`, { headers });
  }
}
