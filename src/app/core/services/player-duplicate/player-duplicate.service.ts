import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

import { environment } from 'src/environments/environment';
import { isDemoMode } from '../demo/demo-mode';

export interface DuplicatePlayer {
  playerId: number;
  nombre: string | null;
  apellido: string | null;
  dni: string | null;
  fechaDeNacimiento: string | null;
  fechaCreacion: string | null;
  verify: number | null;
  teamNames: string[] | null;
  countTeams: number;
  countPagos: number;
  countAsistencias: number;
  countGoals: number;
  countTutores: number;
}

export interface DuplicateGroup {
  playerA: DuplicatePlayer;
  playerB: DuplicatePlayer;
  reasons: Array<'DNI' | 'NAME' | 'NAME_BIRTH'>;
}

export interface DuplicateApiResponse<T> {
  data: T;
  status: number;
  error: { code: number; msg: string };
}

/**
 * Servicio Angular para detectar y resolver jugadores duplicados a nivel
 * club. Versión demo-app: en modo demo devuelve grupos ficticios inline y
 * simula merge/ignore con éxito, recordando en sesión los pares resueltos.
 */
@Injectable({ providedIn: 'root' })
export class PlayerDuplicateService {

  private readonly base = environment.apiUrl + 'player-duplicate';

  /**
   * Memoria en sesión del mock: pares ya resueltos (merged o ignored).
   * Se almacena como "minId-maxId" para que (A,B) y (B,A) colisionen.
   */
  private mockResolvedPairs = new Set<string>();

  constructor(private http: HttpClient) {}

  private useMock(): boolean {
    return isDemoMode() || !!(environment as any).useDuplicatesMock;
  }

  list(clubId: number): Observable<DuplicateApiResponse<DuplicateGroup[]>> {
    if (this.useMock()) {
      return of(this.buildMockResponse()).pipe(delay(400));
    }
    return this.http.get<DuplicateApiResponse<DuplicateGroup[]>>(`${this.base}/club/${clubId}`);
  }

  merge(payload: {
    clubId: number;
    userId: number;
    playerIdKeep: number;
    playerIdDiscard: number;
  }): Observable<DuplicateApiResponse<boolean>> {
    if (this.useMock()) {
      this.mockResolvedPairs.add(this.mockPairKey(payload.playerIdKeep, payload.playerIdDiscard));
      return of({ data: true, status: 200, error: { code: 0, msg: 'MOCK_MERGE_OK' } }).pipe(delay(600));
    }
    return this.http.post<DuplicateApiResponse<boolean>>(`${this.base}/merge`, payload);
  }

  ignore(payload: {
    clubId: number;
    userId: number;
    playerId1: number;
    playerId2: number;
    reason?: string;
  }): Observable<DuplicateApiResponse<boolean>> {
    if (this.useMock()) {
      this.mockResolvedPairs.add(this.mockPairKey(payload.playerId1, payload.playerId2));
      return of({ data: true, status: 200, error: { code: 0, msg: 'MOCK_IGNORE_OK' } }).pipe(delay(400));
    }
    return this.http.post<DuplicateApiResponse<boolean>>(`${this.base}/ignore`, payload);
  }

  private mockPairKey(a: number, b: number): string {
    return a < b ? `${a}-${b}` : `${b}-${a}`;
  }

  /** Datos ficticios inline para previsualizar el banner + modal en modo demo. */
  private buildMockResponse(): DuplicateApiResponse<DuplicateGroup[]> {
    const mk = (
      playerId: number,
      nombre: string,
      apellido: string,
      dni: string | null,
      fecha: string | null,
      teams: string[],
      counts: Partial<DuplicatePlayer> = {},
    ): DuplicatePlayer => ({
      playerId,
      nombre,
      apellido,
      dni,
      fechaDeNacimiento: fecha,
      fechaCreacion: '2025-09-12',
      verify: 1,
      teamNames: teams,
      countTeams: teams.length,
      countPagos: 0,
      countAsistencias: 0,
      countGoals: 0,
      countTutores: 0,
      ...counts,
    });

    const groups: DuplicateGroup[] = [
      {
        playerA: mk(19751, 'Adrian', 'Perez Blanco', '59065500M', '2017-10-15', ['Alevín A'],
          { countPagos: 6, countAsistencias: 22, countGoals: 4, countTutores: 2 }),
        playerB: mk(99751, 'ADRIAN', 'PEREZ BLANCO', '59065500M', '2017-10-15', ['Alevín B'],
          { countPagos: 1, countAsistencias: 3,  countGoals: 0, countTutores: 1 }),
        reasons: ['DNI', 'NAME_BIRTH'],
      },
      {
        playerA: mk(19750, 'Samuel', 'Lopez Fuentes', '18128943K', '2018-06-11', ['Benjamín A'],
          { countPagos: 8, countAsistencias: 28, countGoals: 9, countTutores: 2 }),
        playerB: mk(99750, 'Samuel', 'López Fuentes', '18128943K', '2018-06-11', ['Benjamín A'],
          { countPagos: 0, countAsistencias: 0,  countGoals: 0, countTutores: 0 }),
        reasons: ['DNI', 'NAME_BIRTH'],
      },
      {
        playerA: mk(19749, 'Clemente', 'Garcia Soler', '57192386B', '2017-02-28', ['Alevín A'],
          { countPagos: 9, countAsistencias: 30, countGoals: 11, countTutores: 2 }),
        playerB: mk(99749, 'Clemente', 'García', null, '2017-02-28', [],
          { countPagos: 0, countAsistencias: 1,  countGoals: 0, countTutores: 0 }),
        reasons: ['NAME_BIRTH'],
      },
      {
        playerA: mk(19748, 'Rodrigo', 'Sanchez Moya', '16255829G', '2018-09-07', ['Benjamín B'],
          { countPagos: 5, countAsistencias: 17, countGoals: 3, countTutores: 1 }),
        playerB: mk(99748, 'Rodrigo', 'Sánchez Moya', '16255829G', '2018-09-07', ['Benjamín B'],
          { countPagos: 2, countAsistencias: 6,  countGoals: 1, countTutores: 1 }),
        reasons: ['DNI', 'NAME_BIRTH'],
      },
    ];

    const filtered = groups.filter(g => !this.mockResolvedPairs.has(
      this.mockPairKey(g.playerA.playerId, g.playerB.playerId),
    ));

    return { data: filtered, status: 200, error: { code: 0, msg: 'MOCK_OK' } };
  }
}
