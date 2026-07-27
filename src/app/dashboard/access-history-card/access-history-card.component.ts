import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

import {
  AccessControlService,
  AccessLog,
  AccessSubjectType,
} from 'src/app/core/services/access-control/access-control.service';

/**
 * Card reutilizable que muestra el historial paginado de accesos de un
 * miembro (jugador o abonado). Se incrusta en `opcionesjugador` y en
 * `abonado-detail` y es responsable de:
 *
 * <ul>
 *   <li>Llamar a {@code GET /access-control/{clubId}/logs/subject}.</li>
 *   <li>Paginar con "Cargar más" (no introducimos paginador completo en
 *       la card para no romper el flujo del detalle).</li>
 *   <li>Mostrar la franja {@code subjectType} (ABONADO/PLAYER) y el
 *       resultado coloreado.</li>
 * </ul>
 *
 * Si el club no tiene el módulo activo o el sujeto no tiene logs, la card
 * se renderiza con un estado vacío amigable.
 */
@Component({
  selector: 'app-access-history-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './access-history-card.component.html',
  styleUrls: ['./access-history-card.component.scss'],
})
export class AccessHistoryCardComponent implements OnChanges {
  @Input() clubId!: number;
  @Input() subjectType!: AccessSubjectType;
  @Input() subjectId!: number;

  /** Si {@code true} la card no se carga (módulo desactivado para el club). */
  @Input() disabled = false;

  logs: AccessLog[] = [];
  loading = false;
  page = 0;
  size = 10;
  totalPages = 0;
  totalElements = 0;
  error = false;

  constructor(
    private accessService: AccessControlService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['subjectId'] || changes['clubId'] || changes['subjectType']) && this.shouldLoad()) {
      this.reset();
      this.loadMore();
    }
  }

  private shouldLoad(): boolean {
    return !this.disabled
      && !!this.clubId && this.clubId > 0
      && !!this.subjectType
      && !!this.subjectId && this.subjectId > 0;
  }

  private reset(): void {
    this.logs = [];
    this.page = 0;
    this.totalPages = 0;
    this.totalElements = 0;
    this.error = false;
  }

  loadMore(): void {
    if (!this.shouldLoad() || this.loading) return;
    this.loading = true;
    this.accessService.getLogsBySubject(this.clubId, this.subjectType, this.subjectId, this.page, this.size)
      .subscribe({
        next: (resp) => {
          this.logs = this.logs.concat(resp?.content ?? []);
          this.totalPages = resp?.totalPages ?? 0;
          this.totalElements = resp?.totalElements ?? 0;
          this.page = (resp?.page ?? this.page) + 1;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.error = true;
          this.cdr.markForCheck();
        },
      });
  }

  get canLoadMore(): boolean {
    return this.page < this.totalPages;
  }
}
