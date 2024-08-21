import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router, ActivatedRoute } from '@angular/router';
import { LoginService } from 'src/app/core/services/login/login.service';
import { PlayerService } from 'src/app/core/services/player/player.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { TrainingService } from 'src/app/core/services/training/training.service';
import { Response } from 'src/app/core/services/models/response.model';

@Component({
  selector: 'app-cuadro',
  templateUrl: './cuadro.component.html',
  styleUrls: ['./cuadro.component.scss']
})
export class CuadroComponent implements OnInit {

  clubId = 0;
  diasSemana = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];
  horario: { hora: string, dias: any[], isCurrentHour: boolean }[] = [];
  horarios: any[] = [/* tu listado de horarios JSON aquí */];
  coloresEquipos: { [teamId: number]: string } = {};
  datosCargados = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private trainingService: TrainingService,
    private playerService: PlayerService,
    private dialog: MatDialog,
    private fb: FormBuilder,
    private teamService: TeamService,
    private cdr: ChangeDetectorRef,
    private loginService: LoginService,) { }

  ngOnInit(): void {
    // Suscribirse a los cambios en los parámetros de la URL
    this.route.params.subscribe(params => {
      // Obtener el valor de teamId de los parámetros
      this.clubId = +params['clubId'];  // El + convierte el valor a número
      console.log('clubId:', this.clubId);
    });


    this.cargarHorariosEquipos();
  }

  private generarHorario(): void {
    const horas = [];
    let horaActual = new Date();
    horaActual.setHours(23, 0, 0, 0); // Empezar a las 23:00 PM

    while (horaActual.getHours() !== 8 || horaActual.getMinutes() !== 45) { // Cambiado a 8:45 AM para incluir 9:00 AM en la tabla
      const hora = horaActual.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      const isCurrentHour = this.isCurrentHour(hora);
      const fila = { hora, dias: Array(7).fill(null), isCurrentHour }; // Añadir isCurrentHour para resaltar la fila
      horas.push(fila);
      horaActual.setMinutes(horaActual.getMinutes() - 15);
    }

    this.horario = horas;
  }

  private isCurrentHour(hora: string): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const [horaHour, horaMinute] = hora.split(':').map(Number);

    return currentHour === horaHour && currentMinute >= horaMinute && currentMinute < horaMinute + 15;
  }

  private llenarHorario(): void {
    this.horarios.forEach(horario => {
      this.diasSemana.forEach((dia, index) => {
        const diaProp = dia.toLowerCase();
        if (horario[diaProp] === 1) {
          const inicio = this.parsearHora(horario[`${diaProp}Inicio`]);
          const fin = this.parsearHora(horario[`${diaProp}Fin`]);

          for (let i = 0; i < this.horario.length; i++) {
            const intervalo = this.horario[i];
            const hora = this.parsearHora(intervalo.hora);
            if (hora >= inicio && hora < fin + 15) {  // Cambiado de 'fin' a 'fin + 15'
              const teamInfo = `${horario.team.categoryType.categoryName} ${horario.team.name} ${horario.team.levelLeague}`;
              if (intervalo.dias[index]) {
                // Si ya hay un equipo en esta celda, concatenar el teamInfo
                intervalo.dias[index] += `, ${teamInfo}`;
              } else {
                // Si la celda está vacía, inicializarla con el teamInfo
                intervalo.dias[index] = teamInfo;
              }
            }
          }
        }
      });
    });
  }

  private parsearHora(hora: string): number {
    const [horas, minutos] = hora.split(':').map(Number);
    return horas * 60 + minutos; // Convertir la hora a minutos
  }

  cargarHorariosEquipos() {
    this.teamService.getHorariosTeamByClub(this.clubId).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.horarios = response.data;
          this.generarHorario();
          this.llenarHorario();
          this.datosCargados = true;
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  // Método para redirigir a la pantalla de jugadores con el teamId
  irAPantalla(id: number): void {
    switch (id) {
      case 0:
        this.router.navigate(['/dashboard/inicio']);
        break;
      case 1:
        this.router.navigate(['/dashboard/cuadro-de-mandos/info-jugadores', this.clubId]);
        break;
      case 2:
        this.router.navigate(['/dashboard/cuadro-de-mandos/estadisticas-entrenadores-club', this.clubId]);
        break;
      case 3:
        this.router.navigate(['/dashboard/cuadro-de-mandos/estadisticas-equipos-club', this.clubId]);
        break;
      case 4:
        this.router.navigate(['/dashboard/cuadro-de-mandos/estadisticas-jugadores-club', this.clubId]);
        break;
    }
  }

}
