import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { Response } from 'src/app/core/services/models/response.model';
import {
  DebriefTraining,
  DebriefMatch,
  DebriefReport,
  DebriefConfig,
  DebriefHistoryItem,
  DebriefQuestion,
  DebriefAnswer,
  DebriefType,
  AttendanceContext,
  ReportSection,
  DEFAULT_TRAINING_QUESTIONS,
  DEFAULT_MATCH_QUESTIONS,
  SaveDebriefTrainingRequest,
  SaveDebriefMatchRequest,
  GenerateReportRequest,
  SaveDebriefConfigRequest
} from 'src/app/core/models/debrief/debrief.model';

@Injectable({
  providedIn: 'root'
})
export class DebriefService {

  // ── Almacenamiento local (hasta que haya backend) ──
  private localDebriefs: (DebriefTraining | DebriefMatch)[] = [];
  private localReports: DebriefReport[] = [];
  private localConfig: DebriefConfig | null = null;
  private nextId = 1;

  constructor(private http: HttpClient) {
    this.loadFromLocalStorage();
  }

  // ═══════════════════════════════════════
  // HEADERS helper
  // ═══════════════════════════════════════
  private getHeaders(): HttpHeaders | null {
    const token = localStorage.getItem('token');
    if (!token) return null;
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  // ═══════════════════════════════════════
  // PREGUNTAS
  // ═══════════════════════════════════════

  /** Obtiene las preguntas activas para entrenamiento (default + custom - removed) */
  getTrainingQuestions(config?: DebriefConfig | null): DebriefQuestion[] {
    return this.mergeQuestions(DEFAULT_TRAINING_QUESTIONS, config);
  }

  /** Obtiene las preguntas activas para partido (default + custom - removed) */
  getMatchQuestions(config?: DebriefConfig | null): DebriefQuestion[] {
    return this.mergeQuestions(DEFAULT_MATCH_QUESTIONS, config);
  }

  /** Fusiona preguntas default con personalizaciones */
  private mergeQuestions(defaults: DebriefQuestion[], config?: DebriefConfig | null): DebriefQuestion[] {
    if (!config) return [...defaults];

    // Filtrar las preguntas default que el coach no haya removido
    const activeDefaults = defaults.filter(
      q => !config.removedDefaultQuestionIds.includes(q.id)
    );

    // Agregar preguntas custom al final
    return [...activeDefaults, ...(config.customQuestions || [])];
  }

  // ═══════════════════════════════════════
  // CONFIGURACIÓN PERSONALIZADA
  // ═══════════════════════════════════════

  /** Obtener configuración del entrenador/club */
  getConfig(userId: number, teamId?: number): Observable<DebriefConfig | null> {
    // TODO: Reemplazar con llamada al backend
    // const url = `${environment.apiUrl}debrief/config/${userId}`;
    // return this.http.get<Response>(url, { headers }).pipe(map(r => r.data));

    return of(this.localConfig);
  }

  /** Guardar configuración personalizada */
  saveConfig(config: DebriefConfig): Observable<DebriefConfig> {
    // TODO: Reemplazar con llamada al backend
    // const url = `${environment.apiUrl}debrief/config`;
    // const body: SaveDebriefConfigRequest = { ... };
    // return this.http.put<Response>(url, body, { headers }).pipe(map(r => r.data));

    this.localConfig = { ...config, updatedAt: new Date().toISOString() };
    this.saveToLocalStorage();
    return of(this.localConfig);
  }

  /** Añadir una pregunta personalizada */
  addCustomQuestion(question: DebriefQuestion): void {
    if (!this.localConfig) {
      this.localConfig = {
        userId: 0,
        customQuestions: [],
        removedDefaultQuestionIds: []
      };
    }
    this.localConfig.customQuestions.push(question);
    this.saveToLocalStorage();
  }

  /** Quitar una pregunta (default: marcarla como removed, custom: eliminarla) */
  removeQuestion(questionId: string): void {
    if (!this.localConfig) {
      this.localConfig = {
        userId: 0,
        customQuestions: [],
        removedDefaultQuestionIds: []
      };
    }

    // ¿Es una custom? → eliminar del array
    const customIdx = this.localConfig.customQuestions.findIndex(q => q.id === questionId);
    if (customIdx >= 0) {
      this.localConfig.customQuestions.splice(customIdx, 1);
    } else {
      // Es default → marcar como removed
      if (!this.localConfig.removedDefaultQuestionIds.includes(questionId)) {
        this.localConfig.removedDefaultQuestionIds.push(questionId);
      }
    }
    this.saveToLocalStorage();
  }

  /** Restaurar una pregunta default que fue removida */
  restoreDefaultQuestion(questionId: string): void {
    if (!this.localConfig) return;
    this.localConfig.removedDefaultQuestionIds =
      this.localConfig.removedDefaultQuestionIds.filter(id => id !== questionId);
    this.saveToLocalStorage();
  }

  // ═══════════════════════════════════════
  // GUARDAR DEBRIEF
  // ═══════════════════════════════════════

  /** Guardar debrief de entrenamiento */
  saveTrainingDebrief(debrief: DebriefTraining): Observable<DebriefTraining> {
    // TODO: Reemplazar con llamada al backend
    // const url = `${environment.apiUrl}debrief/training`;
    // const body: SaveDebriefTrainingRequest = { ... };
    // return this.http.post<Response>(url, body, { headers }).pipe(map(r => r.data));

    if (!debrief.debriefId) {
      debrief.debriefId = this.nextId++;
    }
    debrief.createdAt = debrief.createdAt || new Date().toISOString();
    debrief.updatedAt = new Date().toISOString();

    const idx = this.localDebriefs.findIndex(
      d => (d as DebriefTraining).trainingSessionId === debrief.trainingSessionId &&
        d.debriefId === debrief.debriefId
    );
    if (idx >= 0) {
      this.localDebriefs[idx] = debrief;
    } else {
      this.localDebriefs.push(debrief);
    }
    this.saveToLocalStorage();
    return of(debrief);
  }

  /** Guardar debrief de partido */
  saveMatchDebrief(debrief: DebriefMatch): Observable<DebriefMatch> {
    // TODO: Reemplazar con llamada al backend
    // const url = `${environment.apiUrl}debrief/match`;
    // const body: SaveDebriefMatchRequest = { ... };
    // return this.http.post<Response>(url, body, { headers }).pipe(map(r => r.data));

    if (!debrief.debriefId) {
      debrief.debriefId = this.nextId++;
    }
    debrief.createdAt = debrief.createdAt || new Date().toISOString();
    debrief.updatedAt = new Date().toISOString();

    const idx = this.localDebriefs.findIndex(
      d => (d as DebriefMatch).matchPreparationId === debrief.matchPreparationId &&
        d.debriefId === debrief.debriefId
    );
    if (idx >= 0) {
      this.localDebriefs[idx] = debrief;
    } else {
      this.localDebriefs.push(debrief);
    }
    this.saveToLocalStorage();
    return of(debrief);
  }

  // ═══════════════════════════════════════
  // GENERAR INFORME (mock hasta backend IA)
  // ═══════════════════════════════════════

  /** Genera informe IA basado en las respuestas del debrief */
  generateReport(debriefId: number, type: DebriefType, lang: string = 'es'): Observable<DebriefReport> {
    // TODO: Reemplazar con llamada al backend (IA)
    // const url = `${environment.apiUrl}debrief/${debriefId}/generate-report`;
    // const body: GenerateReportRequest = { debriefId, type, includeAttendance: true, includeMatchStats: true, language: lang };
    // return this.http.post<Response>(url, body, { headers }).pipe(map(r => r.data));

    const debrief = this.localDebriefs.find(d => d.debriefId === debriefId);
    if (!debrief) {
      return of({
        reportId: 0,
        debriefId,
        type,
        generatedAt: new Date().toISOString(),
        sections: [],
        summary: 'No se encontró el debrief.',
        recommendations: [],
        rawAnswers: []
      });
    }

    // Mock: generar secciones según las respuestas
    const report = this.buildMockReport(debrief, type);
    this.localReports.push(report);

    // Marcar debrief como report-generated
    debrief.status = 'report-generated';
    this.saveToLocalStorage();

    return of(report);
  }

  /** Construye un informe mock a partir de las respuestas */
  private buildMockReport(debrief: DebriefTraining | DebriefMatch, type: DebriefType): DebriefReport {
    const sections: ReportSection[] = [];

    // Sección de valoración general
    const ratingAnswer = debrief.answers.find(a => a.questionId === (type === 'training' ? 'TQ1' : 'MQ1'));
    if (ratingAnswer) {
      sections.push({
        titleKey: 'DEBRIEF.REPORT.GENERAL_RATING',
        icon: 'bi-star-fill',
        content: `Valoración general: ${ratingAnswer.quickValue}/5`,
        rating: ratingAnswer.quickValue as number
      });
    }

    // Sección de objetivos
    const objectiveAnswer = debrief.answers.find(a => a.questionId === (type === 'training' ? 'TQ2' : 'MQ2'));
    if (objectiveAnswer) {
      sections.push({
        titleKey: 'DEBRIEF.REPORT.OBJECTIVES',
        icon: 'bi-bullseye',
        content: `Cumplimiento de objetivos: ${objectiveAnswer.quickValue}`,
      });
    }

    // Sección de asistencia
    if (debrief.attendanceContext && !debrief.attendanceContext.noRecordsAvailable) {
      sections.push({
        titleKey: 'DEBRIEF.REPORT.ATTENDANCE',
        icon: 'bi-people-fill',
        content: `Asistencia: ${debrief.attendanceContext.present}/${debrief.attendanceContext.totalPlayers} ` +
          `(${debrief.attendanceContext.attendanceRate}%). ` +
          (debrief.attendanceContext.absent > 0
            ? `Ausentes: ${debrief.attendanceContext.absentPlayerNames.join(', ')}.`
            : 'Todos presentes.'),
      });
    }

    // Secciones de texto libre
    debrief.answers
      .filter(a => a.textValue || a.audioTranscript)
      .forEach(a => {
        sections.push({
          titleKey: 'DEBRIEF.REPORT.COACH_NOTES',
          icon: 'bi-chat-text-fill',
          content: a.textValue || a.audioTranscript || '',
        });
      });

    // Jugadores destacados
    const playerAnswers = debrief.answers.filter(a => a.selectedPlayers && a.selectedPlayers.length > 0);
    if (playerAnswers.length > 0) {
      sections.push({
        titleKey: 'DEBRIEF.REPORT.HIGHLIGHTED_PLAYERS',
        icon: 'bi-person-check-fill',
        content: `Jugadores mencionados en ${playerAnswers.length} categoría(s).`,
      });
    }

    return {
      reportId: this.nextId++,
      debriefId: debrief.debriefId!,
      type,
      generatedAt: new Date().toISOString(),
      sections,
      summary: `Informe ${type === 'training' ? 'de entrenamiento' : 'de partido'} generado. ` +
        `Se analizaron ${debrief.answers.length} respuestas del entrenador.`,
      recommendations: [
        'Este informe será generado por IA cuando se conecte al backend.',
        'Por ahora muestra un resumen estructurado de las respuestas.'
      ],
      attendanceSummary: debrief.attendanceContext
        ? `Asistencia: ${debrief.attendanceContext.attendanceRate}% (${debrief.attendanceContext.weekScope})`
        : undefined,
      rawAnswers: debrief.answers
    };
  }

  // ═══════════════════════════════════════
  // OBTENER INFORME
  // ═══════════════════════════════════════

  getReport(debriefId: number): Observable<DebriefReport | null> {
    // TODO: Backend → GET /api/debrief/{debriefId}/report
    const report = this.localReports.find(r => r.debriefId === debriefId);
    return of(report || null);
  }

  // ═══════════════════════════════════════
  // HISTORIAL
  // ═══════════════════════════════════════

  getHistory(teamId: number): Observable<DebriefHistoryItem[]> {
    // TODO: Backend → GET /api/debrief/history/{teamId}
    const items: DebriefHistoryItem[] = this.localDebriefs
      .filter(d => d.teamId === teamId)
      .map(d => {
        const isMatch = 'matchPreparationId' in d;
        return {
          debriefId: d.debriefId!,
          type: (isMatch ? 'match' : 'training') as DebriefType,
          date: d.date,
          rivalName: isMatch ? (d as DebriefMatch).rivalName : undefined,
          status: d.status,
          summary: d.answers.length + ' respuestas'
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return of(items);
  }

  getDebrief(debriefId: number): Observable<(DebriefTraining | DebriefMatch) | null> {
    const found = this.localDebriefs.find(d => d.debriefId === debriefId);
    return of(found || null);
  }

  // ═══════════════════════════════════════
  // ASISTENCIA CONTEXTUAL
  // ═══════════════════════════════════════

  /**
   * Obtiene datos de asistencia de la semana cercana al entrenamiento/partido.
   * Actualmente mock — se reemplazará con llamada real al TrainingService.
   */
  getAttendanceContext(teamId: number, referenceDate: string): Observable<AttendanceContext> {
    // TODO: Llamar al backend para obtener asistencia de la semana
    // const url = `${environment.apiUrl}training/attendance-week/${teamId}?date=${referenceDate}`;
    // return this.http.get<Response>(url, { headers }).pipe(map(r => r.data));

    // Mock: Indicar que no hay registros disponibles
    const refDate = new Date(referenceDate);
    const startOfWeek = new Date(refDate);
    startOfWeek.setDate(refDate.getDate() - refDate.getDay() + 1); // Lunes
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Domingo

    const weekScope = `${this.formatDate(startOfWeek)} - ${this.formatDate(endOfWeek)}`;

    return of({
      totalPlayers: 0,
      present: 0,
      absent: 0,
      late: 0,
      attendanceRate: 0,
      absentPlayerNames: [],
      latePlayerNames: [],
      weekScope,
      noRecordsAvailable: true
    });
  }

  private formatDate(d: Date): string {
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  }

  // ═══════════════════════════════════════
  // PERSISTENCIA LOCAL
  // ═══════════════════════════════════════

  private saveToLocalStorage(): void {
    try {
      localStorage.setItem('sphaira_debriefs', JSON.stringify(this.localDebriefs));
      localStorage.setItem('sphaira_debrief_reports', JSON.stringify(this.localReports));
      if (this.localConfig) {
        localStorage.setItem('sphaira_debrief_config', JSON.stringify(this.localConfig));
      }
      localStorage.setItem('sphaira_debrief_nextId', String(this.nextId));
    } catch (e) {
      console.warn('DebriefService: Error saving to localStorage', e);
    }
  }

  private loadFromLocalStorage(): void {
    try {
      const debriefs = localStorage.getItem('sphaira_debriefs');
      if (debriefs) this.localDebriefs = JSON.parse(debriefs);

      const reports = localStorage.getItem('sphaira_debrief_reports');
      if (reports) this.localReports = JSON.parse(reports);

      const config = localStorage.getItem('sphaira_debrief_config');
      if (config) this.localConfig = JSON.parse(config);

      const nextId = localStorage.getItem('sphaira_debrief_nextId');
      if (nextId) this.nextId = parseInt(nextId, 10);
    } catch (e) {
      console.warn('DebriefService: Error loading from localStorage', e);
    }
  }
}
