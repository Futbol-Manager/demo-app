import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { getSportConfig, SportConfig } from 'src/app/core/models/sport/sport-config.model';

/**
 * Servicio global que mantiene el deporte activo del equipo seleccionado.
 * Se emite en los puntos de entrada (equipos, inicio) y se consume en todos
 * los componentes hijo que necesiten adaptar su UI al deporte.
 */
@Injectable({ providedIn: 'root' })
export class SportContextService {
  private sportSubject = new BehaviorSubject<string>('futbol');

  /** Observable del deporte activo. Emite cada vez que cambia el equipo seleccionado. */
  currentSport$ = this.sportSubject.asObservable();

  /** Establece el deporte activo (llamar al navegar a un equipo). */
  setSport(sport: string): void {
    this.sportSubject.next(sport || 'futbol');
  }

  /** Devuelve el deporte activo actual de forma síncrona. */
  getSport(): string {
    return this.sportSubject.value;
  }

  /** Devuelve la configuración completa del deporte activo. */
  getConfig(): SportConfig {
    return getSportConfig(this.getSport());
  }
}
