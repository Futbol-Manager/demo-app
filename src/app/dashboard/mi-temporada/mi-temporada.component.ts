import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { DeleteSeasonError, SeasonsService } from 'src/app/core/services/seasons/seasons.service';
import {
  Season,
  SeasonRolloverResult,
  SeasonUsage,
} from 'src/app/core/services/seasons/season.model';
import { SeasonStateService } from 'src/app/core/services/season/season-state.service';
import { setClubSeasonsCache } from 'src/app/core/utils/season.utils';

/**
 * Pantalla "Mi temporada": gestión de temporadas del club.
 *
 * Solo accesible para el dueño del club (clubs.user_id) — la ruta está
 * protegida por `ClubOwnerGuard`. El backend valida además la propiedad
 * en cada operación de escritura.
 *
 * Permite:
 *  - Ver el catálogo de temporadas con marca de cuál es la actual.
 *  - Crear una nueva temporada. NO autocrea equipos placeholder: el club
 *    debe crear sus propios equipos como primer paso del onboarding.
 *    "Sin equipo" se materializa on-demand al hacer rollover de jugadores.
 *  - Marcar otra temporada como actual (afecta a todo el club).
 *  - Mover jugadores no-baja al equipo "Sin equipo" de la temporada destino.
 */
@Component({
  selector: 'app-mi-temporada',
  templateUrl: './mi-temporada.component.html',
  styleUrls: ['./mi-temporada.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiTemporadaComponent implements OnInit {

  clubId = 0;
  loading = true;

  seasons: Season[] = [];

  /** Año sugerido para la próxima temporada (se calcula en cliente). */
  suggestedNextYear = '';

  // ── Estado del wizard "crear temporada" ──
  creatingSeason = false;
  newYear = '';
  /** Fecha de inicio de la nueva temporada en formato ISO ("YYYY-MM-DD"). */
  newStartDate = '';
  /**
   * Fecha de fin de la nueva temporada en formato ISO ("YYYY-MM-DD"). Opcional:
   * si se deja vacía, el backend la calcula como {@code start + 1 año - 1 día}.
   * El club puede usar duraciones distintas (>365 días) si su calendario lo
   * requiere (pretemporada larga, ligas paralelas, etc.).
   */
  newEndDate = '';
  newSetAsCurrent = false;

  // ── Estado del wizard "rollover" ──
  rolloverFromSeasonId: number | null = null;
  rolloverToSeasonId: number | null = null;
  rollingOver = false;
  lastRolloverResult: SeasonRolloverResult | null = null;

  // ── Estado de "marcar como actual" ──
  markingCurrent = false;

  // ── Estado del wizard "editar temporada" ──
  // Antes era solo "renombrar" (cambio de year). Ahora permite también
  // ajustar startDate/endDate, lo que da al club flexibilidad total para
  // adaptar el calendario (corregir un error de fechas, ampliar a >365 días
  // para incluir pretemporada o competiciones específicas, etc.).
  /** ID de la temporada que se está editando, o null si no hay wizard abierto. */
  renamingSeasonId: number | null = null;
  renameYearValue = '';
  /** Fecha de inicio (ISO) que se está editando. Vacío = no cambiar. */
  renameStartDate = '';
  /** Fecha de fin (ISO) que se está editando. Vacío = no cambiar. */
  renameEndDate = '';
  /** Año original (year) de la temporada en edición; usado para detectar cambios. */
  private renameOriginalYear = '';
  /** Fecha inicio original (ISO) usada para detectar cambios. */
  private renameOriginalStart = '';
  /** Fecha fin original (ISO) usada para detectar cambios. */
  private renameOriginalEnd = '';
  rename = { saving: false };

  // ── Estado del modal "eliminar temporada" ──
  /**
   * Temporada que se está intentando eliminar (lo abre el botón rojo de la
   * tarjeta). null = modal cerrado.
   */
  deletingSeason: Season | null = null;
  /** Resumen de uso devuelto por el backend (null mientras se carga). */
  deleteUsage: SeasonUsage | null = null;
  /** true mientras llamamos al endpoint usage para mostrar el resumen. */
  loadingDeleteUsage = false;
  /** El usuario debe marcar este checkbox para activar el botón "Eliminar". */
  deleteAcknowledged = false;
  /** Año que el usuario escribe para confirmar (debe coincidir con season.year). */
  deleteConfirmYear = '';
  /** true mientras se está enviando el DELETE al backend. */
  deletingInFlight = false;
  /** Mensaje de error visible en el modal cuando el backend devuelve 409 con datos asociados. */
  deleteBlockedReason: 'has_data' | 'is_current' | null = null;
  /** Counts del 409 si la temporada quedó bloqueada por tener datos. */
  deleteBlockedUsage: SeasonUsage | null = null;

  constructor(
    private location: Location,
    private router: Router,
    private seasonsService: SeasonsService,
    private seasonState: SeasonStateService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const cached = sessionStorage.getItem('clubId') ?? localStorage.getItem('clubId');
    this.clubId = Number(cached) || 0;
    if (this.clubId <= 0) {
      this.toastr.error(this.translate.instant('MI_TEMPORADA.ERROR_NO_CLUB'));
      this.router.navigate(['/dashboard/inicio']);
      return;
    }
    this.loadSeasons();
  }

  goBack(): void {
    this.location.back();
  }

  // ── Lectura ──────────────────────────────────────────────────────────────

  loadSeasons(): void {
    this.loading = true;
    this.seasonsService.list(this.clubId).subscribe({
      next: (seasons) => {
        // Ordenamos por startDate desc y, si dos comparten startDate (o falta),
        // por seasonId desc. Antes ordenábamos por Number(year) desc, lo cual
        // dejaba de funcionar al permitir nombres libres ("Liga 25-26").
        this.seasons = (seasons || []).slice().sort((a, b) => {
          const da = a?.startDate ? Date.parse(a.startDate) : NaN;
          const db = b?.startDate ? Date.parse(b.startDate) : NaN;
          if (!Number.isNaN(da) && !Number.isNaN(db) && da !== db) {
            return db - da;
          }
          return (b?.seasonId ?? 0) - (a?.seasonId ?? 0);
        });
        this.suggestedNextYear = this.computeNextYear(this.seasons);
        // Refrescar la caché global del catálogo de temporadas del club.
        // Así el chip-row de "Mis equipos", "Contabilidad", etc. solo muestra
        // las temporadas reales (no el rango heurístico 2022..N+1).
        setClubSeasonsCache(this.seasons.map((s) => ({
          year: s.year,
          label: s.label,
          current: s.current === true,
        })));
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.seasons = [];
        this.loading = false;
        this.toastr.error(this.translate.instant('MI_TEMPORADA.ERROR_LOAD'));
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * Sugiere un nombre por defecto para la próxima temporada. Si todas las
   * temporadas existentes son numéricas (formato legacy "YYYY"), devuelve
   * `max+1`. Si alguna es texto libre ("Liga 25-26"), no podemos
   * auto-incrementar de forma fiable y devolvemos cadena vacía: el usuario
   * tecleará el nombre manualmente.
   */
  private computeNextYear(seasons: Season[]): string {
    if (!seasons || seasons.length === 0) {
      return String(new Date().getFullYear());
    }
    const allNumeric = seasons.every((s) => /^\d+$/.test((s.year ?? '').trim()));
    if (!allNumeric) {
      return '';
    }
    const maxYear = Math.max(...seasons.map((s) => Number(s.year) || 0));
    return String((maxYear || new Date().getFullYear()) + 1);
  }

  get currentSeason(): Season | null {
    return this.seasons.find((s) => s.current === true) ?? null;
  }

  // ── Crear temporada ──────────────────────────────────────────────────────

  openCreate(): void {
    this.newYear = this.suggestedNextYear;
    this.newStartDate = '';
    this.newEndDate = '';
    this.newSetAsCurrent = false;
    this.creatingSeason = true;
    this.cdr.markForCheck();
  }

  cancelCreate(): void {
    this.creatingSeason = false;
    this.newStartDate = '';
    this.newEndDate = '';
    this.cdr.markForCheck();
  }

  submitCreate(): void {
    const trimmedYear = (this.newYear ?? '').trim();
    if (!trimmedYear || trimmedYear.length > 50) {
      this.toastr.warning(this.translate.instant('MI_TEMPORADA.WARN_INVALID_YEAR'));
      return;
    }
    if (!this.newStartDate || !/^\d{4}-\d{2}-\d{2}$/.test(this.newStartDate)) {
      this.toastr.warning(this.translate.instant('MI_TEMPORADA.WARN_INVALID_START_DATE'));
      return;
    }
    // endDate es opcional: si se deja vacío, el backend lo calcula como
    // start + 1 año - 1 día. Si se rellena, validamos que sea posterior a
    // startDate (el backend también valida pero damos feedback inmediato).
    if (this.newEndDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(this.newEndDate)) {
        this.toastr.warning(this.translate.instant('MI_TEMPORADA.WARN_INVALID_END_DATE'));
        return;
      }
      if (this.newEndDate <= this.newStartDate) {
        this.toastr.warning(this.translate.instant('MI_TEMPORADA.WARN_END_BEFORE_START'));
        return;
      }
    }
    const body: { year: string; startDate: string; endDate?: string; setAsCurrent: boolean } = {
      year: trimmedYear,
      startDate: this.newStartDate,
      setAsCurrent: this.newSetAsCurrent,
    };
    if (this.newEndDate) {
      body.endDate = this.newEndDate;
    }
    this.seasonsService.create(this.clubId, body).subscribe({
      next: (created) => {
        this.toastr.success(this.translate.instant('MI_TEMPORADA.MSG_CREATED'));
        this.creatingSeason = false;
        if (created.current === true) {
          this.seasonState.set(created.year);
        }
        this.loadSeasons();
      },
      error: (err) => {
        const msg = err?.error?.message || err?.message || this.translate.instant('MI_TEMPORADA.ERROR_CREATE');
        this.toastr.error(msg);
        this.cdr.markForCheck();
      },
    });
  }

  // ── Marcar como actual ───────────────────────────────────────────────────

  markAsCurrent(season: Season): void {
    if (this.markingCurrent || season.current === true) return;
    const ok = window.confirm(
      this.translate.instant('MI_TEMPORADA.CONFIRM_MARK_CURRENT', { label: season.label }),
    );
    if (!ok) return;
    this.markingCurrent = true;
    this.seasonsService.markAsCurrent(this.clubId, season.seasonId).subscribe({
      next: (res) => {
        this.markingCurrent = false;
        if (!res.success) {
          this.toastr.error(this.translate.instant('MI_TEMPORADA.ERROR_MARK_CURRENT'));
          return;
        }
        this.toastr.success(this.translate.instant('MI_TEMPORADA.MSG_MARKED_CURRENT'));
        this.seasonState.set(season.year);
        this.loadSeasons();
      },
      error: () => {
        this.markingCurrent = false;
        this.toastr.error(this.translate.instant('MI_TEMPORADA.ERROR_MARK_CURRENT'));
        this.cdr.markForCheck();
      },
    });
  }

  // ── Rollover de jugadores ────────────────────────────────────────────────

  /** Sugiere los IDs por defecto: from = actual, to = la más reciente que no sea la actual. */
  prepareRollover(): void {
    const current = this.currentSeason;
    if (!current) return;
    this.rolloverFromSeasonId = current.seasonId;
    const others = this.seasons.filter((s) => s.seasonId !== current.seasonId);
    this.rolloverToSeasonId = others.length > 0 ? others[0].seasonId : null;
    this.lastRolloverResult = null;
    this.cdr.markForCheck();
  }

  cancelRollover(): void {
    this.rolloverFromSeasonId = null;
    this.rolloverToSeasonId = null;
    this.lastRolloverResult = null;
    this.cdr.markForCheck();
  }

  submitRollover(): void {
    if (!this.rolloverFromSeasonId || !this.rolloverToSeasonId) {
      this.toastr.warning(this.translate.instant('MI_TEMPORADA.WARN_SELECT_SEASONS'));
      return;
    }
    if (this.rolloverFromSeasonId === this.rolloverToSeasonId) {
      this.toastr.warning(this.translate.instant('MI_TEMPORADA.WARN_SAME_SEASON'));
      return;
    }
    const ok = window.confirm(this.translate.instant('MI_TEMPORADA.CONFIRM_ROLLOVER'));
    if (!ok) return;

    this.rollingOver = true;
    this.seasonsService
      .rolloverPlayers(this.clubId, {
        fromSeasonId: this.rolloverFromSeasonId,
        toSeasonId: this.rolloverToSeasonId,
      })
      .subscribe({
        next: (res) => {
          this.rollingOver = false;
          this.lastRolloverResult = res;
          this.toastr.success(
            this.translate.instant('MI_TEMPORADA.MSG_ROLLOVER_OK', {
              moved: res.playersMoved,
              skipped: res.playersSkippedBaja,
            }),
          );
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.rollingOver = false;
          const msg = err?.error?.message || this.translate.instant('MI_TEMPORADA.ERROR_ROLLOVER');
          this.toastr.error(msg);
          this.cdr.markForCheck();
        },
      });
  }

  trackBySeasonId(_index: number, season: Season): number {
    return season.seasonId;
  }

  // ── Editar temporada (year + fechas) ─────────────────────────────────────

  /**
   * Abre el wizard de edición para la temporada {@code season}.
   *
   * Permite modificar nombre/year, fecha inicio y fecha fin. Cualquier campo
   * que se deje sin tocar mantiene su valor actual en backend.
   */
  openRenameSeason(season: Season): void {
    this.renamingSeasonId = season.seasonId;
    this.renameYearValue = season.year || '';
    this.renameOriginalYear = season.year || '';
    this.renameStartDate = this.toDateInputValue(season.startDate);
    this.renameOriginalStart = this.renameStartDate;
    this.renameEndDate = this.toDateInputValue(season.endDate);
    this.renameOriginalEnd = this.renameEndDate;
    this.rename.saving = false;
    this.cdr.markForCheck();
  }

  cancelRename(): void {
    this.renamingSeasonId = null;
    this.renameYearValue = '';
    this.renameStartDate = '';
    this.renameEndDate = '';
    this.renameOriginalYear = '';
    this.renameOriginalStart = '';
    this.renameOriginalEnd = '';
    this.rename.saving = false;
    this.cdr.markForCheck();
  }

  /**
   * Convierte un valor que puede ser ISO completo o "YYYY-MM-DD" en el
   * formato que espera <input type="date"> ("YYYY-MM-DD"). Devuelve cadena
   * vacía si la entrada es null/undefined/inválida.
   */
  private toDateInputValue(raw: string | null | undefined): string {
    if (!raw) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(raw);
    return m ? m[1] : '';
  }

  /**
   * Envía los cambios al backend (PUT /rest/club/{clubId}/seasons/{seasonId}).
   * El endpoint valida la propiedad del club y, si cambia el year, migra los
   * TeamEntity asociados a la temporada antigua al nuevo year para que las
   * referencias de jugadores/ropa/pagos sigan funcionando.
   *
   * Solo se envían los campos que el usuario haya modificado respecto al
   * estado original; el resto se omite del body para no tocarlos.
   */
  submitRename(): void {
    if (this.renamingSeasonId === null) return;
    const target = this.seasons.find((s) => s.seasonId === this.renamingSeasonId);
    if (!target) {
      this.cancelRename();
      return;
    }
    const newYear = this.renameYearValue.trim();
    if (!newYear || newYear.length > 50) {
      this.toastr.warning(this.translate.instant('MI_TEMPORADA.WARN_INVALID_YEAR'));
      return;
    }
    const newStart = this.renameStartDate.trim();
    const newEnd = this.renameEndDate.trim();
    if (newStart && !/^\d{4}-\d{2}-\d{2}$/.test(newStart)) {
      this.toastr.warning(this.translate.instant('MI_TEMPORADA.WARN_INVALID_START_DATE'));
      return;
    }
    if (newEnd && !/^\d{4}-\d{2}-\d{2}$/.test(newEnd)) {
      this.toastr.warning(this.translate.instant('MI_TEMPORADA.WARN_INVALID_END_DATE'));
      return;
    }
    // Si el usuario indica ambas fechas, validar relación start < end.
    // Si solo una de ellas viene rellena, se compara contra el valor actual
    // de la otra (para no permitir un end <= start "histórico").
    const effectiveStart = newStart || this.renameOriginalStart;
    const effectiveEnd = newEnd || this.renameOriginalEnd;
    if (effectiveStart && effectiveEnd && effectiveEnd <= effectiveStart) {
      this.toastr.warning(this.translate.instant('MI_TEMPORADA.WARN_END_BEFORE_START'));
      return;
    }

    const body: { year?: string; startDate?: string; endDate?: string } = {};
    if (newYear !== this.renameOriginalYear) body.year = newYear;
    if (newStart && newStart !== this.renameOriginalStart) body.startDate = newStart;
    if (newEnd && newEnd !== this.renameOriginalEnd) body.endDate = newEnd;
    if (Object.keys(body).length === 0) {
      this.cancelRename();
      return;
    }

    this.rename.saving = true;
    this.seasonsService.update(this.clubId, this.renamingSeasonId, body).subscribe({
      next: (updated) => {
        this.rename.saving = false;
        this.renamingSeasonId = null;
        this.toastr.success(this.translate.instant('MI_TEMPORADA.MSG_EDITED'));
        if (updated && updated.current === true) {
          this.seasonState.set(updated.year);
        }
        this.loadSeasons();
      },
      error: (err) => {
        this.rename.saving = false;
        const msg = err?.error?.message
          || err?.error?.error?.msg
          || this.translate.instant('MI_TEMPORADA.ERROR_EDIT');
        this.toastr.error(msg);
        this.cdr.markForCheck();
      },
    });
  }

  // ── Eliminar temporada ───────────────────────────────────────────────────

  /**
   * Abre el modal de confirmación de borrado para la temporada {@code season}.
   * Carga inmediatamente el resumen de uso para mostrar al usuario qué datos
   * tiene asociados y si está vacía. La temporada actual del club no llega
   * aquí porque la UI oculta el botón en ese caso, pero el backend la rechaza
   * igualmente como defensa en profundidad.
   */
  openDeleteSeason(season: Season): void {
    if (!season || season.current === true) return;
    this.deletingSeason = season;
    this.deleteUsage = null;
    this.deleteAcknowledged = false;
    this.deleteConfirmYear = '';
    this.deletingInFlight = false;
    this.deleteBlockedReason = null;
    this.deleteBlockedUsage = null;
    this.loadingDeleteUsage = true;
    this.cdr.markForCheck();

    this.seasonsService.getUsage(this.clubId, season.seasonId).subscribe({
      next: (usage) => {
        this.deleteUsage = usage;
        this.loadingDeleteUsage = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingDeleteUsage = false;
        this.deleteUsage = { realTeams: 0, placeholderTeams: 0, players: 0 };
        this.cdr.markForCheck();
      },
    });
  }

  cancelDeleteSeason(): void {
    this.deletingSeason = null;
    this.deleteUsage = null;
    this.deleteAcknowledged = false;
    this.deleteConfirmYear = '';
    this.deletingInFlight = false;
    this.deleteBlockedReason = null;
    this.deleteBlockedUsage = null;
    this.cdr.markForCheck();
  }

  /**
   * @returns true cuando ya se pueden disparar el DELETE: el resumen de uso
   * está cargado, la temporada está vacía, el usuario marcó el checkbox de
   * comprensión y escribió el año exacto.
   */
  get canConfirmDelete(): boolean {
    if (!this.deletingSeason) return false;
    if (this.loadingDeleteUsage) return false;
    if (this.deletingInFlight) return false;
    if (!this.deleteAcknowledged) return false;
    if (this.deleteConfirmYear.trim() !== this.deletingSeason.year) return false;
    // Si ya tenemos usage cargado y NO está vacía, bloquear.
    if (this.deleteUsage && !this.isUsageEmpty(this.deleteUsage)) return false;
    return true;
  }

  isUsageEmpty(usage: SeasonUsage | null | undefined): boolean {
    if (!usage) return false;
    return usage.realTeams === 0 && usage.players === 0;
  }

  submitDeleteSeason(): void {
    if (!this.canConfirmDelete || !this.deletingSeason) return;
    const seasonToDelete = this.deletingSeason;
    this.deletingInFlight = true;
    this.cdr.markForCheck();

    this.seasonsService.delete(this.clubId, seasonToDelete.seasonId).subscribe({
      next: () => {
        this.deletingInFlight = false;
        this.toastr.success(
          this.translate.instant('MI_TEMPORADA.MSG_DELETED', { label: seasonToDelete.label }),
        );
        this.cancelDeleteSeason();
        this.loadSeasons();
      },
      error: (err: DeleteSeasonError | unknown) => {
        this.deletingInFlight = false;
        const e = err as DeleteSeasonError;
        if (e?.code === 'season_has_data') {
          this.deleteBlockedReason = 'has_data';
          this.deleteBlockedUsage = e.usage ?? null;
        } else if (e?.code === 'season_is_current') {
          this.deleteBlockedReason = 'is_current';
        } else {
          // Error desconocido: mantener modal abierto y notificar.
          this.toastr.error(this.translate.instant('MI_TEMPORADA.ERROR_DELETE'));
        }
        this.cdr.markForCheck();
      },
    });
  }
}
