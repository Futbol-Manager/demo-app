import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  AbonadoDashboard,
  AbonadoPaymentHistoryItem,
  AbonadoService,
} from 'src/app/core/services/abonado/abonado.service';
import { AbonadoPhotoService } from 'src/app/core/services/abonado-photo/abonado-photo.service';
import { ClubService } from 'src/app/core/services/club/club.service';
import { LoginService } from 'src/app/core/services/login/login.service';
import { NotificationService } from 'src/app/core/services/notification/notification.service';
import { Response } from 'src/app/core/services/models/response.model';
import { environment } from 'src/environments/environment';
import { AvatarCropperComponent } from 'src/app/ui/avatar-cropper/avatar-cropper.component';
import { AbonadoCarnetComponent } from './abonado-carnet/abonado-carnet.component';

/** Item de la rejilla "Mis datos personales" — solo se pinta cuando tiene valor. */
interface PersonalField {
  labelKey: string;
  value: string;
  wide?: boolean;
}

/**
 * Pantalla "Mi cuenta de abonado" (Bloque 5 del feature de abonados).
 *
 * Es la primera (y por ahora única) vista que ven los usuarios con
 * profile_id=8. Cubre tres estados visuales bien diferenciados según
 * `abonado.estado`:
 *
 * - `2` (pendiente): mostramos cabecera amarilla con el club seleccionado
 *    y un mensaje explicativo. NO se muestra el carnet (lo activa el club
 *    cuando aprueba la cuenta).
 * - `1` (activo): cabecera verde + tarjeta carnet placeholder. El QR
 *    real se incorporará en el Bloque 6.
 * - `0` (baja): cabecera gris + mensaje de baja con la fecha si la hay.
 *
 * Intencionalmente sigo el patrón standalone introducido en el Bloque 4
 * para no inflar `dashboard.module` con dependencias que solo usa esta
 * pantalla. El componente lo registra `dashboard.module` vía `imports`.
 */
