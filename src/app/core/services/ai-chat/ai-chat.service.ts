import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface AiPendingAction {
  function: string;
  arguments: string;
  preview: string;
}

export interface AiChatResponse {
  success: boolean;
  response?: string;
  creditsRemaining?: number;
  tokensUsed?: number;
  error?: string;
  message?: string;
  hasActions?: boolean;
  pendingActions?: AiPendingAction[];
  actionToken?: string;
}

export interface AiActionResult {
  success: boolean;
  created?: number;
  edited?: number;
  deleted?: number;
  details?: string[];
  summary?: string;
  errors?: string[];
  error?: string;
  message?: string;
}

export interface AiCreditsInfo {
  creditsFree: number;
  creditsPurchased: number;
  creditsUsed: number;
  creditsAvailable: number;
}

export interface AiUsageClub {
  clubId: number;
  totalMessages: number;
  totalCost: number;
  usersUsage: AiUsageUser[];
  recentLogs: any[];
}

export interface AiUsageUser {
  userId: number;
  userName?: string;
  totalMessages: number;
  totalCost: number;
}

export interface WeeklyPlannerTask {
  description: string;
  rules?: string;
  worktime?: string;
  space?: string;
  material?: string;
  work?: string;
  estrategia?: string;
  intencion?: string;
}

export interface WeeklyPlannerSession {
  dayName: string;
  objectiveSession: string;
  warmUp?: string;
  addressSession?: string;
  loadLevel?: string;
  rpe?: number;
  tasks?: WeeklyPlannerTask[];
}

export interface WeeklyPlannerResponse extends AiChatResponse {
  sessions?: WeeklyPlannerSession[];
}

export interface WeeklyPlannerInput {
  userId: number;
  clubId: number | null;
  teamId: number | null;
  teamName?: string;
  // Step 1
  trainingDays: string[];
  // Step 2
  hasMatch: boolean;
  matchDay?: string;
  matchTime?: string;
  matchLocation?: string;
  matchImportance?: string;
  // Step 3
  sessionDurationMinutes: number;
  hasDoubleSession: boolean;
  doubleSessionDay?: string;
  // Step 4
  playersAvailable: number;
  fatigue: string;
  // Step 5
  objectives: string[];
  tacticSubobjectives?: string[];
  technicalSubobjectives?: string[];
  physicalSubobjectives?: string[];
  // Step 6
  seasonMoment?: string;
  lastMatchResult?: string;
  weeklyLoadHistory?: string;
  // Step 7
  notes?: string;
}

export interface AiGlobalUsage {
  totalMessages: number;
  totalCost: number;
  totalCostUser: number;
  dailyUsage: { date: string; count: number }[];
  clubsUsage: { clubId: number; clubName?: string; totalMessages: number; totalCost: number }[];
}

@Injectable({
  providedIn: 'root'
})
export class AiChatService {

  private baseUrl = environment.apiUrl + 'ai';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * Envía un mensaje al asistente IA. Consume 1 crédito.
   * history: array opcional de {role, text} con los últimos mensajes de la conversación.
   */
  sendMessage(userId: number, clubId: number | null, screenContext: string, message: string, apiKeyType: string = 'users', teamId?: number | null, history?: {role: string, text: string}[], hasClientContext?: boolean): Observable<AiChatResponse> {
    const body: any = { userId, clubId, screenContext, message, apiKeyType };
    if (teamId) body.teamId = teamId;
    if (history && history.length > 0) body.history = history;
    if (hasClientContext) body.hasClientContext = true;
    return this.http.post<AiChatResponse>(`${this.baseUrl}/chat`, body, { headers: this.getHeaders() }).pipe(
      timeout(45000),
      catchError(err => {
        console.error('[AiChatService] Error:', err);
        const isTimeout = err?.name === 'TimeoutError';
        return of({
          success: false,
          error: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
          message: isTimeout
            ? 'La respuesta tardó demasiado. Inténtalo de nuevo.'
            : 'Error de conexión. Inténtalo de nuevo.'
        });
      })
    );
  }

