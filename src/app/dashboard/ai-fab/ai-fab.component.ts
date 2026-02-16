import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, HostListener } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter, finalize } from 'rxjs/operators';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { LoginService } from 'src/app/core/services/login/login.service';
import { AiChatService, AiCreditsInfo } from 'src/app/core/services/ai-chat/ai-chat.service';
import { User } from 'src/app/core/models/users/user.model';

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

  constructor(
    private loginService: LoginService,
    private router: Router,
    private sanitizer: DomSanitizer,
    private aiChatService: AiChatService
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
      if (this.messages.length === 0) {
        this.addAssistantMessage('¡Hola! 👋 Soy tu asistente IA de Sphaira. ¿En que puedo ayudarte?');
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
      this.addAssistantMessage('No tienes creditos disponibles. Pulsa en "creditos" para comprar mas.');
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

    const apiKeyType = this.profileId === 99 ? 'admin' : 'users';

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
        },
        error: () => {
          const idx = this.messages.indexOf(typingMsg);
          if (idx > -1) this.messages.splice(idx, 1);
          this.addAssistantMessage('Error de conexion. Intentalo de nuevo.');
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
