import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

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

  getAllClubes() {
    const url: string = environment.apiUrl + 'user/getAllClubes';
    return this.http.get<any>(url);
  }

}
