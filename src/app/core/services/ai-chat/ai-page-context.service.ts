import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ClubService } from '../club/club.service';
import { getCurrentSeasonString } from 'src/app/core/utils/season.utils';

export type PageContextType = 'estadisticas-equipos' | 'estadisticas-jugadores';

export interface PageContext {
  type: PageContextType;
  /** Tabla de datos anonimizados lista para incluir en el prompt */
  contextText: string;
  /** Mapa de código → nombre real para des-anonimizar la respuesta */
  codeToReal: Map<string, string>;
}

export interface BackgroundStatsContext {
  clubId: number;
  teamStats: { contextText: string; codeToReal: Map<string, string> } | null;
  playerStats: { contextText: string; codeToReal: Map<string, string> } | null;
  paymentStats: { contextText: string; codeToReal: Map<string, string> } | null;
}

/**
 * Gestiona el contexto de datos de estadísticas disponible para el chatbot FAB.
 *
 * - `activeContext$`: contexto específico de página (al visitar la pantalla de estadísticas).
 * - `backgroundStats$`: estadísticas precargadas al hacer login con un club.
 *   El FAB las usa automáticamente cuando no hay contexto de página activo.
 */
@Injectable({ providedIn: 'root' })
export class AiPageContextService {

  private readonly activeContext$ = new BehaviorSubject<PageContext | null>(null);
  private readonly backgroundStats$ = new BehaviorSubject<BackgroundStatsContext | null>(null);

  /** Evita recargar si ya están los datos del mismo club en esta sesión */
  private loadedForClubId: number | null = null;

  constructor(private clubService: ClubService) {}

  // ─── Contexto de página (al navegar a estadísticas) ──────────────────────

  setContext(context: PageContext): void {
    this.activeContext$.next(context);
  }

  clearContext(): void {
    this.activeContext$.next(null);
  }

  getContext(): Observable<PageContext | null> {
    return this.activeContext$.asObservable();
  }

  getContextSnapshot(): PageContext | null {
    return this.activeContext$.getValue();
  }

  // ─── Estadísticas de fondo (cargadas al login) ───────────────────────────

  /**
   * Carga en segundo plano las estadísticas de equipos y jugadores del club.
   * Solo realiza la llamada una vez por clubId en la sesión activa.
   */
  preloadForClub(clubId: number): void {
    if (!clubId || this.loadedForClubId === clubId) return;

    const temporada = getCurrentSeasonString();

    forkJoin({
      teams:   this.clubService.getListTeamsOfClubByStadistics(clubId).pipe(catchError(() => of(null))),
      players: this.clubService.getListPlayersOfClubByStadistics(clubId).pipe(catchError(() => of(null))),
      payments: this.clubService.getListPlayersPagosClub(clubId, temporada).pipe(catchError(() => of(null))),
    }).subscribe(({ teams, players, payments }) => {
      const teamStats = teams?.data && Array.isArray(teams.data)
        ? this.buildTeamContext(teams.data)
        : null;

      const playerStats = players?.data && Array.isArray(players.data.listDto)
        ? this.buildPlayerContext(players.data.listDto)
        : null;

      const paymentStats = payments?.data && Array.isArray(payments.data)
        ? this.buildPaymentContext(payments.data)
        : null;

      this.backgroundStats$.next({ clubId, teamStats, playerStats, paymentStats });
      this.loadedForClubId = clubId;
    });
  }

  /** Fuerza una recarga (p.ej. al cambiar de temporada) */
  invalidateClubCache(): void {
    this.loadedForClubId = null;
    this.backgroundStats$.next(null);
  }

  getBackgroundStats(): Observable<BackgroundStatsContext | null> {
    return this.backgroundStats$.asObservable();
  }

  getBackgroundStatsSnapshot(): BackgroundStatsContext | null {
    return this.backgroundStats$.getValue();
  }

  // ─── Construcción de contexto anonimizado ────────────────────────────────

