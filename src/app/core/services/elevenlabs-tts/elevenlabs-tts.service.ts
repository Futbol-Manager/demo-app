import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

const ELEVEN_LABS_BASE = 'https://api.elevenlabs.io/v1/text-to-speech';
/** Modelo multilingüe recomendado para español */
const DEFAULT_MODEL_ID = 'eleven_multilingual_v2';

@Injectable({
  providedIn: 'root'
})
export class ElevenlabsTtsService {

  constructor(private http: HttpClient) {}

  /** Indica si ElevenLabs está configurado (API key y voice id). */
  get isAvailable(): boolean {
    const env = environment as { elevenLabsApiKey?: string; elevenLabsVoiceId?: string };
    return !!(env.elevenLabsApiKey && env.elevenLabsVoiceId);
  }

  /**
   * Convierte texto a audio usando ElevenLabs TTS con la voz configurada por defecto.
   */
  speak(text: string): Observable<Blob> {
    const env = environment as { elevenLabsApiKey?: string; elevenLabsVoiceId?: string };
    return this.speakWithVoice(text, env.elevenLabsApiKey, env.elevenLabsVoiceId);
  }

  /**
   * Convierte texto a audio usando la voz correspondiente al código de idioma ISO 639-1.
   * Si no hay voz configurada para ese idioma, usa elevenLabsVoiceId como fallback.
   */
  speakForLang(text: string, lang: string): Observable<Blob> {
    const env = environment as {
      elevenLabsApiKey?: string;
      elevenLabsVoiceId?: string;
      elevenLabsVoicesByLang?: Record<string, string>;
    };
    const voiceId = (env.elevenLabsVoicesByLang?.[lang]) ?? env.elevenLabsVoiceId;
    return this.speakWithVoice(text, env.elevenLabsApiKey, voiceId);
  }

  private speakWithVoice(text: string, apiKey?: string, voiceId?: string): Observable<Blob> {
    if (!apiKey || !voiceId) {
      return of(new Blob());
    }
    const url = `${ELEVEN_LABS_BASE}/${voiceId}`;
    const headers = new HttpHeaders({
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg'
    });
    const body = { text: text.trim() || ' ', model_id: DEFAULT_MODEL_ID };
    return this.http.post(url, body, { headers, responseType: 'blob' }).pipe(
      catchError(() => of(new Blob()))
    );
  }
}
