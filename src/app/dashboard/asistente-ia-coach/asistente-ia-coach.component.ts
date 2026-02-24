import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
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
   RESPUESTAS HARDCODEADAS — ENFOQUE DEPORTIVO
═══════════════════════════════════════ */

const COACH_RESPONSES: { pattern: RegExp; response: string }[] = [
  {
    pattern: /entrenamientos?.*(semana|programados|pr[óo]xim|plan|hoy)/i,
    response:
      'Esta semana tienes **3 entrenamientos** programados:\n\n📋 **Lunes 16 feb** — 17:30h – Técnica individual y posesión\n📋 **Miércoles 18 feb** — 17:30h – Trabajo táctico y partidos reducidos\n📋 **Viernes 20 feb** — 17:00h – Preparación de partido (ABP + activación)\n\nLa asistencia media de tu equipo es del **87%**. ¿Quieres que te sugiera ejercicios para alguna sesión?',
  },
  {
    pattern: /ejercicios?.*(sugier|recomiend|propón|idea|calentamiento|técnic)/i,
    response:
      'Te propongo una estructura para la sesión de hoy:\n\n🔥 **Calentamiento** (15 min)\n— Rondo 4v2 (2 series × 4 min)\n— Movilidad articular con balón\n\n⚽ **Parte principal** (40 min)\n— Posesión 5v5+2 comodines (10 min)\n— Circuito técnico: control, pase, conducción (15 min)\n— Partido en espacio reducido 7v7 (15 min)\n\n🧊 **Vuelta a la calma** (10 min)\n— Estiramientos dinámicos\n— Charla técnico-táctica\n\n¿Quieres que adapte la sesión a algún objetivo específico?',
  },
  {
    pattern: /pr[óo]ximo.*(partido|partidos|encuentro|rival)/i,
    response:
      'Tu próximo partido:\n\n⚽ **Sábado 21 feb, 10:00h** vs CD Aluche (Local)\n\n📊 **Análisis del rival:**\n— Juegan en 4-3-3 con presión alta\n— Punto fuerte: transiciones rápidas\n— Punto débil: espacios a la espalda de la defensa\n— Goleador: #9 (12 goles esta temporada)\n\n💡 **Sugerencias tácticas:**\n— Inicio de juego en largo para explotar espacios\n— Presión coordinada en salida de balón rival\n— ABP: ensayar saque de esquina en corto\n\n¿Quieres que te prepare un plan de partido?',
  },
  {
    pattern: /(estad[íi]sticas|rendimiento).*(equipo|jugador|temporada)/i,
    response:
      'Estadísticas de tu equipo esta temporada:\n\n📊 **Partidos jugados:** 18\n✅ **Victorias:** 12 (67%)\n🤝 **Empates:** 3 (17%)\n❌ **Derrotas:** 3 (17%)\n⚽ **Goles a favor:** 38 (2.1/partido)\n🥅 **Goles en contra:** 16 (0.9/partido)\n\n🏆 **Posición:** 2º clasificado\n📈 **Racha actual:** 4 victorias consecutivas\n\nLos jugadores más destacados son **Alejandro Martín** (9 goles) y **Hugo García** (7 asistencias). ¿Quieres ver estadísticas individuales?',
  },
  {
    pattern: /(jugador|jugadores).*(destaca|mejor|rendimiento|estado|forma)/i,
    response:
      'Jugadores destacados esta temporada:\n\n⭐ **Alejandro Martín** — 9 goles, 3 asistencias, 92% asistencia\n⭐ **Hugo García** — 4 goles, 7 asistencias, 95% asistencia\n⭐ **David López** — Mejor nota media (8.2/10)\n⭐ **Pablo Sanz** — Líder en recuperaciones (8.5/partido)\n\n⚠️ **Jugadores en baja forma:**\n— Marcos López — 2 partidos sin participar, asistencia 65%\n— Carlos Ruiz — Nota media descendiendo (6.1 → 5.4)\n\n¿Te gustaría analizar a algún jugador en profundidad?',
  },
  {
    pattern: /(t[áa]ctica|formaci[óo]n|sistema|esquema)/i,
    response:
      'Análisis táctico de tu equipo:\n\n📐 **Formación habitual:** 4-3-3\n🔄 **Alternativa:** 4-2-3-1 (usada en 4 partidos)\n\n📊 **Rendimiento por formación:**\n— 4-3-3: 71% victorias, 2.3 goles/partido\n— 4-2-3-1: 50% victorias, 1.5 goles/partido\n\n💡 **Sugerencias:**\n— El 4-3-3 funciona mejor con posesión larga\n— Considerar 4-2-3-1 contra rivales con dominio del centro\n— Los laterales son clave: participan en el 60% de los goles\n\n¿Quieres analizar una formación específica?',
  },
  {
    pattern: /(lesion|lesiones|lesionados|disponibilidad)/i,
    response:
      'Estado de la plantilla:\n\n✅ **Disponibles:** 18 jugadores\n🏥 **Lesionados:** 2 jugadores\n\n— **David López** — Rotura fibrilar — Vuelve aprox. 5 mar\n— **Andrés Ruiz** — Tendinitis — Vuelve aprox. 20 feb (podría llegar al partido)\n\n⚠️ **Apercibidos (4 amarillas):** Carlos Pérez, Miguel Torres\n\n💡 Para el próximo partido, podrías recuperar a Andrés Ruiz si la evolución es favorable. Te recomiendo un plan de readaptación esta semana.',
  },
  {
    pattern: /(asistencia|faltas|ausencias|puntualidad)/i,
    response:
      'Asistencia a entrenamientos este mes:\n\n📊 **Media del equipo:** 87%\n\n👍 **Mejor asistencia:**\n— Hugo García: 100%\n— Pablo Sanz: 100%\n— Alejandro Martín: 95%\n\n⚠️ **Asistencia baja:**\n— Marcos López: 65% (ha faltado 3 veces sin justificar)\n— Javier Torres: 70% (2 faltas por enfermedad)\n\n💡 **Recomendación:** Hablar con Marcos López sobre su compromiso. Su rendimiento también ha bajado en los últimos partidos.',
  },
  {
    pattern: /(rival|analizar|an[áa]lisis|scouting|preparar)/i,
    response:
      'Para preparar el análisis del rival te puedo ayudar con:\n\n📋 **Información disponible:**\n— Formación habitual y variantes\n— Jugadores clave y goleadores\n— Puntos fuertes y débiles\n— Últimos resultados\n— Patrones ofensivos y defensivos\n— ABPs (corners, faltas)\n\n💡 **Sugerencia:** Prepara la charla de vestuario enfocándote en:\n1. Sus debilidades en defensa por bandas\n2. Nuestros puntos fuertes en transiciones\n3. Jugadas ensayadas de ABP\n\n¿Sobre qué rival quieres el análisis?',
  },
  {
    pattern: /(plan|planificaci[óo]n|periodizaci[óo]n|microciclo|mesociclo)/i,
    response:
      'Planificación del microciclo actual:\n\n📅 **Lunes** — Recuperación activa + Técnica (carga baja)\n📅 **Martes** — Descanso\n📅 **Miércoles** — Trabajo táctico (carga media-alta)\n📅 **Jueves** — Descanso\n📅 **Viernes** — Activación pre-partido (carga baja)\n📅 **Sábado** — PARTIDO vs CD Aluche\n📅 **Domingo** — Descanso\n\n📊 **Carga acumulada semanal:** 285 UA (objetivo: 280-320 UA)\n\n💡 La carga está bien equilibrada. Viernes céntrate en ABPs y activación, no sobrecargues.',
  },
  {
    pattern: /(goleador|goleadores|goles|anotad)/i,
    response:
      'Máximos goleadores de tu equipo:\n\n🥇 **Alejandro Martín** — 9 goles (4 de cabeza, 3 dentro del área, 2 de falta)\n🥈 **Hugo García** — 4 goles + 7 asistencias\n🥉 **Lucas Díaz** — 4 goles (todos en jugada)\n4. Daniel Fernández — 3 goles\n5. Pablo Sanz — 2 goles (centrocampista)\n\n📊 **Distribución de goles:**\n— 1ª parte: 58% | 2ª parte: 42%\n— Jugada: 65% | ABP: 25% | Penalti: 10%\n\nTu equipo es más efectivo en los primeros 30 minutos.',
  },
  {
    pattern: /(hola|buenos d[íi]as|buenas|hey|qué tal)/i,
    response:
      '¡Hola, míster! 👋⚽ Soy tu asistente deportivo de IA. Estoy aquí para ayudarte con:\n\n📋 Planificación de entrenamientos\n⚽ Preparación de partidos\n📊 Estadísticas y rendimiento\n🧠 Análisis táctico\n🏥 Estado de la plantilla\n\n¿En qué puedo ayudarte hoy?',
  },
  {
    pattern: /(gracias|genial|perfecto|vale|ok)/i,
    response:
      '¡De nada, míster! ⚽ Si necesitas algo más para preparar los entrenamientos o el próximo partido, aquí estoy.',
  },
  {
    pattern: /(ayuda|qu[ée] puedes|qu[ée] sabes|funciones)/i,
    response:
      'Como tu asistente deportivo, puedo ayudarte con:\n\n📋 **Entrenamientos** — planificación, ejercicios, sesiones\n⚽ **Partidos** — análisis de rivales, plan de partido, alineaciones\n📊 **Estadísticas** — rendimiento del equipo y jugadores\n🧠 **Táctica** — formaciones, sistemas, análisis\n🏥 **Plantilla** — lesiones, disponibilidad, apercibidos\n👥 **Asistencia** — control de faltas, puntualidad\n📅 **Planificación** — microciclos, cargas, periodización\n⚽ **Goleadores** — estadísticas ofensivas\n🔍 **Scouting** — análisis de rivales\n\n¡Pregúntame lo que necesites!',
  },
  {
    pattern: /(alineaci[óo]n|once|titulares|convocatoria)/i,
    response:
      'Sugerencia de alineación para el próximo partido (4-3-3):\n\n🧤 **POR:** Adrián Molina\n🛡️ **DFD:** Carlos Pérez ⚠️ (apercibido)\n🛡️ **DFC:** Miguel Torres ⚠️ (apercibido)\n🛡️ **DFC:** Iker Navarro\n🛡️ **DFI:** Sergio Blanco\n🎯 **MCD:** Pablo Sanz\n🎯 **MC:** Hugo García\n🎯 **MCO:** Daniel Fernández\n⚡ **EXD:** Lucas Díaz\n⚡ **DC:** Alejandro Martín\n⚡ **EXI:** Javier Torres\n\n⚠️ **Atención:** Carlos Pérez y Miguel Torres están apercibidos. Si prefieren reservarlos, se pueden usar alternativas.\n\n¿Quieres que sugiera una alineación alternativa?',
  },
];

