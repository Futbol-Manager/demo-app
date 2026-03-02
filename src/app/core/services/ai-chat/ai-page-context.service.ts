import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, forkJoin, of } from 'rxjs';
import { catchError, switchMap, map } from 'rxjs/operators';
import { ClubService } from '../club/club.service';
import { VideoStorageService } from '../video-storage/video-storage.service';
import { getCurrentSeasonString } from 'src/app/core/utils/season.utils';
import { environment } from 'src/environments/environment';

export interface CoachTeamContext {
  teamId: number;
  matchStats: string;
  classification: string;
  playerStats: string;
  injuryStats: string;
  upcomingMatches: string;
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
  upcomingStats: string | null;
  rosterStats:   { contextText: string; codeToReal: Map<string, string> } | null;
  teamStats:     { contextText: string; codeToReal: Map<string, string> } | null;
  playerStats:   { contextText: string; codeToReal: Map<string, string> } | null;
  paymentStats:  { contextText: string; codeToReal: Map<string, string> } | null;
  documentStats: { contextText: string; codeToReal: Map<string, string> } | null;
  ropaStats:     { contextText: string; codeToReal: Map<string, string> } | null;
  notifStats:    { contextText: string; codeToReal: Map<string, string> } | null;
  mediaStats:    { contextText: string; codeToReal: Map<string, string> } | null;
  scoutingStats: { contextText: string; codeToReal: Map<string, string> } | null;
  staffStats:    { contextText: string; codeToReal: Map<string, string> } | null;
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

  /** Mensajes pendientes de sincronizar desde el FAB al asistente-ia de pantalla completa. */
  private fabSyncMessages: { messages: any[]; conversationId: string | null } | null = null;

  /** Evita recargar si ya están los datos del mismo club en esta sesión */
  private loadedForClubId: number | null = null;
  private loadedForClubAt: number | null = null;
  /** Evita recargar si ya están los datos del mismo equipo de coach */
  private loadedForTeamId: number | null = null;
  private loadedForTeamAt: number | null = null;

  /** TTL en milisegundos para la caché de contexto (30 minutos) */
  private readonly CACHE_TTL_MS = 30 * 60 * 1000;

  private readonly PERMISSION_LABELS: { [key: string]: string } = {
    DASHBOARD_PLAYERS:    'Estadísticas jugadores',
    DASHBOARD_COACHES:    'Estadísticas entrenadores',
    DASHBOARD_STATS_PLR:  'Estadísticas avanzadas jugadores',
    DASHBOARD_STATS_TEAM: 'Estadísticas de equipos',
    DASHBOARD_CALENDAR:   'Calendario',
    DASHBOARD_INJURIES:   'Lesiones',
    TEAMS:                'Equipos',
    DOCUMENTS:            'Documentos',
    PAYMENTS:             'Pagos',
    CLOTHING:             'Equipación',
    SPONSORS:             'Patrocinadores',
    NOTIFICATIONS:        'Notificaciones',
    VIDEO_LIBRARY:        'Biblioteca de vídeo',
    SCOUTING:             'Scouting',
    AI_ASSISTANT:         'Asistente IA',
    VIDEO_ANALYSIS:       'Análisis de vídeo',
    ERP:                  'Gestión financiera (ERP)',
  };

