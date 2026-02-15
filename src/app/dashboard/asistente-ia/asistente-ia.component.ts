import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, Pipe, PipeTransform } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { LoginService } from 'src/app/core/services/login/login.service';
import { User } from 'src/app/core/models/users/user.model';

/* ═══════════════════════════════════════
   PIPE: nl2br — convierte \n a <br> y **bold**
═══════════════════════════════════════ */

@Pipe({ name: 'nl2br' })
export class Nl2brPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string): SafeHtml {
    if (!value) return '';
    // Escapar HTML
    let html = value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    // **bold**
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Saltos de línea
    html = html.replace(/\n/g, '<br>');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}

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
  messages: ChatMessage[];
}

/* ═══════════════════════════════════════
   RESPUESTAS HARDCODEADAS
═══════════════════════════════════════ */

const HARDCODED_RESPONSES: { pattern: RegExp; response: string }[] = [
  {
    pattern: /cu[áa]ntos jugadores.*(hay|tiene|club)/i,
    response:
      'Actualmente el club tiene **127 jugadores** registrados, repartidos en 8 equipos. De ellos, 119 están activos y 8 están dados de baja temporalmente.',
  },
  {
    pattern: /jugadores.*(faltan|pagar|cuotas|deben|pendientes)/i,
    response:
      'Hay **23 jugadores** con cuotas pendientes de pago. El importe total pendiente asciende a **4.560 €**. Los equipos con más impagos son el Cadete A (7 jugadores) y el Infantil B (6 jugadores). ¿Quieres que te muestre el listado detallado?',
  },
  {
    pattern: /pr[óo]ximo.*(partido|partidos|encuentro)/i,
    response:
      'Los próximos partidos programados son:\n\n⚽ **Cadete A** — Sábado 21 feb, 10:00h vs CD Aluche (Local)\n⚽ **Juvenil A** — Sábado 21 feb, 12:30h vs Rayo Majadahonda (Visitante)\n⚽ **Infantil B** — Domingo 22 feb, 09:00h vs AD Parla (Local)\n\n¿Necesitas más detalles de alguno?',
  },
  {
    pattern: /entrenamientos?.*(semana|programados|pr[óo]xim)/i,
    response:
      'Esta semana hay **14 entrenamientos** programados entre todos los equipos. Todos los equipos tienen al menos 2 sesiones. El Cadete A tiene 3 entrenamientos (lunes, miércoles y viernes). ¿Quieres ver el horario completo?',
  },
  {
    pattern: /(estad[íi]sticas|rendimiento).*(equipo|equipos|club)/i,
    response:
      'Resumen general del club esta temporada:\n\n📊 **Partidos jugados:** 87\n✅ **Victorias:** 42 (48%)\n🤝 **Empates:** 21 (24%)\n❌ **Derrotas:** 24 (28%)\n⚽ **Goles a favor:** 198\n🥅 **Goles en contra:** 134\n\nEl equipo con mejor rendimiento es el **Juvenil A** con un 67% de victorias.',
  },
  {
    pattern: /(asistencia|faltas|ausencias)/i,
    response:
      'La asistencia media a entrenamientos este mes es del **84%**. Los equipos con mejor asistencia son el Alevín A (92%) y el Juvenil A (90%). El equipo con más faltas es el Cadete B con un 72% de asistencia. ¿Quieres ver los jugadores con más ausencias?',
  },
  {
    pattern: /(lesion|lesiones|lesionados)/i,
    response:
      'Actualmente hay **5 jugadores lesionados** en el club:\n\n🏥 Carlos Pérez (Juvenil A) — Esguince tobillo — Vuelve aprox. 28 feb\n🏥 David López (Cadete A) — Rotura fibrilar — Vuelve aprox. 5 mar\n🏥 Miguel Torres (Infantil B) — Contusión rodilla — En evaluación\n🏥 Andrés Ruiz (Cadete B) — Tendinitis — Vuelve aprox. 20 feb\n🏥 Pablo Sanz (Alevín A) — Fisura dedo — Vuelve aprox. 17 feb',
  },
  {
    pattern: /(goleador|goleadores|m[áa]s goles)/i,
    response:
      'Los máximos goleadores del club esta temporada:\n\n🥇 **Alejandro Martín** (Juvenil A) — 18 goles\n🥈 **Hugo García** (Cadete A) — 14 goles\n🥉 **Daniel Fernández** (Infantil A) — 12 goles\n4. Lucas Díaz (Cadete B) — 10 goles\n5. Marcos López (Juvenil A) — 9 goles',
  },
  {
    pattern: /(documento|documentos|papeles|federaci[óo]n)/i,
    response:
      'Estado de la documentación del club:\n\n✅ **Licencias federativas:** 119/127 al día\n⚠️ **Pendientes de licencia:** 8 jugadores (nuevas altas)\n✅ **Seguro deportivo:** Vigente hasta jun 2026\n✅ **Certificados médicos:** 112/127 actualizados\n⚠️ **Certificados caducados:** 15 jugadores necesitan renovar',
  },
  {
    pattern: /(hola|buenos d[íi]as|buenas|hey|qué tal)/i,
    response:
      '¡Hola! 👋 Soy el asistente de IA de tu club. Estoy aquí para ayudarte con información sobre jugadores, equipos, cuotas, estadísticas y mucho más. ¿En qué puedo ayudarte?',
  },
  {
    pattern: /(gracias|genial|perfecto|vale)/i,
    response:
      '¡De nada! 😊 Si necesitas algo más, no dudes en preguntarme. Estoy aquí para ayudar con la gestión de tu club.',
  },
  {
    pattern: /(ayuda|qu[ée] puedes|qu[ée] sabes|funciones)/i,
    response:
      'Puedo ayudarte con muchas cosas del club:\n\n📋 **Jugadores** — número, fichas, estado\n💰 **Cuotas** — pendientes, pagos, morosos\n⚽ **Partidos** — próximos encuentros, resultados\n📊 **Estadísticas** — rendimiento, goleadores\n🏥 **Lesiones** — jugadores lesionados\n📅 **Entrenamientos** — planificación semanal\n📄 **Documentación** — licencias, certificados\n👥 **Asistencia** — control de faltas\n\n¡Pregúntame lo que necesites!',
  },
  {
    pattern: /(temporada|resumen|balance)/i,
    response:
      'Resumen de la temporada 2025/2026:\n\n👥 **127 jugadores** en 8 equipos\n⚽ **87 partidos** jugados (48% victorias)\n📅 **246 entrenamientos** realizados\n💰 **Recaudación cuotas:** 34.200 € de 38.760 € previstos (88%)\n📈 **Mejor racha:** Juvenil A — 7 victorias consecutivas\n\nLa temporada va por buen camino. ¿Quieres profundizar en algún aspecto?',
  },
];

