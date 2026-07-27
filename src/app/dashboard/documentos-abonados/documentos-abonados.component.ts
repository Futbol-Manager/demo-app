import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  ClubDocumentService,
  CLUB_DOCUMENT_CATEGORIES,
  ClubDocumentCategoria,
} from 'src/app/core/services/club-document/club-document.service';
import { ClubDocument } from 'src/app/core/services/abonado/abonado.service';
import { Response } from 'src/app/core/services/models/response.model';
import { NotificationService } from 'src/app/core/services/notification/notification.service';
import { ConfirmationService } from 'src/app/core/services/confirmation/confirmation.service';

/**
 * Panel admin del módulo de documentos del club para abonados (Bloque 8).
 *
 * Ruta: `/dashboard/documentos-abonados/:clubId`.
 *
 * <p>NO confundir con {@code DocumentosClubComponent}, que gestiona los
 * documentos legacy de jugadores y entrenadores. Este módulo es exclusivo
 * de clubes adhoc / asociaciones que tienen abonados como socios
 * permanentes y necesitan compartir circulares, estatutos, etc.</p>
 *
 * <p>Sigue el patrón standalone + OnPush. Acciones: subir, listar
 * (con filtro por categoría), destacar / quitar destacado, descargar y
 * borrar (con doble confirmación).</p>
 */
@Component({
  selector: 'app-documentos-abonados',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './documentos-abonados.component.html',
  styleUrls: ['./documentos-abonados.component.scss'],
})
export class DocumentosAbonadosComponent implements OnInit, OnDestroy {
  // ── estado UI ────────────────────────────────────────────────
  /**
   * clubId del componente. Se resuelve en este orden de prioridad:
   *   1) `@Input() inputClubId` cuando el componente está EMBEBIDO en otra
   *      pantalla (p. ej. dentro de DocumentosClubComponent como tab).
   *   2) `ActivatedRoute.snapshot.paramMap.get('clubId')` cuando se navega
   *      directamente a `/dashboard/documentos-abonados/:clubId` (modo
   *      legacy, antes de unificarse con Documentos).
   *   3) `localStorage.clubId` como último fallback.
   */
  @Input() inputClubId?: number;
  /**
   * `true` cuando el componente vive embebido dentro de otra pantalla
   * (p. ej. como tab en DocumentosClubComponent). Sirve para ocultar el
   * header propio (icono + título "Documentos del club") y evitar
   * duplicar el header de la pantalla padre.
   */
  @Input() embedded = false;
  clubId = 0;
  loading = true;
  /** Categoría activa del filtro o `null` para mostrar todas. */
  filtroCategoria: ClubDocumentCategoria | null = null;
  /** Texto del filtro de búsqueda libre. */
  search = '';

  /** Lista completa cacheada del backend (público para la plantilla). */
  allDocs: ClubDocument[] = [];
  /** Lista visible (filtrada). */
  docs: ClubDocument[] = [];

  /** Categorías canónicas para el dropdown del modal de subida. */
  readonly allCategories = [...CLUB_DOCUMENT_CATEGORIES];
  /** Categorías que aparecen al menos una vez en la lista (para los chips). */
  usedCategories: ClubDocumentCategoria[] = [];

  // ── modal de subida ─────────────────────────────────────────
  showUploadModal = false;
  uploadInProgress = false;
  uploadFile: File | null = null;
  uploadForm = {
    titulo: '',
    descripcion: '',
    categoria: 'otros' as ClubDocumentCategoria,
    pinned: false,
    notify: false,
  };
  /** Errores de validación del modal (i18n key). */
  uploadError: string | null = null;

  // ── action busy state ───────────────────────────────────────
  /** Marca qué doc tiene una acción en curso para deshabilitar botones. */
  busyDocId: number | null = null;

