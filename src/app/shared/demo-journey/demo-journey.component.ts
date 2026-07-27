import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { DemoJourneyService, JourneyMilestone } from '../../core/services/demo/demo-journey.service';
import { DemoService } from '../../core/services/demo/demo.service';
import { DemoCouponService } from '../../core/services/demo/demo-coupon.service';
import { DemoAnalyticsService } from '../../core/services/demo/demo-analytics.service';

/** Plazas de la oferta Club Fundador. Actualizar TAKEN a medida que se cierren clubes. */
const FOUNDER_SLOTS_TOTAL = 10;
const FOUNDER_SLOTS_TAKEN = 1;

const WHATSAPP_NUMBER = '34623911772';
const PLANS_WIZARD_URL = 'https://appsphairatech.com/suscripcion-club/wizard?planType=club';

/**
 * Recorrido guiado de la demo: barra de progreso flotante con los hitos que enseñan
 * el producto, y oferta Club Fundador al completarlos.
 *
 * Sustituye a los tutoriales que se abrían solos en cada pantalla: en vez de explicar
 * todo de golpe, propone cuatro cosas concretas que ver y remata con la oferta cuando
 * el visitante ya entiende para qué sirve Sphaira.
 */
@Component({
  selector: 'app-demo-journey',
  templateUrl: './demo-journey.component.html',
  styleUrls: ['./demo-journey.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemoJourneyComponent implements OnInit, OnDestroy {
  milestones: JourneyMilestone[] = [];
  visible = false;
  offerOpen = false;
  collapsed = false;
  inDashboard = false;

  readonly slotsLeft = Math.max(0, FOUNDER_SLOTS_TOTAL - FOUNDER_SLOTS_TAKEN);
  readonly slotsTotal = FOUNDER_SLOTS_TOTAL;

  private subs = new Subscription();

  constructor(
    public journey: DemoJourneyService,
    private router: Router,
    private demoService: DemoService,
    private demoCoupon: DemoCouponService,
    private demoAnalytics: DemoAnalyticsService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    if (!this.demoService.isDemoMode()) return;
    this.journey.init();

    // El widget solo tiene sentido dentro del producto, no en la intro ni en la
    // pantalla de selección de rol.
    this.inDashboard = this.router.url.startsWith('/dashboard');
    this.subs.add(this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.inDashboard = event.urlAfterRedirects.startsWith('/dashboard');
        this.cdr.markForCheck();
      }
    }));

    this.subs.add(this.journey.milestones$.subscribe((m) => {
      this.milestones = m;
      this.cdr.markForCheck();
    }));
    this.subs.add(this.journey.visible$.subscribe((v) => {
      this.visible = v;
      this.cdr.markForCheck();
    }));
    this.subs.add(this.journey.offerOpen$.subscribe((o) => {
      this.offerOpen = o;
      this.cdr.markForCheck();
    }));
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  get completed(): number {
    return this.milestones.filter((m) => m.done).length;
  }

  get total(): number {
    return this.milestones.length;
  }

  get progressPercent(): number {
    return this.total ? Math.round((this.completed / this.total) * 100) : 0;
  }

  get allDone(): boolean {
    return this.total > 0 && this.completed === this.total;
  }

  get nextMilestone(): JourneyMilestone | undefined {
    return this.milestones.find((m) => !m.done);
  }

  goTo(milestone: JourneyMilestone): void {
    if (milestone.done) return;
    this.journey.goTo(milestone);
  }

  goToNext(): void {
    this.journey.goTo();
  }

  toggleCollapsed(): void {
    this.collapsed = !this.collapsed;
  }

  dismiss(event: Event): void {
    event.stopPropagation();
    this.journey.hide();
  }

  openOffer(): void {
    this.journey.openOffer('manual');
  }

  closeOffer(): void {
    this.journey.closeOffer();
  }

  /** Va al wizard de suscripción arrastrando el cupón generado en la entrada. */
  claimOffer(): void {
    const coupon = this.demoCoupon.getCouponFromSession();
    this.demoAnalytics.track('demo_offer_cta', { with_coupon: !!coupon });
    this.demoAnalytics.trackMetaConversion('InitiateCheckout');
    window.open(this.demoCoupon.buildSubscriptionUrl(PLANS_WIZARD_URL, coupon), '_blank');
  }

  /** Abre WhatsApp con un mensaje que ya identifica al club como venido de la demo. */
  askByWhatsApp(): void {
    this.demoAnalytics.track('demo_offer_whatsapp', {});
    const message = this.translate.instant('DEMO_JOURNEY.OFFER_WA_TEXT');
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
  }
}
