import { Component, Inject, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

/**
 * Datos que recibe el modal de preview de un documento. Reutilizable desde:
 *   - Pestaña Documentos del perfil del jugador.
 *   - Modal de completion-detail en `documentos-club`.
 *   - Cualquier pantalla que necesite previsualizar un archivo remoto.
 */
export interface DocumentPreviewData {
  /** URL completa del archivo a mostrar. */
  url: string;
  /** Nombre legible para el header del modal. */
  title?: string;
  /** Nombre del archivo (para inferir el tipo y sugerir el filename). */
  fileName?: string;
  /** Texto opcional (respuesta del padre a un formulario `requiere=2`). */
  textContent?: string;
  /** Si `true`, muestra el botón "Eliminar archivo subido" en el footer. */
  allowDelete?: boolean;
  /** Si `true`, muestra el botón "Descargar". */
  allowDownload?: boolean;
}

type PreviewKind = 'pdf' | 'image' | 'video' | 'office' | 'text' | 'unknown';

@Component({
  selector: 'app-document-preview-dialog',
  templateUrl: './document-preview-dialog.component.html',
  styleUrls: ['./document-preview-dialog.component.scss'],
})
export class DocumentPreviewDialogComponent implements OnInit {
  safeUrl: SafeResourceUrl | null = null;
  kind: PreviewKind = 'unknown';
  loading = true;
  /** Bandera que el contenedor padre lee al cerrarse para saber si debe recargar. */
  shouldRefresh = false;

  constructor(
    public dialogRef: MatDialogRef<DocumentPreviewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DocumentPreviewData,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    if (this.data.textContent && this.data.textContent.trim().length > 0) {
      this.kind = 'text';
      this.loading = false;
      return;
    }

    if (!this.data.url) {
      this.kind = 'unknown';
      this.loading = false;
      return;
    }

    this.kind = this.detectKind(this.data.url, this.data.fileName);
    if (this.kind === 'pdf' || this.kind === 'video') {
      this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.data.url);
    }
    this.loading = false;
  }

  private detectKind(url: string, fileName?: string): PreviewKind {
    const lower = (fileName || url || '').toLowerCase().split('?')[0];
    if (lower.endsWith('.pdf')) return 'pdf';
    if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/.test(lower)) return 'image';
    if (/\.(mp4|webm|mov|ogg)$/.test(lower)) return 'video';
    if (/\.(doc|docx|xls|xlsx|ppt|pptx|odt|ods|odp)$/.test(lower)) return 'office';
    return 'unknown';
  }

  descargar(): void {
    if (!this.data.url) return;
    window.open(this.data.url, '_blank');
  }

  abrirEnNuevaPestana(): void {
    if (!this.data.url) return;
    window.open(this.data.url, '_blank', 'noopener,noreferrer');
  }

  eliminar(): void {
    this.shouldRefresh = true;
    this.dialogRef.close({ deleted: true });
  }

  cerrar(): void {
    this.dialogRef.close({ deleted: false });
  }
}
