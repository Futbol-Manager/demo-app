import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from 'src/environments/environment';
import { isDemoMode } from '../demo/demo-mode';

/**
 * Resumen de un jugador devuelto por el endpoint del diario médico.
 */
export interface MedicalDiaryPlayer {
  playerId: number;
  nombre: string | null;
  apellido: string | null;
  fullName: string | null;
  numero: string | null;
  posicion: string | null;
  posicionDos: string | null;
  picturePlayer: string | null;
  otherTeams?: string[] | null;
  injuryPhase?: number | null;
  guest?: boolean | null;
}

/**
 * Estado médico/fisio del jugador en una fecha.
 */
export interface MedicalDiaryStatus {
  dailyStatusId?: number;
  playerId: number;
  teamId: number;
  clubId: number;
  statusTagCode?: string | null;
  statusTagLabel?: string | null;
  statusColor?: string | null;
  attendedPhysio?: boolean | null;
  treatmentZone?: string | null;
  treatmentTechnique?: string | null;
  treatmentDurationMin?: number | null;
  treatmentObservations?: string | null;
  generalObservations?: string | null;
  forecastTagCode?: string | null;
  forecastTagLabel?: string | null;
  forecastText?: string | null;
  registeredByUserId?: number | null;
  registeredByName?: string | null;
  updatedAt?: string | null;
}

/**
 * Un tratamiento concreto aplicado a un jugador en una fecha.
 */
export interface MedicalDiaryTreatment {
  treatmentId?: number;
  zone?: string | null;
  code?: string | null;
  label?: string | null;
  observations?: string | null;
}

export interface MedicalDiaryEntry {
  player: MedicalDiaryPlayer;
  status: MedicalDiaryStatus | null;
  treatments?: MedicalDiaryTreatment[] | null;
  workDone?: string | null;
}

/** Siguiente sesión del equipo (para la columna de Previsión). */
export interface NextSessionInfo {
  date: string;
  isMatchDay: boolean;
}

export interface MedicalDiaryPayload {
  teamId: number;
  clubId: number;
  date: string;
  isMatchDay: boolean;
  nextSession: NextSessionInfo | null;
  totalPlayers: number;
  playersAttended: number;
  entries: MedicalDiaryEntry[];
}

/**
 * Cliente Angular para el endpoint dedicado del Modo Profesional
 * {@code /rest/medical-diary/...}.
 *
 * <p>En modo demo devuelve una tabla de diario médico ficticia plausible.</p>
 */
@Injectable({ providedIn: 'root' })
export class MedicalDiaryService {

  private readonly baseUrl = `${environment.apiUrl}medical-diary`;

  constructor(private http: HttpClient) {}

  getTeamDiary(teamId: number, dateIsoYmd: string, userId?: number): Observable<MedicalDiaryPayload> {
    if (isDemoMode()) {
      return of(this.demoDiary(teamId, dateIsoYmd));
    }
    const qp = userId ? `?userId=${userId}` : '';
    return this.http
      .get<any>(`${this.baseUrl}/team/${teamId}/date/${dateIsoYmd}${qp}`)
      .pipe(map(resp => resp?.data ?? resp));
  }

  savePlayerOrder(teamId: number, userId: number, playerIds: number[]): Observable<boolean> {
    if (isDemoMode()) return of(true);
    return this.http
      .put<any>(`${this.baseUrl}/team/${teamId}/order`, { userId, playerIds })
      .pipe(map(resp => !!(resp?.data ?? resp)));
  }

  upsertPlayerDiary(
    playerId: number,
    dateIsoYmd: string,
    body: Partial<MedicalDiaryStatus>
  ): Observable<MedicalDiaryStatus> {
    if (isDemoMode()) {
      return of({ playerId, teamId: 9001, clubId: 9001, ...body, updatedAt: new Date().toISOString() } as MedicalDiaryStatus);
    }
    return this.http
      .put<any>(`${this.baseUrl}/player/${playerId}/date/${dateIsoYmd}`, body)
      .pipe(map(resp => resp?.data ?? resp));
  }

  saveTreatments(
    playerId: number,
    dateIsoYmd: string,
    body: { teamId: number; clubId: number; treatments: MedicalDiaryTreatment[] }
  ): Observable<MedicalDiaryTreatment[]> {
    if (isDemoMode()) {
      return of((body.treatments || []).map((t, i) => ({ treatmentId: Date.now() + i, ...t })));
    }
    return this.http
      .put<any>(`${this.baseUrl}/player/${playerId}/date/${dateIsoYmd}/treatments`, body)
      .pipe(map(resp => resp?.data ?? resp ?? []));
  }

  addGuest(teamId: number, playerId: number, userId?: number): Observable<boolean> {
    if (isDemoMode()) return of(true);
    return this.http
      .post<any>(`${this.baseUrl}/team/${teamId}/guest`, { playerId, userId })
      .pipe(map(resp => !!(resp?.data ?? resp)));
  }

