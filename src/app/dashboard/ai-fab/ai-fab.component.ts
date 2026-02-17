import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, HostListener } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter, finalize } from 'rxjs/operators';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { LoginService } from 'src/app/core/services/login/login.service';
import { AiChatService, AiCreditsInfo } from 'src/app/core/services/ai-chat/ai-chat.service';
import { User } from 'src/app/core/models/users/user.model';
import { VoiceRecognitionService } from 'src/app/core/services/voice-recognition/voice-recognition.service';

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

interface ConversationSummary {
  id: string;
  title: string;
  date: string;
  messageCount: number;
  messages: ChatMessage[];
}

@Component({
  selector: 'app-ai-fab',
  templateUrl: './ai-fab.component.html',
  styleUrls: ['./ai-fab.component.scss'],
})
export class AiFabComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('fabChatBody') fabChatBody!: ElementRef<HTMLDivElement>;

  isOpen = false;
  isExpanded = false;
  isVisible = true;
  messages: ChatMessage[] = [];
  userInput = '';
  isResponding = false;
  creditsAvailable = 50;
  showCreditsModal = false;
  private msgIdCounter = 0;
  private shouldScroll = false;
  private subs: Subscription[] = [];
  private chatSub: Subscription | null = null;
  private profileId = 0;
  userId = 0;
  private clubId: number | null = null;
  private currentScreenContext = 'dashboard';

  // Conversation history
  showHistoryPanel = false;
  conversations: ConversationSummary[] = [];
  currentConversationId: string | null = null;
  private readonly STORAGE_KEY = 'sphaira_fab_ai_history';

  // Drag state
  isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  popupX = 0;
  popupY = 0;
  private positionInitialized = false;

  // Resize state
  isResizing = false;
  private resizeDir = '';
  private resizeStartX = 0;
  private resizeStartY = 0;
  popupW = 390;
  popupH = 520;
  private readonly minW = 320;
  private readonly minH = 380;
  private readonly maxW = 700;
  private readonly maxH = 800;

  // Sizes for expand/contract
  private normalW = 390;
  private normalH = 520;
  private expandedW = 600;
  private expandedH = 700;

  quickSuggestions: SuggestionChip[] = [];
  showSuggestions = true;

  // Voice recognition
  isRecording = false;
  isVoiceSupported = false;
  private voiceTranscriptBase = '';  // Text before voice started

  private screenSuggestions: { [key: string]: SuggestionChip[] } = {
    'dashboard': [
      { icon: 'bi-bar-chart-line', text: 'Resumen del club', query: 'Resume el estado del club' },
      { icon: 'bi-trophy', text: 'Mejor equipo', query: '¿Que equipo va mejor?' },
      { icon: 'bi-calendar-event', text: 'Proximos partidos', query: 'Proximos partidos importantes' },
      { icon: 'bi-lightbulb', text: 'Recomendaciones', query: 'Dame recomendaciones para mejorar la gestion del club' },
    ],
    'estadisticas-equipos': [
      { icon: 'bi-shield-check', text: 'Mejor defensa', query: '¿Que equipo tiene mejor defensa?' },
      { icon: 'bi-graph-up', text: 'Comparar resultados', query: 'Compara los resultados de liga' },
      { icon: 'bi-bar-chart', text: 'Goles por equipo', query: 'Genera un analisis de goles por equipo' },
      { icon: 'bi-trophy', text: 'Ranking equipos', query: '¿Como va la clasificacion de los equipos?' },
    ],
    'estadisticas-jugadores': [
      { icon: 'bi-star-fill', text: 'Jugador mas completo', query: '¿Quien es el jugador mas completo?' },
      { icon: 'bi-trophy', text: 'Top goleadores', query: 'Top goleadores por equipo' },
      { icon: 'bi-clock-history', text: 'Mas minutos', query: 'Jugadores con mas minutos' },
      { icon: 'bi-graph-up-arrow', text: 'Rendimiento', query: 'Analiza el rendimiento individual de los jugadores' },
    ],
    'jugadores': [
      { icon: 'bi-people-fill', text: 'Analizar plantilla', query: 'Analiza la plantilla' },
      { icon: 'bi-grid-3x3', text: 'Por posicion', query: 'Jugadores por posicion' },
      { icon: 'bi-calendar3', text: 'Media de edad', query: 'Media de edad del club' },
      { icon: 'bi-person-badge', text: 'Estado jugadores', query: '¿Cual es el estado de los jugadores?' },
    ],
    'calendario': [
      { icon: 'bi-calendar-week', text: 'Resumen semana', query: 'Resumen de la semana' },
      { icon: 'bi-clock', text: 'Entrenamientos hoy', query: 'Entrenamientos de hoy' },
      { icon: 'bi-trophy', text: 'Proximos partidos', query: 'Proximos partidos' },
      { icon: 'bi-list-check', text: 'Actividades pendientes', query: '¿Que actividades tenemos pendientes?' },
    ],
  };

  private contextualSuggestions: { [key: string]: SuggestionChip[] } = {
    'jugadores': [
      { icon: 'bi-person-lines-fill', text: 'Detalles del jugador', query: '¿Puedes darme mas detalles sobre ese jugador?' },
      { icon: 'bi-graph-up-arrow', text: 'Rendimiento', query: '¿Como ha sido su rendimiento esta temporada?' },
      { icon: 'bi-trophy', text: 'Goles y asistencias', query: '¿Cuantos goles y asistencias tiene?' },
      { icon: 'bi-people', text: 'Comparar jugadores', query: 'Compara a los mejores jugadores del equipo' },
    ],
    'equipo': [
      { icon: 'bi-shield-check', text: 'Defensa del equipo', query: '¿Como va la defensa del equipo?' },
      { icon: 'bi-bar-chart', text: 'Estadisticas', query: 'Dame estadisticas detalladas del equipo' },
      { icon: 'bi-calendar3', text: 'Proximos partidos', query: '¿Cuales son los proximos partidos?' },
      { icon: 'bi-arrow-up-circle', text: 'Mejoras', query: '¿Que areas puede mejorar el equipo?' },
    ],
    'entrenamiento': [
      { icon: 'bi-clipboard-check', text: 'Plan semanal', query: '¿Que ejercicios recomiendas para esta semana?' },
      { icon: 'bi-clock-history', text: 'Asistencia', query: '¿Como va la asistencia a entrenamientos?' },
      { icon: 'bi-lightning', text: 'Ejercicios especificos', query: 'Sugiere ejercicios para mejorar la tecnica' },
      { icon: 'bi-calendar-week', text: 'Planificacion', query: '¿Como deberia planificar los entrenamientos?' },
    ],
    'partido': [
      { icon: 'bi-flag', text: 'Analisis del partido', query: '¿Puedes analizar el ultimo partido?' },
      { icon: 'bi-clipboard-data', text: 'Tactica', query: '¿Que tactica recomiendas para el proximo partido?' },
      { icon: 'bi-people-fill', text: 'Alineacion', query: '¿Cual seria la mejor alineacion?' },
      { icon: 'bi-graph-up', text: 'Resultado esperado', query: '¿Que probabilidades tenemos de ganar?' },
    ],
    'estadisticas': [
      { icon: 'bi-bar-chart-line', text: 'Mas datos', query: 'Dame mas datos estadisticos' },
      { icon: 'bi-trophy', text: 'Ranking', query: '¿Como estamos en el ranking?' },
      { icon: 'bi-graph-down', text: 'Areas de mejora', query: '¿En que estadisticas estamos peor?' },
      { icon: 'bi-person-badge', text: 'Mejor jugador', query: '¿Quien es el jugador con mejores estadisticas?' },
    ],
    'general': [
      { icon: 'bi-lightbulb', text: 'Recomendaciones', query: 'Dame recomendaciones para mejorar' },
      { icon: 'bi-bar-chart-line', text: 'Resumen general', query: 'Hazme un resumen del estado del club' },
      { icon: 'bi-people-fill', text: 'Plantilla', query: 'Analiza la plantilla' },
      { icon: 'bi-calendar-event', text: 'Proximos eventos', query: '¿Que eventos tenemos proximos?' },
    ],
  };

  constructor(
    private loginService: LoginService,
    private router: Router,
    private sanitizer: DomSanitizer,
    private aiChatService: AiChatService,
    private voiceRecognition: VoiceRecognitionService
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.loginService.usuarioActual.subscribe((user) => {
        if (user) {
          this.profileId = user.profileType?.profileId || 0;
          this.userId = user.userId;
          this.isVisible = this.profileId === 1 || this.profileId === 2;
          this.updateSuggestions();
          this.loadCredits();
        }
      })
    );

    this.subs.push(
      this.router.events.pipe(
        filter(e => e instanceof NavigationEnd)
      ).subscribe((e: any) => {
        const url = (e as NavigationEnd).urlAfterRedirects || (e as NavigationEnd).url;
        if (url.includes('asistente-ia')) {
          this.isOpen = false;
        }
        this.detectScreenContext(url);
        this.updateSuggestions();
      })
    );

    this.detectScreenContext(this.router.url);
    this.updateSuggestions();
    this.initVoiceRecognition();
  }

  private initVoiceRecognition(): void {
    this.isVoiceSupported = this.voiceRecognition.isSupported();

    this.subs.push(
      this.voiceRecognition.transcript$.subscribe(result => {
        if (result.isFinal) {
          // Final transcript: commit to input
          this.voiceTranscriptBase = this.userInput.trim() 
            ? this.userInput + ' ' + result.transcript 
            : result.transcript;
          this.userInput = this.voiceTranscriptBase;
        } else {
          // Interim transcript: show in real-time but don't commit yet
          const interim = result.transcript;
          this.userInput = this.voiceTranscriptBase 
            ? this.voiceTranscriptBase + ' ' + interim 
            : interim;
        }
      })
    );

    this.subs.push(
      this.voiceRecognition.isListening$.subscribe(isListening => {
        this.isRecording = isListening;
        if (!isListening) {
          // When recording stops, commit whatever we have
          this.voiceTranscriptBase = this.userInput;
        }
      })
    );

    this.subs.push(
      this.voiceRecognition.error$.subscribe(error => {
        console.warn('Voice recognition error:', error);
      })
    );
  }

  toggleVoiceRecognition(): void {
    if (this.isRecording) {
      this.voiceRecognition.stop();
    } else {
      // Save current text as base
      this.voiceTranscriptBase = this.userInput.trim();
      this.voiceRecognition.start('es-ES');
    }
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.chatSub?.unsubscribe();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  // ─── POSITION ─────────────────────────────
  private initPosition(): void {
    if (this.positionInitialized) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    this.popupX = vw - this.popupW - 24;
    this.popupY = vh - this.popupH - 90;
    this.positionInitialized = true;
  }

  // ─── DRAG ─────────────────────────────────
  startDrag(event: MouseEvent): void {
    if ((event.target as HTMLElement).closest('.fab-resize-handle')) return;
    if ((event.target as HTMLElement).closest('button')) return;
    this.isDragging = true;
    this.dragStartX = event.clientX - this.popupX;
    this.dragStartY = event.clientY - this.popupY;
    event.preventDefault();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (this.isDragging) {
      this.popupX = Math.max(0, Math.min(window.innerWidth - this.popupW, event.clientX - this.dragStartX));
      this.popupY = Math.max(0, Math.min(window.innerHeight - this.popupH, event.clientY - this.dragStartY));
    }
    if (this.isResizing) {
      this.handleResize(event);
    }
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    this.isDragging = false;
    this.isResizing = false;
    this.resizeDir = '';
  }

  // ─── RESIZE ───────────────────────────────
  startResize(event: MouseEvent, direction: string): void {
    this.isResizing = true;
    this.resizeDir = direction;
    this.resizeStartX = event.clientX;
    this.resizeStartY = event.clientY;
    event.preventDefault();
    event.stopPropagation();
  }

  private handleResize(event: MouseEvent): void {
    const dx = event.clientX - this.resizeStartX;
    const dy = event.clientY - this.resizeStartY;
    this.resizeStartX = event.clientX;
    this.resizeStartY = event.clientY;

    if (this.resizeDir.includes('e')) {
      this.popupW = Math.max(this.minW, Math.min(this.maxW, this.popupW + dx));
    }
    if (this.resizeDir.includes('w')) {
      const newW = Math.max(this.minW, Math.min(this.maxW, this.popupW - dx));
      if (newW !== this.popupW) {
        this.popupX += this.popupW - newW;
        this.popupW = newW;
      }
    }
    if (this.resizeDir.includes('s')) {
      this.popupH = Math.max(this.minH, Math.min(this.maxH, this.popupH + dy));
    }
    if (this.resizeDir.includes('n')) {
      const newH = Math.max(this.minH, Math.min(this.maxH, this.popupH - dy));
      if (newH !== this.popupH) {
        this.popupY += this.popupH - newH;
        this.popupH = newH;
      }
    }
  }

  // ─── EXPAND / CONTRACT ────────────────────
  toggleExpand(): void {
    if (this.isExpanded) {
      this.popupW = this.normalW;
      this.popupH = this.normalH;
    } else {
      this.normalW = this.popupW;
      this.normalH = this.popupH;
      this.popupW = Math.min(this.expandedW, window.innerWidth - 32);
      this.popupH = Math.min(this.expandedH, window.innerHeight - 32);
    }
    this.clampPosition();
    this.isExpanded = !this.isExpanded;
  }

  private clampPosition(): void {
    this.popupX = Math.max(0, Math.min(window.innerWidth - this.popupW, this.popupX));
    this.popupY = Math.max(0, Math.min(window.innerHeight - this.popupH, this.popupY));
  }

  // ─── CHAT LOGIC ───────────────────────────
  private detectScreenContext(url: string): void {
    const clubMatch = url.match(/cuadro\/(\d+)/);
    if (clubMatch) {
      this.clubId = parseInt(clubMatch[1], 10);
    } else {
      const storedClubId = localStorage.getItem('clubId');
      if (storedClubId) this.clubId = parseInt(storedClubId, 10);
    }

    if (url.includes('estadisticas-equipos')) {
      this.currentScreenContext = 'estadisticas-equipos';
    } else if (url.includes('estadisticas-jugadores')) {
      this.currentScreenContext = 'estadisticas-jugadores';
    } else if (url.includes('info-jugadores') || url.includes('jugadores')) {
      this.currentScreenContext = 'jugadores';
    } else if (url.includes('calendario')) {
      this.currentScreenContext = 'calendario';
    } else {
      this.currentScreenContext = 'dashboard';
    }
  }

  private updateSuggestions(): void {
    this.quickSuggestions = this.screenSuggestions[this.currentScreenContext] || this.screenSuggestions['dashboard'];
    this.showSuggestions = true;
  }

  /** Update suggestions based on the user's last message topic */
  private updateSuggestionsFromContext(userText: string): void {
    const text = userText.toLowerCase();
    if (text.includes('jugador') || text.includes('goleador') || text.includes('rendimiento') || text.includes('ficha')) {
      this.quickSuggestions = this.contextualSuggestions['jugadores'];
    } else if (text.includes('equipo') || text.includes('plantilla') || text.includes('club') || text.includes('defensa')) {
      this.quickSuggestions = this.contextualSuggestions['equipo'];
    } else if (text.includes('entrenamient') || text.includes('ejercicio') || text.includes('sesion') || text.includes('asistencia')) {
      this.quickSuggestions = this.contextualSuggestions['entrenamiento'];
    } else if (text.includes('partido') || text.includes('rival') || text.includes('tactica') || text.includes('alineacion')) {
      this.quickSuggestions = this.contextualSuggestions['partido'];
    } else if (text.includes('estadistica') || text.includes('dato') || text.includes('ranking') || text.includes('clasificacion')) {
      this.quickSuggestions = this.contextualSuggestions['estadisticas'];
    } else {
      this.quickSuggestions = this.contextualSuggestions['general'];
    }
    this.showSuggestions = true;
  }

  private loadCredits(): void {
    if (this.userId) {
      this.aiChatService.getCredits(this.userId).subscribe(info => {
        this.creditsAvailable = info.creditsAvailable;
      });
    }
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.initPosition();
      this.showHistoryPanel = false;
      if (this.messages.length === 0) {
        this.addWelcomeMessage();
        this.loadCredits();
      }
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

  sendMessage(): void {
    const text = this.userInput.trim();
    if (!text || this.isResponding) return;

    if (this.creditsAvailable <= 0) {
      this.addAssistantMessage('No tienes créditos disponibles. Pulsa en "créditos" para comprar más.');
      return;
    }

    this.messages.push({
      id: ++this.msgIdCounter,
      role: 'user',
      text,
      timestamp: new Date(),
    });
    this.userInput = '';
    this.shouldScroll = true;
    this.isResponding = true;
    this.showSuggestions = false;

    const typingMsg: ChatMessage = {
      id: ++this.msgIdCounter,
      role: 'assistant',
      text: '',
      timestamp: new Date(),
      isTyping: true,
    };
    this.messages.push(typingMsg);

    const apiKeyType = this.profileId === 99 ? 'admin' : 'users';
    const lastUserText = text;

    this.chatSub?.unsubscribe();
    this.chatSub = this.aiChatService.sendMessage(this.userId, this.clubId, this.currentScreenContext, text, apiKeyType)
      .pipe(
        finalize(() => {
          this.isResponding = false;
        })
      )
      .subscribe({
        next: (resp) => {
          const idx = this.messages.indexOf(typingMsg);
          if (idx > -1) this.messages.splice(idx, 1);

          if (resp.success && resp.response) {
            this.addAssistantMessage(resp.response);
            if (resp.creditsRemaining !== undefined) {
              this.creditsAvailable = resp.creditsRemaining;
            }
          } else {
            this.addAssistantMessage(resp.message || 'Ha ocurrido un error. Intentalo de nuevo.');
          }
          // Show contextual suggestions after each response
          this.updateSuggestionsFromContext(lastUserText);
          this.saveConversation();
        },
        error: () => {
          const idx = this.messages.indexOf(typingMsg);
          if (idx > -1) this.messages.splice(idx, 1);
          this.addAssistantMessage('Error de conexion. Intentalo de nuevo.');
          this.showSuggestions = true;
          this.saveConversation();
        }
      });
  }

  cancelPendingRequest(): void {
    if (this.chatSub) {
      this.chatSub.unsubscribe();
      this.chatSub = null;
    }
    this.isResponding = false;
    const typingIdx = this.messages.findIndex(m => m.isTyping);
    if (typingIdx > -1) this.messages.splice(typingIdx, 1);
    this.addAssistantMessage('Peticion cancelada.');
    this.showSuggestions = true;
  }

  openCreditsModal(): void {
    this.showCreditsModal = true;
  }

  closeCreditsModal(): void {
    this.showCreditsModal = false;
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

  private addWelcomeMessage(): void {
    this.addAssistantMessage('¡Hola! 👋 Soy tu asistente IA de Sphaira. ¿En que puedo ayudarte?');
  }

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

  // ─── CONVERSATION HISTORY ─────────────────
  toggleHistoryPanel(): void {
    this.showHistoryPanel = !this.showHistoryPanel;
    if (this.showHistoryPanel) {
      this.loadConversationsList();
    }
  }

  startNewConversation(): void {
    if (this.messages.some(m => m.role === 'user')) {
      this.saveConversation();
    }
    this.messages = [];
    this.msgIdCounter = 0;
    this.currentConversationId = null;
    this.showHistoryPanel = false;
    this.addWelcomeMessage();
    this.updateSuggestions();
  }

  loadConversation(conv: ConversationSummary): void {
    if (this.messages.some(m => m.role === 'user') && this.currentConversationId !== conv.id) {
      this.saveConversation();
    }
    this.messages = conv.messages.map(m => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }));
    this.msgIdCounter = this.messages.length;
    this.currentConversationId = conv.id;
    this.showHistoryPanel = false;
    this.showSuggestions = true;
    this.shouldScroll = true;
  }

  deleteConversation(event: Event, convId: string): void {
    event.stopPropagation();
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      let list: ConversationSummary[] = raw ? JSON.parse(raw) : [];
      list = list.filter(c => c.id !== convId);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
      this.conversations = list;
      if (this.currentConversationId === convId) {
        this.currentConversationId = null;
      }
    } catch { /* ignore */ }
  }

  private loadConversationsList(): void {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      this.conversations = raw ? JSON.parse(raw) : [];
    } catch {
      this.conversations = [];
    }
  }

  private saveConversation(): void {
    const userMsgs = this.messages.filter(m => m.role === 'user');
    if (userMsgs.length === 0) return;

    const title = userMsgs[0].text.substring(0, 40) + (userMsgs[0].text.length > 40 ? '...' : '');
    const id = this.currentConversationId || 'fab_conv_' + Date.now();

    const conv: ConversationSummary = {
      id,
      title,
      date: new Date().toISOString(),
      messageCount: this.messages.filter(m => !m.isTyping).length,
      messages: this.messages.filter(m => !m.isTyping),
    };

    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      let list: ConversationSummary[] = raw ? JSON.parse(raw) : [];
      const idx = list.findIndex(c => c.id === id);
      if (idx > -1) {
        list[idx] = conv;
      } else {
        list.unshift(conv);
      }
      if (list.length > 30) list = list.slice(0, 30);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
      this.currentConversationId = id;
    } catch { /* ignore */ }
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `Hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hace ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `Hace ${days}d`;
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  }
}
