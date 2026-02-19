import { Component, Input, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { TeamService } from '../../../../core/services/team/team.service';

@Component({
  selector: 'app-subscription-manager',
  templateUrl: './subscription-manager.component.html',
  styleUrls: ['./subscription-manager.component.scss']
})
export class SubscriptionManagerComponent implements OnInit {

  @Input() clubId!: number;

  subscriptions: any[] = [];
  loading = false;
  filterStatus = '';

  constructor(
    private teamService: TeamService,
    private translate: TranslateService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadSubscriptions();
  }

  loadSubscriptions(): void {
    this.loading = true;
    this.teamService.getClubSubscriptions(this.clubId).subscribe({
      next: (resp: any) => {
        this.subscriptions = resp?.data ?? [];
        this.loading = false;
      },
      error: () => {
        this.toastr.error(this.translate.instant('PAYMENTS.SUBSCRIPTIONS.LOAD_ERROR'));
        this.loading = false;
      }
    });
  }

  get filteredSubscriptions(): any[] {
    if (!this.filterStatus) return this.subscriptions;
    return this.subscriptions.filter(s => s.status === this.filterStatus);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'active': return 'status-active';
      case 'paused': return 'status-paused';
      case 'canceled': return 'status-canceled';
      default: return '';
    }
  }

  pauseSubscription(sub: any): void {
    this.teamService.pauseSubscription({ subscriptionId: sub.subscriptionId, clubId: this.clubId }).subscribe({
      next: () => {
        this.toastr.success(this.translate.instant('PAYMENTS.SUBSCRIPTIONS.PAUSED'));
        this.loadSubscriptions();
      },
      error: () => {
        this.toastr.error(this.translate.instant('PAYMENTS.SUBSCRIPTIONS.PAUSE_ERROR'));
      }
    });
  }

  resumeSubscription(sub: any): void {
    this.teamService.resumeSubscription({ subscriptionId: sub.subscriptionId, clubId: this.clubId }).subscribe({
      next: () => {
        this.toastr.success(this.translate.instant('PAYMENTS.SUBSCRIPTIONS.RESUMED'));
        this.loadSubscriptions();
      },
      error: () => {
        this.toastr.error(this.translate.instant('PAYMENTS.SUBSCRIPTIONS.RESUME_ERROR'));
      }
    });
  }

  cancelSubscription(sub: any): void {
    this.teamService.cancelPlayerSubscription({ subscriptionId: sub.subscriptionId, clubId: this.clubId }).subscribe({
      next: () => {
        this.toastr.success(this.translate.instant('PAYMENTS.SUBSCRIPTIONS.CANCELED'));
        this.loadSubscriptions();
      },
      error: () => {
        this.toastr.error(this.translate.instant('PAYMENTS.SUBSCRIPTIONS.CANCEL_ERROR'));
      }
    });
  }
}
