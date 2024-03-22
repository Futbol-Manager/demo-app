import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Response } from 'src/app/core/services/models/response.model';

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

}
