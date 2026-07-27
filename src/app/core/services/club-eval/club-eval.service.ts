import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { isDemoMode } from '../demo/demo-mode';

export interface ClubEvalField {
  id: number;
  clubId: number;
  fieldKey: string;
  fieldLabel: string;
  fieldOrder: number;
  active: number;
}

export interface ClubEvalStage {
  id: number;
  clubId: number;
  stageKey: string;
  stageLabel: string;
  stageOrder: number;
  active: number;
}

export interface ClubEvalConfig {
  id: number;
  clubId: number;
  pipelineEnabled: number;
  aiReportsEnabled: number;
  playerCanSeeEvaluations: number;
  alertasEnabled: number;
  semanasSinEval: number;
  bajasConsecutivas: number;
  fields: ClubEvalField[];
  stages: ClubEvalStage[];
}

export interface ClubPlayerGoal {
  fieldKey: string;
  targetScore: number;
}

export interface PlayerCompareData {
  playerId: number;
  nombre: string;
  posicion: string;
  foto: string;
  overallAvg: number;
  evalCount: number;
  fieldAverages: { [fieldLabel: string]: number };
}

export interface PlayerCompareResult {
  players: PlayerCompareData[];
  fields: string[];
}

export interface ClubEvalScore {
  id?: number;
  evaluationId?: number;
  fieldKey: string;
  score: number;
}

export interface ClubPlayerEvaluation {
  id?: number;
  clubId?: number;
  playerId: number;
  teamId?: number;
  evaluatorUserId?: number;
  overallRating: number;
  notes?: string;
  observationContext?: string;
  matchId?: number;
  trainingId?: number;
  visibleToPlayer?: number;
  evaluationDate: string;
  scores: ClubEvalScore[];
}

export interface PlayerStatsData {
  partidosJugados: number;
  minTotales: number;
  mediaMinPorPartido: number;
  goles: number;
  asistencias: number;
  golesAsistencias: number;
  golesPenalti: number;
  golesFalta: number;
  tarjetasAmarillas: number;
  tarjetasRojas: number;
  penaltisFallados: number;
  mediaGolesPorPartido: number;
  mediaAsistPorPartido: number;
}

export interface PlayerStats {
  totals: PlayerStatsData;
  byType: { [tipoPartido: string]: PlayerStatsData };
}

export interface ClubPlayerPipelineMove {
  clubId?: number;
  playerId: number;
  stageKey: string;
  movedBy: number;
  notes?: string;
}

export interface PipelineStageGroup {
  stageKey: string;
  stageLabel: string;
  stageOrder: number;
  players: PipelinePlayer[];
}

export interface PipelinePlayer {
  pipelineId: number;
  playerId: number;
  stageKey: string;
  movedAt: string;
  playerName?: string;
  playerPosition?: string;
}

/**
 * Cliente de evaluaciones de club. Versión demo-app: en modo demo devuelve
 * config, campos, etapas, evaluaciones, pipeline y stats ficticios inline con
 * la forma `{ data, status: 200 }` (igual que el backend) y simula las
 * escrituras con éxito.
 */
@Injectable({
  providedIn: 'root'
})
export class ClubEvalService {

  private baseUrl = environment.apiUrl + 'club-eval';

  constructor(private http: HttpClient) {}

  private ok<T>(data: T): Observable<any> {
    return of({ data, status: 200, error: { code: 0, msg: 'MOCK_OK' } });
  }

  // Config
  getConfig(clubId: number): Observable<any> {
    if (isDemoMode()) return this.ok(this.mockConfig(clubId));
    return this.http.get(`${this.baseUrl}/${clubId}/config`);
  }

  saveConfig(clubId: number, config: Partial<ClubEvalConfig>): Observable<any> {
    if (isDemoMode()) return this.ok({ ...this.mockConfig(clubId), ...config });
    return this.http.put(`${this.baseUrl}/${clubId}/config`, config);
  }

  // Fields
  createField(clubId: number, field: Partial<ClubEvalField>): Observable<any> {
    if (isDemoMode()) return this.ok({ id: Date.now(), clubId, active: 1, fieldOrder: 99, ...field });
    return this.http.post(`${this.baseUrl}/${clubId}/fields`, field);
  }

