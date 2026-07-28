// team.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { EMPTY, Observable, of, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { DemoDataService } from '../demo/demo-data.service';
import { isDemoMode } from '../demo/demo-mode';
import { Response } from 'src/app/core/services/models/response.model';
import { CancelSubscriptionRequest, HorarioTeam, SubscriptionRequest, Suscripcion, Team, TeamNew } from './team.model';
import { CuotasClub, HistoryCuotasClub } from '../models/club.model';
import { RopaClub } from './club.model';

export interface VerifySubPayload {
    subscriptionId: string;            // siempre
    paymentIntentId?: string;          // solo en 'payment'
    invoiceId?: string;                // opcional en 'payment'
    setupIntentId?: string;            // solo en 'setup'
    clubId?: number;
    teamId?: number;
    playerId?: number;
    pagoClubId?: number;
}

/** Caché del listado de equipos para no recargar al volver a la vista */
export interface EquiposListCache {
    listTeam: any[];
    pictureClub: string;
    noPicture: boolean;
    clubId?: number;
    numEquipos?: number;
    datosNoCargados?: boolean;
    clubOk?: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class TeamService {

    private base = environment.apiUrl;
    private equiposCache: Map<string, EquiposListCache> = new Map();

    constructor(private http: HttpClient) { }

    private equiposCacheKey(userId: number, temporada: string, profileId: number): string {
        return `equipos-${userId}-${temporada}-${profileId}`;
    }

    getEquiposCache(userId: number, temporada: string, profileId: number): EquiposListCache | null {
        return this.equiposCache.get(this.equiposCacheKey(userId, temporada, profileId)) ?? null;
    }

    setEquiposCache(userId: number, temporada: string, profileId: number, data: Partial<EquiposListCache>): void {
        const key = this.equiposCacheKey(userId, temporada, profileId);
        const existing = this.equiposCache.get(key) ?? {
            listTeam: [],
            pictureClub: '',
            noPicture: false,
        };
        this.equiposCache.set(key, { ...existing, ...data });
    }

    clearEquiposCache(userId?: number, temporada?: string, profileId?: number): void {
        if (userId == null && temporada == null && profileId == null) {
            this.equiposCache.clear();
            return;
        }
        if (userId != null && temporada != null && profileId != null) {
            this.equiposCache.delete(this.equiposCacheKey(userId, temporada, profileId));
        }
    }

    private authHeaders(): HttpHeaders | undefined {
        const token = localStorage.getItem('token');
        return token ? new HttpHeaders({ 'Authorization': `Bearer ${token}` }) : undefined;
    }

    getTeams(userId: string, temporada: string): Observable<Response> {
        if (isDemoMode()) {
            return of(DemoDataService.response(DemoDataService.getDemoTeamsResponseData()) as any);
        }
        const token: string | null = localStorage.getItem('token');

        if (token) {
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            const url: string = environment.apiUrl + `team/teamlistbyuser/${userId}/${temporada}`;

            return this.http.get<Response>(url, { headers });
        } else {
            return EMPTY;
        }
    }

    getTeamById(teamId: string): Observable<Response> {
        if (isDemoMode()) {
            return of(DemoDataService.response(DemoDataService.getDemoTeamById(teamId)) as any);
        }
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');

        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `team/getteambyteamid/${teamId}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.get<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    getUserListByTeam(teamId: string): Observable<Response> {
        if (isDemoMode()) {
            return of(DemoDataService.response(DemoDataService.getDemoUserListByTeam()) as any);
        }
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');

        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `user/getUserListByTeam/${teamId}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.get<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    // Método para crear o actualizar un equipo
    createUpdateTeam(userId: number, team: TeamNew): Observable<Response> {
        if (isDemoMode()) {
            return of(DemoDataService.response(team) as any);
        }
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');
        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `team/createupdateteams/${userId}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.post<Response>(url, team, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
        }

    }

    /**
     * Sube el logo del equipo. El backend debe exponer POST team/upload-logo/{teamId} con multipart/form-data (file).
     */
    uploadTeamLogo(teamId: number, file: File): Observable<Response> {
        if (isDemoMode()) {
            return of(DemoDataService.response({ logoUrl: 'demo-logo.png' }) as any);
        }
        const token: string | null = localStorage.getItem('token');
        if (!token) return EMPTY;
        const formData = new FormData();
        formData.append('file', file, file.name);
        const headers = new HttpHeaders({
            'Authorization': `Bearer ${token}`
        });
        const url: string = environment.apiUrl + `team/upload-logo/${teamId}`;
        return this.http.post<Response>(url, formData, { headers });
    }

    deleteTeam(teamId: string): Observable<Response> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');

        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `team/deleteteam/${teamId}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.delete<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    deleteLogicTeam(teamId: string): Observable<Response> {
        if (isDemoMode()) {
            return of(DemoDataService.response({ ok: true }) as any);
        }
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');

        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `team/deleteLogicTeam/${teamId}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.delete<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    getTeamByPlayer(playerId: string, temporada: string): Observable<Response> {
        if (isDemoMode()) {
            return of(DemoDataService.response(DemoDataService.getDemoTeamByPlayer()) as Response);
        }
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');

        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `team/getteambyplayer/${playerId}/${temporada}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.get<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    getTeamByClub(userId: string, temporada: string): Observable<Response> {
        if (isDemoMode()) {
            return of(DemoDataService.response(DemoDataService.getDemoTeamByClubResponse()) as any);
        }
        const token: string | null = localStorage.getItem('token');
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `team/getteamsbyclub/${userId}/${temporada}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.get<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    GetPlayersByTeamByClub(clubId: string, temporada: string): Observable<Response> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');

        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `team/getplayersbyteamsbyclub/${clubId}/${temporada}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.get<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    getPlayersByTeamByClubVerify(clubId: number, temporada: string): Observable<Response> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');

        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `team/getnumsuscripciones/${clubId}/${temporada}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.get<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    // Método para crear o actualizar un equipo
    createUpdateCuotaClub(cuota: CuotasClub, option: number, value: number): Observable<Response> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');
        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `team/createupdatecuotaclub/${option}/${value}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.post<Response>(url, cuota, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
        }

    }

    // Método para crear o actualizar un equipo
    createUpdateCuotaPlayer(playerId: number, cuota: string, cuotaRopa: string): Observable<Response> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');
        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `team/createupdatecuotaplayer/${playerId}/${cuota}/${cuotaRopa}`;;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.get<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
        }

    }

    getCuotaPlayer(playerId: number, teamId: number): Observable<Response> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');

        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `team/getcuotaplayer/${playerId}/${teamId}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.get<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    getHistoryCuotaClubByPlayer(teamId: number, playerId: number): Observable<Response> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');

        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `team/gethistorycuotaclubbyplayer/${teamId}/${playerId}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.get<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    // Método para crear o actualizar un equipo
    createUpdateHistoryCuotasClub(historyCuotasClub: HistoryCuotasClub): Observable<Response> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');
        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `team/createupdatecuotaplayerbyhistorycuotasclub`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.post<Response>(url, historyCuotasClub, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    getTeamsByClubForCombo(clubId: number, temporada: string): Observable<Response> {
        if (isDemoMode()) {
            return of(DemoDataService.response(DemoDataService.getDemoTeamsByClubForCombo()) as any);
        }
        const token: string | null = localStorage.getItem('token');
        if (token) {
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });
            const url: string = environment.apiUrl + `team/getteamsbyclubforcombo/${clubId}/${temporada}`;
            return this.http.get<Response>(url, { headers });
        } else {
            return EMPTY;
        }
    }

    getTeamsByClubForCombo2(clubId: number, temporada: string, userId: number): Observable<Response> {
        if (isDemoMode()) {
            // Combo de los equipos del usuario, no de todo el club.
            return of(DemoDataService.response(DemoDataService.getDemoTeamsForUserCombo()) as any);
        }
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');

        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `team/getteamsbyclubforcombo2/${clubId}/${temporada}/${userId}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.get<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    movePlayer(playerId: number, teamIdOld: number, teamIdNew: number, cuotaTbm: number, addPlayerMoved: number): Observable<Response> {
        if (isDemoMode()) {
            return of({ data: true, status: 200, error: null } as any);
        }
        const token: string | null = localStorage.getItem('token');
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `player/moveplayer/${playerId}/${teamIdOld}/${teamIdNew}/${cuotaTbm}/${addPlayerMoved}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.get<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    // Método para crear o actualizar stripe como club
    createUpdateHorarioTeam(dto: HorarioTeam): Observable<any> {
        if (isDemoMode()) {
            return of(DemoDataService.response(dto) as any);
        }
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');
        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `team/createupdatehorarioteam`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.post<Response>(url, dto, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    gethorariobyteam(teamId: number, clubId: number): Observable<Response> {
        if (isDemoMode()) {
            return of(DemoDataService.response(DemoDataService.getDemoHorariosByClub()) as any);
        }
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');

        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `team/gethorariobyteam/${teamId}/${clubId}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.get<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    getHorariosTeamByClub(clubId: number): Observable<Response> {
        if (isDemoMode()) {
            return of(DemoDataService.response(DemoDataService.getDemoHorariosByClub()) as any);
        }
        const token: string | null = localStorage.getItem('token');
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `team/gethorariosbyclub/${clubId}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.get<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    /*****************      STRIPE            **************/

    // Método para crear o actualizar stripe como club
    createAccountStripe(email: string, clubId: number): Observable<any> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');
        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `stripe/create-account/${email}/${clubId}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.get<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    processPayment(paymentRequest: any): Observable<any> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');
        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `stripe/process-payment`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.post<Response>(url, paymentRequest, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    // Método para crear una suscripcion
    createSubscription(dto: SubscriptionRequest): Observable<any> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');
        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `stripe/create-subscription`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.post<Response>(url, dto, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    // Método para crear una suscripcion
    createSubscriptionGratis(dto: SubscriptionRequest): Observable<any> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');
        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `stripe/create-free-subscription`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.post<Response>(url, dto, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    // Método para obtener la suscripcionDTO de un playerID
    getSubscriptionByPlayerId(playerId: number, userId: number): Observable<any> {
        if (isDemoMode()) {
            return of({ data: { suscripcionId: 1 }, status: 200 });
        }
        const token: string | null = localStorage.getItem('token');
        if (token) {
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });
            const url: string = environment.apiUrl + `stripe/getsubscriptionbyplayerid/${playerId}/${userId}`;
            return this.http.get<Response>(url, { headers });
        } else {
            return EMPTY;
        }
    }

    // Método para cancelar la suscripcion
    cancelSubscription(dto: CancelSubscriptionRequest): Observable<any> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');
        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `stripe/cancel-subscription`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.post<Response>(url, dto, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    // Método para actualizar la suscripcion
    updateSubscription(dto: SubscriptionRequest): Observable<any> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');
        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `stripe/update-subscription`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.post<Response>(url, dto, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    // Método para crear una suscripcion
    reactivarSubscription(dto: SubscriptionRequest): Observable<any> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');
        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `stripe/reactivate-subscription`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.post<Response>(url, dto, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    // Método para obtener la suscripcionDTO de un playerID
    deleteSuscripcionById(suscripcionId: number): Observable<any> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');
        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `stripe/deletesuscripcionbyid/${suscripcionId}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.delete<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    // Método para obtener la suscripcionDTO de un playerID
    getEstadoSuscripcion(userId: number, profileId: number): Observable<any> {
        if (isDemoMode()) {
            return of({ data: 999, status: 200 });
        }
        const token: string | null = localStorage.getItem('token');
        if (token) {
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            const url: string = environment.apiUrl + `stripe/getestadosuscripcion/${userId}/${profileId}`;

            return this.http.get<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    // Método para obtener la suscripcionDTO de un playerID
    validateCupon(cuponId: string): Observable<any> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');
        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `stripe/validate-cupon/${cuponId}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.get<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    createIntent(body: any): Observable<any> {
        const headers = this.authHeaders();
        if (!headers) return throwError(() => new Error('No auth token'));
        const url = `${this.base}stripe/payments/create-intent`;
        return this.http.post<any>(url, body, { headers });
    }

    verifyPayment(body: { paymentIntentId: string }): Observable<any> {
        const headers = this.authHeaders();
        if (!headers) return throwError(() => new Error('No auth token'));
        const url = `${this.base}stripe/payments/verify`;
        return this.http.post<any>(url, body, { headers });
    }

    createSubscriptionPlan(body: any): Observable<any> {
        const headers = this.authHeaders();
        if (!headers) return throwError(() => new Error('No auth token'));
        const url = `${this.base}stripe/subscriptions/create-plan`;
        return this.http.post<any>(url, body, { headers });
    }

    subscribeToPlan(body: any): Observable<any> {
        if (isDemoMode()) {
            return of({ data: { subscriptionId: 'sub_demo', clientSecret: null, confirmationMode: undefined }, status: 200 });
        }
        const headers = this.authHeaders();
        if (!headers) return throwError(() => new Error('No auth token'));
        const url = `${this.base}stripe/subscriptions/subscribe`;
        return this.http.post<any>(url, body, { headers });
    }

    verifySubscription(body: VerifySubPayload): Observable<any> {
        if (isDemoMode()) {
            return of({ data: { verified: true }, status: 200 });
        }
        const headers = this.authHeaders();
        if (!headers) return throwError(() => new Error('No auth token'));
        const url = `${this.base}stripe/subscriptions/verify`;
        const cleaned = Object.fromEntries(
            Object.entries(body).filter(([, v]) => v !== undefined && v !== null && v !== '')
        );
        return this.http.post<any>(url, cleaned, { headers });
    }

    // --- Setup Intent (saved cards) ---
    createSetupIntent(body: any): Observable<any> {
        if (isDemoMode()) {
            return of({ data: { clientSecret: 'seti_demo_secret', setupIntentId: 'seti_demo' } });
        }
        const headers = this.authHeaders();
        if (!headers) return throwError(() => new Error('No auth token'));
        return this.http.post<any>(`${this.base}stripe/setup-intent/create`, body, { headers });
    }

    confirmSetupIntent(body: any): Observable<any> {
        if (isDemoMode()) {
            return of({ data: { status: 'succeeded', paymentMethodId: 'pm_demo' } });
        }
        const headers = this.authHeaders();
        if (!headers) return throwError(() => new Error('No auth token'));
        return this.http.post<any>(`${this.base}stripe/setup-intent/confirm`, body, { headers });
    }

    getSavedCards(playerId: number, clubId: number): Observable<any> {
        if (isDemoMode()) {
            return of({ data: [] });
        }
        const headers = this.authHeaders();
        if (!headers) return throwError(() => new Error('No auth token'));
        return this.http.get<any>(`${this.base}stripe/saved-cards/${playerId}/${clubId}`, { headers });
    }

    deleteSavedCard(savedCardId: number): Observable<any> {
        if (isDemoMode()) {
            return of({ data: true });
        }
        const headers = this.authHeaders();
        if (!headers) return throwError(() => new Error('No auth token'));
        return this.http.delete<any>(`${this.base}stripe/saved-cards/${savedCardId}`, { headers });
    }

    chargeSavedCard(body: any): Observable<any> {
        if (isDemoMode()) {
            return of({ data: { paymentIntentId: 'pi_demo', status: 'succeeded' } });
        }
        const headers = this.authHeaders();
        if (!headers) return throwError(() => new Error('No auth token'));
        return this.http.post<any>(`${this.base}stripe/charge-saved-card`, body, { headers });
    }

    // --- Subscription management ---
    pauseSubscription(body: any): Observable<any> {
        const headers = this.authHeaders();
        if (!headers) return throwError(() => new Error('No auth token'));
        return this.http.post<any>(`${this.base}stripe/subscriptions/pause`, body, { headers });
    }

    resumeSubscription(body: any): Observable<any> {
        const headers = this.authHeaders();
        if (!headers) return throwError(() => new Error('No auth token'));
        return this.http.post<any>(`${this.base}stripe/subscriptions/resume`, body, { headers });
    }

    cancelPlayerSubscription(body: any): Observable<any> {
        const headers = this.authHeaders();
        if (!headers) return throwError(() => new Error('No auth token'));
        return this.http.post<any>(`${this.base}stripe/subscriptions/cancel-player`, body, { headers });
    }

    getPlayerSubscriptions(playerId: number, clubId: number): Observable<any> {
        if (isDemoMode()) {
            return of({ data: [] });
        }
        const headers = this.authHeaders();
        if (!headers) return throwError(() => new Error('No auth token'));
        return this.http.get<any>(`${this.base}stripe/subscriptions/player/${playerId}/${clubId}`, { headers });
    }

    getClubSubscriptions(clubId: number): Observable<any> {
        const headers = this.authHeaders();
        if (!headers) return throwError(() => new Error('No auth token'));
        return this.http.get<any>(`${this.base}stripe/subscriptions/club/${clubId}`, { headers });
    }

    /** Devuelve todas las suscripciones automáticas del club agrupadas por cuota,
     *  incluyendo todos los estados y el detalle del último pago por jugador. */
    getClubAutoPayments(clubId: number): Observable<any> {
        const headers = this.authHeaders();
        if (!headers) return throwError(() => new Error('No auth token'));
        return this.http.get<any>(`${this.base}stripe/subscriptions/club/${clubId}/auto-payments`, { headers });
    }

    /** Devuelve cuotas Sphaira Pay (tipoCobro=3) del club con estado de tarjeta por jugador. */
    getSphairaPayScheduled(clubId: number, temporada: string): Observable<any> {
        if (isDemoMode()) {
            return of({ data: DemoDataService.getDemoSphairaPayScheduled(temporada), status: 200, error: null } as any);
        }
        const headers = this.authHeaders();
        if (!headers) return throwError(() => new Error('No auth token'));
        return this.http.get<any>(`${this.base}club/sphaira-pay/${clubId}/${temporada}`, { headers });
    }

    desistirCuota(body: { pagoClubId: number; playerId: number; userId: number; clubId: number; temporada?: string; reason?: string }): Observable<any> {
        if (isDemoMode()) {
            return of({ data: { ok: true }, status: 200 });
        }
        const headers = this.authHeaders();
        if (!headers) return throwError(() => new Error('No auth token'));
        return this.http.post<any>(`${this.base}stripe/cuotas/desistir`, body, { headers });
    }

    getOpcionesFederacionCombo(temporada: string, userId: number): Observable<Response> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');

        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `team/getclubesforfederacion/${temporada}/${userId}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.get<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    getClubesAdmin(temporada: string): Observable<Response> {
        const token: string | null = localStorage.getItem('token');
        if (token) {
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });
            const url: string = environment.apiUrl + `team/getclubesadmin/${temporada}`;
            return this.http.get<Response>(url, { headers });
        } else {
            return EMPTY;
        }
    }

    getAdminKPIs(): Observable<Response> {
        const token: string | null = localStorage.getItem('token');
        if (token) {
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });
            const url: string = environment.apiUrl + `team/getadminkpis`;
            return this.http.get<Response>(url, { headers });
        } else {
            return EMPTY;
        }
    }

    getAdminAIInsights(): Observable<Response> {
        const token: string | null = localStorage.getItem('token');
        if (token) {
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });
            const url: string = environment.apiUrl + `team/getadminaiinsights`;
            return this.http.get<Response>(url, { headers });
        } else {
            return EMPTY;
        }
    }

    refreshAdminCache(): Observable<Response> {
        const url: string = environment.apiUrl + 'team/refreshadmincache';
        const token = localStorage.getItem('token');
        if (!token) return throwError(() => new Error('No auth token'));
        const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
        return this.http.post<Response>(url, {}, { headers });
    }

    getAdminStats(): Observable<Response> {
        const token: string | null = localStorage.getItem('token');
        if (token) {
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });
            const url: string = environment.apiUrl + `team/getadminstats`;
            return this.http.get<Response>(url, { headers });
        } else {
            return EMPTY;
        }
    }

    getClubDetailAdmin(clubId: number): Observable<Response> {
        const token: string | null = localStorage.getItem('token');
        if (token) {
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });
            const url: string = environment.apiUrl + `team/getclubdetailadmin/${clubId}`;
            return this.http.get<Response>(url, { headers });
        } else {
            return EMPTY;
        }
    }

    changeSusClubAdmin(body: any, option: number): Observable<any> {
        const headers = this.authHeaders();
        if (!headers) return throwError(() => new Error('No auth token'));
        const url = `${this.base}club/changeSuscriptionClubAdmin/${option}`;
        return this.http.post<any>(url, body, { headers });
    }

    getAdminRegistrations(): Observable<Response> {
        const url: string = environment.apiUrl + 'team/getadminregistrations';
        const token = localStorage.getItem('token');
        if (!token) return throwError(() => new Error('No auth token'));
        const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
        return this.http.get<Response>(url, { headers });
    }

    softDeleteClub(clubId: number): Observable<Response> {
        const url: string = environment.apiUrl + 'team/softdeleteclub/' + clubId;
        const token = localStorage.getItem('token');
        if (!token) return throwError(() => new Error('No auth token'));
        const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
        return this.http.delete<Response>(url, { headers });
    }

    getFeeConfig(clubId?: number): Observable<any> {
        if (isDemoMode()) {
            return of({ data: { appPct: 0.015, stripePct: 0.015, fixedFeeCents: 25 } });
        }
        const headers = this.authHeaders();
        if (!headers) return throwError(() => new Error('No auth token'));
        const params = clubId && clubId > 0 ? `?clubId=${clubId}` : '';
        return this.http.get<any>(`${this.base}stripe/fee-config${params}`, { headers });
    }

}
