import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { VideoStorageService } from 'src/app/core/services/video-storage/video-storage.service';

@Component({
  selector: 'app-video-plan-success',
  templateUrl: './video-plan-success.component.html',
  styleUrls: ['./video-plan-success.component.scss']
})
export class VideoPlanSuccessComponent implements OnInit {

  status: 'loading' | 'success' | 'error' = 'loading';
  planKey = '';
  storageLimitHuman = '';
  errorMessage = '';
  clubId = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private videoService: VideoStorageService
  ) {}

  ngOnInit(): void {
    // clubId: query param (más fiable tras redirección) > sessionStorage > localStorage
    this.clubId = Number(this.route.snapshot.queryParamMap.get('clubId'))
      || Number(sessionStorage.getItem('clubId'))
      || Number(localStorage.getItem('clubId'))
      || 0;

    const sessionId = this.route.snapshot.queryParamMap.get('session_id');
    if (sessionId) {
      this.verifyPayment(sessionId);
    } else {
      this.status = 'error';
      this.errorMessage = 'No se encontró la sesión de pago. Vuelve al panel e inténtalo de nuevo.';
    }
  }

  private verifyPayment(sessionId: string): void {
    this.videoService.verifyCheckoutSession(this.clubId, sessionId).subscribe({
      next: (res: any) => {
        const data = res?.data;
        if (data?.activated) {
          this.status = 'success';
          this.planKey = data.planKey || '';
          this.storageLimitHuman = data.storageLimitHuman || '';
        } else {
          this.status = 'error';
          const backendMsg = res?.error?.msg || res?.message;
          this.errorMessage = backendMsg || 'No se pudo activar el plan. Contacta con soporte.';
        }
      },
      error: (err) => {
        this.status = 'error';
        const backendMsg = err?.error?.error?.msg || err?.error?.message || err?.message;
        this.errorMessage = backendMsg
          ? `Error: ${backendMsg}`
          : 'Error de conexión al verificar el pago. Es posible que el plan se haya activado igualmente; comprueba tu biblioteca de vídeos.';
      }
    });
  }

  planLabel(): string {
    const map: Record<string, string> = {
      STARTER_1TB: 'Starter 1 TB', PRO_5TB: 'Pro 5 TB', ELITE_10TB: 'Elite 10 TB'
    };
    return map[this.planKey] || this.planKey;
  }

  goToLibrary(): void {
    this.router.navigate(['/dashboard/club-videos', this.clubId]);
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
