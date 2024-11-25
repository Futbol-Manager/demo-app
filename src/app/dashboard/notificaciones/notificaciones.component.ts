import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { User } from 'src/app/core/models/users/user.model';
import { ClubService } from 'src/app/core/services/club/club.service';
import { LoginService } from 'src/app/core/services/login/login.service';
import { Response } from 'src/app/core/services/models/response.model';

@Component({
  selector: 'app-notificaciones',
  templateUrl: './notificaciones.component.html',
  styleUrls: ['./notificaciones.component.scss']
})
export class NotificacionesComponent implements OnInit {

  datosCargados = false;
  usuarioActual!: User | null;
  clubId!: number;  // Ajusta el valor según el clubId del equipo actual
  userId!: number;
  correoSelected = {
    destinatarios: '',
    asunto: '',
    body: ''
  };
  correosEnviadosSinFiltro: any = [];
  correosRecibidosSinFiltro: any = [];
  correosSinFiltro: any = [];
  /*correosSinFiltro = [
    { enviadosId: 1, destinatarios: 'juan.perez@example.com', asunto: 'Invitación al torneo', body: 'Te invitamos al torneo que tendrá lugar el próximo sábado en el club.', leido: 0, fecha: '2024-11-23' },
    { enviadosId: 2, destinatarios: 'maria.gomez@example.com', asunto: 'Confirmación de asistencia', body: 'Por favor confirma tu asistencia al evento del domingo.', leido: 0, fecha: '2024-11-22' },
    { enviadosId: 3, destinatarios: 'pedro.lopez@example.com', asunto: 'Revisión de horarios', body: 'Adjuntamos el horario de los próximos partidos.', leido: 0, fecha: '2024-11-21' },
    { enviadosId: 4, destinatarios: 'ana.martinez@example.com', asunto: 'Actualización de membresía', body: 'Tu membresía ha sido renovada exitosamente.', leido: 0, fecha: '2024-11-20' },
    { enviadosId: 5, destinatarios: 'sofia.rodriguez@example.com', asunto: 'Reunión de coordinación', body: 'Te invitamos a la reunión para planificar las actividades del próximo mes.', leido: 0, fecha: '2024-11-19' },
    { enviadosId: 6, destinatarios: 'luis.ramirez@example.com', asunto: 'Cambio de fecha', body: 'El partido programado para el viernes se reprogramará al sábado.', leido: 0, fecha: '2024-11-18' },
    { enviadosId: 7, destinatarios: 'carlos.fernandez@example.com', asunto: 'Entrega de uniformes', body: 'Recuerda pasar por el club para recoger tu uniforme.', leido: 0, fecha: '2024-11-17' },
    { enviadosId: 8, destinatarios: 'victoria.rivas@example.com', asunto: 'Bienvenida al club', body: 'Te damos la bienvenida al club, estamos emocionados de contar contigo.', leido: 0, fecha: '2024-11-16' },
    { enviadosId: 9, destinatarios: 'alberto.garcia@example.com', asunto: 'Notificación de pago', body: 'Tu pago ha sido recibido correctamente.', leido: 1, fecha: '2024-11-15' },
    { enviadosId: 10, destinatarios: 'teresa.lopez@example.com', asunto: 'Evento cancelado', body: 'Lamentamos informarte que el evento programado ha sido cancelado.', leido: 0, fecha: '2024-11-14' },
    { enviadosId: 11, destinatarios: 'manuel.diaz@example.com', asunto: 'Reserva confirmada', body: 'Tu reserva para el evento ha sido confirmada.', leido: 1, fecha: '2024-11-13' },
    { enviadosId: 12, destinatarios: 'laura.hernandez@example.com', asunto: 'Cambio de sede', body: 'El evento cambiará de sede, te informaremos los detalles.', leido: 0, fecha: '2024-11-12' },
    { enviadosId: 13, destinatarios: 'miguel.martinez@example.com', asunto: 'Próximos entrenamientos', body: 'Te compartimos el calendario actualizado.', leido: 1, fecha: '2024-11-11' },
    { enviadosId: 14, destinatarios: 'paula.suarez@example.com', asunto: 'Suspensión de actividades', body: 'Las actividades quedan suspendidas por condiciones climáticas.', leido: 0, fecha: '2024-11-10' },
    { enviadosId: 15, destinatarios: 'jose.rivera@example.com', asunto: 'Actualización de reglamento', body: 'Consulta el reglamento actualizado para esta temporada.', leido: 1, fecha: '2024-11-09' },
    { enviadosId: 16, destinatarios: 'carolina.mendez@example.com', asunto: 'Felicitaciones', body: '¡Felicidades por tu logro en el torneo!', leido: 0, fecha: '2024-11-08' },
    { enviadosId: 17, destinatarios: 'fernando.castro@example.com', asunto: 'Confirmación de inscripción', body: 'Tu inscripción al torneo ha sido confirmada.', leido: 1, fecha: '2024-11-07' },
    { enviadosId: 18, destinatarios: 'camila.gonzalez@example.com', asunto: 'Aviso importante', body: 'Te recordamos que debes actualizar tus datos de contacto.', leido: 0, fecha: '2024-11-06' },
    { enviadosId: 19, destinatarios: 'andres.molina@example.com', asunto: 'Entrenamiento especial', body: 'No olvides asistir al entrenamiento de este viernes.', leido: 1, fecha: '2024-11-05' },
    { enviadosId: 20, destinatarios: 'liliana.rojas@example.com', asunto: 'Cambio de entrenador', body: 'A partir de la próxima semana tendrás un nuevo entrenador.', leido: 0, fecha: '2024-11-04' }
  ];*/

