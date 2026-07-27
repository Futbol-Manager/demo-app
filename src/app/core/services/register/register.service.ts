import { Injectable } from '@angular/core';
import { RegisterModel } from '../../models/users/register.model';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { isDemoMode } from '../demo/demo-mode';
import { DemoDataService } from '../demo/demo-data.service';
import { POLICY_VERSION } from '../../models/master/masters.enum';

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

  registerUserV2(user: RegisterModel) {
    const url: string = environment.apiUrl + 'user/createupdateuser-v2';
    return this.http.post<any>(url, user);
  }

  registerPadreHijos(data: any) {
    const url: string = environment.apiUrl + 'user/createupdateuserpadrehijos';
    return this.http.post<any>(url, data);
  }

  getClubPublicInfo(clubId: number): Observable<any> {
    if (isDemoMode()) {
      return of({ data: DemoDataService.getDemoClub(), status: 200 });
    }
    const url: string = environment.apiUrl + `club/public/${clubId}`;
    return this.http.get<any>(url);
  }

  /**
   * Equipos elegibles del club en el wizard de "Registro por club".
   * En demo devuelve los equipos ficticios mapeados a `{ teamId, name, category }`.
   */
  getPublicTeamsForRegistration(clubId: number): Observable<any> {
    if (isDemoMode()) {
      const teams = DemoDataService.getDemoTeamsByClubForCombo().map((t: any) => ({
        teamId: t.teamId,
        name: t.name,
        category: t.name,
      }));
      return of({ data: teams, status: 200 });
    }
    const url: string = environment.apiUrl + `team/public/by-club/${clubId}`;
    return this.http.get<any>(url);
  }

  validateMail(mail: string): Observable<any> {
    if (isDemoMode()) {
      return of({ data: true, status: 200 });
    }
    const url: string = environment.apiUrl + 'user/validateMail';
    return this.http.post<any>(url, { mail });
  }

  checkPlayerForDni(dni: string){
    const url: string = environment.apiUrl + `user/checkplayerfordni/${dni}`;
    return this.http.get<any>(url);
  }

  changePassByEmail(mail: String) {
    const url: string = environment.apiUrl + 'user/changePassByEmail';
    return this.http.post<any>(url, mail);
  }

  inviteCoach(mail: String, teamId: number, userId: number): Observable<any> {
    if (isDemoMode()) {
      return of({ data: true, status: 200 });
    }
    const url: string = environment.apiUrl + `user/inviteCoach/${teamId}/${userId}`;
    return this.http.post<any>(url, mail);
  }

  invitePlayer(mail: String, playerId: number, isMenor: number, teamId: number): Observable<any> {
    if (isDemoMode()) {
      return of({ data: true, status: 200 });
    }
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

  verifyAndChangePassword(userId: number, currentPassword: string, newPassword: string) {
    const body = { userId, currentPassword, newPassword };
    const url: string = environment.apiUrl + 'user/verifyAndChangePass';
    return this.http.post<any>(url, body);
  }

  validateUser(userId: number) {
    const url: string = environment.apiUrl + 'user/validateUser';
    return this.http.post<any>(url, userId);
  }

  /**
   * Actualiza (o retira) el consentimiento de comunicaciones comerciales.
   * En demo no persiste nada, sólo simula éxito.
   */
  updateCommsConsent(userId: number, accepted: boolean): Observable<any> {
    if (isDemoMode()) {
      return of({ data: true, status: 200 });
    }
    const url: string = environment.apiUrl + `user/${userId}/consents/comms`;
    return this.http.post<any>(url, {
      accepted,
      policyVersion: POLICY_VERSION,
      source: 'web',
    });
  }

  /**
   * Auto-registro de abonado (sin login). En demo devuelve el club ficticio.
   */
  searchClubsForAbonado(q: string): Observable<any> {
    if (isDemoMode()) {
      const club = DemoDataService.getDemoClub();
      return of({
        data: [{ clubId: club.clubId, name: club.name, imgPerfil: club.pictureClub }],
        status: 200,
      });
    }
    const url: string = environment.apiUrl + `auth/abonado/clubs?q=${encodeURIComponent(q)}`;
    return this.http.get<any>(url);
  }

  /**
   * Resuelve un club por id para el flujo del QR de registro de abonado.
   */
  getPublicClubById(clubId: number): Observable<any> {
    if (isDemoMode()) {
      const club = DemoDataService.getDemoClub();
      return of({
        data: { clubId: club.clubId, name: club.name, imgPerfil: club.pictureClub },
        status: 200,
      });
    }
    const url: string = environment.apiUrl + `auth/abonado/clubs/${clubId}`;
    return this.http.get<any>(url);
  }

  /**
   * Crea la cuenta de abonado. En demo no crea nada real: simula éxito con
   * un token ficticio para que el flujo de auto-login del wizard no rompa.
   */
  registerAbonado(dto: AbonadoRegisterPayload): Observable<any> {
    if (isDemoMode()) {
      return of({
        data: {
          token: 'demo-token',
          user: {
            userId: 9999,
            firstName: dto.nombre,
            secondName: dto.apellidos,
            mail: dto.email,
          },
        },
        status: 200,
      });
    }
    const url: string = environment.apiUrl + 'auth/abonado/register';
    return this.http.post<any>(url, dto);
  }
}

/**
 * Payload del POST /auth/abonado/register (coincide con AbonadoRegisterDTO).
 */
export interface AbonadoRegisterPayload {
  email: string;
  password: string;
  nombre: string;
  apellidos: string;
  dni?: string;
  telefono?: string;
  fechaNacimiento?: string;
  direccion?: string;
  genero?: string;
  clubId: number;
  language?: string;
  aceptaPrivacidad?: number;
  comunicaciones?: number;
  policyVersion?: string;
  answers?: Record<string, unknown>;
  photoTemp?: string;
}
