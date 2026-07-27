import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Response } from 'src/app/core/services/models/response.model';
import { isDemoMode } from '../demo/demo-mode';

/**
 * Metodología del club (Fase 2): contenedor por temporada que agrupa tareas
 * (de la nube o del club) y equipos del club.
 */
export interface Methodology {
  methodologyId?: number;
  clubId?: number;
  temporada?: string;
  name?: string;
  description?: string;
  createdByUserId?: number;
  taskCount?: number;
  teamCount?: number;
}

/** Tarea asignada a una metodología, con los datos de la tarea ya resueltos. */
export interface MethodologyTask {
  methodologyTaskId?: number;
  methodologyId?: number;
  sourceType?: 'SHOP' | 'CLUB';
  sourceTaskId?: number;
  sortOrder?: number;
  title?: string;
  description?: string;
  work?: string;
  worktime?: string;
  space?: string;
  material?: string;
  rules?: string;
  variants?: string;
  slogans?: string;
  video?: string;
  imagenBoard?: string;
  missing?: boolean;
}

/** Equipo asignado a una metodología. */
export interface MethodologyTeam {
  methodologyTeamId?: number;
  teamId?: number;
  teamName?: string;
}

/** Entrenamiento de una metodología (envuelve una training_session real). */
export interface MethodologyTraining {
  trainingSessionId?: number;
  methodologyId?: number;
  teamId?: number;
  teamName?: string;
  daySession?: string;       // yyyy-MM-dd
  objectiveSession?: string;
  warmUp?: string;
  addressSession?: string;
  startTime?: string;
  endTime?: string;
  visible?: number;
  infoVisible?: number;
  taskCount?: number;
}

/** Tarea (snapshot) de un entrenamiento. */
export interface TrainingTask {
  taskId?: number;
  description?: string;
  rules?: string;
  variants?: string;
  slogans?: string;
  worktime?: string;
  space?: string;
  material?: string;
  work?: string;
  video?: string;
  imagenBoard?: string;
  estrategia?: string;
  intencion?: string;
  tasksShopId?: number;
}

@Injectable({ providedIn: 'root' })
export class MethodologyService {

  constructor(private http: HttpClient) {}

