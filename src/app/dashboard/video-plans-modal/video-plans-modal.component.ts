import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { VideoStorageService } from 'src/app/core/services/video-storage/video-storage.service';

// Planes fijos: siempre visibles independientemente del estado del backend
const STATIC_PLANS = [
  { key: 'STARTER_1TB', name: 'Starter', storageLimitHuman: '1 TB', priceEur: 24.99 },
  { key: 'PRO_5TB',     name: 'Pro',     storageLimitHuman: '5 TB', priceEur: 59.99 },
  { key: 'ELITE_10TB',  name: 'Elite',   storageLimitHuman: '10 TB', priceEur: 99.99 },
];

@Component({
  selector: 'app-video-plans-modal',
  templateUrl: './video-plans-modal.component.html',
  styleUrls: ['./video-plans-modal.component.scss']
})
export class VideoPlansModalComponent implements OnInit {

  @Input() clubId = 0;
  @Output() closed = new EventEmitter<void>();

  loading = true;
  checkoutLoading = false;
  planError = '';
  checkoutError = '';

  currentPlan: any = null;
  hasPlan = false;
  plans: any[] = STATIC_PLANS;
  selectedPlan = '';

  constructor(private videoService: VideoStorageService) {}

  ngOnInit(): void {
    this.tryLoadActivePlan();
  }

  tryLoadActivePlan(): void {
    if (!this.clubId) { this.loading = false; return; }
    this.loading = true;
    this.videoService.getPlan(this.clubId).subscribe({
      next: (res) => {
        this.hasPlan     = res?.data?.hasPlan || false;
        this.currentPlan = this.hasPlan ? res.data : null;
        // Merge API plans con estáticos: los estáticos siempre tienen los precios correctos
        if (res?.data?.plans?.length > 0) {
          this.plans = STATIC_PLANS.map(sp => {
            const apiPlan = res.data.plans.find((ap: any) => ap.key === sp.key);
            return {
              ...sp,
              ...(apiPlan || {}),
              // Los precios SIEMPRE vienen de los estáticos (evita que el API devuelva 0)
              priceEur: sp.priceEur,
              storageLimitHuman: sp.storageLimitHuman,
            };
          });
        }
        this.loading = false;
      },
      error: () => {
        // No mostramos error: los planes estáticos son suficientes para continuar
        this.loading = false;
      }
    });
  }

  selectPlan(key: string): void {
    this.selectedPlan = key;
    this.checkoutError = '';
  }

  startCheckout(): void {
    if (!this.selectedPlan) return;
    if (!this.clubId) {
      this.checkoutError = 'No se pudo identificar tu club. Recarga la página.';
      return;
    }
    this.checkoutLoading = true;
    this.checkoutError = '';
    this.videoService.createCheckoutSession(this.clubId, this.selectedPlan).subscribe({
      next: (res) => {
        const url = res?.data?.checkoutUrl;
        if (url) {
          window.location.href = url;
        } else {
          this.checkoutError = res?.error?.msg || 'No se pudo iniciar el pago. Asegúrate de tener el backend actualizado.';
          this.checkoutLoading = false;
        }
      },
      error: (err) => {
        this.checkoutError = err?.error?.error?.msg || 'Error al conectar con el servidor. ¿Está el backend actualizado y en marcha?';
        this.checkoutLoading = false;
      }
    });
  }

  planLabel(key: string): string {
    const map: Record<string, string> = {
      STARTER_1TB: 'Starter 1 TB', PRO_5TB: 'Pro 5 TB', ELITE_10TB: 'Elite 10 TB'
    };
    return map[key] || key;
  }

  planIcon(key: string): string {
    const map: Record<string, string> = {
      STARTER_1TB: 'bi-play-btn', PRO_5TB: 'bi-collection-play', ELITE_10TB: 'bi-film'
    };
    return map[key] || 'bi-camera-video';
  }

  planPrice(key: string): string {
    const p = this.plans.find(pl => pl.key === key);
    if (!p) return '';
    const price = typeof p.priceEur === 'number' ? p.priceEur : 0;
    return `€${price.toFixed(2)}/mes`;
  }

  usedPercent(): number {
    return this.currentPlan?.usedPercent || 0;
  }

  barColor(): string {
    const pct = this.usedPercent();
    if (pct >= 90) return '#e74c3c';
    if (pct >= 70) return '#f39c12';
    return '#002c40';
  }
}