  /**
   * Reescribe un campo de texto clínico con IA.
   * Usa el endpoint /rewrite (ligero: sin contexto de club, sin herramientas, max 600 tokens).
   * ~60-70% menos tokens que sendMessage() para este caso de uso.
   */
  rewriteText(userId: number, clubId: number | null, fieldType: string, text: string, context?: string): Observable<AiChatResponse> {
    const body = { userId, clubId, fieldType, text, context: context ?? '' };
    return this.http.post<AiChatResponse>(`${this.baseUrl}/rewrite`, body, { headers: this.getHeaders() }).pipe(
      timeout(30000),
      catchError(err => {
        console.error('[AiChatService] rewriteText error:', err);
        const isTimeout = err?.name === 'TimeoutError';
        return of({
          success: false,
          error: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
          message: isTimeout
            ? 'La respuesta tardó demasiado. Inténtalo de nuevo.'
            : 'Error de conexión. Inténtalo de nuevo.'
        });
      })
    );
  }

  /**
   * Ejecuta acciones confirmadas por el usuario. NO consume crédito.
   */
  executeActions(actionToken: string): Observable<AiActionResult> {
    return this.http.post<AiActionResult>(`${this.baseUrl}/actions/execute`, { actionToken }, { headers: this.getHeaders() }).pipe(
      timeout(30000),
      catchError(err => {
        console.error('[AiChatService] Execute actions error:', err);
        return of({
          success: false,
          error: 'EXECUTION_ERROR',
          message: 'Error al ejecutar las acciones. Inténtalo de nuevo.'
        });
      })
    );
  }

  /**
   * Obtiene los créditos del usuario.
   */
  getCredits(userId: number): Observable<AiCreditsInfo> {
    return this.http.get<AiCreditsInfo>(`${this.baseUrl}/credits/${userId}`, { headers: this.getHeaders() }).pipe(
      timeout(10000),
      catchError(err => {
        console.error('[AiChatService] Error getting credits:', err);
        return of({ creditsFree: 50, creditsPurchased: 0, creditsUsed: 0, creditsAvailable: 50 });
      })
    );
  }

  /**
   * Uso de IA por club (admin).
   */
  getUsageByClub(clubId: number): Observable<AiUsageClub> {
    return this.http.get<AiUsageClub>(`${this.baseUrl}/usage/club/${clubId}`, { headers: this.getHeaders() });
  }