const COACH_DEFAULT_RESPONSE =
  'Disculpa, por ahora no tengo información específica sobre eso. Próximamente, cuando esté conectado al backend, podré responder con datos reales de tu equipo. Mientras tanto, puedes preguntarme sobre:\n\n• Entrenamientos y ejercicios\n• Próximos partidos y rivales\n• Estadísticas del equipo\n• Análisis táctico\n• Estado de la plantilla\n• Planificación deportiva\n• Goleadores\n• Asistencia';

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

  suggestions: SuggestionChip[] = [
    { icon: 'bi-clipboard-check', text: 'Entrenamientos esta semana', query: '¿Qué entrenamientos tengo esta semana?' },
    { icon: 'bi-lightbulb', text: 'Sugerir ejercicios', query: 'Sugiere ejercicios para la sesión de hoy' },
    { icon: 'bi-trophy', text: 'Próximo partido', query: '¿Cuál es el próximo partido?' },
    { icon: 'bi-graph-up', text: 'Estadísticas del equipo', query: 'Dame las estadísticas de rendimiento del equipo' },
    { icon: 'bi-people', text: 'Estado de la plantilla', query: '¿Cómo está la plantilla? ¿Hay lesionados?' },
    { icon: 'bi-diagram-3', text: 'Análisis táctico', query: '¿Qué formación funciona mejor?' },
  ];

  showSuggestions = true;
  profileId = 0;

  constructor(
    private loginService: LoginService,
    private router: Router,
    private location: Location,
    private translate: TranslateService,
    private aiChatService: AiChatService,
    private aiPageContextService: AiPageContextService,
    private voiceRecognition: VoiceRecognitionService,
    private injuryService: InjuryService
  ) {}

  ngOnInit(): void {
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
      ? '¡Hola! 👋🩺 Soy tu asistente clínico de IA. Estoy especializado en fisioterapia deportiva y tengo acceso al historial de lesiones de tu equipo.\n\nPuedo ayudarte con protocolos de rehabilitación, tiempos de recuperación, criterios RTP y prevención de lesiones.\n\nEscríbeme o elige una sugerencia.'
      : '¡Hola, míster! 👋⚽ Soy tu asistente deportivo de IA. Puedo ayudarte con entrenamientos, partidos, estadísticas, táctica y todo lo relacionado con tu equipo.\n\nEscríbeme o elige una sugerencia. ¡Vamos!';

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
        error: () => {} // Fall back to default suggestions already set
      });
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
          title: c.title || 'Conversación',
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
    const welcomeMsg = isFisio
      ? '¡Hola! 👋🩺 Soy tu asistente clínico de IA. Estoy especializado en fisioterapia deportiva y tengo acceso al historial de lesiones de tu equipo.\n\nPuedo ayudarte con protocolos de rehabilitación, tiempos de recuperación, criterios RTP y prevención de lesiones.\n\nEscríbeme o elige una sugerencia.'
      : '¡Hola, míster! 👋⚽ Soy tu asistente deportivo de IA. Puedo ayudarte con entrenamientos, partidos, estadísticas, táctica y todo lo relacionado con tu equipo.\n\nEscríbeme o elige una sugerencia. ¡Vamos!';

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
            if (injuries.filter(i => i.status === 'activa' || i.status === 'recuperacion').length > 0) {
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
    const title = userMessages[0]?.text?.substring(0, 50) || 'Nueva conversación';
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

    // Enriquecer el mensaje con el contexto del equipo (partidos + clasificación)
    let enrichedText = text;
    if (this.coachTeamContext) {
      const coachParts: string[] = [];
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
    this.chatSub = this.aiChatService.sendMessage(this.userId, this.clubId, 'dashboard', enrichedText, 'users', this.teamId, history)
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
          this.updateSuggestionsContext(text);
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

  /* ═══════════════════════════════════════
     RESPUESTAS
  ═══════════════════════════════════════ */

  private getResponse(userText: string): string {
    for (const entry of COACH_RESPONSES) {
      if (entry.pattern.test(userText)) {
        return entry.response;
      }
    }
    return COACH_DEFAULT_RESPONSE;
  }

  /* ═══════════════════════════════════════
     SUGERENCIAS LESIONES — CLUB / COACH
  ═══════════════════════════════════════ */

  private setSuggestionsForLesiones(injuries: Injury[]): void {
    const active = injuries.filter(i => i.status === 'activa');
    const recovery = injuries.filter(i => i.status === 'recuperacion');
    const chips: SuggestionChip[] = [];

    // Bajas activas que afectan disponibilidad (máx. 2)
    for (const inj of active.slice(0, 2)) {
      const name = inj.playerName || 'el jugador';
      const zone = inj.zoneLabel || inj.zone || 'lesión';
      chips.push({
        icon: 'bi-person-x',
        text: `Baja: ${name}`,
        query: `${name} está lesionado con ${zone}. ¿Cuándo puede estar disponible? Alta prevista: ${inj.dateReturn || 'sin determinar'}.`
      });
    }

    // Jugadores en recuperación próximos a volver (máx. 2)
    for (const inj of recovery.slice(0, 2)) {
      const name = inj.playerName || 'el jugador';
      chips.push({
        icon: 'bi-person-check',
        text: `Vuelta: ${name}`,
        query: `¿${name} puede llegar al próximo partido? Está en fase RTP ${inj.rtpPhase}, alta prevista ${inj.dateReturn || 'sin fecha'}.`
      });
    }

    // Resumen de disponibilidad
    if (injuries.length > 0) {
      chips.push({
        icon: 'bi-heart-pulse',
        text: 'Disponibilidad del equipo',
        query: `¿Cuántos jugadores tengo disponibles? Hay ${active.length} lesiones activas y ${recovery.length} en recuperación.`
      });
    }

    // Sugerencias de gestión de alineación con bajas
    chips.push({
      icon: 'bi-people',
      text: 'Alineación sin lesionados',
      query: active.length > 0
        ? `Sugiere una alineación para el próximo partido teniendo en cuenta que ${active.map(i => i.playerName).filter(Boolean).join(', ')} están lesionados.`
        : '¿Cuál sería la mejor alineación para el próximo partido?'
    });

    this.suggestions = chips.slice(0, 6);
  }

  /* ═══════════════════════════════════════
     SUGERENCIAS FISIOTERAPEUTA (DINÁMICAS)
  ═══════════════════════════════════════ */

  private setSuggestionsForFisio(injuries: Injury[]): void {
    const active = injuries.filter(i => i.status === 'activa');
    const recovery = injuries.filter(i => i.status === 'recuperacion');
    const chips: SuggestionChip[] = [];

    // 1. Sugerencias basadas en lesiones activas (máx. 2)
    for (const inj of active.slice(0, 2)) {
      const name = inj.playerName || 'el jugador';
      const zone = inj.zoneLabel || inj.zone || 'lesión';
      chips.push({
        icon: 'bi-bandaid',
        text: `${name} — ${zone}`,
        query: `¿Cuál es el protocolo de tratamiento para ${name} con ${zone}? Estado actual: ${inj.status}, fase RTP: ${inj.rtpPhase}.`
      });
    }

    // 2. Sugerencias de jugadores en recuperación/RTP (máx. 2)
    for (const inj of recovery.slice(0, 2)) {
      const name = inj.playerName || 'el jugador';
      const zone = inj.zoneLabel || inj.zone || 'lesión';
      chips.push({
        icon: 'bi-arrow-up-circle',
        text: `Alta prevista: ${name}`,
        query: `¿Cuándo puede volver a entrenar ${name}? Tiene una ${zone} en fase RTP ${inj.rtpPhase}. Alta prevista: ${inj.dateReturn || 'sin fecha'}.`
      });
    }

    // 3. Resumen general siempre disponible
    if (injuries.length > 0) {
      chips.push({
        icon: 'bi-heart-pulse',
        text: 'Resumen de lesiones',
        query: `Dame un resumen del estado actual de lesiones del equipo. Hay ${active.length} lesiones activas y ${recovery.length} jugadores en recuperación.`
      });
    }

    // 4. Completar con sugerencias genéricas hasta 6
    const generic: SuggestionChip[] = [
      { icon: 'bi-shield-check', text: 'Prevención de lesiones', query: '¿Qué ejercicios de prevención recomiendas para reducir el riesgo de lesiones musculares?' },
      { icon: 'bi-calendar-check', text: 'Carga de entrenamiento', query: '¿Cómo debería gestionar la carga de entrenamiento para los jugadores en recuperación?' },
      { icon: 'bi-clipboard2-pulse', text: 'Protocolo RTP', query: 'Explícame las fases del protocolo Return to Play (RTP) para una lesión muscular' },
      { icon: 'bi-people', text: 'Estado de la plantilla', query: '¿Cuántos jugadores están disponibles y cuántos tienen restricciones médicas?' },
    ];

    for (const g of generic) {
      if (chips.length >= 6) break;
      chips.push(g);
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

    if (/entrenamiento|ejercicio|sesi[óo]n/i.test(userText)) {
      this.suggestions = [
        { icon: 'bi-lightbulb', text: 'Sugerir ejercicios', query: 'Sugiere ejercicios para la sesión de hoy' },
        { icon: 'bi-calendar3', text: 'Planificación semanal', query: '¿Cómo está la planificación del microciclo?' },
        { icon: 'bi-person-check', text: 'Asistencia del equipo', query: '¿Cuál es la asistencia a entrenamientos?' },
        { icon: 'bi-trophy', text: 'Próximo partido', query: '¿Cuál es el próximo partido?' },
        { icon: 'bi-heart-pulse', text: 'Lesionados', query: '¿Hay jugadores lesionados?' },
        { icon: 'bi-arrow-clockwise', text: 'Volver al inicio', query: 'Ayuda' },
      ];
    } else if (/partido|rival|encuentro/i.test(userText)) {
      this.suggestions = [
        { icon: 'bi-people', text: 'Sugerir alineación', query: '¿Qué alineación me sugieres para el próximo partido?' },
        { icon: 'bi-search', text: 'Análisis del rival', query: 'Analiza al próximo rival' },
        { icon: 'bi-diagram-3', text: 'Táctica recomendada', query: '¿Qué formación funciona mejor?' },
        { icon: 'bi-graph-up', text: 'Estadísticas', query: 'Dame las estadísticas del equipo' },
        { icon: 'bi-clipboard-check', text: 'Entrenamientos', query: '¿Qué entrenamientos tengo esta semana?' },
        { icon: 'bi-arrow-clockwise', text: 'Volver al inicio', query: 'Ayuda' },
      ];
    } else if (/estad[íi]stica|rendimiento|datos/i.test(userText)) {
      this.suggestions = [
        { icon: 'bi-star', text: 'Jugadores destacados', query: '¿Qué jugadores están destacando?' },
        { icon: 'bi-trophy', text: 'Goleadores', query: '¿Quiénes son los máximos goleadores?' },
        { icon: 'bi-diagram-3', text: 'Análisis táctico', query: '¿Qué formación funciona mejor?' },
        { icon: 'bi-trophy', text: 'Próximo partido', query: '¿Cuál es el próximo partido?' },
        { icon: 'bi-clipboard-check', text: 'Entrenamientos', query: '¿Qué entrenamientos tengo esta semana?' },
        { icon: 'bi-arrow-clockwise', text: 'Volver al inicio', query: 'Ayuda' },
      ];
    } else if (/t[áa]ctica|formaci[óo]n|sistema/i.test(userText)) {
      this.suggestions = [
        { icon: 'bi-people', text: 'Sugerir alineación', query: '¿Qué alineación me sugieres?' },
        { icon: 'bi-graph-up', text: 'Estadísticas', query: 'Dame las estadísticas del equipo' },
        { icon: 'bi-trophy', text: 'Próximo partido', query: '¿Cuál es el próximo partido?' },
        { icon: 'bi-search', text: 'Análisis rival', query: 'Analiza al próximo rival' },
        { icon: 'bi-clipboard-check', text: 'Entrenamientos', query: '¿Qué entrenamientos tengo esta semana?' },
        { icon: 'bi-arrow-clockwise', text: 'Volver al inicio', query: 'Ayuda' },
      ];
    } else if (/lesion|plantilla|disponib/i.test(userText)) {
      this.suggestions = [
        { icon: 'bi-people', text: 'Sugerir alineación', query: '¿Qué alineación me sugieres?' },
        { icon: 'bi-person-check', text: 'Asistencia', query: '¿Cuál es la asistencia a entrenamientos?' },
        { icon: 'bi-trophy', text: 'Próximo partido', query: '¿Cuál es el próximo partido?' },
        { icon: 'bi-graph-up', text: 'Estadísticas', query: 'Dame las estadísticas del equipo' },
        { icon: 'bi-clipboard-check', text: 'Entrenamientos', query: '¿Qué entrenamientos tengo esta semana?' },
        { icon: 'bi-arrow-clockwise', text: 'Volver al inicio', query: 'Ayuda' },
      ];
    } else {
      this.suggestions = [
        { icon: 'bi-clipboard-check', text: 'Entrenamientos esta semana', query: '¿Qué entrenamientos tengo esta semana?' },
        { icon: 'bi-lightbulb', text: 'Sugerir ejercicios', query: 'Sugiere ejercicios para la sesión de hoy' },
        { icon: 'bi-trophy', text: 'Próximo partido', query: '¿Cuál es el próximo partido?' },
        { icon: 'bi-graph-up', text: 'Estadísticas del equipo', query: 'Dame las estadísticas de rendimiento del equipo' },
        { icon: 'bi-people', text: 'Estado de la plantilla', query: '¿Cómo está la plantilla? ¿Hay lesionados?' },
        { icon: 'bi-diagram-3', text: 'Análisis táctico', query: '¿Qué formación funciona mejor?' },
      ];
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
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    const today = new Date();
    const diff = today.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Hoy';
    if (days === 1) return 'Ayer';
    if (days < 7) return `Hace ${days} días`;
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }

  goBack(): void {
    this.location.back();
  }

  trackByMsgId(index: number, msg: ChatMessage): number {
    return msg.id;
  }
}
