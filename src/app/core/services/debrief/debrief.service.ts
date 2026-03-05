import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { DemoDataService } from '../demo/demo-data.service';
import { isDemoMode } from '../demo/demo-mode';
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
} from 'src/app/core/models/debrief/debrief.model';

@Injectable({
  providedIn: 'root'
})
export class DebriefService {

  private baseUrl = environment.apiUrl + 'debrief/';

  constructor(private http: HttpClient) {}

  // ═══════════════════════════════════════
  // PREGUNTAS
  // ═══════════════════════════════════════

  getTrainingQuestions(config?: DebriefConfig | null): DebriefQuestion[] {
    return this.mergeQuestions(DEFAULT_TRAINING_QUESTIONS, config);
  }

  getMatchQuestions(config?: DebriefConfig | null): DebriefQuestion[] {
    return this.mergeQuestions(DEFAULT_MATCH_QUESTIONS, config);
  }

  private mergeQuestions(defaults: DebriefQuestion[], config?: DebriefConfig | null): DebriefQuestion[] {
    if (!config) return [...defaults];
    const activeDefaults = defaults.filter(
      q => !config.removedDefaultQuestionIds.includes(q.id)
    );
    return [...activeDefaults, ...(config.customQuestions || [])];
  }

  // ═══════════════════════════════════════
  // CONFIGURACIÓN PERSONALIZADA
  // ═══════════════════════════════════════

  getConfig(userId: number, teamId?: number): Observable<DebriefConfig | null> {
    return this.http.get<any>(this.baseUrl + `config/${userId}`).pipe(
      map(res => {
        if (!res?.data) return null;
        const d = res.data;
        return {
          configId: d.configId,
          userId: d.userId,
          teamId: d.teamId,
          customQuestions: d.customQuestions ? JSON.parse(d.customQuestions) : [],
          removedDefaultQuestionIds: d.removedDefaultQuestionIds ? JSON.parse(d.removedDefaultQuestionIds) : [],
          updatedAt: d.updatedAt
        } as DebriefConfig;
      }),
      catchError(() => of(null))
    );
  }

  saveConfig(config: DebriefConfig): Observable<DebriefConfig> {
    const body = {
      userId: config.userId,
      teamId: config.teamId || null,
      customQuestions: JSON.stringify(config.customQuestions || []),
      removedDefaultQuestionIds: JSON.stringify(config.removedDefaultQuestionIds || [])
    };
    return this.http.put<any>(this.baseUrl + 'config', body).pipe(
      map(res => {
        const d = res.data;
        return {
          configId: d.configId,
          userId: d.userId,
          teamId: d.teamId,
          customQuestions: d.customQuestions ? JSON.parse(d.customQuestions) : [],
          removedDefaultQuestionIds: d.removedDefaultQuestionIds ? JSON.parse(d.removedDefaultQuestionIds) : [],
          updatedAt: d.updatedAt
        } as DebriefConfig;
      }),
      catchError(() => of(config))
    );
  }

  addCustomQuestion(question: DebriefQuestion): void {
    // This is handled via saveConfig now — kept for backward compatibility
    // The component should call getConfig(), modify, then saveConfig()
  }

  removeQuestion(questionId: string): void {
    // Handled via saveConfig — kept for backward compatibility
  }

  restoreDefaultQuestion(questionId: string): void {
    // Handled via saveConfig — kept for backward compatibility
  }

  // ═══════════════════════════════════════
  // GUARDAR DEBRIEF
  // ═══════════════════════════════════════

  saveTrainingDebrief(debrief: DebriefTraining): Observable<DebriefTraining> {
    const body = {
      teamId: debrief.teamId,
      coachUserId: debrief.coachUserId,
      trainingSessionId: debrief.trainingSessionId,
      date: debrief.date,
      answers: JSON.stringify(debrief.answers),
      attendanceContext: debrief.attendanceContext ? JSON.stringify(debrief.attendanceContext) : null,
      customQuestions: debrief.customQuestions ? JSON.stringify(debrief.customQuestions) : null,
      status: debrief.status || 'completed'
    };
    return this.http.post<any>(this.baseUrl + 'training', body).pipe(
      map(res => this.mapToDebriefTraining(res.data)),
      catchError(() => of(debrief))
    );
  }

