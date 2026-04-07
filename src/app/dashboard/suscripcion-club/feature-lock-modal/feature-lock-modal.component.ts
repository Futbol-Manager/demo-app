import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FeatureLockData } from 'src/app/core/models/subscription/club-subscription.model';

@Component({
  selector: 'app-feature-lock-modal',
  templateUrl: './feature-lock-modal.component.html',
  styleUrls: ['./feature-lock-modal.component.scss'],
})
export class FeatureLockModalComponent {
  @Input() visible = false;
  @Input() featureData: FeatureLockData | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() upgrade = new EventEmitter<void>();

  close(): void {
    this.closed.emit();
  }

  goToPlans(): void {
    this.upgrade.emit();
  }
}
