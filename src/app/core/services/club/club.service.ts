import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Response } from 'src/app/core/services/models/response.model';
import { ClubCuotas, HostoryPagosPlayer, PlayerCuotas, RopaClub, RopaJugador } from '../team/club.model';

@Injectable({
  providedIn: 'root'
})
export class ClubService {

  constructor(
    private http: HttpClient,
  ) { }

  filterClub(filter: string) {
    const url: string = environment.apiUrl + 'user/filterClub';
    return this.http.post<any>(url, filter);
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
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `team/getAllClubsRegistered`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getRopaJugadoresByClubForTemp(clubId: string, temporada: string): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `club/getropajugadoresbyclub/${clubId}/${temporada}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  // Método para crear o actualizar un equipo
  updateRopaJugadorByPk(ropaJugador: RopaJugador): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `club/updateropajugador`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.post<Response>(url, ropaJugador, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
    }

  }

  getRopaClub(clubId: string, temp: string): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `club/getropaclub/${clubId}/${temp}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  // Método para crear o actualizar un equipo
  updateRopaClub(ropaClub: RopaClub): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `club/updateropaclub`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.post<Response>(url, ropaClub, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getClubCuota(clubId: string, temp: string): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `club/getclubcuotas/${clubId}/${temp}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  
  getClubCuotaForLoadTeam(clubId: number, temp: string, teamId: number): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `club/getclubcuotas/${clubId}/${temp}/${teamId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  // Método para crear o actualizar un equipo
  updateclubCuotas(clubCuota: ClubCuotas, option: number, value: number): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `club/updateclubcuotas/${option}/${value}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.post<Response>(url, clubCuota, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getHistoryPagosPlayer(clubId: number, playerId: number, temporada: string): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `club/gethistorypagosplayer/${clubId}/${playerId}/${temporada}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getPlayerCuota(clubId: number, playerId: number, temporada: string): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `club/getplayercuota/${clubId}/${playerId}/${temporada}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  updatePlayerCuotas(playerCuota: PlayerCuotas, clubId: number): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `club/updateplayercuotas/${clubId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.post<Response>(url, playerCuota, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  updatehistorypagosplayer(historyPagos: HostoryPagosPlayer): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `club/updatehistorypagosplayer`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.post<Response>(url, historyPagos, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  devolverHistoryPagosPlayer(historyPagos: HostoryPagosPlayer): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `club/devolverhistorypagosplayer`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.post<Response>(url, historyPagos, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  uploadExcel(clubId: number, file: File): Observable<Response> {
    const token: string | null = localStorage.getItem('token');
    if (token) {
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      const formData: FormData = new FormData();
      formData.append('file', file, file.name);

      const url: string = environment.apiUrl + `club/uploadExcel/${clubId}`;
      return this.http.post<Response>(url, formData, { headers });
    } else {
      return new Observable();
    }
  }

  getListJugadoresByClubForTemp(clubId: number, temporada: string): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `club/getlistplayeroftheclubfortemp/${clubId}/${temporada}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getListPlayersOfClubByStadistics(clubId: number): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `club/getlistplayersofclubbystadistics/${clubId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getListTeamsOfClubByStadistics(clubId: number): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `club/getlistteamsofclubbystadistics/${clubId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

}