  saveMatchDebrief(debrief: DebriefMatch): Observable<DebriefMatch> {
    const body = {
      teamId: debrief.teamId,
      coachUserId: debrief.coachUserId,
      matchPreparationId: debrief.matchPreparationId,
      date: debrief.date,
      rivalName: debrief.rivalName || null,
      matchResult: debrief.result || null,
      answers: JSON.stringify(debrief.answers),
      attendanceContext: debrief.attendanceContext ? JSON.stringify(debrief.attendanceContext) : null,
      customQuestions: debrief.customQuestions ? JSON.stringify(debrief.customQuestions) : null,
      status: debrief.status || 'completed'
    };
    return this.http.post<any>(this.baseUrl + 'match', body).pipe(
      map(res => this.mapToDebriefMatch(res.data)),
      catchError(() => of(debrief))
    );
  }

  // ═══════════════════════════════════════
  // GENERAR INFORME
  // ═══════════════════════════════════════

  generateReport(debriefId: number, type: DebriefType, lang: string = 'es'): Observable<DebriefReport> {
    return this.getDebrief(debriefId).pipe(
      map(debrief => {
        if (!debrief) {
          return {
            reportId: 0, debriefId, type,
            generatedAt: new Date().toISOString(),
            sections: [], summary: 'No se encontró el debrief.',
            recommendations: [], rawAnswers: []
          };
        }
        return this.buildMockReport(debrief, type);
      }),
      catchError(() => of({
        reportId: 0, debriefId, type,
        generatedAt: new Date().toISOString(),
        sections: [], summary: 'Error al generar informe.',
        recommendations: [], rawAnswers: []
      }))
    );
  }

  saveReport(debriefId: number, report: DebriefReport): Observable<DebriefReport> {
    const body = {
      type: report.type,
      sections: JSON.stringify(report.sections),
      summary: report.summary,
      recommendations: JSON.stringify(report.recommendations),
      attendanceSummary: report.attendanceSummary || null,
      rawAnswers: JSON.stringify(report.rawAnswers)
    };
    return this.http.post<any>(this.baseUrl + `${debriefId}/report`, body).pipe(
      map(res => this.mapToReport(res.data)),
      catchError(() => of(report))
    );
  }

