import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TeamService } from 'src/app/core/services/team/team.service';

@Component({
  selector: 'app-suscripcion',
  templateUrl: './suscripcion.component.html',
  styleUrls: ['./suscripcion.component.scss']
})

export class SuscripcionComponent implements OnInit {

  userId = 0;
  selected = 0;

  cardNumber = '';
  expiryDate = '';
  cvc = '';
  showModalSus = false;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private teamService: TeamService) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      // Obtener el valor de userId de los parámetros
      this.userId = params['userId'];
    });

    //obtener el listado de hijos si tiene mas de uno y mostrarlo, 2 botones, que si escoge uno, se ve debajo el plan que tiene y 
    //si pulsa en el otro hijo, se busca el plan de ese otro hijo y se actualiza la info de la pantalla

    //obtener la sus actual por si quisiera cambiarla y mostrarle cual tiene
    this.obtenerSuscripcionActual();
  }

  obtenerSuscripcionActual(){    
    /*this.teamService.getSubscriptionByPlayerId(this.playerId).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.scoutingPlayer = response.data;
        } else {
          this.scoutingPlayer.playerId = this.playerId;
          console.error('No hay datos', response);
        }
        this.datosCargados = true;
      },
      (error) => {
        console.error('Error al cargar el los datos', error);
      }
    );*/
  } 

  // Abrir el modal cuando se selecciona una opción de suscripción
  select(option: number) {
    this.selected = option;
    this.showModalSus = true;
  }

  // Enviar los datos al backend para crear la suscripción
  submitSubscription() {
    const paymentData = {
      userId: this.userId,
      subscriptionType: this.selected, // 1 = Mensual, 2 = Trimestral, 3 = Anual
      cardNumber: this.cardNumber,
      expiryDate: this.expiryDate,
      cvc: this.cvc
    };

    // Llamar al endpoint para crear la suscripción
    this.http.post('/api/create-subscription', paymentData)
      .subscribe(response => {
        console.log('Suscripción creada con éxito', response);
        this.showModalSus = false;
      }, error => {
        console.error('Error al crear la suscripción', error);
      });
  }

  cerrarModalSus() {
    this.showModalSus = false;
  }
}