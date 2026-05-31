import {
  HttpClient,
  HttpEvent,
  HttpHeaders,
  HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { EMPTY, forkJoin, Observable, of, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { Response } from 'src/app/core/services/models/response.model';
import { DemoDataService } from '../demo/demo-data.service';
import { isDemoMode } from '../demo/demo-mode';
import {
  ClubCuotas,
  HostoryPagosPlayer,
  PlayerCuotas,
  RopaClub,
  RopaJugador,
} from '../team/club.model';
import {
  Abonado,
  AbonadoPagoHistorico,
  CorreoEnviado,
  CorreoEnviadoFede,
  Patrocinador,
} from '../models/club.model';

/** Caché del listado de ropa (club + jugadores) para no recargar al volver a la vista */
export interface RopaListCache {
  ropaClub: any;
  ropaPlayers: any[];
}

/** Caché del listado de new-cuotas (jugadores con pagos) para no recargar al volver */
export interface NewCuotasListCache {
  listaPlayers: any[];
}

@Injectable({
  providedIn: 'root',
})
export class ClubService {
  private ropaCache: Map<string, RopaListCache> = new Map();
  private newCuotasCache: Map<string, NewCuotasListCache> = new Map();

  constructor(private http: HttpClient) {}

  private ropaCacheKey(clubId: number, temporada: string): string {
    return `ropa-${clubId}-${temporada}`;
  }
  private newCuotasCacheKey(clubId: number, temporada: string): string {
    return `newcuotas-${clubId}-${temporada}`;
  }

  getRopaCache(clubId: number, temporada: string): RopaListCache | null {
    return this.ropaCache.get(this.ropaCacheKey(clubId, temporada)) ?? null;
  }
  setRopaCache(clubId: number, temporada: string, data: Partial<RopaListCache>): void {
    const key = this.ropaCacheKey(clubId, temporada);
    const existing = this.ropaCache.get(key) ?? { ropaClub: null, ropaPlayers: [] };
    this.ropaCache.set(key, { ...existing, ...data });
  }
  clearRopaCache(clubId?: number, temporada?: string): void {
    if (clubId == null && temporada == null) {
      this.ropaCache.clear();
      return;
    }
    if (clubId != null && temporada != null) {
      this.ropaCache.delete(this.ropaCacheKey(clubId, temporada));
    }
  }

  getNewCuotasCache(clubId: number, temporada: string): NewCuotasListCache | null {
    return this.newCuotasCache.get(this.newCuotasCacheKey(clubId, temporada)) ?? null;
  }
  setNewCuotasCache(clubId: number, temporada: string, data: Partial<NewCuotasListCache>): void {
    const key = this.newCuotasCacheKey(clubId, temporada);
    const existing = this.newCuotasCache.get(key) ?? { listaPlayers: [] };
    this.newCuotasCache.set(key, { ...existing, ...data });
  }
  clearNewCuotasCache(clubId?: number, temporada?: string): void {
    if (clubId == null && temporada == null) {
      this.newCuotasCache.clear();
      return;
    }
    if (clubId != null && temporada != null) {
      this.newCuotasCache.delete(this.newCuotasCacheKey(clubId, temporada));
    }
  }

  filterClub(filter: string) {
    const url: string = environment.apiUrl + 'user/filterClub';
    return this.http.post<any>(url, filter);
  }

  getClubByUserId(userId: number): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: 9001, status: 200, error: null } as any);
    }
    const token: string | null = localStorage.getItem('token');
    if (token) {
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });
      const url: string = environment.apiUrl + `club/getclubbyuserid/${userId}`;
      return this.http.get<Response>(url, { headers });
    } else {
      return EMPTY;
    }
  }

  getAllClubes(): Observable<Response> {
    // Construye la URL para la solicitud
    const url: string = environment.apiUrl + `user/getAllClubes`;
    // Realiza la solicitud HTTP con las cabeceras configuradas
    return this.http.get<Response>(url);
  }

  getAllClubsRegistered(): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `team/getAllClubsRegistered`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getRopaJugadoresByClubForTemp(
    clubId: string,
    temporada: string
  ): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response(DemoDataService.getDemoRopaJugadoresByClub()) as Response);
    }
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl +
        `club/getropajugadoresbyclub/${clubId}/${temporada}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  // Método para crear o actualizar un equipo
  updateRopaJugadorByPk(ropaJugador: RopaJugador): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response({ data: true }) as Response);
    }
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `club/updateropajugador`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.post<Response>(url, ropaJugador, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getRopaClub(clubId: string, temp: string): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response(DemoDataService.getDemoRopaClub()) as Response);
    }
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl + `club/getropaclub/${clubId}/${temp}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  // Método para crear o actualizar un equipo
  updateRopaClub(ropaClub: RopaClub): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response({ data: true }) as Response);
    }
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `club/updateropaclub`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.post<Response>(url, ropaClub, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getUserRopaPrefs(userId: number, clubId: number, temporada: string): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response({ columnPrefs: '{}', labelPrefs: '{}' }) as Response);
    }
    return this.http.get<Response>(
      environment.apiUrl + `club/getuserropaprefs/${userId}/${clubId}/${temporada}`,
      { headers: this.getAuthHeaders() }
    );
  }

  saveUserRopaPrefs(dto: { userId: number; clubId: number; temporada: string; columnPrefs: string; labelPrefs: string }): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response({ data: true }) as Response);
    }
    return this.http.post<Response>(
      environment.apiUrl + 'club/saveuserropaprefs',
      dto,
      { headers: this.getAuthHeaders() }
    );
  }

  getClubCuota(clubId: string, temp: string): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl + `club/getclubcuotas/${clubId}/${temp}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getClubCuotaForLoadTeam(
    clubId: number,
    temp: string,
    teamId: number
  ): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl + `club/getclubcuotas/${clubId}/${temp}/${teamId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  // Método para crear o actualizar un equipo
  updateclubCuotas(
    clubCuota: ClubCuotas,
    option: number,
    value: number
  ): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl + `club/updateclubcuotas/${option}/${value}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.post<Response>(url, clubCuota, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getHistoryPagosPlayer(
    clubId: number,
    playerId: number,
    temporada: string
  ): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl +
        `club/gethistorypagosplayer/${clubId}/${playerId}/${temporada}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getPlayerCuota(
    clubId: number,
    playerId: number,
    temporada: string
  ): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl +
        `club/getplayercuota/${clubId}/${playerId}/${temporada}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  updatePlayerCuotas(
    playerCuota: PlayerCuotas,
    clubId: number
  ): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl + `club/updateplayercuotas/${clubId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.post<Response>(url, playerCuota, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  updatehistorypagosplayer(
    historyPagos: HostoryPagosPlayer
  ): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `club/updatehistorypagosplayer`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.post<Response>(url, historyPagos, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  devolverHistoryPagosPlayer(
    historyPagos: HostoryPagosPlayer
  ): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl + `club/devolverhistorypagosplayer`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.post<Response>(url, historyPagos, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  uploadExcel(clubId: number, file: File): Observable<Response> {
    const token: string | null = localStorage.getItem('token');
    if (token) {
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      const formData: FormData = new FormData();
      formData.append('file', file, file.name);

      const url: string = environment.apiUrl + `club/uploadExcel/${clubId}`;
      return this.http.post<Response>(url, formData, { headers });
    } else {
      return EMPTY;
    }
  }

  uploadExcelGesDesk(clubId: number, file: File): Observable<Response> {
    const token: string | null = localStorage.getItem('token');
    if (token) {
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      const formData: FormData = new FormData();
      formData.append('file', file, file.name);

      const url: string =
        environment.apiUrl + `club/uploadExcelgesdesk/${clubId}`;
      return this.http.post<Response>(url, formData, { headers });
    } else {
      return EMPTY;
    }
  }

  getListJugadoresByClubForTemp(
    clubId: number,
    temporada: string
  ): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: DemoDataService.getDemoListJugadoresByClub(), status: 200, error: null } as any);
    }
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl +
        `club/getlistplayeroftheclubfortemp/${clubId}/${temporada}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getListEntrenadoresByClubForTemp(
    clubId: number,
    temporada: string
  ): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: DemoDataService.getDemoListEntrenadoresByClub(), status: 200, error: null } as any);
    }
    const token: string | null = localStorage.getItem('token');
    if (token) {
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });
      const url: string =
        environment.apiUrl +
        `club/getlisttraineroftheclubfortemp/${clubId}/${temporada}`;
      return this.http.get<Response>(url, { headers });
    } else {
      return EMPTY;
    }
  }

  getListPlayersOfClubByStadistics(clubId: number): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: DemoDataService.getDemoListPlayersStadistics(), status: 200, error: null } as any);
    }
    const token: string | null = localStorage.getItem('token');
    if (token) {
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });
      const url: string =
        environment.apiUrl + `club/getlistplayersofclubbystadistics/${clubId}`;
      return this.http.get<Response>(url, { headers });
    } else {
      return EMPTY;
    }
  }

  getListTeamsOfClubByStadistics(clubId: number): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: DemoDataService.getDemoListTeamsStadistics(), status: 200, error: null } as any);
    }
    const token: string | null = localStorage.getItem('token');
    if (token) {
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });
      const url: string =
        environment.apiUrl + `club/getlistteamsofclubbystadistics/${clubId}`;
      return this.http.get<Response>(url, { headers });
    } else {
      return EMPTY;
    }
  }

  //************** PARA LOS ABONADOS *********************/

  getListAbonadosTemporadaByClub(clubId: number): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl + `club/getlistabonadostemporada/${clubId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getListPagosAbonadoHistorico(
    abonadosTemporadaId: number
  ): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl +
        `club/getlistpagosabonadohistorico/${abonadosTemporadaId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  // Método para crear o actualizar un equipo
  createUpdateAbonado(
    abonado: Abonado,
    clubId: number,
    cuota: number,
    abonadosTemporadaId: number
  ): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl +
        `club/createupdateabonado/${clubId}/${cuota}/${abonadosTemporadaId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.post<Response>(url, abonado, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  // Método para crear o actualizar un equipo
  createPagoAbonado(
    abonadoPagoHist: AbonadoPagoHistorico,
    cuota: number,
    pagado: number
  ): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl + `club/createpagoabonado/${cuota}/${pagado}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.post<Response>(url, abonadoPagoHist, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  // Método para crear o actualizar un equipo
  insertReembolsoAbonadoPagoHistorico(
    abonadoPagoHist: AbonadoPagoHistorico
  ): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `club/insertreembolsoabonado`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.post<Response>(url, abonadoPagoHist, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  subirImgAbonado(abonadoId: string, file: File): Observable<Response> {
    // Verifica si el archivo está presente
    if (file) {
      // Obtén el token almacenado en localStorage
      const token: string | null = localStorage.getItem('token');
      // Verifica si el token está presente
      if (token) {
        // Configura las cabeceras con el token para la solicitud HTTP
        const headers = new HttpHeaders({
          Authorization: `Bearer ${token}`,
        });

        // Construye el cuerpo de la solicitud FormData
        const formData: FormData = new FormData();
        formData.append('files', file, file.name);

        // Construye la URL para la solicitud
        const url: string =
          environment.apiUrl + `club/subirimgabonado/${abonadoId}`;

        // Realiza la solicitud HTTP con las cabeceras y el cuerpo configurados
        return this.http.post<Response>(url, formData, { headers });
      } else {
        // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
        return throwError('Token no disponible');
      }
    } else {
      // Manejo de error si no se proporciona un archivo (puedes personalizar según tus necesidades)
      return throwError('Archivo no proporcionado');
    }
  }

  //**********************Patrocinadores**************/

  subirImgPatrocinador(
    patrocinadorId: number,
    file: File
  ): Observable<Response> {
    // Verifica si el archivo está presente
    if (file) {
      // Obtén el token almacenado en localStorage
      const token: string | null = localStorage.getItem('token');
      // Verifica si el token está presente
      if (token) {
        // Configura las cabeceras con el token para la solicitud HTTP
        const headers = new HttpHeaders({
          Authorization: `Bearer ${token}`,
        });

        // Construye el cuerpo de la solicitud FormData
        const formData: FormData = new FormData();
        formData.append('files', file, file.name);

        // Construye la URL para la solicitud
        const url: string =
          environment.apiUrl + `club/subirimgpatrocinador/${patrocinadorId}`;

        // Realiza la solicitud HTTP con las cabeceras y el cuerpo configurados
        return this.http.post<Response>(url, formData, { headers });
      } else {
        // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
        return throwError('Token no disponible');
      }
    } else {
      // Manejo de error si no se proporciona un archivo (puedes personalizar según tus necesidades)
      return throwError('Archivo no proporcionado');
    }
  }

  getListPatrocinadoresByClub(clubId: number): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response(DemoDataService.getDemoPatrocinadores()) as Response);
    }
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl + `club/getlistpatrocinadoresbyclub/${clubId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  // Método para crear o actualizar un equipo
  createUpdatePatrocinador(patrocinador: Patrocinador): Observable<Response> {
    if (isDemoMode()) {
      const created = { ...patrocinador, patrocinadorId: patrocinador.patrocinadorId || 99 };
      return of(DemoDataService.response(created) as Response);
    }
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `club/createpatrocinador`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.post<Response>(url, patrocinador, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  deletePatrocinadorById(patrocinadorId: number): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response({ data: true }) as Response);
    }
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl + `club/deletepatrocinadorbyid/${patrocinadorId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.delete<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  avtivePatrocinadorById(
    patrocinadorId: number,
    value: number
  ): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response({ data: true }) as Response);
    }
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl +
        `club/avtivepatrocinadorbyid/${patrocinadorId}/${value}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getListPatrocinadoresByUser(
    userId: number,
    profileId: number
  ): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response(DemoDataService.getDemoPatrocinadores()) as Response);
    }
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl +
        `club/getlistpatrocinadoresbyuser/${userId}/${profileId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  //************** PARA LOS CORREOS *********************/

  getListCorreos(userId: number): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response(DemoDataService.getDemoCorreos()) as Response);
    }
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl + `club/getlistcorreosbyuser/${userId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  /** Lista de correos/notificaciones por club (cuando el usuario entra como club). */
  getListCorreosByClub(clubId: number): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response(DemoDataService.getDemoCorreos()) as Response);
    }
    const token: string | null = localStorage.getItem('token');
    if (token) {
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });
      const url: string =
        environment.apiUrl + `club/getlistcorreosbyclub/${clubId}`;
      return this.http.get<Response>(url, { headers });
    }
    return EMPTY;
  }

  // Método para crear o actualizar un equipo
  createCorreo(correoEnviado: CorreoEnviado): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response({ ...correoEnviado, correoEnviadoId: 99 }) as Response);
    }
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `club/create-correo`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.post<Response>(url, correoEnviado, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getCorreosProgramados(userId: number): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response(DemoDataService.getDemoCorreosProgramados()) as Response);
    }
    const token: string | null = localStorage.getItem('token');
    if (token) {
      const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
      return this.http.get<Response>(environment.apiUrl + `club/correos-programados/${userId}`, { headers });
    }
    return EMPTY;
  }

  getCorreoProgramado(correoEnviadoId: number): Observable<Response> {
    const token: string | null = localStorage.getItem('token');
    if (token) {
      const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
      return this.http.get<Response>(environment.apiUrl + `club/correo-programado/${correoEnviadoId}`, { headers });
    }
    return EMPTY;
  }

  updateCorreoProgramado(correoEnviadoId: number, dto: any): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response({ data: true }) as Response);
    }
    const token: string | null = localStorage.getItem('token');
    if (token) {
      const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
      return this.http.put<Response>(environment.apiUrl + `club/correo-programado/${correoEnviadoId}`, dto, { headers });
    }
    return EMPTY;
  }

  cancelCorreoProgramado(correoEnviadoId: number): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response({ data: true }) as Response);
    }
    const token: string | null = localStorage.getItem('token');
    if (token) {
      const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
      return this.http.delete<Response>(environment.apiUrl + `club/correo-programado/${correoEnviadoId}`, { headers });
    }
    return EMPTY;
  }

  openCorreoRecibido(correoRecibidoId: number): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response({ data: true }) as Response);
    }
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl + `club/open-correo-recibido/${correoRecibidoId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  /** Obtiene un correo recibido por id (incluye body). No marca como leído. */
  getCorreoRecibido(correoRecibidoId: number): Observable<Response> {
    const token: string | null = localStorage.getItem('token');
    if (token) {
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });
      const url: string =
        environment.apiUrl + `club/get-correo-recibido/${correoRecibidoId}`;
      return this.http.get<Response>(url, { headers });
    }
    return EMPTY;
  }

  deleteCorreo(id: number, option: number): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response({ data: 1 }) as Response);
    }
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl + `club/delete-correo/${id}/${option}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.delete<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  // Método para obtener la suscripcionDTO de un playerID
  getEntrenandoAhora(clubId: number, temporada: string): Observable<any> {
    if (isDemoMode()) {
      const data = DemoDataService.getDemoCuadroMandos();
      return of({ data, status: 200 });
    }
    const token: string | null = localStorage.getItem('token');
    if (token) {
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });
      const url: string =
        environment.apiUrl + `club/getentrenandoahora/${clubId}/${temporada}`;
      return this.http.get<Response>(url, { headers });
    } else {
      return EMPTY;
    }
  }

  getCuotasClub(clubId: number, temporada: string): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: DemoDataService.getDemoCuotasClub(), status: 200, error: null } as any);
    }
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl + `club/getcuotasclub/${clubId}/${temporada}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getPuntuacion(clubId: number): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: DemoDataService.getDemoPuntuacion(), status: 200, error: null } as any);
    }
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `club/getpuntuacion/${clubId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getEntrenamientosCreados(clubId: number): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: DemoDataService.getDemoEntrenamientosCreados(), status: 200, error: null } as any);
    }
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl + `club/getentrenamientos-creados/${clubId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getProximosPartidos(clubId: number): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl + `club/getproximos-partidos/${clubId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  /**************************DOCUMENTOS************************** */

  getlistDocumentosByClub(clubId: number): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: DemoDataService.getDemoDocumentosByClub(), status: 200, error: null } as any);
    }
    const token: string | null = localStorage.getItem('token');
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl + `club/getdocumentosbyclub/${clubId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }
  getConteoPadresPorClub(clubId: number): Observable<Response> {
    const token: string | null = localStorage.getItem('token');

    if (!token) {
      return EMPTY;
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    const url: string = environment.apiUrl + `club/documentos/conteo/${clubId}`;

    return this.http.get<Response>(url, { headers });
  }

  deleteDocumentoForClub(docClubesId: number): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl + `club/deletedocumentoforclub/${docClubesId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.delete<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  setDocumentoVisible(
    docClubesId: number,
    visible: number
  ): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl +
        `club/setdocumentovisible/${docClubesId}/${visible}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  setDocumentoRequiere(
    docClubesId: number,
    requiere: number
  ): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl +
        `club/setdocumentorequiere/${docClubesId}/${requiere}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  uploadDocClub(file: File, dto: any): Observable<HttpEvent<any>> {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Token no encontrado');
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    const formData = new FormData();
    formData.append('files', file, file.name);
    formData.append(
      'dto',
      new Blob([JSON.stringify(dto)], { type: 'application/json' })
    );

    const url = environment.apiUrl + 'club/uploaddocclub';

    const req = new HttpRequest('POST', url, formData, {
      headers,
      reportProgress: true,
      responseType: 'json',
    });

    return this.http.request(req);
  }

  uploadSinDocClub(dto: any): Observable<Response> {
    const token = localStorage.getItem('token');
    if (!token) return EMPTY;

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    const formData = new FormData();
    formData.append(
      'dto',
      new Blob([JSON.stringify(dto)], { type: 'application/json' })
    );

    const url = environment.apiUrl + 'club/uploadsindocclub';
    return this.http.post<Response>(url, formData, { headers });
  }

  updateTextoAutorizacion(docClubesId: number, textoAutorizacion: string): Observable<Response> {
    return this.http.post<Response>(
      environment.apiUrl + 'club/updatetextoautorizacion/' + docClubesId,
      { textoAutorizacion },
      { headers: this.getAuthHeaders() }
    );
  }

  getListDocumentosPlayer(
    teamId: number,
    playerId: number
  ): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: DemoDataService.getDemoDocumentosPlayer(), status: 200, error: null } as any);
    }
    const token: string | null = localStorage.getItem('token');
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl +
        `club/getlistdocumentosplayer/${teamId}/${playerId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  updateDocumentoDescargado(dto: any): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response({ ok: true }) as Response);
    }
    const token = localStorage.getItem('token');
    if (!token) return EMPTY;

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });

    const url = environment.apiUrl + 'club/updatedocumentodescargado';
    return this.http.post<Response>(url, dto, { headers }); // ← sin FormData
  }

  uploadDocPadres(file: File, dto: any): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response({ ok: true }) as Response);
    }
    const token = localStorage.getItem('token');
    if (!token) return EMPTY;

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    const formData = new FormData();
    formData.append('files', file, file.name ? file.name : '');
    formData.append(
      'dto',
      new Blob([JSON.stringify(dto)], { type: 'application/json' })
    );

    const url = environment.apiUrl + 'club/uploaddocpadres';
    return this.http.post<Response>(url, formData, { headers });
  }

  uploadDocPadresPersonalizado(dto: any): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response({ ok: true }) as Response);
    }
    const token = localStorage.getItem('token');
    if (!token) return EMPTY;

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    const formData = new FormData();
    formData.append(
      'dto',
      new Blob([JSON.stringify(dto)], { type: 'application/json' })
    );

    const url = environment.apiUrl + 'club/uploaddocpadrespersonalizado';
    return this.http.post<Response>(url, formData, { headers });
  }

  getListCategoriasByFilter(filter: string): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl + `club/getlistcategoriasbyfilter/${filter}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getListCategorias(): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response([
        { categoryTypeId: 1, categoryName: 'Senior', year: 2024 },
        { categoryTypeId: 2, categoryName: 'Juvenil', year: 2024 },
        { categoryTypeId: 3, categoryName: 'Cadete', year: 2024 },
      ]) as Response);
    }
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `club/getlistcategorias`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  updateCreateCategoryType(dto: any): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response(dto) as Response);
    }
    const token = localStorage.getItem('token');
    if (token) {
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      });

      const url = environment.apiUrl + 'club/updatecreatecategorytype';
      return this.http.post<Response>(url, dto, { headers });
    } else {
      return EMPTY;
    }
  }

  getBancoClub(clubId: number, temporada: string): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl + `club/getbancoclub/${clubId}/${temporada}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  updateBancoClub(dto: any): Observable<Response> {
    const token = localStorage.getItem('token');
    if (token) {
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      });

      const url = environment.apiUrl + 'club/update-bancoclub';
      return this.http.post<Response>(url, dto, { headers });
    } else {
      return EMPTY;
    }
  }

  getNotifConfig(clubId: number): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) return EMPTY;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    const url = environment.apiUrl + `club/notification-config/${clubId}`;
    return this.http.get<any>(url, { headers });
  }

  saveNotifConfig(dto: any): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) return EMPTY;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
    const url = environment.apiUrl + 'club/notification-config';
    return this.http.post<any>(url, dto, { headers });
  }

  getListPagosClub(clubId: number, temporada: string): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: DemoDataService.getDemoListPagosClub(), status: 200, error: null } as any);
    }
    const token: string | null = localStorage.getItem('token');
    if (token) {
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });
      const url: string =
        environment.apiUrl + `club/getlistpagosclub/${clubId}/${temporada}`;
      return this.http.get<Response>(url, { headers });
    } else {
      return EMPTY;
    }
  }

  getListPagosClubForStripe(
    clubId: number,
    temporada: string,
    teamId: number,
    playerId: number
  ): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: DemoDataService.getDemoListPagosClubForStripe(), status: 200, error: null } as any);
    }
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl +
        `club/getlistpagosclubforstripe/${clubId}/${temporada}/${teamId}/${playerId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getListPagosClubForPlayer(
    clubId: number,
    temporada: string,
    playerId: number
  ): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: DemoDataService.getDemoListPagosClubForPlayer(clubId, temporada, playerId), status: 200, error: null } as any);
    }
    const token: string | null = localStorage.getItem('token');
    if (token) {
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });
      const url: string =
        environment.apiUrl +
        `club/getlistpagosclubforplayer/${clubId}/${temporada}/${playerId}`;
      return this.http.get<Response>(url, { headers });
    } else {
      return EMPTY;
    }
  }

  createUpdatePagoClub(dto: any): Observable<Response> {
    const token = localStorage.getItem('token');
    if (token) {
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      });

      const url = environment.apiUrl + 'club/createupdate-pagoclub';
      return this.http.post<Response>(url, dto, { headers });
    } else {
      return EMPTY;
    }
  }

  getListPlayersPagosClub(
    clubId: number,
    temporada: string
  ): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: DemoDataService.getDemoListPlayersPagosClub(), status: 200, error: null } as any);
    }
    const token: string | null = localStorage.getItem('token');
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl +
        `club/getlistplayerspagosclub/${clubId}/${temporada}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  /**
   * Obtiene el desglose de pagos individuales para cada jugador.
   * Combina getListPlayersPagosClub + getListPagosClubForPlayer por cada jugador.
   * Devuelve un array de jugadores, cada uno con un campo extra `detallePagos[]`.
   */
  getPlayersWithPaymentDetails(
    clubId: number,
    temporada: string
  ): Observable<any[]> {
    const token: string | null = localStorage.getItem('token');
    if (!token) return of([]);

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    // 1. Obtener todos los jugadores con su resumen
    return this.getListPlayersPagosClub(clubId, temporada).pipe(
      map((res: Response) => {
        if (!res?.data) return [];
        // Deduplicar por playerId
        return Array.from(
          new Map(res.data.map((p: any) => [p.playerId, p])).values()
        ) as any[];
      })
    );
  }

  /**
   * Obtiene el desglose de cuotas asignadas a un jugador concreto.
   * Wrapper tipado de getListPagosClubForPlayer.
   */
  getPlayerPaymentDetail(
    clubId: number,
    temporada: string,
    playerId: number
  ): Observable<any[]> {
    return this.getListPagosClubForPlayer(clubId, temporada, playerId).pipe(
      map((res: Response) => (res?.data ?? []) as any[])
    );
  }

  updateInfoPagosPlayer(
    clubId: number,
    temporada: string
  ): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl +
        `club/resetpagosclubplayers/${clubId}/${temporada}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  createPagoHistoryPlayer(dto: any): Observable<Response> {
    const token = localStorage.getItem('token');
    if (token) {
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      });

      const url = environment.apiUrl + `club/create-pagohistoriplayer`;
      return this.http.post<Response>(url, dto, { headers });
    } else {
      return EMPTY;
    }
  }

  moverPlayerTemporada(
    clubId: number,
    playerId: number,
    temporada: string
  ): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl +
        `club/moverplayertemporada/${clubId}/${playerId}/${temporada}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getListHistoryPagosByPlayer(
    clubId: number,
    temporada: string,
    playerId: number
  ): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: DemoDataService.getDemoListHistoryPagosByPlayer(clubId, temporada, playerId), status: 200, error: null } as any);
    }
    const token: string | null = localStorage.getItem('token');
    if (token) {
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });
      const url: string =
        environment.apiUrl +
        `club/getlishistorypagosbyplayer/${clubId}/${temporada}/${playerId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  devolverPagoClubById(dto: any): Observable<Response> {
    const token = localStorage.getItem('token');
    if (token) {
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      });

      const url = environment.apiUrl + `club/devolverpagoclubbyplayer`;
      return this.http.post<Response>(url, dto, { headers });
    } else {
      return EMPTY;
    }
  }

  deletePagoClubForPlayer(
    pagoClubId: number,
    temporada: string,
    playerId: number
  ): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl +
        `club/delete-pagoclub/${pagoClubId}/${playerId}/${temporada}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.delete<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  addPagoClubForPlayer(
    pagoClubId: number,
    playerId: number,
    temporada: string
  ): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl +
        `club/addpagoclubplayerpersonalizado/${pagoClubId}/${playerId}/${temporada}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  createUpdatePagoClubForPlayer(
    dto: any,
    playerId: number
  ): Observable<Response> {
    const token = localStorage.getItem('token');
    if (token) {
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      });

      const url = environment.apiUrl + `club/editpagoclubforplayer/${playerId}`;
      return this.http.post<Response>(url, dto, { headers });
    } else {
      return EMPTY;
    }
  }

  deletePagoClub(pagoClubId: number): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl + `club/deletepagoclub/${pagoClubId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.delete<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY;
    }
  }

  deletePagoClubForce(pagoClubId: number): Observable<Response> {
    const token: string | null = localStorage.getItem('token');
    if (token) {
      const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
      const url: string = environment.apiUrl + `club/deletepagoclubforce/${pagoClubId}`;
      return this.http.delete<Response>(url, { headers });
    } else {
      return EMPTY;
    }
  }

  getListHistoriPagos(clubId: number, temporada: string): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: DemoDataService.getDemoHistorialPagos(), status: 200, error: null } as any);
    }
    const token: string | null = localStorage.getItem('token');
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl + `club/getlisthistoripagos/${clubId}/${temporada}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getListClubes(userId: number, temporada: string): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl + `club/getlistclubes/${userId}/${temporada}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  setNewClubInFederacion(
    userId: number,
    mail: string,
    temporada: string
  ): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl +
        `club/setnewclubInfederacion/${userId}/${mail}/${temporada}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getListPlayersForFede(
    userId: number,
    temporada: string
  ): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl +
        `club/getlistallplayersforfede/${userId}/${temporada}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  // Método para crear o actualizar un equipo
  createCorreoFede(correoEnviado: CorreoEnviadoFede): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `club/create-correo-fede`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.post<Response>(url, correoEnviado, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getListPlayersForFedeCombo(
    userId: number,
    temporada: string
  ): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl +
        `club/getlistallplayersforfedecombo/${userId}/${temporada}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  deleteClubFede(clubId: number, temporada: string): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl + `club/deleteclubfede/${clubId}/${temporada}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.delete<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getListInfoClubesFede(
    userId: number,
    temporada: string
  ): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl +
        `club/getlistinfoclubesfede/${userId}/${temporada}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getEquiposClub(userId: number): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `club/getequiposclub/${userId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  setEquiposClub(suscripcionId: number, equipos: number): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl + `club/setequiposclub/${suscripcionId}/${equipos}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getStandings(teamId: number, round: number): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl + `club/api/rffm-standings/${teamId}/${round}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getResults(teamId: number, round: number): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl + `club/api/rffm-results/${teamId}/${round}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getActa(
    competicion: string,
    idGroup: string,
    codActa: string
  ): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl +
        `club/api/rffm-acta/${competicion}/${idGroup}/${codActa}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getTodo(teamId: number, codJornada: string): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response(DemoDataService.getDemoClasificacionTodo(codJornada)) as Response);
    }
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // Construye la URL para la solicitud
      const url: string =
        environment.apiUrl + `club/clasificacion/${teamId}/${codJornada}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getMatchesByTeamAndType(teamId: number, tipoPartido: string): Observable<Response> {
    const token: string | null = localStorage.getItem('token');
    if (token) {
      const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
      const url: string = environment.apiUrl + `match/getlistpostpartidobyteam/${teamId}/${tipoPartido}`;
      return this.http.get<Response>(url, { headers });
    } else {
      return EMPTY;
    }
  }

  saveTeamUrl(teamId: number, url: string): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response({ ok: true }) as Response);
    }
    const token: string | null = localStorage.getItem('token');
    if (token) {
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      });
      const apiUrl: string = environment.apiUrl + `club/team-url/${teamId}`;
      return this.http.post<Response>(apiUrl, { url }, { headers });
    } else {
      return EMPTY;
    }
  }

  refreshClasificacion(teamId: number, codJornada: string): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response(DemoDataService.getDemoClasificacionTodo(codJornada)) as Response);
    }
    const token: string | null = localStorage.getItem('token');
    if (token) {
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });
      const apiUrl: string = environment.apiUrl + `club/clasificacion-refresh/${teamId}/${codJornada}`;
      return this.http.post<Response>(apiUrl, {}, { headers });
    } else {
      return EMPTY;
    }
  }

  /**************************PERFIL ENTRENADOR************************** */

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  getPerfilEntrenador(userId: number): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response(DemoDataService.getDemoEntrenadorPerfil()) as Response);
    }
    return this.http.get<Response>(
      environment.apiUrl + 'entrenador/perfil/' + userId,
      { headers: this.getAuthHeaders() }
    );
  }

  getClubForEntrenador(userId: number): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response(9001) as Response);
    }
    return this.http.get<Response>(
      environment.apiUrl + 'entrenador/club/' + userId,
      { headers: this.getAuthHeaders() }
    );
  }

  getAllClubsForEntrenador(userId: number): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response(DemoDataService.getDemoClubsForEntrenador()) as Response);
    }
    return this.http.get<Response>(
      environment.apiUrl + 'entrenador/clubs/' + userId,
      { headers: this.getAuthHeaders() }
    );
  }

  getUserByEmail(email: string): Observable<Response> {
    return this.http.get<Response>(
      environment.apiUrl + 'user/getbyemail/' + email,
      { headers: this.getAuthHeaders() }
    );
  }

  syncEntrenadorClubs(): Observable<Response> {
    return this.http.get<Response>(
      environment.apiUrl + 'entrenador/sync-clubs',
      { headers: this.getAuthHeaders() }
    );
  }

  createUpdatePerfilEntrenador(dto: any): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response({ ...dto, entrenadorPerfilId: 1 }) as Response);
    }
    const formData = new FormData();
    formData.append(
      'dto',
      new Blob([JSON.stringify(dto)], { type: 'application/json' })
    );
    return this.http.post<Response>(
      environment.apiUrl + 'entrenador/perfil',
      formData,
      { headers: this.getAuthHeaders() }
    );
  }

  uploadDocPerfilEntrenador(file: File, userId: number, tipo: string): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response({ ok: true }) as Response);
    }
    const formData = new FormData();
    formData.append('files', file, file.name);
    return this.http.post<Response>(
      environment.apiUrl + 'entrenador/perfil/upload-doc/' + userId + '/' + tipo,
      formData,
      { headers: this.getAuthHeaders() }
    );
  }

  deleteDocPerfilEntrenador(userId: number, tipo: string): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response({ ok: true }) as Response);
    }
    return this.http.delete<Response>(
      environment.apiUrl + 'entrenador/perfil/delete-doc/' + userId + '/' + tipo,
      { headers: this.getAuthHeaders() }
    );
  }

  getPerfilesEntrenadoresByClub(clubId: number): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: DemoDataService.getDemoPerfilesEntrenadores(), status: 200, error: null } as any);
    }
    return this.http.get<Response>(
      environment.apiUrl + 'entrenador/perfiles-by-club/' + clubId,
      { headers: this.getAuthHeaders() }
    );
  }

  /**************************DOCUMENTOS ENTRENADOR************************** */

  getListDocumentosEntrenador(clubId: number, userId: number): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response(DemoDataService.getDemoDocumentosEntrenador()) as Response);
    }
    return this.http.get<Response>(
      environment.apiUrl + 'entrenador/documentos/' + clubId + '/' + userId,
      { headers: this.getAuthHeaders() }
    );
  }

  getlistDocumentosEntrenadoresByClub(clubId: number): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: DemoDataService.getDemoDocumentosEntrenadoresByClub(), status: 200, error: null } as any);
    }
    return this.http.get<Response>(
      environment.apiUrl + 'entrenador/documentos-club/' + clubId,
      { headers: this.getAuthHeaders() }
    );
  }

  getDocCompletionDetail(docClubesId: number, clubId: number, tipo: string): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response(DemoDataService.getDemoDocCompletionDetail(docClubesId, tipo)) as Response);
    }
    return this.http.get<Response>(
      environment.apiUrl + 'club/doc-completion-detail/' + docClubesId + '/' + clubId + '/' + tipo,
      { headers: this.getAuthHeaders() }
    );
  }

  saveDocTeams(docClubesId: number, teamIds: number[]): Observable<Response> {
    return this.http.post<Response>(
      environment.apiUrl + 'club/doc-teams/' + docClubesId,
      teamIds,
      { headers: this.getAuthHeaders() }
    );
  }

  uploadDocEntrenador(file: File, dto: any): Observable<Response> {
    const formData = new FormData();
    formData.append('files', file, file.name);
    formData.append(
      'dto',
      new Blob([JSON.stringify(dto)], { type: 'application/json' })
    );
    return this.http.post<Response>(
      environment.apiUrl + 'entrenador/upload-doc-entrenador',
      formData,
      { headers: this.getAuthHeaders() }
    );
  }

  uploadDocEntrenadorPersonalizado(dto: any): Observable<Response> {
    const formData = new FormData();
    formData.append(
      'dto',
      new Blob([JSON.stringify(dto)], { type: 'application/json' })
    );
    return this.http.post<Response>(
      environment.apiUrl + 'entrenador/upload-doc-entrenador-personalizado',
      formData,
      { headers: this.getAuthHeaders() }
    );
  }

  updateDocumentoEntrenadorDescargado(dto: any): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response({ ok: true }) as Response);
    }
    const formData = new FormData();
    formData.append(
      'dto',
      new Blob([JSON.stringify(dto)], { type: 'application/json' })
    );
    return this.http.post<Response>(
      environment.apiUrl + 'entrenador/update-doc-entrenador-descargado',
      formData,
      { headers: this.getAuthHeaders() }
    );
  }

  /**************************FORMULARIOS PERSONALIZADOS************************** */

  getFormCamposByDoc(docClubesId: number): Observable<Response> {
    return this.http.get<Response>(
      environment.apiUrl + 'formulario/campos/documento/' + docClubesId,
      { headers: this.getAuthHeaders() }
    );
  }

  getFormCamposByClub(clubId: number, contexto: string): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: [], status: 200, error: null } as any);
    }
    return this.http.get<Response>(
      environment.apiUrl + 'formulario/campos/club/' + clubId + '/' + contexto,
      { headers: this.getAuthHeaders() }
    );
  }

  saveFormCampos(campos: any[]): Observable<Response> {
    return this.http.post<Response>(
      environment.apiUrl + 'formulario/campos',
      campos,
      { headers: this.getAuthHeaders() }
    );
  }

  deleteFormCampo(formularioCampoId: number): Observable<Response> {
    return this.http.delete<Response>(
      environment.apiUrl + 'formulario/campos/delete/' + formularioCampoId,
      { headers: this.getAuthHeaders() }
    );
  }

  getFormRespuestasByDoc(docClubesId: number, userId: number, playerId: number): Observable<Response> {
    return this.http.get<Response>(
      environment.apiUrl + 'formulario/respuestas/documento/' + docClubesId + '/' + userId + '/' + playerId,
      { headers: this.getAuthHeaders() }
    );
  }

  getFormRespuestasByProfile(clubId: number, userId: number): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: [], status: 200, error: null } as any);
    }
    return this.http.get<Response>(
      environment.apiUrl + 'formulario/respuestas/perfil/' + clubId + '/' + userId,
      { headers: this.getAuthHeaders() }
    );
  }

  getFormRespuestasByPlayerProfile(clubId: number, playerId: number): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: [], status: 200, error: null } as any);
    }
    return this.http.get<Response>(
      environment.apiUrl + 'formulario/respuestas/perfil-jugador/' + clubId + '/' + playerId,
      { headers: this.getAuthHeaders() }
    );
  }

  saveFormRespuestas(respuestas: any[]): Observable<Response> {
    return this.http.post<Response>(
      environment.apiUrl + 'formulario/respuestas',
      respuestas,
      { headers: this.getAuthHeaders() }
    );
  }

  uploadFormFile(file: File, formularioCampoId: number, userId: number, playerId: number): Observable<Response> {
    const formData = new FormData();
    formData.append('files', file, file.name);
    return this.http.post<Response>(
      environment.apiUrl + 'formulario/respuestas/upload-file/' + formularioCampoId + '/' + userId + '/' + playerId,
      formData,
      { headers: this.getAuthHeaders() }
    );
  }

  getFormRegistros(clubId: number, docClubesId: number): Observable<Response> {
    return this.http.get<Response>(
      environment.apiUrl + 'formulario/registro/' + clubId + '/' + docClubesId,
      { headers: this.getAuthHeaders() }
    );
  }

  getFormRegistroDetalle(registroId: number): Observable<Response> {
    return this.http.get<Response>(
      environment.apiUrl + 'formulario/registro/detalle/' + registroId,
      { headers: this.getAuthHeaders() }
    );
  }

  getCalendarioTeamOrder(userId: number, clubId: number): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: DemoDataService.getDemoCalendarioTeamOrder(), status: 200, error: null } as any);
    }
    return this.http.get<Response>(
      environment.apiUrl + 'club/calendario-team-order/' + userId + '/' + clubId,
      { headers: this.getAuthHeaders() }
    );
  }

  saveCalendarioTeamOrder(userId: number, clubId: number, teamIdsOrder: string): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: null, status: 200, error: null } as any);
    }
    return this.http.post<Response>(
      environment.apiUrl + 'club/calendario-team-order/' + userId + '/' + clubId,
      teamIdsOrder,
      { headers: this.getAuthHeaders() }
    );
  }

  // --- Pagos v2 ---
  getListPlayersPagosClubV2(clubId: number, temporada: string, filters?: { pagos?: string; team?: string; estado?: string }): Observable<Response> {
    let url = environment.apiUrl + `club/getlistplayerspagosclub-v2/${clubId}/${temporada}`;
    const params: string[] = [];
    if (filters?.pagos) params.push(`filterPagos=${filters.pagos}`);
    if (filters?.team) params.push(`filterTeam=${filters.team}`);
    if (filters?.estado) params.push(`filterEstado=${filters.estado}`);
    if (params.length) url += '?' + params.join('&');
    return this.http.get<Response>(url, { headers: this.getAuthHeaders() });
  }

  chargeSavedCardsBatch(body: any): Observable<Response> {
    return this.http.post<Response>(
      environment.apiUrl + 'club/charge-saved-cards-batch',
      body,
      { headers: this.getAuthHeaders() }
    );
  }

  exportPagos(clubId: number, temporada: string, format: string): Observable<Blob> {
    const token: string | null = localStorage.getItem('token');
    const headers: any = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return this.http.get(
      environment.apiUrl + `club/export-pagos/${clubId}/${temporada}/${format}`,
      { headers, responseType: 'blob' }
    );
  }

  // --- Notifications ---
  getNotifications(userId: number): Observable<Response> {
    return this.http.get<Response>(
      environment.apiUrl + `notifications/${userId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  getUnreadNotificationCount(userId: number): Observable<Response> {
    return this.http.get<Response>(
      environment.apiUrl + `notifications/unread-count/${userId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  markNotificationRead(notificationId: number): Observable<Response> {
    return this.http.put<Response>(
      environment.apiUrl + `notifications/${notificationId}/read`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  markAllNotificationsRead(userId: number): Observable<Response> {
    return this.http.put<Response>(
      environment.apiUrl + `notifications/read-all/${userId}`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  searchClubMembers(clubId: number, q: string, temporada: string): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response([]) as Response);
    }
    return this.http.get<Response>(
      environment.apiUrl + `club/search-members/${clubId}?q=${encodeURIComponent(q)}&temporada=${temporada}`,
      { headers: this.getAuthHeaders() }
    );
  }
}
