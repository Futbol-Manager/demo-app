import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { LoginService } from 'src/app/core/services/login/login.service';
import { RegisterService } from 'src/app/core/services/register/register.service';
import { TrainingService } from 'src/app/core/services/training/training.service';
import { Location } from '@angular/common';

// Definición de la interfaz
interface AsistenciaMulta {
  fecha: string;
  asistencia: number[];
  multas: number[];
  multaPagada: number[];
  idsPk: number[];
}

@Component({
  selector: 'app-asistencia',
  templateUrl: './asistencia.component.html',
  styleUrls: ['./asistencia.component.scss']
})
export class AsistenciaComponent implements OnInit {

  teamId = 0;
  loading = true;  // Inicialmente en true para mostrar el spinner

  asistMultasPlayers: AsistenciaMulta[] = [];  // array definido
  players: string[] = [];
  asistTotales: any[] = [];

  numTotal = 0;

  constructor(
    private fb: FormBuilder,
    private trainingService: TrainingService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private registerService: RegisterService,
    private loginService: LoginService,
    private location: Location) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      // Obtener el valor de teamId de los parámetros
      this.teamId = +params['teamId'];  // El + convierte el valor a número
      this.getListTable();  // Cargar los datos tan pronto se tenga el teamId
    });
  }

  goBack(): void {
    this.location.back();
  }

  navegarAInfoEquipo(): void {
    // Puedes ajustar la ruta según tu estructura de rutas
    this.router.navigate(['/dashboard/informacion_equipo', this.teamId]);
  }

  getListTable() {
    this.trainingService.getListsAsistenciaByTeam(this.teamId).subscribe(
      (response) => {
        if (response.data) {
          this.players = response.data.players;
          this.asistMultasPlayers = response.data.asistMultasPlayers;
          this.numTotal = this.asistMultasPlayers.length;
          this.asistTotales = response.data.asistenciaTotales;
        }
        this.loading = false;  // Ocultar el spinner y mostrar los datos
      },
      (error) => {
        console.error('Error en la solicitud:', error);
        this.loading = false;  // En caso de error, ocultar el spinner
      }
    );
  }

  toggleMultaPago(idsPk: number, pagoStatus: number): void {
    // Aquí puedes implementar la lógica para actualizar el estado de la multa en la base de datos
    // Por ejemplo, llamando a un servicio que realice la actualización en el backend

    console.log(`ID: ${idsPk}, Pago Status: ${pagoStatus}`);

    this.trainingService.updateMultaStatus(idsPk, pagoStatus).subscribe(
      response => {
        if (response) {
          this.snackBar.open('Multa actualizada correctamente.', 'Cerrar', {
            duration: 3000,
          });
          // Actualizar la tabla si es necesario
          this.getListTable();
        } else {
          this.snackBar.open('Error al actualizar la multa.', 'Cerrar', {
            duration: 3000,
          });
        }
      },
      error => {
        console.error('Error al actualizar la multa:', error);
        this.snackBar.open('Error al actualizar la multa.', 'Cerrar', {
          duration: 3000,
        });
      }
    );
  }


}
