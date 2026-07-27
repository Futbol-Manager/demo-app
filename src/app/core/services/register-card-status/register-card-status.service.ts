import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { isDemoMode } from '../demo/demo-mode';

/** Objetivo (primer hijo pendiente) al que dirigir la pantalla de tarjeta. */
export interface RegistroCardTarget {
  clubId: number;
  teamId: number;
  playerId: number;
}

/** Respuesta del endpoint `GET /rest/player/registro-card-status`. */
export interface RegistroCardStatus {
  needsCard: boolean;
  target: RegistroCardTarget | null;
}

/**
 * Cliente del endpoint autenticado que indica si el jugador/padre logueado
 * debe guardar obligatoriamente una tarjeta tras el registro. En demo nunca
 * bloquea (needsCard=false).
 */
@Injectable({ providedIn: 'root' })
export class RegisterCardStatusService {
  private readonly baseUrl = `${environment.apiUrl}player`;

  constructor(private http: HttpClient) {}

  getStatus(): Observable<RegistroCardStatus> {
    if (isDemoMode()) {
      return of({ needsCard: false, target: null });
    }
    return this.http
      .get<{ data: RegistroCardStatus }>(`${this.baseUrl}/registro-card-status`)
      .pipe(map((r) => r?.data ?? { needsCard: false, target: null }));
  }
}
