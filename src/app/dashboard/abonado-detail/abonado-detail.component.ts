import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { AbonadoEstadoModalComponent } from 'src/app/shared/abonado-estado-modal/abonado-estado-modal.component';
import { AccessHistoryCardComponent } from 'src/app/dashboard/access-history-card/access-history-card.component';
import { CarnetTabComponent } from './components/carnet-tab/carnet-tab.component';
import { ComunicacionesTabComponent } from './components/comunicaciones-tab/comunicaciones-tab.component';
import { DocumentosTabComponent } from './components/documentos-tab/documentos-tab.component';
import { FamiliaresTabComponent } from './components/familiares-tab/familiares-tab.component';
import {
  AbonadoActividad,
  AbonadoComunicacion,
  AbonadoDetailResponse,
  AbonadoDetailService,
  AbonadoDocumento,
  AbonadoExtendido,
  AbonadoFamiliar,
  AbonadoPagoSummary,
  AbonadosTemporadaSummary,
} from 'src/app/core/services/abonado-detail/abonado-detail.service';
import { ClubService } from 'src/app/core/services/club/club.service';
import { ClubAbonadoFormService } from 'src/app/core/services/club-abonado-form/club-abonado-form.service';
import {
  AbonadoFormField,
  AbonadoFormFieldType,
  AbonadoFormSchema,
  AbonadoFormSectionId,
} from 'src/app/core/services/club-abonado-form/club-abonado-form.model';
import { MenuPermissionService } from 'src/app/core/services/menu-permission/menu-permission.service';
import { ClubModulesService } from 'src/app/core/services/club/club-modules.service';
import { AbonadoPagoHistorico } from 'src/app/core/services/models/club.model';
import { Response } from 'src/app/core/services/models/response.model';
import { NotificationService } from 'src/app/core/services/notification/notification.service';
import { environment } from 'src/environments/environment';

type DetailTab = 'datos' | 'pagos' | 'documentos' | 'comunicaciones' | 'familiares' | 'actividad' | 'carnet';

/**
 * Resumen por concepto que devuelve
 * {@code GET /club/abonado/{atId}/conceptos}. Cada elemento es una
 * cuota (pago_clubes con audiencia=1) asignada al abonado. El modal
 * "Registrar pago" usa esta lista para que el club elija a qué
 * cuota se asocia el cobro.
 */
interface AbonadoConceptoPendiente {
  pagoClubId: number;
  nombre: string | null;
  importe: number;
  restante: number;
  totalPagado: number;
  estado: number;
  ultimoPago: string | null;
  numMovimientos: number;
}

/**
 * Campo "custom" del formulario del club, pre-procesado para
 * renderizado en el bloque "Extras del club" del detalle. Solo se
 * incluyen aquí los campos del schema que NO tienen binding canónico
 * (los que solo viven en `answers_json`). Los demás ya tienen su
 * columna real pintada en los bloques estáticos.
 */
interface CustomExtraField {
  id: string;
  type: AbonadoFormFieldType;
  label: string;
  text?: string;
  placeholder?: string;
  options: string[];
  sectionId: AbonadoFormSectionId;
  fileUrl?: string;
  fileName?: string;
}

// Los catálogos FAMILIAR_RELATIONS y ABONADO_DOC_TYPES viven ahora en
// sus componentes de pestaña (familiares-tab y documentos-tab), que son
// los únicos consumidores. Se duplican allí (en vez de importarse desde
// aquí) para evitar una dependencia circular padre ↔ hijo.

/**
 * Pantalla de detalle de un abonado (Sphaira Adhoc para asociaciones,
 * tenis, federaciones). Sustituye al modal de edición clásico cuando el
 * usuario quiere ver TODO sobre un socio: datos personales completos,
 * dirección, contacto de emergencia, número de socio, notas internas,
 * historial de pagos, etc.
 *
 * Diseño:
 *   - Header con avatar grande + nombre + número socio + badges de estado.
 *   - Si el abonado está pendiente (estado=2) muestra un BANNER naranja
 *     con botones Aprobar / Rechazar grandes (también se muestran en la
 *     tabla, pero aquí dan más contexto).
 *   - Tabs: "Datos personales" + "Pagos" (PR1).
 *     Próximas tabs: Documentos, Comunicaciones, Familiares,
 *     Actividad, Carnet/QR (PRs 2-4).
 *
 * Autosave: cada campo tiene un (ngModelChange) que dispara un PATCH
 * parcial (con debounce de 600ms para evitar saturar el backend). No hay
 * botón Guardar.
 */
