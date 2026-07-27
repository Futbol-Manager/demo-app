import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { EntrenamientosClubComponent } from 'src/app/dashboard/entrenamientos-club/entrenamientos-club.component';
import { MetodologiasComponent } from './metodologias/metodologias.component';

/**
 * Entrenamientos (Club) — contenedor del apartado. Agrupa en pestañas:
 *  - "Metodologías" (Fase 2): planificación por temporada con tareas y equipos.
 *  - "Tareas del club" (Fase 1): biblioteca de tareas propias del club.
 *
 * El acceso (dueño del club o staff con permiso ENTRENAMIENTOS) lo controla el
 * backend en cada endpoint que consumen los componentes hijos.
 */
@Component({
  selector: 'app-entrenamientos',
  templateUrl: './entrenamientos.component.html',
  styleUrls: ['./entrenamientos.component.scss'],
})
export class EntrenamientosComponent {
  tab: 'methodologies' | 'tasks' = 'methodologies';
}
