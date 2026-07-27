import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { isDemoMode } from '../demo/demo-mode';

/** Objetivo (primer hijo pendiente) al que dirigir la pantalla de datos. */
export interface RegisterFormTarget {
  clubId: number;
  teamId: number;
  playerId: number;
}

/** Respuesta del endpoint `GET /rest/player/register-form-status`. */
export interface RegisterFormStatus {
  needsForm: boolean;
  target: RegisterFormTarget | null;
}

/**
 * Cliente del endpoint autenticado que indica si el jugador/padre logueado
 * debe completar obligatoriamente el formulario de inscripción del club.
 * En demo nunca bloquea (needsForm=false).
 */
@Injectable({ providedIn: 'root' })
export class RegisterFormStatusService {
  private readonly baseUrl = `${environment.apiUrl}player`;

  constructor(private http: HttpClient) {}

  getStatus(): Observable<RegisterFormStatus> {
    if (isDemoMode()) {
      return of({ needsForm: false, target: null });
    }
    return this.http
      .get<{ data: RegisterFormStatus }>(`${this.baseUrl}/register-form-status`)
      .pipe(map((r) => r?.data ?? { needsForm: false, target: null }));
  }
}
