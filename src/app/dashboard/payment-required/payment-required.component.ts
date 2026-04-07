import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-payment-required',
  templateUrl: './payment-required.component.html',
  styleUrls: ['./payment-required.component.scss']
})
export class PaymentRequiredComponent {
  constructor(private router: Router) {}

  goToSubscription(): void {
    this.router.navigate(['/dashboard/suscripcion-club']);
  }

  goBack(): void {
    this.router.navigate(['/dashboard/inicio']);
  }
}