  updateField(clubId: number, fieldId: number, field: Partial<ClubEvalField>): Observable<any> {
    if (isDemoMode()) return this.ok({ id: fieldId, clubId, active: 1, fieldOrder: 1, ...field });
    return this.http.put(`${this.baseUrl}/${clubId}/fields/${fieldId}`, field);
  }

  deleteField(clubId: number, fieldId: number): Observable<any> {
    if (isDemoMode()) return this.ok(true);
    return this.http.delete(`${this.baseUrl}/${clubId}/fields/${fieldId}`);
  }

  // Stages
  createStage(clubId: number, stage: Partial<ClubEvalStage>): Observable<any> {
    if (isDemoMode()) return this.ok({ id: Date.now(), clubId, active: 1, stageOrder: 99, ...stage });
    return this.http.post(`${this.baseUrl}/${clubId}/stages`, stage);
  }

  updateStage(clubId: number, stageId: number, stage: Partial<ClubEvalStage>): Observable<any> {
    if (isDemoMode()) return this.ok({ id: stageId, clubId, active: 1, stageOrder: 1, ...stage });
    return this.http.put(`${this.baseUrl}/${clubId}/stages/${stageId}`, stage);
  }

  deleteStage(clubId: number, stageId: number): Observable<any> {
    if (isDemoMode()) return this.ok(true);
    return this.http.delete(`${this.baseUrl}/${clubId}/stages/${stageId}`);
  }

  // Evaluations
  getPlayerEvaluations(clubId: number, playerId: number): Observable<any> {
    if (isDemoMode()) return this.ok(this.mockEvaluations(clubId, playerId));
    return this.http.get(`${this.baseUrl}/${clubId}/player/${playerId}/evaluations`);
  }

  createEvaluation(clubId: number, evaluation: ClubPlayerEvaluation): Observable<any> {
    if (isDemoMode()) return this.ok({ id: Date.now(), clubId, ...evaluation });
    return this.http.post(`${this.baseUrl}/${clubId}/evaluation`, evaluation);
  }

  updateEvaluation(clubId: number, evalId: number, evaluation: ClubPlayerEvaluation): Observable<any> {
    if (isDemoMode()) return this.ok({ id: evalId, clubId, ...evaluation });
    return this.http.put(`${this.baseUrl}/${clubId}/evaluation/${evalId}`, evaluation);
  }

  deleteEvaluation(clubId: number, evalId: number): Observable<any> {
    if (isDemoMode()) return this.ok(true);
    return this.http.delete(`${this.baseUrl}/${clubId}/evaluation/${evalId}`);
  }

  // Pipeline
  getPipeline(clubId: number): Observable<any> {
    if (isDemoMode()) return this.ok(this.mockPipeline());
    return this.http.get(`${this.baseUrl}/${clubId}/pipeline`);
  }

  movePlayerStage(clubId: number, move: ClubPlayerPipelineMove): Observable<any> {
    if (isDemoMode()) return this.ok({ pipelineId: Date.now(), ...move, movedAt: new Date().toISOString() });
    return this.http.post(`${this.baseUrl}/${clubId}/pipeline/move`, move);
  }

  getPlayerPipelineHistory(clubId: number, playerId: number): Observable<any> {
    if (isDemoMode()) return this.ok([
      { pipelineId: 1, playerId, stageKey: 'seguimiento', movedAt: '2026-02-01T10:00:00', playerName: 'Jugador Demo' },
      { pipelineId: 2, playerId, stageKey: 'prueba', movedAt: '2026-03-15T10:00:00', playerName: 'Jugador Demo' },
    ]);
    return this.http.get(`${this.baseUrl}/${clubId}/pipeline/history/${playerId}`);
  }

  // Team session
  getTeamPlayers(clubId: number, teamId: number): Observable<any> {
    if (isDemoMode()) return this.ok(this.mockTeamPlayers());
    return this.http.get(`${this.baseUrl}/${clubId}/team/${teamId}/players`);
  }

  createTeamSession(clubId: number, teamId: number, evaluations: ClubPlayerEvaluation[]): Observable<any> {
    if (isDemoMode()) return this.ok({ saved: evaluations.length });
    return this.http.post(`${this.baseUrl}/${clubId}/team/${teamId}/session`, evaluations);
  }

