import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoginService } from 'src/app/core/services/login/login.service';
import { AiChatService, AiPendingAction } from 'src/app/core/services/ai-chat/ai-chat.service';
import { AiPageContextService, CoachTeamContext } from 'src/app/core/services/ai-chat/ai-page-context.service';
import { InjuryService } from 'src/app/core/services/injury/injury.service';
import { Injury } from 'src/app/core/services/injury/injury.model';
import { User } from 'src/app/core/models/users/user.model';
import { VoiceRecognitionService } from 'src/app/core/services/voice-recognition/voice-recognition.service';
import { TutorialService } from 'src/app/core/services/tutorial/tutorial.service';
import { DemoService } from 'src/app/core/services/demo/demo.service';
import { buildDemoClubContext } from 'src/app/core/services/demo/demo-context';
import { getSportConfig, SportConfig } from 'src/app/core/models/sport/sport-config.model';
import { SportContextService } from 'src/app/core/services/sport/sport-context.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { Response } from 'src/app/core/services/models/response.model';

/* ═══════════════════════════════════════
   INTERFACES
═══════════════════════════════════════ */

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
  preview: string;
}

/* ═══════════════════════════════════════
   Demo coach: patrones multilenguaje + claves COACH_DEMO (i18n)
═══════════════════════════════════════ */

const COACH_HOME_ICONS = ['bi-clipboard-check', 'bi-lightbulb', 'bi-trophy', 'bi-graph-up', 'bi-people', 'bi-diagram-3'];

const COACH_CTX_ICONS: Record<string, string[]> = {
  TRAIN: ['bi-lightbulb', 'bi-calendar3', 'bi-person-check', 'bi-trophy', 'bi-heart-pulse', 'bi-arrow-clockwise'],
  MATCH: ['bi-people', 'bi-search', 'bi-diagram-3', 'bi-graph-up', 'bi-clipboard-check', 'bi-arrow-clockwise'],
  STATS: ['bi-star', 'bi-trophy', 'bi-diagram-3', 'bi-trophy', 'bi-clipboard-check', 'bi-arrow-clockwise'],
  TACT: ['bi-people', 'bi-graph-up', 'bi-trophy', 'bi-search', 'bi-clipboard-check', 'bi-arrow-clockwise'],
  INJ: ['bi-people', 'bi-person-check', 'bi-trophy', 'bi-graph-up', 'bi-clipboard-check', 'bi-arrow-clockwise'],
};

const COACH_DEMO_PATTERN_ENTRIES: { pattern: RegExp; key: string }[] = [
  { pattern: /entrenamientos?.*(semana|programados|pr[óo]xim|plan|hoy)|(training|workouts?).*(week|today|upcoming|scheduled)|sessions?.*(this week|scheduled)/i, key: 'R_TRAIN_WEEK' },
  { pattern: /ejercicios?.*(sugier|recomiend|propón|idea|calentamiento|técnic)|exercises?.*(suggest|recommend|warm)|drills?.*(for|today)/i, key: 'R_EXERCISES' },
  { pattern: /pr[óo]ximo.*(partido|partidos|encuentro|rival)|next.*(match|game|fixture|opponent|fixtures)/i, key: 'R_NEXT_MATCH' },
  { pattern: /(estad[íi]sticas|rendimiento).*(equipo|jugador|temporada)|(stats|statistics).*(team|player|season)/i, key: 'R_TEAM_STATS' },
  { pattern: /(jugador|jugadores).*(destaca|mejor|rendimiento|estado|forma)|players?.*(standout|best|perform|form)/i, key: 'R_PLAYERS' },
  { pattern: /(t[áa]ctica|formaci[óo]n|sistema|esquema)|(tactics?|formation|system|shape)/i, key: 'R_TACTICS' },
  { pattern: /(lesion|lesiones|lesionados|disponibilidad)|(injur|injuries|availability)/i, key: 'R_INJURIES' },
  { pattern: /(asistencia|faltas|ausencias|puntualidad)|(attendance|absent|punctuality)/i, key: 'R_ATTENDANCE' },
  { pattern: /(rival|analizar|an[áa]lisis|scouting|preparar)|(opponent|scout|analy[sz]e|prepare)/i, key: 'R_RIVAL' },
  { pattern: /(plan|planificaci[óo]n|periodizaci[óo]n|microciclo|mesociclo)|(periodi[sz]ation|microcycle|mesocycle)/i, key: 'R_PLAN' },
  { pattern: /(goleador|goleadores|goles|anotad|puntos anotad)|(scorers?|top scorer|leading scorer)/i, key: 'R_SCORERS' },
  { pattern: /(hola|buenos d[íi]as|buenas|hey|qu[ée] tal|hello|hi|good morning|good afternoon)/i, key: 'R_GREET' },
  { pattern: /(gracias|genial|perfecto|vale|ok\b|thanks|thank you|great|cool)/i, key: 'R_THANKS' },
  { pattern: /(ayuda|qu[ée] puedes|qu[ée] sabes|funciones)|(help|what can you|capabilities)/i, key: 'R_HELP' },
  { pattern: /(alineaci[óo]n|once|titulares|convocatoria)|(line-?up|lineup|starting xi|starting eleven|squad selection)/i, key: 'R_LINEUP' },
];

