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

  inviteCoach(mail: String, teamId: number) {
    const url: string = environment.apiUrl + `user/inviteCoach/${teamId}`;
    return this.http.post<any>(url, mail);
  }

  invitePlayer(mail: String, playerId: number, isMenor: number, teamId: number) {
    const url: string = environment.apiUrl + `user/invitePlayer/${playerId}/${isMenor}/${teamId}`;
    return this.http.post<any>(url, mail);
  }

  deleteCoach(teamId: number, userId: number) {
    const url: string = environment.apiUrl + `user/deleteCoach/${teamId}/${userId}`;
    return this.http.delete<any>(url);
  }

  getUserById(userId: number){
    const url: string = environment.apiUrl + `user/getuserbyid/${userId}`;
    return this.http.get<any>(url);
  }

  updatePassUser(userId: number, pass: String) {
    const body = {
			userId: userId,
			password: pass,
		};
    const url: string = environment.apiUrl + 'user/updatePassUser';
    return this.http.post<any>(url, body);
  }

  validateUser(userId: number) {
    const url: string = environment.apiUrl + 'user/validateUser';
    return this.http.post<any>(url, userId);
  }
}
