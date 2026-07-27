import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Response } from 'src/app/core/services/models/response.model';
import { isDemoMode } from '../demo/demo-mode';

/**
 * Tarea de entrenamiento propia del club ("Tareas del club"). Mismos campos
 * ricos que las tareas de la nube, con scope por club: la ven todos los
 * entrenadores del club.
 */
export interface ClubTask {
  clubTaskId?: number;
  clubId?: number;
  title?: string;
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
  extraFields?: string;
  sport?: string;
  createUser?: number;
  fecCreate?: string;
}

@Injectable({ providedIn: 'root' })
export class ClubTaskService {

  constructor(private http: HttpClient) {}

  private headers(): HttpHeaders {
    const token: string = localStorage.getItem('token') ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private base(clubId: number): string {
    return `${environment.apiUrl}club/${clubId}/training-tasks`;
  }

  /** Tareas del club de ejemplo para modo demo. */
  private demoTasks(clubId: number): ClubTask[] {
    return [
      {
        clubTaskId: 501, clubId: clubId || 1, title: 'Rondo 4v2 progresivo',
        description: 'Rondo de posesión con dos comodines para trabajar la circulación rápida del balón.',
        rules: 'Máximo dos toques. Al perder el balón, rota el jugador que falló.',
        variants: 'Reducir a un toque · Añadir un tercer defensor',
        worktime: '15 min', space: 'Cuadrado de 12x12 m', material: '6 conos, 2 balones',
        work: 'Técnico-táctico', sport: 'futbol', createUser: 1, fecCreate: '2026-01-10',
      },
      {
        clubTaskId: 502, clubId: clubId || 1, title: 'Salida de balón 3+2 vs 3',
        description: 'Trabajo de construcción desde defensa superando la primera línea de presión.',
        rules: 'La jugada acaba al superar la línea de mediocampo con control.',
        variants: 'Añadir portero · Limitar el tiempo de posesión',
        worktime: '20 min', space: 'Medio campo', material: '10 petos, 8 balones, porterías',
        work: 'Táctico', sport: 'futbol', createUser: 1, fecCreate: '2026-01-12',
      },
      {
        clubTaskId: 503, clubId: clubId || 1, title: 'Finalización tras centro',
        description: 'Serie de centros desde banda con remate de delanteros en área.',
        rules: 'Alternar banda derecha e izquierda. Rotación de rematadores.',
        variants: 'Con oposición pasiva · Centro raso vs bombeado',
        worktime: '18 min', space: 'Zona de ataque', material: '12 balones, conos, porterías',
        work: 'Técnico', sport: 'futbol', createUser: 1, fecCreate: '2026-01-15',
      },
    ];
  }

  list(clubId: number): Observable<Response> {
    if (isDemoMode()) {
      return of(new Response({ data: this.demoTasks(clubId), status: 200 }));
    }
    return this.http.get<Response>(this.base(clubId), { headers: this.headers() });
  }

  create(clubId: number, task: ClubTask): Observable<Response> {
    if (isDemoMode()) {
      return of(new Response({ data: { ...task, clubTaskId: Date.now(), clubId }, status: 200 }));
    }
    return this.http.post<Response>(this.base(clubId), task, { headers: this.headers() });
  }

  update(clubId: number, clubTaskId: number, task: ClubTask): Observable<Response> {
    if (isDemoMode()) {
      return of(new Response({ data: { ...task, clubTaskId, clubId }, status: 200 }));
    }
    return this.http.put<Response>(`${this.base(clubId)}/${clubTaskId}`, task, { headers: this.headers() });
  }

  remove(clubId: number, clubTaskId: number): Observable<Response> {
    if (isDemoMode()) {
      return of(new Response({ data: { clubTaskId }, status: 200 }));
    }
    return this.http.delete<Response>(`${this.base(clubId)}/${clubTaskId}`, { headers: this.headers() });
  }

  /** Base pública donde se sirven las imágenes de tarea (gif/imagen). */
  get imageBaseUrl(): string {
    return `${environment.images}task-board/`;
  }

  /** Sube una imagen o GIF a la tarea; el backend guarda el nombre en imagenBoard. */
  uploadImage(clubId: number, clubTaskId: number, file: File): Observable<Response> {
    if (!file) {
      return throwError(() => 'Archivo no proporcionado');
    }
    if (isDemoMode()) {
      return of(new Response({ data: { imagenBoard: 'demo-task-board.png' }, status: 200 }));
    }
    const formData = new FormData();
    formData.append('files', file, file.name);
    return this.http.post<Response>(
      `${this.base(clubId)}/${clubTaskId}/image`, formData, { headers: this.headers() });
  }

  /** Sube un fichero de vídeo a la tarea; el backend guarda su URL pública en video. */
  uploadVideo(clubId: number, clubTaskId: number, file: File): Observable<Response> {
    if (!file) {
      return throwError(() => 'Archivo no proporcionado');
    }
    if (isDemoMode()) {
      return of(new Response({ data: { video: 'https://demo.sphairatech.com/video/demo.mp4' }, status: 200 }));
    }
    const formData = new FormData();
    formData.append('files', file, file.name);
    return this.http.post<Response>(
      `${this.base(clubId)}/${clubTaskId}/video`, formData, { headers: this.headers() });
  }
}