/* ═══════════════════════════════════════
   COMPONENTE
═══════════════════════════════════════ */

@Component({
  selector: 'app-asistente-ia-coach',
  templateUrl: './asistente-ia-coach.component.html',
  styleUrls: ['./asistente-ia-coach.component.scss'],
})
export class AsistenteIaCoachComponent implements OnInit, AfterViewChecked, OnDestroy {
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
  private teamId: number | null = null;
  private chatSub: Subscription | null = null;
  private coachTeamContext: CoachTeamContext | null = null;
  private langSub: Subscription | null = null;

  // Voice recognition
  isRecording = false;
  isVoiceSupported = false;
  private voiceTranscriptSub: Subscription | null = null;
  private voiceListeningSub: Subscription | null = null;
  private voiceErrorSub: Subscription | null = null;
  private voiceTranscriptBase = '';

  /* ── Historial ── */
  showHistory = true;
  conversations: ConversationSummary[] = [];
  currentConversationId: string | null = null;

  /* ── Delete confirmation ── */
  showDeleteConfirm = false;
  conversationToDelete: ConversationSummary | null = null;

  suggestions: SuggestionChip[] = [];

  showSuggestions = true;
  profileId = 0;

  /** Deporte activo (demo / equipo seleccionado). */
  sportConfig: SportConfig = getSportConfig('futbol');

  constructor(
    private loginService: LoginService,
    private router: Router,
    private location: Location,
    private translate: TranslateService,
    private aiChatService: AiChatService,
    private aiPageContextService: AiPageContextService,
    private voiceRecognition: VoiceRecognitionService,
    private injuryService: InjuryService,
    private tutorialService: TutorialService,
    private demoService: DemoService,
    private sportContextService: SportContextService,
    private teamService: TeamService,
    private cdr: ChangeDetectorRef
  ) {}

  private getCoachWelcomeMessage(): string {
    return this.translate.instant('SPORT_UI.AI_COACH_WELCOME', { emoji: this.sportConfig.emoji });
  }

