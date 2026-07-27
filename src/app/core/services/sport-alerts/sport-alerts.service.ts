import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { getSportConfig, SportAlertRule } from '../../models/sport/sport-config.model';

export interface ActiveAlert {
  id: string;
  message: string;
  messageKey: string;
  severity: 'info' | 'warning' | 'critical';
  sport: string;
  fieldKey: string;
  value: number;
  threshold: number;
  timestamp: Date;
  dismissed: boolean;
}

@Injectable({ providedIn: 'root' })
export class SportAlertsService {
  private alerts$ = new BehaviorSubject<ActiveAlert[]>([]);
  readonly alerts = this.alerts$.asObservable();

  /** Evalúa las stats del partido y genera alertas según las reglas del deporte */
  evaluateMatchStats(sport: string, stats: Record<string, number>): ActiveAlert[] {
    const cfg = getSportConfig(sport);
    const rules: SportAlertRule[] = cfg.alertRules ?? [];
    const newAlerts: ActiveAlert[] = [];

    for (const rule of rules) {
      const value = stats[rule.fieldKey];
      if (value === undefined || value === null) continue;

      const triggered = rule.direction === 'above'
        ? value > rule.threshold
        : value < rule.threshold;

      if (triggered) {
        newAlerts.push({
          id: `${rule.id}-${Date.now()}`,
          message: '',
          messageKey: rule.messageKey,
          severity: rule.severity,
          sport,
          fieldKey: rule.fieldKey,
          value,
          threshold: rule.threshold,
          timestamp: new Date(),
          dismissed: false
        });
      }
    }

    if (newAlerts.length > 0) {
      const current = this.alerts$.value;
      this.alerts$.next([...current, ...newAlerts]);
    }

    return newAlerts;
  }

  dismiss(alertId: string): void {
    const updated = this.alerts$.value.map(a =>
      a.id === alertId ? { ...a, dismissed: true } : a
    );
    this.alerts$.next(updated);
  }

  clearAll(): void {
    this.alerts$.next([]);
  }

  get activeCount(): number {
    return this.alerts$.value.filter(a => !a.dismissed).length;
  }
}
