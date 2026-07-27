import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import lunr from 'lunr';

import {
  ManualChatService,
  ManualSection,
} from 'src/app/core/services/manual-chat/manual-chat.service';
import { LoginService } from 'src/app/core/services/login/login.service';
import { MarkdownAiPipe } from '../pipes/markdown.pipe';

/**
 * Nombre del CustomEvent que el {@code AyudaComponent} dispara para pedirle
 * al {@code HelpFabComponent} que se abra con una pregunta pre-rellenada.
 * Si en el futuro se introduce un servicio dedicado para esto, sustituirlo.
 */
export const HELP_FAB_OPEN_EVENT = 'sphaira:open-help-fab';

interface RenderedSection extends ManualSection {
  /** Cabecera ya normalizada (sentence case, sin prefijos de tipo "MODULO:") */
  prettyHeader: string;
  /** Markdown ya transformado a SafeHtml (con callouts ya aplicados) */
  html: SafeHtml;
  /** Categoría asignada para agrupación en sidebar/hero */
  categoryId: string;
}

interface SearchHit {
  slug: string;
  header: string;
  /** Snippet del primer match en el contenido */
  snippet: string;
}

interface CategoryDef {
  id: string;
  label: string;
  icon: string;
  description: string;
}

interface CategoryGroup extends CategoryDef {
  sections: RenderedSection[];
  /** ¿está expandida en el sidebar? */
  expanded: boolean;
}

/**
 * Wiki "Pregunta al manual" — pantalla /dashboard/ayuda.
 *
 * Layout: hero con tarjetas de acceso rápido + sidebar acordeón agrupado por
 * categorías + área de contenido con callouts visuales y breadcrumb sticky.
 *
 * Visibilidad: el componente NO se monta si profileId no es 1, 9 o 99 — el
 * canActivate del router ya filtra, pero defensa en profundidad: si llegan
 * sin permiso, los redirige a /dashboard/inicio.
 */