  ngOnInit(): void {
    this.sportConfig = getSportConfig(this.sportContextService.getSport());
    this.rebuildDefaultHomeSuggestions();
    this.langSub = this.translate.onLangChange.subscribe(() => {
      this.refreshSuggestionsForLanguage();
      this.refreshWelcomeMessageIfNeeded();
      this.cdr.markForCheck();
    });
    setTimeout(() => this.tutorialService.start('asistente-ia-coach', true), 600);
    this.loginService.usuarioActual.subscribe((user) => {
      this.usuarioActual = user;
      if (user) {
        this.userId = user.userId;
        this.profileId = user.profileType?.profileId ?? 0;
        this.loadCredits();
        this.loadConversationsList();
      }
    });

    const storedClubId = sessionStorage.getItem('clubId');
    if (storedClubId) this.clubId = parseInt(storedClubId, 10);

    // Try to extract teamId from the current URL or sessionStorage
    const urlParts = this.router.url.split('/');
    const teamRoutes = ['calendario', 'jugadores', 'menu-entrenador', 'menu-club', 'tareas',
      'estadisticas_equipo', 'estadisticas_jugadores', 'informacion_equipo',
      'entrenadores', 'tactical-board', 'lesiones', 'debrief', 'menu-fisio'];
    for (const route of teamRoutes) {
      const idx = urlParts.indexOf(route);
      if (idx >= 0 && idx + 1 < urlParts.length) {
        const tid = parseInt(urlParts[idx + 1], 10);
        if (!isNaN(tid) && tid > 0) {
          this.teamId = tid;
          break;
        }
      }
    }
    if (!this.teamId) {
      const storedTeamId = sessionStorage.getItem('teamId');
      if (storedTeamId) this.teamId = parseInt(storedTeamId, 10);
    }

    if (this.teamId) {
      this.teamService.getTeamById(String(this.teamId)).subscribe((res: Response) => {
        const s = (res?.data as { sport?: string })?.sport;
        if (s) {
          this.sportContextService.setSport(s);
          this.sportConfig = getSportConfig(s);
        }
      });
    }

    // Precargar partidos y clasificación del equipo para el contexto de la IA
    if (this.teamId) {
      this.aiPageContextService.preloadForCoachTeam(this.teamId);
      this.aiPageContextService.getCoachTeamContext().subscribe(ctx => {
        this.coachTeamContext = ctx;
      });
    }

    // Check if arriving from lesiones screen (set by FAB or direct nav)
    const sourceContext = sessionStorage.getItem('ai_source_context');
    const sourceTeamId = sessionStorage.getItem('ai_source_teamId');
    const fromLesiones = sourceContext === 'lesiones';
    if (fromLesiones && sourceTeamId && !this.teamId) {
      this.teamId = parseInt(sourceTeamId, 10);
    }
    sessionStorage.removeItem('ai_source_context');
    sessionStorage.removeItem('ai_source_teamId');

    this.loadConversationsList();

    const isFisio = this.profileId === 6;
    const isFromLesiones = fromLesiones && (this.profileId === 1 || this.profileId === 2);

    const welcomeMsg = isFisio
      ? this.translate.instant('COACH_DEMO.FISIO_WELCOME')
      : this.getCoachWelcomeMessage();

    this.addAssistantMessage(welcomeMsg);

    if (isFisio) {
      this.setSuggestionsForFisio([]);
      if (this.teamId) {
        this.injuryService.getInjuriesByTeam(this.teamId).subscribe({
          next: (injuries) => this.setSuggestionsForFisio(injuries),
          error: () => this.setSuggestionsForFisio([])
        });
      }
    } else if (isFromLesiones && this.teamId) {
      // Club/Coach arriving from lesiones section — show injury-relevant suggestions
      this.injuryService.getInjuriesByTeam(this.teamId).subscribe({
        next: (injuries) => this.setSuggestionsForLesiones(injuries),
        error: () => this.rebuildDefaultHomeSuggestions()
      });
    }

    this.initVoiceRecognition();
  }

  /** Chips inicio (coach) o refresco tras cambiar idioma */
  private rebuildDefaultHomeSuggestions(): void {
    if (this.profileId === 6) return;
    this.suggestions = COACH_HOME_ICONS.map((icon, i) => ({
      icon,
      text: this.translate.instant(`COACH_DEMO.D${i}_T`),
      query: this.translate.instant(`COACH_DEMO.D${i}_Q`),
    }));
  }

  private chipsForCtx(mode: keyof typeof COACH_CTX_ICONS | 'HOME'): SuggestionChip[] {
    if (mode === 'HOME') {
      return COACH_HOME_ICONS.map((icon, i) => ({
        icon,
        text: this.translate.instant(`COACH_DEMO.D${i}_T`),
        query: this.translate.instant(`COACH_DEMO.D${i}_Q`),
      }));
    }
    const icons = COACH_CTX_ICONS[mode];
    return [0, 1, 2, 3, 4, 5].map((i) => ({
      icon: icons[i],
      text: this.translate.instant(`COACH_DEMO.CTX_${mode}_${i}_T`),
      query: this.translate.instant(`COACH_DEMO.CTX_${mode}_${i}_Q`),
    }));
  }

