import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

// Utilizaremos una interfaz para especificar las opciones de formato de fecha
interface OpcionesFormatoFecha {
  month: 'long';
  year: 'numeric';
}

@Component({
  selector: 'app-calendario',
  templateUrl: './calendario.component.html',
  styleUrls: ['./calendario.component.scss']
})
export class CalendarioComponent implements OnInit {

  nombreEquipo: string = 'Arevalo';  // Puedes ajustar el nombre del equipo según necesites
  //calendario: any[] = [];  // Aquí deberías tener la información de los días de la semana
  teamId!: number;  // Ajusta el valor según el teamId del equipo actual
  calendario: any[][] = [];
  mesActual: Date = new Date();
  // Variable para almacenar el nombre del mes y el año actual
  tituloMesAnio!: string;

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
      this.generarCalendarioV2(new Date());
    });

  }

  /*private generarCalendario(): void {
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
  }*/

  // Método para generar el calendario para el mes especificado
  private generarCalendarioV2(mes: Date): void {
    // Obtener el primer día del mes
    const primerDiaMes = new Date(mes.getFullYear(), mes.getMonth(), 1);
    // Obtener el día de la semana en el que empieza el mes (0 para domingo, 1 para lunes, etc.)
    let primerDiaSemana = primerDiaMes.getDay();
    // Ajustar primerDiaSemana para que sea 0 para domingo, 1 para lunes, etc.
    primerDiaSemana = (primerDiaSemana === 0) ? 6 : primerDiaSemana - 1;

    // Obtener el número de días en el mes actual
    const ultimoDiaMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();

    // Generar los datos del calendario
    this.calendario = [];
    let dia = 1; // Inicializar el día en 1
    for (let i = 0; i < 6; i++) {
      // Crear una nueva fila en el calendario
      this.calendario[i] = [];
      for (let j = 0; j < 7; j++) {
        // Si estamos en la primera fila y en una columna antes del primer día del mes,
        // o si ya hemos alcanzado el último día del mes, dejar el espacio en blanco
        if ((i === 0 && j < primerDiaSemana) || dia > ultimoDiaMes) {
          this.calendario[i][j] = '';
        } else {
          // Agregar el número del día al calendario
          this.calendario[i][j] = dia++;
        }
      }
    }

    // Actualizar el título del mes y el año
    const opcionesFecha: OpcionesFormatoFecha = { month: 'long', year: 'numeric' };
    this.tituloMesAnio = mes.toLocaleDateString('es-ES', opcionesFecha).toUpperCase();
  }

  // Método para redirigir a la pantalla de jugadores con el teamId
  irAPantallaJugadores(): void {
    // Ajusta la ruta según la configuración de tus rutas en el enrutador
    this.router.navigate(['/dashboard/jugadores', this.teamId]);
  }

  // Método para redirigir a la pantalla de jugadores con el teamId
  navegarAInicio(): void {
    // Ajusta la ruta según la configuración de tus rutas en el enrutador
    this.router.navigate(['/dashboard/inicio']);
  }

  agregarEvento(dia: number) { }

  mesAnterior() {
    this.mesActual.setMonth(this.mesActual.getMonth() - 1);
    this.generarCalendarioV2(this.mesActual);
  }

  mesSiguiente() {
    this.mesActual.setMonth(this.mesActual.getMonth() + 1);
    this.generarCalendarioV2(this.mesActual);
  }

}
