import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, HostListener } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter, finalize } from 'rxjs/operators';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { LoginService } from 'src/app/core/services/login/login.service';
import { AiChatService, AiCreditsInfo, AiPendingAction } from 'src/app/core/services/ai-chat/ai-chat.service';
import { AiPageContextService, BackgroundStatsContext, CoachTeamContext, PageContext } from 'src/app/core/services/ai-chat/ai-page-context.service';
import { InjuryService } from 'src/app/core/services/injury/injury.service';
import { Injury } from 'src/app/core/services/injury/injury.model';
import { User } from 'src/app/core/models/users/user.model';
import { VoiceRecognitionService } from 'src/app/core/services/voice-recognition/voice-recognition.service';
import * as XLSX from 'xlsx';

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
  selector: 'app-ai-fab',
  templateUrl: './ai-fab.component.html',
  styleUrls: ['./ai-fab.component.scss'],
})
export class AiFabComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('fabChatBody') fabChatBody!: ElementRef<HTMLDivElement>;
  @ViewChild('chatInput') chatInputRef!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('pdfInput') pdfInputRef!: ElementRef<HTMLInputElement>;

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
  private currentTeamId: number | null = null;

  // Conversation history
  showHistoryPanel = false;
  conversations: ConversationSummary[] = [];
  currentConversationId: string | null = null;
  private readonly STORAGE_KEY = 'sphaira_fab_ai_history';

  // Delete confirmation
  showDeleteConfirm = false;
  conversationIdToDelete: string | null = null;

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

  // Page context (estadísticas de equipos/jugadores disponibles para la IA)
  activePageContext: PageContext | null = null;
  backgroundStats: BackgroundStatsContext | null = null;
  coachTeamContext: CoachTeamContext | null = null;

  // Voice recognition
  isRecording = false;
  isVoiceSupported = false;
  private voiceTranscriptBase = '';  // Text before voice started

  // PDF Calendar Import
  selectedPdfFile: File | null = null;
  pdfTeamName = '';
  showPdfImportBar = false;
  importingCalendar = false;

  private screenSuggestions: { [key: string]: SuggestionChip[] } = {
    // ── Cuadro de mando ──────────────────────────────────────────────────────
    'dashboard': [
      { icon: 'bi-bar-chart-line', text: 'Resumen del club', query: 'Dame un resumen general del estado del club: equipos, jugadores y actividad reciente.' },
      { icon: 'bi-trophy', text: 'Mejor equipo', query: '¿Qué equipo va mejor en resultados esta temporada?' },
      { icon: 'bi-calendar-event', text: 'Próximos partidos', query: '¿Cuáles son los próximos partidos importantes del club?' },
      { icon: 'bi-lightbulb', text: 'Recomendaciones', query: 'Dame recomendaciones para mejorar la gestión del club.' },
    ],
    'dashboard_coach': [
      { icon: 'bi-clipboard2-pulse', text: 'Estado del equipo', query: '¿Cómo está el equipo en este momento? Dame un resumen de los jugadores disponibles y las bajas.' },
      { icon: 'bi-lightning-charge', text: 'Sesión de hoy', query: 'Sugiéreme una sesión de entrenamiento para hoy basándote en el estado del equipo.' },
      { icon: 'bi-people-fill', text: 'Mejor once', query: '¿Cuál sería el once ideal para el próximo partido con los jugadores disponibles?' },
      { icon: 'bi-calendar-week', text: 'Planificación semanal', query: 'Ayúdame a planificar los entrenamientos de esta semana teniendo en cuenta los partidos.' },
    ],
    'dashboard_fisio': [
      { icon: 'bi-bandaid-fill', text: 'Resumen de bajas', query: 'Dame un resumen de todos los jugadores lesionados y su estado actual.' },
      { icon: 'bi-heart-pulse', text: 'Recuperaciones', query: '¿Qué jugadores están en fase de recuperación y cuándo se espera que vuelvan?' },
      { icon: 'bi-shield-plus', text: 'Prevención', query: 'Recomiéndame ejercicios de prevención para reducir el riesgo de lesiones esta semana.' },
      { icon: 'bi-clipboard-heart', text: 'Protocolo RTP', query: '¿Cuál es el protocolo de retorno al juego (RTP) recomendado para las lesiones activas del equipo?' },
    ],
    // ── Estadísticas ─────────────────────────────────────────────────────────
    'estadisticas-equipos': [
      { icon: 'bi-shield-check', text: 'Mejor defensa', query: '¿Qué equipo tiene mejor defensa esta temporada?' },
      { icon: 'bi-graph-up', text: 'Comparar resultados', query: 'Compara los resultados de los equipos del club esta temporada.' },
      { icon: 'bi-bar-chart', text: 'Goles por equipo', query: 'Genera un análisis de goles marcados y encajados por equipo.' },
      { icon: 'bi-trophy', text: 'Ranking equipos', query: '¿Cómo va la clasificación de los equipos del club?' },
    ],
    'estadisticas-jugadores': [
      { icon: 'bi-star-fill', text: 'Jugador más completo', query: '¿Quién es el jugador más completo del equipo según las estadísticas?' },
      { icon: 'bi-trophy', text: 'Top goleadores', query: '¿Cuáles son los jugadores con más goles?' },
      { icon: 'bi-clock-history', text: 'Más minutos', query: '¿Qué jugadores han acumulado más minutos esta temporada?' },
      { icon: 'bi-graph-up-arrow', text: 'Rendimiento individual', query: 'Analiza el rendimiento individual de los jugadores y dime quién destaca.' },
    ],
    // ── Información de jugadores ──────────────────────────────────────────────
    'jugadores': [
      { icon: 'bi-people-fill', text: 'Analizar plantilla', query: 'Analiza la composición y equilibrio de la plantilla actual.' },
      { icon: 'bi-grid-3x3', text: 'Por posición', query: '¿Cuántos jugadores hay en cada posición? ¿Hay posiciones con falta de profundidad?' },
      { icon: 'bi-calendar3', text: 'Media de edad', query: '¿Cuál es la media de edad de la plantilla? ¿Hay equilibrio entre veteranos y jóvenes?' },
      { icon: 'bi-person-badge', text: 'Estado jugadores', query: '¿Cuántos jugadores están disponibles y cuántos tienen alguna baja o incidencia?' },
    ],
    // ── Información de entrenadores ───────────────────────────────────────────
    'info-entrenadores': [
      { icon: 'bi-people-fill', text: 'Cuerpo técnico', query: '¿Cuántos entrenadores hay en el club y qué equipos llevan asignados?' },
      { icon: 'bi-calendar-check', text: 'Actividad reciente', query: '¿Cuál ha sido la actividad reciente de los equipos en términos de entrenamientos y partidos?' },
      { icon: 'bi-trophy', text: 'Resultados equipos', query: '¿Cómo van los resultados de los equipos del club esta temporada?' },
      { icon: 'bi-bar-chart-line', text: 'Carga de trabajo', query: '¿Qué equipos tienen más carga de entrenamientos y partidos en las próximas semanas?' },
    ],
    // ── Calendario ────────────────────────────────────────────────────────────
    'calendario': [
      { icon: 'bi-calendar-week', text: 'Resumen semana', query: '¿Qué entrenamientos y partidos tenemos programados esta semana?' },
      { icon: 'bi-clock', text: 'Entrenamientos hoy', query: '¿Hay entrenamientos programados para hoy?' },
      { icon: 'bi-trophy', text: 'Próximos partidos', query: '¿Cuáles son los próximos partidos y cuándo son?' },
      { icon: 'bi-list-check', text: 'Planificación', query: 'Ayúdame a organizar los entrenamientos de la próxima semana.' },
    ],
    // ── Lesiones ──────────────────────────────────────────────────────────────
    'lesiones': [
      { icon: 'bi-bandaid-fill', text: 'Bajas activas', query: 'Dame un resumen de todas las lesiones activas del equipo.' },
      { icon: 'bi-arrow-up-circle', text: 'Próximas altas', query: '¿Qué jugadores están próximos a recibir el alta médica?' },
      { icon: 'bi-shield-check', text: 'Prevención', query: '¿Qué ejercicios preventivos recomiendas para reducir el riesgo de lesiones?' },
      { icon: 'bi-heart-pulse', text: 'Carga del equipo', query: '¿Cómo afectan las bajas por lesión a la disponibilidad del equipo para los próximos partidos?' },
    ],
    // ── Documentos ────────────────────────────────────────────────────────────
    'documentos': [
      { icon: 'bi-file-earmark-check', text: 'Cómo gestionar docs', query: '¿Cómo gestiono los documentos de los jugadores en Sphaira? ¿Qué tipos de documentos puedo subir?' },
      { icon: 'bi-upload', text: 'Subir documento', query: '¿Cómo subo un nuevo documento para un jugador o para el club en Sphaira?' },
      { icon: 'bi-bell', text: 'Alertas de vencimiento', query: '¿Cómo configuro alertas para que me avise cuando un documento esté próximo a vencer?' },
      { icon: 'bi-folder2-open', text: 'Organizar documentos', query: '¿Cuál es la mejor forma de organizar los documentos del club en Sphaira?' },
    ],
    // ── Pagos ─────────────────────────────────────────────────────────────────
    'pagos': [
      { icon: 'bi-cash-stack', text: 'Cuotas pendientes', query: '¿Cuántos jugadores tienen cuotas pendientes de pago? Dame un resumen del estado de pagos.' },
      { icon: 'bi-receipt', text: 'Cómo registrar pagos', query: '¿Cómo registro el pago de una cuota en Sphaira? ¿Puedo registrar pagos parciales?' },
      { icon: 'bi-send', text: 'Recordatorio de pago', query: '¿Cómo envío un recordatorio de pago a los jugadores con cuotas pendientes?' },
      { icon: 'bi-graph-up', text: 'Resumen financiero', query: '¿Cómo veo un resumen del estado financiero de las cuotas del club?' },
    ],
    // ── Ropa / Equipación ─────────────────────────────────────────────────────
    'ropa': [
      { icon: 'bi-bag-check', text: 'Gestionar pedidos', query: '¿Cómo gestiono los pedidos de equipación para el equipo en Sphaira?' },
      { icon: 'bi-rulers', text: 'Tallas del equipo', query: '¿Cómo registro y consulto las tallas de los jugadores para la equipación?' },
      { icon: 'bi-box-seam', text: 'Seguimiento de pedidos', query: '¿Cómo hago seguimiento del estado de un pedido de ropa en Sphaira?' },
      { icon: 'bi-person-check', text: 'Equipación entregada', query: '¿Cómo registro qué jugadores ya han recogido su equipación?' },
    ],
    // ── Patrocinadores ────────────────────────────────────────────────────────
    'patrocinadores': [
      { icon: 'bi-building', text: 'Gestionar contratos', query: '¿Cómo gestiono los contratos de patrocinio en Sphaira? ¿Qué información puedo registrar?' },
      { icon: 'bi-calendar-event', text: 'Contratos próximos', query: '¿Cómo configuro alertas para contratos de patrocinio que vencen pronto?' },
      { icon: 'bi-bar-chart-line', text: 'Valor de visibilidad', query: '¿Cómo puedo demostrar a mis patrocinadores el valor de su visibilidad en el club?' },
      { icon: 'bi-handshake', text: 'Añadir patrocinador', query: '¿Cómo añado un nuevo patrocinador y su contrato en Sphaira?' },
    ],
    // ── Notificaciones ────────────────────────────────────────────────────────
    'notificaciones': [
      { icon: 'bi-bell-fill', text: 'Enviar comunicado', query: '¿Cómo envío un comunicado o notificación a todos los jugadores del equipo desde Sphaira?' },
      { icon: 'bi-megaphone', text: 'Cambio de horario', query: '¿Cómo comunico un cambio de horario o una cancelación de entrenamiento a todo el equipo?' },
      { icon: 'bi-gear', text: 'Alertas automáticas', query: '¿Qué notificaciones automáticas puedo configurar en Sphaira? ¿Cómo las activo?' },
      { icon: 'bi-phone', text: 'App móvil', query: '¿Cómo reciben los jugadores y padres las notificaciones del club? ¿Necesitan descargar la app?' },
    ],
    // ── Scouting ──────────────────────────────────────────────────────────────
    'scouting': [
      { icon: 'bi-star-fill', text: 'Mejores valorados', query: '¿Cómo puedo ver qué jugadores de mi lista de scouting tienen las mejores valoraciones?' },
      { icon: 'bi-funnel', text: 'Pipeline de fichajes', query: '¿Cómo gestiono el pipeline de fichajes en Sphaira? ¿Qué fases hay?' },
      { icon: 'bi-person-plus', text: 'Posiciones a cubrir', query: 'Según la plantilla actual, ¿qué posiciones debería priorizar en el scouting?' },
      { icon: 'bi-clipboard2-data', text: 'Generar informe', query: '¿Cómo genero un informe de scouting con IA para un jugador de mi lista?' },
    ],
    'scouting-mis-scoutings': [
      { icon: 'bi-list-stars', text: 'Mi lista de observación', query: '¿Cómo organizo y filtro mi lista de jugadores observados en Sphaira?' },
      { icon: 'bi-star-fill', text: 'Mejor valorado', query: '¿Cómo identifico al jugador mejor valorado en mi lista de scouting?' },
      { icon: 'bi-clipboard2-data', text: 'Informe IA', query: '¿Cómo genero automáticamente un informe de scouting con IA para un jugador?' },
      { icon: 'bi-person-plus', text: 'Añadir evaluación', query: '¿Cómo añado una nueva evaluación a un jugador que estoy observando?' },
    ],
    'scouting-pipeline': [
      { icon: 'bi-funnel', text: 'Fases del pipeline', query: '¿Cuáles son las fases del pipeline de fichajes en Sphaira y cómo avanzo un jugador de fase?' },
      { icon: 'bi-people', text: 'Candidatos activos', query: '¿Cuántos jugadores tengo activamente en el pipeline de fichajes y en qué fases están?' },
      { icon: 'bi-person-check', text: 'Priorizar candidatos', query: '¿Cómo decido qué candidatos priorizar para el próximo mercado de fichajes?' },
      { icon: 'bi-bar-chart-line', text: 'Comparar candidatos', query: '¿Cómo comparo dos jugadores candidatos para tomar la mejor decisión de fichaje?' },
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
    private aiPageContextService: AiPageContextService,
    private voiceRecognition: VoiceRecognitionService,
    private injuryService: InjuryService
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.loginService.usuarioActual.subscribe((user) => {
        if (user) {
          this.profileId = user.profileType?.profileId || 0;
          this.userId = user.userId;

          // Override admin: userId=9 actúa también como coach
          if (user.userId === 9 && this.profileId !== 1 && this.profileId !== 2) {
            this.profileId = 2;
          }

          this.isVisible = this.profileId === 1 || this.profileId === 2 || this.profileId === 6 || this.profileId === 7;
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

    this.subs.push(
      this.aiPageContextService.getContext().subscribe(ctx => {
        this.activePageContext = ctx;
      })
    );

    this.subs.push(
      this.aiPageContextService.getBackgroundStats().subscribe(stats => {
        this.backgroundStats = stats;
      })
    );

    this.subs.push(
      this.aiPageContextService.getCoachTeamContext().subscribe(ctx => {
        this.coachTeamContext = ctx;
      })
    );
  }

  private initVoiceRecognition(): void {
    this.isVoiceSupported = this.voiceRecognition.isSupported();

    this.subs.push(
      this.voiceRecognition.transcript$.subscribe(result => {
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
    // Extract clubId from all club route patterns
    const clubPatterns = [
      /cuadro\/(\d+)/,
      /cuadro-de-mandos\/[^/]+\/(\d+)/,
      /historial-pagos-club\/(\d+)/,
      /patrocinadores(?:-usuario)?\/(\d+)/,
      /notificaciones(?:-usuario)?\/(\d+)/,
      /scouting-club\/(\d+)/,
      /club-videos\/(\d+)/,
      /(?:ropa|documentos)\/(\d+)/
    ];
    let foundClubId: number | null = null;
    for (const pat of clubPatterns) {
      const m = url.match(pat);
      if (m) { foundClubId = parseInt(m[1], 10); break; }
    }
    if (foundClubId) {
      this.clubId = foundClubId;
    } else {
      const storedClubId = sessionStorage.getItem('clubId') || localStorage.getItem('clubId');
      if (storedClubId) this.clubId = parseInt(storedClubId, 10);
    }

    // Extract teamId from URL patterns like /calendario/5/... or /jugadores/5
    const urlParts = url.split('/');
    const teamRoutes = ['calendario', 'jugadores', 'menu-entrenador', 'menu-club', 'tareas',
      'estadisticas_equipo', 'estadisticas_jugadores', 'informacion_equipo', 'clasificacion-resultados',
      'entrenadores', 'tactical-board', 'lesiones', 'debrief'];
    for (const route of teamRoutes) {
      const idx = urlParts.indexOf(route);
      if (idx >= 0 && idx + 1 < urlParts.length) {
        const tid = parseInt(urlParts[idx + 1], 10);
        if (!isNaN(tid) && tid > 0) {
          this.currentTeamId = tid;
          break;
        }
      }
    }

    if (url.includes('estadisticas-equipos') || url.includes('estadisticas_equipo')) {
      this.currentScreenContext = 'estadisticas-equipos';
    } else if (url.includes('estadisticas-jugadores') || url.includes('estadisticas_jugadores')) {
      this.currentScreenContext = 'estadisticas-jugadores';
    } else if (url.includes('info-entrenadores') || url.includes('entrenadores')) {
      this.currentScreenContext = 'info-entrenadores';
    } else if (url.includes('info-jugadores') || url.includes('jugadores')) {
      this.currentScreenContext = 'jugadores';
    } else if (url.includes('calendario')) {
      this.currentScreenContext = 'calendario';
    } else if (url.includes('lesiones')) {
      this.currentScreenContext = 'lesiones';
    } else if (url.includes('documentos')) {
      this.currentScreenContext = 'documentos';
    } else if (url.includes('historial-pagos') || url.includes('pagos')) {
      this.currentScreenContext = 'pagos';
    } else if (url.includes('ropa')) {
      this.currentScreenContext = 'ropa';
    } else if (url.includes('patrocinadores')) {
      this.currentScreenContext = 'patrocinadores';
    } else if (url.includes('notificaciones')) {
      this.currentScreenContext = 'notificaciones';
    } else if (url.includes('scouting-player') && url.includes('pipeline')) {
      this.currentScreenContext = 'scouting-pipeline';
    } else if (url.includes('scouting')) {
      this.currentScreenContext = 'scouting';
    } else {
      this.currentScreenContext = 'dashboard';
    }

    // Precargar el contexto del equipo coach cuando hay teamId y el usuario es coach
    if (this.currentTeamId && (this.profileId === 2 || this.profileId === 6 || this.profileId === 7)) {
      this.aiPageContextService.preloadForCoachTeam(this.currentTeamId);
    }
  }

  private updateSuggestions(): void {
    // Lesiones: sugerencias dinámicas basadas en lesiones reales del equipo
    if ((this.currentScreenContext === 'lesiones' || this.currentScreenContext === 'lesiones-equipo')
        && (this.profileId === 1 || this.profileId === 2 || this.profileId === 6 || this.profileId === 7)) {
      const teamId = this.currentTeamId;
      if (teamId) {
        this.injuryService.getInjuriesByTeam(teamId).subscribe({
          next: (injuries) => this.setInjurySuggestions(injuries),
          error: () => this.setInjurySuggestions([])
        });
      } else {
        this.setInjurySuggestions([]);
      }
      return;
    }

    // Dashboard: sugerencias distintas según perfil
    if (this.currentScreenContext === 'dashboard') {
      if (this.profileId === 2) {
        this.quickSuggestions = this.screenSuggestions['dashboard_coach'];
      } else if (this.profileId === 6 || this.profileId === 7) {
        this.quickSuggestions = this.screenSuggestions['dashboard_fisio'];
      } else {
        this.quickSuggestions = this.screenSuggestions['dashboard'];
      }
      this.showSuggestions = true;
      return;
    }

    this.quickSuggestions = this.screenSuggestions[this.currentScreenContext] || this.screenSuggestions['dashboard'];
    this.showSuggestions = true;
  }

  private setInjurySuggestions(injuries: Injury[]): void {
    const active = injuries.filter(i => i.status === 'baja');
    const recovery = injuries.filter(i => i.status !== 'baja' && i.status !== 'alta');
    const chips: SuggestionChip[] = [];

    // Jugadores con lesiones activas (máx. 2)
    for (const inj of active.slice(0, 2)) {
      const name = inj.playerName || 'el jugador';
      const zone = inj.zoneLabel || inj.zone || 'lesión';
      chips.push({
        icon: 'bi-bandaid',
        text: `${name} — ${zone}`,
        query: `¿Cómo está evolucionando la lesión de ${name}? Tiene una ${zone} activa (fase RTP: ${inj.rtpPhase}).`
      });
    }

    // Jugadores en recuperación (máx. 2)
    for (const inj of recovery.slice(0, 2)) {
      const name = inj.playerName || 'el jugador';
      const zone = inj.zoneLabel || inj.zone || 'lesión';
      chips.push({
        icon: 'bi-arrow-up-circle',
        text: `RTP: ${name}`,
        query: `¿Cuándo puede volver a jugar ${name}? Tiene una ${zone} en fase RTP ${inj.rtpPhase}. Alta prevista: ${inj.dateReturn || 'sin fecha'}.`
      });
    }

    // Resumen general si hay lesiones
    if (injuries.length > 0) {
      chips.push({
        icon: 'bi-heart-pulse',
        text: 'Resumen de bajas',
        query: `Dame un resumen del estado de lesiones del equipo: ${active.length} activas, ${recovery.length} en recuperación.`
      });
    }

    // Sugerencias genéricas de relleno hasta 4
    const generic: SuggestionChip[] = [
      { icon: 'bi-shield-check', text: 'Prevención', query: '¿Qué ejercicios preventivos recomiendas para reducir el riesgo de lesiones?' },
      { icon: 'bi-calendar-check', text: 'Carga del equipo', query: '¿Cómo afectan las bajas por lesión a la planificación de entrenamientos?' },
    ];
    for (const g of generic) {
      if (chips.length >= 4) break;
      chips.push(g);
    }

    this.quickSuggestions = chips.slice(0, 4);
    this.showSuggestions = true;
  }

  /** Update suggestions based on the user's last message topic */
  private updateSuggestionsFromContext(userText: string): void {
    const text = userText.toLowerCase();

    // Coach contextual follow-ups
    if (this.profileId === 2) {
      if (text.includes('entrenamient') || text.includes('ejercicio') || text.includes('sesion') || text.includes('planif')) {
        this.quickSuggestions = this.contextualSuggestions['entrenamiento'];
      } else if (text.includes('partido') || text.includes('rival') || text.includes('tactica') || text.includes('alineacion') || text.includes('once')) {
        this.quickSuggestions = this.contextualSuggestions['partido'];
      } else if (text.includes('jugador') || text.includes('rendimiento') || text.includes('ficha') || text.includes('disponible')) {
        this.quickSuggestions = this.contextualSuggestions['jugadores'];
      } else {
        this.quickSuggestions = this.contextualSuggestions['entrenamiento'];
      }
      this.showSuggestions = true;
      return;
    }

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
    // Preserve current screen context so the full-page chat can show relevant suggestions
    sessionStorage.setItem('ai_source_context', this.currentScreenContext);
    if (this.currentTeamId) {
      sessionStorage.setItem('ai_source_teamId', String(this.currentTeamId));
    }
    // Sync conversation: pass current messages to the full-page assistant
    const realMessages = this.messages.filter(m => !m.isTyping);
    if (realMessages.length > 1) {
      this.aiPageContextService.setFabSync(realMessages, this.currentConversationId);
    }
    if (this.profileId === 2 || this.profileId === 6 || this.profileId === 7) {
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

    // Build conversation history (last 10 messages, excluding typing/action previews)
    const history = this.messages
      .filter(m => !m.isTyping && m.text && m.text.trim().length > 0)
      .slice(-10)
      .map(m => ({ role: m.role, text: m.isActionPreview ? '[Acción propuesta: ' + m.text + ']' : m.text }));

    // Enrich message with statistics context (page-specific or background)
    const pageCtx = this.activePageContext;
    let messageToSend = text;
    let activeCodeToReal: Map<string, string> | null = null;

    if (pageCtx) {
      // Priority 1: page-specific context (user is on a stats page)
      let anonymizedText = text;
      pageCtx.codeToReal.forEach((real, code) => {
        anonymizedText = anonymizedText.replace(
          new RegExp(real.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), code
        );
      });
      const label = pageCtx.type === 'estadisticas-equipos'
        ? '[ESTADÍSTICAS DE EQUIPOS - DATOS ANONIMIZADOS]'
        : '[ESTADÍSTICAS DE JUGADORES - DATOS ANONIMIZADOS]';
      messageToSend = anonymizedText + '\n\n' + label + '\n' + pageCtx.contextText;
      activeCodeToReal = pageCtx.codeToReal;

    } else if (this.backgroundStats) {
      // Priority 2: background stats loaded at login
      const allCodes = new Map<string, string>();
      const parts: string[] = [];

      if (this.backgroundStats.teamStats) {
        const { contextText, codeToReal } = this.backgroundStats.teamStats;
        parts.push('[ESTADÍSTICAS DE EQUIPOS - DATOS ANONIMIZADOS]\n' + contextText);
        codeToReal.forEach((v, k) => allCodes.set(k, v));
      }
      if (this.backgroundStats.playerStats) {
        const { contextText, codeToReal } = this.backgroundStats.playerStats;
        parts.push('[ESTADÍSTICAS DE JUGADORES - DATOS ANONIMIZADOS]\n' + contextText);
        codeToReal.forEach((v, k) => allCodes.set(k, v));
      }
      if (this.backgroundStats.paymentStats) {
        const { contextText, codeToReal } = this.backgroundStats.paymentStats;
        parts.push('[PAGOS Y CUOTAS DE JUGADORES - DATOS ANONIMIZADOS]\n' + contextText);
        codeToReal.forEach((v, k) => allCodes.set(k, v));
      }
      if (this.backgroundStats.documentStats) {
        const { contextText, codeToReal } = this.backgroundStats.documentStats;
        parts.push('[DOCUMENTOS DEL CLUB - DATOS ANONIMIZADOS]\n' + contextText);
        codeToReal.forEach((v, k) => allCodes.set(k, v));
      }
      if (this.backgroundStats.ropaStats) {
        const { contextText, codeToReal } = this.backgroundStats.ropaStats;
        parts.push('[EQUIPACIÓN DE JUGADORES - DATOS ANONIMIZADOS]\n' + contextText);
        codeToReal.forEach((v, k) => allCodes.set(k, v));
      }
      if (this.backgroundStats.notifStats) {
        const { contextText, codeToReal } = this.backgroundStats.notifStats;
        parts.push('[NOTIFICACIONES ENVIADAS - DATOS ANONIMIZADOS]\n' + contextText);
        codeToReal.forEach((v, k) => allCodes.set(k, v));
      }
      if (this.backgroundStats.mediaStats) {
        const { contextText, codeToReal } = this.backgroundStats.mediaStats;
        parts.push('[BIBLIOTECA DE VÍDEOS DEL CLUB]\n' + contextText);
        codeToReal.forEach((v, k) => allCodes.set(k, v));
      }
      if (this.backgroundStats.scoutingStats) {
        const { contextText, codeToReal } = this.backgroundStats.scoutingStats;
        parts.push('[SCOUTING - JUGADORES OBSERVADOS - DATOS ANONIMIZADOS]\n' + contextText);
        codeToReal.forEach((v, k) => allCodes.set(k, v));
      }
      if (this.backgroundStats.staffStats) {
        const { contextText, codeToReal } = this.backgroundStats.staffStats;
        parts.push('[STAFF / USUARIOS CON ACCESO AL DASHBOARD - DATOS ANONIMIZADOS]\n' + contextText);
        codeToReal.forEach((v, k) => allCodes.set(k, v));
      }

      if (parts.length > 0) {
        let anonymizedText = text;
        allCodes.forEach((real, code) => {
          anonymizedText = anonymizedText.replace(
            new RegExp(real.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), code
          );
        });
        messageToSend = anonymizedText + '\n\n' + parts.join('\n\n');
        activeCodeToReal = allCodes;
      }
    }

    // Añadir contexto completo del equipo coach (plantilla + lesiones + partidos + clasificación)
    if (this.coachTeamContext) {
      const coachParts: string[] = [];
      if (this.coachTeamContext.playerStats) {
        coachParts.push('[PLANTILLA DEL EQUIPO (jugadores, posiciones y dorsales)]\n' + this.coachTeamContext.playerStats);
      }
      if (this.coachTeamContext.injuryStats) {
        coachParts.push('[LESIONES ACTUALES DEL EQUIPO]\n' + this.coachTeamContext.injuryStats);
      }
      if (this.coachTeamContext.matchStats) {
        coachParts.push('[RESULTADOS Y ESTADÍSTICAS DE PARTIDOS DEL EQUIPO (Liga, Amistoso, Copa, etc.)]\n' + this.coachTeamContext.matchStats);
      }
      if (this.coachTeamContext.classification) {
        coachParts.push('[CLASIFICACIÓN ACTUAL DE LIGA]\n' + this.coachTeamContext.classification);
      }
      if (coachParts.length > 0) {
        messageToSend = messageToSend + '\n\n' + coachParts.join('\n\n');
      }
    }

    this.chatSub?.unsubscribe();
    this.chatSub = this.aiChatService.sendMessage(this.userId, this.clubId, this.currentScreenContext, messageToSend, apiKeyType, this.currentTeamId, history)
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
            // AI proposed actions - show preview for confirmation
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
          this.updateSuggestionsFromContext(lastUserText);
          this.shouldScroll = true;
          this.saveConversation();
          this.focusChatInput();
        },
        error: () => {
          const idx = this.messages.indexOf(typingMsg);
          if (idx > -1) this.messages.splice(idx, 1);
          this.addAssistantMessage('Error de conexion. Intentalo de nuevo.');
          this.showSuggestions = true;
          this.saveConversation();
          this.focusChatInput();
        }
      });
  }

  /* ─── PDF Calendar Import ─────────────────────────────────── */

  openPdfPicker(): void {
    this.pdfInputRef?.nativeElement?.click();
  }

  onPdfSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.selectedPdfFile = file;
    this.showPdfImportBar = true;
    // Reset input so the same file can be re-selected if needed
    input.value = '';
  }

  cancelPdfImport(): void {
    this.selectedPdfFile = null;
    this.pdfTeamName = '';
    this.showPdfImportBar = false;
  }

  startCalendarImport(): void {
    if (!this.selectedPdfFile || !this.pdfTeamName.trim() || this.importingCalendar) return;
    if (!this.currentTeamId) {
      this.addAssistantMessage('No se detectó el equipo actual. Abre el chat desde la sección de Calendario de un equipo concreto.');
      return;
    }
    if (this.creditsAvailable <= 0) {
      this.addAssistantMessage('No tienes créditos disponibles. Pulsa en "créditos" para comprar más.');
      return;
    }

    const file = this.selectedPdfFile;
    const teamName = this.pdfTeamName.trim();
    this.cancelPdfImport();

    this.messages.push({
      id: ++this.msgIdCounter,
      role: 'user',
      text: `Importar calendario PDF: "${file.name}" para el equipo "${teamName}"`,
      timestamp: new Date(),
    });
    this.shouldScroll = true;
    this.showSuggestions = false;

    const typingMsg: ChatMessage = {
      id: ++this.msgIdCounter,
      role: 'assistant',
      text: '',
      timestamp: new Date(),
      isTyping: true,
    };
    this.messages.push(typingMsg);
    this.importingCalendar = true;
    this.isResponding = true;

    this.aiChatService.importCalendar(this.userId, this.clubId, this.currentTeamId, teamName, file)
      .pipe(finalize(() => {
        this.importingCalendar = false;
        this.isResponding = false;
      }))
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
            if (resp.creditsRemaining !== undefined) this.creditsAvailable = resp.creditsRemaining;
          } else if (resp.success && resp.response) {
            this.addAssistantMessage(resp.response);
            if (resp.creditsRemaining !== undefined) this.creditsAvailable = resp.creditsRemaining;
          } else {
            this.addAssistantMessage(resp.message || 'No se pudieron extraer partidos del PDF.');
          }
          this.shouldScroll = true;
          this.saveConversation();
          this.focusChatInput();
        },
        error: () => {
          const idx = this.messages.indexOf(typingMsg);
          if (idx > -1) this.messages.splice(idx, 1);
          this.addAssistantMessage('Error al procesar el PDF. Inténtalo de nuevo.');
          this.saveConversation();
          this.focusChatInput();
        }
      });
  }

  confirmActions(msg: ChatMessage): void {
    if (!msg.actionToken || msg.actionExecuted) return;

    // Handle exportTableToExcel entirely in the frontend (no backend call needed)
    const exportAction = (msg.pendingActions || []).find(a => a.function === 'exportTableToExcel');
    if (exportAction) {
      msg.actionExecuted = true;
      try {
        const args = JSON.parse(exportAction.arguments || '{}');
        this.generateExcel(args.tableType, args.filterPending === true);
      } catch (e) {
        this.addAssistantMessage('❌ Error al generar el Excel.');
      }
      this.shouldScroll = true;
      this.saveConversation();
      this.focusChatInput();
      return;
    }

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

  private generateExcel(tableType: string, filterPending: boolean): void {
    const bg = this.backgroundStats;
    const pageCtx = this.activePageContext;

    let contextText: string | null = null;
    let codeToReal: Map<string, string> | null = null;
    let fileName = 'exportacion';

    if (tableType === 'pagos' && bg?.paymentStats) {
      contextText = bg.paymentStats.contextText;
      codeToReal = bg.paymentStats.codeToReal;
      fileName = filterPending ? 'pagos_pendientes' : 'pagos_cuotas';
    } else if (tableType === 'estadisticas-equipos') {
      const src = bg?.teamStats || (pageCtx?.type === 'estadisticas-equipos' ? pageCtx : null);
      if (src) { contextText = src.contextText; codeToReal = src.codeToReal; }
      fileName = 'estadisticas_equipos';
    } else if (tableType === 'estadisticas-jugadores') {
      const src = bg?.playerStats || (pageCtx?.type === 'estadisticas-jugadores' ? pageCtx : null);
      if (src) { contextText = src.contextText; codeToReal = src.codeToReal; }
      fileName = 'estadisticas_jugadores';
    }

    if (!contextText) {
      this.addAssistantMessage('❌ No hay datos disponibles para exportar. Asegúrate de que los datos estén cargados.');
      return;
    }

    // Parse pipe-separated table and de-anonymize
    const lines = contextText.split('\n').filter(l => l.trim());
    if (lines.length < 2) {
      this.addAssistantMessage('❌ La tabla no tiene datos suficientes para exportar.');
      return;
    }

    const headers = lines[0].split('|').map(h => h.trim());
    let dataRows = lines.slice(1).map(line => line.split('|').map(cell => cell.trim()));

    // Filter pending payments if requested
    if (filterPending && tableType === 'pagos') {
      const estadoIdx = headers.findIndex(h => h.toLowerCase() === 'estado');
      if (estadoIdx >= 0) {
        dataRows = dataRows.filter(row => row[estadoIdx]?.toLowerCase() === 'pendiente');
      }
    }

    // De-anonymize: replace codes with real names
    if (codeToReal) {
      const codeEntries = Array.from(codeToReal.entries())
        .sort((a, b) => b[0].length - a[0].length);
      dataRows = dataRows.map(row =>
        row.map(cell => {
          let val = cell;
          for (const [code, real] of codeEntries) {
            if (val === code) { val = real; break; }
          }
          return val;
        })
      );
    }

    // Build worksheet
    const wsData = [headers, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Datos');

    // Auto-width for columns
    const colWidths = headers.map((h, i) => ({
      wch: Math.max(h.length, ...dataRows.map(r => (r[i] || '').length))
    }));
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    this.addAssistantMessage(`✅ Excel generado: **${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx** — ${dataRows.length} filas exportadas.`);
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
      if (this.chatInputRef?.nativeElement) {
        this.chatInputRef.nativeElement.focus();
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
    this.showSuggestions = true;
  }

  dismissPageContext(): void {
    this.aiPageContextService.clearContext();
  }

  dismissBackgroundStats(): void {
    this.aiPageContextService.invalidateClubCache();
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
      this.resetInputSize();
    }
  }

  autoResizeInput(event?: Event): void {
    const el = event ? event.target as HTMLTextAreaElement : this.chatInputRef?.nativeElement;
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
    const el = this.chatInputRef?.nativeElement;
    if (el) {
      el.style.height = 'auto';
      el.style.overflowY = 'hidden';
    }
  }

  private addWelcomeMessage(): void {
    let msg = '¡Hola! 👋 Soy tu asistente IA de Sphaira. ¿En qué puedo ayudarte?';
    if (this.profileId === 2) {
      msg = '¡Hola, entrenador! 👋 Puedo ayudarte con la planificación de entrenamientos, análisis de jugadores, táctica y mucho más. ¿Por dónde empezamos?';
    } else if (this.profileId === 6) {
      msg = '¡Hola! 👋 Soy tu asistente de fisioterapia. Puedo ayudarte con el seguimiento de lesiones, protocolos de recuperación y prevención. ¿En qué te ayudo?';
    } else if (this.profileId === 7) {
      msg = '¡Hola! 👋 Soy tu asistente de nutrición deportiva. Puedo ayudarte con planes nutricionales, hidratación y rendimiento. ¿Qué necesitas?';
    }
    this.addAssistantMessage(msg);
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
    // Keep history panel open so user can switch between conversations
    this.showSuggestions = true;
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
