import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import {
  AbonadoDetailService,
  AbonadoDocumento,
} from 'src/app/core/services/abonado-detail/abonado-detail.service';
import { ClubService } from 'src/app/core/services/club/club.service';
import { ConfirmationService } from 'src/app/core/services/confirmation/confirmation.service';
import { NotificationService } from 'src/app/core/services/notification/notification.service';
import { Response } from 'src/app/core/services/models/response.model';

/** Catálogo de tipos de documento ofrecidos en el selector del upload. */
export const ABONADO_DOC_TYPES: { value: string; labelKey: string }[] = [
  { value: 'DNI', labelKey: 'SUBS.DETAIL.DOCS.TYPE.DNI' },
  { value: 'FOTO_CARNET', labelKey: 'SUBS.DETAIL.DOCS.TYPE.PHOTO' },
  { value: 'CERTIFICADO_MEDICO', labelKey: 'SUBS.DETAIL.DOCS.TYPE.MEDICAL' },
  { value: 'AUTORIZACION_PATERNA', labelKey: 'SUBS.DETAIL.DOCS.TYPE.PARENTAL' },
  { value: 'CERTIFICADO_RESIDENCIA', labelKey: 'SUBS.DETAIL.DOCS.TYPE.RESIDENCE' },
  { value: 'OTRO', labelKey: 'SUBS.DETAIL.DOCS.TYPE.OTHER' },
];

/**
 * Pestaña "Documentos" del detalle de abonado (extraída de
 * {@code AbonadoDetailComponent} para aligerar el componente padre).
 *
 * Los listados {@code documentos} y {@code clubDocs} se comparten con el
 * padre vía two-way binding ({@code [(documentos)]} / {@code [(clubDocs)]}):
 * el padre los conserva como caché entre cambios de pestaña (para que el
 * contador del tab siga visible y no se repita la llamada HTTP al volver
 * a entrar) y este hijo solo los recarga en {@code ngOnInit} cuando la
 * caché está vacía — mismo lazy load que hacía {@code setActiveTab}.
 */
