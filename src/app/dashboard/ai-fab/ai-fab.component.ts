import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { LoginService } from 'src/app/core/services/login/login.service';
import { User } from 'src/app/core/models/users/user.model';

/* ═══════════════════════════════════════
   INTERFACES
═══════════════════════════════════════ */

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  isTyping?: boolean;
}

interface SuggestionChip {
  icon: string;
  text: string;
  query: string;
}

/* ═══════════════════════════════════════
   RESPUESTAS RÁPIDAS PARA EL FAB
═══════════════════════════════════════ */

const FAB_RESPONSES_CLUB: { pattern: RegExp; response: string }[] = [
  { pattern: /cu[áa]ntos jugadores/i, response: 'El club tiene **127 jugadores** activos repartidos en 8 equipos.' },
  { pattern: /cuotas|pagar|pendientes/i, response: 'Hay **23 jugadores** con cuotas pendientes (4.560 € total).' },
  { pattern: /pr[óo]ximo.*(partido|partidos)/i, response: '⚽ Próximo: **Sábado 21 feb** — Cadete A vs CD Aluche (10:00h, Local)' },
  { pattern: /estad[íi]sticas/i, response: '📊 87 partidos jugados — 48% victorias — 198 goles a favor.' },
  { pattern: /lesion|lesionados/i, response: '🏥 Hay **5 jugadores lesionados** actualmente en el club.' },
  { pattern: /entrenamiento/i, response: '📋 **14 entrenamientos** programados esta semana.' },
  { pattern: /(hola|hey|buenas)/i, response: '¡Hola! 👋 Soy el asistente rápido. ¿En qué puedo ayudarte?' },
  { pattern: /(ayuda|qu[ée] puedes)/i, response: 'Pregúntame sobre jugadores, cuotas, partidos, estadísticas o lesiones. Para más detalle, ve al Asistente de IA completo.' },
];

const FAB_RESPONSES_COACH: { pattern: RegExp; response: string }[] = [
  { pattern: /entrenamiento/i, response: '📋 Tienes **3 entrenamientos** esta semana (Lun, Mié, Vie).' },
  { pattern: /pr[óo]ximo.*(partido|partidos)/i, response: '⚽ Próximo: **Sábado 21 feb** vs CD Aluche (10:00h, Local)' },
  { pattern: /estad[íi]sticas/i, response: '📊 18 partidos — 67% victorias — 2º clasificado.' },
  { pattern: /lesion|lesionados|plantilla/i, response: '🏥 **2 lesionados**: David López (fibrilar) y Andrés Ruiz (tendinitis). 18 disponibles.' },
  { pattern: /t[áa]ctica|formaci[óo]n/i, response: '📐 Tu 4-3-3 tiene 71% de victorias. El 4-2-3-1 como alternativa tiene 50%.' },
  { pattern: /ejercicio|sesi[óo]n/i, response: '💡 Sugerencia: Rondo 4v2 + Posesión 5v5 + Partido reducido 7v7.' },
  { pattern: /(hola|hey|buenas)/i, response: '¡Hola, míster! ⚽ ¿En qué puedo ayudarte?' },
  { pattern: /(ayuda|qu[ée] puedes)/i, response: 'Pregúntame sobre entrenamientos, partidos, estadísticas o plantilla. Para más detalle, ve al Asistente de IA.' },
];

const FAB_DEFAULT = 'Puedo ayudarte rápidamente con consultas básicas. Para respuestas más completas, ve al **Asistente de IA** desde el menú.';

/* ═══════════════════════════════════════
   COMPONENTE
═══════════════════════════════════════ */

