import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'sphairatech';

  ngOnInit(): void {
    // Limpiar valores de caché obsoletos del sistema de suscripciones
    const storedPlan = localStorage.getItem('clubPlanType');
    if (storedPlan === 'gratuito') {
      localStorage.removeItem('clubPlanType');
    }
  }
}