  /**
   * Uso de IA por usuario (admin).
   */
  getUsageByUser(userId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/usage/user/${userId}`, { headers: this.getHeaders() });
  }

  /**
   * KPIs globales de uso de IA (admin).
   */
  getGlobalUsage(): Observable<AiGlobalUsage> {
    return this.http.get<AiGlobalUsage>(`${this.baseUrl}/usage/global`, { headers: this.getHeaders() });
  }

  /**
   * Comprar créditos (via Stripe). Agrega directamente sin pago.
   */
  purchaseCredits(userId: number, amount: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/credits/purchase`, { userId, amount }, { headers: this.getHeaders() });
  }

  /**
   * Lista las conversaciones del usuario desde la BD.
   */
  listHistory(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/history/list/${userId}`, { headers: this.getHeaders() }).pipe(
      timeout(10000),
      catchError(() => of([]))
    );
  }

  /**
   * Guarda o actualiza una conversación en la BD.
   * messages: array de {role, text}
   */
  saveHistory(userId: number, convId: string, title: string, clubId: number | null, screenContext: string, messages: {role: string, text: string}[]): Observable<any> {
    const body = { userId, convId, title, clubId, screenContext, messages };
    return this.http.post<any>(`${this.baseUrl}/history/save`, body, { headers: this.getHeaders() }).pipe(
      timeout(15000),
      catchError(() => of({ success: false }))
    );
  }

  /**
   * Obtiene los mensajes completos de una conversación.
   */
  getHistoryMessages(convId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/history/${convId}/messages`, { headers: this.getHeaders() }).pipe(
      timeout(10000),
      catchError(() => of([]))
    );
  }

  /**
   * Elimina una conversación y todos sus mensajes.
   */
  deleteHistory(convId: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/history/${convId}`, { headers: this.getHeaders() }).pipe(
      timeout(10000),
      catchError(() => of({ success: false }))
    );
  }

  /**
   * Genera un plan de entrenamiento semanal con IA.
   * Envía las respuestas del wizard al endpoint /rest/ai/weekly-planner.
   * Consume créditos IA (modelo Gemini 2.5 Pro por defecto).
   */
  weeklyPlanner(payload: WeeklyPlannerInput): Observable<WeeklyPlannerResponse> {
    return this.http.post<WeeklyPlannerResponse>(`${this.baseUrl}/weekly-planner`, payload, { headers: this.getHeaders() }).pipe(
      timeout(210000),
      catchError(err => {
        console.error('[AiChatService] weeklyPlanner error:', err);
        const isTimeout = err?.name === 'TimeoutError';
        return of<WeeklyPlannerResponse>({
          success: false,
          error: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
          message: isTimeout
            ? 'La generación del plan tardó demasiado. Inténtalo de nuevo.'
            : 'Error de conexión. Inténtalo de nuevo.'
        });
      })
    );
  }

  /**
   * Importa un calendario de liga desde un PDF.
   * La IA extrae los partidos del equipo y los propone como acciones createMatch.
   */
  importCalendar(userId: number, clubId: number | null, teamId: number, teamName: string, pdfFile: File): Observable<AiChatResponse> {
    const token = localStorage.getItem('token') || '';
    const formData = new FormData();
    formData.append('pdfFile', pdfFile, pdfFile.name);
    formData.append('userId', userId.toString());
    formData.append('teamId', teamId.toString());
    formData.append('teamName', teamName);
    if (clubId != null) formData.append('clubId', clubId.toString());

    return this.http.post<AiChatResponse>(`${this.baseUrl}/import-calendar`, formData, {
      headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` })
    }).pipe(
      timeout(60000),
      catchError(err => {
        console.error('[AiChatService] importCalendar error:', err);
        return of({
          success: false,
          error: 'NETWORK_ERROR',
          message: 'Error al procesar el PDF. Inténtalo de nuevo.'
        });
      })
    );
  }

  /**
   * Envía un mensaje al chatbot público de demo (sin autenticación).
   * Usa el endpoint /rest/ai/demo/chat que no requiere JWT.
   * Respuesta: { response: string } | { error: string }
   * El mensaje queda limitado a 200 caracteres por el backend.
   * @param clubContext Contexto del club demo (equipos, jugadores, partidos, lesiones...)
   *                   generado por buildDemoClubContext() — se inyecta en el system prompt del backend.
   */
  sendMessageDemo(
    message: string,
    history: { role: string; text: string }[],
    language = 'es',
    clubContext?: string
  ): Observable<{ response?: string; error?: string }> {
    const body: Record<string, unknown> = {
      message: message.slice(0, 200),
      history: history.map(m => ({ role: m.role, content: m.text })),
      context: 'demo',
      language,
    };
    if (clubContext) body['clubContext'] = clubContext;
    return this.http.post<{ response?: string; error?: string }>(
      `${this.baseUrl}/demo/chat`, body
    ).pipe(
      timeout(45000),
      catchError(err => {
        console.error('[AiChatService] Demo chat error:', err);
        const isTimeout = err?.name === 'TimeoutError';
        return of({
          error: isTimeout
            ? 'La respuesta tardó demasiado. Inténtalo de nuevo.'
            : 'Error de conexión. Inténtalo de nuevo.'
        });
      })
    );
  }

  /**
   * Crea una Stripe Checkout Session para comprar créditos.
   * Redirige al usuario a la pagina de pago de Stripe.
   */
  createCheckoutSession(userId: number, credits: number, priceEur: number): Observable<{ success: boolean; checkoutUrl?: string; sessionId?: string; error?: string }> {
    const successUrl = window.location.origin + '/dashboard/ai-credits-success';
    const cancelUrl = window.location.href;

    return this.http.post<any>(`${this.baseUrl}/credits/checkout`, {
      userId,
      credits,
      priceEur,
      successUrl,
      cancelUrl,
    }, { headers: this.getHeaders() }).pipe(
      timeout(15000),
      catchError(err => {
        console.error('[AiChatService] Checkout error:', err);
        return of({ success: false, error: 'Error al crear sesión de pago.' });
      })
    );
  }

  /**
   * Verifica el pago de una Checkout Session y acredita los créditos.
   */
  verifyCheckoutSession(sessionId: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/credits/checkout/verify`, { sessionId }, { headers: this.getHeaders() }).pipe(
      timeout(15000),
      catchError(err => {
        console.error('[AiChatService] Verify error:', err);
        return of({ success: false, error: 'Error al verificar pago.' });
      })
    );
  }
}
