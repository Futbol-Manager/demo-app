import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  AbonadoService,
  ClubDocument,
} from 'src/app/core/services/abonado/abonado.service';
import { Response } from 'src/app/core/services/models/response.model';
import { NotificationService } from 'src/app/core/services/notification/notification.service';

/**
 * Pestaña Documentos del dashboard del abonado (Bloque 8).
 *
 * Ruta: `/dashboard/mi-abonado/documentos`.
 *
 * <p>Standalone para no inflar `dashboard.module` con código que solo
 * usan los abonados. El backend filtra por estado=1 automáticamente:
 * si el abonado no está activo se recibe una lista vacía sin error.</p>
 */
@Component({
  selector: 'app-mi-abonado-documentos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mi-abonado-documentos.component.html',
  styleUrls: ['./mi-abonado-documentos.component.scss'],
})
export class MiAbonadoDocumentosComponent implements OnInit, OnDestroy {
  loading = true;
  docs: ClubDocument[] = [];

  /** id del doc cuya descarga está en curso (para deshabilitar el botón). */
  busyDocId: number | null = null;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private abonadoService: AbonadoService,
    private notification: NotificationService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.abonadoService
      .getMyDocuments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp: Response) => {
          this.docs = Array.isArray(resp?.data) ? resp.data : [];
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

  download(doc: ClubDocument): void {
    if (this.busyDocId !== null) return;
    this.busyDocId = doc.id;
    this.cdr.markForCheck();
    this.abonadoService
      .downloadMyDocument(doc.id)
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

  back(): void {
    this.router.navigate(['/dashboard/mi-abonado']);
  }

  /* ── Helpers de presentación ───────────────────────────────────── */

  iconForCategoria(cat: string): string {
    switch (cat) {
      case 'estatutos':  return 'bi-shield-check';
      case 'normativa':  return 'bi-journal-text';
      case 'circular':   return 'bi-megaphone';
      case 'calendario': return 'bi-calendar3';
      case 'formulario': return 'bi-clipboard-check';
      default:           return 'bi-file-earmark';
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