@Component({
  selector: 'app-documentos-tab',
  templateUrl: './documentos-tab.component.html',
  styleUrls: ['./documentos-tab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentosTabComponent implements OnInit, OnDestroy {
  @Input() abonadoId = 0;
  @Input() clubId = 0;

  /** Documentos personales del abonado (caché compartida con el padre). */
  @Input() documentos: AbonadoDocumento[] = [];
  @Output() documentosChange = new EventEmitter<AbonadoDocumento[]>();

  /**
   * Documentos requeridos por el club al abonado (Bloque 8 / Fase 2),
   * caché compartida con el padre. Cada item incluye:
   * {@code docClubesId}, {@code nombre}, {@code descripcion}, {@code tipo},
   * {@code requiere} (0=publicado, 1=requerido), {@code fileClub} (archivo
   * informativo del club), {@code docAbonadosId} (0 si todavía no se ha
   * subido nada), {@code subido} (0/1), {@code fileAbonado},
   * {@code fecCompletado}, {@code descripcionRespuesta}.
   *
   * <p>El club puede MARCAR COMO SUBIDO un doc requerido en nombre del
   * abonado (caso típico: el abonado entrega el DNI en papel y el club lo
   * digitaliza). Esto se hace desde la propia ficha del abonado y NO
   * desde el módulo global de documentos del club.</p>
   */
  @Input() clubDocs: any[] = [];
  @Output() clubDocsChange = new EventEmitter<any[]>();

  documentosLoading = false;
  uploading = false;
  uploadProgress = 0;
  /** Buffer para el formulario de subida (drag&drop o input file). */
  pendingFile: File | null = null;
  pendingTipo: string = 'DNI';
  pendingDescripcion: string = '';
  /** Para mostrar la confirmación de borrar un documento sin abrir un modal extra. */
  deletingId: number | null = null;
  /** Tipos de documento (expuesto al template). */
  readonly docTypes = ABONADO_DOC_TYPES;
  /** Drag highlight (true cuando hay un archivo siendo arrastrado encima del dropzone). */
  isDragOver = false;

  clubDocsLoading = false;
  /** Modal "Subir respuesta en nombre del abonado" para un doc requerido. */
  showClubDocUploadModal = false;
  /** Doc requerido del club que se está respondiendo en el modal. */
  clubDocPending: any = null;
  /** Archivo a subir como respuesta al doc del club. */
  clubDocFile: File | null = null;
  /** Comentario opcional para acompañar a la respuesta. */
  clubDocComment = '';
  clubDocUploading = false;

  private subs = new Subscription();

  constructor(
    private cdr: ChangeDetectorRef,
    private detailService: AbonadoDetailService,
    private clubService: ClubService,
    private notification: NotificationService,
    private confirmation: ConfirmationService,
  ) {}

  ngOnInit(): void {
    // Lazy load de la pestaña: mismas guardas que tenía `setActiveTab`
    // en el padre. Si la caché compartida ya tiene datos (el usuario
    // vuelve a entrar a la pestaña con el mismo abonado), no se repite
    // la llamada HTTP.
    if (this.documentos.length === 0 && !this.documentosLoading) {
      this.loadDocumentos();
    }
    if (this.clubDocs.length === 0 && !this.clubDocsLoading) {
      this.loadClubDocs();
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  loadDocumentos(): void {
    if (!this.abonadoId) return;
    this.documentosLoading = true;
    this.subs.add(
      this.detailService.listDocumentos(this.abonadoId).subscribe({
        next: (resp: Response) => {
          this.documentos = (resp?.data as AbonadoDocumento[]) || [];
          this.documentosChange.emit(this.documentos);
          this.documentosLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.documentosLoading = false;
          this.notification.error('SUBS.DETAIL.DOCS.LOAD_ERROR');
          this.cdr.markForCheck();
        },
      }),
    );
  }

  /* ─── Documentos del club (Bloque 8 / Fase 2) ─── */

  /**
   * Carga los documentos que el club ha REQUERIDO al abonado, con su estado
   * (subido / pendiente). El endpoint devuelve también los publicados
   * (requiere=0), pero estos son simplemente "PDF informativo del club al
   * abonado" — los pintamos en el mismo bloque marcándolos como
   * "Informativo".
   */
  loadClubDocs(): void {
    if (!this.abonadoId || !this.clubId) return;
    this.clubDocsLoading = true;
    this.subs.add(
      this.clubService.getDocumentosDelAbonado(this.clubId, this.abonadoId).subscribe({
        next: (resp: any) => {
          this.clubDocs = Array.isArray(resp?.data) ? resp.data : [];
          this.clubDocsChange.emit(this.clubDocs);
          this.clubDocsLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.clubDocsLoading = false;
          this.clubDocs = [];
          this.clubDocsChange.emit(this.clubDocs);
          this.notification.error('SUBS.DETAIL.DOCS.LOAD_ERROR');
          this.cdr.markForCheck();
        },
      }),
    );
  }

  /**
   * Abre el modal "Subir respuesta en nombre del abonado" para un doc
   * concreto del club. Solo aplica a docs requeridos ({@code requiere=1}).
   */
  openClubDocUpload(doc: any): void {
    if (!doc || doc.requiere !== 1) return;
    this.clubDocPending = doc;
    this.clubDocFile = null;
    this.clubDocComment = doc.descripcionRespuesta || '';
    this.showClubDocUploadModal = true;
    this.cdr.markForCheck();
  }

  closeClubDocUpload(): void {
    this.showClubDocUploadModal = false;
    this.clubDocPending = null;
    this.clubDocFile = null;
    this.clubDocComment = '';
    this.clubDocUploading = false;
    this.cdr.markForCheck();
  }

  onClubDocFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    this.clubDocFile = input.files[0];
    this.cdr.markForCheck();
  }

  /**
   * Sube el archivo a {@code POST /rest/club/upload-doc-abonado} marcando
   * la respuesta como "subido=1". Si el doc es personalizado (sin archivo),
   * se llama al endpoint sin archivo. Tras el OK, recarga la lista para
   * reflejar el nuevo estado.
   */
  submitClubDoc(): void {
    if (!this.clubDocPending || this.clubDocUploading) return;
    if (!this.clubDocFile && this.clubDocPending.tipo !== 'Personalizado') {
      // Para docs que esperan archivo, exigimos archivo. Para personalizados
      // permitimos enviar solo el comentario.
      this.notification.error('SUBS.DETAIL.DOCS.UPLOAD_NO_FILE');
      return;
    }
    this.clubDocUploading = true;
    const dto: any = {
      docClubesId: this.clubDocPending.docClubesId,
      docAbonadosId: this.clubDocPending.docAbonadosId || 0,
      clubId: this.clubId,
      abonadoId: this.abonadoId,
      // userId=0 → marca de auditoría "subido por el club desde el panel".
      // Cuando el abonado lo suba desde su app móvil (Fase 3) será su userId.
      userId: 0,
      descargado: 0,
      subido: 1,
      descripcion: this.clubDocComment || '',
      requiere: this.clubDocPending.requiere,
    };
    const obs$ = this.clubDocFile
      ? this.clubService.uploadDocAbonado(this.clubDocFile, dto)
      : this.clubService.uploadDocAbonadoPersonalizado(dto);
    this.subs.add(
      obs$.subscribe({
        next: () => {
          this.notification.success('SUBS.DETAIL.DOCS.UPLOAD_OK');
          this.clubDocUploading = false;
          this.closeClubDocUpload();
          this.clubDocs = [];
          this.clubDocsChange.emit(this.clubDocs);
          this.loadClubDocs();
        },
        error: () => {
          this.clubDocUploading = false;
          this.notification.error('SUBS.DETAIL.DOCS.UPLOAD_ERROR');
          this.cdr.markForCheck();
        },
      }),
    );
  }

  /**
   * URL pública del archivo del club (PDF informativo subido por el admin).
   * Sigue el patrón ya usado en {@code info-jugadores.component} y
   * {@code info-entrenadores.component} para los docs de {@code doc_clubes}:
   * el archivo vive en la ruta FTP {@code /documentos/} del servidor y se
   * sirve por HTTP bajo {@code /images/documentos/}.
   */
  buildClubFileUrl(fileName: string | null): string {
    if (!fileName) return '';
    return `https://appsphairatech.com/images/documentos/${fileName}`;
  }

  /**
   * URL del archivo subido por el abonado (o por el club en su nombre).
   * Vive en la ruta FTP {@code /docs-abonados/} ({@code path} usado en
   * {@code ClubServiceImpl.uploadDocAbonado}) y se sirve bajo
   * {@code /images/docs-abonados/}. Espejo del patrón
   * {@code /images/docs-padres/} que ya usa el módulo de jugadores.
   */
  buildAbonadoFileUrl(fileName: string | null): string {
    if (!fileName) return '';
    return `https://appsphairatech.com/images/docs-abonados/${fileName}`;
  }

  /** Handler del input file y del drop. */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    this.pendingFile = input.files[0];
    this.cdr.markForCheck();
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
    this.cdr.markForCheck();
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    this.cdr.markForCheck();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.pendingFile = files[0];
    }
    this.cdr.markForCheck();
  }

  clearPendingFile(): void {
    this.pendingFile = null;
    this.pendingDescripcion = '';
    this.cdr.markForCheck();
  }

  uploadPending(): void {
    if (!this.pendingFile) return;
    // Aviso visual amable de límite de tamaño (~10MB).
    if (this.pendingFile.size > 10 * 1024 * 1024) {
      this.notification.error('SUBS.DETAIL.DOCS.SIZE_LIMIT');
      return;
    }
    this.uploading = true;
    this.uploadProgress = 0;
    this.cdr.markForCheck();
    this.subs.add(
      this.detailService
        .uploadDocumento(
          this.abonadoId,
          this.clubId,
          this.pendingFile,
          this.pendingTipo,
          this.pendingDescripcion,
          null,
        )
        .subscribe({
          next: (resp: Response) => {
            this.uploading = false;
            this.uploadProgress = 100;
            const doc = resp?.data as AbonadoDocumento;
            if (doc) {
              this.documentos = [doc, ...this.documentos];
              this.documentosChange.emit(this.documentos);
            }
            this.notification.success('SUBS.DETAIL.DOCS.UPLOADED');
            this.clearPendingFile();
            this.cdr.markForCheck();
          },
          error: () => {
            this.uploading = false;
            this.notification.error('SUBS.DETAIL.DOCS.UPLOAD_ERROR');
            this.cdr.markForCheck();
          },
        }),
    );
  }

  downloadDoc(doc: AbonadoDocumento): void {
    const url = this.detailService.buildDocumentoUrl(doc.urlPath);
    // Para forzar la descarga (no abrir en pestaña), creamos un anchor
    // virtual con el atributo download. Funciona para PDF / imagen
    // mientras el servidor permita CORS de la misma org.
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.nombreOriginal || doc.fichero;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  deleteDoc(doc: AbonadoDocumento): void {
    this.confirmation
      .confirm({
        titleKey: 'SUBS.DETAIL.DOCS.DELETE_TITLE',
        messageKey: 'SUBS.DETAIL.DOCS.DELETE_MSG',
        confirmKey: 'COMMON.DELETE',
        cancelKey: 'COMMON.CANCEL',
        confirmStyle: 'warn',
      })
      .subscribe((ok: boolean) => {
        if (!ok) return;
        this.deletingId = doc.documentoId;
        this.cdr.markForCheck();
        this.subs.add(
          this.detailService.deleteDocumento(doc.documentoId).subscribe({
            next: () => {
              this.deletingId = null;
              this.documentos = this.documentos.filter(d => d.documentoId !== doc.documentoId);
              this.documentosChange.emit(this.documentos);
              this.notification.success('SUBS.DETAIL.DOCS.DELETED');
              this.cdr.markForCheck();
            },
            error: () => {
              this.deletingId = null;
              this.notification.error('SUBS.DETAIL.DOCS.DELETE_ERROR');
              this.cdr.markForCheck();
            },
          }),
        );
      });
  }

  getDocIcon(mimeType: string | undefined): string {
    if (!mimeType) return '📄';
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType === 'application/pdf') return '📕';
    if (mimeType.includes('word') || mimeType.includes('officedocument.word')) return '📘';
    if (mimeType.includes('excel') || mimeType.includes('sheet')) return '📗';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return '🗜️';
    return '📄';
  }

  formatSize(bytes: number | undefined | null): string {
    if (!bytes || bytes <= 0) return '—';
    const units = ['B', 'KB', 'MB', 'GB'];
    let n = bytes;
    let u = 0;
    while (n >= 1024 && u < units.length - 1) {
      n = n / 1024;
      u++;
    }
    return `${n.toFixed(n >= 10 || u === 0 ? 0 : 1)} ${units[u]}`;
  }

  getDocTypeLabel(tipo: string | undefined | null): string {
    const found = this.docTypes.find(t => t.value === tipo);
    return found ? found.labelKey : 'SUBS.DETAIL.DOCS.TYPE.OTHER';
  }

  /** Indica si el documento es una imagen y se puede mostrar como miniatura. */
  isImage(doc: AbonadoDocumento): boolean {
    return !!doc.mimeType && doc.mimeType.startsWith('image/');
  }

  thumbnailUrl(doc: AbonadoDocumento): string {
    return this.detailService.buildDocumentoUrl(doc.urlPath);
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
