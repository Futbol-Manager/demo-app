import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, Pipe, PipeTransform } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoginService } from 'src/app/core/services/login/login.service';
import { AiChatService, AiCreditsInfo, AiPendingAction } from 'src/app/core/services/ai-chat/ai-chat.service';
import { AiPageContextService, BackgroundStatsContext } from 'src/app/core/services/ai-chat/ai-page-context.service';
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
  private bgStatsSub: Subscription | null = null;
  private backgroundStats: BackgroundStatsContext | null = null;

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
  private historyLoading = false;

  /* Delete confirmation */
  showDeleteConfirm = false;
  conversationIdToDelete: string | null = null;

  suggestions: SuggestionChip[] = [
    { icon: 'bi-bar-chart-line', text: 'Resumen del club', query: 'Dame un resumen general del estado del club: equipos, jugadores y actividad reciente.' },
    { icon: 'bi-trophy', text: 'Mejor equipo', query: '¿Qué equipo va mejor en resultados esta temporada?' },
    { icon: 'bi-calendar-event', text: 'Próximos partidos', query: '¿Cuáles son los próximos partidos importantes del club?' },
    { icon: 'bi-people-fill', text: 'Estado de la plantilla', query: '¿Cuántos jugadores hay en el club y cómo está distribuida la plantilla por posición?' },
    { icon: 'bi-cash-stack', text: 'Pagos pendientes', query: '¿Cómo veo qué jugadores tienen cuotas pendientes de pago en Sphaira?' },
    { icon: 'bi-graph-up', text: 'Estadísticas', query: '¿Qué estadísticas de rendimiento puedo consultar en Sphaira para el club?' },
    { icon: 'bi-star-fill', text: 'Scouting', query: '¿Cómo funciona el módulo de scouting en Sphaira? ¿Cómo genero informes con IA?' },
    { icon: 'bi-lightbulb', text: 'Recomendaciones', query: 'Dame recomendaciones para mejorar la gestión y organización del club.' },
  ];

  showSuggestions = true;

  constructor(
    private loginService: LoginService,
    private router: Router,
    private location: Location,
    private translate: TranslateService,
    private aiChatService: AiChatService,
    private voiceRecognition: VoiceRecognitionService,
    private aiPageContext: AiPageContextService
  ) {}

  ngOnInit(): void {
    // Comprueba si hay una conversación pendiente de sincronizar desde el FAB
    const fabSync = this.aiPageContext.consumeFabSync();
    const hasSyncedMessages = !!(fabSync && fabSync.messages && fabSync.messages.length > 1);
    if (hasSyncedMessages) {
      this.messages = fabSync!.messages.map(m => ({
        ...m,
        timestamp: m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp),
      }));
      this.currentConversationId = fabSync!.conversationId;
      this.showSuggestions = false;
    }

    this.loginService.usuarioActual.subscribe((user) => {
      this.usuarioActual = user;
      if (user) {
        this.userId = user.userId;
        this.loadCredits();
        this.loadConversationsList();
      }
    });

    const storedClubId = localStorage.getItem('clubId');
    if (storedClubId) this.clubId = parseInt(storedClubId, 10);

    this.bgStatsSub = this.aiPageContext.getBackgroundStats().subscribe(stats => {
      this.backgroundStats = stats;
    });

    if (!hasSyncedMessages) {
      this.addAssistantMessage(
        '¡Hola! 👋 Soy el asistente de IA de tu club. Puedo ayudarte a consultar informacion sobre jugadores, equipos, estadisticas y mucho mas.\n\nPuedes escribirme o elegir una de las sugerencias de abajo. ¡Preguntame lo que necesites!'
      );
    }

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

    const { messageToSend, activeCodeToReal } = this.buildBackgroundEnrichedMessage(text);

    this.chatSub?.unsubscribe();
    this.chatSub = this.aiChatService.sendMessage(this.userId, this.clubId, 'dashboard', messageToSend, 'users', null, history)
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
            let actionText = resp.response || '';
            if (activeCodeToReal) {
              Array.from(activeCodeToReal.entries())
                .sort((a, b) => b[0].length - a[0].length)
                .forEach(([code, real]) => { actionText = actionText.split(code).join(real); });
            }
            this.messages.push({
              id: ++this.msgIdCounter,
              role: 'assistant',
              text: actionText,
              timestamp: new Date(),
              isActionPreview: true,
              pendingActions: resp.pendingActions,
              actionToken: resp.actionToken,
            });
            if (resp.creditsRemaining !== undefined) {
              this.creditsAvailable = resp.creditsRemaining;
            }
          } else if (resp.success && resp.response) {
            let responseText = resp.response;
            if (activeCodeToReal) {
              Array.from(activeCodeToReal.entries())
                .sort((a, b) => b[0].length - a[0].length)
                .forEach(([code, real]) => { responseText = responseText.split(code).join(real); });
            }
            this.addAssistantMessage(responseText);
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
    this.bgStatsSub?.unsubscribe();
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

  private buildBackgroundEnrichedMessage(text: string): { messageToSend: string; activeCodeToReal: Map<string, string> | null } {
    const bg = this.backgroundStats;
    if (!bg) return { messageToSend: text, activeCodeToReal: null };

    const allCodes = new Map<string, string>();
    const parts: string[] = [];

    if (bg.upcomingStats) {
      parts.push('[PRÓXIMOS PARTIDOS PROGRAMADOS (todos los equipos del club)]\n' + bg.upcomingStats);
    }
    if (bg.rosterStats) {
      parts.push('[PLANTILLA COMPLETA DEL CLUB (todos los jugadores registrados por equipo) - DATOS ANONIMIZADOS]\n' + bg.rosterStats.contextText);
      bg.rosterStats.codeToReal.forEach((v, k) => allCodes.set(k, v));
    }
    if (bg.teamStats) {
      parts.push('[ESTADÍSTICAS DE EQUIPOS - DATOS ANONIMIZADOS]\n' + bg.teamStats.contextText);
      bg.teamStats.codeToReal.forEach((v, k) => allCodes.set(k, v));
    }
    if (bg.playerStats) {
      parts.push('[ESTADÍSTICAS DE JUGADORES - DATOS ANONIMIZADOS]\n' + bg.playerStats.contextText);
      bg.playerStats.codeToReal.forEach((v, k) => allCodes.set(k, v));
    }
    if (bg.paymentStats) {
      parts.push('[PAGOS Y CUOTAS DE JUGADORES - DATOS ANONIMIZADOS]\n' + bg.paymentStats.contextText);
      bg.paymentStats.codeToReal.forEach((v, k) => allCodes.set(k, v));
    }
    if (bg.documentStats) {
      parts.push('[DOCUMENTOS DEL CLUB - DATOS ANONIMIZADOS]\n' + bg.documentStats.contextText);
      bg.documentStats.codeToReal.forEach((v, k) => allCodes.set(k, v));
    }
    if (bg.ropaStats) {
      parts.push('[EQUIPACIÓN DE JUGADORES - DATOS ANONIMIZADOS]\n' + bg.ropaStats.contextText);
      bg.ropaStats.codeToReal.forEach((v, k) => allCodes.set(k, v));
    }
    if (bg.notifStats) {
      parts.push('[NOTIFICACIONES ENVIADAS - DATOS ANONIMIZADOS]\n' + bg.notifStats.contextText);
      bg.notifStats.codeToReal.forEach((v, k) => allCodes.set(k, v));
    }
    if (bg.mediaStats) {
      parts.push('[BIBLIOTECA DE VÍDEOS DEL CLUB]\n' + bg.mediaStats.contextText);
      bg.mediaStats.codeToReal.forEach((v, k) => allCodes.set(k, v));
    }
    if (bg.scoutingStats) {
      parts.push('[SCOUTING - JUGADORES OBSERVADOS - DATOS ANONIMIZADOS]\n' + bg.scoutingStats.contextText);
      bg.scoutingStats.codeToReal.forEach((v, k) => allCodes.set(k, v));
    }
    if (bg.staffStats) {
      parts.push('[STAFF / USUARIOS CON ACCESO AL DASHBOARD - DATOS ANONIMIZADOS]\n' + bg.staffStats.contextText);
      bg.staffStats.codeToReal.forEach((v, k) => allCodes.set(k, v));
    }
    if (bg.injuryStats) {
      parts.push('[LESIONES DEL CLUB (todos los equipos)]\n' + bg.injuryStats);
    }
    if (bg.classificationStats) {
      parts.push('[CLASIFICACIÓN DE LIGA (equipos del club)]\n' + bg.classificationStats);
    }

    if (parts.length === 0) return { messageToSend: text, activeCodeToReal: null };

    let anonymizedText = text;
    allCodes.forEach((real, code) => {
      anonymizedText = anonymizedText.replace(
        new RegExp(real.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), code
      );
    });

    return { messageToSend: anonymizedText + '\n\n' + parts.join('\n\n'), activeCodeToReal: allCodes };
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
    if (!this.userId) return;
    this.historyLoading = true;
    this.aiChatService.listHistory(this.userId).subscribe({
      next: (list) => {
        this.conversations = (list || []).map((c: any) => ({
          id: c.id,
          title: c.title || 'Conversación',
          date: c.date,
          messageCount: c.messageCount || 0,
          messages: [],
        }));
        this.historyLoading = false;
      },
      error: () => { this.historyLoading = false; }
    });
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
    this.currentConversationId = conv.id;
    this.showSuggestions = false;

    if (conv.messages && conv.messages.length > 0) {
      this.messages = conv.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
      this.msgIdCounter = this.messages.length;
      this.shouldScroll = true;
    } else {
      // Load messages from API
      this.aiChatService.getHistoryMessages(conv.id).subscribe({
        next: (msgs) => {
          this.messages = (msgs || []).map((m: any, i: number) => ({
            id: i + 1,
            role: m.role as 'user' | 'assistant',
            text: m.text || '',
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
          }));
          this.msgIdCounter = this.messages.length;
          this.shouldScroll = true;
        },
        error: () => {}
      });
    }
  }

  deleteConversation(event: Event, convId: string): void {
    event.stopPropagation();
    this.conversationIdToDelete = convId;
    this.showDeleteConfirm = true;
  }

  confirmDeleteConversation(): void {
    const convId = this.conversationIdToDelete;
    if (!convId) return;
    this.showDeleteConfirm = false;
    this.conversationIdToDelete = null;
    // Remove from local list immediately for instant UI feedback
    this.conversations = this.conversations.filter(c => c.id !== convId);
    if (this.currentConversationId === convId) {
      this.currentConversationId = null;
    }
    // Delete from backend
    this.aiChatService.deleteHistory(convId).subscribe();
  }

  cancelDeleteConversation(): void {
    this.showDeleteConfirm = false;
    this.conversationIdToDelete = null;
  }

  private saveConversation(): void {
    const userMsgs = this.messages.filter(m => m.role === 'user');
    if (userMsgs.length === 0 || !this.userId) return;

    const title = userMsgs[0].text.substring(0, 50) + (userMsgs[0].text.length > 50 ? '...' : '');
    const convId = this.currentConversationId || 'conv_' + Date.now();
    this.currentConversationId = convId;

    const messages = this.messages
      .filter(m => !m.isTyping && m.text)
      .map(m => ({ role: m.role, text: m.text }));

    const clubId = this.clubId;
    this.aiChatService.saveHistory(this.userId, convId, title, clubId, 'dashboard', messages).subscribe({
      next: () => { this.loadConversationsList(); },
      error: () => {}
    });
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