  correos = [...this.correosSinFiltro]; // Inicialmente, muestra todos los correos

  showModal = false;
  showBtn = true;

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

    this.clubService.getListCorreos(this.userId).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.correosEnviadosSinFiltro = response.data.enviados;
          for (let index = 0; index < this.correosEnviadosSinFiltro.length; index++) {
            this.correosEnviadosSinFiltro[index].destinatarios = this.destinatariosString(this.correosEnviadosSinFiltro[index].destinatarios);            
          }
          
          this.correosRecibidosSinFiltro = response.data.recibidos;          
          for (let index = 0; index < this.correosRecibidosSinFiltro.length; index++) {
            this.correosRecibidosSinFiltro[index].destinatarios = this.destinatariosString(this.correosRecibidosSinFiltro[index].destinatarios);            
          }
          this.correos = response.data.recibidos;
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  destinatariosString(destinatarios: string[]): string {
    let correos = '';
    for (let index = 0; index < destinatarios.length; index++) {
      correos += destinatarios[index] + '; ';      
    }
    return correos;
  }

  irAPantalla(id: number): void {
    switch (id) {
      case 1:
        this.router.navigate(['/dashboard/inicio']);
        break;
    }
  }

  mostrarEnviados() {
    this.showBtn = false;
    console.log('Mostrando enviados');
    this.correos = this.correosEnviadosSinFiltro;
  }

  mostrarRecibidos() {
    this.showBtn = true;
    console.log('Mostrando recibidos');
    this.correos = this.correosRecibidosSinFiltro;
  }

  filtrarCorreos(tipo: string) {
    console.log(`Filtrando correos: ${tipo}`);
  }

  openCorreo(correo: any): void {
    //alert('Correo abierto con ID:' + correo.enviadosId);
    // Aquí puedes agregar la lógica para abrir o mostrar el correo.
    this.correoSelected = correo; // Asigna el correo seleccionado    
    this.showModal = true;
  }

  mostrarTodos() {
    this.correos = [...this.correosRecibidosSinFiltro];
  }

  mostrarLeidos() {
    this.correos = [...this.correosRecibidosSinFiltro];
    this.correos = this.correos.filter(correo => correo.leido === 1);
  }

  mostrarNoLeidos() {
    this.correos = [...this.correosRecibidosSinFiltro];
    this.correos = this.correos.filter(correo => correo.leido === 0);
  }

  cerrarModal(){
    this.showModal = false;
    this.correoSelected = {
      destinatarios: '',
      asunto: '',
      body: ''
    }; // Limpia la selección si es necesario
  }

}