  getTeamEvaluationsByDate(clubId: number, teamId: number, date: string): Observable<any> {
    if (isDemoMode()) return this.ok([]);
    return this.http.get(`${this.baseUrl}/${clubId}/team/${teamId}/session`, { params: { date } });
  }

  getTeamSessionDates(clubId: number, teamId: number): Observable<any> {
    if (isDemoMode()) return this.ok(['2026-05-10', '2026-04-12', '2026-03-08']);
    return this.http.get(`${this.baseUrl}/${clubId}/team/${teamId}/session`);
  }

  // AI Report
  generateAiReport(clubId: number, playerId: number, requestingUserId: number): Observable<any> {
    if (isDemoMode()) return this.ok({
      report: 'Informe de evaluación (demo): el jugador muestra una progresión sólida en aspectos técnicos y una actitud ejemplar. Se recomienda reforzar la toma de decisiones en espacios reducidos.',
      generatedAt: new Date().toISOString(),
    });
    return this.http.post(`${this.baseUrl}/${clubId}/player/${playerId}/report?requestingUserId=${requestingUserId}`, {});
  }

  // Player Stats
  getPlayerStats(clubId: number, playerId: number): Observable<any> {
    if (isDemoMode()) return this.ok(this.mockPlayerStats());
    return this.http.get(`${this.baseUrl}/${clubId}/player/${playerId}/stats`);
  }

  // Compare players
  comparePlayers(clubId: number, teamId: number, playerIds: number[]): Observable<any> {
    if (isDemoMode()) return this.ok(this.mockCompare(playerIds));
    return this.http.get(`${this.baseUrl}/${clubId}/team/${teamId}/compare`, {
      params: { playerIds: playerIds.map(String) }
    });
  }

  // Player Goals
  getPlayerGoals(clubId: number, playerId: number): Observable<any> {
    if (isDemoMode()) return this.ok([
      { fieldKey: 'tecnica', targetScore: 8 },
      { fieldKey: 'tactica', targetScore: 7 },
      { fieldKey: 'fisico', targetScore: 8 },
      { fieldKey: 'actitud', targetScore: 9 },
    ]);
    return this.http.get(`${this.baseUrl}/${clubId}/player/${playerId}/goals`);
  }

  savePlayerGoals(clubId: number, playerId: number, goals: ClubPlayerGoal[]): Observable<any> {
    if (isDemoMode()) return this.ok(goals);
    return this.http.put(`${this.baseUrl}/${clubId}/player/${playerId}/goals`, goals);
  }

  // ── Datos ficticios inline ────────────────────────────────────────
  private mockFields(clubId: number): ClubEvalField[] {
    return [
      { id: 1, clubId, fieldKey: 'tecnica', fieldLabel: 'Técnica', fieldOrder: 1, active: 1 },
      { id: 2, clubId, fieldKey: 'tactica', fieldLabel: 'Táctica', fieldOrder: 2, active: 1 },
      { id: 3, clubId, fieldKey: 'fisico', fieldLabel: 'Físico', fieldOrder: 3, active: 1 },
      { id: 4, clubId, fieldKey: 'actitud', fieldLabel: 'Actitud', fieldOrder: 4, active: 1 },
      { id: 5, clubId, fieldKey: 'psicologico', fieldLabel: 'Psicológico', fieldOrder: 5, active: 1 },
    ];
  }

  private mockStages(clubId: number): ClubEvalStage[] {
    return [
      { id: 1, clubId, stageKey: 'seguimiento', stageLabel: 'Seguimiento', stageOrder: 1, active: 1 },
      { id: 2, clubId, stageKey: 'prueba', stageLabel: 'En prueba', stageOrder: 2, active: 1 },
      { id: 3, clubId, stageKey: 'fichado', stageLabel: 'Fichado', stageOrder: 3, active: 1 },
      { id: 4, clubId, stageKey: 'descartado', stageLabel: 'Descartado', stageOrder: 4, active: 1 },
    ];
  }

  private mockConfig(clubId: number): ClubEvalConfig {
    return {
      id: 1,
      clubId,
      pipelineEnabled: 1,
      aiReportsEnabled: 1,
      playerCanSeeEvaluations: 0,
      alertasEnabled: 1,
      semanasSinEval: 4,
      bajasConsecutivas: 3,
      fields: this.mockFields(clubId),
      stages: this.mockStages(clubId),
    };
  }

