import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { TrackingService } from '../core/services/tracking/tracking.service';
import { SidebarService } from '../core/services/sidebar/sidebar.service';

/** Routes that should render fullscreen (no sidebar, header, FAB) */
const FULLSCREEN_ROUTES = [
  '/dashboard/video-analysis/canvas-tagger',
  '/dashboard/video-analysis/screen-capture',
  '/dashboard/video-analysis/external-workspace'
];

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {

  private routerSub: Subscription | null = null;

  /** True when the current route should be fullscreen (no shell chrome) */
  isFullscreenRoute = false;

  constructor(
    private router: Router,
    private trackingService: TrackingService,
    public sidebarService: SidebarService
  ) {}

  ngOnInit(): void {
    this.trackingService.startSession();
    this.checkRoute(this.router.url);

    this.routerSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event) => {
        const navEnd = event as NavigationEnd;
        const path = navEnd.urlAfterRedirects || navEnd.url;
        this.checkRoute(path);
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

  private checkRoute(path: string): void {
    this.isFullscreenRoute = FULLSCREEN_ROUTES.some(r => path.includes(r));
  }

  private getRouteDescription(path: string): string {
    const segments = path.split('/').filter(s => s.length > 0);
    const last = segments[segments.length - 1] || 'inicio';
    return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, ' ');
  }
}

