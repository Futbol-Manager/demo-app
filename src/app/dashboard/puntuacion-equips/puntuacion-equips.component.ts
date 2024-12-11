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
  selector: 'app-puntuacion-equips',
  templateUrl: './puntuacion-equips.component.html',
  styleUrls: ['./puntuacion-equips.component.scss']
})
export class PuntuacionEquipsComponent implements OnInit {

  barChartSegunda: Chart | null = null;
  clubId = 0;
  userId!: number;

  usuarioActual!: User | null;
  labels: any[] = [];
  data: any[] = [];
  loading = true;

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

    this.clubService.getPuntuacion(this.clubId).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.data = response.data.data;
          this.labels = response.data.label;
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

    // Ajustar el array de colores al tamaño de los datos
    const backgroundColors = this.generateRandomColors(this.data.length);

    this.barChartSegunda = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.labels,
        datasets: [{
          label: 'Porcentaje de cuotas del club',
          data: this.data,
          backgroundColor: backgroundColors // Colores para cada barra
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

  generateRandomColors(count: number): string[] {
    return Array.from({ length: count }, () => {
      const r = Math.floor(Math.random() * 256); // Valor rojo entre 0 y 255
      const g = Math.floor(Math.random() * 256); // Valor verde entre 0 y 255
      const b = Math.floor(Math.random() * 256); // Valor azul entre 0 y 255
      return `rgba(${r}, ${g}, ${b}, 0.6)`; // Color con transparencia
    });
  }

}
