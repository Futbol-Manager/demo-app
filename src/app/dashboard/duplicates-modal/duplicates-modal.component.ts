import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { NotificationService } from 'src/app/core/services/notification/notification.service';
import {
  DuplicateGroup,
  DuplicatePlayer,
  PlayerDuplicateService,
} from 'src/app/core/services/player-duplicate/player-duplicate.service';
import { environment } from 'src/environments/environment';

/**
 * Modal con la lista de pares de jugadores que el algoritmo del backend
 * marca como posibles duplicados dentro de un club. Para cada par muestra
 * las dos fichas lado a lado con sus contadores (equipos, tutores, pagos,
 * asistencias, goles) y deja al admin del club elegir manualmente cuál
 * conservar — o marcar el par como NO duplicado para que no vuelva a salir.
 */
@Component({
  selector: 'app-duplicates-modal',
  templateUrl: './duplicates-modal.component.html',
  styleUrls: ['./duplicates-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DuplicatesModalComponent implements OnChanges {

  @Input() open = false;
  @Input() clubId = 0;
  @Input() userId = 0;
  /** Si se pasa, el modal se abre filtrado mostrando solo el grupo que
   *  contiene a este playerId. Se usa al pulsar el badge en
   *  info-jugadores. */
  @Input() focusPlayerId: number | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() resolved = new EventEmitter<{ remainingCount: number }>();

  groups: DuplicateGroup[] = [];
  loading = false;
  errorMsg = '';
  processingPairKey: string | null = null;

  confirmShow = false;
  confirmTitle = '';
  confirmMessage = '';
  confirmText = '';
  confirmDanger = false;
  private pendingAction:
    | { kind: 'merge'; group: DuplicateGroup; keep: DuplicatePlayer; discard: DuplicatePlayer }
    | { kind: 'ignore'; group: DuplicateGroup }
    | null = null;

  constructor(
    private duplicateService: PlayerDuplicateService,
    private notification: NotificationService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.load();
    }
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.open && !this.processingPairKey) {
      this.close();
    }
  }

  load(): void {
    if (!this.clubId && !(environment as any).useDuplicatesMock) {
      this.loading = false;
      this.groups = [];
      this.errorMsg = '';
      this.cdr.markForCheck();
      return;
    }
    this.loading = true;
    this.errorMsg = '';
    this.cdr.markForCheck();
    this.duplicateService.list(this.clubId).subscribe({
      next: (res) => {
        const all = Array.isArray(res?.data) ? res.data : [];
        let filtered = this.focusPlayerId
          ? all.filter(g => g.playerA.playerId === this.focusPlayerId
                          || g.playerB.playerId === this.focusPlayerId)
          : all;
        if (filtered.length === 0 && this.focusPlayerId && (environment as any).useDuplicatesMock) {
          filtered = all;
        }
        this.groups = filtered;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err?.error?.error?.msg
          || this.translate.instant('DUPLICATES.MODAL.ERROR_LOAD');
        this.cdr.markForCheck();
      },
    });
  }

  pairKey(g: DuplicateGroup): string {
    return `${g.playerA.playerId}-${g.playerB.playerId}`;
  }

  trackByPair = (_index: number, g: DuplicateGroup): string => this.pairKey(g);

  keep(group: DuplicateGroup, winner: 'A' | 'B'): void {
    const keep = winner === 'A' ? group.playerA : group.playerB;
    const discard = winner === 'A' ? group.playerB : group.playerA;
    this.pendingAction = { kind: 'merge', group, keep, discard };
    this.confirmTitle = this.translate.instant('DUPLICATES.MODAL.CONFIRM_MERGE_TITLE');
    this.confirmMessage = this.translate.instant('DUPLICATES.MODAL.CONFIRM_MERGE', {
      keepName: this.fullName(keep),
      discardName: this.fullName(discard),
    });
    this.confirmText = this.translate.instant('DUPLICATES.MODAL.KEEP_THIS');
    this.confirmDanger = true;
    this.confirmShow = true;
    this.cdr.markForCheck();
  }

  private doMerge(group: DuplicateGroup, keep: DuplicatePlayer, discard: DuplicatePlayer): void {
    this.processingPairKey = this.pairKey(group);
    this.cdr.markForCheck();

    this.duplicateService.merge({
      clubId: this.clubId,
      userId: this.userId,
      playerIdKeep: keep.playerId,
      playerIdDiscard: discard.playerId,
    }).subscribe({
      next: (res) => {
        this.processingPairKey = null;
        if (res?.data === true) {
          this.removeGroup(group);
          this.notification.success(
            this.translate.instant('DUPLICATES.MODAL.MERGE_OK', {
              name: this.fullName(keep),
            }),
            false,
          );
          this.resolved.emit({ remainingCount: this.groups.length });
        } else {
          this.notification.error(
            res?.error?.msg || this.translate.instant('DUPLICATES.MODAL.MERGE_FAIL'),
            false,
          );
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.processingPairKey = null;
        this.notification.error(
          err?.error?.error?.msg || this.translate.instant('DUPLICATES.MODAL.MERGE_FAIL'),
          false,
        );
        this.cdr.markForCheck();
      },
    });
  }

  ignore(group: DuplicateGroup): void {
    this.pendingAction = { kind: 'ignore', group };
    this.confirmTitle = this.translate.instant('DUPLICATES.MODAL.CONFIRM_IGNORE_TITLE');
    this.confirmMessage = this.translate.instant('DUPLICATES.MODAL.CONFIRM_IGNORE');
    this.confirmText = this.translate.instant('DUPLICATES.MODAL.NOT_DUPLICATE');
    this.confirmDanger = false;
    this.confirmShow = true;
    this.cdr.markForCheck();
  }

  private doIgnore(group: DuplicateGroup): void {
    this.processingPairKey = this.pairKey(group);
    this.cdr.markForCheck();

    this.duplicateService.ignore({
      clubId: this.clubId,
      userId: this.userId,
      playerId1: group.playerA.playerId,
      playerId2: group.playerB.playerId,
    }).subscribe({
      next: (res) => {
        this.processingPairKey = null;
        if (res?.data === true) {
          this.removeGroup(group);
          this.notification.success(
            this.translate.instant('DUPLICATES.MODAL.IGNORE_OK'),
            false,
          );
          this.resolved.emit({ remainingCount: this.groups.length });
        } else {
          this.notification.error(
            res?.error?.msg || this.translate.instant('DUPLICATES.MODAL.IGNORE_FAIL'),
            false,
          );
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.processingPairKey = null;
        this.notification.error(
          err?.error?.error?.msg || this.translate.instant('DUPLICATES.MODAL.IGNORE_FAIL'),
          false,
        );
        this.cdr.markForCheck();
      },
    });
  }

  close(): void {
    if (this.processingPairKey) return;
    this.closed.emit();
  }

  fullName(p: DuplicatePlayer): string {
    return [p.nombre, p.apellido].filter(Boolean).join(' ').trim()
        || `#${p.playerId}`;
  }

  reasonKey(reason: 'DNI' | 'NAME' | 'NAME_BIRTH'): string {
    switch (reason) {
      case 'DNI': return 'DUPLICATES.REASON.DNI';
      case 'NAME': return 'DUPLICATES.REASON.NAME';
      case 'NAME_BIRTH': return 'DUPLICATES.REASON.NAME_BIRTH';
      default: return reason;
    }
  }

  private removeGroup(g: DuplicateGroup): void {
    this.groups = this.groups.filter(x => this.pairKey(x) !== this.pairKey(g));
  }

  // ─────────────────────────── confirm dialog Sphaira ─────────────────────

  onConfirmAccept(): void {
    const action = this.pendingAction;
    this.confirmShow = false;
    this.pendingAction = null;
    this.cdr.markForCheck();
    if (!action) return;
    if (action.kind === 'merge') {
      this.doMerge(action.group, action.keep, action.discard);
    } else if (action.kind === 'ignore') {
      this.doIgnore(action.group);
    }
  }

  onConfirmCancel(): void {
    this.confirmShow = false;
    this.pendingAction = null;
    this.cdr.markForCheck();
  }
}
