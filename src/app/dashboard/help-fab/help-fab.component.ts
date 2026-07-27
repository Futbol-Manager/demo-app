import {
  Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef,
  ViewChild, ElementRef, AfterViewChecked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { ManualChatService, ManualStreamEvent } from 'src/app/core/services/manual-chat/manual-chat.service';
import { LoginService } from 'src/app/core/services/login/login.service';
import { MarkdownAiPipe } from '../pipes/markdown.pipe';

interface HelpMessage {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  isStreaming?: boolean;
  /** SafeHtml prerenderizado por el pipe markdown */
  html?: SafeHtml;
}

interface HelpSuggestion {
  /** clave i18n */
  labelKey: string;
}

/**
 * "Pregunta al manual" — chatbot del manual para perfiles Club (1) y Staff (9).
 *
 * Diferencias clave con AiFabComponent:
 *  - NO consume créditos
 *  - Sin historial persistido en BD (la conversación vive solo en memoria)
 *  - Sin pending actions, sin charts, sin voz, sin XLSX export
 *  - UI minimalista: input + respuestas streaming
 *  - FAB en la esquina inferior DERECHA (debajo del AI FAB cuando
 *    ambos coexisten; en clubes Adhoc sin Asistente IA, el AI FAB
 *    se oculta vía DashboardComponent.aiAssistantEnabled y este botón
 *    queda solo en la esquina sin solape).
 *  - Color de marca invertido: navy con borde verde (vs verde sólido)
 *
 * El componente lee el profileId del LoginService.usuarioActual y se auto-oculta
 * si el rol no es 1 (Club), 9 (Staff) o 99 (Admin Sphaira). El template padre
 * (dashboard.component.html) también filtra con *ngIf, esto es defensa en profundidad.
 */
@Component({

  selector: 'app-help-fab',
  templateUrl: './help-fab.component.html',
  styleUrls: ['./help-fab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HelpFabComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('helpChatBody') helpChatBody?: ElementRef<HTMLDivElement>;
  @ViewChild('helpInput') helpInputRef?: ElementRef<HTMLTextAreaElement>;

  // ──────────────────────────────────────────────────────────────────
  // Arrastrable (drag & drop del FAB por la pantalla)
  // ──────────────────────────────────────────────────────────────────

  /** Tamaño del FAB en píxeles (mantener en sync con SCSS). */
  private static readonly FAB_SIZE = 56;
  /** Margen mínimo respecto al borde del viewport. */
  private static readonly FAB_MARGIN = 8;
  /** Distancia mínima en px que diferencia un click de un drag. */
  private static readonly DRAG_THRESHOLD = 5;
  /** Clave de localStorage para persistir la posición entre sesiones. */
  private static readonly FAB_POSITION_KEY = 'helpFabPosition';

  /**
   * Posición persistida del FAB. Si es null, se renderiza en la
   * esquina inferior derecha por defecto (vía SCSS).
   */
  fabPosition: { x: number; y: number } | null = null;

  /** Estado interno del arrastre en curso. */
  dragStart: { x: number; y: number; origX: number; origY: number } | null = null;
  /** Flag que distingue un click "real" de un click sintético al final de un drag. */
  didDrag = false;
  /** PointerId capturado para recibir move/up fuera del botón. */
  private dragPointerId: number | null = null;

  /** Estado de visibilidad del panel desplegable */
  isOpen = false;

  /** Mensaje en redacción */
  userInput = '';

  /** Conversación actual (solo memoria, no persiste) */
  messages: HelpMessage[] = [];

  /** True mientras la IA está generando una respuesta */
  isResponding = false;

  /** True solo si el usuario es Club admin (1), Staff (9) o admin Sphaira (99) */
  isVisibleForRole = false;

  private msgIdCounter = 0;
  private shouldScroll = false;
  private streamSub: Subscription | null = null;
  private subs: Subscription[] = [];
  /** Pipe markdown instanciado manualmente (al estilo AiFabComponent), porque
   *  MarkdownAiPipe no es providedIn:'root'. */
  private readonly markdownPipe: MarkdownAiPipe;

  /** Datos del usuario logueado */
  private userId = 0;
  private profileId = 0;

  /** Sugerencias iniciales (claves i18n) */
  readonly suggestions: HelpSuggestion[] = [
    { labelKey: 'HELP_FAB.SUGGESTION_CREATE_TEAM' },
    { labelKey: 'HELP_FAB.SUGGESTION_PAYMENTS' },
    { labelKey: 'HELP_FAB.SUGGESTION_ADD_STAFF' },
    { labelKey: 'HELP_FAB.SUGGESTION_PERMISSIONS' },
  ];

  constructor(
    private manualChatService: ManualChatService,
    private loginService: LoginService,
    private translate: TranslateService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {
    this.markdownPipe = new MarkdownAiPipe(this.sanitizer);
  }

  /**
   * Captura clicks en los enlaces internos generados por el pipe markdown
   * (clase `ai-nav-link`, atributo `data-route`). Sirve para que la respuesta
   * de la IA pueda llevar al usuario directamente a la wiki en
   * `/dashboard/ayuda#slug` (u otras rutas internas) sin recargar la página.
   *
   * Si la ruta lleva fragmento, lo extraemos y lo pasamos a Router como
   * `fragment` para que la wiki haga scroll a la sección al cargar.
   */
  onBubbleClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const linkEl = target.closest('a.ai-nav-link') as HTMLElement | null;
    if (!linkEl) return;
    event.preventDefault();
    const route = linkEl.getAttribute('data-route');
    if (!route) return;
    const hashIdx = route.indexOf('#');
    if (hashIdx >= 0) {
      const path = route.substring(0, hashIdx) || '/';
      const fragment = route.substring(hashIdx + 1);
      this.router.navigate([path], { fragment });
    } else {
      this.router.navigateByUrl(route);
    }
    // Cerramos el panel para no tapar la sección a la que se navega
    this.isOpen = false;
    this.cdr.markForCheck();
  }

  /** Listener del evento global emitido por AyudaComponent */
  private openFromAyudaListener = (e: Event) => {
    const ce = e as CustomEvent<{ question?: string; slug?: string }>;
    const q = ce.detail?.question?.trim();
    if (!this.isVisibleForRole) return;
    this.isOpen = true;
    if (q) {
      this.userInput = q;
      // Ejecutamos en el tick siguiente para que el textarea ya esté en el DOM
      setTimeout(() => {
        this.helpInputRef?.nativeElement.focus();
        this.cdr.markForCheck();
      }, 50);
    }
    this.cdr.markForCheck();
  };

  ngOnInit(): void {
    this.subs.push(
      this.loginService.usuarioActual.subscribe(user => {
        if (user) {
          this.userId = user.userId || 0;
          this.profileId = user.profileType?.profileId || 0;
        } else {
          this.userId = 0;
          this.profileId = 0;
        }
        this.isVisibleForRole =
          this.profileId === 1 || this.profileId === 9 || this.profileId === 99;
        this.cdr.markForCheck();
      })
    );

    // Escuchar el evento "sphaira:open-help-fab" disparado por la wiki Ayuda
    if (typeof window !== 'undefined') {
      window.addEventListener('sphaira:open-help-fab', this.openFromAyudaListener);
      window.addEventListener('resize', this.onWindowResize);
    }

    this.loadFabPosition();
  }

  ngOnDestroy(): void {
    this.streamSub?.unsubscribe();
    this.subs.forEach(s => s.unsubscribe());
    if (typeof window !== 'undefined') {
      window.removeEventListener('sphaira:open-help-fab', this.openFromAyudaListener);
      window.removeEventListener('resize', this.onWindowResize);
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // Drag & drop del FAB
  //
  // Implementado con Pointer Events para que funcione en mouse, touch
  // y pen sin código duplicado. Se persiste la posición en
  // localStorage; si el viewport cambia (resize, rotación móvil), se
  // recalcula clampToViewport para que el botón no quede fuera de
  // pantalla.
  // ──────────────────────────────────────────────────────────────────

  /** Carga la posición persistida y la sanitiza al viewport actual. */
  private loadFabPosition(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(HelpFabComponent.FAB_POSITION_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed?.x !== 'number' || typeof parsed?.y !== 'number') return;
      this.fabPosition = this.clampToViewport({ x: parsed.x, y: parsed.y });
      this.cdr.markForCheck();
    } catch {
      // Storage no disponible o JSON corrupto: ignoramos y dejamos el default.
    }
  }

  /** Persiste la posición actual en localStorage (fire-and-forget). */
  private saveFabPosition(): void {
    if (!this.fabPosition || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        HelpFabComponent.FAB_POSITION_KEY,
        JSON.stringify(this.fabPosition)
      );
    } catch {
      // Modo privado o quota excedida: el FAB seguirá moviéndose en
      // memoria pero no se persistirá. Aceptable.
    }
  }

  /** Listener de resize para reposicionar el FAB si queda fuera del viewport. */
  private onWindowResize = (): void => {
    if (!this.fabPosition) return;
    const clamped = this.clampToViewport(this.fabPosition);
    if (clamped.x !== this.fabPosition.x || clamped.y !== this.fabPosition.y) {
      this.fabPosition = clamped;
      this.saveFabPosition();
      this.cdr.markForCheck();
    }
  };

  /**
   * Acota la posición para que el FAB nunca quede fuera del viewport
   * (se contemplan los márgenes mínimos en {@code FAB_MARGIN}).
   */
  private clampToViewport(pos: { x: number; y: number }): { x: number; y: number } {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const s = HelpFabComponent.FAB_SIZE;
    const m = HelpFabComponent.FAB_MARGIN;
    return {
      x: Math.max(m, Math.min(vw - s - m, pos.x)),
      y: Math.max(m, Math.min(vh - s - m, pos.y)),
    };
  }

  /**
   * Inicio del arrastre: capturamos el pointer para recibir move/up
   * incluso si el cursor sale del botón. Guardamos las coords iniciales
   * y la posición actual para calcular el delta exacto en move.
   */
  onFabPointerDown(event: PointerEvent): void {
    if (event.button !== 0 && event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
    // Posición actual (si no hay custom, usamos las coords renderizadas vía getBoundingClientRect)
    let origX = 0;
    let origY = 0;
    if (this.fabPosition) {
      origX = this.fabPosition.x;
      origY = this.fabPosition.y;
    } else {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      origX = rect.left;
      origY = rect.top;
    }
    this.dragStart = { x: event.clientX, y: event.clientY, origX, origY };
    this.didDrag = false;
    this.dragPointerId = event.pointerId;
    try {
      (event.target as HTMLElement).setPointerCapture(event.pointerId);
    } catch {
      // setPointerCapture puede fallar en algunos navegadores; el drag
      // sigue funcionando aunque sin captura.
    }
  }

  /**
   * Movimiento durante el arrastre. Solo se actualiza la posición si
   * el desplazamiento supera el umbral (evita micro-jitter por tap).
   */
  onFabPointerMove(event: PointerEvent): void {
    if (!this.dragStart) return;
    if (this.dragPointerId !== null && event.pointerId !== this.dragPointerId) return;
    const dx = event.clientX - this.dragStart.x;
    const dy = event.clientY - this.dragStart.y;
    if (!this.didDrag) {
      const threshold = HelpFabComponent.DRAG_THRESHOLD;
      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;
      this.didDrag = true;
      // Cerramos el panel al empezar a arrastrar para que no quede
      // anclado a una posición vieja mientras se mueve el botón.
      if (this.isOpen) {
        this.isOpen = false;
      }
    }
    this.fabPosition = this.clampToViewport({
      x: this.dragStart.origX + dx,
      y: this.dragStart.origY + dy,
    });
    this.cdr.markForCheck();
  }

  /**
   * Fin del arrastre. Si hubo desplazamiento real, persistimos la
   * nueva posición y bloqueamos el click sintético posterior para
   * que NO se abra el panel después de un drag.
   */
  onFabPointerUp(event: PointerEvent): void {
    if (!this.dragStart) return;
    if (this.dragPointerId !== null && event.pointerId !== this.dragPointerId) return;
    this.dragStart = null;
    this.dragPointerId = null;
    if (this.didDrag) {
      this.saveFabPosition();
      // Mantenemos didDrag=true hasta que el evento click llegue y
      // toggle() lo consuma. Después del click, didDrag se resetea.
      event.preventDefault();
      event.stopPropagation();
    }
  }

  /**
   * Estilos inline para el FAB cuando tiene posición custom. Se
   * devuelve {@code null} en el render inicial para que respete el
   * default de SCSS (bottom-right).
   */
  get fabStyle(): { [key: string]: string } | null {
    if (!this.fabPosition) return null;
    return {
      'left':       `${this.fabPosition.x}px`,
      'top':        `${this.fabPosition.y}px`,
      'right':      'auto',
      'bottom':     'auto',
      'transition': this.dragStart ? 'none' : 'left 0.18s ease, top 0.18s ease',
      'cursor':     this.dragStart ? 'grabbing' : 'grab',
    };
  }

  /**
   * Estilos inline para el panel desplegable cuando el FAB tiene
   * posición custom. El panel se ubica adyacente al botón con la
   * orientación que más espacio libre tenga (derecha vs izquierda,
   * arriba vs abajo) para no salirse del viewport.
   */
  get panelStyle(): { [key: string]: string } | null {
    if (!this.fabPosition) return null;
    if (typeof window === 'undefined') return null;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const s = HelpFabComponent.FAB_SIZE;
    const m = HelpFabComponent.FAB_MARGIN;
    const gap = 12;
    // Tamaño aproximado del panel (mantener en sync con SCSS desktop).
    const panelW = Math.min(380, vw - 2 * m);
    const panelH = Math.min(600, vh - 2 * m);

    // Horizontal: preferimos alinear el panel con la izquierda del FAB.
    // Si se sale por la derecha, lo desplazamos a la izquierda.
    let left = this.fabPosition.x;
    if (left + panelW > vw - m) {
      left = Math.max(m, vw - panelW - m);
    }
    if (left < m) left = m;

    // Vertical: preferimos abrirlo HACIA ARRIBA del botón (más natural
    // para un FAB en la parte inferior). Si no cabe arriba, abajo.
    let top: number;
    if (this.fabPosition.y - panelH - gap >= m) {
      top = this.fabPosition.y - panelH - gap;
    } else if (this.fabPosition.y + s + gap + panelH <= vh - m) {
      top = this.fabPosition.y + s + gap;
    } else {
      top = Math.max(m, Math.min(vh - panelH - m, this.fabPosition.y));
    }

    return {
      'left':   `${left}px`,
      'top':    `${top}px`,
      'right':  'auto',
      'bottom': 'auto',
    };
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll && this.helpChatBody) {
      const el = this.helpChatBody.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScroll = false;
    }
  }

  /** Abrir / cerrar panel */
  toggle(): void {
    // Si acabamos de soltar tras un drag real, ignoramos el click
    // sintético que dispara el navegador después de pointerup. De lo
    // contrario el panel se abriría al final de cada arrastre.
    if (this.didDrag) {
      this.didDrag = false;
      return;
    }
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      setTimeout(() => this.helpInputRef?.nativeElement.focus(), 100);
    }
    this.cdr.markForCheck();
  }

  /** Cerrar panel sin perder mensajes */
  close(): void {
    this.isOpen = false;
    this.cdr.markForCheck();
  }

  /** Limpiar la conversación actual */
  clearConversation(): void {
    this.streamSub?.unsubscribe();
    this.streamSub = null;
    this.messages = [];
    this.isResponding = false;
    this.cdr.markForCheck();
  }

  /** Enviar el mensaje del usuario */
  sendMessage(): void {
    const text = this.userInput.trim();
    if (!text || this.isResponding) return;
    this.askInternal(text);
    this.userInput = '';
  }

  /** Atajo: enviar al pulsar una sugerencia */
  askSuggestion(s: HelpSuggestion): void {
    if (this.isResponding) return;
    const text = this.translate.instant(s.labelKey);
    this.askInternal(text);
  }

  /** Lógica común de envío (por input o por sugerencia) */
  private askInternal(text: string): void {
    if (text.length > 500) text = text.substring(0, 500);

    // 1) Añadir mensaje del usuario
    const userMsg: HelpMessage = {
      id: ++this.msgIdCounter,
      role: 'user',
      text,
    };
    this.messages = [...this.messages, userMsg];

    // 2) Crear mensaje vacío del asistente que se irá rellenando
    const assistantMsg: HelpMessage = {
      id: ++this.msgIdCounter,
      role: 'assistant',
      text: '',
      isStreaming: true,
    };
    this.messages = [...this.messages, assistantMsg];

    this.isResponding = true;
    this.shouldScroll = true;
    this.cdr.markForCheck();

    // 3) Construir history (últimos 6 turnos, sin el mensaje actual del usuario
    //    ni el placeholder vacío del asistente)
    const history = this.messages
      .slice(-13, -2)
      .map(m => ({ role: m.role, text: m.text }));

    const language = (this.translate.currentLang || this.translate.defaultLang || 'es').split('-')[0];

    // 4) Lanzar stream
    this.streamSub?.unsubscribe();
    this.streamSub = this.manualChatService.sendMessageStream(
      this.userId, this.profileId, text, history, language, 'web'
    ).subscribe({
      next: (event: ManualStreamEvent) => this.handleStreamEvent(event, assistantMsg),
      error: () => this.finalizeAssistantMessage(assistantMsg, 'HELP_FAB.ERROR'),
      complete: () => {
        if (!assistantMsg.text || assistantMsg.text.trim().length === 0) {
          this.finalizeAssistantMessage(assistantMsg, 'HELP_FAB.NO_RESPONSE');
        }
      }
    });
  }

  private handleStreamEvent(event: ManualStreamEvent, msg: HelpMessage): void {
    switch (event.type) {
      case 'text':
        msg.text += event.text;
        msg.html = this.markdownPipe.transform(msg.text);
        this.shouldScroll = true;
        this.cdr.markForCheck();
        break;
      case 'done':
        msg.isStreaming = false;
        msg.html = this.markdownPipe.transform(msg.text);
        this.isResponding = false;
        this.shouldScroll = true;
        this.cdr.markForCheck();
        break;
      case 'error':
        msg.text = event.message || this.translate.instant('HELP_FAB.ERROR');
        msg.html = this.markdownPipe.transform(msg.text);
        msg.isStreaming = false;
        this.isResponding = false;
        this.cdr.markForCheck();
        break;
    }
  }

  private finalizeAssistantMessage(msg: HelpMessage, fallbackKey: string): void {
    if (!msg.text || msg.text.trim().length === 0) {
      msg.text = this.translate.instant(fallbackKey);
    }
    msg.html = this.markdownPipe.transform(msg.text);
    msg.isStreaming = false;
    this.isResponding = false;
    this.cdr.markForCheck();
  }

  /** Atajo de teclado: Enter envía, Shift+Enter inserta salto de línea */
  onInputKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  /** Track function para el *ngFor de mensajes */
  trackMsg(_idx: number, msg: HelpMessage): number {
    return msg.id;
  }
}
