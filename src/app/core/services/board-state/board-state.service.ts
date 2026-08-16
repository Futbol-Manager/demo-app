import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { isDemoMode } from '../demo/demo-mode';

export interface BoardStateData {
  id?: number;
  boardData: string;
  sport?: string;
  fecUpdate?: string;
  /** true si el estado devuelto es la pizarra oficial compartida del equipo. */
  shared?: boolean;
  /** true si existe una pizarra oficial compartida para esta tarea. */
  hasShared?: boolean;
}

/**
 * Servicio para guardar y recuperar el estado de pizarra táctica personal por coach.
 * Cada entrenador tiene su propia copia editable del tablero para cualquier tarea
 * (nube o propia) sin afectar a otros coaches ni a la tarea original.
 *
 * taskType: 'cloud' → tarea del catálogo (tasks_shop)
 *           'own'   → tarea propia del coach (coach_tasks)
 */
@Injectable({ providedIn: 'root' })
export class BoardStateService {
  private readonly api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene el estado de pizarra del coach para una tarea.
   * Devuelve null si el coach no tiene estado guardado (404) o si hay error.
   */
  getBoardState(userId: number, taskId: number, taskType: 'cloud' | 'own' | 'session'): Observable<BoardStateData | null> {
    if (isDemoMode()) {
      return of(null);
    }
    const url = `${this.api}training/board-state/${userId}?taskId=${taskId}&taskType=${taskType}`;
    return this.http.get<any>(url).pipe(
      map(res => {
        if (res?.status === 200 && res?.data?.boardData) {
          return res.data as BoardStateData;
        }
        return null;
      }),
      catchError(() => of(null))
    );
  }

  /**
   * Guarda o actualiza el estado de pizarra del coach para una tarea.
   * Devuelve true si el guardado fue exitoso.
   */
  saveBoardState(
    userId: number,
    taskId: number,
    taskType: 'cloud' | 'own' | 'session',
    boardData: string,
    shared: boolean = false
  ): Observable<boolean> {
    if (isDemoMode()) {
      return of(true);
    }
    const url = `${this.api}training/board-state/${userId}`;
    const body = { taskId, taskType, boardData, shared };
    return this.http.put<any>(url, body).pipe(
      map(res => res?.status === 200),
      catchError(() => of(false))
    );
  }

  /**
   * Comprueba si el coach tiene un estado guardado para una tarea
   * sin necesidad de cargar los datos completos del tablero.
   */
  hasBoardState(userId: number, taskId: number, taskType: 'cloud' | 'own' | 'session'): Observable<boolean> {
    return this.getBoardState(userId, taskId, taskType).pipe(
      map(data => data !== null)
    );
  }
}
