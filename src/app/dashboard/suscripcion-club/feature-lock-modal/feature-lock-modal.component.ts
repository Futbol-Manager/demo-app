import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Router } from '@angular/router';
import { LockedFeature } from 'src/app/core/models/subscription/club-subscription.model';

@Component({
  selector: 'app-feature-lock-modal',
  templateUrl: './feature-lock-modal.component.html',
  styleUrls: ['./feature-lock-modal.component.scss'],
})
export class FeatureLockModalComponent {
  @Input() visible = false;
  @Input() feature: LockedFeature | null = null;
  @Output() closed = new EventEmitter<void>();

  constructor(private router: Router) {}

  close(): void {
    this.closed.emit();
  }

  goToPlans(): void {
    this.close();
    this.router.navigate(['/dashboard/suscripcion-club']);
  }
}