@Component({
  selector: 'app-mi-abonado',
  templateUrl: './mi-abonado.component.html',
  styleUrls: ['./mi-abonado.component.scss'],
})
export class MiAbonadoComponent implements OnInit, OnDestroy {
  data: AbonadoDashboard | null = null;
  loading = true;
  errorKey: string | null = null;
  /** Base CDN para componer URLs de imágenes guardadas en `clubs.picture`. */
  readonly imageBaseUrl = environment.images;
  /** Se pone a true cuando la imagen del club da 404 — entonces pintamos el icono fallback. */
  clubLogoBroken = false;
  /** Idem para la foto del abonado. */
  avatarBroken = false;
  /** Cropper modal abierto. */
  showCropper = false;
  /** Bloqueo del botón mientras sube al backend. */
  uploadingPhoto = false;
  /** Contador de notificaciones recibidas no leídas (badge en el botón de bandeja). */
  unreadInbox = 0;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private abonadoService: AbonadoService,
    private loginService: LoginService,
    private router: Router,
    public translate: TranslateService,
    private abonadoPhotoService: AbonadoPhotoService,
    private notification: NotificationService,
    private clubService: ClubService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargarDashboard();
  }

  /** Navega a la bandeja de entrada del abonado (`/dashboard/mi-abonado/notificaciones`). */
  goToInbox(): void {
    this.router.navigate(['/dashboard/mi-abonado/notificaciones']);
  }

  /** Navega a la pestaña Documentos del abonado (`/dashboard/mi-abonado/documentos`). */
  goToDocuments(): void {
    this.router.navigate(['/dashboard/mi-abonado/documentos']);
  }

  /**
   * Carga el conteo de mensajes no leídos. Se llama tras `cargarDashboard`
   * cuando ya tenemos `userId` de sesión. Reutiliza el endpoint que el
   * editor de notificaciones del club ya usa: el coste extra es 1 request
   * adicional al entrar a `/mi-abonado`.
   */
  private cargarUnread(): void {
    // Obtenemos el userId de sesión vía BehaviorSubject (mismo patrón que el
    // resto del dashboard). Si el usuario no está autenticado, dejamos el
    // contador a 0 silenciosamente — el botón seguirá llevando a la bandeja
    // y allí se mostrará el estado correcto.
    this.loginService.usuarioActual.pipe(takeUntil(this.destroy$)).subscribe((user) => {
      const userId = user?.userId ?? 0;
      if (!userId) {
        this.unreadInbox = 0;
        return;
      }
      this.clubService.getListCorreos(userId).subscribe({
        next: (resp: Response) => {
          const data: any = resp?.data || {};
          const recibidos: any[] = Array.isArray(data.recibidos) ? data.recibidos : [];
          this.unreadInbox = recibidos.filter((c) => c.leido === 0).length;
          this.cdr.markForCheck();
        },
        error: () => {
          this.unreadInbox = 0;
        },
      });
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarDashboard(): void {
    this.loading = true;
    this.errorKey = null;
    this.clubLogoBroken = false;
    this.abonadoService
      .getMyDashboard()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp: Response) => {
          this.loading = false;
          if (resp && resp.status === 200 && resp.data) {
            this.data = resp.data as AbonadoDashboard;
            // Solo cargamos el contador de no leídos cuando la cuenta está
            // activa: si está pendiente o de baja la bandeja no se muestra.
            if (this.data.abonado?.estado === 1) {
              this.cargarUnread();
            }
          } else {
            // 404 cae aquí también (status no 200) → ficha no encontrada.
            this.errorKey = 'MI_ABONADO.ERRORS.NOT_FOUND';
          }
        },
        error: (err) => {
          this.loading = false;
          if (err?.status === 404) {
            this.errorKey = 'MI_ABONADO.ERRORS.NOT_FOUND';
          } else if (err?.status === 401) {
            this.errorKey = 'MI_ABONADO.ERRORS.UNAUTHORIZED';
          } else {
            this.errorKey = 'MI_ABONADO.ERRORS.GENERIC';
          }
        },
      });
  }

  // ===============================================================
  // Logo del club
  // ===============================================================

  /**
   * Devuelve la URL completa del logo del club, o `null` si el club no
   * tiene logo configurado o si la última carga falló (404).
   *
   * `clubs.picture` se guarda en BD solo como nombre de archivo
   * (`123-img.png`); aquí lo prefijamos con la base del CDN.
   */
  clubLogoUrl(): string | null {
    if (this.clubLogoBroken) return null;
    const picture = this.data?.club?.imgPerfil;
    if (!picture) return null;
    if (/^https?:\/\//i.test(picture)) return picture;
    return `${this.imageBaseUrl}${picture}`;
  }

  /** Fallback cuando la imagen del club da 404 (archivo borrado del CDN). */
  onClubLogoError(): void {
    this.clubLogoBroken = true;
  }

  // ===============================================================
  // "Mis datos personales": solo pintamos los campos con valor
  // ===============================================================

  /**
   * Construye la lista de campos personales mostrables. Sólo aparecen los
   * que tienen valor para no enseñar al abonado un montón de "—" cuando
   * el club no le pidió esos datos en el formulario de registro.
   *
   * Nombre y email siempre se muestran (vienen del registro mínimo).
   */
  get personalFields(): PersonalField[] {
    const a = this.data?.abonado;
    if (!a) return [];
    const fullName = `${a.nombre ?? ''} ${a.apellidos ?? ''}`.trim();
    const items: PersonalField[] = [
      { labelKey: 'MI_ABONADO.PROFILE.NAME', value: fullName || '—' },
      { labelKey: 'MI_ABONADO.PROFILE.EMAIL', value: a.mail || '—' },
    ];
    if (a.telefono) items.push({ labelKey: 'MI_ABONADO.PROFILE.PHONE', value: a.telefono });
    if (a.dni) items.push({ labelKey: 'MI_ABONADO.PROFILE.DNI', value: a.dni });
    if (a.fechaNacimiento) items.push({ labelKey: 'MI_ABONADO.PROFILE.BIRTHDATE', value: a.fechaNacimiento });
    if (a.genero) items.push({ labelKey: 'MI_ABONADO.PROFILE.GENDER', value: a.genero });
    if (a.direccion) items.push({ labelKey: 'MI_ABONADO.PROFILE.ADDRESS', value: a.direccion, wide: true });
    return items;
  }

  /**
   * Indica si hay que pintar la sección "Mi temporada". Los clubes ad-hoc
   * (`usesSeasonalSubs = 0`) no usan temporadas anuales: para ellos
   * ocultamos el bloque entero, incluida la cuota.
   */
  get showSeasonSection(): boolean {
    if (!this.data?.season) return false;
    const uses = this.data?.club?.usesSeasonalSubs;
    // Si el backend aún no envía el flag (clubes antiguos) → asumimos que sí
    // usan temporadas para mantener compatibilidad con el comportamiento
    // previo. Solo lo ocultamos cuando es explícitamente 0.
    return uses !== 0;
  }

  // ===============================================================
  // Resumen de pagos (clubes ad-hoc sin temporada)
  // ===============================================================

  /**
   * Indica si hay que pintar el bloque "Mis pagos" en modo abierto.
   * Se muestra cuando el club NO usa temporada anual: no hay cuota
   * total cerrada y el abonado puede estar dado de alta por años, así
   * que el dato relevante es el total acumulado pagado, si está al día
   * y el histórico completo.
   */
  get showOpenPaymentsSection(): boolean {
    if (!this.data) return false;
    const uses = this.data.club?.usesSeasonalSubs;
    return uses === 0;
  }

  /** Pagos del histórico (el backend ya los manda ordenados DESC). */
  get paymentHistory(): AbonadoPaymentHistoryItem[] {
    return this.data?.paymentHistory ?? [];
  }

  /**
   * Suma neta del histórico: pagos de tipo "Pagado" suman; cualquier
   * otro tipo (Devuelto, Reembolso, etc.) resta. Es el "Total pagado"
   * que ve el abonado en modo ad-hoc sin temporada.
   */
  get totalPagado(): number {
    return this.paymentHistory.reduce((acc, p) => {
      const cantidad = Number(p.cantidad) || 0;
      if (!cantidad) return acc;
      return p.tipo === 'Pagado' ? acc + cantidad : acc - cantidad;
    }, 0);
  }

  /**
   * ¿El abonado está al día con sus pagos? Mismo criterio que la vista
   * del club (`abonado-detail`) en modo ad-hoc: al día si hay al menos
   * un pago "Pagado" en los últimos 35 días.
   */
  get alDia(): boolean {
    if (!this.paymentHistory.length) return false;
    const ahora = Date.now();
    const ventana = 35 * 24 * 60 * 60 * 1000; // 35 días
    return this.paymentHistory.some((p) => {
      if (p.tipo !== 'Pagado') return false;
      const fecha = p.fechaPago || p.fechaCreate;
      if (!fecha) return false;
      const ts = new Date(fecha).getTime();
      if (isNaN(ts)) return false;
      return (ahora - ts) <= ventana;
    });
  }

  /** Fecha "dd/MM/yyyy" del último pago "Pagado" registrado. */
  get ultimoPagoFecha(): string {
    const ultimo = this.paymentHistory.find((p) => p.tipo === 'Pagado');
    if (!ultimo) return '';
    return this.formatDate(ultimo.fechaPago || ultimo.fechaCreate);
  }

  /** Formato monetario en € con coma decimal — coincide con abonado-detail. */
  formatAmount(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') return '0,00 €';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0,00 €';
    return `${num.toFixed(2).replace('.', ',')} €`;
  }

  /** "yyyy-MM-dd" → "dd/MM/yyyy". Vacío si el input no es válido. */
  formatDate(value: string | undefined | null): string {
    if (!value) return '';
    const parts = value.substring(0, 10).split('-');
    if (parts.length !== 3) return value;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  // ===============================================================
  // Helpers para la plantilla
  // ===============================================================

  /**
   * Devuelve la clave de estilo CSS asociada al estado del abonado.
   * Acepta directamente el estado numérico para no proyectar lógica de
   * negocio en el HTML.
   */
  estadoClass(estado: number | undefined): string {
    if (estado === 1) return 'estado-activo';
    if (estado === 2) return 'estado-pendiente';
    return 'estado-baja';
  }

  /** Clave i18n del badge según el estado del abonado. */
  estadoLabelKey(estado: number | undefined): string {
    if (estado === 1) return 'MI_ABONADO.STATUS.ACTIVE';
    if (estado === 2) return 'MI_ABONADO.STATUS.PENDING';
    return 'MI_ABONADO.STATUS.INACTIVE';
  }

  /** Clave i18n de la sub-explicación del estado del abonado. */
  estadoHintKey(estado: number | undefined): string {
    if (estado === 1) return 'MI_ABONADO.STATUS.ACTIVE_HINT';
    if (estado === 2) return 'MI_ABONADO.STATUS.PENDING_HINT';
    return 'MI_ABONADO.STATUS.INACTIVE_HINT';
  }

  // ===============================================================
  // Pantalla bloqueante (estado != 1)
  // ===============================================================

  /**
   * `true` cuando el abonado está activo y tiene acceso al dashboard
   * completo. Si está pendiente (2) o de baja (0) le pintamos en su
   * lugar la pantalla bloqueante de `abonado-gate`.
   */
  get isAbonadoActive(): boolean {
    return this.data?.abonado?.estado === 1;
  }

  /** Icono Bootstrap para la tarjeta bloqueante según estado. */
  gateIcon(estado: number | undefined): string {
    if (estado === 2) return 'bi-hourglass-split';
    if (estado === 0) return 'bi-x-octagon-fill';
    return 'bi-check-circle-fill';
  }

  /** Clave i18n del título grande de la tarjeta bloqueante. */
  gateTitleKey(estado: number | undefined): string {
    if (estado === 2) return 'MI_ABONADO.GATE.PENDING_TITLE';
    if (estado === 0) return 'MI_ABONADO.GATE.INACTIVE_TITLE';
    return 'MI_ABONADO.GATE.ACTIVE_TITLE';
  }

  /** Clave i18n del cuerpo explicativo de la tarjeta bloqueante. */
  gateBodyKey(estado: number | undefined): string {
    if (estado === 2) return 'MI_ABONADO.GATE.PENDING_BODY';
    if (estado === 0) return 'MI_ABONADO.GATE.INACTIVE_BODY';
    return 'MI_ABONADO.GATE.ACTIVE_BODY';
  }

  /** Clave i18n del pie informativo ("te avisaremos por email…"). */
  gateHintKey(estado: number | undefined): string {
    if (estado === 2) return 'MI_ABONADO.GATE.PENDING_HINT';
    if (estado === 0) return 'MI_ABONADO.GATE.INACTIVE_HINT';
    return 'MI_ABONADO.GATE.ACTIVE_HINT';
  }

  /** Clave i18n del badge según el estado de pago de la temporada. */
  pagoLabelKey(estadoPago: number | undefined | null): string {
    if (estadoPago == null) return 'MI_ABONADO.PAYMENT.NO_DATA';
    if (estadoPago === 2) return 'MI_ABONADO.PAYMENT.UP_TO_DATE';
    if (estadoPago === 1) return 'MI_ABONADO.PAYMENT.PARTIAL';
    return 'MI_ABONADO.PAYMENT.UNPAID';
  }

  /** Clase CSS del badge de pago. */
  pagoClass(estadoPago: number | undefined | null): string {
    if (estadoPago === 2) return 'pago-ok';
    if (estadoPago === 1) return 'pago-warn';
    return 'pago-ko';
  }

  /**
   * Cierra sesión y vuelve al login. `cerrarSesion()` ya navega al
   * `/` internamente vía `Router`, pero forzamos el navigate por si el
   * usuario está en pestaña secundaria con `BroadcastChannel` desincronizado.
   */
  logout(): void {
    this.loginService.cerrarSesion();
    this.router.navigate(['/'], { replaceUrl: true });
  }

  /** Reintenta la carga; útil cuando hay un error 404/500 transitorio. */
  reload(): void {
    this.cargarDashboard();
  }

  // ===============================================================
  // Foto de perfil del abonado
  // ===============================================================

  /**
   * URL completa de la foto de perfil del abonado o `null` si no tiene.
   * Las fotos viven bajo `abonado/` en el CDN. El campo `img_perfil` solo
   * guarda el nombre del archivo.
   */
  avatarUrl(): string | null {
    if (this.avatarBroken) return null;
    const file = this.data?.abonado?.imgPerfil;
    if (!file) return null;
    if (/^https?:\/\//i.test(file)) return file;
    return `${this.imageBaseUrl}abonado/${file}`;
  }

  /** Fallback cuando la foto del abonado da 404. */
  onAvatarError(): void {
    this.avatarBroken = true;
  }

  /** Abre el cropper. */
  openCropper(): void {
    this.showCropper = true;
    this.cdr.markForCheck();
  }

  /**
   * Sube el blob recortado al endpoint autenticado del abonado. Tras
   * éxito refresca `data.abonado.imgPerfil` para que la UI se actualice
   * sin recargar.
   */
  onPhotoApplied(blob: Blob): void {
    this.showCropper = false;
    this.uploadingPhoto = true;
    this.cdr.markForCheck();
    this.abonadoPhotoService.uploadOwn(blob).subscribe({
      next: (fileName) => {
        if (this.data && this.data.abonado) {
          this.data.abonado.imgPerfil = fileName;
          this.avatarBroken = false;
        }
        this.uploadingPhoto = false;
        this.notification.success('MI_ABONADO.PHOTO_UPDATED');
        this.cdr.markForCheck();
      },
      error: () => {
        this.uploadingPhoto = false;
        this.notification.error('MI_ABONADO.PHOTO_UPDATE_ERROR');
        this.cdr.markForCheck();
      },
    });
  }

  /** Cierra el cropper sin subir nada. */
  onPhotoCancelled(): void {
    this.showCropper = false;
    this.cdr.markForCheck();
  }
}
