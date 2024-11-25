import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Response } from 'src/app/core/services/models/response.model';
import { ClubCuotas, HostoryPagosPlayer, PlayerCuotas, RopaClub, RopaJugador } from '../team/club.model';
import { Abonado, AbonadoPagoHistorico, Patrocinador } from '../models/club.model';

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

  //************** PARA LOS ABONADOS *********************/

  getListAbonadosTemporadaByClub(clubId: number): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `club/getlistabonadostemporada/${clubId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getListPagosAbonadoHistorico(abonadosTemporadaId: number): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `club/getlistpagosabonadohistorico/${abonadosTemporadaId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  // Método para crear o actualizar un equipo
  createUpdateAbonado(abonado: Abonado, clubId: number, cuota: number, abonadosTemporadaId: number): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `club/createupdateabonado/${clubId}/${cuota}/${abonadosTemporadaId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.post<Response>(url, abonado, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  // Método para crear o actualizar un equipo
  createPagoAbonado(abonadoPagoHist: AbonadoPagoHistorico, cuota: number, pagado: number): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `club/createpagoabonado/${cuota}/${pagado}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.post<Response>(url, abonadoPagoHist, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  // Método para crear o actualizar un equipo
  insertReembolsoAbonadoPagoHistorico(abonadoPagoHist: AbonadoPagoHistorico): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `club/insertreembolsoabonado`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.post<Response>(url, abonadoPagoHist, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
          'Authorization': `Bearer ${token}`
        });

        // Construye el cuerpo de la solicitud FormData
        const formData: FormData = new FormData();
        formData.append('files', file, file.name);

        // Construye la URL para la solicitud
        const url: string = environment.apiUrl + `club/subirimgabonado/${abonadoId}`;

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

  subirImgPatrocinador(patrocinadorId: number, file: File): Observable<Response> {
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
        const url: string = environment.apiUrl + `club/subirimgpatrocinador/${patrocinadorId}`;

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
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `club/getlistpatrocinadoresbyclub/${clubId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  // Método para crear o actualizar un equipo
  createUpdatePatrocinador(patrocinador: Patrocinador): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `club/createpatrocinador`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.post<Response>(url, patrocinador, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  deletePatrocinadorById(patrocinadorId: number): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `club/deletepatrocinadorbyid/${patrocinadorId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  avtivePatrocinadorById(patrocinadorId: number, value: number): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `club/avtivepatrocinadorbyid/${patrocinadorId}/${value}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getListPatrocinadoresByUser(userId: number, profileId: number): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `club/getlistpatrocinadoresbyuser/${userId}/${profileId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  //************** PARA LOS CORREOS *********************/

  getListCorreos(userId: number): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `club/getlistcorreosbyuser/${userId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

}