  removeGuest(teamId: number, playerId: number): Observable<boolean> {
    if (isDemoMode()) return of(true);
    return this.http
      .delete<any>(`${this.baseUrl}/team/${teamId}/guest/${playerId}`)
      .pipe(map(resp => !!(resp?.data ?? resp)));
  }

  exportPdf(teamId: number, dateIsoYmd: string, teamName?: string): Observable<Blob> {
    if (isDemoMode()) {
      return of(new Blob(['Informe diario demo'], { type: 'application/pdf' }));
    }
    const qp = teamName ? `?teamName=${encodeURIComponent(teamName)}` : '';
    return this.http.get(
      `${this.baseUrl}/team/${teamId}/date/${dateIsoYmd}/pdf${qp}`,
      { responseType: 'blob' }
    );
  }

  // ─── DEMO ──────────────────────────────────────────────────────────
  private demoPlayer(playerId: number, nombre: string, apellido: string, numero: string, posicion: string, injuryPhase = 0): MedicalDiaryPlayer {
    return {
      playerId,
      nombre,
      apellido,
      fullName: `${nombre} ${apellido}`,
      numero,
      posicion,
      posicionDos: null,
      picturePlayer: 'demo-player-' + (1 + (playerId % 4)) + '.jpg',
      otherTeams: null,
      injuryPhase,
      guest: false
    };
  }

  private status(playerId: number, code: string, label: string, color: string, attended: boolean, zone?: string, technique?: string, obs?: string, general?: string, forecast?: string): MedicalDiaryStatus {
    return {
      dailyStatusId: playerId,
      playerId,
      teamId: 9001,
      clubId: 9001,
      statusTagCode: code,
      statusTagLabel: label,
      statusColor: color,
      attendedPhysio: attended,
      treatmentZone: zone ?? null,
      treatmentTechnique: technique ?? null,
      treatmentDurationMin: attended ? 20 : null,
      treatmentObservations: obs ?? null,
      generalObservations: general ?? null,
      forecastTagCode: null,
      forecastTagLabel: null,
      forecastText: forecast ?? null,
      registeredByUserId: 1,
      registeredByName: 'Staff médico',
      updatedAt: new Date().toISOString()
    };
  }

  private demoDiary(teamId: number, dateIsoYmd: string): MedicalDiaryPayload {
    const next = new Date(dateIsoYmd);
    next.setDate(next.getDate() + 2);
    const nextIso = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;

    const entries: MedicalDiaryEntry[] = [
      {
        player: this.demoPlayer(8001, 'Carlos', 'García', '1', 'Portero', 2),
        status: this.status(8001, 'DC', 'Duda competitiva', '#f59e0b', true, 'Tobillo', 'Crioterapia + vendaje', 'Buena evolución', 'Molestia leve al apoyar', 'Probable para el fin de semana'),
        treatments: [{ treatmentId: 1, zone: 'Tobillo', code: 'CRIO', label: 'Crioterapia', observations: '10 min' }],
        workDone: null
      },
      {
        player: this.demoPlayer(8005, 'Pablo', 'Sánchez', '5', 'Defensa', 3),
        status: this.status(8005, 'RD', 'Readaptación', '#0891b2', true, 'Isquiotibial', 'Trabajo excéntrico', 'Progresando bien', 'Sin dolor', 'Reincorporación gradual'),
        treatments: [{ treatmentId: 2, zone: 'Isquiotibial', code: 'ECC', label: 'Excéntricos', observations: '3x10' }],
        workDone: 'CARRERA_CONTINUA,CAMBIOS_DIRECCION'
      },
      {
        player: this.demoPlayer(8009, 'Diego', 'Fernández', '9', 'Delantero', 0),
        status: this.status(8009, 'DT', 'Disponible total', '#31b270', false, undefined, undefined, undefined, 'Sin incidencias'),
        treatments: [],
        workDone: null
      },
      {
        player: this.demoPlayer(8003, 'Antonio', 'Ruiz', '3', 'Defensa', 0),
        status: this.status(8003, 'DT', 'Disponible total', '#31b270', false),
        treatments: [],
        workDone: null
      },
      {
        player: this.demoPlayer(8014, 'Iván', 'Moreno', '14', 'Delantero', 1),
        status: this.status(8014, 'L', 'Lesionado', '#b1231b', true, 'Muslo', 'Electroterapia', 'Fase inicial', 'Dolor moderado', 'Baja 2-3 semanas'),
        treatments: [{ treatmentId: 3, zone: 'Muslo', code: 'ELECTRO', label: 'Electroterapia', observations: 'TENS 15 min' }],
        workDone: null
      },
      {
        player: this.demoPlayer(8006, 'Javier', 'Pérez', '6', 'Lateral', 0),
        status: null,
        treatments: [],
        workDone: null
      }
    ];

    const attended = entries.filter(e => e.status?.attendedPhysio).length;
    return {
      teamId,
      clubId: 9001,
      date: dateIsoYmd,
      isMatchDay: false,
      nextSession: { date: nextIso, isMatchDay: true },
      totalPlayers: entries.length,
      playersAttended: attended,
      entries
    };
  }
}
