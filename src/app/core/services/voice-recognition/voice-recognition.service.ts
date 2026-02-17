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
  private silenceTimer: any = null;
  private readonly SILENCE_TIMEOUT_MS = 5000;

  transcript$ = this.transcriptSubject.asObservable();
  isListening$ = this.isListeningSubject.asObservable();
  error$ = this.errorSubject.asObservable();

  constructor() {
    this.initializeRecognition();
  }

  private initializeRecognition(): void {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      this.isRecognitionSupported = false;
      return;
    }

    this.isRecognitionSupported = true;
    this.recognition = new SpeechRecognition();
    
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'es-ES';
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.isListeningSubject.next(true);
      this.resetSilenceTimer();
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

      this.resetSilenceTimer();
    };

    this.recognition.onerror = (event: any) => {
      let errorMessage = 'Error en el reconocimiento de voz';
      
      switch (event.error) {
        case 'no-speech':
          this.stopDueToSilence();
          return;
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
          return;
      }
      
      this.clearSilenceTimer();
      this.isListeningSubject.next(false);
      this.errorSubject.next(errorMessage);
    };

    this.recognition.onend = () => {
      this.clearSilenceTimer();
      this.isListeningSubject.next(false);
    };
  }

  private resetSilenceTimer(): void {
    this.clearSilenceTimer();
    this.silenceTimer = setTimeout(() => {
      this.stopDueToSilence();
    }, this.SILENCE_TIMEOUT_MS);
  }

  private clearSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  private stopDueToSilence(): void {
    this.clearSilenceTimer();
    if (this.isListeningSubject.value) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
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

    this.clearSilenceTimer();
    try {
      this.recognition.stop();
    } catch (error) {}
  }

  abort(): void {
    if (!this.isRecognitionSupported) {
      return;
    }

    this.clearSilenceTimer();
    try {
      this.recognition.abort();
      this.isListeningSubject.next(false);
    } catch (error) {}
  }
}