  /** Si el chat solo tiene el mensaje de bienvenida (sin mensajes de usuario), actualiza su texto al idioma activo. */
  private refreshWelcomeMessageIfNeeded(): void {
    if (this.messages.some(m => m.role === 'user')) {
      return;
    }
    const nonTyping = this.messages.filter(m => !m.isTyping);
    if (nonTyping.length !== 1 || nonTyping[0].role !== 'assistant') {
      return;
    }
    const isFisio = this.profileId === 6;
    nonTyping[0].text = isFisio
      ? this.translate.instant('COACH_DEMO.FISIO_WELCOME')
      : this.getCoachWelcomeMessage();
  }

  private localeTag(): string {
    const lang = (this.translate.currentLang || this.translate.defaultLang || 'es').split('-')[0];
    const map: Record<string, string> = {
      es: 'es-ES',
      en: 'en-GB',
      fr: 'fr-FR',
      de: 'de-DE',
      it: 'it-IT',
      pt: 'pt-PT',
    };
    return map[lang] || lang;
  }

  private refreshSuggestionsForLanguage(): void {
    if (this.profileId === 6) {
      if (this.teamId) {
        this.injuryService.getInjuriesByTeam(this.teamId).subscribe({
          next: (injuries) => this.setSuggestionsForFisio(injuries),
          error: () => this.setSuggestionsForFisio([]),
        });
      }
      return;
    }
    if ((this.profileId === 1 || this.profileId === 2) && this.teamId) {
      this.injuryService.getInjuriesByTeam(this.teamId).subscribe({
        next: (injuries) => {
          if (injuries.some((i) => i.status !== 'alta')) {
            this.setSuggestionsForLesiones(injuries);
          } else {
            this.rebuildDefaultHomeSuggestions();
          }
        },
        error: () => this.rebuildDefaultHomeSuggestions(),
      });
      return;
    }
    this.rebuildDefaultHomeSuggestions();
  }

  private coachDemoParams(): Record<string, string> {
    const cfg = this.sportConfig;
    const sup = cfg.scoringUnitPlural;
    const su = cfg.scoringUnit;
    const formA = cfg.formations?.[0] ?? '4-3-3';
    const formB = cfg.formations?.[1] ?? '4-2-3-1';
    return {
      emoji: cfg.emoji,
      sup,
      su,
      sup_l: sup.toLowerCase(),
      su_l: su.toLowerCase(),
      formA,
      formB,
      ctxHint: this.buildCoachCtxHint(),
    };
  }

  private buildCoachCtxHint(): string {
    const cfg = this.sportConfig;
    const k = `SPORT_AI_CTX.${cfg.key}`;
    let ctx = this.translate.instant(k);
    if (!ctx || ctx === k) {
      ctx = (cfg.aiContextPrompt || '').trim();
    }
    if (!ctx) return '';
    const fk = `SPORT_FIELD.${cfg.key}`;
    let field = this.translate.instant(fk);
    if (!field || field === fk) {
      field = cfg.fieldName;
    }
    const snippet = ctx.length > 280 ? ctx.slice(0, 280) + '…' : ctx;
    return `\n\n_Contexto (${field}):_ ${snippet}`;
  }

