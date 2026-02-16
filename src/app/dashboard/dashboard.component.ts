import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { TrackingService } from '../core/services/tracking/tracking.service';
import { SidebarService } from '../core/services/sidebar/sidebar.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {

  private routerSub: Subscription | null = null;

  constructor(
    private router: Router,
    private trackingService: TrackingService,
    public sidebarService: SidebarService
  ) {}

  ngOnInit(): void {
    this.trackingService.startSession();

    this.routerSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event) => {
        const navEnd = event as NavigationEnd;
        const path = navEnd.urlAfterRedirects || navEnd.url;
        const description = this.getRouteDescription(path);
        this.trackingService.trackNavigation(path, description);
      });
  }

  ngOnDestroy(): void {
    if (this.routerSub) {
      this.routerSub.unsubscribe();
    }
    this.trackingService.stopSession();
  }

  private getRouteDescription(path: string): string {
    const segments = path.split('/').filter(s => s.length > 0);
    const last = segments[segments.length - 1] || 'inicio';
    return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, ' ');
  }
}