  private headers(): HttpHeaders {
    const token: string = localStorage.getItem('token') ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private base(clubId: number): string {
    return `${environment.apiUrl}club/${clubId}/methodologies`;
  }

  // ── Datos mock para modo demo ────────────────────────────────────────────
  private demoMethodologies(clubId: number, temporada: string): Methodology[] {
    return [
      {
        methodologyId: 301, clubId: clubId || 1, temporada,
        name: 'Modelo de juego posicional',
        description: 'Metodología basada en la posesión, la ocupación de espacios y la salida limpia de balón.',
        createdByUserId: 1, taskCount: 3, teamCount: 2,
      },
      {
        methodologyId: 302, clubId: clubId || 1, temporada,
        name: 'Presión tras pérdida',
        description: 'Trabajo de intensidad defensiva, transiciones rápidas y recuperación en campo contrario.',
        createdByUserId: 1, taskCount: 2, teamCount: 1,
      },
    ];
  }

  private demoMethodologyTasks(methodologyId: number): MethodologyTask[] {
    return [
      {
        methodologyTaskId: methodologyId * 10 + 1, methodologyId, sourceType: 'SHOP', sourceTaskId: 9001, sortOrder: 0,
        title: 'Rondo 4v2 progresivo', description: 'Circulación rápida con dos comodines.',
        work: 'Técnico-táctico', worktime: '15 min', space: '12x12 m', material: '6 conos, 2 balones',
        rules: 'Dos toques máximo.', variants: 'Un toque', missing: false,
      },
      {
        methodologyTaskId: methodologyId * 10 + 2, methodologyId, sourceType: 'CLUB', sourceTaskId: 501, sortOrder: 1,
        title: 'Salida de balón 3+2 vs 3', description: 'Construcción superando la primera línea.',
        work: 'Táctico', worktime: '20 min', space: 'Medio campo', material: '10 petos, 8 balones',
        rules: 'Superar la línea de mediocampo con control.', variants: 'Con portero', missing: false,
      },
      {
        methodologyTaskId: methodologyId * 10 + 3, methodologyId, sourceType: 'SHOP', sourceTaskId: 9002, sortOrder: 2,
        title: 'Finalización tras centro', description: 'Series de centros con remate.',
        work: 'Técnico', worktime: '18 min', space: 'Zona de ataque', material: '12 balones',
        rules: 'Alternar bandas.', variants: 'Oposición pasiva', missing: false,
      },
    ];
  }

  private demoMethodologyTeams(): MethodologyTeam[] {
    return [
      { methodologyTeamId: 1, teamId: 11, teamName: 'Primer Equipo' },
      { methodologyTeamId: 2, teamId: 12, teamName: 'Juvenil A' },
    ];
  }

  private demoTrainings(methodologyId: number, teamId?: number): MethodologyTraining[] {
    const items: MethodologyTraining[] = [
      {
        trainingSessionId: methodologyId * 100 + 1, methodologyId, teamId: teamId ?? 11, teamName: 'Primer Equipo',
        daySession: new Date().toISOString().slice(0, 10), objectiveSession: 'Posesión y ocupación de espacios',
        warmUp: 'Movilidad + rondo', addressSession: 'Campo 1', startTime: '18:00', endTime: '19:45',
        visible: 1, infoVisible: 1, taskCount: 3,
      },
      {
        trainingSessionId: methodologyId * 100 + 2, methodologyId, teamId: teamId ?? 11, teamName: 'Primer Equipo',
        daySession: new Date(Date.now() + 172800000).toISOString().slice(0, 10), objectiveSession: 'Transiciones defensivas',
        warmUp: 'Activación + coordinación', addressSession: 'Campo 1', startTime: '18:00', endTime: '19:30',
        visible: 1, infoVisible: 1, taskCount: 2,
      },
    ];
    return teamId ? items.filter(t => t.teamId === teamId) : items;
  }

  private demoTrainingTasks(): TrainingTask[] {
    return [
      {
        taskId: 7001, description: 'Rondo de activación', rules: 'Dos toques', variants: 'Un toque',
        worktime: '10 min', space: '10x10 m', material: '4 conos, 1 balón', work: 'Técnico', tasksShopId: 9001,
      },
      {
        taskId: 7002, description: 'Juego de posición 8v8', rules: 'Salida bajo presión', variants: 'Comodines',
        worktime: '25 min', space: 'Medio campo', material: 'Petos, balones', work: 'Táctico', tasksShopId: 9003,
      },
    ];
  }

  list(clubId: number, temporada: string): Observable<Response> {
    if (isDemoMode()) {
      return of(new Response({ data: this.demoMethodologies(clubId, temporada), status: 200 }));
    }
    const url = `${this.base(clubId)}?temporada=${encodeURIComponent(temporada)}`;
    return this.http.get<Response>(url, { headers: this.headers() });
  }

  create(clubId: number, temporada: string, body: Methodology): Observable<Response> {
    if (isDemoMode()) {
      return of(new Response({ data: { ...body, methodologyId: Date.now(), clubId, temporada, taskCount: 0, teamCount: 0 }, status: 200 }));
    }
    const url = `${this.base(clubId)}?temporada=${encodeURIComponent(temporada)}`;
    return this.http.post<Response>(url, body, { headers: this.headers() });
  }

  update(clubId: number, methodologyId: number, body: Methodology): Observable<Response> {
    if (isDemoMode()) {
      return of(new Response({ data: { ...body, methodologyId, clubId }, status: 200 }));
    }
    return this.http.put<Response>(`${this.base(clubId)}/${methodologyId}`, body, { headers: this.headers() });
  }

  remove(clubId: number, methodologyId: number): Observable<Response> {
    if (isDemoMode()) {
      return of(new Response({ data: { methodologyId }, status: 200 }));
    }
    return this.http.delete<Response>(`${this.base(clubId)}/${methodologyId}`, { headers: this.headers() });
  }

  /** Clona una metodología (nombre + descripción + tareas) a la temporada destino. */
  cloneToSeason(clubId: number, methodologyId: number, targetTemporada: string): Observable<Response> {
    if (isDemoMode()) {
      return of(new Response({ data: { methodologyId: Date.now(), clonedFrom: methodologyId, temporada: targetTemporada }, status: 200 }));
    }
    const url = `${this.base(clubId)}/${methodologyId}/clone?temporada=${encodeURIComponent(targetTemporada)}`;
    return this.http.post<Response>(url, {}, { headers: this.headers() });
  }

  // --- Tareas ---
  listTasks(clubId: number, methodologyId: number): Observable<Response> {
    if (isDemoMode()) {
      return of(new Response({ data: this.demoMethodologyTasks(methodologyId), status: 200 }));
    }
    return this.http.get<Response>(`${this.base(clubId)}/${methodologyId}/tasks`, { headers: this.headers() });
  }

  addTask(clubId: number, methodologyId: number, sourceType: 'SHOP' | 'CLUB', sourceTaskId: number): Observable<Response> {
    if (isDemoMode()) {
      return of(new Response({ data: { methodologyTaskId: Date.now(), methodologyId, sourceType, sourceTaskId }, status: 200 }));
    }
    return this.http.post<Response>(
      `${this.base(clubId)}/${methodologyId}/tasks`,
      { sourceType, sourceTaskId },
      { headers: this.headers() },
    );
  }

  removeTask(clubId: number, methodologyId: number, methodologyTaskId: number): Observable<Response> {
    if (isDemoMode()) {
      return of(new Response({ data: { methodologyTaskId }, status: 200 }));
    }
    return this.http.delete<Response>(
      `${this.base(clubId)}/${methodologyId}/tasks/${methodologyTaskId}`,
      { headers: this.headers() },
    );
  }

  // --- Equipos ---
  listTeams(clubId: number, methodologyId: number): Observable<Response> {
    if (isDemoMode()) {
      return of(new Response({ data: this.demoMethodologyTeams(), status: 200 }));
    }
    return this.http.get<Response>(`${this.base(clubId)}/${methodologyId}/teams`, { headers: this.headers() });
  }

  setTeams(clubId: number, methodologyId: number, teamIds: number[]): Observable<Response> {
    if (isDemoMode()) {
      return of(new Response({ data: { methodologyId, teamIds }, status: 200 }));
    }
    return this.http.put<Response>(
      `${this.base(clubId)}/${methodologyId}/teams`,
      { teamIds },
      { headers: this.headers() },
    );
  }

  // --- Entrenamientos (Fase 3) ---
  private trainingsBase(clubId: number, methodologyId: number): string {
    return `${this.base(clubId)}/${methodologyId}/trainings`;
  }

  listTrainings(clubId: number, methodologyId: number, teamId?: number): Observable<Response> {
    if (isDemoMode()) {
      return of(new Response({ data: this.demoTrainings(methodologyId, teamId), status: 200 }));
    }
    const q = teamId ? `?teamId=${teamId}` : '';
    return this.http.get<Response>(`${this.trainingsBase(clubId, methodologyId)}${q}`, { headers: this.headers() });
  }

  createTraining(clubId: number, methodologyId: number, body: MethodologyTraining): Observable<Response> {
    if (isDemoMode()) {
      return of(new Response({ data: { ...body, trainingSessionId: Date.now(), methodologyId, taskCount: 0 }, status: 200 }));
    }
    return this.http.post<Response>(this.trainingsBase(clubId, methodologyId), body, { headers: this.headers() });
  }

  updateTraining(clubId: number, methodologyId: number, trainingSessionId: number, body: MethodologyTraining): Observable<Response> {
    if (isDemoMode()) {
      return of(new Response({ data: { ...body, trainingSessionId, methodologyId }, status: 200 }));
    }
    return this.http.put<Response>(
      `${this.trainingsBase(clubId, methodologyId)}/${trainingSessionId}`, body, { headers: this.headers() });
  }

  removeTraining(clubId: number, methodologyId: number, trainingSessionId: number): Observable<Response> {
    if (isDemoMode()) {
      return of(new Response({ data: { trainingSessionId }, status: 200 }));
    }
    return this.http.delete<Response>(
      `${this.trainingsBase(clubId, methodologyId)}/${trainingSessionId}`, { headers: this.headers() });
  }

  listTrainingTasks(clubId: number, methodologyId: number, trainingSessionId: number): Observable<Response> {
    if (isDemoMode()) {
      return of(new Response({ data: this.demoTrainingTasks(), status: 200 }));
    }
    return this.http.get<Response>(
      `${this.trainingsBase(clubId, methodologyId)}/${trainingSessionId}/tasks`, { headers: this.headers() });
  }

  addTrainingTask(clubId: number, methodologyId: number, trainingSessionId: number,
    sourceType: 'SHOP' | 'CLUB', sourceTaskId: number): Observable<Response> {
    if (isDemoMode()) {
      return of(new Response({ data: { taskId: Date.now(), trainingSessionId, sourceType, sourceTaskId }, status: 200 }));
    }
    return this.http.post<Response>(
      `${this.trainingsBase(clubId, methodologyId)}/${trainingSessionId}/tasks`,
      { sourceType, sourceTaskId }, { headers: this.headers() });
  }

  removeTrainingTask(clubId: number, methodologyId: number, trainingSessionId: number, taskId: number): Observable<Response> {
    if (isDemoMode()) {
      return of(new Response({ data: { taskId }, status: 200 }));
    }
    return this.http.delete<Response>(
      `${this.trainingsBase(clubId, methodologyId)}/${trainingSessionId}/tasks/${taskId}`, { headers: this.headers() });
  }
}
