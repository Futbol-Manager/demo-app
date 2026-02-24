import { Component, OnInit, OnDestroy } from '@angular/core';
import { ClubService } from '../../../core/services/club/club.service';
import { LoginService } from '../../../core/services/login/login.service';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-notification-bell',
  templateUrl: './notification-bell.component.html',
  styleUrls: ['./notification-bell.component.scss']
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  unreadCount = 0;
  notifications: any[] = [];
  showDropdown = false;
  loading = false;
  userId = 0;
  private pollSub?: Subscription;

  constructor(
    private clubService: ClubService,
    private loginService: LoginService
  ) {}

  ngOnInit() {
    this.loginService.usuarioActual.subscribe(user => {
      if (user) {
        this.userId = user.userId;
        this.loadUnreadCount();
        this.pollSub = interval(60000).subscribe(() => this.loadUnreadCount());
      }
    });
  }

  ngOnDestroy() {
    this.pollSub?.unsubscribe();
  }

  loadUnreadCount() {
    if (!this.userId) return;
    this.clubService.getUnreadNotificationCount(this.userId).subscribe({
      next: (resp: any) => { this.unreadCount = resp.data?.count || 0; }
    });
  }

  toggleDropdown() {
    this.showDropdown = !this.showDropdown;
    if (this.showDropdown) this.loadNotifications();
  }

  loadNotifications() {
    if (!this.userId) return;
    this.loading = true;
    this.clubService.getNotifications(this.userId).subscribe({
      next: (resp: any) => {
        this.notifications = (resp.data || []).slice(0, 20);
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  markAsRead(notif: any) {
    this.clubService.markNotificationRead(notif.id).subscribe(() => {
      notif.leida = true;
      this.unreadCount = Math.max(0, this.unreadCount - 1);
    });
  }

  markAllRead() {
    this.clubService.markAllNotificationsRead(this.userId).subscribe(() => {
      this.notifications.forEach(n => n.leida = true);
      this.unreadCount = 0;
    });
  }

  getNotifIcon(tipo: string): string {
    switch (tipo) {
      case 'PAGO_EXITOSO': return 'bi-check-circle-fill text-success';
      case 'PAGO_FALLIDO': return 'bi-exclamation-triangle-fill text-danger';
      case 'SUSCRIPCION_CREADA': return 'bi-arrow-repeat text-primary';
      case 'SUSCRIPCION_CANCELADA': return 'bi-x-circle-fill text-danger';
      case 'SUSCRIPCION_PAUSADA': return 'bi-pause-circle-fill text-warning';
      case 'TARJETA_GUARDADA': return 'bi-credit-card-fill text-info';
      case 'RECORDATORIO_PAGO': return 'bi-clock-fill text-warning';
      default: return 'bi-bell-fill';
    }
  }
}
