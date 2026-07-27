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

  updateClubBranding(clubId: number, brandColor: string, altColor: string): Observable<any> {
    if (isDemoMode()) {
      return of({ data: { clubId, brandColor, altColor }, status: 200, error: null } as any);
    }
    return this.http.put(`${environment.apiUrl}club/branding/${clubId}`, { brandColor, altColor });
  }

  uploadClubLogo(clubId: number, file: File): Observable<any> {
    if (isDemoMode()) {
      return of({ data: `demo-club-logo-${clubId}.png`, status: 200, error: null } as any);
    }
    const formData = new FormData();
    formData.append('files', file);
    return this.http.post(`${environment.apiUrl}club/upload-logo/${clubId}`, formData);
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

  /** Genera un listado mock de abonados/temporada para el modo demo. */
  private demoAbonadosTemporada(clubId: number): any[] {
    const nombres = [
      ['Lucía', 'Fernández Gómez', 'F'],
      ['Sergio', 'Ruiz Martín', 'M'],
      ['Carmen', 'López Díaz', 'F'],
      ['Javier', 'Moreno Sanz', 'M'],
      ['Marta', 'Gil Romero', 'F'],
      ['Andrés', 'Navarro Vega', 'M'],
      ['Elena', 'Castro Ortiz', 'F'],
      ['Pablo', 'Serrano Ramos', 'M'],
    ];
    return nombres.map((n, i) => {
      const cuota = 120;
      const estado = i % 4 === 0 ? 2 : i % 5 === 0 ? 0 : 1;
      const pagado = estado === 1 ? (i % 3 === 0 ? cuota : 60) : 0;
      const restante = cuota - pagado;
      const abonadoId = 5001 + i;
      return {
        abonadosTemporadaId: 7001 + i,
        clubId,
        temporada: '2025/2026',
        cuota: String(cuota),
        pagado: String(pagado),
        restante: String(restante),
        estado,
        fechaCreate: '2025-09-01',
        fechaBaja: '',
        numFamiliares: i % 3,
        abonado: {
          abonadoId,
          nombre: n[0],
          apellidos: n[1],
          mail: `${n[0].toLowerCase()}.${n[1].split(' ')[0].toLowerCase()}@example.com`,
          telefono: `6${String(10000000 + abonadoId).slice(0, 8)}`,
          dni: `${45000000 + abonadoId}X`,
          genero: n[2],
          imgPerfil: '',
          estado,
          numeroSocio: `S-${String(140 + i).padStart(4, '0')}`,
        },
      };
    });
  }

  getListAbonadosTemporadaByClub(clubId: number, season?: string): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: this.demoAbonadosTemporada(clubId), status: 200, error: null } as any);
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
    if (isDemoMode()) {
      return of({
        data: [
          {
            abonadoPagoHistoricoId: 9001,
            abonadosTemporadaId,
            cantidad: '60',
            tipo: 'Pagado',
            fechaCreate: '2025-09-05',
            fechaPago: '2025-09-05',
            metodo: 'Transferencia',
            comentario: 'Primer plazo',
            estado: 2,
          },
          {
            abonadoPagoHistoricoId: 9002,
            abonadosTemporadaId,
            cantidad: '60',
            tipo: 'Pagado',
            fechaCreate: '2026-01-10',
            fechaPago: '2026-01-10',
            metodo: 'Tarjeta',
            comentario: 'Segundo plazo',
            estado: 2,
          },
        ],
        status: 200,
        error: null,
      } as any);
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
    if (isDemoMode()) {
      const abonadoId = (abonado as any)?.abonadoId || Date.now();
      return of({
        data: {
          abonadosTemporadaId: abonadosTemporadaId || Date.now(),
          clubId,
          temporada: '2025/2026',
          cuota: String(cuota),
          pagado: '0',
          restante: String(cuota),
          estado: 1,
          fechaCreate: new Date().toISOString().substring(0, 10),
          fechaBaja: '',
          numFamiliares: 0,
          abonado: { ...abonado, abonadoId },
        },
        status: 200,
        error: null,
      } as any);
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
    if (isDemoMode()) {
      return of({
        data: { cuota: String(cuota), pagado: String(pagado), restante: String(cuota - pagado) },
        status: 200,
        error: null,
      } as any);
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
    if (isDemoMode()) {
      return of({ data: { pagado: '0', restante: '120' }, status: 200, error: null } as any);
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
      const url: string = environment.apiUrl + `club/insertreembolsoabonado`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.post<Response>(url, abonadoPagoHist, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  subirImgAbonado(abonadoId: string, file: File): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: 'abonado_demo.jpg', status: 200, error: null } as any);
    }
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

  /**
   * Catálogo de conceptos de pago del club con audiencia=ABONADOS para una
   * temporada. Usado por la ficha de detalle del abonado para decidir si
   * se puede registrar un pago.
   */
  getListPagosClubAbonados(clubId: number, temporada: string): Observable<Response> {
    if (isDemoMode()) {
      return of({
        data: {
          pagos: [
            { pagoClubId: 3001, nombre: 'Cuota anual de socio', importe: 120, audiencia: 1, temporada },
            { pagoClubId: 3002, nombre: 'Lotería de Navidad', importe: 20, audiencia: 1, temporada },
          ],
        },
        status: 200,
        error: null,
      } as any);
    }
    const token: string | null = localStorage.getItem('token');
    if (!token) return EMPTY;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<Response>(
      environment.apiUrl + `club/getlistpagosclub-abonados/${clubId}/${temporada}`,
      { headers },
    );
  }

  /**
   * Conceptos de pago asignados a un abonado (temporada), con su estado de
   * pago (importe, restante, etc.). Usado por el modal "Registrar pago".
   */
  getConceptosPorAbonado(abonadosTemporadaId: number): Observable<Response> {
    if (isDemoMode()) {
      return of({
        data: {
          conceptos: [
            {
              pagoClubId: 3001,
              nombre: 'Cuota anual de socio',
              importe: 120,
              restante: 0,
              totalPagado: 120,
              estado: 2,
              ultimoPago: '2026-01-10',
              numMovimientos: 2,
            },
            {
              pagoClubId: 3002,
              nombre: 'Lotería de Navidad',
              importe: 20,
              restante: 20,
              totalPagado: 0,
              estado: 0,
              ultimoPago: null,
              numMovimientos: 0,
            },
          ],
        },
        status: 200,
        error: null,
      } as any);
    }
    const token: string | null = localStorage.getItem('token');
    if (!token) return EMPTY;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<Response>(
      environment.apiUrl + `club/abonado/${abonadosTemporadaId}/conceptos`,
      { headers },
    );
  }

  /**
   * Cambia el estado de un abonado (0=baja/rechazado, 1=activo/aprobado,
   * 2=pendiente). En modo demo simula éxito devolviendo el nuevo estado.
   */
  updateAbonadoEstado(
    abonadoId: number,
    estado: number,
    clubId: number,
    motivo?: string,
  ): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: { abonadoId, estado, motivo: motivo?.trim() || null }, status: 200, error: null } as any);
    }
    const token: string | null = localStorage.getItem('token');
    if (token) {
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      });
      const url: string =
        environment.apiUrl +
        `club/abonado/${abonadoId}/estado/${estado}/club/${clubId}`;
      const body = motivo && motivo.trim() ? { motivo: motivo.trim() } : {};
      return this.http.put<Response>(url, body, { headers });
    }
    return EMPTY;
  }

  /**
   * Cambio masivo de estado para varios abonados. En demo simula un
   * agregado OK para todos los ids recibidos.
   */
  bulkUpdateAbonadosEstado(
    clubId: number,
    abonadoIds: number[],
    estadoNuevo: number,
  ): Observable<Response> {
    if (isDemoMode()) {
      return of({
        data: {
          total: abonadoIds.length,
          ok: abonadoIds.length,
          ko: 0,
          estadoNuevo,
          resultados: abonadoIds.map((id) => ({ abonadoId: id, ok: true, estado: estadoNuevo })),
        },
        status: 200,
        error: null,
      } as any);
    }
    const token: string | null = localStorage.getItem('token');
    if (!token) return EMPTY;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
    return this.http.post<Response>(
      environment.apiUrl + 'club/abonados/bulk-estado',
      { clubId, abonadoIds, estadoNuevo },
      { headers },
    );
  }

  /**
   * Nº de conceptos de pago vigentes (audiencia=ABONADOS) del club. En demo
   * devuelve un conteo estático plausible.
   */
  countPendingPagosAbonados(clubId: number): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: { count: 2 }, status: 200, error: null } as any);
    }
    const token: string | null = localStorage.getItem('token');
    if (!token) return EMPTY;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<Response>(
      environment.apiUrl + `club/count-pending-pagos-abonados/${clubId}`,
      { headers },
    );
  }

  /**
   * Aplica los conceptos de pago vigentes al abonado. En demo simula éxito.
   */
  applyPendingPagosToAbonado(abonadosTemporadaId: number): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: { abonadosTemporadaId, applied: 2 }, status: 200, error: null } as any);
    }
    const token: string | null = localStorage.getItem('token');
    if (!token) return EMPTY;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.post<Response>(
      environment.apiUrl + `club/abonado/${abonadosTemporadaId}/apply-pending-pagos`,
      {},
      { headers },
    );
  }

  /**
   * Activa/desactiva el recordatorio semanal de abonados pendientes. En demo
   * simula persistencia devolviendo el flag recibido.
   */
  setSubsReminderEnabled(clubId: number, enabled: boolean): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: { enabled }, status: 200, error: null } as any);
    }
    const token: string | null = localStorage.getItem('token');
    if (!token) return EMPTY;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.put<Response>(
      environment.apiUrl + `club/${clubId}/settings/subs-reminder/${enabled ? 1 : 0}`,
      {},
      { headers },
    );
  }

  /** Lee el flag del recordatorio semanal. En demo devuelve activado. */
  getSubsReminderEnabled(clubId: number): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: { enabled: true }, status: 200, error: null } as any);
    }
    const token: string | null = localStorage.getItem('token');
    if (!token) return EMPTY;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<Response>(
      environment.apiUrl + `club/${clubId}/settings/subs-reminder`,
      { headers },
    );
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

  /**
   * Documentos que el club ha requerido/publicado para un abonado concreto,
   * con su estado (subido / pendiente). Espejo de los documentos de "padres"
   * pero para el módulo de abonados.
   */
  getDocumentosDelAbonado(clubId: number, abonadoId: number): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response([]) as Response);
    }
    const token = localStorage.getItem('token');
    if (!token) return EMPTY;

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    const url = environment.apiUrl + `club/getdocumentosdelabonado/${clubId}/${abonadoId}`;
    return this.http.get<Response>(url, { headers });
  }

  /** Sube un archivo como respuesta a un documento requerido del abonado. */
  uploadDocAbonado(file: File, dto: any): Observable<Response> {
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

    const url = environment.apiUrl + 'club/uploaddocabonado';
    return this.http.post<Response>(url, formData, { headers });
  }

  /** Registra la respuesta a un documento personalizado del abonado (sin archivo). */
  uploadDocAbonadoPersonalizado(dto: any): Observable<Response> {
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

    const url = environment.apiUrl + 'club/uploaddocabonadopersonalizado';
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
    if (isDemoMode()) {
      const clubs = [
        { userId: 9001, userIdClub: 9001, suscripcionId: 5001, nombre: 'CD Demo Norte', numEquipos: 8, equipos: 6, poblacion: 'Madrid', email: 'norte@demo.com' },
        { userId: 9002, userIdClub: 9002, suscripcionId: 5002, nombre: 'UD Demo Sur', numEquipos: 5, equipos: 5, poblacion: 'Sevilla', email: 'sur@demo.com' },
        { userId: 9003, userIdClub: 9003, suscripcionId: 5003, nombre: 'Atlético Demo CF', numEquipos: 12, equipos: 10, poblacion: 'Valencia', email: 'atletico@demo.com' },
        { userId: 9004, userIdClub: 9004, suscripcionId: 5004, nombre: 'Real Sporting Demo', numEquipos: 3, equipos: 2, poblacion: 'Bilbao', email: 'sporting@demo.com' },
      ];
      return of(new Response({ data: clubs, status: 200, error: { code: 0, msg: 'MOCK_OK' } }));
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
    if (isDemoMode()) {
      return of(new Response({ data: { suscripcionId, equipos, ok: true }, status: 200, error: { code: 0, msg: 'MOCK_OK' } }));
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

  getClasificacionResumen(teamId: number): Observable<Response> {
    if (isDemoMode()) {
      return of(new Response({ data: this.mockClasificacionResumen(), status: 200, error: { code: 0, msg: 'MOCK_OK' } }));
    }
    const token: string | null = localStorage.getItem('token');
    if (token) {
      const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
      const apiUrl: string = environment.apiUrl + `club/clasificacion-resumen/${teamId}`;
      return this.http.get<Response>(apiUrl, { headers });
    } else {
      return EMPTY;
    }
  }

  getClasificacionResumenByClub(clubId: number): Observable<Response> {
    if (isDemoMode()) {
      return of(new Response({ data: this.mockClasificacionResumen(), status: 200, error: { code: 0, msg: 'MOCK_OK' } }));
    }
    const token: string | null = localStorage.getItem('token');
    if (token) {
      const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
      const apiUrl: string = environment.apiUrl + `club/clasificacion-resumen-club/${clubId}`;
      return this.http.get<Response>(apiUrl, { headers });
    } else {
      return EMPTY;
    }
  }

  /** Mock inline de clasificaciones para modo demo (no depende de DemoDataService). */
  private mockClasificacionResumen(): any[] {
    const headers = ['Pos', 'Equipo', 'Pts', 'J', 'G', 'E', 'P', 'GF', 'GC', 'Forma'];
    const table = [
      { posicion: '1', nombre: 'Atlético Demo CF', puntos: '42', forma: 'G G E G G', jugados: '18', ganados: '13', empatados: '3', perdidos: '2', golesAFavor: '38', golesEnContra: '14' },
      { posicion: '2', nombre: 'Real Sporting Demo', puntos: '39', forma: 'G E G G P', jugados: '18', ganados: '12', empatados: '3', perdidos: '3', golesAFavor: '34', golesEnContra: '18' },
      { posicion: '3', nombre: 'CD Demo Norte', puntos: '35', forma: 'G G P E G', jugados: '18', ganados: '10', empatados: '5', perdidos: '3', golesAFavor: '29', golesEnContra: '19' },
      { posicion: '4', nombre: 'UD Demo Sur', puntos: '30', forma: 'E G G P E', jugados: '18', ganados: '8', empatados: '6', perdidos: '4', golesAFavor: '25', golesEnContra: '21' },
      { posicion: '5', nombre: 'Demo Juvenil A', puntos: '24', forma: 'P E G E P', jugados: '18', ganados: '6', empatados: '6', perdidos: '6', golesAFavor: '22', golesEnContra: '24' },
    ];
    return [
      {
        teamId: 3101,
        teamName: 'Demo Juvenil A',
        sport: 'futbol',
        hasUrl: true,
        hasData: true,
        lastUpdated: new Date().toISOString(),
        myPosition: 5,
        totalTeams: 16,
        points: 24,
        form: 'P E G E P',
        rawHtml: null,
        headers,
        topClasificacion: table,
      },
      {
        teamId: 3102,
        teamName: 'Demo Cadete B',
        sport: 'futbol-sala',
        hasUrl: false,
        hasData: false,
        lastUpdated: null,
        myPosition: null,
        totalTeams: null,
        points: null,
        form: null,
        rawHtml: null,
        headers: null,
        topClasificacion: [],
      },
    ];
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

  searchClubMembers(clubId: number, q: string, temporada: string, coachUserId = 0): Observable<Response> {
    if (isDemoMode()) {
      const all = [
        { userId: 7001, playerId: 8001, fullName: 'Lucas López García', role: 'PLAYER', photoUrl: null, hasAccount: true, teamId: 3101 },
        { userId: 7002, playerId: 8002, fullName: 'Marta Ruiz Fernández', role: 'PLAYER', photoUrl: null, hasAccount: true, teamId: 3101 },
        { userId: 7003, playerId: 8003, fullName: 'Iker Santos Vidal', role: 'PLAYER', photoUrl: null, hasAccount: false, teamId: 3102 },
        { userId: 7010, playerId: 0, fullName: 'Carlos Entrenador Pérez', role: 'COACH', photoUrl: null, hasAccount: true, teamId: 3101 },
      ];
      const needle = (q || '').toLowerCase();
      const data = all.filter(m => m.fullName.toLowerCase().includes(needle));
      return of(new Response({ data, status: 200, error: { code: 0, msg: 'MOCK_OK' } }));
    }
    const coachParam = coachUserId > 0 ? `&coachUserId=${coachUserId}` : '';
    return this.http.get<Response>(
      environment.apiUrl + `club/search-members/${clubId}?q=${encodeURIComponent(q)}&temporada=${temporada}${coachParam}`,
      { headers: this.getAuthHeaders() }
    );
  }

  // ─── Dunning: cobro de cuotas vencidas a tarjeta guardada ─────────────────

  /** Previsualiza el cobro colectivo de vencidas (nº jugadores, importe, sin tarjeta). */
  chargeOverduePreview(body: { clubId: number; temporada: string; playerId?: number }): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response(DemoDataService.getDemoChargeOverduePreview(body.playerId)) as Response);
    }
    return this.http.post<Response>(
      environment.apiUrl + 'club/charge-overdue-preview',
      body,
      { headers: this.getAuthHeaders() }
    );
  }

  /** Ejecuta el cobro de vencidas. playerId>0 = individual; 0 = colectivo. */
  chargeOverdue(body: { clubId: number; temporada: string; playerId?: number }): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response(DemoDataService.getDemoChargeOverdueResult(body.playerId)) as Response);
    }
    return this.http.post<Response>(
      environment.apiUrl + 'club/charge-overdue',
      body,
      { headers: this.getAuthHeaders() }
    );
  }

  // ─── Variantes de precio (lado club) ──────────────────────────────────────

  /** Devuelve las variantes de precio + flags de registro de un pago. */
  getPagoVariantes(pagoClubId: number): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response(DemoDataService.getDemoPagoVariantes(pagoClubId)) as Response);
    }
    return this.http.get<Response>(
      environment.apiUrl + `club/pago-variantes/${pagoClubId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  /** Asignaciones de variante por jugador para un pago y temporada. */
  getPagoVarianteAsignaciones(pagoClubId: number, temporada: string): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response(DemoDataService.getDemoPagoVarianteAsignaciones(pagoClubId)) as Response);
    }
    return this.http.get<Response>(
      environment.apiUrl + `club/pago-variante-asignaciones/${pagoClubId}/${temporada}`,
      { headers: this.getAuthHeaders() }
    );
  }

  /** Asigna/valida/corrige variante para uno o varios jugadores (bulk). */
  asignarPagoVariante(body: {
    pagoClubId: number;
    temporada: string;
    asignaciones: Array<{ playerId: number; varianteId: number; estado?: number }>;
    validar: boolean;
  }): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response({ validados: body.asignaciones.length }) as Response);
    }
    return this.http.post<Response>(
      environment.apiUrl + 'club/pago-variante-asignar',
      body,
      { headers: this.getAuthHeaders() }
    );
  }

  /** Valida las variantes marcadas y cobra al instante las atrasadas seleccionadas. */
  validarYCobrarVariantes(body: {
    pagoClubId: number;
    temporada: string;
    asignaciones: Array<{ playerId: number; varianteId: number }>;
    cobrarPlayerIds: number[];
  }): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response({ validados: body.asignaciones.length, cobrados: body.cobrarPlayerIds.length }) as Response);
    }
    return this.http.post<Response>(
      environment.apiUrl + 'club/pago-variante-validar-cobrar',
      body,
      { headers: this.getAuthHeaders() }
    );
  }

  /** El club rechaza la propuesta pendiente de un jugador para que vuelva a elegir. */
  rechazarVariantePlayer(body: { pagoClubId: number; playerId: number }): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response({ rechazado: body.playerId }) as Response);
    }
    return this.http.post<Response>(
      environment.apiUrl + 'club/pago-variante-rechazar',
      body,
      { headers: this.getAuthHeaders() }
    );
  }

  // ─── Encuestas (rama demo con mock inline) ────────────────────────────────

  crearEncuesta(dto: any): Observable<Response> {
    if (isDemoMode()) {
      return of(new Response({ data: { encuestaId: Math.floor(Math.random() * 100000) + 1000, ...dto }, status: 200, error: { code: 0, msg: 'MOCK_OK' } }));
    }
    const headers = this.getAuthHeaders();
    if (!headers) return EMPTY;
    return this.http.post<Response>(environment.apiUrl + 'encuesta', dto, { headers });
  }

  getEncuestasByClub(clubId: number): Observable<Response> {
    if (isDemoMode()) {
      return of(new Response({ data: this.mockEncuestasResumen(), status: 200, error: { code: 0, msg: 'MOCK_OK' } }));
    }
    const headers = this.getAuthHeaders();
    if (!headers) return EMPTY;
    return this.http.get<Response>(environment.apiUrl + `encuesta/club/${clubId}`, { headers });
  }

  getEncuestasByUser(userId: number): Observable<Response> {
    if (isDemoMode()) {
      return of(new Response({ data: this.mockEncuestasResumen(), status: 200, error: { code: 0, msg: 'MOCK_OK' } }));
    }
    const headers = this.getAuthHeaders();
    if (!headers) return EMPTY;
    return this.http.get<Response>(environment.apiUrl + `encuesta/user/${userId}`, { headers });
  }

  getEncuestaDetalle(encuestaId: number, userId: number): Observable<Response> {
    if (isDemoMode()) {
      return of(new Response({ data: this.mockEncuestaDetalle(encuestaId), status: 200, error: { code: 0, msg: 'MOCK_OK' } }));
    }
    const headers = this.getAuthHeaders();
    if (!headers) return EMPTY;
    return this.http.get<Response>(
      environment.apiUrl + `encuesta/${encuestaId}/detalle?userId=${userId}`,
      { headers }
    );
  }

  responderEncuesta(encuestaId: number, dto: any): Observable<Response> {
    if (isDemoMode()) {
      return of(new Response({ data: { encuestaId, ok: true }, status: 200, error: { code: 0, msg: 'MOCK_OK' } }));
    }
    const headers = this.getAuthHeaders();
    if (!headers) return EMPTY;
    return this.http.post<Response>(
      environment.apiUrl + `encuesta/${encuestaId}/responder`,
      dto,
      { headers }
    );
  }

  getEncuestaResultados(encuestaId: number): Observable<Response> {
    if (isDemoMode()) {
      return of(new Response({ data: this.mockEncuestaResultados(encuestaId), status: 200, error: { code: 0, msg: 'MOCK_OK' } }));
    }
    const headers = this.getAuthHeaders();
    if (!headers) return EMPTY;
    return this.http.get<Response>(environment.apiUrl + `encuesta/${encuestaId}/resultados`, { headers });
  }

  toggleEncuestaActiva(encuestaId: number, activa: number): Observable<Response> {
    if (isDemoMode()) {
      return of(new Response({ data: { encuestaId, activa }, status: 200, error: { code: 0, msg: 'MOCK_OK' } }));
    }
    const headers = this.getAuthHeaders();
    if (!headers) return EMPTY;
    return this.http.put<Response>(
      environment.apiUrl + `encuesta/${encuestaId}/toggle?activa=${activa}`,
      {},
      { headers }
    );
  }

  deleteEncuesta(encuestaId: number): Observable<Response> {
    if (isDemoMode()) {
      return of(new Response({ data: { encuestaId, deleted: true }, status: 200, error: { code: 0, msg: 'MOCK_OK' } }));
    }
    const headers = this.getAuthHeaders();
    if (!headers) return EMPTY;
    return this.http.delete<Response>(environment.apiUrl + `encuesta/${encuestaId}`, { headers });
  }

  private mockEncuestasResumen(): any[] {
    return [
      {
        encuestaId: 4001, titulo: 'Valoración del primer trimestre',
        descripcion: 'Queremos conocer tu opinión sobre el arranque de temporada.',
        fechaCreate: '2026-01-10T10:00', fechaCierre: '2026-02-01T23:59',
        activa: 1, totalDestinatarios: 24, totalRespondieron: 18, yaRespondio: false, creatorUserId: 1,
      },
      {
        encuestaId: 4002, titulo: 'Preferencia de horario de entrenamiento',
        descripcion: 'Ayúdanos a fijar el mejor horario para el segundo trimestre.',
        fechaCreate: '2026-02-05T09:30', fechaCierre: undefined,
        activa: 1, totalDestinatarios: 24, totalRespondieron: 7, yaRespondio: false, creatorUserId: 1,
      },
      {
        encuestaId: 4003, titulo: 'Cierre de temporada (cerrada)',
        descripcion: 'Encuesta ya finalizada de ejemplo.',
        fechaCreate: '2025-06-01T12:00', fechaCierre: '2025-06-20T23:59',
        activa: 0, totalDestinatarios: 20, totalRespondieron: 20, yaRespondio: true, creatorUserId: 1,
      },
    ];
  }

  private mockEncuestaDetalle(encuestaId: number): any {
    return {
      encuestaId, titulo: 'Valoración del primer trimestre',
      descripcion: 'Queremos conocer tu opinión sobre el arranque de temporada.',
      activa: 1, fechaCierre: '2026-02-01T23:59', yaRespondio: false,
      preguntas: [
        {
          preguntaId: 1, encuestaId, orden: 1,
          texto: '¿Cómo valoras la comunicación del club?', tipo: 'OPCION_MULTIPLE', requerida: 1,
          opciones: [
            { opcionId: 11, preguntaId: 1, orden: 1, texto: 'Excelente' },
            { opcionId: 12, preguntaId: 1, orden: 2, texto: 'Buena' },
            { opcionId: 13, preguntaId: 1, orden: 3, texto: 'Regular' },
            { opcionId: 14, preguntaId: 1, orden: 4, texto: 'Mejorable' },
          ],
          respuestaPreviaOpcionId: null, respuestaPreviaTexto: null,
        },
        {
          preguntaId: 2, encuestaId, orden: 2,
          texto: '¿Qué mejorarías de cara al próximo trimestre?', tipo: 'TEXTO_LIBRE', requerida: 0,
          opciones: [], respuestaPreviaOpcionId: null, respuestaPreviaTexto: null,
        },
      ],
    };
  }

  private mockEncuestaResultados(encuestaId: number): any {
    return {
      encuestaId, titulo: 'Valoración del primer trimestre',
      descripcion: 'Queremos conocer tu opinión sobre el arranque de temporada.',
      activa: 1, totalDestinatarios: 24, totalRespondieron: 18,
      preguntas: [
        {
          preguntaId: 1, orden: 1, texto: '¿Cómo valoras la comunicación del club?', tipo: 'OPCION_MULTIPLE',
          opciones: [
            { opcionId: 11, texto: 'Excelente', count: 8, porcentaje: 44, nombresRespondentes: ['Lucas López', 'Marta Ruiz'] },
            { opcionId: 12, texto: 'Buena', count: 6, porcentaje: 33, nombresRespondentes: ['Iker Santos'] },
            { opcionId: 13, texto: 'Regular', count: 3, porcentaje: 17, nombresRespondentes: [] },
            { opcionId: 14, texto: 'Mejorable', count: 1, porcentaje: 6, nombresRespondentes: [] },
          ],
        },
        {
          preguntaId: 2, orden: 2, texto: '¿Qué mejorarías de cara al próximo trimestre?', tipo: 'TEXTO_LIBRE',
          respuestasTexto: [
            { userId: 7001, nombreDisplay: 'Lucas López', respuesta: 'Más avisos de cambios de horario.', fecha: '2026-01-15' },
            { userId: 7002, nombreDisplay: 'Marta Ruiz', respuesta: 'Todo genial, seguid así.', fecha: '2026-01-16' },
          ],
        },
      ],
      pendientes: [
        { userId: 7003, nombreDisplay: 'Iker Santos' },
        { userId: 7004, nombreDisplay: 'Ana Molina' },
      ],
    };
  }
}
