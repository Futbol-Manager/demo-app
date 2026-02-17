import { Injectable } from '@angular/core';
import { Observable, Subject, BehaviorSubject } from 'rxjs';

export interface SpeechRecognitionResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
}

@Injectable({
  providedIn: 'root'
})
export class VoiceRecognitionService {
  private recognition: any;
  private isRecognitionSupported = false;
  private transcriptSubject = new Subject<SpeechRecognitionResult>();
  private isListeningSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new Subject<string>();

  transcript$ = this.transcriptSubject.asObservable();
  isListening$ = this.isListeningSubject.asObservable();
  error$ = this.errorSubject.asObservable();

  constructor() {
    this.initializeRecognition();
  }

  private initializeRecognition(): void {
    // Check for browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      this.isRecognitionSupported = false;
      return;
    }

    this.isRecognitionSupported = true;
    this.recognition = new SpeechRecognition();
    
    // Configuration
    this.recognition.continuous = false;  // Stop after user finishes speaking
    this.recognition.interimResults = true;  // Show partial results while speaking
    this.recognition.lang = 'es-ES';  // Spanish by default
    this.recognition.maxAlternatives = 1;

    // Event handlers
    this.recognition.onstart = () => {
      this.isListeningSubject.next(true);
    };

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
          this.transcriptSubject.next({
            transcript: finalTranscript,
            isFinal: true,
            confidence
          });
        } else {
          interimTranscript += transcript;
          this.transcriptSubject.next({
            transcript: interimTranscript,
            isFinal: false,
            confidence
          });
        }
      }
    };

    this.recognition.onerror = (event: any) => {
      this.isListeningSubject.next(false);
      
      let errorMessage = 'Error en el reconocimiento de voz';
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No se detectó voz. Intenta de nuevo.';
          break;
        case 'audio-capture':
          errorMessage = 'No se pudo acceder al micrófono.';
          break;
        case 'not-allowed':
          errorMessage = 'Permiso de micrófono denegado.';
          break;
        case 'network':
          errorMessage = 'Error de conexión.';
          break;
        case 'aborted':
          // User stopped recording, this is normal
          return;
      }
      
      this.errorSubject.next(errorMessage);
    };

    this.recognition.onend = () => {
      this.isListeningSubject.next(false);
    };
  }

  isSupported(): boolean {
    return this.isRecognitionSupported;
  }

  start(lang: string = 'es-ES'): void {
    if (!this.isRecognitionSupported) {
      this.errorSubject.next('El reconocimiento de voz no está soportado en este navegador.');
      return;
    }

    if (this.isListeningSubject.value) {
      // Already listening
      return;
    }

    try {
      this.recognition.lang = lang;
      this.recognition.start();
    } catch (error) {
      this.errorSubject.next('Error al iniciar el reconocimiento de voz.');
    }
  }

  stop(): void {
    if (!this.isRecognitionSupported || !this.isListeningSubject.value) {
      return;
    }

    try {
      this.recognition.stop();
    } catch (error) {
      // Ignore errors when stopping
    }
  }

  abort(): void {
    if (!this.isRecognitionSupported) {
      return;
    }

    try {
      this.recognition.abort();
      this.isListeningSubject.next(false);
    } catch (error) {
      // Ignore errors when aborting
    }
  }
}
