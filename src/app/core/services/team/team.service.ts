// team.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Response } from 'src/app/core/services/models/response.model';
import { Team, TeamNew } from './team.model';
import { CuotasClub } from '../models/club.model';

@Injectable({
    providedIn: 'root'
})
export class TeamService {

    constructor(private http: HttpClient) { }

    getTeams(userId: string): Observable<Response> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');

        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `team/teamlistbyuser/${userId}`;

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
    createUpdateTeam(userId: string, team: TeamNew): Observable<Response> {
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

    getTeamByPlayer(playerId: string): Observable<Response> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');

        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `team/getteambyplayer/${playerId}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.get<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    getTeamByClub(userId: string): Observable<Response> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');

        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `team/getteamsbyclub/${userId}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.get<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }


    GetPlayersByTeamByClub(clubId: string): Observable<Response> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');

        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `team/getplayersbyteamsbyclub/${clubId}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.get<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    // Método para crear o actualizar un equipo
    createUpdateCuotaClub(cuota: CuotasClub): Observable<Response> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');
        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `team/createupdatecuotaclub`;

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

}
