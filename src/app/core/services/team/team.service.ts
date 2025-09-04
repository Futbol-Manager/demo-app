// team.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
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

@Injectable({
    providedIn: 'root'
})
export class TeamService {

    private base = environment.apiUrl;

    constructor(private http: HttpClient) { }

    private authHeaders(): HttpHeaders | undefined {
        const token = localStorage.getItem('token');
        return token ? new HttpHeaders({ 'Authorization': `Bearer ${token}` }) : undefined;
    }

    getTeams(userId: string, temporada: string): Observable<Response> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');

        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `team/teamlistbyuser/${userId}/${temporada}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.get<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    getTeamById(teamId: string): Observable<Response> {
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
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    getUserListByTeam(teamId: string): Observable<Response> {
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
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    // Método para crear o actualizar un equipo
    createUpdateTeam(userId: number, team: TeamNew): Observable<Response> {
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
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
        }

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
            return this.http.get<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    deleteLogicTeam(teamId: string): Observable<Response> {
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
            return this.http.get<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    getTeamByPlayer(playerId: string, temporada: string): Observable<Response> {
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
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    getTeamByClub(userId: string, temporada: string): Observable<Response> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');

        // Verifica si el token está presente
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
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    getTeamsByClubForCombo(clubId: number, temporada: string): Observable<Response> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');

        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `team/getteamsbyclubforcombo/${clubId}/${temporada}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.get<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    getTeamsByClubForCombo2(clubId: number, temporada: string, userId: number): Observable<Response> {
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
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    movePlayer(playerId: number, teamIdOld: number, teamIdNew: number, cuotaTbm: number): Observable<Response> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');

        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `player/moveplayer/${playerId}/${teamIdOld}/${teamIdNew}/${cuotaTbm}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.get<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    // Método para crear o actualizar stripe como club
    createUpdateHorarioTeam(dto: HorarioTeam): Observable<any> {
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
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    gethorariobyteam(teamId: number, clubId: number): Observable<Response> {
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
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    getHorariosTeamByClub(clubId: number): Observable<Response> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');

        // Verifica si el token está presente
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
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    // Método para obtener la suscripcionDTO de un playerID
    getSubscriptionByPlayerId(playerId: number, userId: number): Observable<any> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');
        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `stripe/getsubscriptionbyplayerid/${playerId}/${userId}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.get<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
            return this.http.get<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    // Método para obtener la suscripcionDTO de un playerID
    getEstadoSuscripcion(userId: number, profileId: number): Observable<any> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');
        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `stripe/getestadosuscripcion/${userId}/${profileId}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.get<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
        const headers = this.authHeaders();
        if (!headers) return throwError(() => new Error('No auth token'));
        const url = `${this.base}stripe/subscriptions/subscribe`;
        return this.http.post<any>(url, body, { headers });
    }

    verifySubscription(body: VerifySubPayload): Observable<any> {
        const headers = this.authHeaders();
        if (!headers) return throwError(() => new Error('No auth token'));
        const url = `${this.base}stripe/subscriptions/verify`;
        // elimina undefined/null/'' para no obligar al backend
        const cleaned = Object.fromEntries(
            Object.entries(body).filter(([, v]) => v !== undefined && v !== null && v !== '')
        );
        return this.http.post<any>(url, cleaned, { headers });
    }

}