@Component({
  providers: [MarkdownAiPipe],
  selector: 'app-ayuda',
  templateUrl: './ayuda.component.html',
  styleUrls: ['./ayuda.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AyudaComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('contentScroll') contentScrollRef?: ElementRef<HTMLElement>;

  loading = true;
  error = false;

  /** Todas las secciones renderizadas (en el orden final, agrupadas por categoría) */
  sections: RenderedSection[] = [];

  /** Grupos visibles en el sidebar y en las tarjetas del hero */
  groups: CategoryGroup[] = [];

  /** Búsqueda actual (input del usuario) */
  searchQuery = '';

  /** Resultados del filtrado en cliente (vacío = mostrar índice completo) */
  searchHits: SearchHit[] = [];

  /** Slug actualmente visible en el viewport (sirve para resaltar el sidebar) */
  activeSlug = '';

  /** Categoría actualmente visible (para breadcrumb sticky) */
  activeCategoryId = '';

  /** Sidebar abierto en móvil */
  sidebarMobileOpen = false;

  /** Botón "Volver arriba" visible solo cuando hay scroll */
  showBackToTop = false;

  private subs: Subscription[] = [];
  private profileId = 0;
  private observer?: IntersectionObserver;
  /**
   * Índice Lunr.js construido tras cargar las secciones.
   * Es null hasta que se haya construido (la búsqueda fallback usa substring).
   */
  private lunrIndex: lunr.Index | null = null;

  // ── Catálogo de categorías ────────────────────────────────────────────────
  // Orden = orden visual en hero + sidebar.
  private readonly CATEGORIES: CategoryDef[] = [
    { id: 'inicio',       label: 'AYUDA.CAT_INICIO',       icon: 'bi-compass',          description: 'AYUDA.CAT_INICIO_DESC' },
    { id: 'dashboard',    label: 'AYUDA.CAT_DASHBOARD',    icon: 'bi-grid-1x2-fill',    description: 'AYUDA.CAT_DASHBOARD_DESC' },
    { id: 'equipos',      label: 'AYUDA.CAT_EQUIPOS',      icon: 'bi-people-fill',      description: 'AYUDA.CAT_EQUIPOS_DESC' },
    { id: 'jugadores',    label: 'AYUDA.CAT_JUGADORES',    icon: 'bi-person-badge',     description: 'AYUDA.CAT_JUGADORES_DESC' },
    { id: 'comunicacion', label: 'AYUDA.CAT_COMUNICACION', icon: 'bi-megaphone-fill',   description: 'AYUDA.CAT_COMUNICACION_DESC' },
    { id: 'pagos',        label: 'AYUDA.CAT_PAGOS',        icon: 'bi-currency-euro',    description: 'AYUDA.CAT_PAGOS_DESC' },
    { id: 'documentos',   label: 'AYUDA.CAT_DOCUMENTOS',   icon: 'bi-file-earmark-text-fill', description: 'AYUDA.CAT_DOCUMENTOS_DESC' },
    { id: 'calendario',   label: 'AYUDA.CAT_CALENDARIO',   icon: 'bi-calendar3',        description: 'AYUDA.CAT_CALENDARIO_DESC' },
    { id: 'video',        label: 'AYUDA.CAT_VIDEO',        icon: 'bi-camera-video-fill',description: 'AYUDA.CAT_VIDEO_DESC' },
    { id: 'club',         label: 'AYUDA.CAT_CLUB',         icon: 'bi-buildings',        description: 'AYUDA.CAT_CLUB_DESC' },
    { id: 'player',       label: 'AYUDA.CAT_PLAYER',       icon: 'bi-phone',            description: 'AYUDA.CAT_PLAYER_DESC' },
  ];

  /** Reglas en orden de prioridad: la primera que matche gana. */
  private readonly CATEGORY_RULES: { regex: RegExp; cat: string }[] = [
    // Player siempre primero por su prefijo claro
    { regex: /^PLAYER\s*[-—]/i,                                             cat: 'player' },
    { regex: /CUADRO DE MANDO|^INICIO\b|MODULO:\s*INICIO/i,                 cat: 'dashboard' },
    { regex: /CONVOCATORIA|MIS EQUIPOS|MENU DEL EQUIPO|MENÚ DEL EQUIPO|EQUIPOS/i, cat: 'equipos' },
    { regex: /EVALUAC|SCOUTING|LESION|ESTADIST/i,                           cat: 'jugadores' },
    { regex: /JUGADOR|ENTRENADOR|STAFF/i,                                   cat: 'jugadores' },
    { regex: /NOTIFICAC|ENCUESTA|PATROCINAD|POSTS|MENSAJER/i,               cat: 'comunicacion' },
    { regex: /TIENDA|PAGO|CUOTA/i,                                          cat: 'pagos' },
    { regex: /DOCUMENT|ROPA|EQUIPACI/i,                                     cat: 'documentos' },
    { regex: /CALENDARIO|ENTRENAMIENTO|CLASIFICAC|PARTIDO/i,                cat: 'calendario' },
    { regex: /VIDEO|VÍDEO|BROADCAST|RETRANSMI/i,                            cat: 'video' },
    { regex: /SUSCRIPC|DATOS FISCAL|PERMISO|MODO PROFESIONAL|DATOS DEL CLUB|ABONADO/i, cat: 'club' },
    { regex: /GUIA|GUÍA|NAVEGAR|BARRA LATERAL|SPHAIRA TECH/i,               cat: 'inicio' },
  ];

  constructor(
    private manualChatService: ManualChatService,
    private loginService: LoginService,
    private translate: TranslateService,
    private sanitizer: DomSanitizer,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private markdown: MarkdownAiPipe,
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.loginService.usuarioActual.subscribe(user => {
        const role = user?.profileType?.profileId || 0;
        if (role !== 1 && role !== 9 && role !== 99) {
          this.router.navigate(['/dashboard/inicio']);
          return;
        }
        // El BehaviorSubject usuarioActual puede emitir el mismo usuario
        // varias veces. Solo recargar si cambia el rol o aún no se ha
        // cargado nada.
        if (role === this.profileId && this.sections.length > 0) return;
        this.profileId = role;
        this.loadSections();
      })
    );
  }

  ngAfterViewInit(): void {
    // Tras renderizar, si la URL tiene un fragment (#slug), hacemos scroll a él
    this.subs.push(
      this.route.fragment.subscribe(frag => {
        if (frag && this.sections.some(s => s.slug === frag)) {
          // pequeño retardo para que el DOM esté pintado
          setTimeout(() => this.scrollToSlug(frag, false), 80);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.observer?.disconnect();
  }

  /** Carga las secciones del backend y prerenderiza el markdown */
  private loadSections(): void {
    this.loading = true;
    this.error = false;
    this.subs.push(
      this.manualChatService.getSections(this.profileId).subscribe({
        next: (raw: ManualSection[]) => {
          // El procesado puede tardar 1-3s con el manual completo (corrector
          // de tildes + markdown + DOMPurify por sección). Lo hacemos de
          // forma asíncrona y con try/catch para no bloquear el UI thread y
          // poder diagnosticar fácilmente si falla algún paso.
          this.processSectionsAsync(raw).catch(err => {
            console.error('[Ayuda] Error procesando secciones del manual:', err);
            this.loading = false;
            this.error = true;
            this.cdr.markForCheck();
          });
        },
        error: () => {
          this.loading = false;
          this.error = true;
          this.cdr.markForCheck();
        }
      })
    );
  }

  /**
   * Procesa las secciones del manual en background (yield al UI thread cada 3
   * secciones para que el spinner siga animado y no parezca un cuelgue).
   * Cada sección se renderiza con try/catch independiente: si una falla, las
   * demás se siguen mostrando.
   */
  private async processSectionsAsync(raw: ManualSection[]): Promise<void> {
    console.log('[Ayuda] processSectionsAsync: raw.length=', raw?.length || 0);
    if (!raw || raw.length === 0) {
      this.loading = false;
      this.error = true;
      this.sections = [];
      this.groups = [];
      this.cdr.markForCheck();
      return;
    }

    const t0 = performance.now();
    // 0. Fusionar subsecciones (separadores ---- internos del .txt)
    const merged = this.mergeSubsections(raw);
    console.log('[Ayuda] mergeSubsections:', merged.length, 'en', (performance.now() - t0).toFixed(0), 'ms');

    // 1. Construir RenderedSection con categoría y pretty header (en chunks)
    const rendered: RenderedSection[] = [];
    const CHUNK_SIZE = 3;
    for (let i = 0; i < merged.length; i++) {
      const sec = merged[i];
      const tSec = performance.now();
      try {
        const categoryId = this.categorize(sec.header);
        const prettyHeader = this.prettifyHeader(sec.header);
        const preprocessed = this.preprocessManualContent(sec.content);
        const enrichedHtml = this.enrichManualHtml(
          this.markdownToString(preprocessed)
        );
        rendered.push({
          ...sec,
          prettyHeader,
          categoryId,
          html: this.sanitizer.bypassSecurityTrustHtml(enrichedHtml),
        });
      } catch (err) {
        console.warn('[Ayuda] Error procesando sección', sec.slug, err);
        // Fallback: renderizar la sección sin enriquecimiento
        rendered.push({
          ...sec,
          prettyHeader: sec.header,
          categoryId: this.categorize(sec.header),
          html: this.sanitizer.bypassSecurityTrustHtml(
            `<pre class="ai-pre">${this.escapeHtml(sec.content)}</pre>`
          ),
        });
      }
      const dur = performance.now() - tSec;
      if (dur > 500) {
        console.warn('[Ayuda] Sección lenta', sec.slug, dur.toFixed(0), 'ms');
      }
      // Yield al UI thread cada CHUNK_SIZE secciones
      if (i > 0 && i % CHUNK_SIZE === 0) {
        await new Promise(r => setTimeout(r, 0));
      }
    }
    console.log('[Ayuda] Total procesado:', (performance.now() - t0).toFixed(0), 'ms para', rendered.length, 'secciones');

    // 2. Reordenar por categoría
    const catOrder = new Map(this.CATEGORIES.map((c, i) => [c.id, i]));
    rendered.sort((a, b) => {
      const ca = catOrder.get(a.categoryId) ?? 999;
      const cb = catOrder.get(b.categoryId) ?? 999;
      return ca - cb;
    });
    this.sections = rendered;

    // 3. Construir grupos visibles
    this.groups = this.CATEGORIES
      .map((c, idx) => ({
        ...c,
        sections: rendered.filter(s => s.categoryId === c.id),
        expanded: idx === 0,
      }))
      .filter(g => g.sections.length > 0);

    this.loading = false;
    this.error = rendered.length === 0;
    if (rendered.length > 0) {
      queueMicrotask(() => this.buildLunrIndex());
    }
    this.cdr.markForCheck();
    setTimeout(() => this.setupSectionObserver(), 0);
  }

  private escapeHtml(s: string): string {
    return (s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Convierte el contenido markdown del manual a un string HTML,
   * desempaquetando el SafeHtml producido por MarkdownAiPipe (que devuelve
   * SafeHtml para permitir el bypass del sanitizer de Angular).
   */
  private markdownToString(content: string): string {
    const safe: any = this.markdown.transform(content);
    // SafeHtml es un objeto opaco; el string real está en .changingThisBreaksApplicationSecurity
    if (typeof safe === 'string') return safe;
    if (safe && typeof safe.changingThisBreaksApplicationSecurity === 'string') {
      return safe.changingThisBreaksApplicationSecurity;
    }
    return String(safe ?? '');
  }

  // ── Preprocesado del contenido del manual ─────────────────────────────────
  // Los archivos .txt del manual están escritos sin tildes ni eñes (legacy).
  // Antes de pasar el contenido a Markdown, aquí:
  //   1. Corregimos tildes y eñes castellanas (palabras seguras, no ambiguas).
  //   2. Detectamos subheaders en MAYÚSCULAS y los convertimos en `### Header`.
  //   3. Resaltamos texto entre comillas dobles y palabras destacadas en
  //      mayúsculas dentro de líneas normales.

  /**
   * Diccionario de palabras castellanas frecuentes en el manual escritas sin
   * tilde / sin eñe. Solo incluye palabras NO ambiguas (no van "esta", "el",
   * "tu", "mas", "si", "se" porque tienen homógrafos sin tilde válidos).
   */
  private readonly SPANISH_ACCENT_FIX: Record<string, string> = {
    // Sustantivos y derivados terminados en -ción / -sión / -xión (singulares,
    // agudos: SÍ llevan tilde). Los plurales -iones son llanos y NO llevan tilde.
    'accion': 'acción', 'administracion': 'administración', 'aplicacion': 'aplicación',
    'asignacion': 'asignación', 'atencion': 'atención', 'autenticacion': 'autenticación',
    'autorizacion': 'autorización', 'cancelacion': 'cancelación', 'clasificacion': 'clasificación',
    'comision': 'comisión', 'comprobacion': 'comprobación', 'comunicacion': 'comunicación',
    'condicion': 'condición', 'conexion': 'conexión', 'configuracion': 'configuración',
    'confirmacion': 'confirmación', 'creacion': 'creación', 'definicion': 'definición',
    'descripcion': 'descripción', 'dimension': 'dimensión', 'direccion': 'dirección',
    'discusion': 'discusión', 'edicion': 'edición', 'eliminacion': 'eliminación',
    'evaluacion': 'evaluación', 'excepcion': 'excepción', 'exportacion': 'exportación',
    'expulsion': 'expulsión', 'extension': 'extensión', 'federacion': 'federación',
    'funcion': 'función', 'identificacion': 'identificación', 'importacion': 'importación',
    'informacion': 'información', 'inscripcion': 'inscripción', 'instalacion': 'instalación',
    'integracion': 'integración', 'invitacion': 'invitación', 'modificacion': 'modificación',
    'navegacion': 'navegación', 'notificacion': 'notificación', 'opcion': 'opción',
    'operacion': 'operación', 'organizacion': 'organización', 'presentacion': 'presentación',
    'presion': 'presión', 'produccion': 'producción', 'publicacion': 'publicación',
    'puntuacion': 'puntuación', 'reaccion': 'reacción', 'reduccion': 'reducción',
    'retransmision': 'retransmisión', 'revision': 'revisión', 'sancion': 'sanción',
    'satisfaccion': 'satisfacción', 'seccion': 'sección', 'seleccion': 'selección',
    'sesion': 'sesión', 'situacion': 'situación',
    'solucion': 'solución', 'subscripcion': 'subscripción', 'suscripcion': 'suscripción',
    'television': 'televisión', 'transmision': 'transmisión', 'union': 'unión',
    'validacion': 'validación', 'verificacion': 'verificación', 'version': 'versión',
    'vibracion': 'vibración', 'visualizacion': 'visualización',
    'gestion': 'gestión', 'inversion': 'inversión', 'mision': 'misión',

    // Adverbios y conectores
    'tambien': 'también', 'asi': 'así', 'aqui': 'aquí', 'alli': 'allí', 'ahi': 'ahí',
    'despues': 'después', 'segun': 'según', 'aun': 'aún', 'jamas': 'jamás',
    'ademas': 'además', 'detras': 'detrás', 'atras': 'atrás', 'quizas': 'quizás',

    // Sustantivos esdrújulos (siempre con tilde, singular y plural)
    'numero': 'número', 'numeros': 'números', 'pagina': 'página', 'paginas': 'páginas',
    'codigo': 'código', 'codigos': 'códigos', 'titulo': 'título', 'titulos': 'títulos',
    'capitulo': 'capítulo', 'capitulos': 'capítulos', 'metodo': 'método', 'metodos': 'métodos',
    'analisis': 'análisis', 'arbitro': 'árbitro', 'arbitros': 'árbitros',
    'minimo': 'mínimo', 'minimos': 'mínimos', 'maximo': 'máximo', 'maximos': 'máximos',
    'optimo': 'óptimo', 'optimos': 'óptimos', 'periodo': 'período', 'periodos': 'períodos',
    'simbolo': 'símbolo', 'simbolos': 'símbolos', 'simbolico': 'simbólico',
    'practica': 'práctica', 'practicas': 'prácticas',
    'tactica': 'táctica', 'tacticas': 'tácticas',
    'tecnica': 'técnica', 'tecnicas': 'técnicas',
    'tecnico': 'técnico', 'tecnicos': 'técnicos',
    'metrica': 'métrica', 'metricas': 'métricas',
    'logica': 'lógica', 'logicas': 'lógicas',
    'logico': 'lógico', 'logicos': 'lógicos',
    'fisico': 'físico', 'fisicos': 'físicos',
    'fisica': 'física', 'fisicas': 'físicas',
    'tipico': 'típico', 'tipicos': 'típicos',
    'tipica': 'típica', 'tipicas': 'típicas',
    'rapido': 'rápido', 'rapidos': 'rápidos',
    'rapida': 'rápida', 'rapidas': 'rápidas',
    'rapidamente': 'rápidamente',
    'publico': 'público', 'publicos': 'públicos',
    'publica': 'pública', 'publicas': 'públicas',
    'basico': 'básico', 'basicos': 'básicos',
    'basica': 'básica', 'basicas': 'básicas',
    'medico': 'médico', 'medicos': 'médicos',
    'medica': 'médica', 'medicas': 'médicas',
    'historico': 'histórico', 'historicos': 'históricos',
    'historica': 'histórica', 'historicas': 'históricas',
    'automatico': 'automático', 'automaticos': 'automáticos',
    'automatica': 'automática', 'automaticas': 'automáticas',
    'electrico': 'eléctrico', 'electricos': 'eléctricos',
    'electrica': 'eléctrica', 'electricas': 'eléctricas',
    'organico': 'orgánico', 'organica': 'orgánica',
    'mecanica': 'mecánica', 'mecanico': 'mecánico',
    'periodico': 'periódico', 'periodicos': 'periódicos',
    'grafico': 'gráfico', 'graficos': 'gráficos',
    'grafica': 'gráfica', 'graficas': 'gráficas',
    'generico': 'genérico', 'genericos': 'genéricos',
    'generica': 'genérica', 'genericas': 'genéricas',
    'unico': 'único', 'unicos': 'únicos',
    'unica': 'única', 'unicas': 'únicas',
    'ultimo': 'último', 'ultimos': 'últimos',
    'ultima': 'última', 'ultimas': 'últimas',
    'proximo': 'próximo', 'proximos': 'próximos',
    'proxima': 'próxima', 'proximas': 'próximas',
    'politico': 'político', 'politicos': 'políticos',
    'politica': 'política', 'politicas': 'políticas',
    'estadistica': 'estadística', 'estadisticas': 'estadísticas',
    'estadistico': 'estadístico', 'estadisticos': 'estadísticos',
    'formula': 'fórmula', 'formulas': 'fórmulas',
    'calculo': 'cálculo', 'calculos': 'cálculos',
    'jovenes': 'jóvenes',

    // Llanas con tilde (terminadas en consonante distinta de n/s)
    'util': 'útil', 'utiles': 'útiles',
    'facil': 'fácil', 'faciles': 'fáciles',
    'dificil': 'difícil', 'dificiles': 'difíciles',
    'movil': 'móvil', 'moviles': 'móviles',
    'inutil': 'inútil', 'futbol': 'fútbol',
    'lapiz': 'lápiz', 'caracter': 'carácter',

    // Verbos en futuro / condicional (siempre con tilde)
    'sera': 'será', 'seras': 'serás', 'seran': 'serán',
    'seria': 'sería', 'serias': 'serías', 'serian': 'serían',
    'estara': 'estará', 'estaras': 'estarás', 'estaran': 'estarán',
    'estaria': 'estaría', 'estarian': 'estarían',
    'tendra': 'tendrá', 'tendras': 'tendrás', 'tendran': 'tendrán',
    'tendria': 'tendría', 'tendrian': 'tendrían',
    'podra': 'podrá', 'podras': 'podrás', 'podran': 'podrán',
    'podria': 'podría', 'podrias': 'podrías', 'podrian': 'podrían',
    'vera': 'verá', 'veras': 'verás', 'veran': 'verán',
    'haria': 'haría', 'harian': 'harían', 'hara': 'hará', 'haran': 'harán',
    'ira': 'irá', 'iran': 'irán', 'iria': 'iría', 'irian': 'irían',
    'querra': 'querrá', 'querran': 'querrán',
    'pondra': 'pondrá', 'pondran': 'pondrán',
    'sabra': 'sabrá', 'sabran': 'sabrán',
    'dara': 'dará', 'daran': 'darán',
    'recibira': 'recibirá', 'recibiran': 'recibirán',
    'enviara': 'enviará', 'enviaran': 'enviarán',
    'aparecera': 'aparecerá', 'apareceran': 'aparecerán',
    'cambiara': 'cambiará', 'cambiaran': 'cambiarán',

    // Sustantivos con hiato (sí llevan tilde)
    'dia': 'día', 'dias': 'días',
    'categoria': 'categoría', 'categorias': 'categorías',
    'energia': 'energía', 'energias': 'energías',
    'tecnologia': 'tecnología', 'tecnologias': 'tecnologías',
    'teoria': 'teoría', 'teorias': 'teorías',
    'mayoria': 'mayoría', 'minoria': 'minoría',
    'autonomia': 'autonomía', 'fotografia': 'fotografía',
    'fotografias': 'fotografías', 'biologia': 'biología',
    'pais': 'país', 'paises': 'países',
    'envio': 'envío', 'envios': 'envíos',
    'rio': 'río', 'tio': 'tío',
    'frio': 'frío', 'lio': 'lío',
    'mia': 'mía', 'tuya': 'tuya', 'suya': 'suya',
    'panaderia': 'panadería', 'porteria': 'portería', 'porterias': 'porterías',

    // Días, meses
    'miercoles': 'miércoles', 'sabado': 'sábado', 'sabados': 'sábados',

    // Eñes comunes y seguras (no ambiguas)
    'compania': 'compañía', 'companias': 'compañías',
    'pequeno': 'pequeño', 'pequenos': 'pequeños',
    'pequena': 'pequeña', 'pequenas': 'pequeñas',
    'sueno': 'sueño', 'suenos': 'sueños',
    'desempeno': 'desempeño', 'diseno': 'diseño',
    'senor': 'señor', 'senora': 'señora',
    'senores': 'señores', 'senoras': 'señoras',
    'enseno': 'enseño', 'ensena': 'enseña',
    'cumpleanos': 'cumpleaños', 'cumpleano': 'cumpleaño',
    'tamano': 'tamaño', 'tamanos': 'tamaños',
    'banera': 'bañera', 'baneras': 'bañeras',
    'extrano': 'extraño', 'extranos': 'extraños',
    'extrana': 'extraña', 'extranas': 'extrañas',
    'espana': 'España', 'espanol': 'español', 'espanola': 'española',
    'munoz': 'Muñoz',

    // Otros muy comunes
    'oxigeno': 'oxígeno', 'origen': 'origen', 'imagen': 'imagen',
    'examen': 'examen', 'volumen': 'volumen',
    'ingles': 'inglés', 'frances': 'francés', 'aleman': 'alemán',
    'italiano': 'italiano', 'portugues': 'portugués',
    'cesped': 'césped', 'arbol': 'árbol', 'arboles': 'árboles',
    'angel': 'ángel', 'angeles': 'ángeles',
    'jose': 'José', 'jesus': 'Jesús', 'andres': 'Andrés',
    'sintetico': 'sintético', 'sinteticos': 'sintéticos',
  };

  /**
   * Aplica el corrector de tildes/eñes preservando la capitalización original
   * de la palabra (TODO MAYÚSCULAS, Inicial Mayúscula, todominúsculas).
   *
   * Protege URLs, rutas y emails para no romper enlaces. Por ejemplo,
   * `/dashboard/estadisticas-jugadores-club` debe quedar intacto y no
   * convertirse en `/dashboard/estadísticas-jugadores-club`.
   */
  private fixSpanishAccents(text: string): string {
    if (!text) return '';
    // Tokens "intocables" (URLs, rutas Angular, emails)
    const PROTECTED = /(https?:\/\/\S+)|(\/(?:dashboard|club|coach|team|shared|api|rest)\/[\S]+)|([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/gi;
    const tokens: string[] = [];
    const masked = text.replace(PROTECTED, (m) => {
      tokens.push(m);
      return `\u0000URL${tokens.length - 1}\u0000`;
    });
    let fixed = masked.replace(
      /\b([a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]+)\b/g,
      (match) => {
        const lower = match.toLowerCase();
        const replacement = this.SPANISH_ACCENT_FIX[lower];
        if (!replacement) return match;
        return this.applyCase(match, replacement);
      }
    );
    fixed = fixed.replace(/\u0000URL(\d+)\u0000/g, (_, i) => tokens[+i]);
    return fixed;
  }

  private applyCase(original: string, replacement: string): string {
    // ¿Toda en mayúsculas?
    if (original.length > 1 && original === original.toUpperCase()) {
      return replacement.toUpperCase();
    }
    // ¿Inicial mayúscula?
    if (original[0] === original[0].toUpperCase()) {
      return replacement.charAt(0).toUpperCase() + replacement.slice(1);
    }
    return replacement;
  }

  /**
   * Detecta si una línea es un "subheader" del manual: una línea cuya primera
   * frase (hasta paréntesis o ":" o "/") está enteramente en mayúsculas y
   * tiene 2+ palabras significativas. Se usan para convertir "BARRA DE
   * ACCIONES SUPERIOR (debajo del titulo)" en un `<h5>` con sentence case.
   */
  private isManualSubheader(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed) return false;
    // Excluir cabeceras de módulo (ya se renderizan como prettyHeader)
    if (/^MODULO:|^PLAYER\s*[-—]|^GU[IÍ]A/i.test(trimmed)) return false;
    // Excluir líneas que empiecen con guión (lista) o número (paso)
    if (/^[\-\*\•]/.test(trimmed) || /^\d+\.\s/.test(trimmed)) return false;
    // Excluir URLs y rutas
    if (/[\\/]/.test(trimmed) && !/^[A-ZÁÉÍÓÚÜÑ ]+:?$/.test(trimmed)) {
      // Permitir "DOS VISTAS: 'JUGADORES' Y 'CUOTAS'" pero excluir "C:/foo"
      if (/^https?:|^www\.|\/dashboard|\/club|\/coach|\/team/.test(trimmed)) {
        return false;
      }
    }
    // Tomar la primera "frase" hasta paréntesis o ":" o "—"
    const firstPart = trimmed.split(/[\(\):\-—]/)[0].trim();
    if (!firstPart) return false;
    const words = firstPart.split(/\s+/).filter(w => /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(w));
    if (words.length < 2) return false;
    // Cada palabra de 3+ letras debe estar entera en mayúsculas
    for (const word of words) {
      const letters = word.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, '');
      if (letters.length === 0) continue;
      if (letters.length >= 3 && letters !== letters.toUpperCase()) return false;
    }
    return true;
  }

  /**
   * Pre-procesa el contenido del manual para mejorar su legibilidad:
   *  - Corrige tildes y eñes castellanas.
   *  - Detecta subheaders en MAYÚSCULAS y los convierte a `### Sentence case`.
   *  - Resalta texto entre comillas con cursiva (*"X"*).
   *  - Resalta palabras de 3+ letras en MAYÚSCULAS aisladas con negrita (**X**).
   */
  private preprocessManualContent(content: string): string {
    if (!content) return '';
    // 1. Corregir tildes/eñes
    let text = this.fixSpanishAccents(content);

    // 2. Línea por línea: subheaders + enriquecimiento
    const lines = text.split('\n');
    const out: string[] = [];
    for (const rawLine of lines) {
      const trimmed = rawLine.trim();
      if (!trimmed) {
        out.push(rawLine);
        continue;
      }

      // ¿Es un subheader?
      if (this.isManualSubheader(rawLine)) {
        // Convertir a markdown h5 con prettyHeader (sentence case + acrónimos)
        // y reemplazar comillas dobles por tipográficas para mantener
        // consistencia visual con el resto del manual.
        const indent = (rawLine.match(/^\s*/) || [''])[0];
        const headerText = this.prettifyHeader(trimmed)
          .replace(/"([^"\n]{1,80}?)"/g, '«$1»');
        out.push(`${indent}### ${headerText}`);
        continue;
      }

      // Enriquecimiento de la línea
      let enriched = rawLine;
      // 2a. Texto entre comillas dobles → cursiva con comillas tipográficas
      //     "X" -> *«X»*  (más estético y resalta nombres de pantallas/botones)
      enriched = enriched.replace(
        /"([^"\n]{1,80}?)"/g,
        (_m, inner) => `*«${inner}»*`
      );
      // 2b. Palabras de 3+ letras en MAYÚSCULAS aisladas → negrita
      //     Solo si la palabra está rodeada por minúsculas o signos (para no
      //     tocar acrónimos dentro de subheaders ya convertidos).
      //     Regex simplificado para evitar backtracking ambiguo del motor.
      enriched = enriched.replace(
        /(^|[^A-ZÁÉÍÓÚÜÑ])([A-ZÁÉÍÓÚÜÑ]{3,}[A-ZÁÉÍÓÚÜÑ0-9]*)(?![A-ZÁÉÍÓÚÜÑ0-9])/g,
        (_m, prefix, word) => `${prefix}**${word}**`
      );
      out.push(enriched);
    }

    return out.join('\n');
  }

  // ── Fusión de subsecciones ────────────────────────────────────────────────

  /**
   * El backend parsea el .txt y crea una sección cada vez que aparece una
   * línea de separación "----" o "====". Eso genera muchas falsas secciones
   * intermedias (Cómo llegar, Tarjetas resumen, KPIs…). Aquí las fusionamos
   * con su módulo padre dejando un índice limpio (~25 entradas en lugar de ~110).
   *
   * Una sección es "módulo principal" si su header empieza por:
   *   - "MODULO:"            (perfil club / coach / staff)
   *   - "PLAYER - MODULO:"   (perfil padre/jugador en flutter)
   *   - "GUIA COMPLETA"      (intro general)
   *   - "COMO NAVEGAR POR SPHAIRA" (intro de navegación)
   *
   * El contenido de las subsecciones ya incluye su propio título como primera
   * línea (porque el parser de Java añade la cabecera al body), así que
   * concatenando se preserva el subheader visible.
   */
  private mergeSubsections(raw: ManualSection[]): ManualSection[] {
    if (!raw || raw.length === 0) return [];
    const merged: ManualSection[] = [];
    for (const sec of raw) {
      if (this.isPrimaryHeader(sec.header) || merged.length === 0) {
        // El parser añade la cabecera como primera línea del contenido;
        // como esa misma cabecera ya se muestra arriba (prettyHeader), la
        // quitamos para evitar el duplicado visual ("MODULO: PAGOS" + "Pagos").
        const cleaned = this.stripHeaderFromContent(sec.content, sec.header);
        merged.push({ ...sec, content: cleaned });
      } else {
        const last = merged[merged.length - 1];
        // Separamos los bloques con doble salto para que el pipe Markdown los
        // detecte como párrafos distintos.
        last.content = (last.content || '') + '\n\n' + sec.content;
      }
    }
    return merged;
  }

  /**
   * Quita la primera línea del contenido si coincide con el header (con o
   * sin tildes). Usado solo para módulos principales para evitar que la
   * cabecera aparezca duplicada arriba (titulo) y dentro (primera línea).
   */
  private stripHeaderFromContent(content: string, header: string): string {
    if (!content || !header) return content || '';
    const lines = content.split(/\r?\n/);
    while (lines.length > 0 && lines[0].trim() === '') lines.shift();
    if (lines.length === 0) return '';
    const norm = (s: string) => s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
    if (norm(lines[0]) === norm(header)) {
      lines.shift();
      while (lines.length > 0 && lines[0].trim() === '') lines.shift();
    }
    return lines.join('\n');
  }

  private isPrimaryHeader(header: string): boolean {
    if (!header) return false;
    const h = header.trim();
    return /^MODULO:/i.test(h)
        || /^PLAYER\s*[-—]\s*MODULO:/i.test(h)
        || /^GU[IÍ]A\s+COMPLETA/i.test(h)
        || /^COMO\s+NAVEGAR\s+POR\s+SPHAIRA/i.test(h);
  }

  // ── Categorización y pretty header ────────────────────────────────────────

  private categorize(header: string): string {
    if (!header) return 'inicio';
    for (const rule of this.CATEGORY_RULES) {
      if (rule.regex.test(header)) return rule.cat;
    }
    return 'inicio';
  }

  /**
   * Normaliza el casing de un header del manual.
   * - Quita prefijos como "MODULO:", "PLAYER - MODULO:", "GUIA COMPLETA…".
   * - Si el resultado está mayoritariamente en mayúsculas, lo pasa a sentence case
   *   (primera letra mayúscula, resto en minúsculas), preservando acrónimos.
   *   Ejemplo: "PAGOS (GESTION DE CUOTAS)" -> "Pagos (gestión de cuotas)".
   */
  private prettifyHeader(raw: string): string {
    if (!raw) return '';
    let h = raw.trim();
    // Eliminar prefijos comunes
    h = h.replace(/^PLAYER\s*[-—]\s*MODULO:?\s*/i, '');
    h = h.replace(/^MODULO:\s*/i, '');
    h = h.replace(/^GU[IÍ]A COMPLETA DE SPHAIRA TECH\s*[-—]?\s*PERFIL\s+CLUB\s*\(WEB\)/i, 'Guía completa: perfil club (web)');
    h = h.replace(/^GU[IÍ]A COMPLETA DE SPHAIRA TECH\s*[-—]?\s*/i, 'Guía completa: ');

    // Detectar si hay al menos una "palabra" de 3+ letras enteramente en mayúsculas
    // (cubre tanto el caso "TODO EN MAYÚSCULAS" como "TIENDA DEL CLUB (en minúsculas)").
    // Las palabras cortas de 1-2 letras (como "DE", "EL", "Y") no cuentan para evitar
    // falsos positivos en headers que sí están bien escritos.
    const hasUpperWord = /\b[A-ZÁÉÍÓÚÜÑ]{3,}\b/.test(h);

    if (hasUpperWord) {
      const ACRONYMS = ['IA', 'URL', 'PDF', 'FAB', 'KPI', 'AI', 'FCM', 'OCR', 'CRM', 'NIF', 'CIF',
                        'IBAN', 'SMS', 'HTML', 'CSS', 'API', 'ID', 'CEO', 'ROI', 'VEO', 'B2', 'XOF',
                        'CFA', 'EUR', 'USD', 'GBP', 'BRL', 'MXN', 'ARS', 'COP', 'CLP', 'PEN', 'JPY',
                        'CNY', 'TRY', 'CHF', 'MAD', 'QR', 'RPE', 'ERP'];
      // Nombres propios que deben mantener su capitalización original
      const PROPER_NOUNS = ['Sphaira', 'Stripe', 'Bizum', 'PayPal', 'Backblaze', 'Google',
                            'Apple', 'Visa', 'Mastercard', 'YouTube', 'Twitch', 'Excel',
                            'WhatsApp', 'Safari', 'Android', 'iOS'];
      // 1. Todo a minúsculas
      let s = h.toLowerCase();
      // 2. Capitalizar SOLO la primera letra de la cadena (sentence case)
      s = s.charAt(0).toUpperCase() + s.slice(1);
      // 3. Capitalizar después de ": " (separa frases en headers tipo "Foo: Bar")
      s = s.replace(/(:\s+)([a-záéíóúüñ])/g, (_, sep, c) => sep + c.toUpperCase());
      // 4. Restaurar acrónimos (palabra completa, en mayúsculas)
      for (const ac of ACRONYMS) {
        s = s.replace(new RegExp(`\\b${ac.toLowerCase()}\\b`, 'g'), ac);
      }
      // 5. Restaurar nombres propios (capitalización mixta)
      for (const pn of PROPER_NOUNS) {
        s = s.replace(new RegExp(`\\b${pn.toLowerCase()}\\b`, 'gi'), pn);
      }
      h = s;
    }

    h = h.replace(/\s+/g, ' ').trim();
    return h;
  }

  // ── Enriquecimiento HTML (callouts) ───────────────────────────────────────

  /**
   * Toma el HTML producido por MarkdownAiPipe y lo enriquece con callouts
   * visuales basándose en patrones del manual:
   *   - "Como llegar:" / "URL:" / "Para que sirve:" / "Que ves:"
   *   - "Permisos:" / "NOTA:" / "REQUISITO:" / "COMISIONES"
   *   - Listas <ol class="ai-list-ordered"> → tarjetas de pasos numerados
   *
   * Importante: en el manual lo habitual es tener varias líneas pegadas
   * dentro de un mismo `<p>` (separadas por `<br>` por el pipe Markdown),
   * por lo que aquí dividimos cada `<p>` en líneas y cada línea con su
   * propia etiqueta se convierte en un callout independiente.
   */
  private enrichManualHtml(html: string): string {
    if (!html) return '';
    let out = html;

    // Patrones "label: contenido" → callout. case-insensitive y tolerantes
    // a tildes (ej: "Cómo llegar" o "Como llegar").
    const PATTERNS: { regex: RegExp; type: string; icon: string; label: string }[] = [
      { regex: /^(C[oó]mo llegar)\s*:\s*/i,          type: 'route',       icon: 'bi-signpost-2',           label: 'Cómo llegar' },
      { regex: /^URL\s*:\s*/i,                       type: 'url',         icon: 'bi-link-45deg',           label: 'URL' },
      { regex: /^(Para qu[eé] sirve)\s*:\s*/i,       type: 'purpose',     icon: 'bi-lightbulb',            label: 'Para qué sirve' },
      { regex: /^(Qu[eé] ves)\s*:\s*/i,              type: 'see',         icon: 'bi-eye',                  label: 'Qué ves' },
      { regex: /^Permisos\s*:?\s*/i,                 type: 'permissions', icon: 'bi-shield-lock',          label: 'Permisos' },
      { regex: /^Nota\s*:\s*/i,                      type: 'note',        icon: 'bi-info-circle',          label: 'Nota' },
      { regex: /^Requisito(\s+para\s+cobrar)?\s*:?\s*/i, type: 'warning', icon: 'bi-exclamation-triangle', label: 'Requisito' },
      { regex: /^Comisiones(\s*\(.*?\))?\s*:?\s*/i,  type: 'highlight',   icon: 'bi-cash-coin',            label: 'Comisiones' },
    ];

    // 1) Procesar cada <p class="ai-p">. Si contiene varias líneas (separadas
    //    por <br>), tratarlas individualmente y extraer las que empiecen por
    //    una etiqueta de callout.
    out = out.replace(
      /<p class="ai-p">([\s\S]*?)<\/p>/g,
      (_full: string, inner: string) => {
        const lines = inner
          .split(/<br\s*\/?>/i)
          .map(l => l.trim())
          .filter(l => l.length > 0);
        if (lines.length === 0) return '';

        const out2: string[] = [];
        let buffer: string[] = [];

        const flushBuffer = () => {
          if (buffer.length === 0) return;
          out2.push(`<p class="ai-p">${buffer.join('<br>')}</p>`);
          buffer = [];
        };

        for (const line of lines) {
          let matched = false;
          for (const p of PATTERNS) {
            if (p.regex.test(line)) {
              flushBuffer();
              const cleaned = line.replace(p.regex, '').trim();
              out2.push(
                `<div class="callout callout-${p.type}">`
                + `<div class="callout-icon"><i class="bi ${p.icon}"></i></div>`
                + `<div class="callout-body">`
                + `<div class="callout-label">${p.label}</div>`
                + `<div class="callout-content">${cleaned}</div>`
                + `</div></div>`
              );
              matched = true;
              break;
            }
          }
          if (!matched) buffer.push(line);
        }
        flushBuffer();
        return out2.join('\n');
      }
    );

    // 2) Listas ordenadas → tarjetas de pasos numerados.
    out = out.replace(
      /<ol class="ai-list ai-list-ordered">([\s\S]*?)<\/ol>/g,
      (_: string, inner: string) => {
        const items = inner.match(/<li[\s\S]*?<\/li>/g) || [];
        if (items.length < 2) {
          return `<ol class="ai-list ai-list-ordered">${inner}</ol>`;
        }
        const cards = items
          .map((li, i) => {
            const body = li.replace(/^<li[^>]*>/, '').replace(/<\/li>$/, '');
            return `<li class="step-card">`
                 + `<span class="step-num">${i + 1}</span>`
                 + `<span class="step-body">${body}</span>`
                 + `</li>`;
          })
          .join('');
        return `<ol class="step-list">${cards}</ol>`;
      }
    );

    return out;
  }

  // ── Lunr search ───────────────────────────────────────────────────────────

  private buildLunrIndex(): void {
    const sections = this.sections;
    try {
      this.lunrIndex = lunr(function (this: lunr.Builder) {
        this.ref('slug');
        this.field('header', { boost: 10 });
        this.field('content');
        for (const sec of sections) {
          this.add({ slug: sec.slug, header: sec.header, content: sec.content });
        }
      });
    } catch (err) {
      console.warn('[Ayuda] No se pudo construir el índice Lunr:', err);
      this.lunrIndex = null;
    }
  }

  onSearchChange(value: string): void {
    this.searchQuery = value;
    const q = value.trim();
    if (!q) {
      this.searchHits = [];
      this.cdr.markForCheck();
      return;
    }

    if (this.lunrIndex) {
      try {
        const cleaned = q.replace(/[~^*:+\-]/g, ' ').trim();
        if (cleaned.length === 0) {
          this.searchHits = [];
          this.cdr.markForCheck();
          return;
        }
        const tokens = cleaned.split(/\s+/).filter(t => t.length > 0);
        const queryStr = tokens.map(t => `${t}* ${t}~1`).join(' ');
        const results = this.lunrIndex.search(queryStr);
        if (results.length > 0) {
          this.searchHits = results
            .slice(0, 20)
            .map((r: lunr.Index.Result) => {
              const sec = this.sections.find(s => s.slug === r.ref);
              if (!sec) return null;
              return {
                slug: sec.slug,
                header: sec.prettyHeader,
                snippet: this.buildSnippet(sec.content, tokens[0])
              } as SearchHit;
            })
            .filter((x): x is SearchHit => x !== null);
          this.cdr.markForCheck();
          return;
        }
      } catch {
        // Si la consulta es inválida (p.ej. solo símbolos), caemos al fallback
      }
    }

    const lower = q.toLowerCase();
    this.searchHits = this.sections
      .map(s => {
        const headerHit = s.header.toLowerCase().includes(lower)
          || s.prettyHeader.toLowerCase().includes(lower);
        const idx = s.content.toLowerCase().indexOf(lower);
        if (!headerHit && idx === -1) return null;
        return {
          slug: s.slug,
          header: s.prettyHeader,
          snippet: this.buildSnippet(s.content, q)
        } as SearchHit;
      })
      .filter((x): x is SearchHit => x !== null)
      .slice(0, 20);
    this.cdr.markForCheck();
  }

  private buildSnippet(content: string, term: string): string {
    const lower = content.toLowerCase();
    const idx = lower.indexOf(term.toLowerCase());
    const cleaned = content.replace(/\s+/g, ' ');
    if (idx === -1) {
      return this.truncate(cleaned, 110);
    }
    const cleanIdx = lower.replace(/\s+/g, ' ').indexOf(term.toLowerCase());
    const start = Math.max(0, cleanIdx - 35);
    const end = Math.min(cleaned.length, cleanIdx + term.length + 70);
    const prefix = start > 0 ? '…' : '';
    const suffix = end < cleaned.length ? '…' : '';
    return prefix + cleaned.substring(start, end) + suffix;
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchHits = [];
    this.cdr.markForCheck();
  }

  // ── Navegación ────────────────────────────────────────────────────────────

  scrollToSlug(slug: string, updateUrl: boolean = true): void {
    const el = document.getElementById('section-' + slug);
    if (el) {
      // Asegura que la categoría correspondiente esté abierta en el sidebar
      const sec = this.sections.find(s => s.slug === slug);
      if (sec) {
        const grp = this.groups.find(g => g.id === sec.categoryId);
        if (grp && !grp.expanded) {
          grp.expanded = true;
        }
      }
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      this.activeSlug = slug;
    }
    if (updateUrl) {
      this.router.navigate([], { fragment: slug, relativeTo: this.route });
    }
    this.sidebarMobileOpen = false;
    this.cdr.markForCheck();
  }

  /** Hace scroll al primer módulo de una categoría (desde tarjeta del hero) */
  scrollToCategory(catId: string): void {
    const grp = this.groups.find(g => g.id === catId);
    if (!grp || grp.sections.length === 0) return;
    grp.expanded = true;
    this.scrollToSlug(grp.sections[0].slug);
  }

  toggleGroup(catId: string): void {
    const grp = this.groups.find(g => g.id === catId);
    if (!grp) return;
    grp.expanded = !grp.expanded;
    this.cdr.markForCheck();
  }

  scrollToTop(): void {
    const el = this.contentScrollRef?.nativeElement;
    if (el) {
      el.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /** Listener del scroll del contenido para mostrar/ocultar el botón "volver arriba" */
  onContentScroll(ev: Event): void {
    const el = ev.target as HTMLElement;
    const next = el.scrollTop > 400;
    if (next !== this.showBackToTop) {
      this.showBackToTop = next;
      this.cdr.markForCheck();
    }
  }

  /** Devuelve el grupo de la sección activa (para el breadcrumb) */
  get activeGroup(): CategoryGroup | undefined {
    if (!this.activeCategoryId) return undefined;
    return this.groups.find(g => g.id === this.activeCategoryId);
  }

  /** Devuelve el header bonito de la sección activa */
  get activeSectionHeader(): string {
    const sec = this.sections.find(s => s.slug === this.activeSlug);
    return sec?.prettyHeader || '';
  }

  /**
   * Abre el HelpFab con una pregunta pre-rellenada sobre esta sección.
   * Usa un CustomEvent global para desacoplarse del componente FAB; el FAB
   * lo escucha en window y se abre con el texto pre-cargado.
   */
  askAboutSection(s: RenderedSection): void {
    const question = this.translate.instant('AYUDA.ASK_ABOUT', { topic: s.prettyHeader || s.header });
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(HELP_FAB_OPEN_EVENT, {
      detail: { question, slug: s.slug }
    }));
  }

  /**
   * Configura un IntersectionObserver para detectar qué sección está visible
   * en el viewport y actualizar el resaltado del índice del sidebar y el breadcrumb.
   */
  private setupSectionObserver(): void {
    this.observer?.disconnect();
    if (typeof IntersectionObserver === 'undefined') return;

    const root = this.contentScrollRef?.nativeElement || null;
    this.observer = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length === 0) return;
        const top = visible.reduce((a, b) =>
          a.boundingClientRect.top < b.boundingClientRect.top ? a : b);
        const id = top.target.getAttribute('id') || '';
        if (id.startsWith('section-')) {
          const slug = id.substring('section-'.length);
          if (slug !== this.activeSlug) {
            this.activeSlug = slug;
            const sec = this.sections.find(s => s.slug === slug);
            this.activeCategoryId = sec?.categoryId || '';
            this.cdr.markForCheck();
          }
        }
      },
      { root, rootMargin: '-20% 0% -65% 0%', threshold: 0 }
    );

    document.querySelectorAll('[id^="section-"]').forEach(el => {
      this.observer!.observe(el);
    });
  }

  toggleSidebar(): void {
    this.sidebarMobileOpen = !this.sidebarMobileOpen;
    this.cdr.markForCheck();
  }

  trackSlug(_idx: number, item: { slug: string }): string {
    return item.slug;
  }

  trackCat(_idx: number, item: { id: string }): string {
    return item.id;
  }

  /** Cierra el sidebar móvil al hacer click fuera */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.sidebarMobileOpen) {
      this.sidebarMobileOpen = false;
      this.cdr.markForCheck();
    }
  }

  private truncate(s: string, n: number): string {
    if (!s) return '';
    return s.length > n ? s.substring(0, n) + '…' : s;
  }
}
