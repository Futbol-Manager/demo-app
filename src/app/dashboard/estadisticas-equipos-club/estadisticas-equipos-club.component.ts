import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-estadisticas-equipos-club',
  templateUrl: './estadisticas-equipos-club.component.html',
  styleUrls: ['./estadisticas-equipos-club.component.scss']
})
export class EstadisticasEquiposClubComponent implements OnInit {
  clubId = 0;

  constructor(
    private router: Router,
    private route: ActivatedRoute,) { }

  ngOnInit(): void {
    // Suscribirse a los cambios en los parámetros de la URL
    this.route.params.subscribe(params => {
      // Obtener el valor de teamId de los parámetros
      this.clubId = +params['clubId'];  // El + convierte el valor a número
      console.log('clubId:', this.clubId);
    });
    //this.cargarListadoJugadores();
  }

  // Método para redirigir a la pantalla de jugadores con el teamId
  irAPantalla(id: number): void {
    switch (id) {
      case 0:
        this.router.navigate(['/dashboard/cuadro', this.clubId]);
        break;
    }
  }

}
