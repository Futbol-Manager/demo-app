import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from 'src/environments/environment';
import { isDemoMode } from '../demo/demo-mode';

/** Los seis horarios fijos del día que gestiona el fisio (formato "HH:mm"). */
export interface ActivityTimes {
  citaCt: string | null;
  citaPlayers: string | null;
  video: string | null;
  charla: string | null;
  strength: string | null;
  fieldWork: string | null;
}

/** Una actividad del día (entrenamiento o partido) con sus horarios fijos. */
export interface ActivitySchedule {
  activityType: 'TRAINING' | 'MATCH';
  activityId: number;
  title: string;
  startTime: string | null;
  times: ActivityTimes;
}

/** Respuesta del endpoint listar-por-equipo-y-fecha. */
export interface ActivityScheduleBundle {
  teamId: number;
  clubId: number;
  date: string;
  activities: ActivitySchedule[];
}

/**
 * Cliente Angular para los "Horarios del día" del fisio. Versión demo-app: en
 * modo demo devuelve actividades ficticias inline y simula el upsert de horarios.
 */
@Injectable({ providedIn: 'root' })
export class ActivityScheduleService {

  private readonly baseUrl = `${environment.apiUrl}activity-schedule`;

  constructor(private http: HttpClient) {}

  getByTeamAndDate(teamId: number, dateIsoYmd: string): Observable<ActivityScheduleBundle> {
    if (isDemoMode()) {
      return of({
        teamId,
        clubId: 61,
        date: dateIsoYmd,
        activities: [
          {
            activityType: 'TRAINING',
            activityId: 5001,
            title: 'Entrenamiento',
            startTime: '18:30',
            times: {
              citaCt: '17:00', citaPlayers: '18:00', video: '18:10',
              charla: '18:20', strength: '18:30', fieldWork: '19:00',
            },
          },
        ],
      });
    }
    return this.http
      .get<any>(`${this.baseUrl}/team/${teamId}/date/${dateIsoYmd}`)
      .pipe(map(resp => this.normalize(resp?.data ?? resp)));
  }

  updateTimes(
    activityType: 'TRAINING' | 'MATCH',
    activityId: number,
    body: Partial<ActivityTimes>
  ): Observable<ActivityTimes> {
    if (isDemoMode()) {
      return of(this.normalizeTimes(body));
    }
    return this.http
      .put<any>(`${this.baseUrl}/activity/${activityType}/${activityId}`, body)
      .pipe(map(resp => this.normalizeTimes(resp?.data ?? resp)));
  }

  private normalize(raw: any): ActivityScheduleBundle {
    return {
      teamId: raw?.teamId ?? 0,
      clubId: raw?.clubId ?? 0,
      date: raw?.date ?? '',
      activities: Array.isArray(raw?.activities)
        ? raw.activities.map((a: any) => ({
            activityType: a?.activityType,
            activityId: a?.activityId ?? 0,
            title: a?.title ?? '',
            startTime: a?.startTime ?? null,
            times: this.normalizeTimes(a?.times)
          }))
        : []
    };
  }

  private normalizeTimes(raw: any): ActivityTimes {
    return {
      citaCt: raw?.citaCt ?? null,
      citaPlayers: raw?.citaPlayers ?? null,
      video: raw?.video ?? null,
      charla: raw?.charla ?? null,
      strength: raw?.strength ?? null,
      fieldWork: raw?.fieldWork ?? null
    };
  }
}
