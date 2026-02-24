import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ClubService } from '../club/club.service';
import { getCurrentSeasonString } from 'src/app/core/utils/season.utils';

export interface CoachTeamContext {
  teamId: number;
  matchStats: string;
  classification: string;
}

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
  private readonly coachTeamContext$ = new BehaviorSubject<CoachTeamContext | null>(null);

  /** Evita recargar si ya están los datos del mismo club en esta sesión */
  private loadedForClubId: number | null = null;
  /** Evita recargar si ya están los datos del mismo equipo de coach */
  private loadedForTeamId: number | null = null;

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

  // ─── Contexto específico del equipo coach (partidos + clasificación) ─────

  /**
   * Carga en segundo plano los partidos de todos los tipos y la clasificación
   * para el equipo del coach. Solo realiza la llamada una vez por teamId.
   */
  preloadForCoachTeam(teamId: number): void {
    if (!teamId || this.loadedForTeamId === teamId) return;

    const tipos = ['Liga', 'Copa', 'Amistoso', 'Torneo'];
    const matchRequests: { [key: string]: Observable<any> } = {};
    tipos.forEach(tipo => {
      matchRequests[tipo] = this.clubService.getMatchesByTeamAndType(teamId, tipo).pipe(catchError(() => of(null)));
    });

    forkJoin({
      ...matchRequests,
      clasificacion: this.clubService.getTodo(teamId, 'current').pipe(catchError(() => of(null))),
    }).subscribe((results: any) => {
      const allMatches: any[] = [];
      tipos.forEach(tipo => {
        const res = results[tipo];
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          res.data.forEach((m: any) => allMatches.push({ ...m, _tipoPartido: tipo }));
        }
      });

      const matchStats = this.buildCoachMatchContext(allMatches);
      const classification = this.buildCoachClassificationContext(results['clasificacion']);

      this.coachTeamContext$.next({ teamId, matchStats, classification });
      this.loadedForTeamId = teamId;
    });
  }

  invalidateCoachTeamCache(): void {
    this.loadedForTeamId = null;
    this.coachTeamContext$.next(null);
  }

  getCoachTeamContext(): Observable<CoachTeamContext | null> {
    return this.coachTeamContext$.asObservable();
  }

  getCoachTeamContextSnapshot(): CoachTeamContext | null {
    return this.coachTeamContext$.getValue();
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

  private buildCoachMatchContext(matches: any[]): string {
    if (!matches || matches.length === 0) return '';

    // Agrupar por tipo
    const byTipo: { [tipo: string]: any[] } = {};
    matches.forEach(m => {
      const mp = m.matchPreparation;
      const tipo = mp?.tipoPartido || m._tipoPartido || 'Otro';
      if (!byTipo[tipo]) byTipo[tipo] = [];
      byTipo[tipo].push(m);
    });

    let totalPlayed = 0, totalWins = 0, totalDraws = 0, totalLosses = 0;
    let totalGf = 0, totalGc = 0;
    const formaGlobal: string[] = [];
    const lines: string[] = [];

    for (const tipo of ['Liga', 'Copa', 'Amistoso', 'Torneo', 'Otro']) {
      const tipoMatches = byTipo[tipo];
      if (!tipoMatches || tipoMatches.length === 0) continue;

      let wins = 0, draws = 0, losses = 0, gf = 0, gc = 0;
      const matchLines: string[] = [];

      tipoMatches.forEach(m => {
        const mp = m.matchPreparation;
        const result: string = m.resultado || '';
        const rival = mp?.rivalName || '?';
        const date = mp?.matchDate || '?';
        const terreno = mp?.terreno || '?';
        const matchGf: number = m.golesAFavor || 0;
        const matchGc: number = m.golesEnContra || 0;

        if (result === 'V') wins++;
        else if (result === 'E') draws++;
        else if (result === 'D') losses++;
        gf += matchGf;
        gc += matchGc;
        formaGlobal.push(result || '?');

        const resultLabel = result === 'V' ? 'Victoria' : result === 'E' ? 'Empate' : result === 'D' ? 'Derrota' : result;
        matchLines.push(`  ${date} | vs ${rival} (${terreno}) | ${matchGf}-${matchGc} | ${resultLabel}`);
      });

      totalPlayed += tipoMatches.length;
      totalWins += wins;
      totalDraws += draws;
      totalLosses += losses;
      totalGf += gf;
      totalGc += gc;

      const pts = wins * 3 + draws;
      lines.push(`[${tipo}] ${tipoMatches.length}PJ | ${wins}V ${draws}E ${losses}D | ${gf}:${gc} | ${pts}pts`);
      matchLines.forEach(l => lines.push(l));
    }

    const dg = totalGf - totalGc;
    const dgStr = dg >= 0 ? `+${dg}` : `${dg}`;
    const totalPts = totalWins * 3 + totalDraws;
    const forma = formaGlobal.slice(-5).join(' ');

    const header = `TOTAL: ${totalPlayed}PJ | ${totalWins}V ${totalDraws}E ${totalLosses}D | ${totalGf}:${totalGc} (DG ${dgStr}) | ${totalPts}pts\nÚltima forma (5 últimos): ${forma}`;
    return header + '\n\n' + lines.join('\n');
  }

  private buildCoachClassificationContext(response: any): string {
    if (!response?.data) return '';
    const data = response.data;
    const clasificacion = data.clasificacion;
    if (!Array.isArray(clasificacion) || clasificacion.length === 0) return '';

    const competicion: string = data.competicion || '';
    const grupo: string = data.grupo || '';
    const jornada: string = data.jornada || '';

    const rows: string[] = [];
    if (competicion) {
      rows.push(`Competición: ${competicion}${grupo ? ` (${grupo})` : ''} — Jornada ${jornada}`);
    }
    rows.push('Pos | Equipo | Pts | PJ | PG | PE | PP | GF | GC');
    clasificacion.slice(0, 20).forEach((r: any) => {
      rows.push(`${r.posicion || '-'} | ${r.nombre || '-'} | ${r.puntos || '-'} | ${r.jugados || '-'} | ${r.ganados || '-'} | ${r.empatados || '-'} | ${r.perdidos || '-'} | ${r.golesAFavor || '-'} | ${r.golesEnContra || '-'}`);
    });

    return rows.join('\n');
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