  /** Respuestas demo locales (patrones) cuando aplica; también fallback si la API demo no devuelve texto */
  private coachDemoLocalReply(userText: string): string {
    const params = this.coachDemoParams();
    for (const entry of COACH_DEMO_PATTERN_ENTRIES) {
      if (entry.pattern.test(userText)) {
        return this.translate.instant(`COACH_DEMO.${entry.key}`, params);
      }
    }
    return this.translate.instant('COACH_DEMO.DEFAULT', params);
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

  private loadCredits(): void {
    if (this.userId) {
      this.aiChatService.getCredits(this.userId).subscribe(info => {
        this.creditsAvailable = info.creditsAvailable;
      });
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  /* ═══════════════════════════════════════
     HISTORIAL DE CONVERSACIONES
  ═══════════════════════════════════════ */

  toggleHistory(): void {
    this.showHistory = !this.showHistory;
    if (this.showHistory) {
      this.loadConversationsList();
    }
  }

  loadConversationsList(): void {
    if (!this.userId) return;
    this.aiChatService.listHistory(this.userId).subscribe({
      next: (list) => {
        this.conversations = (list || []).map((c: any) => ({
          id: c.id,
          title: c.title || this.translate.instant('COACH_DEMO.CONV_LIST_FALLBACK'),
          date: c.date,
          messageCount: c.messageCount || 0,
          preview: c.title || '',
        }));
      },
      error: () => {}
    });
  }

  startNewConversation(): void {
    this.currentConversationId = 'conv_' + Date.now();
    this.messages = [];
    this.showHistory = false;
    this.showSuggestions = true;

    const isFisio = this.profileId === 6;
    if (!isFisio) {
      this.rebuildDefaultHomeSuggestions();
    }
    const welcomeMsg = isFisio
      ? this.translate.instant('COACH_DEMO.FISIO_WELCOME')
      : this.getCoachWelcomeMessage();

    this.addAssistantMessage(welcomeMsg);

    if (this.teamId) {
      if (isFisio) {
        this.injuryService.getInjuriesByTeam(this.teamId).subscribe({
          next: (injuries) => this.setSuggestionsForFisio(injuries),
          error: () => this.setSuggestionsForFisio([])
        });
      } else if (this.profileId === 1 || this.profileId === 2) {
        this.injuryService.getInjuriesByTeam(this.teamId).subscribe({
          next: (injuries) => {
            if (injuries.filter(i => i.status !== 'alta').length > 0) {
              this.setSuggestionsForLesiones(injuries);
            }
          },
          error: () => {}
        });
      }
    }
  }

  loadConversation(conv: ConversationSummary): void {
    if (this.currentConversationId !== conv.id) {
      this.saveConversation();
    }
    this.currentConversationId = conv.id;
    this.showSuggestions = false;
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

  deleteConversation(conv: ConversationSummary, event: Event): void {
    event.stopPropagation();
    this.conversationToDelete = conv;
    this.showDeleteConfirm = true;
  }

  confirmDeleteConversation(): void {
    const conv = this.conversationToDelete;
    if (!conv) return;
    this.showDeleteConfirm = false;
    this.conversationToDelete = null;
    // Remove from local list immediately for instant UI feedback
    this.conversations = this.conversations.filter(c => c.id !== conv.id);
    if (this.currentConversationId === conv.id) {
      this.currentConversationId = null;
    }
    // Delete from backend
    this.aiChatService.deleteHistory(conv.id).subscribe();
  }

  cancelDeleteConversation(): void {
    this.showDeleteConfirm = false;
    this.conversationToDelete = null;
  }

  private saveConversation(): void {
    if (!this.currentConversationId || !this.userId) return;
    const userMessages = this.messages.filter(m => m.role === 'user');
    if (userMessages.length === 0) return;
    const title = userMessages[0]?.text?.substring(0, 50) || this.translate.instant('COACH_DEMO.CONV_TITLE_DEFAULT');
    const messages = this.messages
      .filter(m => !m.isTyping && m.text)
      .map(m => ({ role: m.role, text: m.text }));
    this.aiChatService.saveHistory(
      this.userId, this.currentConversationId, title, this.clubId ?? null, 'asistente-coach', messages
    ).subscribe({ next: () => { this.loadConversationsList(); }, error: () => {} });
  }

  /* ═══════════════════════════════════════
     ENVIAR MENSAJE
  ═══════════════════════════════════════ */

  sendMessage(): void {
    const text = this.userInput.trim();
    if (!text || this.isResponding) return;

    const isDemo = this.demoService.isDemoMode();

    if (!isDemo && this.creditsAvailable <= 0) {
      this.addAssistantMessage(this.translate.instant('COACH_DEMO.MSG_NO_CREDITS'));
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
      .map(m => ({
        role: m.role,
        text: m.isActionPreview
          ? this.translate.instant('COACH_DEMO.MSG_ACTION_PREVIEW', { text: m.text })
          : m.text
      }));

    // ── Modo demo: endpoint público sin auth ──────────────────────────────────
    if (isDemo) {
      const demoTeamId  = this.teamId ?? 9001;
      const clubContext = buildDemoClubContext('coach', demoTeamId);

      this.chatSub?.unsubscribe();
      const demoLang = (this.translate.currentLang || this.translate.defaultLang || 'es').split('-')[0];
      this.chatSub = this.aiChatService.sendMessageDemo(text, history, demoLang, clubContext)
        .pipe(finalize(() => { this.isResponding = false; }))
        .subscribe({
          next: (resp) => {
            const idx = this.messages.indexOf(typingMsg);
            if (idx > -1) this.messages.splice(idx, 1);
            if (resp.response) {
              this.addAssistantMessage(resp.response);
            } else if (resp.error) {
              this.addAssistantMessage(resp.error);
            } else {
              this.addAssistantMessage(this.coachDemoLocalReply(text));
            }
            this.shouldScroll = true;
            this.saveConversation();
            this.focusChatInput();
          },
          error: () => {
            const idx = this.messages.indexOf(typingMsg);
            if (idx > -1) this.messages.splice(idx, 1);
            this.addAssistantMessage(this.translate.instant('COACH_DEMO.ERR_CONNECTION'));
            this.focusChatInput();
          }
        });
      return;
    }

    // Enriquecer el mensaje con el contexto completo del equipo
    let enrichedText = text;
    if (this.coachTeamContext) {
      const coachParts: string[] = [];
      if (this.coachTeamContext.upcomingMatches) {
        coachParts.push('[PRÓXIMOS PARTIDOS PROGRAMADOS]\n' + this.coachTeamContext.upcomingMatches);
      }
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
        enrichedText = text + '\n\n' + coachParts.join('\n\n');
      }
    }

    this.chatSub?.unsubscribe();
    this.chatSub = this.aiChatService.sendMessage(this.userId, this.clubId, 'dashboard', enrichedText, 'users', this.teamId, history, true)
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
            this.addAssistantMessage(resp.message || this.translate.instant('COACH_DEMO.MSG_ERROR_GENERIC'));
          }
          this.updateSuggestionsContext(text);
          this.shouldScroll = true;
          this.saveConversation();
          this.focusChatInput();
        },
        error: () => {
          const idx = this.messages.indexOf(typingMsg);
          if (idx > -1) this.messages.splice(idx, 1);
          this.addAssistantMessage(this.translate.instant('COACH_DEMO.MSG_ERROR_NETWORK'));
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
          if ((result.created ?? 0) > 0) {
            parts.push(this.translate.instant('COACH_DEMO.ACTION_N_CREATED', { n: result.created }));
          }
          if ((result.edited ?? 0) > 0) {
            parts.push(this.translate.instant('COACH_DEMO.ACTION_N_EDITED', { n: result.edited }));
          }
          if ((result.deleted ?? 0) > 0) {
            parts.push(this.translate.instant('COACH_DEMO.ACTION_N_DELETED', { n: result.deleted }));
          }
          const body = parts.length > 0 ? parts.join(', ') : this.translate.instant('COACH_DEMO.ACTION_OK_EMPTY');
          const reloading = this.translate.instant('COACH_DEMO.ACTION_RELOADING');
          let summaryMsg = this.translate.instant('COACH_DEMO.ACTION_SUCCESS', { body, reloading });
          if (result.errors && result.errors.length > 0) {
            summaryMsg += this.translate.instant('COACH_DEMO.ACTION_WARNINGS', { errors: result.errors.join(', ') });
          }
          if (result.details && result.details.length > 0) {
            summaryMsg += this.translate.instant('COACH_DEMO.ACTION_DETAILS', { details: result.details.join(', ') });
          }
          this.addAssistantMessage(summaryMsg);
          setTimeout(() => window.dispatchEvent(new CustomEvent('ai-data-changed')), 500);
          setTimeout(() => window.dispatchEvent(new CustomEvent('ai-data-changed')), 1500);
        } else {
          let errMsg = '❌ ' + (result.message || this.translate.instant('COACH_DEMO.ACTION_FAIL'));
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
        this.addAssistantMessage('❌ ' + this.translate.instant('COACH_DEMO.ACTION_CONN_FAIL'));
        this.saveConversation();
        this.focusChatInput();
      }
    });
  }

