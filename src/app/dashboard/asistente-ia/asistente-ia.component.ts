import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, Pipe, PipeTransform } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoginService } from 'src/app/core/services/login/login.service';
import { AiChatService, AiCreditsInfo, AiPendingAction } from 'src/app/core/services/ai-chat/ai-chat.service';
import { User } from 'src/app/core/models/users/user.model';
import { VoiceRecognitionService } from 'src/app/core/services/voice-recognition/voice-recognition.service';

@Pipe({ name: 'nl2br' })
export class Nl2brPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string): SafeHtml {
    if (!value) return '';
    let html = value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\n/g, '<br>');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  isTyping?: boolean;
  isActionPreview?: boolean;
  pendingActions?: AiPendingAction[];
  actionToken?: string;
  actionExecuted?: boolean;
  isExecutingAction?: boolean;
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
  selector: 'app-asistente-ia',
  templateUrl: './asistente-ia.component.html',
  styleUrls: ['./asistente-ia.component.scss'],
})
export class AsistenteIaComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('chatBody') chatBody!: ElementRef<HTMLDivElement>;
  @ViewChild('inputField') inputField!: ElementRef<HTMLTextAreaElement>;

  usuarioActual!: User | null;
  messages: ChatMessage[] = [];
  userInput = '';
  isResponding = false;
  creditsAvailable = 50;
  showCreditsModal = false;
  private msgIdCounter = 0;
  private shouldScroll = false;
  userId = 0;
  private clubId: number | null = null;
  private chatSub: Subscription | null = null;

  // Voice recognition
  isRecording = false;
  isVoiceSupported = false;
  private voiceTranscriptSub: Subscription | null = null;
  private voiceListeningSub: Subscription | null = null;
  private voiceErrorSub: Subscription | null = null;
  private voiceTranscriptBase = '';

  showHistory = true;
  conversations: ConversationSummary[] = [];
  currentConversationId: string | null = null;
  private readonly STORAGE_KEY = 'sphaira_club_ai_history';

  /* Delete confirmation */
  showDeleteConfirm = false;
  conversationIdToDelete: string | null = null;

  suggestions: SuggestionChip[] = [
    { icon: 'bi-bar-chart-line', text: 'Resume el estado del club', query: 'Resume el estado del club' },
    { icon: 'bi-trophy', text: '¿Que equipo va mejor?', query: '¿Que equipo va mejor?' },
    { icon: 'bi-calendar-event', text: 'Proximos partidos importantes', query: 'Proximos partidos importantes' },
    { icon: 'bi-graph-up', text: 'Estadisticas del club', query: 'Dame las estadisticas de rendimiento del club' },
    { icon: 'bi-people-fill', text: 'Analizar la plantilla', query: 'Analiza la plantilla del club' },
    { icon: 'bi-lightbulb', text: 'Recomendaciones', query: 'Dame recomendaciones para mejorar la gestion del club' },
  ];

  showSuggestions = true;

  constructor(
    private loginService: LoginService,
    private router: Router,
    private location: Location,
    private translate: TranslateService,
    private aiChatService: AiChatService,
    private voiceRecognition: VoiceRecognitionService
  ) {}

  ngOnInit(): void {
    this.loginService.usuarioActual.subscribe((user) => {
      this.usuarioActual = user;
      if (user) {
        this.userId = user.userId;
        this.loadCredits();
      }
    });

    const storedClubId = localStorage.getItem('clubId');
    if (storedClubId) this.clubId = parseInt(storedClubId, 10);

    this.loadConversationsList();

    this.addAssistantMessage(
      '¡Hola! 👋 Soy el asistente de IA de tu club. Puedo ayudarte a consultar informacion sobre jugadores, equipos, estadisticas y mucho mas.\n\nPuedes escribirme o elegir una de las sugerencias de abajo. ¡Preguntame lo que necesites!'
    );

    this.initVoiceRecognition();
  }

  private initVoiceRecognition(): void {
    this.isVoiceSupported = this.voiceRecognition.isSupported();

    // Subscribe to transcript
    this.voiceTranscriptSub = this.voiceRecognition.transcript$.subscribe(result => {
      if (result.isFinal) {
        // Final transcript: commit to input
        this.voiceTranscriptBase = this.voiceTranscriptBase.trim()
          ? this.voiceTranscriptBase + ' ' + result.transcript 
          : result.transcript;
        this.userInput = this.voiceTranscriptBase;
      } else {
        // Interim transcript: show in real-time but don't commit yet
        const interim = result.transcript;
        this.userInput = this.voiceTranscriptBase
          ? this.voiceTranscriptBase + ' ' + interim 
          : interim;
      }
    });

    this.voiceListeningSub = this.voiceRecognition.isListening$.subscribe(isListening => {
      this.isRecording = isListening;
      if (!isListening) {
        // When recording stops, commit whatever we have
        this.voiceTranscriptBase = this.userInput;
      }
    });

    this.voiceErrorSub = this.voiceRecognition.error$.subscribe(error => {
      console.warn('Voice recognition error:', error);
    });
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

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  private loadCredits(): void {
    if (this.userId) {
      this.aiChatService.getCredits(this.userId).subscribe(info => {
        this.creditsAvailable = info.creditsAvailable;
      });
    }
  }

  sendMessage(): void {
    const text = this.userInput.trim();
    if (!text || this.isResponding) return;

    if (this.creditsAvailable <= 0) {
      this.addAssistantMessage('No tienes créditos disponibles. Compra más créditos para seguir usando el asistente IA.');
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

    const typingMsg: ChatMessage = {
      id: ++this.msgIdCounter,
      role: 'assistant',
      text: '',
      timestamp: new Date(),
      isTyping: true,
    };
    this.messages.push(typingMsg);
    this.shouldScroll = true;

    // Build conversation history (last 10 messages)
    const history = this.messages
      .filter(m => !m.isTyping && m.text && m.text.trim().length > 0)
      .slice(-10)
      .map(m => ({ role: m.role, text: m.isActionPreview ? '[Acción propuesta: ' + m.text + ']' : m.text }));

    this.chatSub?.unsubscribe();
    this.chatSub = this.aiChatService.sendMessage(this.userId, this.clubId, 'dashboard', text, 'users', null, history)
      .pipe(
        finalize(() => {
          this.isResponding = false;
        })
      )
      .subscribe({
        next: (resp) => {
          const idx = this.messages.indexOf(typingMsg);
          if (idx > -1) this.messages.splice(idx, 1);

          if (resp.success && resp.hasActions && resp.pendingActions && resp.pendingActions.length > 0) {
            this.messages.push({
              id: ++this.msgIdCounter,
              role: 'assistant',
              text: resp.response || '',
              timestamp: new Date(),
              isActionPreview: true,
              pendingActions: resp.pendingActions,
              actionToken: resp.actionToken,
            });
            if (resp.creditsRemaining !== undefined) {
              this.creditsAvailable = resp.creditsRemaining;
            }
          } else if (resp.success && resp.response) {
            this.addAssistantMessage(resp.response);
            if (resp.creditsRemaining !== undefined) {
              this.creditsAvailable = resp.creditsRemaining;
            }
          } else {
            this.addAssistantMessage(resp.message || 'Ha ocurrido un error. Intentalo de nuevo.');
          }
          this.shouldScroll = true;
          this.saveConversation();
          this.focusChatInput();
        },
        error: () => {
          const idx = this.messages.indexOf(typingMsg);
          if (idx > -1) this.messages.splice(idx, 1);
          this.addAssistantMessage('Error de conexion. Intentalo de nuevo.');
          this.focusChatInput();
        }
      });
  }

  confirmActions(msg: ChatMessage): void {
    if (!msg.actionToken || msg.actionExecuted) return;
    msg.isExecutingAction = true;
    this.aiChatService.executeActions(msg.actionToken).subscribe({
      next: (result) => {
        msg.actionExecuted = true;
        msg.isExecutingAction = false;
        if (result.success) {
          const parts: string[] = [];
          if ((result.created ?? 0) > 0) parts.push(result.created + ' creado(s)');
          if ((result.edited ?? 0) > 0) parts.push(result.edited + ' editado(s)');
          if ((result.deleted ?? 0) > 0) parts.push(result.deleted + ' eliminado(s)');
          let summaryMsg = '✅ ' + (parts.length > 0 ? parts.join(', ') : 'Acciones ejecutadas correctamente.') + ' Recargando datos...';
          if (result.errors && result.errors.length > 0) {
            summaryMsg += '\n⚠️ Advertencias: ' + result.errors.join(', ');
          }
          if (result.details && result.details.length > 0) {
            summaryMsg += '\n📋 ' + result.details.join(', ');
          }
          this.addAssistantMessage(summaryMsg);
          setTimeout(() => window.dispatchEvent(new CustomEvent('ai-data-changed')), 500);
          setTimeout(() => window.dispatchEvent(new CustomEvent('ai-data-changed')), 1500);
        } else {
          let errMsg = '❌ ' + (result.message || 'Error al ejecutar las acciones.');
          if (result.errors && result.errors.length > 0) {
            errMsg += '\n' + result.errors.join(', ');
          }
          this.addAssistantMessage(errMsg);
        }
        this.shouldScroll = true;
        this.saveConversation();
        this.focusChatInput();
      },
      error: () => {
        msg.isExecutingAction = false;
        this.addAssistantMessage('❌ Error de conexión al ejecutar las acciones.');
        this.saveConversation();
        this.focusChatInput();
      }
    });
  }

  cancelActions(msg: ChatMessage): void {
    msg.actionExecuted = true;
    this.addAssistantMessage('Acción cancelada.');
    this.shouldScroll = true;
    this.saveConversation();
    this.focusChatInput();
  }

  private focusChatInput(): void {
    setTimeout(() => {
      if (this.inputField?.nativeElement) {
        this.inputField.nativeElement.focus();
      }
    }, 100);
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
  }

  openCreditsModal(): void {
    this.showCreditsModal = true;
  }

  closeCreditsModal(): void {
    this.showCreditsModal = false;
  }

  ngOnDestroy(): void {
    this.chatSub?.unsubscribe();
    this.voiceTranscriptSub?.unsubscribe();
    this.voiceListeningSub?.unsubscribe();
    this.voiceErrorSub?.unsubscribe();
  }

  sendSuggestion(chip: SuggestionChip): void {
    this.userInput = chip.query;
    this.sendMessage();
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
      this.resetInputSize();
    }
  }

  autoResizeInput(event?: Event): void {
    const el = event ? event.target as HTMLTextAreaElement : this.inputField?.nativeElement;
    if (!el) return;
    el.style.height = 'auto';
    const scrollH = el.scrollHeight;
    if (scrollH > 120) {
      el.style.height = '120px';
      el.style.overflowY = 'auto';
    } else {
      el.style.height = scrollH + 'px';
      el.style.overflowY = 'hidden';
    }
  }

  private resetInputSize(): void {
    const el = this.inputField?.nativeElement;
    if (el) {
      el.style.height = 'auto';
      el.style.overflowY = 'hidden';
    }
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
    if (this.chatBody?.nativeElement) {
      const el = this.chatBody.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  goBack(): void {
    this.location.back();
  }

  trackByMsgId(index: number, msg: ChatMessage): number {
    return msg.id;
  }

  /* Historial */

  toggleHistory(): void {
    this.showHistory = !this.showHistory;
    if (this.showHistory) {
      this.loadConversationsList();
    }
  }

  loadConversationsList(): void {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      this.conversations = raw ? JSON.parse(raw) : [];
    } catch {
      this.conversations = [];
    }
  }

  startNewConversation(): void {
    if (this.messages.some(m => m.role === 'user')) {
      this.saveConversation();
    }
    this.messages = [];
    this.msgIdCounter = 0;
    this.currentConversationId = null;
    this.showHistory = false;
    this.showSuggestions = true;
    this.addAssistantMessage(
      '¡Hola! 👋 Soy el asistente de IA de tu club. Puedo ayudarte a consultar informacion sobre jugadores, equipos, estadisticas y mucho mas.\n\nPuedes escribirme o elegir una de las sugerencias de abajo. ¡Preguntame lo que necesites!'
    );
    this.suggestions = [
      { icon: 'bi-bar-chart-line', text: 'Resume el estado del club', query: 'Resume el estado del club' },
      { icon: 'bi-trophy', text: '¿Que equipo va mejor?', query: '¿Que equipo va mejor?' },
      { icon: 'bi-calendar-event', text: 'Proximos partidos importantes', query: 'Proximos partidos importantes' },
      { icon: 'bi-graph-up', text: 'Estadisticas del club', query: 'Dame las estadisticas de rendimiento del club' },
      { icon: 'bi-people-fill', text: 'Analizar la plantilla', query: 'Analiza la plantilla del club' },
      { icon: 'bi-lightbulb', text: 'Recomendaciones', query: 'Dame recomendaciones para mejorar la gestion del club' },
    ];
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
    this.showSuggestions = false;
    this.shouldScroll = true;
  }

  deleteConversation(event: Event, convId: string): void {
    event.stopPropagation();
    this.conversationIdToDelete = convId;
    this.showDeleteConfirm = true;
  }

  confirmDeleteConversation(): void {
    if (!this.conversationIdToDelete) return;
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      let list: ConversationSummary[] = raw ? JSON.parse(raw) : [];
      list = list.filter(c => c.id !== this.conversationIdToDelete);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
      this.conversations = list;
      if (this.currentConversationId === this.conversationIdToDelete) {
        this.currentConversationId = null;
      }
    } catch { /* ignore */ }
    this.showDeleteConfirm = false;
    this.conversationIdToDelete = null;
  }

  cancelDeleteConversation(): void {
    this.showDeleteConfirm = false;
    this.conversationIdToDelete = null;
  }

  private saveConversation(): void {
    const userMsgs = this.messages.filter(m => m.role === 'user');
    if (userMsgs.length === 0) return;

    const title = userMsgs[0].text.substring(0, 50) + (userMsgs[0].text.length > 50 ? '...' : '');
    const id = this.currentConversationId || 'conv_' + Date.now();

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
      if (list.length > 50) list = list.slice(0, 50);
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
