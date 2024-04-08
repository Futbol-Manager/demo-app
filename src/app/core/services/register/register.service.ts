import { Injectable } from '@angular/core';
import { RegisterModel } from '../../models/users/register.model';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RegisterService {

  constructor(
    private http: HttpClient,
  ) { }

  registerUser(user: RegisterModel) {
    const url: string = environment.apiUrl + 'user/createupdateuser';
    return this.http.post<any>(url, user);
  }

  validateMail(mail: String) {
    const url: string = environment.apiUrl + 'user/validateMail';
    return this.http.post<any>(url, mail);
  }

  changePassByEmail(mail: String) {
    const url: string = environment.apiUrl + 'user/changePassByEmail';
    return this.http.post<any>(url, mail);
  }

  getUserById(userId: number){
    const url: string = environment.apiUrl + `user/getUserById/${userId}`;
    return this.http.get<any>(url);
  }
}
