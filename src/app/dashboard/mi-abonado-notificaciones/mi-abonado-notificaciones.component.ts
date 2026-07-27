import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ClubService } from 'src/app/core/services/club/club.service';
import { LoginService } from 'src/app/core/services/login/login.service';
import { Response } from 'src/app/core/services/models/response.model';
import { environment } from 'src/environments/environment';

/**
 * Bandeja de entrada del abonado (subruta `/dashboard/mi-abonado/notificaciones`).
 *
 * Reutiliza el mismo backend de correos del club (`correos_recibidos`)
 * que jugadores y entrenadores, filtrando por el `userId` del abonado
 * logueado. No reimplementa nada del editor — los abonados solo reciben,
 * no envían.
 *
 * Diseño consciente:
 *  - Standalone para no inflar `dashboard.module` con dependencias que
 *    solo usa el perfil 8.
 *  - Lista a la izquierda, preview a la derecha. En móvil colapsa a una
 *    única columna con stack vertical (lista → detalle).
 *  - Marca como leído al abrir un mensaje (igual que el editor del club).
 */
interface InboxItem {
  correoRecibidoId: number;
  asunto: string;
  body: string;
  fechaCreate: string;
  remitente: string;
  remitenteUserId?: number;
  remitentePhotoUrl?: string | null;
  leido: number;
  preview?: string;
}

@Component({
  selector: 'app-mi-abonado-notificaciones',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mi-abonado-notificaciones.component.html',
  styleUrls: ['./mi-abonado-notificaciones.component.scss'],
})
export class MiAbonadoNotificacionesComponent implements OnInit, OnDestroy {
  userId = 0;
  loading = true;
  errorKey: string | null = null;

  /** Lista completa, sin filtrar (para recalcular el badge de "no leídos"). */
  private allItems: InboxItem[] = [];
  /** Lista visible (filtrada por la pestaña activa). */
  items: InboxItem[] = [];
  selected: InboxItem | null = null;
  unreadCount = 0;

  filter: 'all' | 'unread' | 'read' = 'all';
  search = '';

  readonly imageBaseUrl = environment.images + 'user/';

  private readonly destroy$ = new Subject<void>();

  constructor(
    private clubService: ClubService,
    private loginService: LoginService,
    private translate: TranslateService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loginService.usuarioActual
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        const uid = user?.userId ?? 0;
        if (!uid) {
          this.errorKey = 'MI_ABONADO_NOTIFS.ERR_NO_SESSION';
          this.loading = false;
          this.cdr.markForCheck();
          return;
        }
        this.userId = uid;
        this.loadInbox();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goBack(): void {
    this.router.navigate(['/dashboard/mi-abonado']);
  }

  setFilter(f: 'all' | 'unread' | 'read'): void {
    this.filter = f;
    this.applyFilter();
  }

  onSearchChange(): void {
    this.applyFilter();
  }

  /**
   * Carga los correos recibidos del abonado. Reutiliza `getListCorreos`
   * (mismo endpoint que el editor del club) y nos quedamos solo con
   * `recibidos`: los abonados no envían en esta UI.
   */
  loadInbox(): void {
    this.loading = true;
    this.clubService.getListCorreos(this.userId).subscribe({
      next: (resp: Response) => {
        const data = (resp?.data as any) || {};
        const recibidos: any[] = Array.isArray(data.recibidos) ? data.recibidos : [];
        this.allItems = recibidos.map((c) => this.mapItem(c));
        this.allItems.sort((a, b) =>
          (b.fechaCreate || '').localeCompare(a.fechaCreate || ''),
        );
        this.recalcUnread();
        this.applyFilter();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorKey = 'MI_ABONADO_NOTIFS.ERR_LOAD';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private mapItem(c: any): InboxItem {
    let body = c.body || '';
    try {
      body = atob(body);
    } catch {
      // body ya estaba en plano (mensajes pre-base64)
    }
    const stripped = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return {
      correoRecibidoId: c.correoRecibidoId,
      asunto: c.asunto || '',
      body,
      fechaCreate: c.fechaCreate || '',
      remitente: c.remitente || '',
      remitenteUserId: c.remitenteUserId,
      remitentePhotoUrl: c.remitentePhotoUrl || null,
      leido: c.leido ?? 0,
      preview: stripped.slice(0, 140),
    };
  }

  private applyFilter(): void {
    const q = this.search.trim().toLowerCase();
    this.items = this.allItems.filter((it) => {
      if (this.filter === 'read' && it.leido !== 1) return false;
      if (this.filter === 'unread' && it.leido !== 0) return false;
      if (!q) return true;
      return (
        (it.asunto || '').toLowerCase().includes(q) ||
        (it.remitente || '').toLowerCase().includes(q) ||
        (it.preview || '').toLowerCase().includes(q)
      );
    });
    this.cdr.markForCheck();
  }

  private recalcUnread(): void {
    this.unreadCount = this.allItems.filter((it) => it.leido === 0).length;
  }

  openItem(item: InboxItem): void {
    this.selected = item;
    if (item.leido === 0) {
      this.clubService.openCorreoRecibido(item.correoRecibidoId).subscribe({
        next: () => {
          item.leido = 1;
          this.recalcUnread();
          this.cdr.markForCheck();
        },
        error: () => {},
      });
    }
  }

  closePreview(): void {
    this.selected = null;
  }

  /** Devuelve iniciales del remitente para el avatar fallback. */
  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] || '';
    const second = parts.length > 1 ? parts[parts.length - 1]?.[0] : '';
    return (first + second).toUpperCase() || '?';
  }
}