  private mockEvaluations(clubId: number, playerId: number): ClubPlayerEvaluation[] {
    const mk = (id: number, date: string, overall: number, t: number, ta: number, f: number, a: number): ClubPlayerEvaluation => ({
      id, clubId, playerId, teamId: 101, evaluatorUserId: 500,
      overallRating: overall, notes: 'Evaluación de ejemplo.', evaluationDate: date,
      visibleToPlayer: 0,
      scores: [
        { fieldKey: 'tecnica', score: t },
        { fieldKey: 'tactica', score: ta },
        { fieldKey: 'fisico', score: f },
        { fieldKey: 'actitud', score: a },
      ],
    });
    return [
      mk(1, '2026-05-10', 8, 8, 7, 8, 9),
      mk(2, '2026-04-12', 7, 7, 7, 7, 8),
      mk(3, '2026-03-08', 6, 6, 6, 7, 8),
    ];
  }

  private mockTeamPlayers(): any[] {
    return [
      { playerId: 2001, nombre: 'Lucas', apellido: 'Martín', posicion: 'Delantero', foto: '' },
      { playerId: 2002, nombre: 'Hugo', apellido: 'Navarro', posicion: 'Centrocampista', foto: '' },
      { playerId: 2003, nombre: 'Diego', apellido: 'Romero', posicion: 'Defensa', foto: '' },
      { playerId: 2004, nombre: 'Mateo', apellido: 'Vidal', posicion: 'Portero', foto: '' },
    ];
  }

  private mockPipeline(): PipelineStageGroup[] {
    return [
      { stageKey: 'seguimiento', stageLabel: 'Seguimiento', stageOrder: 1, players: [
        { pipelineId: 1, playerId: 3001, stageKey: 'seguimiento', movedAt: '2026-04-01T10:00:00', playerName: 'Álvaro Gil', playerPosition: 'Extremo' },
        { pipelineId: 2, playerId: 3002, stageKey: 'seguimiento', movedAt: '2026-04-05T10:00:00', playerName: 'Pau Serra', playerPosition: 'Mediocentro' },
      ]},
      { stageKey: 'prueba', stageLabel: 'En prueba', stageOrder: 2, players: [
        { pipelineId: 3, playerId: 3003, stageKey: 'prueba', movedAt: '2026-04-10T10:00:00', playerName: 'Iker Sáez', playerPosition: 'Lateral' },
      ]},
      { stageKey: 'fichado', stageLabel: 'Fichado', stageOrder: 3, players: [
        { pipelineId: 4, playerId: 3004, stageKey: 'fichado', movedAt: '2026-04-15T10:00:00', playerName: 'Noah Vega', playerPosition: 'Central' },
      ]},
      { stageKey: 'descartado', stageLabel: 'Descartado', stageOrder: 4, players: [] },
    ];
  }

  private mockPlayerStats(): PlayerStats {
    const totals: PlayerStatsData = {
      partidosJugados: 18, minTotales: 1380, mediaMinPorPartido: 76.7,
      goles: 9, asistencias: 6, golesAsistencias: 15, golesPenalti: 2, golesFalta: 1,
      tarjetasAmarillas: 3, tarjetasRojas: 0, penaltisFallados: 1,
      mediaGolesPorPartido: 0.5, mediaAsistPorPartido: 0.33,
    };
    return { totals, byType: { 'Liga': totals } };
  }

  private mockCompare(playerIds: number[]): PlayerCompareResult {
    const fields = ['Técnica', 'Táctica', 'Físico', 'Actitud'];
    const players: PlayerCompareData[] = playerIds.map((id, i) => ({
      playerId: id,
      nombre: ['Lucas Martín', 'Hugo Navarro', 'Diego Romero', 'Mateo Vidal'][i % 4],
      posicion: ['Delantero', 'Centrocampista', 'Defensa', 'Portero'][i % 4],
      foto: '',
      overallAvg: 7 + (i % 3),
      evalCount: 3,
      fieldAverages: { 'Técnica': 7 + (i % 3), 'Táctica': 6 + (i % 3), 'Físico': 8 - (i % 2), 'Actitud': 8 + (i % 2) },
    }));
    return { players, fields };
  }
}