  private buildMockReport(debrief: DebriefTraining | DebriefMatch, type: DebriefType): DebriefReport {
    const sections: ReportSection[] = [];

    const ratingAnswer = debrief.answers.find(a => a.questionId === (type === 'training' ? 'TQ1' : 'MQ1'));
    if (ratingAnswer) {
      sections.push({
        titleKey: 'DEBRIEF.REPORT.SECTION_RATING',
        icon: 'bi-star-fill',
        content: `Valoración general: ${ratingAnswer.quickValue}/5`,
        rating: ratingAnswer.quickValue as number
      });
    }

    const objectiveAnswer = debrief.answers.find(a => a.questionId === (type === 'training' ? 'TQ2' : 'MQ2'));
    if (objectiveAnswer) {
      sections.push({
        titleKey: 'DEBRIEF.REPORT.SECTION_OBJECTIVES',
        icon: 'bi-bullseye',
        content: `Cumplimiento de objetivos: ${objectiveAnswer.quickValue}`,
      });
    }

    if (debrief.attendanceContext && !debrief.attendanceContext.noRecordsAvailable) {
      sections.push({
        titleKey: 'DEBRIEF.REPORT.SECTION_ATTENDANCE',
        icon: 'bi-people-fill',
        content: `Asistencia: ${debrief.attendanceContext.present}/${debrief.attendanceContext.totalPlayers} ` +
          `(${debrief.attendanceContext.attendanceRate}%). ` +
          (debrief.attendanceContext.absent > 0
            ? `Ausentes: ${debrief.attendanceContext.absentPlayerNames.join(', ')}.`
            : 'Todos presentes.'),
      });
    }

    debrief.answers
      .filter(a => a.textValue || a.audioTranscript)
      .forEach(a => {
        sections.push({
          titleKey: 'DEBRIEF.REPORT.SECTION_NOTES',
          icon: 'bi-chat-text-fill',
          content: a.textValue || a.audioTranscript || '',
        });
      });

    const playerAnswers = debrief.answers.filter(a => a.selectedPlayers && a.selectedPlayers.length > 0);
    if (playerAnswers.length > 0) {
      sections.push({
        titleKey: 'DEBRIEF.REPORT.SECTION_HIGHLIGHTS',
        icon: 'bi-person-check-fill',
        content: `Jugadores mencionados en ${playerAnswers.length} categoría(s).`,
      });
    }

    return {
      reportId: 0,
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
    return this.http.get<any>(this.baseUrl + `${debriefId}/report`).pipe(
      map(res => res?.data ? this.mapToReport(res.data) : null),
      catchError(() => of(null))
    );
  }

  // ═══════════════════════════════════════
  // HISTORIAL
  // ═══════════════════════════════════════

  getHistory(teamId: number): Observable<DebriefHistoryItem[]> {
    if (isDemoMode()) {
      return of(DemoDataService.getDemoDebriefHistory() as DebriefHistoryItem[]);
    }
    return this.http.get<any>(this.baseUrl + `history/${teamId}`).pipe(
      map(res => {
        if (!res?.data) return [];
        return (res.data as any[]).map(d => ({
          debriefId: d.debriefId,
          type: d.type as DebriefType,
          date: d.date,
          rivalName: d.rivalName || undefined,
          status: d.status,
          summary: d.answers ? JSON.parse(d.answers).length + ' respuestas' : '0 respuestas'
        }));
      }),
      catchError(() => of([]))
    );
  }

  getDebrief(debriefId: number): Observable<(DebriefTraining | DebriefMatch) | null> {
    return this.http.get<any>(this.baseUrl + `${debriefId}`).pipe(
      map(res => {
        if (!res?.data) return null;
        const d = res.data;
        if (d.type === 'match') {
          return this.mapToDebriefMatch(d);
        }
        return this.mapToDebriefTraining(d);
      }),
      catchError(() => of(null))
    );
  }

  // ═══════════════════════════════════════
  // ASISTENCIA CONTEXTUAL
  // ═══════════════════════════════════════

  getAttendanceContext(teamId: number, referenceDate: string): Observable<AttendanceContext> {
    // TODO: Connect to real training attendance endpoint when available
    const refDate = new Date(referenceDate);
    const startOfWeek = new Date(refDate);
    startOfWeek.setDate(refDate.getDate() - refDate.getDay() + 1);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

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
  // MAPPERS (backend entity -> frontend model)
  // ═══════════════════════════════════════

  private mapToDebriefTraining(d: any): DebriefTraining {
    return {
      debriefId: d.debriefId,
      trainingSessionId: d.trainingSessionId,
      teamId: d.teamId,
      coachUserId: d.coachUserId,
      date: d.date,
      answers: d.answers ? JSON.parse(d.answers) : [],
      attendanceContext: d.attendanceContext ? JSON.parse(d.attendanceContext) : undefined,
      customQuestions: d.customQuestions ? JSON.parse(d.customQuestions) : undefined,
      status: d.status,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt
    };
  }

  private mapToDebriefMatch(d: any): DebriefMatch {
    return {
      debriefId: d.debriefId,
      matchPreparationId: d.matchPreparationId,
      teamId: d.teamId,
      coachUserId: d.coachUserId,
      date: d.date,
      rivalName: d.rivalName,
      result: d.matchResult,
      answers: d.answers ? JSON.parse(d.answers) : [],
      attendanceContext: d.attendanceContext ? JSON.parse(d.attendanceContext) : undefined,
      customQuestions: d.customQuestions ? JSON.parse(d.customQuestions) : undefined,
      status: d.status,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt
    };
  }

  private mapToReport(d: any): DebriefReport {
    return {
      reportId: d.reportId,
      debriefId: d.debriefId,
      type: d.type as DebriefType,
      generatedAt: d.generatedAt,
      sections: d.sections ? JSON.parse(d.sections) : [],
      summary: d.summary || '',
      recommendations: d.recommendations ? JSON.parse(d.recommendations) : [],
      attendanceSummary: d.attendanceSummary,
      rawAnswers: d.rawAnswers ? JSON.parse(d.rawAnswers) : []
    };
  }
}
