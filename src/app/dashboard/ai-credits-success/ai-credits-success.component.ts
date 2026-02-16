import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AiChatService } from 'src/app/core/services/ai-chat/ai-chat.service';

@Component({
  selector: 'app-ai-credits-success',
  templateUrl: './ai-credits-success.component.html',
  styleUrls: ['./ai-credits-success.component.scss'],
})
export class AiCreditsSuccessComponent implements OnInit {
  status: 'loading' | 'success' | 'error' = 'loading';
  creditsAdded = 0;
  creditsAvailable = 0;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private aiChatService: AiChatService
  ) {}

  ngOnInit(): void {
    const sessionId = this.route.snapshot.queryParamMap.get('session_id');
    if (sessionId) {
      this.verifyPayment(sessionId);
    } else {
      this.status = 'error';
      this.errorMessage = 'No se encontro la sesion de pago.';
    }
  }

  private verifyPayment(sessionId: string): void {
    this.aiChatService.verifyCheckoutSession(sessionId).subscribe({
      next: (resp: any) => {
        if (resp.success) {
          this.status = 'success';
          this.creditsAdded = resp.creditsAdded || 0;
          this.creditsAvailable = resp.creditsAvailable || 0;
        } else {
          this.status = 'error';
          this.errorMessage = resp.error || 'No se pudo verificar el pago.';
        }
      },
      error: () => {
        this.status = 'error';
        this.errorMessage = 'Error de conexion al verificar el pago.';
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
