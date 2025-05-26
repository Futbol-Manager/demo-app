import { Component, ElementRef, OnInit } from '@angular/core';
import { Response } from 'src/app/core/services/models/response.model';
import { Chart, ChartType, registerables } from 'chart.js/auto';
Chart.register(...registerables);
import * as $ from 'jquery';
import 'datatables.net';
import { User } from 'src/app/core/models/users/user.model';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { ClubService } from 'src/app/core/services/club/club.service';
import { LoginService } from 'src/app/core/services/login/login.service';

@Component({
  selector: 'app-grafica-cuotas',
  templateUrl: './grafica-cuotas.component.html',
  styleUrls: ['./grafica-cuotas.component.scss']
})
export class GraficaCuotasComponent implements OnInit {

  barChartSegunda: Chart | null = null;
  clubId = 0;
  userId!: number;

  usuarioActual!: User | null;
  labels: any[] = [];
  data: any[] = [];
  datosCargados = false;
  loading = true;
  temporadaStoredValue = '2024';

  constructor(
    private loginService: LoginService,
    private router: Router,
    private route: ActivatedRoute,
    private elementRef: ElementRef,
    private http: HttpClient,
    private clubService: ClubService) { }

  ngOnInit(): void {
    this.loginService.usuarioActual.subscribe(user => {
      this.usuarioActual = user;
      this.userId = this.usuarioActual!.userId;
      // Suscribirse a los cambios en los parámetros de la URL
      this.route.params.subscribe(params => {
        // Obtener el valor de clubId de los parámetros
        this.clubId = +params['clubId'];  // El + convierte el valor a número
        console.log('clubId:', this.clubId);
      });
    });      

    if (localStorage.getItem('temporada') != null && localStorage.getItem('temporada') != undefined) {
      this.temporadaStoredValue = localStorage.getItem('temporada')!.toString();
    }

    this.clubService.getCuotasClub(this.clubId, this.temporadaStoredValue).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.labels = response.data.label;
          this.data = response.data.data;
          setTimeout(() => {
            this.graficaUnica();
            this.loading = false;
          }, 1000);
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  irAPantalla(id: number): void {
    switch (id) {
      case 1:
        this.router.navigate(['/dashboard/cuadro-de-mandos', this.clubId]);
        break;
    }
  }

  graficaUnica() {
    const canvas = document.getElementById('barChartUnica') as HTMLCanvasElement;
    if (!canvas) {
      console.error('No se encontró el elemento canvas');
      return;
    }

    // Antes de crear el nuevo gráfico, destruye el gráfico existente si es necesario
    if (this.barChartSegunda) {
      this.barChartSegunda.destroy(); // Destruye el gráfico existente
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('No se pudo obtener el contexto del elemento canvas');
      return;
    }

    // Crear arrays de datos y etiquetas desde this.players
    /*this.labels = ['Sin pagar', 'Al corriente', 'Completado'];
    this.data = [10, 60, 30];*/

    this.barChartSegunda = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.labels,
        datasets: [{
          label: 'Cuotas del club',
          data: this.data,
          backgroundColor: ['red', 'gray', 'green'] // Colores para cada barra
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Porcentaje de cuotas del Club'
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

}
