import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject, BehaviorSubject } from 'rxjs';

export interface SpeechResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export interface SpeechError {
  error: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class SpeechRecognitionService {

  private recognition: any = null;
  private _isListening$ = new BehaviorSubject<boolean>(false);
  private _result$ = new Subject<SpeechResult>();
  private _error$ = new Subject<SpeechError>();
  private _interimTranscript$ = new Subject<string>();

  /** Observable: ¿está escuchando? */
  isListening$ = this._isListening$.asObservable();

  /** Observable: resultado final de transcripción */
  result$ = this._result$.asObservable();

  /** Observable: transcripción intermedia (mientras habla) */
  interimTranscript$ = this._interimTranscript$.asObservable();

  /** Observable: errores */
  error$ = this._error$.asObservable();

  constructor(private ngZone: NgZone) {}

  // ═══════════════════════════════════════
  // DISPONIBILIDAD
  // ═══════════════════════════════════════

  /** Verifica si el navegador soporta Web Speech API */
  isAvailable(): boolean {
    return !!(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    );
  }

  // ═══════════════════════════════════════
  // INICIAR ESCUCHA
  // ═══════════════════════════════════════

  /**
   * Empieza a capturar voz y transcribirla.
   * @param lang Idioma BCP-47: 'es-ES', 'en-US', 'fr-FR', etc.
   * @param continuous Si true sigue escuchando hasta que se detenga manualmente.
   */
  startListening(lang: string = 'es-ES', continuous: boolean = false): void {
    if (!this.isAvailable()) {
      this._error$.next({
        error: 'not-supported',
        message: 'Web Speech API no está disponible en este navegador.'
      });
      return;
    }

    // Detener reconocimiento previo si existía
    this.stopListening();

    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    this.recognition = new SpeechRecognitionAPI();
    this.recognition.lang = lang;
    this.recognition.continuous = continuous;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: any) => {
      this.ngZone.run(() => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
            this._result$.next({
              transcript: result[0].transcript.trim(),
              confidence: result[0].confidence,
              isFinal: true
            });
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        if (interimTranscript) {
          this._interimTranscript$.next(interimTranscript);
        }
      });
    };

    this.recognition.onerror = (event: any) => {
      this.ngZone.run(() => {
        this._isListening$.next(false);
        // 'no-speech' no es un error fatal, simplemente no se detectó voz
        if (event.error !== 'no-speech') {
          this._error$.next({
            error: event.error,
            message: this.getErrorMessage(event.error)
          });
        }
      });
    };

    this.recognition.onend = () => {
      this.ngZone.run(() => {
        this._isListening$.next(false);
      });
    };

    this.recognition.onstart = () => {
      this.ngZone.run(() => {
        this._isListening$.next(true);
      });
    };

    try {
      this.recognition.start();
    } catch (e) {
      this._error$.next({
        error: 'start-failed',
        message: 'No se pudo iniciar el reconocimiento de voz.'
      });
    }
  }

  // ═══════════════════════════════════════
  // DETENER ESCUCHA
  // ═══════════════════════════════════════

  stopListening(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) { /* ya detenido */ }
      this.recognition = null;
    }
    this._isListening$.next(false);
  }

  // ═══════════════════════════════════════
  // MAPEO DE IDIOMA APP → SPEECH LANG
  // ═══════════════════════════════════════

  /**
   * Convierte el código de idioma de la app (ngx-translate)
   * al formato BCP-47 que necesita SpeechRecognition.
   */
  mapAppLangToSpeechLang(appLang: string): string {
    const map: { [key: string]: string } = {
      'es': 'es-ES',
      'en': 'en-US',
      'fr': 'fr-FR',
      'pt': 'pt-PT',
      'de': 'de-DE',
      'it': 'it-IT'
    };
    return map[appLang] || 'es-ES';
  }

  // ═══════════════════════════════════════
  // MENSAJES DE ERROR
  // ═══════════════════════════════════════

  private getErrorMessage(error: string): string {
    const messages: { [key: string]: string } = {
      'not-allowed': 'Permiso de micrófono denegado. Por favor, habilítalo en la configuración del navegador.',
      'no-speech': 'No se detectó ninguna voz. Inténtalo de nuevo.',
      'audio-capture': 'No se encontró ningún micrófono. Conecta uno e inténtalo de nuevo.',
      'network': 'Error de red. Se necesita conexión a internet para la transcripción.',
      'aborted': 'El reconocimiento de voz fue cancelado.',
      'language-not-supported': 'El idioma seleccionado no está soportado.',
      'service-not-allowed': 'El servicio de reconocimiento de voz no está permitido.'
    };
    return messages[error] || `Error desconocido: ${error}`;
  }
}
