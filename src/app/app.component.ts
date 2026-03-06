import { Component, OnInit } from '@angular/core';
import { DemoActivityService } from './core/services/demo/demo-activity.service';
import { DemoService } from './core/services/demo/demo.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'sphairatech';

  constructor(
    private demoService: DemoService,
    private demoActivityService: DemoActivityService
  ) {}

  ngOnInit(): void {
    // Limpiar valores de caché obsoletos del sistema de suscripciones
    const storedPlan = localStorage.getItem('clubPlanType');
    if (storedPlan === 'gratuito') {
      localStorage.removeItem('clubPlanType');
    }
    // Iniciar tracking de actividad en modo demo (para enviar email + actividad al endpoint de producción)
    if (this.demoService.isDemoMode()) {
      this.demoActivityService.init();
    }
  }
}
