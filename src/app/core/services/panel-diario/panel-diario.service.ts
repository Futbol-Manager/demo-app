import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { isDemoMode } from '../demo/demo-mode';

export interface PanelDiarioMicrocycleDay {
  microcycleDayId: number;
  dayType: 'training' | 'rest' | 'match' | string;
  mdLabel: string | null;
  trainingSessionId: number | null;
  notes: string | null;
}

export interface PanelDiarioMicrocycle {
  present: boolean;
  microcycleId?: number;
  name?: string;
  startDate?: string | null;
  endDate?: string | null;
  matchDate?: string | null;
  day?: PanelDiarioMicrocycleDay;
}

export interface PanelDiarioMatch {
  present: boolean;
  matchPreparationId?: number;
  rivalName?: string;
  terreno?: string;
  isHome?: boolean | null;
  lugar?: string;
  hora?: string;
  minutos?: string;
  tipoPartido?: string;
}

export interface PanelDiarioAvailabilityBucket {
  code: string;
  label: string | null;
  color: string | null;
  count: number;
}

export interface PanelDiarioAvailability {
  totalRegistered: number;
  byCode: PanelDiarioAvailabilityBucket[];
}

export interface PanelDiarioMedicalDiaryEntry {
  playerId: number;
  statusCode?: string;
  statusLabel?: string;
  treatmentZone?: string;
  treatmentTechnique?: string;
  treatmentDurationMin?: number | null;
  treatmentObservations?: string;
  generalObservations?: string;
  forecastTagCode?: string;
  forecastTagLabel?: string;
}

export interface PanelDiarioMedicalDiary {
  playersAttended: number;
  entries: PanelDiarioMedicalDiaryEntry[];
}

export interface PanelDiarioInjuryEntry {
  injuryId: number;
  playerId: number;
  playerName: string;
  zone: string | null;
  zoneLabel: string | null;
  type: string | null;
  severity: string | null;
  status: string | null;
  dateInjury: string | null;
  dateReturn: string | null;
  rtpPhase: number;
  rtpCategory: string | null;
}

export interface PanelDiarioInjuries {
  totalActive: number;
  entries: PanelDiarioInjuryEntry[];
}

export interface PanelDiarioRpe {
  submitted: number;
  averageRpe: number | null;
  averageDuration: number | null;
  averageLoad: number | null;
}

export interface PanelDiarioWellness {
  totalResponses: number;
  red: number;
  yellow: number;
  green: number;
}

export interface PanelDiarioMedicalAgendaEntry {
  appointmentId: number;
  appointmentDate: string | null;
  startTime: string | null;
  durationMin: number | null;
  kind: string | null;
  subject: string | null;
  playerId: number | null;
  professionalName: string | null;
  status: string | null;
}

export interface PanelDiarioMedicalAgenda {
  totalUpcoming: number;
  entries: PanelDiarioMedicalAgendaEntry[];
}

export interface PanelDiarioPayload {
  teamId: number;
  clubId: number;
  date: string;
  teamName: string;
  microcycle: PanelDiarioMicrocycle;
  match: PanelDiarioMatch;
  availability: PanelDiarioAvailability;
  medicalDiary: PanelDiarioMedicalDiary;
  injuries: PanelDiarioInjuries;
  rpe: PanelDiarioRpe;
  wellness?: PanelDiarioWellness;
  medicalAgenda?: PanelDiarioMedicalAgenda;
}

/**
 * Cliente del endpoint agregador "Panel diario". Versión demo-app: en modo
 * demo devuelve un payload completo y plausible inline para un equipo.
 */
@Injectable({ providedIn: 'root' })
export class PanelDiarioService {

  private readonly baseUrl = `${environment.apiUrl}panel`;

  constructor(private http: HttpClient) {}

  getPanelForDate(teamId: number, dateIsoYmd: string): Observable<PanelDiarioPayload> {
    if (isDemoMode()) return of(this.mockPayload(teamId, dateIsoYmd));
    return this.http
      .get<any>(`${this.baseUrl}/team/${teamId}/date/${dateIsoYmd}`)
      .pipe(map(resp => resp?.data ?? resp));
  }

  private mockPayload(teamId: number, date: string): PanelDiarioPayload {
    return {
      teamId,
      clubId: 61,
      date,
      teamName: 'Alevín A',
      microcycle: {
        present: true,
        microcycleId: 3001,
        name: 'Microciclo semana 12',
        startDate: '2026-05-11',
        endDate: '2026-05-17',
        matchDate: '2026-05-17',
        day: {
          microcycleDayId: 42,
          dayType: 'training',
          mdLabel: 'MD-2',
          trainingSessionId: 7001,
          notes: 'Trabajo de fuerza + situaciones de ataque.',
        },
      },
      match: {
        present: true,
        matchPreparationId: 8001,
        rivalName: 'CD Ejemplo',
        terreno: 'Césped artificial',
        isHome: true,
        lugar: 'Campo Municipal',
        hora: '12',
        minutos: '00',
        tipoPartido: 'Liga',
      },
      availability: {
        totalRegistered: 18,
        byCode: [
          { code: 'AVAILABLE', label: 'Disponibles', color: '#31b270', count: 14 },
          { code: 'DOUBT', label: 'Duda', color: '#f0ad4e', count: 2 },
          { code: 'OUT', label: 'Baja', color: '#d9534f', count: 2 },
        ],
      },
      medicalDiary: {
        playersAttended: 3,
        entries: [
          { playerId: 2001, statusCode: 'TREATMENT', statusLabel: 'En tratamiento', treatmentZone: 'Tobillo', treatmentTechnique: 'Crioterapia', treatmentDurationMin: 20, treatmentObservations: 'Evolución favorable', forecastTagCode: 'DOUBT', forecastTagLabel: 'Duda' },
          { playerId: 2002, statusCode: 'PREVENTION', statusLabel: 'Prevención', treatmentZone: 'Isquios', treatmentTechnique: 'Estiramientos', treatmentDurationMin: 15, forecastTagCode: 'OK', forecastTagLabel: 'Disponible' },
        ],
      },
      injuries: {
        totalActive: 2,
        entries: [
          { injuryId: 4001, playerId: 2003, playerName: 'Diego Romero', zone: 'ANKLE', zoneLabel: 'Tobillo', type: 'Esguince', severity: 'Leve', status: 'ACTIVE', dateInjury: '2026-05-02', dateReturn: '2026-05-20', rtpPhase: 3, rtpCategory: 'Reintegro' },
          { injuryId: 4002, playerId: 2004, playerName: 'Mateo Vidal', zone: 'HAMSTRING', zoneLabel: 'Isquiotibial', type: 'Sobrecarga', severity: 'Leve', status: 'ACTIVE', dateInjury: '2026-05-08', dateReturn: null, rtpPhase: 1, rtpCategory: 'Reposo' },
        ],
      },
      rpe: { submitted: 15, averageRpe: 6.4, averageDuration: 75, averageLoad: 480 },
      wellness: { totalResponses: 16, red: 1, yellow: 4, green: 11 },
      medicalAgenda: {
        totalUpcoming: 2,
        entries: [
          { appointmentId: 9001, appointmentDate: date, startTime: '17:00', durationMin: 30, kind: 'Fisioterapia', subject: 'Revisión tobillo', playerId: 2003, professionalName: 'Fisio Demo', status: 'SCHEDULED' },
          { appointmentId: 9002, appointmentDate: date, startTime: '17:45', durationMin: 20, kind: 'Prevención', subject: 'Isquios', playerId: 2002, professionalName: 'Fisio Demo', status: 'SCHEDULED' },
        ],
      },
    };
  }
}
