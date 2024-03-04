import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from "rxjs";

import { LoginModel } from '../../models/users/login.model';
import { LoginResponse } from '../../models/users/login-response.model';


@Injectable({
  providedIn: 'root'
})
export class LoginService {

  constructor(
    private http: HttpClient,
  ) { }

  login(login: LoginModel): Observable<LoginResponse> {
    const url:string = 'auth/login';
    return this.http.post<LoginResponse>(url, login);
  }

}
