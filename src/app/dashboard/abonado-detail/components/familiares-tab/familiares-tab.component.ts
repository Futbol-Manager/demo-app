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
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import {
  AbonadoDetailService,
  AbonadoFamiliar,
  AbonadoSearchResult,
} from 'src/app/core/services/abonado-detail/abonado-detail.service';
import { ConfirmationService } from 'src/app/core/services/confirmation/confirmation.service';
import { NotificationService } from 'src/app/core/services/notification/notification.service';
import { Response } from 'src/app/core/services/models/response.model';

/**
 * Catálogo de relaciones familiares ofrecidas en el selector.
 * Duplicado del padre (`abonado-detail.component.ts`) para evitar un
 * import circular padre↔hijo: el padre importa este componente.
 */
export const FAMILIAR_RELATIONS: { value: string; labelKey: string }[] = [
  { value: 'CONYUGE',   labelKey: 'SUBS.DETAIL.FAM.RELATIONS.SPOUSE' },
  { value: 'PAREJA',    labelKey: 'SUBS.DETAIL.FAM.RELATIONS.PARTNER' },
  { value: 'HIJO',      labelKey: 'SUBS.DETAIL.FAM.RELATIONS.SON' },
  { value: 'HIJA',      labelKey: 'SUBS.DETAIL.FAM.RELATIONS.DAUGHTER' },
  { value: 'PADRE',     labelKey: 'SUBS.DETAIL.FAM.RELATIONS.FATHER' },
  { value: 'MADRE',     labelKey: 'SUBS.DETAIL.FAM.RELATIONS.MOTHER' },
  { value: 'HERMANO',   labelKey: 'SUBS.DETAIL.FAM.RELATIONS.BROTHER' },
  { value: 'HERMANA',   labelKey: 'SUBS.DETAIL.FAM.RELATIONS.SISTER' },
  { value: 'TUTOR',     labelKey: 'SUBS.DETAIL.FAM.RELATIONS.GUARDIAN' },
  { value: 'ABUELO',    labelKey: 'SUBS.DETAIL.FAM.RELATIONS.GRANDFATHER' },
  { value: 'ABUELA',    labelKey: 'SUBS.DETAIL.FAM.RELATIONS.GRANDMOTHER' },
  { value: 'OTRO',      labelKey: 'SUBS.DETAIL.FAM.RELATIONS.OTHER' },
];

/**
 * Pestaña "Familiares" del detalle de abonado (extraída de
 * {@code AbonadoDetailComponent} para aligerar el componente padre).
 *
 * El listado {@code familiares} se comparte con el padre vía two-way
 * binding ({@code [(familiares)]}): el padre lo conserva como caché entre
 * cambios de pestaña (mantiene el contador del tab y evita repetir la
 * llamada HTTP al volver) y este hijo solo lo recarga en {@code ngOnInit}
 * cuando la caché está vacía — mismo lazy load que hacía `setActiveTab`.
 *
 * `goToRelated` navega a la ficha del socio enlazado inyectando Router
 * directamente (misma ruta que usaba el padre).
 */
