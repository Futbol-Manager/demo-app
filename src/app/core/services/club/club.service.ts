import { HttpClient } from '@angular/common/http';
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

}