@Component({
  selector: 'app-abonado-detail',
  templateUrl: './abonado-detail.component.html',
  styleUrls: ['./abonado-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AbonadoDetailComponent implements OnInit, OnDestroy {
  clubId = 0;
  abonadoId = 0;

  loading = true;
  saving = false;
  error = false;

  /**
   * Flag rellenado en {@code ngOnInit} a partir de
   * {@code ClubModulesService.getModules}. Sólo si está {@code true}
   * renderizamos la card de historial de accesos.
   */
  accessControlEnabled = false;

  abonado: AbonadoExtendido | null = null;
  abonadosTemporada: AbonadosTemporadaSummary | null = null;
  historicoPagos: AbonadoPagoSummary[] = [];

  /**
   * Flag explícito del club {@code uses_seasonal_subs} recibido en el
   * payload de {@code getDetail}. Es la señal preferida para decidir
   * si el club opera en modo seasonal (1) o ad-hoc (0). Si el backend
   * no lo envía (legacy) cae al heurístico {@link seasonsEnabled} basado
   * en menús ad-hoc, que se mantiene como fallback.
   */
  private clubUsesSeasonalSubs: number | null = null;

  activeTab: DetailTab = 'datos';

  /**
   * Modo edición de la pestaña "Datos personales". Desde el rediseño
   * 2026-05-25 los campos están SIEMPRE editables: el botón
   * "Editar" / "Hecho" se ha retirado y la ficha se muestra
   * directamente como formulario, sin paso intermedio de "lectura".
   * El autosave por campo (debounce 600ms) sigue activo.
   *
   * Los métodos {@link enterEditMode} y {@link exitEditMode} se
   * conservan por compatibilidad con código que pudiera invocarlos,
   * pero la flag se queda fija en `true` en la práctica.
   *
   * La clase CSS `tab-panel--readonly` ya no se aplica al contenedor
   * (no se pinta ningún estado de solo-lectura) y la guarda
   * defensiva en {@link onFieldChange} sigue ahí por si volviera a
   * activarse el modo en el futuro.
   */
  editingPersonal = true;

  /** Indica que se ha guardado un cambio recientemente (toast verde sticky). */
  recentlySavedField: string | null = null;
  private savedFlagTimer?: any;

  /**
   * Indica si el club tiene al menos un concepto de pago en el catálogo
   * de cuotas con `audiencia=ABONADOS` (lo que se gestiona en
   * `/dashboard/new-cuotas/{clubId}` → pestaña Abonados → "Añadir pago").
   *
   * Cuando el club aún no ha creado ningún pago para abonados, no tiene
   * sentido permitir registrar un movimiento aquí, porque el cobro queda
   * huérfano del catálogo y nunca aparecerá en el modal "Gestión de
   * pagos" del club. Por eso el botón "Registrar pago" se deshabilita
   * y se muestra un tooltip que invita a crear primero un pago en
   * Cuotas. La verificación se ejecuta al cargar el detalle (lazy: solo
   * pegamos al endpoint si tenemos {@link abonadosTemporada} con
   * temporada definida).
   *
   * Estados:
   *   - `null`: aún no se ha podido determinar (carga en vuelo o error
   *             de red). Defensa: NO bloqueamos por defecto, mejor
   *             permitir el click y que el backend falle gracefully.
   *   - `true`: el club sí tiene catálogo → permitir registrar pagos.
   *   - `false`: confirmado que no hay catálogo → bloquear botón y
   *              mostrar mensaje explicativo.
   */
  clubHasAbonadoPaymentsCatalog: boolean | null = null;

  /**
   * Modelo del modal "Registrar pago" (mismo flujo que el modal antiguo,
   * pero más limpio). Cuando se abre, se inicializa con la cuota
   * pendiente.
   */
  showPaymentModal = false;
  pagoTipo: 'Pagado' | 'Reembolso' = 'Pagado';
  pagoCantidad = 0;
  pagoFecha = '';
  pagoMetodo: string = 'Tarjeta';
  pagoComentario = '';

  /**
   * Cuotas (conceptos de pago con audiencia=1) que el abonado todavía
   * tiene pendientes de pagar. Se cargan del endpoint
   * `getConceptosPorAbonado` al abrir el modal "Registrar pago" y se
   * filtran a las que tienen `restante > 0` (no incluimos las ya
   * pagadas para evitar registrar movimientos sobre cuotas saldadas).
   */
  cuotasPendientes: AbonadoConceptoPendiente[] = [];
  /** Indica si el listado de cuotas pendientes está siendo cargado. */
  cuotasPendientesLoading = false;
  /**
   * ID del concepto seleccionado en el modal. `null` significa "pago
   * suelto" — el cobro se registra sin asociar a un concepto concreto
   * (caso de uso: cobros excepcionales fuera del calendario de cuotas).
   */
  pagoClubIdSeleccionado: number | null = null;
  pagoSaving = false;

  // -------- Pestañas extraídas a componentes hijos --------
  // La lógica de las pestañas Documentos, Comunicaciones, Familiares y
  // Carnet vive en components/{documentos,comunicaciones,familiares,carnet}-tab.
  // El padre solo conserva los listados como CACHÉ compartida vía two-way
  // binding: alimentan los contadores de los tabs y evitan repetir la
  // llamada HTTP cuando el usuario vuelve a entrar a una pestaña ya
  // visitada (mismo lazy load que hacía setActiveTab antes de la extracción).

  /** Documentos personales del abonado (caché para el badge del tab). */
  documentos: AbonadoDocumento[] = [];
  /** Documentos requeridos por el club al abonado (Bloque 8 / Fase 2). */
  clubDocs: any[] = [];
  /** Comunicaciones enviadas (caché para el badge del tab). */
  comunicaciones: AbonadoComunicacion[] = [];
  /** Familiares vinculados (caché para el badge del tab). */
  familiares: AbonadoFamiliar[] = [];

  /**
   * Referencia al hijo de la pestaña Carnet (solo existe mientras la
   * pestaña está activa). Se usa para refrescar la foto del carnet tras
   * subir un avatar desde la cabecera, igual que cuando todo vivía en
   * este componente.
   */
  @ViewChild(CarnetTabComponent) private carnetTab?: CarnetTabComponent;

  // -------- Pestaña Actividad (PR3) --------
  actividad: AbonadoActividad[] = [];
  actividadLoading = false;

  // -------- Histórico de cambios de estado (Bloque 6) --------
  /** Filas del histórico ordenadas (la primera es la más reciente). */
  estadoHistorico: import('src/app/core/services/abonado-detail/abonado-detail.service').AbonadoEstadoHistorico[] = [];
  estadoHistoricoLoading = false;

  /** Prefijo de las imágenes de avatar de abonados (servidas por el
   *  servidor de imágenes — ver `environment.images`). Necesario para
   *  pintar la foto del socio en el header del detalle: el backend
   *  almacena solo el nombre del fichero en `imgPerfil`. */
  readonly abonadoImageBase = environment.images + 'abonado/';

  /** Sujeto por nombre de campo que pasa por un debounce antes del PATCH. */
  private patchSubjects: Record<string, Subject<{ field: keyof AbonadoExtendido; value: any }>> = {};
  private subs = new Subscription();
  private destroy$ = new Subject<void>();

  // ── Bloque dinámico "Extras del club" ──────────────────────────
  /** Campos custom (sin binding canónico) extraídos del schema activo del club. */
  customExtraFields: CustomExtraField[] = [];
  /** Answers actuales del abonado por sección → fieldId → valor. */
  customAnswers: Record<string, Record<string, unknown>> = {};
  /** Sujeto único de autosave del bloque dinámico (debounce 500ms). */
  private customAnswersSave$ = new Subject<void>();
  /** Marca para evitar persistir respuestas antes de haber cargado las del backend. */
  private customLoaded = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private detailService: AbonadoDetailService,
    private clubService: ClubService,
    private clubAbonadoFormService: ClubAbonadoFormService,
    private notification: NotificationService,
    private menuPermission: MenuPermissionService,
    private clubModulesService: ClubModulesService,
  ) {}

  ngOnInit(): void {
    // IMPORTANTE: nos suscribimos a `paramMap` (no `snapshot`) para que
    // al navegar entre fichas dentro del MISMO componente (p.ej. abrir
    // la ficha de un familiar enlazado desde la pestaña "Familiares"),
    // Angular reutilice la instancia pero recarguemos los datos del
    // nuevo abonadoId. Sin esto el botón "Abrir ficha" parecía no hacer
    // nada porque la URL cambiaba pero el componente seguía mostrando
    // el abonado original.
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const nextClubId = Number(params.get('clubId')) || 0;
        const nextAbonadoId = Number(params.get('abonadoId')) || 0;
        const changed = nextAbonadoId !== this.abonadoId || nextClubId !== this.clubId;
        this.clubId = nextClubId;
        this.abonadoId = nextAbonadoId;
        if (changed) {
          this.resetTabState();
          this.loadDetail();
        }
      });
  }

  /**
   * Limpia el estado cacheado de las pestañas lazy cuando el usuario
   * navega de una ficha a otra dentro del mismo componente. Sin esto,
   * `setActiveTab` ve `familiares.length > 0` (del abonado anterior) y
   * no vuelve a llamar a `loadFamiliares`, mostrando datos cruzados.
   */
  private resetTabState(): void {
    // Cancelamos peticiones in-flight del abonado anterior. La
    // suscripción a paramMap (que vive en destroy$) NO se ve afectada.
    this.subs.unsubscribe();
    this.subs = new Subscription();
    this.activeTab = 'datos';
    // Las cachés de las pestañas extraídas se vacían para que los hijos
    // recarguen los datos del nuevo abonado en su ngOnInit. Los flags de
    // loading y el carnet viven ahora dentro de cada hijo, que se
    // destruye al cambiar de pestaña: no hay nada más que resetear aquí.
    this.documentos = [];
    this.comunicaciones = [];
    this.familiares = [];
    this.actividad = [];
    this.estadoHistorico = [];
    this.error = false;
    this.customExtraFields = [];
    this.customAnswers = {};
    this.customLoaded = false;
    this.clubUsesSeasonalSubs = null;
    // La ficha siempre se muestra en modo edición desde el rediseño
    // 2026-05-25 (sin botón Editar/Hecho).
    this.editingPersonal = true;
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
    if (this.savedFlagTimer) clearTimeout(this.savedFlagTimer);
  }

  /* ─────────────── carga inicial ─────────────── */

  loadDetail(): void {
    if (!this.clubId || !this.abonadoId) {
      this.error = true;
      this.loading = false;
      return;
    }
    this.loading = true;
    this.subs.add(
      this.detailService.getDetail(this.abonadoId, this.clubId).subscribe({
        next: (resp: Response) => {
          const data = resp?.data as AbonadoDetailResponse | null;
          if (!data || !data.abonado) {
            this.error = true;
          } else {
            this.abonado = data.abonado;
            this.abonadosTemporada = data.abonadosTemporada ?? null;
            this.historicoPagos = data.historicoPagos || [];
            // Guardamos el flag explícito del club. Sólo lo aplica
            // {@link seasonsEnabled} si el backend lo envió (clubes
            // legacy sin esta clave caen al heurístico de menús).
            this.clubUsesSeasonalSubs = data.usesSeasonalSubs == null
              ? null : Number(data.usesSeasonalSubs);
            // Verificamos si el club tiene catálogo de pagos para
            // audiencia=ABONADOS. Si no, "Registrar pago" se
            // deshabilita y se invita al usuario a crear primero un
            // pago en Cuotas → Abonados.
            this.loadClubAbonadoPaymentsCatalog();
          }
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.error = true;
          this.loading = false;
          this.cdr.markForCheck();
        },
      }),
    );

    // Comprobamos si el club tiene el módulo Control de accesos activo
    // para mostrar (o no) la card de historial de accesos.
    this.subs.add(
      this.clubModulesService.getModules(this.clubId).subscribe({
        next: (m) => {
          this.accessControlEnabled = !!m?.accessControlEnabled;
          this.cdr.markForCheck();
        },
        error: () => { this.accessControlEnabled = false; },
      }),
    );

    // Carga del bloque dinámico "Extras del club": schema activo + answers
    // vigentes del abonado en paralelo. Fallos silenciosos: el bloque
    // simplemente no se pinta si el club no tiene formulario activo o
    // si las dos llamadas fallan.
    this.loadCustomExtrasBlock();
  }

  /**
   * Carga schema activo + answers del abonado para pintar el bloque
   * "Extras del club" en la pestaña "Datos personales". Solo expone los
   * campos del schema que NO tienen binding canónico (los que viven en
   * `answers_json`); el resto ya están pintados en los bloques estáticos.
   */
  private loadCustomExtrasBlock(): void {
    if (!this.clubId || !this.abonadoId) return;
    this.subs.add(
      this.clubAbonadoFormService.getAdminTemplate(this.clubId).subscribe({
        next: (template) => {
          const schema: AbonadoFormSchema | null = template?.schema ?? null;
          this.customExtraFields = schema ? this.extractCustomFields(schema) : [];
          this.cdr.markForCheck();
        },
        error: () => {
          this.customExtraFields = [];
          this.cdr.markForCheck();
        },
      }),
    );
    this.subs.add(
      this.clubAbonadoFormService.getResponse(this.clubId, this.abonadoId).subscribe({
        next: (resp) => {
          const answers = resp?.answers as Record<string, Record<string, unknown>> | undefined;
          this.customAnswers = answers ? this.cloneAnswers(answers) : {};
          this.customLoaded = true;
          this.cdr.markForCheck();
        },
        error: () => {
          this.customAnswers = {};
          this.customLoaded = true;
          this.cdr.markForCheck();
        },
      }),
    );

    // Persistencia con debounce: cualquier cambio en el bloque dinámico
    // dispara este Subject; tras 500ms sin más cambios se manda un PUT
    // con el objeto answers completo (mergeando con lo cargado).
    this.subs.add(
      this.customAnswersSave$
        .pipe(debounceTime(500), takeUntil(this.destroy$))
        .subscribe(() => this.persistCustomAnswers()),
    );
  }

  /**
   * Filtra los campos del schema activo del club y se queda solo con
   * los que NO tienen binding canónico. Los demás ya tienen columna real
   * y se pintan en los bloques estáticos de "Datos personales".
   */
  private extractCustomFields(schema: AbonadoFormSchema): CustomExtraField[] {
    const out: CustomExtraField[] = [];
    for (const sec of schema.sections || []) {
      for (const f of sec.fields || []) {
        if (f.binding) continue;
        out.push(this.toCustomField(f, sec.id));
      }
    }
    return out;
  }

  private toCustomField(f: AbonadoFormField, sectionId: AbonadoFormSectionId): CustomExtraField {
    return {
      id: f.id,
      type: f.type,
      label: f.label || f.id,
      text: f.text,
      options: f.options || [],
      sectionId,
      fileUrl: f.fileUrl,
      fileName: f.fileName,
    };
  }

  /** Clona shallow las answers para edición local sin mutar la respuesta. */
  private cloneAnswers(src: Record<string, Record<string, unknown>>): Record<string, Record<string, unknown>> {
    const out: Record<string, Record<string, unknown>> = {};
    for (const k of Object.keys(src)) {
      const sec = src[k];
      out[k] = sec && typeof sec === 'object' ? { ...sec } : {};
    }
    return out;
  }

  /**
   * Handler de cualquier campo del bloque "Extras del club".
   * Actualiza el valor en memoria y dispara el autosave con debounce.
   *
   * <p>Igual que {@link onFieldChange}, ignora los cambios si la
   * pestaña está en modo lectura para que el bloque dinámico respete
   * el mismo toggle vista ↔ edición que el resto de la pantalla.</p>
   */
  onCustomFieldChange(field: CustomExtraField, value: unknown): void {
    if (!this.customLoaded) return;
    if (!this.editingPersonal) return;
    if (!this.customAnswers[field.sectionId]) this.customAnswers[field.sectionId] = {};
    this.customAnswers[field.sectionId][field.id] = value === '' ? null : value;
    this.customAnswersSave$.next();
  }

  /** Devuelve si una opción de un `multi_check` custom está seleccionada. */
  isCustomMultiSelected(field: CustomExtraField, option: string): boolean {
    const v = this.customAnswers[field.sectionId]?.[field.id];
    return Array.isArray(v) && (v as unknown[]).includes(option);
  }

  /** Toggle de una opción dentro de un `multi_check` custom. */
  toggleCustomMulti(field: CustomExtraField, option: string, checked: boolean): void {
    if (!this.customLoaded) return;
    if (!this.editingPersonal) return;
    if (!this.customAnswers[field.sectionId]) this.customAnswers[field.sectionId] = {};
    const current = this.customAnswers[field.sectionId][field.id];
    const arr: string[] = Array.isArray(current) ? [...(current as string[])] : [];
    const idx = arr.indexOf(option);
    if (checked && idx === -1) arr.push(option);
    if (!checked && idx >= 0) arr.splice(idx, 1);
    this.customAnswers[field.sectionId][field.id] = arr;
    this.customAnswersSave$.next();
  }

  trackByCustomFieldId(_: number, f: CustomExtraField): string {
    return f.sectionId + ':' + f.id;
  }

  /**
   * Persiste las answers vigentes del bloque dinámico contra el
   * backend. Llamada con debounce desde {@link onCustomFieldChange}.
   */
  private persistCustomAnswers(): void {
    if (!this.clubId || !this.abonadoId) return;
    this.saving = true;
    this.cdr.markForCheck();
    this.subs.add(
      this.clubAbonadoFormService
        .updateResponse(this.clubId, this.abonadoId, this.customAnswers)
        .subscribe({
          next: () => {
            this.saving = false;
            this.recentlySavedField = 'customExtras';
            if (this.savedFlagTimer) clearTimeout(this.savedFlagTimer);
            this.savedFlagTimer = setTimeout(() => {
              this.recentlySavedField = null;
              this.cdr.markForCheck();
            }, 2000);
            this.cdr.markForCheck();
          },
          error: () => {
            this.saving = false;
            this.notification.error('SUBS.DETAIL.SAVE_ERROR');
            this.cdr.markForCheck();
          },
        }),
    );
  }

  /* ─────────────── autosave ─────────────── */

  /**
   * Hook que dispara cada campo del template al cambiar.
   * Aplica el valor en el modelo en memoria y dispara un PATCH con
   * debounce para no saturar el backend.
   *
   * <p>Si la pestaña está en modo lectura ({@link editingPersonal} = false)
   * el método ignora silenciosamente el cambio: es una defensa
   * adicional al CSS que ya bloquea {@code pointer-events} sobre los
   * inputs en modo lectura. Cubre casos raros (lector de pantalla con
   * teclado, autocompletado del navegador) donde podría llegar a
   * dispararse un ngModelChange sin que el usuario lo viera.</p>
   */
  onFieldChange(field: keyof AbonadoExtendido, value: any): void {
    if (!this.abonado) return;
    if (!this.editingPersonal) return;
    (this.abonado as any)[field] = value;
    if (!this.patchSubjects[field as string]) {
      this.patchSubjects[field as string] = new Subject<{ field: keyof AbonadoExtendido; value: any }>();
      this.patchSubjects[field as string]
        .pipe(debounceTime(600), takeUntil(this.destroy$))
        .subscribe(({ field: f, value: v }) => this.persistField(f, v));
    }
    this.patchSubjects[field as string].next({ field, value });
  }

  private persistField(field: keyof AbonadoExtendido, value: any): void {
    if (!this.abonado) return;
    this.saving = true;
    this.cdr.markForCheck();
    const patch: any = {};
    patch[field as string] = value === '' ? null : value;
    this.subs.add(
      this.detailService.patchAbonado(this.abonadoId, patch).subscribe({
        next: () => {
          this.saving = false;
          this.recentlySavedField = field as string;
          if (this.savedFlagTimer) clearTimeout(this.savedFlagTimer);
          this.savedFlagTimer = setTimeout(() => {
            this.recentlySavedField = null;
            this.cdr.markForCheck();
          }, 1500);
          this.cdr.markForCheck();
        },
        error: () => {
          this.saving = false;
          this.notification.error('SUBS.DETAIL.SAVE_ERROR');
          this.cdr.markForCheck();
        },
      }),
    );
  }

  /* ─────────────── toggle vista ↔ edición (pestaña Datos) ─────────────── */

  /**
   * Activa el modo edición de la pestaña "Datos personales". Los
   * inputs/selects pasan a apariencia editable y vuelven a aceptar
   * cambios (autosave por campo con debounce ya existente).
   */
  enterEditMode(): void {
    this.editingPersonal = true;
    this.cdr.markForCheck();
  }

  /**
   * Sale del modo edición y vuelve a la vista de lectura. No descarta
   * cambios: el autosave ya los persistió a medida que se editaban
   * (debounce 600ms). Si el usuario sale rápido tras escribir, el
   * último PATCH puede quedar in-flight: es benigno y se completa de
   * forma asíncrona; el campo {@link recentlySavedField} reflejará el
   * resultado en el banner verde habitual.
   */
  exitEditMode(): void {
    this.editingPersonal = false;
    this.cdr.markForCheck();
  }

  /* ─────────────── banner pendiente ─────────────── */

  isPending(): boolean {
    return this.abonado?.estado === 2;
  }

  isAutoRegistered(): boolean {
    return !!this.abonado?.userId;
  }

  // ── Modal de cambio de estado con motivo opcional (Bloque 6) ──
  estadoModalAction: 'approve' | 'reject' | 'deactivate' | 'reactivate' = 'approve';
  estadoModalOpen = false;

  approve(): void {
    if (!this.abonado) return;
    this.estadoModalAction = 'approve';
    this.estadoModalOpen = true;
    // Con OnPush + wrapper *ngIf, markForCheck() no garantiza el render
    // inmediato del modal. detectChanges() fuerza el re-render síncrono.
    this.cdr.detectChanges();
  }

  reject(): void {
    if (!this.abonado) return;
    // Si el abonado YA estaba activo, la acción real es "dar de baja";
    // si estaba pendiente (estado=2), es "rechazo de registro". El modal
    // ajusta el copy en función del action elegido.
    this.estadoModalAction = this.abonado.estado === 2 ? 'reject' : 'deactivate';
    this.estadoModalOpen = true;
    this.cdr.detectChanges();
  }

  reactivate(): void {
    if (!this.abonado) return;
    this.estadoModalAction = 'reactivate';
    this.estadoModalOpen = true;
    this.cdr.detectChanges();
  }

  /** Cancelación del modal sin guardar. */
  cancelEstadoModal(): void {
    if (this.saving) return;
    this.estadoModalOpen = false;
    this.cdr.detectChanges();
  }

  /** El modal devuelve el motivo (puede ser ''). Disparamos la actualización. */
  onEstadoModalConfirm(motivo: string): void {
    const nuevo = (this.estadoModalAction === 'approve' || this.estadoModalAction === 'reactivate') ? 1 : 0;
    this.changeEstado(nuevo, motivo);
  }

  /** Nombre completo del abonado para el título del modal. */
  get abonadoFullName(): string {
    if (!this.abonado) return '';
    return `${this.abonado.nombre ?? ''} ${this.abonado.apellidos ?? ''}`.trim();
  }

  private changeEstado(nuevo: number, motivo: string = ''): void {
    if (!this.abonado) return;
    this.saving = true;
    this.cdr.markForCheck();
    this.subs.add(
      this.detailService.updateEstado(this.abonadoId, nuevo, this.clubId, motivo).subscribe({
        next: (resp: Response) => {
          this.saving = false;
          this.estadoModalOpen = false;
          if (this.abonado) {
            this.abonado.estado = (resp?.data as any)?.estado ?? nuevo;
          }
          const key =
            nuevo === 1
              ? this.estadoModalAction === 'reactivate'
                ? 'SUBS.MESSAGES.REOPENED_SUCCESS'
                : 'SUBS.DETAIL.APPROVE_OK'
              : this.estadoModalAction === 'reject'
              ? 'SUBS.DETAIL.REJECT_OK'
              : 'SUBS.MESSAGES.DEACTIVATED_SUCCESS';
          this.notification.success(key);
          // Refrescar histórico tras el cambio si la pestaña actividad
          // está abierta.
          if (this.activeTab === 'actividad') {
            this.loadEstadoHistorico();
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.saving = false;
          this.notification.error('SUBS.MESSAGES.SAVE_ERROR');
          this.cdr.markForCheck();
        },
      }),
    );
  }

  /* ─────────────── modal de pago ─────────────── */

  /**
   * Consulta el catálogo de pagos del club con `audiencia=ABONADOS`
   * para la temporada del abonado activo y actualiza
   * {@link clubHasAbonadoPaymentsCatalog}. Tolerante a errores: si la
   * llamada falla, se queda en `null` y NO se bloquea el botón
   * (defensa belt-and-braces).
   */
  private loadClubAbonadoPaymentsCatalog(): void {
    if (!this.clubId) return;
    const temporada = this.abonadosTemporada?.temporada || '';
    if (!temporada) {
      // Sin temporada no podemos preguntar al catálogo. No bloqueamos.
      this.clubHasAbonadoPaymentsCatalog = null;
      return;
    }
    this.subs.add(
      this.clubService.getListPagosClubAbonados(this.clubId, temporada).subscribe({
        next: (resp: Response) => {
          const data: any = resp?.data;
          const pagos: any[] = Array.isArray(data?.pagos)
            ? data.pagos
            : Array.isArray(data)
              ? data
              : [];
          this.clubHasAbonadoPaymentsCatalog = pagos.length > 0;
          this.cdr.markForCheck();
        },
        error: () => {
          this.clubHasAbonadoPaymentsCatalog = null;
          this.cdr.markForCheck();
        },
      }),
    );
  }

  /**
   * Vuelve a `/dashboard/new-cuotas/{clubId}` para que el admin cree
   * el primer pago de abonados antes de poder registrar movimientos
   * individuales en esta ficha. Es el "atajo" del mensaje que se
   * muestra cuando {@link clubHasAbonadoPaymentsCatalog} es `false`.
   */
  goToNewCuotas(): void {
    if (!this.clubId) return;
    this.router.navigate(['/dashboard/new-cuotas', this.clubId]);
  }

  openPaymentModal(): void {
    if (!this.abonadosTemporada) return;
    // No permitimos registrar pago si el club aún no ha creado ningún
    // concepto de pago para abonados (audiencia=1) en Cuotas. Eso
    // evita movimientos huérfanos que no aparecerían luego en la
    // pantalla "Gestión de pagos" del club.
    if (this.clubHasAbonadoPaymentsCatalog === false) {
      this.notification.error('SUBS.DETAIL.PAY_NO_CATALOG_TOAST');
      return;
    }
    // Si el abonado ya está al día (todas sus cuotas pagadas o pago
    // reciente en clubes sin temporada), evitamos registrar pagos
    // adicionales para que el panel no acumule cobros duplicados que
    // no se corresponden con una cuota pendiente.
    if (this.alDia) {
      this.notification.error('SUBS.DETAIL.PAY_ALL_PAID_TOAST');
      return;
    }
    this.pagoTipo = 'Pagado';
    // En clubes con temporada cerrada, pre-rellenamos con lo que queda
    // por pagar (UX más rápida). En modo abierto (ad-hoc sin temporada)
    // no hay "restante" significativo, dejamos vacío para que el club
    // teclee la cuota concreta de este pago.
    const restante = Number(this.abonadosTemporada.restante);
    this.pagoCantidad = this.seasonsEnabled && !isNaN(restante) && restante > 0
      ? restante
      : 0;
    this.pagoFecha = new Date().toISOString().substring(0, 10);
    this.pagoMetodo = 'Tarjeta';
    this.pagoComentario = '';
    this.pagoClubIdSeleccionado = null;
    this.cuotasPendientes = [];
    this.showPaymentModal = true;
    this.loadCuotasPendientes();
  }

  /**
   * Carga las cuotas (conceptos audiencia=1) asignadas al abonado y se
   * queda solo con las que tienen `restante > 0`. Resultado se vuelca
   * en {@link cuotasPendientes} para alimentar el `<select>` del modal.
   *
   * Se ejecuta cada vez que se abre el modal (lazy) para que refleje
   * cambios recientes (p.ej. el club acaba de asignar una cuota nueva
   * o de pagar otra desde /new-cuotas).
   */
  private loadCuotasPendientes(): void {
    if (!this.abonadosTemporada) return;
    const atId = this.abonadosTemporada.abonadosTemporadaId;
    this.cuotasPendientesLoading = true;
    this.subs.add(
      this.clubService.getConceptosPorAbonado(atId).subscribe({
        next: (resp: any) => {
          this.cuotasPendientesLoading = false;
          const conceptos: any[] = resp?.data?.conceptos || [];
          this.cuotasPendientes = conceptos
            .filter(c => {
              const restante = Number(c?.restante);
              return !isNaN(restante) && restante > 0;
            })
            .map(c => ({
              pagoClubId: Number(c.pagoClubId) || 0,
              nombre: c.nombre || null,
              importe: Number(c.importe) || 0,
              restante: Number(c.restante) || 0,
              totalPagado: Number(c.totalPagado) || 0,
              estado: Number(c.estado) || 0,
              ultimoPago: c.ultimoPago || null,
              numMovimientos: Number(c.numMovimientos) || 0,
            } as AbonadoConceptoPendiente));
          this.cdr.markForCheck();
        },
        error: () => {
          this.cuotasPendientesLoading = false;
          this.cuotasPendientes = [];
          this.cdr.markForCheck();
        },
      }),
    );
  }

  /**
   * Handler del `<select>` "Cuota a asociar" en el modal de pago.
   * Cuando el usuario elige una cuota concreta, auto-rellenamos
   * el importe con su restante y BLOQUEAMOS el campo para evitar
   * pagos parciales / sobrepagos sobre una cuota concreta. Si
   * el usuario vuelve a "— Sin asociar —", desbloqueamos el importe
   * y lo dejamos vacío para que teclee a mano.
   */
  onCuotaSeleccionadaChange(): void {
    if (this.pagoClubIdSeleccionado == null) {
      this.pagoCantidad = 0;
      return;
    }
    const cuota = this.cuotasPendientes.find(c => c.pagoClubId === this.pagoClubIdSeleccionado);
    if (cuota) {
      this.pagoCantidad = cuota.restante;
    }
  }

  /** True si el campo "importe" está bloqueado (cuota concreta seleccionada). */
  get pagoCantidadBloqueada(): boolean {
    return this.pagoClubIdSeleccionado != null;
  }

  closePaymentModal(): void {
    this.showPaymentModal = false;
  }

  savePayment(): void {
    if (!this.abonadosTemporada) return;
    if (!this.pagoCantidad || this.pagoCantidad <= 0) {
      this.notification.error('SUBS.PAY.AMOUNT_INVALID');
      return;
    }
    const pago = new AbonadoPagoHistorico({
      abonadosTemporadaId: this.abonadosTemporada.abonadosTemporadaId,
      cantidad: String(this.pagoCantidad),
      tipo: this.pagoTipo,
      fechaPago: this.pagoFecha,
      metodo: this.pagoMetodo,
      comentario: this.pagoComentario,
      // Cuando hay cuota seleccionada, el backend además recalcula
      // pago_histori_abonados para reflejar el cobro a nivel de
      // concepto (importe pagado / restante / estado). Si vale 0
      // se trata como cobro suelto (compat retroactiva).
      pagoClubId: this.pagoClubIdSeleccionado || 0,
    });
    const cuotaTotal = Number(this.abonadosTemporada.cuota) || 0;
    const yaPagado = Number(this.abonadosTemporada.pagado) || 0;
    const nuevoPagado = this.pagoTipo === 'Pagado'
      ? yaPagado + this.pagoCantidad
      : yaPagado - this.pagoCantidad;
    this.pagoSaving = true;
    this.subs.add(
      this.clubService.createPagoAbonado(pago, cuotaTotal, nuevoPagado).subscribe({
        next: () => {
          this.pagoSaving = false;
          this.notification.success('SUBS.PAY.SAVED_OK');
          this.showPaymentModal = false;
          this.loadDetail();
        },
        error: () => {
          this.pagoSaving = false;
          this.notification.error('SUBS.PAY.SAVED_ERROR');
        },
      }),
    );
  }

  /* ─────────────── helpers UI ─────────────── */

  setActiveTab(tab: DetailTab): void {
    // La pestaña "Datos personales" ya no tiene modo lectura: queda
    // siempre editable, así que no resetemos {@link editingPersonal}.
    this.activeTab = tab;
    // Lazy load de cada pestaña. Las pestañas Documentos, Comunicaciones,
    // Familiares y Carnet son ahora componentes hijos que se crean con el
    // *ngIf del panel activo: su ngOnInit replica exactamente las guardas
    // de carga que vivían aquí (cargar solo si la caché compartida está
    // vacía; el carnet se recarga siempre al entrar).
    if (tab === 'actividad') {
      // La actividad siempre se recarga porque depende de eventos de
      // otras pestañas (pagos, docs, coms) que pueden haber cambiado.
      this.loadActividad();
    }
  }

  // La lógica de las pestañas Documentos (incl. docs del club),
  // Comunicaciones y Familiares se ha extraído a los componentes hijos
  // documentos-tab, comunicaciones-tab y familiares-tab.

  /* ─────────────── Pestaña Actividad (PR3) ─────────────── */

  loadActividad(): void {
    if (!this.abonadoId) return;
    this.actividadLoading = true;
    this.subs.add(
      this.detailService.getActividad(this.abonadoId).subscribe({
        next: (resp: Response) => {
          this.actividad = (resp?.data as AbonadoActividad[]) || [];
          this.actividadLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.actividadLoading = false;
          this.notification.error('SUBS.DETAIL.ACT.LOAD_ERROR');
          this.cdr.markForCheck();
        },
      }),
    );
    // Cargamos también el histórico de estados (Bloque 6) en paralelo,
    // se renderiza como sub-sección dentro de la pestaña Actividad.
    this.loadEstadoHistorico();
  }

  /**
   * Carga el histórico de cambios de estado del abonado. Se llama al
   * abrir la pestaña Actividad y tras cada cambio de estado para que
   * la nueva fila aparezca sin necesidad de recargar la página.
   */
  loadEstadoHistorico(): void {
    if (!this.abonadoId) return;
    this.estadoHistoricoLoading = true;
    this.subs.add(
      this.detailService.getEstadoHistorico(this.abonadoId).subscribe({
        next: (resp: Response) => {
          this.estadoHistorico = (resp?.data as any[]) || [];
          this.estadoHistoricoLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.estadoHistoricoLoading = false;
          this.cdr.markForCheck();
        },
      }),
    );
  }

  /** Etiqueta i18n del estado para mostrar en el histórico. */
  estadoLabelKey(estado: number): string {
    if (estado === 1) return 'SUBS.SUBSCRIBER_STATUS.ACTIVE';
    if (estado === 2) return 'SUBS.SUBSCRIBER_STATUS.PENDING';
    return 'SUBS.SUBSCRIBER_STATUS.INACTIVE';
  }

  /** Clase CSS del badge según el estado. */
  estadoBadgeClass(estado: number): string {
    if (estado === 1) return 'aeh-badge aeh-badge--ok';
    if (estado === 2) return 'aeh-badge aeh-badge--pending';
    return 'aeh-badge aeh-badge--inactive';
  }

  /** Devuelve el icono adecuado para el tipo de evento del timeline. */
  getActIcon(tipo: string): string {
    switch (tipo) {
      case 'CREATED':           return '✨';
      case 'STATE_PENDING':     return '⏳';
      case 'PAYMENT_RECEIVED':  return '💚';
      case 'PAYMENT_REFUND':    return '↩️';
      case 'DOC_UPLOADED':      return '📎';
      case 'COM_SENT':          return '✉️';
      case 'COM_FAILED':        return '⚠️';
      case 'FAMILY_LINK':       return '👥';
      default:                  return '•';
    }
  }

  getActCss(tipo: string): string {
    switch (tipo) {
      case 'PAYMENT_RECEIVED':  return 'act-marker--green';
      case 'PAYMENT_REFUND':    return 'act-marker--orange';
      case 'COM_FAILED':        return 'act-marker--red';
      case 'STATE_PENDING':     return 'act-marker--orange';
      case 'CREATED':           return 'act-marker--green';
      case 'DOC_UPLOADED':      return 'act-marker--blue';
      case 'COM_SENT':          return 'act-marker--blue';
      case 'FAMILY_LINK':       return 'act-marker--violet';
      default:                  return 'act-marker--neutral';
    }
  }

  /**
   * Parsea el campo {@code meta} (JSON string) intentando devolver un
   * objeto. Si el parse falla, devuelve {@code null} y el frontend
   * simplemente no muestra detalles secundarios.
   */
  parseActMeta(meta: string): any {
    if (!meta) return null;
    try {
      return JSON.parse(meta);
    } catch {
      return null;
    }
  }

  // La pestaña Carnet + Beneficios (carga, descarga PNG y canjes) se ha
  // extraído al componente hijo carnet-tab.

  // ─── Subida de foto del abonado por el club ───
  /** Bloquea doble click mientras la subida está en curso. */
  uploadingPhoto = false;

  /**
   * Handler del `<input type="file">` oculto detrás del avatar editable
   * del header. Valida extensión y tamaño en cliente (el backend hace
   * la validación final), sube la foto y refresca:
   *   - `abonado.imgPerfil` (header) para feedback inmediato
   *   - `carnet.imgPerfil` (tab carnet) si está cargado
   */
  onAvatarFileSelected(event: Event, inputEl: HTMLInputElement): void {
    const target = event.target as HTMLInputElement;
    const file = target.files && target.files[0];
    if (!file) return;

    // Validación cliente: extensión y tamaño máx 5 MB. Replica los
    // límites del backend para dar feedback rápido sin gastar red.
    const validExt = /^image\/(jpeg|jpg|png|webp)$/.test(file.type);
    if (!validExt) {
      this.notification.error('SUBS.DETAIL.PHOTO.INVALID_TYPE');
      inputEl.value = '';
      return;
    }
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      this.notification.error('SUBS.DETAIL.PHOTO.TOO_BIG');
      inputEl.value = '';
      return;
    }
    if (!this.abonado || !this.clubId) {
      this.notification.error('SUBS.DETAIL.PHOTO.UPLOAD_ERROR');
      inputEl.value = '';
      return;
    }

    this.uploadingPhoto = true;
    this.cdr.markForCheck();
    this.subs.add(
      this.detailService.uploadAbonadoPhoto(this.abonadoId, this.clubId, file).subscribe({
        next: (resp: Response) => {
          this.uploadingPhoto = false;
          inputEl.value = '';
          if (resp && resp.status === 200 && resp.data) {
            const filename = resp.data as string;
            // El backend devuelve solo el nombre del fichero (ej.
            // "abonado_123.jpg"). El header lo compone con
            // {@link abonadoImageBase} y el carnet con
            // {@link carnetAvatarUrl}, así que ambos deben recibir el
            // filename plano. Si guardáramos la URL absoluta aquí, el
            // header haría `abonadoImageBase + url` → URL duplicada →
            // 404 → avatar gris hasta que el F5 recarga el filename
            // limpio del backend (bug reproducido el 25-may-2026).
            // Por defensa, si en algún caso futuro el backend devolviese
            // ya una URL absoluta, la pasamos tal cual: el HTML usa el
            // operador `+` que respeta strings completos.
            const safeFilename = /^https?:\/\//i.test(filename)
              ? filename.split('/').pop() || filename
              : filename;
            // Cache-buster: añadimos `?v=timestamp` para forzar al
            // navegador a re-pedir la imagen, que en S3 / Tomcat suele
            // venir con cache-control agresivo y mostraría la versión
            // anterior aunque el nombre del fichero cambie.
            const cacheBust = `?v=${Date.now()}`;
            // Actualizamos las dos referencias visibles: header + carnet.
            // El carnet vive ahora en el hijo carnet-tab (solo instanciado
            // con la pestaña activa); si no existe, el hijo recargará el
            // carnet desde el backend en su ngOnInit al entrar a la pestaña.
            if (this.abonado) this.abonado.imgPerfil = safeFilename + cacheBust;
            this.carnetTab?.applyUploadedPhoto(safeFilename);
            this.notification.success('SUBS.DETAIL.PHOTO.UPLOADED');
          } else {
            const code = resp?.status;
            const key = code === 403
              ? 'SUBS.DETAIL.PHOTO.FORBIDDEN'
              : code === 404
                ? 'SUBS.DETAIL.PHOTO.NOT_FOUND'
                : 'SUBS.DETAIL.PHOTO.UPLOAD_ERROR';
            this.notification.error(key);
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.uploadingPhoto = false;
          inputEl.value = '';
          this.notification.error('SUBS.DETAIL.PHOTO.UPLOAD_ERROR');
          this.cdr.markForCheck();
        },
      }),
    );
  }

  goBack(): void {
    this.router.navigate(['/dashboard/abonados', this.clubId]);
  }

  getInitials(): string {
    if (!this.abonado) return '';
    const n = (this.abonado.nombre || '').trim();
    const a = (this.abonado.apellidos || '').trim();
    return `${(n[0] || '').toUpperCase()}${(a[0] || '').toUpperCase()}` || '?';
  }

  getEstadoLabel(): string {
    const estado = this.abonado?.estado;
    if (estado === 1) return 'SUBS.SUBSCRIBER_STATUS.ACTIVE';
    if (estado === 2) return 'SUBS.SUBSCRIBER_STATUS.PENDING';
    return 'SUBS.SUBSCRIBER_STATUS.INACTIVE';
  }

  getEstadoCssClass(): string {
    const estado = this.abonado?.estado;
    if (estado === 1) return 'status-pill--active';
    if (estado === 2) return 'status-pill--pending';
    return 'status-pill--inactive';
  }

  getPagoLabel(estado: number | undefined | null): string {
    if (estado === 2) return 'SUBS.STATUS.DONE';
    if (estado === 1) return 'SUBS.STATUS.PENDING';
    return 'SUBS.STATUS.NONE';
  }

  getPagoCssClass(estado: number | undefined | null): string {
    if (estado === 2) return 'status-pill--paid';
    if (estado === 1) return 'status-pill--pending-pay';
    return 'status-pill--no-payment';
  }

  hasRemaining(): boolean {
    const r = this.abonadosTemporada?.restante;
    if (r === null || r === undefined || r === '' || r === '0') return false;
    const num = Number(r);
    return !isNaN(num) && num > 0;
  }

  /**
   * ¿Este club tiene el módulo de temporadas activo? En clubes Sphaira
   * Adhoc sin "mi-temporada" habilitado, los abonados pueden estar dados
   * de alta indefinidamente y no tiene sentido mostrar una cuota total
   * cerrada; en ese caso simplificamos el resumen de pagos a
   * {@link totalPagadoHistorico} + {@link alDia}.
   *
   * <p>Fuente de verdad preferida: el flag {@code uses_seasonal_subs}
   * de la tabla {@code clubs} (lo trae el endpoint {@code getDetail}).
   * Si no llega (clubes legacy o respuestas previas al deploy del fix)
   * caemos al heurístico antiguo basado en permisos de menú ad-hoc, que
   * sigue siendo compatible para el resto de pantallas.</p>
   */
  get seasonsEnabled(): boolean {
    if (this.clubUsesSeasonalSubs !== null) {
      return this.clubUsesSeasonalSubs !== 0;
    }
    return !this.menuPermission.isAdhocActive()
      || this.menuPermission.isMenuEnabled('mi-temporada');
  }

  /**
   * Suma neta de todos los pagos registrados en el histórico:
   * "Pagado" suma, "Devuelto" resta. Es la cifra correcta a mostrar a
   * un club ad-hoc sin temporada, donde no existe "cuota total" cerrada.
   */
  get totalPagadoHistorico(): number {
    if (!this.historicoPagos || this.historicoPagos.length === 0) return 0;
    return this.historicoPagos.reduce((acc, p) => {
      const cantidad = Number(p.cantidad) || 0;
      if (!cantidad) return acc;
      // El backend usa el tipo en español. "Pagado" suma; cualquier
      // otra etiqueta (Devuelto, Reembolso, etc.) resta.
      return p.tipo === 'Pagado' ? acc + cantidad : acc - cantidad;
    }, 0);
  }

  /**
   * ¿El abonado está al día con sus pagos? La lógica pivota según si
   * el club tiene módulo de temporada activo:
   *
   * <ul>
   *   <li><b>Con temporada</b>: al día si el restante de la cuota es
   *       cero o negativo, o si el flag {@code estado === 2} (Pagado).</li>
   *   <li><b>Sin temporada (ad-hoc)</b>: en estos clubes no hay cuota
   *       cerrada, así que aplicamos una regla de pulgar: al día si
   *       existe al menos un pago "Pagado" en los últimos 35 días.
   *       Cubre cuotas mensuales y anuales con margen de gracia.</li>
   * </ul>
   *
   * Importante: el backend siempre crea un {@code abonadoTemporada}
   * dummy (temporada "2050") para clubes sin seasonal, por lo que
   * {@link abonadosTemporada} no es null aunque no haya temporada
   * real. No podemos basarnos solo en su existencia; tiramos del
   * helper {@link seasonsEnabled}.
   */
  get alDia(): boolean {
    if (this.seasonsEnabled) {
      const at = this.abonadosTemporada;
      if (!at) return false;
      const restante = Number(at.restante);
      if (!isNaN(restante) && restante <= 0 && Number(at.pagado) > 0) return true;
      return at.estado === 2;
    }
    // Modo abierto (sin temporada): basta con un pago reciente.
    if (!this.historicoPagos.length) return false;
    const ahora = Date.now();
    const ventana = 35 * 24 * 60 * 60 * 1000; // 35 días
    return this.historicoPagos.some((p) => {
      if (p.tipo !== 'Pagado') return false;
      const fecha = p.fechaPago || p.fechaCreate;
      if (!fecha) return false;
      const ts = new Date(fecha).getTime();
      if (isNaN(ts)) return false;
      return (ahora - ts) <= ventana;
    });
  }

  /**
   * Estado actual del botón "Registrar pago" de la pestaña Pagos.
   *
   * <ul>
   *   <li><b>no-catalog</b> — el club aún no ha creado ningún
   *       concepto de pago para abonados (audiencia=1). Banner azul
   *       con link "Ir a Cuotas" para crear el primero.</li>
   *   <li><b>all-paid</b> — el abonado ya está al día con todos los
   *       pagos creados (ver {@link alDia}). Banner verde "Tiene
   *       todos los pagos al día" sin link.</li>
   *   <li><b>ok</b> — botón habilitado, sin banner.</li>
   * </ul>
   *
   * El orden de precedencia es importante: si el club no tiene
   * catálogo no podemos saber si el abonado está "al día" (no hay
   * cuotas contra las que medir), así que ese estado gana.
   */
  get payButtonState(): 'no-catalog' | 'all-paid' | 'ok' {
    if (this.clubHasAbonadoPaymentsCatalog === false) return 'no-catalog';
    if (this.alDia) return 'all-paid';
    return 'ok';
  }

  /** Texto del tooltip del botón "Registrar pago" según {@link payButtonState}. */
  get payButtonTooltipKey(): string | null {
    switch (this.payButtonState) {
      case 'no-catalog': return 'SUBS.DETAIL.PAY_NO_CATALOG_TOOLTIP';
      case 'all-paid':   return 'SUBS.DETAIL.PAY_ALL_PAID_TOOLTIP';
      default:           return null;
    }
  }

  /**
   * Pagos del histórico ordenados por fecha DESC (más reciente primero).
   * El backend no garantiza orden; ordenamos en cliente para que la
   * tabla muestre lo último primero y `ultimoPagoFecha` sea fiable.
   */
  get historicoPagosOrdenado(): AbonadoPagoSummary[] {
    if (!this.historicoPagos || this.historicoPagos.length === 0) return [];
    return [...this.historicoPagos].sort((a, b) => {
      const fa = a.fechaPago || a.fechaCreate || '';
      const fb = b.fechaPago || b.fechaCreate || '';
      // Comparación lexicográfica funciona porque las fechas vienen
      // en formato ISO "yyyy-MM-dd".
      if (fa === fb) return 0;
      return fa < fb ? 1 : -1;
    });
  }

  /** Fecha del último pago "Pagado" registrado, formateada dd/MM/yyyy. */
  get ultimoPagoFecha(): string {
    const ultimo = this.historicoPagosOrdenado.find((p) => p.tipo === 'Pagado');
    return ultimo ? this.formatDate(ultimo.fechaPago || ultimo.fechaCreate) : '';
  }

  formatAmount(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') return '0,00 €';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0,00 €';
    return `${num.toFixed(2).replace('.', ',')} €`;
  }

  formatDate(value: string | undefined | null): string {
    if (!value) return '';
    // El backend devuelve "yyyy-MM-dd". Lo convertimos a "dd/MM/yyyy" para
    // mostrar al usuario sin tener que tirar de moment/date-fns en este
    // componente puntual.
    const parts = value.substring(0, 10).split('-');
    if (parts.length !== 3) return value;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
}