@Component({
  selector: 'app-ai-fab',
  templateUrl: './ai-fab.component.html',
  styleUrls: ['./ai-fab.component.scss'],
})
export class AiFabComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('fabChatBody') fabChatBody!: ElementRef<HTMLDivElement>;

  isOpen = false;
  isVisible = true;
  messages: ChatMessage[] = [];
  userInput = '';
  isResponding = false;
  private msgIdCounter = 0;
  private shouldScroll = false;
  private subs: Subscription[] = [];
  private profileId = 0;

  quickSuggestions: SuggestionChip[] = [];

  private clubSuggestions: SuggestionChip[] = [
    { icon: 'bi-people-fill', text: 'Jugadores', query: '¿Cuántos jugadores hay?' },
    { icon: 'bi-cash-coin', text: 'Cuotas', query: 'Cuotas pendientes' },
    { icon: 'bi-trophy', text: 'Partidos', query: 'Próximo partido' },
    { icon: 'bi-bandaid', text: 'Lesiones', query: 'Jugadores lesionados' },
  ];

  private coachSuggestions: SuggestionChip[] = [
    { icon: 'bi-clipboard-check', text: 'Entrenamientos', query: 'Entrenamientos esta semana' },
    { icon: 'bi-trophy', text: 'Partido', query: 'Próximo partido' },
    { icon: 'bi-graph-up', text: 'Estadísticas', query: 'Estadísticas del equipo' },
    { icon: 'bi-heart-pulse', text: 'Plantilla', query: 'Estado de la plantilla' },
  ];

  constructor(
    private loginService: LoginService,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.loginService.usuarioActual.subscribe((user) => {
        if (user) {
          this.profileId = user.profileType?.profileId || 0;
          this.quickSuggestions = this.profileId === 2 ? this.coachSuggestions : this.clubSuggestions;
          // Ocultar para perfiles que no son club(1) ni entrenador(2)
          this.isVisible = this.profileId === 1 || this.profileId === 2;
        }
      })
    );

    // Ocultar el FAB cuando estamos en la pantalla del asistente de IA
    this.subs.push(
      this.router.events.pipe(
        filter(e => e instanceof NavigationEnd)
      ).subscribe((e: any) => {
        const url = (e as NavigationEnd).urlAfterRedirects || (e as NavigationEnd).url;
        if (url.includes('asistente-ia')) {
          this.isOpen = false;
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  /* ═══════════════════════════════════════
     TOGGLE
  ═══════════════════════════════════════ */

  toggleChat(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen && this.messages.length === 0) {
      this.addAssistantMessage(
        this.profileId === 2
          ? '¡Hola, míster! ⚽ Pregúntame lo que necesites.'
          : '¡Hola! 👋 Soy tu asistente rápido. ¿En qué te ayudo?'
      );
    }
  }

  goToFullAssistant(): void {
    this.isOpen = false;
    if (this.profileId === 2) {
      this.router.navigate(['/dashboard/asistente-ia-coach']);
    } else {
      this.router.navigate(['/dashboard/asistente-ia']);
    }
  }

  /* ═══════════════════════════════════════
     ENVIAR MENSAJE
  ═══════════════════════════════════════ */

  sendMessage(): void {
    const text = this.userInput.trim();
    if (!text || this.isResponding) return;

    this.messages.push({
      id: ++this.msgIdCounter,
      role: 'user',
      text,
      timestamp: new Date(),
    });
    this.userInput = '';
    this.shouldScroll = true;
    this.isResponding = true;

    const typingMsg: ChatMessage = {
      id: ++this.msgIdCounter,
      role: 'assistant',
      text: '',
      timestamp: new Date(),
      isTyping: true,
    };
    this.messages.push(typingMsg);

    const delay = 600 + Math.random() * 800;
    setTimeout(() => {
      const idx = this.messages.indexOf(typingMsg);
      if (idx > -1) this.messages.splice(idx, 1);

      const response = this.getResponse(text);
      this.addAssistantMessage(response);
      this.isResponding = false;
    }, delay);
  }

  sendQuick(chip: SuggestionChip): void {
    this.userInput = chip.query;
    this.sendMessage();
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  /* ═══════════════════════════════════════
     RESPUESTAS
  ═══════════════════════════════════════ */

  private getResponse(text: string): string {
    const responses = this.profileId === 2 ? FAB_RESPONSES_COACH : FAB_RESPONSES_CLUB;
    for (const entry of responses) {
      if (entry.pattern.test(text)) {
        return entry.response;
      }
    }
    return FAB_DEFAULT;
  }

  /* ═══════════════════════════════════════
     HELPERS
  ═══════════════════════════════════════ */

  private addAssistantMessage(text: string): void {
    this.messages.push({
      id: ++this.msgIdCounter,
      role: 'assistant',
      text,
      timestamp: new Date(),
    });
    this.shouldScroll = true;
  }

  private scrollToBottom(): void {
    if (this.fabChatBody?.nativeElement) {
      const el = this.fabChatBody.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  formatText(value: string): SafeHtml {
    if (!value) return '';
    let html = value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\n/g, '<br>');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  trackByMsgId(index: number, msg: ChatMessage): number {
    return msg.id;
  }
}
