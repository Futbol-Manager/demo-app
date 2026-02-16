import { Component, Input, Output, EventEmitter, OnInit, HostListener, ElementRef } from '@angular/core';
import { AiChatService, AiCreditsInfo } from 'src/app/core/services/ai-chat/ai-chat.service';

interface CreditPack {
  credits: number;
  price: number;
  popular?: boolean;
  savings?: string;
}

@Component({
  selector: 'app-credits-modal',
  templateUrl: './credits-modal.component.html',
  styleUrls: ['./credits-modal.component.scss'],
})
export class CreditsModalComponent implements OnInit {
  @Input() userId = 0;
  @Input() creditsAvailable = 0;
  @Output() closed = new EventEmitter<void>();
  @Output() creditsPurchased = new EventEmitter<number>();

  creditsInfo: AiCreditsInfo = {
    creditsFree: 50,
    creditsPurchased: 0,
    creditsUsed: 0,
    creditsAvailable: 50,
  };
  loading = true;
  purchasing = false;
  purchaseSuccess = false;
  purchaseError = '';

  creditPacks: CreditPack[] = [
    { credits: 50, price: 2.99 },
    { credits: 150, price: 7.49, popular: true, savings: 'Ahorra 17%' },
    { credits: 500, price: 19.99, savings: 'Ahorra 33%' },
    { credits: 1000, price: 34.99, savings: 'Ahorra 42%' },
  ];

  // Dragging
  isDragging = false;
  dragStartX = 0;
  dragStartY = 0;
  modalX = 0;
  modalY = 0;
  private initializedPosition = false;

  // Resizing
  isResizing = false;
  resizeDirection = '';
  resizeStartX = 0;
  resizeStartY = 0;
  modalWidth = 480;
  modalHeight = 660;
  minWidth = 380;
  minHeight = 500;
  maxWidth = 700;
  maxHeight = 850;

  constructor(
    private aiChatService: AiChatService,
    private elRef: ElementRef
  ) {}

  ngOnInit(): void {
    this.centerModal();
    this.loadCredits();
  }

  private centerModal(): void {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    this.modalX = Math.max(16, (vw - this.modalWidth) / 2);
    this.modalY = Math.max(16, (vh - this.modalHeight) / 2);
    this.initializedPosition = true;
  }

  private loadCredits(): void {
    this.loading = true;
    this.aiChatService.getCredits(this.userId).subscribe(info => {
      this.creditsInfo = info;
      this.creditsAvailable = info.creditsAvailable;
      this.loading = false;
    });
  }

  close(): void {
    this.closed.emit();
  }

  purchasePack(pack: CreditPack): void {
    this.purchasing = true;
    this.purchaseError = '';
    this.purchaseSuccess = false;

    this.aiChatService.createCheckoutSession(this.userId, pack.credits, pack.price).subscribe({
      next: (resp: any) => {
        if (resp.success && resp.checkoutUrl) {
          window.location.href = resp.checkoutUrl;
        } else {
          this.purchasing = false;
          this.purchaseError = resp.error || 'Error al crear la sesion de pago. Intentalo de nuevo.';
        }
      },
      error: (err: any) => {
        this.purchasing = false;
        this.purchaseError = 'Error al procesar la compra. Intentalo de nuevo.';
      }
    });
  }

  // ─── DRAG ─────────────────────────────────
  startDrag(event: MouseEvent): void {
    if ((event.target as HTMLElement).closest('.modal-resize-handle')) return;
    this.isDragging = true;
    this.dragStartX = event.clientX - this.modalX;
    this.dragStartY = event.clientY - this.modalY;
    event.preventDefault();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (this.isDragging) {
      this.modalX = Math.max(0, Math.min(window.innerWidth - this.modalWidth, event.clientX - this.dragStartX));
      this.modalY = Math.max(0, Math.min(window.innerHeight - this.modalHeight, event.clientY - this.dragStartY));
    }
    if (this.isResizing) {
      this.handleResize(event);
    }
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    this.isDragging = false;
    this.isResizing = false;
    this.resizeDirection = '';
  }

  // ─── RESIZE ───────────────────────────────
  startResize(event: MouseEvent, direction: string): void {
    this.isResizing = true;
    this.resizeDirection = direction;
    this.resizeStartX = event.clientX;
    this.resizeStartY = event.clientY;
    event.preventDefault();
    event.stopPropagation();
  }

  private handleResize(event: MouseEvent): void {
    const dx = event.clientX - this.resizeStartX;
    const dy = event.clientY - this.resizeStartY;
    this.resizeStartX = event.clientX;
    this.resizeStartY = event.clientY;

    if (this.resizeDirection.includes('e')) {
      this.modalWidth = Math.max(this.minWidth, Math.min(this.maxWidth, this.modalWidth + dx));
    }
    if (this.resizeDirection.includes('w')) {
      const newW = Math.max(this.minWidth, Math.min(this.maxWidth, this.modalWidth - dx));
      if (newW !== this.modalWidth) {
        this.modalX += this.modalWidth - newW;
        this.modalWidth = newW;
      }
    }
    if (this.resizeDirection.includes('s')) {
      this.modalHeight = Math.max(this.minHeight, Math.min(this.maxHeight, this.modalHeight + dy));
    }
    if (this.resizeDirection.includes('n')) {
      const newH = Math.max(this.minHeight, Math.min(this.maxHeight, this.modalHeight - dy));
      if (newH !== this.modalHeight) {
        this.modalY += this.modalHeight - newH;
        this.modalHeight = newH;
      }
    }
  }

  get pricePerCredit(): string {
    return (0.06).toFixed(2);
  }

  getPerCreditPrice(pack: CreditPack): string {
    return (pack.price / pack.credits).toFixed(3);
  }
}