  cancelActions(msg: ChatMessage): void {
    msg.actionExecuted = true;
    this.addAssistantMessage(this.translate.instant('COACH_DEMO.ACTION_USER_CANCEL'));
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
    this.addAssistantMessage(this.translate.instant('COACH_DEMO.REQUEST_CANCELLED'));
  }

  openCreditsModal(): void {
    this.showCreditsModal = true;
  }

  closeCreditsModal(): void {
    this.showCreditsModal = false;
  }

  ngOnDestroy(): void {
    this.chatSub?.unsubscribe();
    this.langSub?.unsubscribe();
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

  /* ═══════════════════════════════════════
     RESPUESTAS
  ═══════════════════════════════════════ */

  /* ═══════════════════════════════════════
     SUGERENCIAS LESIONES — CLUB / COACH
  ═══════════════════════════════════════ */

  private setSuggestionsForLesiones(injuries: Injury[]): void {
    const active = injuries.filter(i => i.status === 'baja');
    const recovery = injuries.filter(i => i.status !== 'baja' && i.status !== 'alta');
    const chips: SuggestionChip[] = [];
    const playerFb = this.translate.instant('COACH_DEMO.PLAYER_FALLBACK');
    const zoneFb = this.translate.instant('COACH_DEMO.ZONE_FALLBACK');
    const dateUnk = this.translate.instant('COACH_DEMO.DATE_UNKNOWN');
    const dateNone = this.translate.instant('COACH_DEMO.DATE_NONE');

    for (const inj of active.slice(0, 2)) {
      const name = inj.playerName || playerFb;
      const zone = inj.zoneLabel || inj.zone || zoneFb;
      chips.push({
        icon: 'bi-person-x',
        text: this.translate.instant('COACH_DEMO.LES_LOW_T', { name }),
        query: this.translate.instant('COACH_DEMO.LES_LOW_Q', {
          name,
          zone,
          dateReturn: inj.dateReturn || dateUnk,
        }),
      });
    }

    for (const inj of recovery.slice(0, 2)) {
      const name = inj.playerName || playerFb;
      const zone = inj.zoneLabel || inj.zone || zoneFb;
      chips.push({
        icon: 'bi-person-check',
        text: this.translate.instant('COACH_DEMO.LES_RTP_T', { name }),
        query: this.translate.instant('COACH_DEMO.LES_RTP_Q', {
          name,
          zone,
          rtpPhase: inj.rtpPhase ?? '—',
          dateReturn: inj.dateReturn || dateNone,
        }),
      });
    }

    if (injuries.length > 0) {
      chips.push({
        icon: 'bi-heart-pulse',
        text: this.translate.instant('COACH_DEMO.LES_SUM_T'),
        query: this.translate.instant('COACH_DEMO.LES_SUM_Q', {
          active: String(active.length),
          recovery: String(recovery.length),
        }),
      });
    }

    const namesJoined = active.map(i => i.playerName).filter(Boolean).join(', ');
    chips.push({
      icon: 'bi-people',
      text: this.translate.instant('COACH_DEMO.CTX_MATCH_0_T'),
      query:
        active.length > 0
          ? this.translate.instant('COACH_DEMO.LINEUP_Q_INJ', { names: namesJoined })
          : this.translate.instant('COACH_DEMO.LINEUP_Q_NONE'),
    });

    this.suggestions = chips.slice(0, 6);
  }

  /* ═══════════════════════════════════════
     SUGERENCIAS FISIOTERAPEUTA (DINÁMICAS)
  ═══════════════════════════════════════ */

  private setSuggestionsForFisio(injuries: Injury[]): void {
    const active = injuries.filter(i => i.status === 'baja');
    const recovery = injuries.filter(i => i.status !== 'baja' && i.status !== 'alta');
    const chips: SuggestionChip[] = [];
    const playerFb = this.translate.instant('COACH_DEMO.PLAYER_FALLBACK');
    const zoneFb = this.translate.instant('COACH_DEMO.ZONE_FALLBACK');
    const dateNone = this.translate.instant('COACH_DEMO.DATE_NONE');

    for (const inj of active.slice(0, 2)) {
      const name = inj.playerName || playerFb;
      const zone = inj.zoneLabel || inj.zone || zoneFb;
      chips.push({
        icon: 'bi-bandaid',
        text: this.translate.instant('COACH_DEMO.F_LOW_T', { name, zone }),
        query: this.translate.instant('COACH_DEMO.F_LOW_Q', {
          name,
          zone,
          status: inj.status ?? '—',
          rtpPhase: inj.rtpPhase ?? '—',
        }),
      });
    }

    for (const inj of recovery.slice(0, 2)) {
      const name = inj.playerName || playerFb;
      const zone = inj.zoneLabel || inj.zone || zoneFb;
      chips.push({
        icon: 'bi-arrow-up-circle',
        text: this.translate.instant('COACH_DEMO.F_RTP_T', { name }),
        query: this.translate.instant('COACH_DEMO.F_RTP_Q', {
          name,
          zone,
          rtpPhase: inj.rtpPhase ?? '—',
          dateReturn: inj.dateReturn || dateNone,
        }),
      });
    }

    if (injuries.length > 0) {
      chips.push({
        icon: 'bi-heart-pulse',
        text: this.translate.instant('COACH_DEMO.F_SUM_T'),
        query: this.translate.instant('COACH_DEMO.F_SUM_Q', {
          active: String(active.length),
          recovery: String(recovery.length),
        }),
      });
    }

    const genericIcons = ['bi-shield-check', 'bi-calendar-check', 'bi-clipboard2-pulse', 'bi-people'];
    for (let g = 1; g <= 4; g++) {
      if (chips.length >= 6) break;
      chips.push({
        icon: genericIcons[g - 1],
        text: this.translate.instant(`COACH_DEMO.F_G${g}_T`),
        query: this.translate.instant(`COACH_DEMO.F_G${g}_Q`),
      });
    }

    this.suggestions = chips.slice(0, 6);
  }

  /* ═══════════════════════════════════════
     SUGERENCIAS CONTEXTUALES
  ═══════════════════════════════════════ */

  private updateSuggestionsContext(userText: string): void {
    // Para el fisio, recargar sugerencias clínicas dinámicas
    if (this.profileId === 6) {
      if (this.teamId) {
        this.injuryService.getInjuriesByTeam(this.teamId).subscribe({
          next: (injuries) => this.setSuggestionsForFisio(injuries),
          error: () => this.setSuggestionsForFisio([])
        });
      }
      return;
    }

    if (/entrenamiento|ejercicio|sesi[óo]n|training|workout|session|drill/i.test(userText)) {
      this.suggestions = this.chipsForCtx('TRAIN');
    } else if (/partido|rival|encuentro|match|game|fixture|opponent/i.test(userText)) {
      this.suggestions = this.chipsForCtx('MATCH');
    } else if (/estad[íi]stica|rendimiento|datos|stats|statistics|performance/i.test(userText)) {
      this.suggestions = this.chipsForCtx('STATS');
    } else if (/t[áa]ctica|formaci[óo]n|sistema|tactics?|formation|shape/i.test(userText)) {
      this.suggestions = this.chipsForCtx('TACT');
    } else if (/lesion|plantilla|disponib|injur|squad|roster|availability/i.test(userText)) {
      this.suggestions = this.chipsForCtx('INJ');
    } else {
      this.suggestions = this.chipsForCtx('HOME');
    }
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
    if (this.chatBody?.nativeElement) {
      const el = this.chatBody.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString(this.localeTag(), {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    const today = new Date();
    const diff = today.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) {
      return this.translate.instant('COACH_DEMO.CHAT_DATE_TODAY');
    }
    if (days === 1) {
      return this.translate.instant('COACH_DEMO.CHAT_DATE_YESTERDAY');
    }
    if (days < 7) {
      return this.translate.instant('COACH_DEMO.CHAT_DATE_DAYS_AGO', { days });
    }
    return d.toLocaleDateString(this.localeTag(), { day: 'numeric', month: 'short' });
  }

  goBack(): void {
    this.location.back();
  }

  trackByMsgId(index: number, msg: ChatMessage): number {
    return msg.id;
  }
}
