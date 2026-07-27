import { Injectable, NgZone } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { isDemoMode } from '../demo/demo-mode';

/**
 * Eventos del streaming SSE del chatbot del manual.
 */
export type ManualStreamEvent =
  | { type: 'text'; text: string }
  | { type: 'done' }
  | { type: 'error'; message: string };

export interface ManualChatResponse {
  success: boolean;
  response?: string;
  error?: string;
  message?: string;
}

/** Sección del manual servida por GET /rest/ai/manual/sections */
export interface ManualSection {
  slug: string;
  header: string;
  content: string;
}

/**
 * Cliente HTTP para el chatbot "Pregunta al manual". Versión demo-app: en modo
 * demo devuelve secciones del manual ficticias inline y respuestas canned,
 * incluido un streaming simulado token a token.
 */
@Injectable({ providedIn: 'root' })
export class ManualChatService {

  private baseUrl = environment.apiUrl + 'ai/manual';

  constructor(private http: HttpClient, private ngZone: NgZone) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  sendMessage(
    userId: number,
    profileId: number,
    message: string,
    history: { role: string; text: string }[] = [],
    language: string = 'es',
    platform: string = 'web'
  ): Observable<ManualChatResponse> {
    if (isDemoMode()) {
      return of({ success: true, response: this.mockAnswer(message) });
    }
    const body = { userId, profileId, platform, message, language, history };
    return this.http.post<ManualChatResponse>(
      `${this.baseUrl}/chat`,
      body,
      { headers: this.getHeaders() }
    ).pipe(
      timeout(60000),
      catchError(err => {
        const isTimeout = err?.name === 'TimeoutError';
        return of<ManualChatResponse>({
          success: false,
          error: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
          message: isTimeout
            ? 'La respuesta tardó demasiado. Inténtalo de nuevo.'
            : 'Error de conexión. Inténtalo de nuevo.'
        });
      })
    );
  }

  getSections(profileId: number): Observable<ManualSection[]> {
    if (isDemoMode()) {
      return of(this.mockSections());
    }
    return this.http.get<ManualSection[]>(
      `${this.baseUrl}/sections`,
      {
        headers: this.getHeaders(),
        params: { profileId: String(profileId) }
      }
    ).pipe(
      timeout(15000),
      catchError(() => of<ManualSection[]>([]))
    );
  }