  private buildTeamContext(teamsData: any[]): { contextText: string; codeToReal: Map<string, string> } {
    const codeToReal = new Map<string, string>();
    const lines = ['Código | Partidos | Victorias | Empates | Derrotas | GF | GC | DG | Puntos'];

    teamsData
      .filter(t => t.nameTeam && !t.nameTeam.includes('Sin equipo'))
      .forEach((team, i) => {
        let vic = 0, emp = 0, der = 0, gf = 0, gc = 0, pun = 0;
        for (const partido of (team.partidos || [])) {
          if (partido.resultado === 'V') { vic++; pun += 3; }
          else if (partido.resultado === 'E') { emp++; pun++; }
          else if (partido.resultado === 'D') { der++; }
          gf += partido.golesAFavor || 0;
          gc += partido.golesEnContra || 0;
        }
        const code = `EQUIPO_STAT_${i + 1}`;
        codeToReal.set(code, team.nameTeam);
        lines.push(`${code} | ${team.partidos?.length || 0} | ${vic} | ${emp} | ${der} | ${gf} | ${gc} | ${gf - gc} | ${pun}`);
      });

    return { contextText: lines.join('\n'), codeToReal };
  }

  private buildPlayerContext(playersData: any[]): { contextText: string; codeToReal: Map<string, string> } {
    const codeToReal = new Map<string, string>();
    const lines = ['Código | Posición | Partidos | Goles | Asistencias | Min.Totales | T.Amarillas | T.Rojas'];

    // Máximo 100 jugadores para no sobrecargar el contexto
    playersData.slice(0, 100).forEach((p, i) => {
      const code = `JUGADOR_STAT_${i + 1}`;
      codeToReal.set(code, p.nombre || `Jugador ${i + 1}`);
      lines.push(
        `${code} | ${p.posicion || '-'} | ${p.partidosJugados || 0} | ` +
        `${p.goles || 0} | ${p.asistencias || 0} | ${p.minTotales || 0} | ` +
        `${p.tarAmarilla || 0} | ${p.tarRojas || 0}`
      );
    });

    return { contextText: lines.join('\n'), codeToReal };
  }

  private buildPaymentContext(playersData: any[]): { contextText: string; codeToReal: Map<string, string> } {
    const codeToReal = new Map<string, string>();
    const lines = ['Código | Equipo | Total a pagar (€) | Pagado (€) | Pendiente (€) | Estado'];

    // Deduplicar por playerId (la API puede devolver duplicados)
    const unique: any[] = Array.from(
      new Map(playersData.map((p: any) => [p.playerId, p])).values()
    );

    // Anonimizar también los nombres de equipo
    const teamCodeMap = new Map<string, string>();
    let teamCounter = 0;
    const getTeamCode = (teamName: string): string => {
      if (!teamName) return '-';
      if (!teamCodeMap.has(teamName)) {
        teamCounter++;
        const code = `EQUIPO_PAG_${teamCounter}`;
        teamCodeMap.set(teamName, code);
        codeToReal.set(code, teamName);
      }
      return teamCodeMap.get(teamName)!;
    };

    unique.slice(0, 150).forEach((p, i) => {
      const code = `PAGADOR_${i + 1}`;
      const fullName = `${p.nombre || ''} ${p.apellido || ''}`.trim() || `Jugador ${i + 1}`;
      codeToReal.set(code, fullName);

      const totalAPagar = parseFloat(p.totalAPagar) || 0;
      const totalPagado = parseFloat(p.totalPagado) || 0;
      const pendiente   = Math.max(0, totalAPagar - totalPagado);
      const estado      = pendiente <= 0.01 ? 'Al día' : 'Pendiente';
      const equipoCodigo = getTeamCode(p.nameTeam);

      lines.push(
        `${code} | ${equipoCodigo} | ${totalAPagar.toFixed(2)} | ` +
        `${totalPagado.toFixed(2)} | ${pendiente.toFixed(2)} | ${estado}`
      );
    });

    return { contextText: lines.join('\n'), codeToReal };
  }
}
