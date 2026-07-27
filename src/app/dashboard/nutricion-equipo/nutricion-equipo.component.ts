import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Pantalla "Nutricionista" a nivel de equipo. Por ahora es un contenedor
 * vacío (placeholder) accesible desde el menú de fisio/nutricionista. El
 * contenido se irá rellenando más adelante.
 *
 * Ruta: {@code /dashboard/nutricion-equipo/:teamId}
 */
@Component({
  selector: 'app-nutricion-equipo',
  templateUrl: './nutricion-equipo.component.html',
  styleUrls: ['./nutricion-equipo.component.scss'],})
export class NutricionEquipoComponent implements OnInit {

  teamId = 0;

  constructor(
    private route: ActivatedRoute,
    private location: Location,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.teamId = +params['teamId'];
    });
  }

  goBack(): void {
    this.location.back();
  }
}
