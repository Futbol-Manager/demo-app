import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { User } from 'src/app/core/models/users/user.model';
import { PlayerService } from 'src/app/core/services/player/player.service';
import { Response } from 'src/app/core/services/models/response.model';
import { Player, PlayerNEW } from 'src/app/core/services/player/player.model';

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.scss']
})
export class PlayerComponent implements OnInit {

  usuarioActual!: User | null;
  teamId!: number;
  showModal = false;
  player: PlayerNEW = new PlayerNEW();
  listPlayers: any[] = []; // Define una variable para almacenar el listado de equipos

  constructor(private playerservice: PlayerService,
    private router: Router,
    private route: ActivatedRoute) { }

  ngOnInit(): void {
    // Suscribirse a los cambios en los parámetros de la URL
    this.route.params.subscribe(params => {
      // Obtener el valor de teamId de los parámetros
      this.teamId = +params['teamId'];  // El + convierte el valor a número
      console.log('teamId:', this.teamId);
      this.cargarListadoJugadores();
      // Luego puedes realizar acciones con el teamId según tus necesidades
    });
  }

  // Método para cargar el listado de equipos
  cargarListadoJugadores(): void {
    this.playerservice.getPlayers(this.teamId.toString()).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response && response.data && Array.isArray(response.data)) {
          // Mapea los datos bajo 'data' a instancias del modelo Team
          this.listPlayers = response.data.map((player: Player) => new Player(player));
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de jugadores', error);
      }
    );
  }

  // Método para confirmar la eliminación del equipo
  confirmarEliminarJugador(playerId: number, name: string, surname: string): void {
    const confirmacion = confirm('¿Estás seguro de que deseas eliminar el jugador ' + name + ' ' + surname + ` con ID ${playerId}?`);
    if (confirmacion) {
      // Llama al método para eliminar el equipo
      this.eliminarJugador(playerId);
    }
  }

  // Método para eliminar el equipo
  eliminarJugador(playerId: number): void {
    // Lógica para eliminar el equipo llamando al servicio correspondiente
    this.playerservice.deletePlayer(playerId.toString()).subscribe(
      (response) => {
        // Manejar la respuesta según tus necesidades
        console.log('Jugador eliminado con éxito:', response);

        // Cargar nuevamente el listado de equipos después de la eliminación exitosa
        this.cargarListadoJugadores();
      },
      (error) => {
        console.error('Error al eliminar el jugador:', error);
        // Puedes manejar el error según tus necesidades
      }
    );
  }

  // Método para abrir el modal de creación de equipo
  abrirModalCrearJugdor(): void {
    this.showModal = true;
  }



  // Método para cerrar el modal de creación de equipo
  cerrarModal(): void {
    this.showModal = false;
    // Limpiar los datos del nuevo equipo al cerrar el modal si es necesario
    this.player = new PlayerNEW();
  }

  // Método para crear un nuevo equipo
  crearJugador(): void {

    // Crear una instancia de PlayerNEW y asignar los campos del modal
    this.player = {
      playerId: 0, // O el valor por defecto que desees para playerId
      ability: this.player.ability,
      abilityFootBad: this.player.abilityFootBad,
      birthdate: new Date(), // O ajusta según tus necesidades
      dateCreate: new Date(), // O ajusta según tus necesidades
      dateEdit: new Date(), // O ajusta según tus necesidades
      dribbling: this.player.dribbling,
      finishFoot: this.player.finishFoot,
      finishHead: this.player.finishHead,
      firstName: this.player.firstName,
      footNatural: this.player.footNatural,
      forcePlayer: this.player.forcePlayer,
      height: this.player.height,
      hit: this.player.hit,
      jump: this.player.jump,
      picturePlayer: this.player.picturePlayer,
      position: this.player.position,
      resistance: this.player.resistance,
      secondName: this.player.secondName,
      speed: this.player.speed,
      weight: this.player.weight,
      opinion: this.player.opinion
    }


    // Llamada al servicio para crear el jugador
    this.playerservice.createUpdatePlayer(this.teamId.toString(), this.player,).subscribe(
      (response) => {
        // Manejar la respuesta según tus necesidades
        console.log('Jugador creado con éxito:', response);

        // Cargar nuevamente el listado de jugadores después de la creación exitosa
        this.cargarListadoJugadores();

        // Cerrar el modal después de crear el jugador
        this.cerrarModal();
      },
      (error) => {
        console.error('Error al crear el jugador:', error);
        // Puedes manejar el error según tus necesidades
      }
    );
  }

  // Método para navegar a la pantalla de calendario
  navegarACalendario(): void {
    // Puedes ajustar la ruta según tu estructura de rutas
    this.router.navigate(['/calendario', this.teamId]);
  }

}
