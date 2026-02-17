import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoginService } from 'src/app/core/services/login/login.service';
import { AiChatService } from 'src/app/core/services/ai-chat/ai-chat.service';
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
  private chatSub: Subscription | null = null;

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
  private readonly STORAGE_KEY = 'sphaira_coach_ai_history';

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

    const storedClubId = sessionStorage.getItem('clubId');
    if (storedClubId) this.clubId = parseInt(storedClubId, 10);

    this.loadConversationsList();

    this.addAssistantMessage(
      '¡Hola, míster! 👋⚽ Soy tu asistente deportivo de IA. Puedo ayudarte con entrenamientos, partidos, estadísticas, táctica y todo lo relacionado con tu equipo.\n\nEscríbeme o elige una sugerencia. ¡Vamos!'
    );

    this.initVoiceRecognition();
  }

  private initVoiceRecognition(): void {
    this.isVoiceSupported = this.voiceRecognition.isSupported();

    // Subscribe to transcript
    this.voiceTranscriptSub = this.voiceRecognition.transcript$.subscribe(result => {
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
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const all = JSON.parse(raw) as { id: string; title: string; date: string; messages: ChatMessage[] }[];
        this.conversations = all.map(c => ({
          id: c.id,
          title: c.title,
          date: c.date,
          messageCount: c.messages.filter((m: ChatMessage) => m.role === 'user').length,
          preview: c.messages.filter((m: ChatMessage) => m.role === 'user')[0]?.text?.substring(0, 60) || 'Conversación vacía',
        })).reverse(); // más recientes primero
      }
    } catch {
      this.conversations = [];
    }
  }

  startNewConversation(): void {
    this.currentConversationId = 'conv_' + Date.now();
    this.messages = [];
    this.showHistory = false;
    this.showSuggestions = true;

    this.addAssistantMessage(
      '¡Hola, míster! 👋⚽ Soy tu asistente deportivo de IA. Puedo ayudarte con entrenamientos, partidos, estadísticas, táctica y todo lo relacionado con tu equipo.\n\nEscríbeme o elige una sugerencia. ¡Vamos!'
    );
  }

  loadConversation(conv: ConversationSummary): void {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const all = JSON.parse(raw) as { id: string; title: string; date: string; messages: any[] }[];
        const found = all.find(c => c.id === conv.id);
        if (found) {
          this.currentConversationId = found.id;
          this.messages = found.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }));
          this.msgIdCounter = Math.max(...this.messages.map(m => m.id), 0);
          // Keep history panel open so user can switch between conversations
          this.showSuggestions = false;
          this.shouldScroll = true;
        }
      }
    } catch {
      // ignore
    }
  }

  deleteConversation(conv: ConversationSummary, event: Event): void {
    event.stopPropagation();
    this.conversationToDelete = conv;
    this.showDeleteConfirm = true;
  }

  confirmDeleteConversation(): void {
    if (!this.conversationToDelete) return;
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        let all = JSON.parse(raw) as any[];
        all = all.filter(c => c.id !== this.conversationToDelete!.id);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(all));
        this.loadConversationsList();
        if (this.currentConversationId === this.conversationToDelete!.id) {
          this.currentConversationId = null;
        }
      }
    } catch {
      // ignore
    }
    this.showDeleteConfirm = false;
    this.conversationToDelete = null;
  }

  cancelDeleteConversation(): void {
    this.showDeleteConfirm = false;
    this.conversationToDelete = null;
  }

  private saveConversation(): void {
    if (!this.currentConversationId) return;
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      let all: any[] = raw ? JSON.parse(raw) : [];

      const userMessages = this.messages.filter(m => m.role === 'user');
      const title = userMessages[0]?.text?.substring(0, 50) || 'Nueva conversación';

      const idx = all.findIndex((c: any) => c.id === this.currentConversationId);
      const data = {
        id: this.currentConversationId,
        title,
        date: new Date().toISOString(),
        messages: this.messages.filter(m => !m.isTyping),
      };

      if (idx > -1) {
        all[idx] = data;
      } else {
        all.push(data);
      }

      // Máximo 50 conversaciones
      if (all.length > 50) {
        all = all.slice(all.length - 50);
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(all));
    } catch {
      // ignore
    }
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

    this.chatSub?.unsubscribe();
    this.chatSub = this.aiChatService.sendMessage(this.userId, this.clubId, 'dashboard', text, 'users')
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
          this.updateSuggestionsContext(text);
          this.saveConversation();
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
     SUGERENCIAS CONTEXTUALES
  ═══════════════════════════════════════ */

  private updateSuggestionsContext(userText: string): void {
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
