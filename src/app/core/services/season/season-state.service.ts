import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import {
  getSelectedSeason,
  getSelectedSeasonLabel,
  setSelectedSeason as utilSetSeason,
} from '../../utils/season.utils';

/**
 * Versión demo-friendly del servicio de estado de temporada.
 *
 * <p>Mantiene el estado reactivo de la temporada seleccionada sin depender del
 * catálogo real del club (SeasonsService). Emite la temporada actual calculada
 * localmente y persiste la selección manual en sessionStorage. Suficiente para
 * las pantallas portadas al modo demo (metodologías, microciclos, etc.).</p>
 */
@Injectable({ providedIn: 'root' })
export class SeasonStateService {

  private readonly _season$ = new BehaviorSubject<string>(getSelectedSeason());
  private readonly _label$  = new BehaviorSubject<string>(getSelectedSeasonLabel());

  private manualSelection = false;

  /** Observable de la temporada activa como año simple ("2025"). */
  readonly season$ = this._season$.asObservable();

  /** Observable del label visual de la temporada activa ("2025/2026"). */
  readonly label$ = this._label$.asObservable();

  /** Valor actual de la temporada (año simple). */
  get current(): string { return this._season$.getValue(); }

  /** Label visual actual ("2025/2026"). */
  get label(): string { return this._label$.getValue(); }

  /** Cambia la temporada activa y notifica a todos los suscriptores. */
  set(year: string, manual: boolean = false): void {
    if (manual) this.manualSelection = true;
    if (year === this._season$.getValue()) return;
    utilSetSeason(year);
    this._season$.next(year);
    this._label$.next(getSelectedSeasonLabel());
  }

  /** Indica si el usuario ha elegido explícitamente una temporada en esta sesión. */
  hasManualSelection(): boolean {
    return this.manualSelection;
  }

  /** Fuerza la re-lectura desde sessionStorage. */
  refresh(): void {
    const season = getSelectedSeason();
    if (season !== this._season$.getValue()) {
      this._season$.next(season);
      this._label$.next(getSelectedSeasonLabel());
    }
  }

  /** No-op en modo demo (no hay catálogo de backend que sincronizar). */
  bootstrapFromBackend(_clubId: number, _forceCurrent: boolean = false): Observable<void> {
    return of(undefined);
  }

  /** Limpia el estado de selección manual (llamar al hacer logout). */
  clearBootstrap(): void {
    this.manualSelection = false;
  }
}