  constructor(
    private clubService: ClubService,
    private videoStorageService: VideoStorageService,
    private http: HttpClient,
  ) {}

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
   * Carga en segundo plano las estadísticas del club para el chatbot IA.
   * Acepta userId opcional para cargar también el historial de notificaciones.
   * Solo realiza la llamada una vez por clubId en la sesión activa.
   */
  preloadForClub(clubId: number, userId?: number): void {
    const now = Date.now();
    const cacheHit = this.loadedForClubId === clubId
      && this.loadedForClubAt !== null
      && (now - this.loadedForClubAt) < this.CACHE_TTL_MS;
    if (!clubId || cacheHit) return;

    const temporada = getCurrentSeasonString();
    const effectiveUserId = userId || Number(localStorage.getItem('userIdClub')) || 0;

    forkJoin({
      roster:    this.clubService.getListJugadoresByClubForTemp(clubId, temporada).pipe(catchError(() => of(null))),
      teams:     this.clubService.getListTeamsOfClubByStadistics(clubId).pipe(catchError(() => of(null))),
      players:   this.clubService.getListPlayersOfClubByStadistics(clubId).pipe(catchError(() => of(null))),
      payments:  this.clubService.getListPlayersPagosClub(clubId, temporada).pipe(catchError(() => of(null))),
      docs:      this.clubService.getlistDocumentosByClub(clubId).pipe(catchError(() => of(null))),
      docsCoach: this.clubService.getlistDocumentosEntrenadoresByClub(clubId).pipe(catchError(() => of(null))),
      ropa:      this.clubService.getRopaJugadoresByClubForTemp(String(clubId), temporada).pipe(catchError(() => of(null))),
      notifs:    effectiveUserId > 0
                   ? this.clubService.getListCorreos(effectiveUserId).pipe(catchError(() => of(null)))
                   : of(null),
      media:     this.videoStorageService.listVideos(clubId).pipe(catchError(() => of(null))),
      scouting:  this.http.get<any>(
                   environment.apiUrl + `scouting/club/${clubId}/watchlist`,
                   { headers: this.getAuthHeaders() }
                 ).pipe(catchError(() => of(null))),
      staff:     this.http.get<any>(
                   environment.apiUrl + `club/staff/list/${clubId}`,
                   { headers: this.getAuthHeaders() }
                 ).pipe(catchError(() => of(null))),
    }).pipe(
      switchMap(phase1 => {
        // Extract team IDs from roster to load upcoming matches per team
        const rosterTeams: any[] = phase1.roster?.data?.teams || [];
        const teamIds: number[] = rosterTeams
          .filter((t: any) => t.teamId)
          .map((t: any) => t.teamId as number);

        if (teamIds.length === 0) {
          return of({ ...phase1, upcomingByTeam: null });
        }

        const upcomingRequests: { [key: string]: Observable<any> } = {};
        teamIds.forEach(id => {
          upcomingRequests[`team_${id}`] = this.http.get<any>(
            environment.apiUrl + `match/listmatchpreparationsbyteam/${id}`,
            { headers: this.getAuthHeaders() }
          ).pipe(catchError(() => of(null)));
        });

        return forkJoin(upcomingRequests).pipe(
          map(upcomingByTeam => ({ ...phase1, upcomingByTeam }))
        );
      })
    ).subscribe(({ roster, teams, players, payments, docs, docsCoach, ropa, notifs, media, scouting, staff, upcomingByTeam }) => {
      const rosterStats = roster?.data?.teams && Array.isArray(roster.data.teams)
        ? this.buildRosterContext(roster.data.teams)
        : null;

      const upcomingStats = upcomingByTeam
        ? this.buildUpcomingMatchesContext(upcomingByTeam, roster?.data?.teams || [])
        : null;

      const teamStats = teams?.data && Array.isArray(teams.data)
        ? this.buildTeamContext(teams.data)
        : null;

      const playerStats = players?.data && Array.isArray(players.data.listDto)
        ? this.buildPlayerContext(players.data.listDto)
        : null;

      const paymentStats = payments?.data && Array.isArray(payments.data)
        ? this.buildPaymentContext(payments.data)
        : null;

      const documentStats = (docs?.data || docsCoach?.data)
        ? this.buildDocumentContext(docs, docsCoach)
        : null;

      const ropaStats = this.buildRopaContext(ropa);

      const notifStats = notifs
        ? this.buildNotifContext(notifs)
        : null;

      const mediaStats = this.buildMediaContext(media);

      const scoutingStats = this.buildScoutingContext(scouting);

      const staffStats = this.buildStaffContext(staff);

      this.backgroundStats$.next({
        clubId, upcomingStats, rosterStats, teamStats, playerStats, paymentStats,
        documentStats, ropaStats, notifStats, mediaStats, scoutingStats, staffStats,
      });
      this.loadedForClubId = clubId;
      this.loadedForClubAt = Date.now();
    });
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  /** Fuerza una recarga (p.ej. al cambiar de temporada) */
  invalidateClubCache(): void {
    this.loadedForClubId = null;
    this.loadedForClubAt = null;
    this.backgroundStats$.next(null);
  }

  // ─── Sincronización FAB ↔ Asistente pantalla completa ────────────────────

  /**
   * Guarda los mensajes actuales del FAB para que el asistente-ia de pantalla
   * completa los recoja al abrirse, continuando la misma conversación.
   */
  setFabSync(messages: any[], conversationId: string | null): void {
    this.fabSyncMessages = { messages, conversationId };
  }

  /**
   * Lee y borra los mensajes pendientes del FAB (lectura única).
   * Retorna null si no hay mensajes pendientes.
   */
  consumeFabSync(): { messages: any[]; conversationId: string | null } | null {
    const data = this.fabSyncMessages;
    this.fabSyncMessages = null;
    return data;
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
    const now = Date.now();
    const cacheHit = this.loadedForTeamId === teamId
      && this.loadedForTeamAt !== null
      && (now - this.loadedForTeamAt) < this.CACHE_TTL_MS;
    if (!teamId || cacheHit) return;

    const tipos = ['Liga', 'Copa', 'Amistoso', 'Torneo'];
    const matchRequests: { [key: string]: Observable<any> } = {};
    tipos.forEach(tipo => {
      matchRequests[tipo] = this.clubService.getMatchesByTeamAndType(teamId, tipo).pipe(catchError(() => of(null)));
    });

    forkJoin({
      ...matchRequests,
      clasificacion: this.clubService.getTodo(teamId, 'current').pipe(catchError(() => of(null))),
      players:       this.http.get<any>(
                       environment.apiUrl + `user/getUserListByTeam/${teamId}`,
                       { headers: this.getAuthHeaders() }
                     ).pipe(catchError(() => of(null))),
      injuries:      this.http.get<any>(
                       environment.apiUrl + `injury/team/${teamId}`,
                       { headers: this.getAuthHeaders() }
                     ).pipe(catchError(() => of(null))),
      upcoming:      this.http.get<any>(
                       environment.apiUrl + `match/listmatchpreparationsbyteam/${teamId}`,
                       { headers: this.getAuthHeaders() }
                     ).pipe(catchError(() => of(null))),
    }).subscribe((results: any) => {
      const allMatches: any[] = [];
      tipos.forEach(tipo => {
        const res = results[tipo];
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          res.data.forEach((m: any) => allMatches.push({ ...m, _tipoPartido: tipo }));
        }
      });

      const matchStats     = this.buildCoachMatchContext(allMatches);
      const classification = this.buildCoachClassificationContext(results['clasificacion']);
      const playerStats    = this.buildCoachPlayersContext(results['players']);
      const injuryStats    = this.buildCoachInjuryContext(results['injuries']);
      const upcomingMatches = this.buildCoachUpcomingContext(results['upcoming']);

      this.coachTeamContext$.next({ teamId, matchStats, classification, playerStats, injuryStats, upcomingMatches });
      this.loadedForTeamId = teamId;
      this.loadedForTeamAt = Date.now();
    });
  }

