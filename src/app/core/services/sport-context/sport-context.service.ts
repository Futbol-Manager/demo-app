import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SportConfig, getSportConfig } from '../../models/sport/sport-config.model';

@Injectable({
  providedIn: 'root'
})
export class SportContextService {
  private readonly _currentSport$ = new BehaviorSubject<string>('futbol');

  /** Todos los deportes presentes en los equipos del club (multi-deporte) */
  private _clubSports: string[] = [];

  readonly currentSport$ = this._currentSport$.asObservable();

  setSport(sport: string | undefined | null): void {
    const resolved = sport || 'futbol';
    if (this._currentSport$.value !== resolved) {
      this._currentSport$.next(resolved);
    }
  }

  getSport(): string {
    return this._currentSport$.value;
  }

  /**
   * Registra todos los deportes únicos presentes en los equipos del club.
   * Llamar cuando se cargue la lista de equipos.
   */
  setClubSports(sports: string[]): void {
    const unique = [...new Set(sports.map(s => s || 'futbol').filter(Boolean))];
    if (JSON.stringify(unique.sort()) !== JSON.stringify([...this._clubSports].sort())) {
      this._clubSports = unique;
    }
  }

  /**
   * Devuelve todos los deportes únicos del club.
   * Si no hay datos registrados, devuelve el deporte actual como fallback.
   */
  getClubSports(): string[] {
    return this._clubSports.length > 0 ? this._clubSports : [this._currentSport$.value];
  }

  /** True si el club tiene equipos de más de un deporte */
  isMultiSport(): boolean {
    return this._clubSports.length > 1;
  }

  getConfig(): SportConfig {
    return getSportConfig(this._currentSport$.value);
  }

  getConfigFor(sport: string): SportConfig {
    return getSportConfig(sport);
  }

  isFutbol(): boolean {
    const s = this._currentSport$.value;
    return s === 'futbol' || s === 'futbol-sala';
  }

  hasGoalkeeper(): boolean {
    return this.getConfig().hasGoalkeeper;
  }
}
