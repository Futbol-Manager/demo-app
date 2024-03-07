import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-calendario',
  templateUrl: './calendario.component.html',
  styleUrls: ['./calendario.component.scss']
})
export class CalendarioComponent implements OnInit {

  nombreEquipo: string = 'Arevalo';  // Puedes ajustar el nombre del equipo según necesites
  calendario: any[] = [];  // Aquí deberías tener la información de los días de la semana
  teamId!: number;  // Ajusta el valor según el teamId del equipo actual

  constructor(
    private router: Router,
    private route: ActivatedRoute) { }

  ngOnInit(): void {
    // Suscribirse a los cambios en los parámetros de la URL
    this.route.params.subscribe(params => {
      // Obtener el valor de teamId de los parámetros
      this.teamId = +params['teamId'];  // El + convierte el valor a número
      console.log('teamId:', this.teamId);
      // Lógica para obtener o generar la información del calendario
      this.generarCalendario();
    });

  }

  private generarCalendario(): void {
    // Aquí puedes implementar la lógica para generar la información del calendario
    // Puedes usar librerías como 'date-fns' o 'moment' para facilitar el manejo de fechas
    // Ejemplo básico para mostrar días del 1 al 30 en cada columna de la semana
    for (let i = 1; i <= 30; i += 7) {
      const semana = {
        lunes: i,
        martes: i + 1,
        miercoles: i + 2,
        jueves: i + 3,
        viernes: i + 4,
        sabado: i + 5,
        domingo: i + 6
      };
      this.calendario.push(semana);
    }
  }

  // Método para redirigir a la pantalla de jugadores con el teamId
  irAPantallaJugadores(): void {
    // Ajusta la ruta según la configuración de tus rutas en el enrutador
    this.router.navigate(['/jugadores', this.teamId]);
  }

  // Método para redirigir a la pantalla de jugadores con el teamId
  navegarAInicio(): void {
    // Ajusta la ruta según la configuración de tus rutas en el enrutador
    this.router.navigate(['/inicio']);
  }

}
