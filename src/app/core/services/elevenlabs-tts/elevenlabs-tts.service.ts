import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

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
   * Convierte texto a audio usando ElevenLabs TTS.
   * Devuelve un Observable con el Blob de audio (mp3) o falla si no hay config o la API falla.
   */
  speak(text: string): Observable<Blob> {
    const env = environment as { elevenLabsApiKey?: string; elevenLabsVoiceId?: string };
    const apiKey = env.elevenLabsApiKey;
    const voiceId = env.elevenLabsVoiceId;
    if (!apiKey || !voiceId) {
      return of(new Blob());
    }
    const url = `${ELEVEN_LABS_BASE}/${voiceId}`;
    const headers = new HttpHeaders({
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg'
    });
    const body = {
      text: text.trim() || ' ',
      model_id: DEFAULT_MODEL_ID
    };
    return this.http.post(url, body, { headers, responseType: 'blob' }).pipe(
      catchError(() => of(new Blob()))
    );
  }
}