  readonly categoriasIterables = CLUB_DOCUMENT_CATEGORIES;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private clubDocumentService: ClubDocumentService,
    private notification: NotificationService,
    private confirm: ConfirmationService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    if (this.inputClubId && this.inputClubId > 0) {
      this.clubId = this.inputClubId;
    } else {
      this.clubId = Number(this.route.snapshot.paramMap.get('clubId')) || 0;
      if (!this.clubId) {
        const stored = Number(localStorage.getItem('clubId'));
        if (stored) this.clubId = stored;
      }
    }
    this.loadDocs();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /* ============================================================ */
  /*  Carga                                                       */
  /* ============================================================ */

  loadDocs(): void {
    if (!this.clubId) return;
    this.loading = true;
    this.cdr.markForCheck();
    this.clubDocumentService
      .list(this.clubId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp: Response) => {
          this.allDocs = Array.isArray(resp?.data) ? resp.data : [];
          this.recomputeFilters();
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.notification.error('CLUB_DOCS.MESSAGES.LOAD_ERROR');
          this.cdr.markForCheck();
        },
      });
  }

  /* ============================================================ */
  /*  Filtros                                                     */
  /* ============================================================ */

  setCategoriaFiltro(cat: ClubDocumentCategoria | null): void {
    this.filtroCategoria = cat;
    this.recomputeFilters();
  }

  onSearchChange(): void {
    this.recomputeFilters();
  }

  private recomputeFilters(): void {
    this.usedCategories = ClubDocumentService.getUsedCategorias(this.allDocs);
    const q = this.search.trim().toLowerCase();
    this.docs = this.allDocs.filter((d) => {
      if (this.filtroCategoria && d.categoria !== this.filtroCategoria) return false;
      if (!q) return true;
      return (
        d.titulo.toLowerCase().includes(q) ||
        (d.descripcion ?? '').toLowerCase().includes(q) ||
        d.nombreOriginal.toLowerCase().includes(q)
      );
    });
    this.cdr.markForCheck();
  }

  /* ============================================================ */
  /*  Subida (modal)                                              */
  /* ============================================================ */

  openUploadModal(): void {
    this.uploadForm = {
      titulo: '',
      descripcion: '',
      categoria: 'otros',
      pinned: false,
      notify: false,
    };
    this.uploadFile = null;
    this.uploadError = null;
    this.showUploadModal = true;
    this.cdr.markForCheck();
  }

  closeUploadModal(): void {
    if (this.uploadInProgress) return;
    this.showUploadModal = false;
    this.cdr.markForCheck();
  }

  onFileSelected(ev: Event): void {
    const inp = ev.target as HTMLInputElement;
    const file = inp.files && inp.files[0];
    if (!file) {
      this.uploadFile = null;
      this.cdr.markForCheck();
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      this.uploadError = 'CLUB_DOCS.MESSAGES.FILE_TOO_BIG';
      this.uploadFile = null;
      this.cdr.markForCheck();
      return;
    }
    this.uploadError = null;
    this.uploadFile = file;
    if (!this.uploadForm.titulo) {
      const dot = file.name.lastIndexOf('.');
      this.uploadForm.titulo = dot > 0 ? file.name.substring(0, dot) : file.name;
    }
    this.cdr.markForCheck();
  }

  submitUpload(): void {
    if (this.uploadInProgress) return;
    if (!this.uploadFile) {
      this.uploadError = 'CLUB_DOCS.MESSAGES.NO_FILE';
      this.cdr.markForCheck();
      return;
    }
    if (!this.uploadForm.titulo.trim()) {
      this.uploadError = 'CLUB_DOCS.MESSAGES.NO_TITLE';
      this.cdr.markForCheck();
      return;
    }
    this.uploadInProgress = true;
    this.uploadError = null;
    this.cdr.markForCheck();
    this.clubDocumentService
      .upload(this.clubId, this.uploadFile, {
        titulo: this.uploadForm.titulo.trim(),
        descripcion: this.uploadForm.descripcion.trim() || undefined,
        categoria: this.uploadForm.categoria,
        pinned: this.uploadForm.pinned,
        notify: this.uploadForm.notify,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp: Response) => {
          this.uploadInProgress = false;
          if (resp?.status === 200) {
            this.notification.success('CLUB_DOCS.MESSAGES.UPLOAD_OK');
            this.showUploadModal = false;
            this.loadDocs();
          } else {
            this.uploadError =
              resp?.error?.msg || 'CLUB_DOCS.MESSAGES.UPLOAD_ERROR';
            this.cdr.markForCheck();
          }
        },
        error: (err) => {
          this.uploadInProgress = false;
          this.uploadError =
            err?.error?.error?.msg || 'CLUB_DOCS.MESSAGES.UPLOAD_ERROR';
          this.cdr.markForCheck();
        },
      });
  }

  /* ============================================================ */
  /*  Acciones por fila                                           */
  /* ============================================================ */

  togglePin(doc: ClubDocument): void {
    if (this.busyDocId !== null) return;
    this.busyDocId = doc.id;
    this.cdr.markForCheck();
    this.clubDocumentService
      .togglePin(this.clubId, doc.id, !doc.pinned)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          doc.pinned = !doc.pinned;
          this.busyDocId = null;
          this.notification.success(
            doc.pinned ? 'CLUB_DOCS.MESSAGES.PINNED' : 'CLUB_DOCS.MESSAGES.UNPINNED',
          );
          this.allDocs.sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
          this.recomputeFilters();
        },
        error: () => {
          this.busyDocId = null;
          this.notification.error('CLUB_DOCS.MESSAGES.PIN_ERROR');
          this.cdr.markForCheck();
        },
      });
  }

  download(doc: ClubDocument): void {
    if (this.busyDocId !== null) return;
    this.busyDocId = doc.id;
    this.cdr.markForCheck();
    this.clubDocumentService
      .download(this.clubId, doc.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob) => {
          this.triggerBrowserDownload(blob, doc.nombreOriginal);
          this.busyDocId = null;
          this.cdr.markForCheck();
        },
        error: () => {
          this.busyDocId = null;
          this.notification.error('CLUB_DOCS.MESSAGES.DOWNLOAD_ERROR');
          this.cdr.markForCheck();
        },
      });
  }

  askDelete(doc: ClubDocument): void {
    if (this.busyDocId !== null) return;
    this.confirm
      .confirm({
        titleKey: 'CLUB_DOCS.CONFIRM.DELETE_TITLE',
        messageKey: 'CLUB_DOCS.CONFIRM.DELETE_MESSAGE',
        confirmKey: 'COMMON.DELETE',
        cancelKey: 'COMMON.CANCEL',
        confirmStyle: 'warn',
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe((ok) => {
        if (!ok) return;
        this.busyDocId = doc.id;
        this.cdr.markForCheck();
        this.clubDocumentService
          .delete(this.clubId, doc.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.allDocs = this.allDocs.filter((d) => d.id !== doc.id);
              this.recomputeFilters();
              this.busyDocId = null;
              this.notification.success('CLUB_DOCS.MESSAGES.DELETED');
            },
            error: () => {
              this.busyDocId = null;
              this.notification.error('CLUB_DOCS.MESSAGES.DELETE_ERROR');
              this.cdr.markForCheck();
            },
          });
      });
  }

  /* ============================================================ */
  /*  Helpers de presentación                                     */
  /* ============================================================ */

  iconForCategoria(cat: string): string {
    switch (cat) {
      case 'estatutos':   return 'bi-shield-check';
      case 'normativa':   return 'bi-journal-text';
      case 'circular':    return 'bi-megaphone';
      case 'calendario':  return 'bi-calendar3';
      case 'formulario':  return 'bi-clipboard-check';
      default:            return 'bi-file-earmark';
    }
  }

  prettySize(bytes: number): string {
    if (!bytes || bytes <= 0) return '—';
    const units = ['B', 'KB', 'MB', 'GB'];
    let v = bytes;
    let i = 0;
    while (v >= 1024 && i < units.length - 1) {
      v /= 1024;
      i++;
    }
    return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`;
  }

  private triggerBrowserDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'documento';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
}
