import { Component, Input } from '@angular/core';

/**
 * Tarjeta reutilizable para dashboards.
 * Usa variables CSS de tema (light/dark) para colores.
 * @param icon Clase del icono (ej: bi bi-person)
 * @param title Texto del título (usar con translate en el template del padre)
 * @param bgClass Clase de fondo (ej: bg-personal-data) para la imagen/color de la tarjeta
 */
@Component({
  selector: 'app-dashboard-card',
  templateUrl: './dashboard-card.component.html',
  styleUrls: ['./dashboard-card.component.scss']
})
export class DashboardCardComponent {
  @Input() icon = '';
  @Input() title = '';
  @Input() bgClass = '';
}