@Component({
  selector: 'app-familiares-tab',
  templateUrl: './familiares-tab.component.html',
  styleUrls: ['./familiares-tab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FamiliaresTabComponent implements OnInit, OnDestroy {
  @Input() abonadoId = 0;
  @Input() clubId = 0;

  /** Familiares vinculados (caché compartida con el padre). */
  @Input() familiares: AbonadoFamiliar[] = [];
  @Output() familiaresChange = new EventEmitter<AbonadoFamiliar[]>();

  familiaresLoading = false;
  readonly relationOptions = FAMILIAR_RELATIONS;

  /** Modal "Vincular socio" (relacion + buscador con resultados). */
  showLinkModal = false;
  linkSearchTerm = '';
  linkSearchResults: AbonadoSearchResult[] = [];
  linkSearchLoading = false;
  linkSelectedAbonado: AbonadoSearchResult | null = null;
  linkRelacion = 'CONYUGE';
  private linkSearchTimer?: any;

  /** Modal "Añadir familiar externo" (datos sueltos). */
  showExternalModal = false;
  externalForm: {
    relacion: string;
    nombre: string;
    apellidos: string;
    email: string;
    telefono: string;
    fechaNacimiento: string;
    notas: string;
  } = {
    relacion: 'CONYUGE',
    nombre: '',
    apellidos: '',
    email: '',
    telefono: '',
    fechaNacimiento: '',
    notas: '',
  };

  familiarSaving = false;
  /** familiarId con borrado en curso (para deshabilitar UI). */
  deletingFamId: number | null = null;

  private subs = new Subscription();

  constructor(
    private cdr: ChangeDetectorRef,
    private detailService: AbonadoDetailService,
    private notification: NotificationService,
    private confirmation: ConfirmationService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // Lazy load de la pestaña: misma guarda que tenía `setActiveTab`
    // en el padre.
    if (this.familiares.length === 0 && !this.familiaresLoading) {
      this.loadFamiliares();
    }
  }

  ngOnDestroy(): void {
    if (this.linkSearchTimer) clearTimeout(this.linkSearchTimer);
    this.subs.unsubscribe();
  }

  loadFamiliares(): void {
    if (!this.abonadoId) return;
    this.familiaresLoading = true;
    this.subs.add(
      this.detailService.listFamiliares(this.abonadoId).subscribe({
        next: (resp: Response) => {
          this.familiares = (resp?.data as AbonadoFamiliar[]) || [];
          this.familiaresChange.emit(this.familiares);
          this.familiaresLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.familiaresLoading = false;
          this.notification.error('SUBS.DETAIL.FAM.LOAD_ERROR');
          this.cdr.markForCheck();
        },
      }),
    );
  }

  /* --- Modal "Vincular socio existente" --- */

  openLinkModal(): void {
    this.linkSearchTerm = '';
    this.linkSearchResults = [];
    this.linkSelectedAbonado = null;
    this.linkRelacion = 'CONYUGE';
    this.showLinkModal = true;
    // Pre-carga lista vacía (limit 20) para mostrar los primeros sin
    // necesidad de escribir nada — UX más amable.
    this.runLinkSearch('');
    this.cdr.markForCheck();
  }

  closeLinkModal(): void {
    this.showLinkModal = false;
    this.cdr.markForCheck();
  }

  /** Dispara la búsqueda con debounce de 250 ms para no saturar el backend. */
  onLinkSearchChange(term: string): void {
    this.linkSearchTerm = term;
    if (this.linkSearchTimer) clearTimeout(this.linkSearchTimer);
    this.linkSearchTimer = setTimeout(() => this.runLinkSearch(term), 250);
  }

  private runLinkSearch(term: string): void {
    if (!this.clubId) return;
    this.linkSearchLoading = true;
    this.cdr.markForCheck();
    this.subs.add(
      this.detailService.searchAbonados(this.clubId, term, this.abonadoId).subscribe({
        next: (resp: Response) => {
          this.linkSearchResults = (resp?.data as AbonadoSearchResult[]) || [];
          this.linkSearchLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.linkSearchLoading = false;
          this.cdr.markForCheck();
        },
      }),
    );
  }

  selectLinkAbonado(item: AbonadoSearchResult): void {
    this.linkSelectedAbonado = item;
    this.cdr.markForCheck();
  }

  confirmLink(): void {
    if (!this.linkSelectedAbonado) return;
    this.familiarSaving = true;
    this.cdr.markForCheck();
    this.subs.add(
      this.detailService
        .addFamiliar(this.abonadoId, this.clubId, {
          relatedAbonadoId: this.linkSelectedAbonado.abonadoId,
          relacion: this.linkRelacion,
        })
        .subscribe({
          next: (resp: Response) => {
            this.familiarSaving = false;
            if (resp?.status === 409) {
              this.notification.error('SUBS.DETAIL.FAM.ALREADY_LINKED');
            } else {
              this.familiares = [...this.familiares, resp?.data as AbonadoFamiliar];
              this.familiaresChange.emit(this.familiares);
              this.notification.success('SUBS.DETAIL.FAM.ADDED');
              this.showLinkModal = false;
            }
            this.cdr.markForCheck();
          },
          error: () => {
            this.familiarSaving = false;
            this.notification.error('SUBS.DETAIL.FAM.ADD_ERROR');
            this.cdr.markForCheck();
          },
        }),
    );
  }

  /* --- Modal "Añadir familiar externo" --- */

  openExternalModal(): void {
    this.externalForm = {
      relacion: 'CONYUGE',
      nombre: '',
      apellidos: '',
      email: '',
      telefono: '',
      fechaNacimiento: '',
      notas: '',
    };
    this.showExternalModal = true;
    this.cdr.markForCheck();
  }

  closeExternalModal(): void {
    this.showExternalModal = false;
    this.cdr.markForCheck();
  }

  saveExternal(): void {
    if (!this.externalForm.nombre?.trim()) {
      this.notification.error('SUBS.DETAIL.FAM.NAME_REQUIRED');
      return;
    }
    this.familiarSaving = true;
    this.cdr.markForCheck();
    this.subs.add(
      this.detailService.addFamiliar(this.abonadoId, this.clubId, { ...this.externalForm }).subscribe({
        next: (resp: Response) => {
          this.familiarSaving = false;
          this.familiares = [...this.familiares, resp?.data as AbonadoFamiliar];
          this.familiaresChange.emit(this.familiares);
          this.notification.success('SUBS.DETAIL.FAM.ADDED');
          this.showExternalModal = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.familiarSaving = false;
          this.notification.error('SUBS.DETAIL.FAM.ADD_ERROR');
          this.cdr.markForCheck();
        },
      }),
    );
  }

  /* --- Acciones por fila --- */

  deleteFamiliar(fam: AbonadoFamiliar): void {
    this.confirmation
      .confirm({
        titleKey: 'SUBS.DETAIL.FAM.DELETE_TITLE',
        messageKey: 'SUBS.DETAIL.FAM.DELETE_MSG',
        confirmKey: 'COMMON.DELETE',
        cancelKey: 'COMMON.CANCEL',
        confirmStyle: 'warn',
      })
      .subscribe((ok: boolean) => {
        if (!ok) return;
        this.deletingFamId = fam.familiarId;
        this.cdr.markForCheck();
        this.subs.add(
          this.detailService.deleteFamiliar(fam.familiarId).subscribe({
            next: () => {
              this.deletingFamId = null;
              this.familiares = this.familiares.filter(f => f.familiarId !== fam.familiarId);
              this.familiaresChange.emit(this.familiares);
              this.notification.success('SUBS.DETAIL.FAM.DELETED');
              this.cdr.markForCheck();
            },
            error: () => {
              this.deletingFamId = null;
              this.notification.error('SUBS.DETAIL.FAM.DELETE_ERROR');
              this.cdr.markForCheck();
            },
          }),
        );
      });
  }

  /** Actualiza un solo campo del familiar (autosave inline en la tarjeta). */
  updateFamiliarField(fam: AbonadoFamiliar, field: keyof AbonadoFamiliar, value: any): void {
    (fam as any)[field] = value;
    const patch: any = {};
    patch[field as string] = value === '' ? null : value;
    this.subs.add(
      this.detailService.updateFamiliar(fam.familiarId, patch).subscribe({
        next: () => {
          // No notificación — el feedback visual es suficiente
          // (input pierde foco y se ve actualizado).
        },
        error: () => {
          this.notification.error('SUBS.DETAIL.FAM.SAVE_ERROR');
        },
      }),
    );
  }

  /** Ir a la ficha del socio enlazado. */
  goToRelated(fam: AbonadoFamiliar): void {
    if (!fam.relatedAbonadoId) return;
    this.router.navigate(['/dashboard/abonados', this.clubId, 'detail', fam.relatedAbonadoId]);
  }

  /** URL pública del avatar de un familiar enlazado (mismo path que el resto de abonados). */
  getFamAvatarUrl(fam: AbonadoFamiliar): string {
    const img = fam.relatedAbonado?.imgPerfil;
    if (!img) return '';
    return this.detailService.buildDocumentoUrl('abonado/' + img);
  }

  getRelacionLabel(rel: string): string {
    const found = this.relationOptions.find(r => r.value === rel);
    return found ? found.labelKey : 'SUBS.DETAIL.FAM.RELATIONS.OTHER';
  }

  getFamInitials(fam: AbonadoFamiliar): string {
    const nombre = fam.relatedAbonado?.nombre || fam.nombre || '';
    const apellidos = fam.relatedAbonado?.apellidos || fam.apellidos || '';
    return `${(nombre[0] || '').toUpperCase()}${(apellidos[0] || '').toUpperCase()}` || '?';
  }

  getFamFullName(fam: AbonadoFamiliar): string {
    const nombre = fam.relatedAbonado?.nombre || fam.nombre || '';
    const apellidos = fam.relatedAbonado?.apellidos || fam.apellidos || '';
    return `${nombre} ${apellidos}`.trim() || '—';
  }

  isExternalFamiliar(fam: AbonadoFamiliar): boolean {
    return !fam.relatedAbonadoId;
  }
}
