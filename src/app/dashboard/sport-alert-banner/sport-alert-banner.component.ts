import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { SportAlertsService, ActiveAlert } from '../../core/services/sport-alerts/sport-alerts.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-sport-alert-banner',
  templateUrl: './sport-alert-banner.component.html',
  styleUrls: ['./sport-alert-banner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SportAlertBannerComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  visibleAlerts: ActiveAlert[] = [];

  constructor(
    private alertsService: SportAlertsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.alertsService.alerts.pipe(takeUntil(this.destroy$)).subscribe(alerts => {
      this.visibleAlerts = alerts.filter(a => !a.dismissed).slice(-5);
      this.cdr.markForCheck();
    });
  }

  dismiss(id: string): void {
    this.alertsService.dismiss(id);
  }

  getSeverityIcon(severity: string): string {
    const icons: Record<string, string> = { info: 'ℹ️', warning: '⚠️', critical: '🔴' };
    return icons[severity] ?? 'ℹ️';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