  invalidateCoachTeamCache(): void {
    this.loadedForTeamId = null;
    this.loadedForTeamAt = null;
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
    const lines = ['Código | Nombre equipo | Partidos | Victorias | Empates | Derrotas | GF | GC | DG | Puntos'];

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
        lines.push(`${code} | ${team.nameTeam} | ${team.partidos?.length || 0} | ${vic} | ${emp} | ${der} | ${gf} | ${gc} | ${gf - gc} | ${pun}`);
      });

    return { contextText: lines.join('\n'), codeToReal };
  }

  private buildPlayerContext(playersData: any[]): { contextText: string; codeToReal: Map<string, string> } {
    const codeToReal = new Map<string, string>();
    const lines = ['Código | Equipo | Posición | Partidos | Goles | Asistencias | Min.Totales | T.Amarillas | T.Rojas'];

    // Máximo 100 jugadores para no sobrecargar el contexto
    playersData.slice(0, 100).forEach((p, i) => {
      const pid = p.playerId || p.userId || i + 1;
      const code = `PLY_${pid}`;
      const nombre = p.nombre || `Jugador ${i + 1}`;
      codeToReal.set(code, nombre);
      lines.push(
        `${code} | ${p.nameTeam || '-'} | ${p.posicion || '-'} | ${p.partidosJugados || 0} | ` +
        `${p.goles || 0} | ${p.asistencias || 0} | ${p.minTotales || 0} | ` +
        `${p.tarAmarilla || 0} | ${p.tarRojas || 0}`
      );
    });

    return { contextText: lines.join('\n'), codeToReal };
  }

  private buildUpcomingMatchesContext(upcomingByTeam: { [key: string]: any }, rosterTeams: any[]): string {
    const teamNameById = new Map<number, string>();
    rosterTeams.forEach((t: any) => {
      if (t.teamId) teamNameById.set(t.teamId, t.nameTeam || `Equipo ${t.teamId}`);
    });

    const lines: string[] = [];
    let totalMatches = 0;

    for (const key of Object.keys(upcomingByTeam)) {
      const teamId = parseInt(key.replace('team_', ''), 10);
      const res = upcomingByTeam[key];
      const matches: any[] = Array.isArray(res?.data) ? res.data
        : Array.isArray(res) ? res : [];

      const future = matches.filter((m: any) => {
        const date = m.matchDate || m.scheduledAt || '';
        if (!date) return true;
        return new Date(date) >= new Date();
      });

      if (future.length === 0) continue;

      const teamName = teamNameById.get(teamId) || `Equipo ${teamId}`;
      lines.push(`\n## ${teamName}`);
      future.sort((a: any, b: any) => {
        const da = a.matchDate || a.scheduledAt || '';
        const db = b.matchDate || b.scheduledAt || '';
        return da.localeCompare(db);
      }).slice(0, 5).forEach((m: any) => {
        const fecha   = m.matchDate || m.scheduledAt || 'Sin fecha';
        const hora    = m.matchTime || m.hora || '';
        const rival   = m.rivalName || m.rival || 'Rival desconocido';
        const lugar   = m.terreno || m.local || '-';
        const tipo    = m.tipoPartido || m.tipo || '';
        const horaStr = hora ? ` ${hora}` : '';
        const tipoStr = tipo ? ` [${tipo}]` : '';
        lines.push(`  ${fecha}${horaStr} | vs ${rival} (${lugar})${tipoStr}`);
        totalMatches++;
      });
    }

    if (lines.length === 0) return 'No hay partidos programados próximamente.';
    return `Total partidos próximos: ${totalMatches}` + lines.join('\n');
  }

  /**
   * Genera un listado completo de la plantilla del club por equipo.
   * Usa getListJugadoresByClubForTemp → todos los jugadores registrados,
   * independientemente de si tienen estadísticas de partido.
   */
  private buildRosterContext(teamsData: any[]): { contextText: string; codeToReal: Map<string, string> } {
    const codeToReal = new Map<string, string>();
    const lines: string[] = [];

    teamsData
      .filter(t => t.nameTeam && !t.nameTeam.includes('Sin equipo'))
      .forEach(team => {
        const players: any[] = Array.isArray(team.players) ? team.players : [];
        lines.push(`\n## ${team.nameTeam} (${players.length} jugadores)`);
        if (players.length === 0) {
          lines.push('  (Sin jugadores registrados)');
          return;
        }
        lines.push('  Código | Posición | Dorsal');
        players.forEach((p: any, i: number) => {
          const pid = p.playerId || p.userId || p.id || i + 1;
          const code = `PLY_${pid}`;
          const nombre = `${p.nombre || ''} ${p.apellido || p.apellidos || ''}`.trim() || `Jugador ${i + 1}`;
          codeToReal.set(code, nombre);
          const posicion = p.posicion || p.posicionGlobal || '-';
          const dorsal   = p.dorsal ?? p.numDorsal ?? '-';
          lines.push(`  ${code} | ${posicion} | ${dorsal}`);
        });
      });

    return { contextText: lines.join('\n'), codeToReal };
  }

  private buildCoachMatchContext(matches: any[]): string {
    if (!matches || matches.length === 0) return '';

    // Ordenar todos los partidos por fecha descendente (más reciente primero)
    matches.sort((a, b) => {
      const da = a.matchPreparation?.matchDate || a.matchDate || '';
      const db = b.matchPreparation?.matchDate || b.matchDate || '';
      return db.localeCompare(da);
    });

    // Identificar el último partido jugado
    const lastMatch = matches[0];
    const lmp = lastMatch?.matchPreparation;
    const lastDateStr  = lmp?.matchDate || lastMatch?.matchDate || '?';
    const lastRival    = lmp?.rivalName || '?';
    const lastGF       = lastMatch?.golesAFavor ?? 0;
    const lastGC       = lastMatch?.golesEnContra ?? 0;
    const lastResult   = lastMatch?.resultado === 'V' ? 'Victoria'
      : lastMatch?.resultado === 'E' ? 'Empate' : lastMatch?.resultado === 'D' ? 'Derrota' : '?';

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

    const header = `ÚLTIMO PARTIDO: ${lastDateStr} vs ${lastRival} | ${lastGF}-${lastGC} | ${lastResult}\n`
      + `TOTAL: ${totalPlayed}PJ | ${totalWins}V ${totalDraws}E ${totalLosses}D | ${totalGf}:${totalGc} (DG ${dgStr}) | ${totalPts}pts\nÚltima forma (5 últimos): ${forma}`;
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

  // ─── Builders para los nuevos módulos ───────────────────────────────────

  private buildDocumentContext(
    docsRes: any,
    docsCoachRes: any,
  ): { contextText: string; codeToReal: Map<string, string> } {
    const codeToReal = new Map<string, string>();
    const lines = ['Código | Tipo | Dirigido a | Requerido | Entregados/Total'];

    const allDocs: Array<{
      nombre: string; tipo: string; destinatario: string;
      requiere: number; subidos: number; total: number;
    }> = [];

    if (docsRes?.data?.documentos && Array.isArray(docsRes.data.documentos)) {
      const totalPadres = docsRes.data.totalPadres || 0;
      const subMap = docsRes.data.subidosPorDocumento || {};
      for (const doc of docsRes.data.documentos) {
        allDocs.push({
          nombre: doc.nombre || 'Documento',
          tipo: doc.tipo || 'Personalizado',
          destinatario: 'Jugadores/Padres',
          requiere: doc.requiere || 0,
          subidos: subMap[doc.docClubesId] || 0,
          total: totalPadres,
        });
      }
    }

    if (docsCoachRes?.data?.documentos && Array.isArray(docsCoachRes.data.documentos)) {
      const totalEntrenadores = docsCoachRes.data.totalEntrenadores || 0;
      const subMap = docsCoachRes.data.subidosPorDocumento || {};
      for (const doc of docsCoachRes.data.documentos) {
        allDocs.push({
          nombre: doc.nombre || 'Documento',
          tipo: doc.tipo || 'Personalizado',
          destinatario: 'Entrenadores',
          requiere: doc.requiere || 0,
          subidos: subMap[doc.docClubesId] || 0,
          total: totalEntrenadores,
        });
      }
    }

    allDocs.forEach((doc, i) => {
      const code = `DOC_${i + 1}`;
      codeToReal.set(code, doc.nombre);
      const requerido = doc.requiere > 0 ? 'Sí' : 'No';
      const entrega = doc.total > 0
        ? `${doc.subidos}/${doc.total} (${Math.round(doc.subidos / doc.total * 100)}%)`
        : `${doc.subidos}`;
      lines.push(`${code} | ${doc.tipo} | ${doc.destinatario} | ${requerido} | ${entrega}`);
    });

    return { contextText: lines.join('\n'), codeToReal };
  }

  private buildRopaContext(ropaRes: any): { contextText: string; codeToReal: Map<string, string> } {
    const codeToReal = new Map<string, string>();
    const lines = ['Código | Equipo | Estado equipación'];

    const items: any[] = Array.isArray(ropaRes?.data) ? ropaRes.data
      : Array.isArray(ropaRes) ? ropaRes : [];

    if (items.length === 0) {
      return { contextText: lines.join('\n'), codeToReal };
    }

    const teamCodeMap = new Map<string, string>();
    let teamCounter = 0;
    const getTeamCode = (teamName: string): string => {
      if (!teamName) return '-';
      if (!teamCodeMap.has(teamName)) {
        teamCounter++;
        const code = `EQUIPO_ROPA_${teamCounter}`;
        teamCodeMap.set(teamName, code);
        codeToReal.set(code, teamName);
      }
      return teamCodeMap.get(teamName)!;
    };

    items.slice(0, 150).forEach((ropa: any, i: number) => {
      const playerName = ropa.player
        ? `${ropa.player.nombre || ''} ${ropa.player.apellidos || ''}`.trim()
        : `Jugador ${i + 1}`;
      const teamName = ropa.team?.nombre || '';
      const pid = ropa.player?.playerId || ropa.player?.userId || ropa.playerId || i + 1;
      const code = `PLY_${pid}`;
      codeToReal.set(code, playerName);
      const estado = ropa.estado === '1' ? 'Completo' : 'Incompleto';
      const teamCode = getTeamCode(teamName);
      const teamDisplay = teamName ? `${teamCode} (${teamName})` : '-';
      lines.push(`${code} | ${teamDisplay} | ${estado}`);
    });

    return { contextText: lines.join('\n'), codeToReal };
  }

  private buildNotifContext(notifRes: any): { contextText: string; codeToReal: Map<string, string> } {
    const codeToReal = new Map<string, string>();
    const enviados: any[] = Array.isArray(notifRes?.data?.enviados)
      ? notifRes.data.enviados : [];

    if (enviados.length === 0) {
      return { contextText: 'Total notificaciones enviadas: 0', codeToReal };
    }

    const lines = [
      `Total notificaciones enviadas: ${enviados.length}`,
      'Código | Fecha | Asunto | Destinatario',
    ];

    const teamCodeMap = new Map<string, string>();
    let teamCounter = 0;
    const getTeamCode = (name: string): string => {
      if (!name || !name.trim()) return '-';
      if (!teamCodeMap.has(name)) {
        teamCounter++;
        const code = `EQUIPO_NOTIF_${teamCounter}`;
        teamCodeMap.set(name, code);
        codeToReal.set(code, name);
      }
      return teamCodeMap.get(name)!;
    };

    enviados.slice(0, 30).forEach((notif: any, i: number) => {
      const code = `NOTIF_${i + 1}`;
      const fecha = notif.fechaCreate ? String(notif.fechaCreate).substring(0, 10) : '-';
      const asunto = String(notif.asunto || '-').substring(0, 50);
      const destName = notif.destinatario || '';
      const teamCode = getTeamCode(destName);
      const destinatario = destName ? `${teamCode} (${destName})` : '-';
      lines.push(`${code} | ${fecha} | ${asunto} | ${destinatario}`);
    });

    return { contextText: lines.join('\n'), codeToReal };
  }

  private buildMediaContext(mediaRes: any): { contextText: string; codeToReal: Map<string, string> } {
    const codeToReal = new Map<string, string>();
    const items: any[] = Array.isArray(mediaRes) ? mediaRes
      : Array.isArray(mediaRes?.data) ? mediaRes.data : [];

    if (items.length === 0) {
      return { contextText: 'Total vídeos en biblioteca: 0', codeToReal };
    }

    const bySource: { [key: string]: number } = {};
    for (const v of items) {
      const src = v.sourceType || 'otro';
      bySource[src] = (bySource[src] || 0) + 1;
    }

    const sourceText = Object.entries(bySource)
      .map(([src, count]) => `${src}: ${count}`)
      .join(', ');

    return {
      contextText: `Total vídeos en biblioteca: ${items.length}\nPor origen: ${sourceText}`,
      codeToReal,
    };
  }

  private buildScoutingContext(scoutingRes: any): { contextText: string; codeToReal: Map<string, string> } {
    const codeToReal = new Map<string, string>();
    const lines = ['Código | Posición | Edad | Estado pipeline | Val.media'];

    const items: any[] = Array.isArray(scoutingRes) ? scoutingRes
      : Array.isArray(scoutingRes?.data) ? scoutingRes.data : [];

    if (items.length === 0) {
      return { contextText: lines.join('\n'), codeToReal };
    }

    items.slice(0, 80).forEach((entry: any, i: number) => {
      const wl = entry.watchlist || entry;
      const profile = entry.scoutingProfile;
      const evals: any[] = Array.isArray(entry.evaluations) ? entry.evaluations : [];

      const code = `SCOUT_${i + 1}`;
      const playerName = profile?.nombre
        || wl.externalPlayerName
        || `Jugador scouting ${i + 1}`;
      codeToReal.set(code, playerName);

      const posicion = profile?.posicionPrincipal || wl.externalPlayerPosition || '-';
      const edad = profile?.edad ?? wl.externalPlayerAge ?? '-';
      const estado = wl.status || '-';

      let valMedia = '-';
      if (evals.length > 0) {
        const avg = evals.reduce((s: number, e: any) => s + (e.overallRating || 0), 0) / evals.length;
        valMedia = avg.toFixed(1) + '/5';
      }

      lines.push(`${code} | ${posicion} | ${edad} | ${estado} | ${valMedia}`);
    });

    return { contextText: lines.join('\n'), codeToReal };
  }

  private buildStaffContext(staffRes: any): { contextText: string; codeToReal: Map<string, string> } {
    const codeToReal = new Map<string, string>();
    const lines = ['Código | Acceso a módulos | Activo'];

    const items: any[] = Array.isArray(staffRes) ? staffRes
      : Array.isArray(staffRes?.data) ? staffRes.data : [];

    if (items.length === 0) {
      return { contextText: lines.join('\n'), codeToReal };
    }

    items.forEach((user: any, i: number) => {
      const code = `STAFF_${i + 1}`;
      const fullName = `${user.firstName || ''} ${user.secondName || ''}`.trim()
        || `Usuario staff ${i + 1}`;
      codeToReal.set(code, fullName);

      const perms: string[] = Array.isArray(user.permissions) ? user.permissions : [];
      const permLabels = perms
        .map((p: string) => this.PERMISSION_LABELS[p] || p)
        .join(', ') || 'Sin módulos asignados';

      const activo = user.enabled ? 'Sí' : 'No';
      lines.push(`${code} | ${permLabels} | ${activo}`);
    });

    return { contextText: lines.join('\n'), codeToReal };
  }

  private buildCoachUpcomingContext(upcomingRes: any): string {
    const matches: any[] = Array.isArray(upcomingRes?.data) ? upcomingRes.data
      : Array.isArray(upcomingRes) ? upcomingRes : [];

    const future = matches.filter((m: any) => {
      const date = m.matchDate || m.scheduledAt || '';
      return !date || new Date(date) >= new Date();
    });

    if (future.length === 0) return 'Sin partidos programados próximamente.';

    const lines = ['Fecha | Hora | Rival | Lugar | Tipo'];
    future
      .sort((a: any, b: any) => (a.matchDate || '').localeCompare(b.matchDate || ''))
      .slice(0, 10)
      .forEach((m: any) => {
        const fecha = m.matchDate || m.scheduledAt || '-';
        const hora  = m.matchTime || m.hora || '-';
        const rival = m.rivalName || m.rival || '?';
        const lugar = m.terreno || m.local || '-';
        const tipo  = m.tipoPartido || m.tipo || '-';
        lines.push(`${fecha} | ${hora} | ${rival} | ${lugar} | ${tipo}`);
      });

    return lines.join('\n');
  }

  private buildCoachPlayersContext(playersRes: any): string {
    const items: any[] = Array.isArray(playersRes?.data) ? playersRes.data
      : Array.isArray(playersRes) ? playersRes : [];

    if (items.length === 0) return '';

    const lines = ['Código | Nombre | Posición | Dorsal | Estado'];
    items.forEach((p: any, i: number) => {
      const code  = `JUGADOR_${i + 1}`;
      const nombre = `${p.nombre || p.firstName || ''} ${p.apellidos || p.secondName || ''}`.trim() || `Jugador ${i + 1}`;
      const posicion = p.posicion || p.position || '-';
      const dorsal   = p.dorsal ?? p.shirtNumber ?? '-';
      const estado   = p.activo === false || p.enabled === false ? 'Baja' : 'Activo';
      lines.push(`${code} (${nombre}) | ${posicion} | ${dorsal} | ${estado}`);
    });

    return lines.join('\n');
  }

  private buildCoachInjuryContext(injuriesRes: any): string {
    const items: any[] = Array.isArray(injuriesRes?.data) ? injuriesRes.data
      : Array.isArray(injuriesRes) ? injuriesRes : [];

    if (items.length === 0) return 'Sin lesiones registradas.';

    const SEVERITY: { [k: string]: string } = { leve: 'Leve', moderada: 'Moderada', grave: 'Grave', muy_grave: 'Muy grave' };
    const STATUS: { [k: string]: string }   = {
      baja: 'Baja', recuperacion: 'Recuperación', alta_condicionada: 'Alta condicionada', alta: 'Alta',
    };

    const lines = ['Jugador | Zona | Tipo | Gravedad | Estado | Baja desde | Vuelta estimada'];
    items.forEach((inj: any) => {
      const jugador  = inj.playerName || `Jugador ${inj.playerId}`;
      const zona     = inj.zoneLabel || inj.zone || '-';
      const tipo     = inj.type || '-';
      const gravedad = SEVERITY[inj.severity] || inj.severity || '-';
      const estado   = STATUS[inj.status] || inj.status || '-';
      const desde    = inj.dateInjury ? String(inj.dateInjury).substring(0, 10) : '-';
      const vuelta   = inj.dateReturn ? String(inj.dateReturn).substring(0, 10) : '-';
      lines.push(`${jugador} | ${zona} | ${tipo} | ${gravedad} | ${estado} | ${desde} | ${vuelta}`);
    });

    return lines.join('\n');
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
      const pid = p.playerId || i + 1;
      const code = `PLY_${pid}`;
      const fullName = `${p.nombre || ''} ${p.apellido || ''}`.trim() || `Jugador ${i + 1}`;
      codeToReal.set(code, fullName);

      const totalAPagar = parseFloat(p.totalAPagar) || 0;
      const totalPagado = parseFloat(p.totalPagado) || 0;
      const pendiente   = Math.max(0, totalAPagar - totalPagado);
      const estado      = pendiente <= 0.01 ? 'Al día' : 'Pendiente';
      const teamName    = p.nameTeam || '';
      const teamCode    = getTeamCode(teamName);
      const equipoDisplay = teamName ? `${teamCode} (${teamName})` : '-';

      lines.push(
        `${code} | ${equipoDisplay} | ${totalAPagar.toFixed(2)} | ` +
        `${totalPagado.toFixed(2)} | ${pendiente.toFixed(2)} | ${estado}`
      );
    });

    return { contextText: lines.join('\n'), codeToReal };
  }
}