const DEFAULT_RESPONSE =
  'Disculpa, por ahora no tengo información específica sobre eso. Próximamente, cuando esté conectado al backend, podré responder con datos reales del club. Mientras tanto, puedes preguntarme sobre:\n\n• Número de jugadores\n• Cuotas pendientes\n• Próximos partidos\n• Entrenamientos\n• Estadísticas\n• Lesionados\n• Goleadores\n• Documentación\n• Asistencia';

/* ═══════════════════════════════════════
   COMPONENTE
═══════════════════════════════════════ */

@Component({
  selector: 'app-asistente-ia',
  templateUrl: './asistente-ia.component.html',
  styleUrls: ['./asistente-ia.component.scss'],
})
export class AsistenteIaComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatBody') chatBody!: ElementRef<HTMLDivElement>;
  @ViewChild('inputField') inputField!: ElementRef<HTMLTextAreaElement>;

  usuarioActual!: User | null;
  messages: ChatMessage[] = [];
  userInput = '';
  isResponding = false;
  private msgIdCounter = 0;
  private shouldScroll = false;

  /* ═══ HISTORIAL ═══ */
  showHistory = true;
  conversations: ConversationSummary[] = [];
  currentConversationId: string | null = null;
  private readonly STORAGE_KEY = 'sphaira_club_ai_history';

  suggestions: SuggestionChip[] = [
    {
      icon: 'bi-people-fill',
      text: '¿Cuántos jugadores hay en el club?',
      query: '¿Cuántos jugadores hay en el club?',
    },
    {
      icon: 'bi-cash-coin',
      text: 'Jugadores con cuotas pendientes',
      query: 'Dime cuántos jugadores faltan por pagar cuotas',
    },
    {
      icon: 'bi-trophy',
      text: 'Próximos partidos',
      query: '¿Cuáles son los próximos partidos?',
    },
    {
      icon: 'bi-graph-up',
      text: 'Estadísticas del club',
      query: 'Dame las estadísticas de rendimiento del club',
    },
    {
      icon: 'bi-clipboard-check',
      text: 'Entrenamientos esta semana',
      query: '¿Cuántos entrenamientos hay esta semana?',
    },
    {
      icon: 'bi-bandaid',
      text: 'Jugadores lesionados',
      query: '¿Hay jugadores lesionados?',
    },
  ];

  showSuggestions = true;

  constructor(
    private loginService: LoginService,
    private router: Router,
    private location: Location,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loginService.usuarioActual.subscribe((user) => {
      this.usuarioActual = user;
    });

    // Mensaje de bienvenida del asistente
    this.addAssistantMessage(
      '¡Hola! 👋 Soy el asistente de IA de tu club. Puedo ayudarte a consultar información sobre jugadores, cuotas, partidos, estadísticas y mucho más.\n\nPuedes escribirme o elegir una de las sugerencias de abajo. ¡Pregúntame lo que necesites!'
    );
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  /* ═══════════════════════════════════════
     ENVIAR MENSAJE
  ═══════════════════════════════════════ */

  sendMessage(): void {
    const text = this.userInput.trim();
    if (!text || this.isResponding) return;

    // Mensaje del usuario
    this.messages.push({
      id: ++this.msgIdCounter,
      role: 'user',
      text,
      timestamp: new Date(),
    });
    this.userInput = '';
    this.shouldScroll = true;

    // Simular "escribiendo..."
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

    // Simular delay de respuesta (800-2000ms)
    const delay = 800 + Math.random() * 1200;
    setTimeout(() => {
      // Quitar el indicador "escribiendo"
      const idx = this.messages.indexOf(typingMsg);
      if (idx > -1) this.messages.splice(idx, 1);

      // Generar respuesta
      const response = this.getResponse(text);
      this.addAssistantMessage(response);
      
      // Actualizar sugerencias según el contexto
      this.updateSuggestionsContext(text, response);
      
      this.isResponding = false;

      // Guardar conversación automáticamente
      this.saveConversation();
    }, delay);
  }

  /** Enviar sugerencia como si fuera un mensaje del usuario */
  sendSuggestion(chip: SuggestionChip): void {
    this.userInput = chip.query;
    this.sendMessage();
  }

  /** Manejar Enter en el textarea (enviar con Enter, nueva línea con Shift+Enter) */
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  /* ═══════════════════════════════════════
     RESPUESTAS HARDCODEADAS
  ═══════════════════════════════════════ */

  private getResponse(userText: string): string {
    for (const entry of HARDCODED_RESPONSES) {
      if (entry.pattern.test(userText)) {
        return entry.response;
      }
    }
    return DEFAULT_RESPONSE;
  }

  /* ═══════════════════════════════════════
     ACTUALIZAR SUGERENCIAS CONTEXTUALES
  ═══════════════════════════════════════ */

  private updateSuggestionsContext(userText: string, response: string): void {
    // Detectar el tema de la conversación
    if (/jugadores.*(hay|tiene|club)/i.test(userText)) {
      this.suggestions = [
        { icon: 'bi-cash-coin', text: '¿Cuántos tienen cuotas pendientes?', query: 'Dime cuántos jugadores faltan por pagar cuotas' },
        { icon: 'bi-bandaid', text: '¿Hay jugadores lesionados?', query: '¿Hay jugadores lesionados?' },
        { icon: 'bi-people-fill', text: 'Listado por equipos', query: '¿Cómo están repartidos los jugadores por equipos?' },
        { icon: 'bi-graph-up', text: 'Estadísticas generales', query: 'Dame las estadísticas de rendimiento del club' },
        { icon: 'bi-trophy', text: 'Próximos partidos', query: '¿Cuáles son los próximos partidos?' },
        { icon: 'bi-arrow-clockwise', text: 'Volver al inicio', query: 'Ayuda' },
      ];
    } else if (/cuotas|pagar|pendientes|pago/i.test(userText)) {
      this.suggestions = [
        { icon: 'bi-calendar-check', text: 'Historial de pagos', query: '¿Cuál es el historial de pagos este mes?' },
        { icon: 'bi-people-fill', text: 'Jugadores al día', query: '¿Cuántos jugadores están al día con las cuotas?' },
        { icon: 'bi-cash-stack', text: 'Ingresos totales', query: '¿Cuánto dinero ha recaudado el club este mes?' },
        { icon: 'bi-exclamation-triangle', text: 'Morosos recurrentes', query: '¿Qué jugadores tienen más impagos?' },
        { icon: 'bi-graph-up', text: 'Estadísticas del club', query: 'Dame las estadísticas de rendimiento del club' },
        { icon: 'bi-arrow-clockwise', text: 'Volver al inicio', query: 'Ayuda' },
      ];
    } else if (/partido|partidos|encuentro/i.test(userText)) {
      this.suggestions = [
        { icon: 'bi-trophy', text: 'Resultados recientes', query: '¿Cuáles fueron los últimos resultados?' },
        { icon: 'bi-star-fill', text: 'Máximos goleadores', query: '¿Quiénes son los máximos goleadores?' },
        { icon: 'bi-graph-up', text: 'Estadísticas del club', query: 'Dame las estadísticas de rendimiento del club' },
        { icon: 'bi-clipboard-check', text: 'Entrenamientos esta semana', query: '¿Cuántos entrenamientos hay esta semana?' },
        { icon: 'bi-people-fill', text: 'Info de jugadores', query: '¿Cuántos jugadores hay en el club?' },
        { icon: 'bi-arrow-clockwise', text: 'Volver al inicio', query: 'Ayuda' },
      ];
    } else if (/entrenamiento|entrenamientos|sesion/i.test(userText)) {
      this.suggestions = [
        { icon: 'bi-calendar3', text: 'Horarios de equipos', query: '¿Cuál es el horario de entrenamientos por equipo?' },
        { icon: 'bi-person-check', text: 'Asistencia media', query: '¿Cuál es la asistencia a entrenamientos?' },
        { icon: 'bi-trophy', text: 'Próximos partidos', query: '¿Cuáles son los próximos partidos?' },
        { icon: 'bi-clipboard-data', text: 'Estadísticas', query: 'Dame las estadísticas de rendimiento del club' },
        { icon: 'bi-people-fill', text: 'Jugadores del club', query: '¿Cuántos jugadores hay en el club?' },
        { icon: 'bi-arrow-clockwise', text: 'Volver al inicio', query: 'Ayuda' },
      ];
    } else if (/estad[íi]stica|rendimiento|datos/i.test(userText)) {
      this.suggestions = [
        { icon: 'bi-star-fill', text: 'Máximos goleadores', query: '¿Quiénes son los máximos goleadores?' },
        { icon: 'bi-trophy', text: 'Equipo más exitoso', query: '¿Cuál es el equipo con mejor rendimiento?' },
        { icon: 'bi-person-check', text: 'Asistencia', query: '¿Cuál es la asistencia a entrenamientos?' },
        { icon: 'bi-calendar4-week', text: 'Próximos partidos', query: '¿Cuáles son los próximos partidos?' },
        { icon: 'bi-cash-coin', text: 'Cuotas pendientes', query: 'Dime cuántos jugadores faltan por pagar cuotas' },
        { icon: 'bi-arrow-clockwise', text: 'Volver al inicio', query: 'Ayuda' },
      ];
    } else if (/lesion|lesionados|baja/i.test(userText)) {
      this.suggestions = [
        { icon: 'bi-calendar-event', text: 'Fechas de recuperación', query: '¿Cuándo vuelven los lesionados?' },
        { icon: 'bi-people-fill', text: 'Jugadores disponibles', query: '¿Cuántos jugadores están disponibles?' },
        { icon: 'bi-trophy', text: 'Próximos partidos', query: '¿Cuáles son los próximos partidos?' },
        { icon: 'bi-clipboard-check', text: 'Entrenamientos', query: '¿Cuántos entrenamientos hay esta semana?' },
        { icon: 'bi-graph-up', text: 'Estadísticas', query: 'Dame las estadísticas de rendimiento del club' },
        { icon: 'bi-arrow-clockwise', text: 'Volver al inicio', query: 'Ayuda' },
      ];
    } else if (/goleador|goles|anotad/i.test(userText)) {
      this.suggestions = [
        { icon: 'bi-trophy', text: 'Próximos partidos', query: '¿Cuáles son los próximos partidos?' },
        { icon: 'bi-graph-up', text: 'Estadísticas del club', query: 'Dame las estadísticas de rendimiento del club' },
        { icon: 'bi-clipboard-check', text: 'Asistencias', query: '¿Quiénes dan más asistencias?' },
        { icon: 'bi-people-fill', text: 'Todos los jugadores', query: '¿Cuántos jugadores hay en el club?' },
        { icon: 'bi-calendar4-week', text: 'Entrenamientos', query: '¿Cuántos entrenamientos hay esta semana?' },
        { icon: 'bi-arrow-clockwise', text: 'Volver al inicio', query: 'Ayuda' },
      ];
    } else if (/documento|documentos|papeles/i.test(userText)) {
      this.suggestions = [
        { icon: 'bi-file-medical', text: 'Certificados médicos', query: '¿Cuántos certificados médicos están al día?' },
        { icon: 'bi-shield-check', text: 'Seguros deportivos', query: '¿Están al día los seguros deportivos?' },
        { icon: 'bi-card-list', text: 'Licencias federativas', query: '¿Cuántas licencias están pendientes?' },
        { icon: 'bi-people-fill', text: 'Jugadores del club', query: '¿Cuántos jugadores hay en el club?' },
        { icon: 'bi-graph-up', text: 'Estadísticas', query: 'Dame las estadísticas de rendimiento del club' },
        { icon: 'bi-arrow-clockwise', text: 'Volver al inicio', query: 'Ayuda' },
      ];
    } else if (/asistencia|faltas|ausencias/i.test(userText)) {
      this.suggestions = [
        { icon: 'bi-clipboard-check', text: 'Próximos entrenamientos', query: '¿Cuántos entrenamientos hay esta semana?' },
        { icon: 'bi-people-fill', text: 'Jugadores activos', query: '¿Cuántos jugadores hay en el club?' },
        { icon: 'bi-trophy', text: 'Próximos partidos', query: '¿Cuáles son los próximos partidos?' },
        { icon: 'bi-bandaid', text: 'Jugadores lesionados', query: '¿Hay jugadores lesionados?' },
        { icon: 'bi-graph-up', text: 'Estadísticas', query: 'Dame las estadísticas de rendimiento del club' },
        { icon: 'bi-arrow-clockwise', text: 'Volver al inicio', query: 'Ayuda' },
      ];
    } else {
      // Sugerencias por defecto si no se identifica el tema
      this.suggestions = [
        { icon: 'bi-people-fill', text: '¿Cuántos jugadores hay en el club?', query: '¿Cuántos jugadores hay en el club?' },
        { icon: 'bi-cash-coin', text: 'Jugadores con cuotas pendientes', query: 'Dime cuántos jugadores faltan por pagar cuotas' },
        { icon: 'bi-trophy', text: 'Próximos partidos', query: '¿Cuáles son los próximos partidos?' },
        { icon: 'bi-graph-up', text: 'Estadísticas del club', query: 'Dame las estadísticas de rendimiento del club' },
        { icon: 'bi-clipboard-check', text: 'Entrenamientos esta semana', query: '¿Cuántos entrenamientos hay esta semana?' },
        { icon: 'bi-bandaid', text: 'Jugadores lesionados', query: '¿Hay jugadores lesionados?' },
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

  goBack(): void {
    this.location.back();
  }

  trackByMsgId(index: number, msg: ChatMessage): number {
    return msg.id;
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
      this.conversations = raw ? JSON.parse(raw) : [];
    } catch {
      this.conversations = [];
    }
  }

  startNewConversation(): void {
    // Guardar la conversación actual si hay mensajes de usuario
    if (this.messages.some(m => m.role === 'user')) {
      this.saveConversation();
    }
    // Reiniciar
    this.messages = [];
    this.msgIdCounter = 0;
    this.currentConversationId = null;
    this.showHistory = false;
    this.showSuggestions = true;
    // Mensaje de bienvenida
    this.addAssistantMessage(
      '¡Hola! 👋 Soy el asistente de IA de tu club. Puedo ayudarte a consultar información sobre jugadores, cuotas, partidos, estadísticas y mucho más.\n\nPuedes escribirme o elegir una de las sugerencias de abajo. ¡Pregúntame lo que necesites!'
    );
    // Restaurar sugerencias por defecto
    this.suggestions = [
      { icon: 'bi-people-fill', text: '¿Cuántos jugadores hay en el club?', query: '¿Cuántos jugadores hay en el club?' },
      { icon: 'bi-cash-coin', text: 'Jugadores con cuotas pendientes', query: 'Dime cuántos jugadores faltan por pagar cuotas' },
      { icon: 'bi-trophy', text: 'Próximos partidos', query: '¿Cuáles son los próximos partidos?' },
      { icon: 'bi-graph-up', text: 'Estadísticas del club', query: 'Dame las estadísticas de rendimiento del club' },
      { icon: 'bi-clipboard-check', text: 'Entrenamientos esta semana', query: '¿Cuántos entrenamientos hay esta semana?' },
      { icon: 'bi-bandaid', text: 'Jugadores lesionados', query: '¿Hay jugadores lesionados?' },
    ];
  }

  loadConversation(conv: ConversationSummary): void {
    // Guardar la conversación actual si tiene mensajes de usuario
    if (this.messages.some(m => m.role === 'user') && this.currentConversationId !== conv.id) {
      this.saveConversation();
    }
    // Restaurar la conversación seleccionada
    this.messages = conv.messages.map(m => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }));
    this.msgIdCounter = this.messages.length;
    this.currentConversationId = conv.id;
    this.showHistory = false;
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
      // Mantener máximo 50 conversaciones
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