  sendMessageStream(
    userId: number,
    profileId: number,
    message: string,
    history: { role: string; text: string }[] = [],
    language: string = 'es',
    platform: string = 'web'
  ): Observable<ManualStreamEvent> {
    if (isDemoMode()) {
      return this.mockStream(this.mockAnswer(message));
    }
    const body = { userId, profileId, platform, message, language, history };
    const streamUrl = `${this.baseUrl}/chat/stream`;
    const token = localStorage.getItem('token') || '';

    return new Observable(subscriber => {
      let done = false;
      const controller = new AbortController();

      fetch(streamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body),
        signal: controller.signal
      })
        .then(response => {
          if (!response.ok) {
            response.json()
              .then(err => this.ngZone.run(() => {
                subscriber.next({ type: 'error', message: err?.message || 'Error al conectar.' });
                subscriber.complete();
              }))
              .catch(() => this.ngZone.run(() => {
                subscriber.next({ type: 'error', message: 'Error al conectar.' });
                subscriber.complete();
              }));
            return;
          }

          const reader = response.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          const read = (): void => {
            reader.read().then(({ done: streamDone, value }) => {
              if (done) return;
              if (streamDone) {
                this.ngZone.run(() => {
                  subscriber.next({ type: 'done' });
                  subscriber.complete();
                });
                return;
              }

              buffer += decoder.decode(value, { stream: true });
              const parts = buffer.split('\n\n');
              buffer = parts.pop() ?? '';

              for (const part of parts) {
                for (const line of part.split('\n')) {
                  if (!line.startsWith('data:')) continue;
                  const raw = line.slice(5).trim();
                  if (!raw) continue;

                  if (raw === '[DONE]') {
                    this.ngZone.run(() => {
                      subscriber.next({ type: 'done' });
                      subscriber.complete();
                    });
                    done = true;
                    return;
                  }
                  if (raw.startsWith('ERROR:')) {
                    this.ngZone.run(() => {
                      subscriber.next({ type: 'error', message: raw.slice(6) });
                      subscriber.complete();
                    });
                    done = true;
                    return;
                  }
                  try {
                    const text: string = JSON.parse(raw);
                    if (text && text.length > 0) {
                      this.ngZone.run(() => subscriber.next({ type: 'text', text }));
                    }
                  } catch { /* ignorar JSON malformado */ }
                }
              }
              read();
            }).catch(err => {
              if (!done) {
                this.ngZone.run(() => {
                  subscriber.next({ type: 'error', message: 'Conexión interrumpida.' });
                  subscriber.complete();
                });
              }
            });
          };
          read();
        })
        .catch(err => {
          if (!done && err?.name !== 'AbortError') {
            this.ngZone.run(() => {
              subscriber.next({ type: 'error', message: 'Error al conectar con el manual.' });
              subscriber.complete();
            });
          }
        });

      return () => { done = true; controller.abort(); };
    });
  }

  // ── Demo helpers ──────────────────────────────────────────────────
  private mockAnswer(message: string): string {
    const q = (message || '').toLowerCase();
    if (q.includes('cuota') || q.includes('pago')) {
      return 'En la sección **Cuotas** puedes crear cargos, ver el estado de los pagos por jugador y descargar recibos. Los pagos se procesan de forma segura y quedan registrados en el club.';
    }
    if (q.includes('equipo')) {
      return 'Desde **Equipos** gestionas las plantillas, convocatorias y la información de cada categoría del club.';
    }
    return 'Este es el asistente del manual en modo demostración. En la versión completa responde a tus preguntas sobre el uso de Sphaira Tech basándose en el manual oficial.';
  }

  private mockStream(answer: string): Observable<ManualStreamEvent> {
    return new Observable<ManualStreamEvent>(subscriber => {
      const tokens = answer.split(/(\s+)/);
      let i = 0;
      const id = setInterval(() => {
        if (i >= tokens.length) {
          clearInterval(id);
          subscriber.next({ type: 'done' });
          subscriber.complete();
          return;
        }
        subscriber.next({ type: 'text', text: tokens[i] });
        i++;
      }, 35);
      return () => clearInterval(id);
    });
  }

  private mockSections(): ManualSection[] {
    return [
      { slug: 'guia-completa', header: 'GUIA COMPLETA DE SPHAIRA TECH - PERFIL CLUB (WEB)', content: 'Sphaira Tech es la plataforma de gestion integral para tu club.\nDesde el panel puedes gestionar equipos, jugadores, pagos y comunicacion.' },
      { slug: 'modulo-inicio', header: 'MODULO: INICIO (CUADRO DE MANDO)', content: 'Como llegar: /dashboard/inicio\nPara que sirve: es la pantalla principal con accesos rapidos a los modulos del club.' },
      { slug: 'modulo-equipos', header: 'MODULO: EQUIPOS', content: 'Como llegar: /dashboard/equipos\nQue ves: el listado de equipos del club con sus categorias y plantillas.' },
      { slug: 'modulo-pagos', header: 'MODULO: PAGOS (GESTION DE CUOTAS)', content: 'Como llegar: /dashboard/new-cuotas\nPara que sirve: crear y cobrar cuotas a los jugadores del club.\nComisiones: se aplican las comisiones estandar de la pasarela de pago.' },
      { slug: 'modulo-notificaciones', header: 'MODULO: NOTIFICACIONES', content: 'Como llegar: /dashboard/notificaciones\nPara que sirve: enviar comunicaciones a jugadores, padres y staff del club.' },
    ];
  }
}
