// player.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Response } from 'src/app/core/services/models/response.model';
import { NotificatePlayerUI, Player, ScoutingPlayer } from './player.model';
import { PlayerPostPartido } from '../models/match.model';
import { HttpEvent, HttpEventType } from '@angular/common/http';


@Injectable({
    providedIn: 'root'
})
export class PlayerService {

    constructor(private http: HttpClient) { }

    getPlayers(teamId: string): Observable<Response> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');

        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `player/playerlistbyteam/${teamId}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.get<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    getListPlayersEstadisticsByTeam(teamId: number, tipoPartido: string): Observable<Response> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');

        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `player/getlistestadisticasjugadores/${teamId}/${tipoPartido}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.get<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    getDatosPlayer(teamId: number, playerId: number): Observable<Response> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');

        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `match/getdatosplayer/${teamId}/${playerId}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.get<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    // Método para crear o actualizar un jugador
    createUpdatePlayer(teamId: string, player: Player): Observable<Response> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');
        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `player/createupdateplayer/${teamId}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.post<Response>(url, player, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    deletePlayer(playerId: string): Observable<Response> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');

        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `player/deleteplayer/${playerId}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.get<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    getPlayersPostPartido(teamId: string, postPartidoId: string): Observable<Response> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');

        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `match/getlistplayersbyteam/${teamId}/${postPartidoId}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.get<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    createUpdateInfoPlayerPostPartido(player: PlayerPostPartido): Observable<Response> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');
        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `match/createupdateinfoplayerpostpartido`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.post<Response>(url, player, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    getListPostPartidoByTeam(teamId: number, tipoPartido: string): Observable<Response> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');

        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `match/getlistpostpartidobyteam/${teamId}/${tipoPartido}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.get<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    getListPlayersByTeamForGalery(teamId: number): Observable<Response> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');

        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `match/getlistpostpartidobyteam-forgalery/${teamId}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.get<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    getListProximosPartidos(teamId: number): Observable<Response> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');

        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `match/getlistproximospartidos/${teamId}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.get<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    getDeleteGaleriaPartidos(galeriaPartidoId: number): Observable<Response> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');

        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `match/getdeletegaleriapartidos/${galeriaPartidoId}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.get<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    setVideoYouTubeGaleria(postpartidoId: number, teamId: number, playerId: number, link: string): Observable<Response> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');

        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `match/getvideoyoutubegaleria/${postpartidoId}/${teamId}/${playerId}/${link}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.get<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    uploadImgGaleria(file: File, postpartidoId: number, teamId: number, playerId: number): Observable<Response> {
        // Verifica si el archivo está presente
        if (file) {
            // Obtén el token almacenado en localStorage
            const token: string | null = localStorage.getItem('token');
            // Verifica si el token está presente
            if (token) {
                // Configura las cabeceras con el token para la solicitud HTTP
                const headers = new HttpHeaders({
                    'Authorization': `Bearer ${token}`
                });

                // Construye el cuerpo de la solicitud FormData
                const formData: FormData = new FormData();
                formData.append('files', file, file.name);

                // Construye la URL para la solicitud
                const url: string = environment.apiUrl + `match/uploadimggaleria/${postpartidoId}/${teamId}/${playerId}`;

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

    getListGaleriaPartidos(postpartidoId: number): Observable<Response> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');

        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `match/getlistgaleriapartidos/${postpartidoId}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.get<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    createUpdateImgDniPlayer(playerId: number, cara: number, file: File): Observable<Response> {
        // Verifica si el archivo está presente
        if (file) {
            // Obtén el token almacenado en localStorage
            const token: string | null = localStorage.getItem('token');
            // Verifica si el token está presente
            if (token) {
                // Configura las cabeceras con el token para la solicitud HTTP
                const headers = new HttpHeaders({
                    'Authorization': `Bearer ${token}`
                });

                // Construye el cuerpo de la solicitud FormData
                const formData: FormData = new FormData();
                formData.append('files', file, file.name);

                // Construye la URL para la solicitud
                const url: string = environment.apiUrl + `player/subirDniPlayer/${playerId}/${cara}`;

                // Realiza la solicitud HTTP con las cabeceras y el cuerpo configurados
                return this.http.post<Response>(url, formData, { headers });
            } else {
                // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
                return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
            }
        } else {
            // Manejo de error si no se proporciona un archivo (puedes personalizar según tus necesidades)
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    updateConvocatoria(convocatoria: string, matchPreparationId: number): Observable<Response> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');
        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `match/updateconvocatoria/${matchPreparationId}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.post<Response>(url, convocatoria, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    notificateMatchPlayer(ui: NotificatePlayerUI, teamId: number): Observable<Response> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');
        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `player/notificatematchplayer/${teamId}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.post<Response>(url, ui, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    getscoutingplayerbyplayerid(playerId: number, userId: number): Observable<Response> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');
        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `player/getscoutingplayerbyplayerid/${playerId}/${userId}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.get<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    createUpdateScoutingPlayer(scoutingPlayer: ScoutingPlayer): Observable<Response> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');
        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `player/createupdatescoutingplayer`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.post<Response>(url, scoutingPlayer, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    setPublicoPrivadoScoutingPlayerByPlayerId(playerId: number, value: number, userId: number): Observable<Response> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');
        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `player/setpublicooprivadoscoutingplayer/${playerId}/${value}/${userId}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.get<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

    createUpdateImgPerfilPlayer(file: File, playerId: number, imgOld: string): Observable<Response> {
        // Verifica si el archivo está presente
        if (file) {
            // Obtén el token almacenado en localStorage
            const token: string | null = localStorage.getItem('token');
            // Verifica si el token está presente
            if (token) {
                // Configura las cabeceras con el token para la solicitud HTTP
                const headers = new HttpHeaders({
                    'Authorization': `Bearer ${token}`
                });

                // Construye el cuerpo de la solicitud FormData
                const formData: FormData = new FormData();
                formData.append('files', file, file.name);

                // Construye la URL para la solicitud
                const url: string = environment.apiUrl + `player/subirimgperfil/${playerId}/${imgOld}`;

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

    updatePlayerInfo(dto: any): Observable<Response> {
        const token = localStorage.getItem('token');

        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        });

        const url = environment.apiUrl + 'player/update-playerinfo';
        return this.http.post<Response>(url, dto, { headers });
    }

    getPlayerInfo(playerId: number): Observable<Response> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');
        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `player/getplayerinfo/${playerId}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.get<Response>(url, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
        }
    }

}
