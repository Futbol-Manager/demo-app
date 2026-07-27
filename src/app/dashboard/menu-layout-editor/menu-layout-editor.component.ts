import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { take } from 'rxjs/operators';
import {
  MenuLayoutEditableItem,
  MenuLayoutService,
} from 'src/app/core/services/menu-layout/menu-layout.service';
import { MenuPermissionService } from 'src/app/core/services/menu-permission/menu-permission.service';
import { NotificationService } from 'src/app/core/services/notification/notification.service';

/**
 * Modal "Reordenar menú" — único punto de edición del orden custom del
 * menú principal y la sidebar para el admin del club (profileId=1).
 */
@Component({
  selector: 'app-menu-layout-editor',
  templateUrl: './menu-layout-editor.component.html',
  styleUrls: ['./menu-layout-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuLayoutEditorComponent implements OnInit {

  /** ID del club al que se aplica el orden custom. */
  @Input() clubId = 0;

  /** Profile al que se aplica (en producto = 1 = admin del club). */
  @Input() profileId = 1;

  /** Cierre del modal sin guardar (o tras guardar). */
  @Output() closed = new EventEmitter<void>();

  /** Emite cuando el guardado se completa con éxito. */
  @Output() saved = new EventEmitter<void>();

  items: MenuLayoutEditableItem[] = [];

  saving = false;

  /** Mensaje de error i18n key, o null si no hay error. */
  errorKey: string | null = null;

  constructor(
    private menuLayout: MenuLayoutService,
    private menuPermission: MenuPermissionService,
    private notification: NotificationService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadItems();
  }

  private loadItems(): void {
    const adhoc = this.menuPermission.isAdhocActive();
    const all = this.menuLayout.getCatalogOrdered();
    this.items = adhoc
      ? all.filter((it) => this.menuPermission.isMenuEnabled(it.code))
      : all;
    this.cdr.markForCheck();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.saving) return;
    this.cancel();
  }

  onDrop(event: CdkDragDrop<MenuLayoutEditableItem[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    moveItemInArray(this.items, event.previousIndex, event.currentIndex);
    this.cdr.markForCheck();
  }

  moveUp(index: number, event?: MouseEvent): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (index <= 0) return;
    moveItemInArray(this.items, index, index - 1);
    this.cdr.markForCheck();
  }

  moveDown(index: number, event?: MouseEvent): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (index >= this.items.length - 1) return;
    moveItemInArray(this.items, index, index + 1);
    this.cdr.markForCheck();
  }

  cancel(): void {
    if (this.saving) return;
    this.closed.emit();
  }

  save(): void {
    if (this.saving) return;
    if (this.clubId <= 0) {
      this.notification.errorLoad();
      return;
    }
    this.saving = true;
    this.errorKey = null;
    this.cdr.markForCheck();

    const codes = this.items.map((it) => it.code);
    this.menuLayout.setLocal(codes);

    this.menuLayout.save(this.clubId, this.profileId, codes).pipe(take(1)).subscribe({
      next: () => {
        this.saving = false;
        this.notification.success('SIDEBAR.LAYOUT.SAVED');
        this.saved.emit();
        this.closed.emit();
      },
      error: (err) => {
        this.saving = false;
        if (err?.status === 404 || err?.status === 405) {
          this.errorKey = 'SIDEBAR.LAYOUT.SAVE_NOT_AVAILABLE';
        } else {
          this.errorKey = 'SIDEBAR.LAYOUT.SAVE_ERROR';
        }
        this.cdr.markForCheck();
      },
    });
  }

  trackByCode(_: number, item: MenuLayoutEditableItem): string {
    return item.code;
  }
}
