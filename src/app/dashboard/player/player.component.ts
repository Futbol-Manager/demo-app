import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { User } from 'src/app/core/models/users/user.model';
import { PlayerService } from 'src/app/core/services/player/player.service';
import { Response } from 'src/app/core/services/models/response.model';
import { Player, PlayerNEW } from 'src/app/core/services/player/player.model';
import * as $ from 'jquery';
import 'datatables.net';
import { Chart, registerables } from 'chart.js/auto';
// Registra los complementos necesarios
Chart.register(...registerables);


// player.model.ts
export interface Player1 {
  id: number;
  nombre: string;
  apellido: string;
  fechaNacimiento: string;
  posicion: string;
}


@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.scss']
})
export class PlayerComponent implements OnInit {

  usuarioActual!: User | null;
  teamId!: number;
  showModal = false;
  mostrarModalInfoJugador = false;
  selectedPlayer: PlayerNEW = new PlayerNEW();
  player: PlayerNEW = new PlayerNEW();
  radarChart: Chart | null = null; // Inicializar la variable radarChart
  mostrarEdad: boolean = false;
  edadSeleccionada: number = 0;

  players: any[] = []; // Define una variable para almacenar el listado de equipos
  /*players: Player1[] = [
    { id: 1, nombre: 'Juan', apellido: 'Pérez', fechaNacimiento: '1990-05-15', posicion: 'Delantero' },
    { id: 2, nombre: 'María', apellido: 'Gómez', fechaNacimiento: '1988-10-20', posicion: 'Mediocampista' },
    { id: 3, nombre: 'Carlos', apellido: 'Martínez', fechaNacimiento: '1995-03-07', posicion: 'Defensor' },
    { id: 4, nombre: 'Laura', apellido: 'López', fechaNacimiento: '1992-07-12', posicion: 'Portero' },
    { id: 5, nombre: 'Pedro', apellido: 'Sánchez', fechaNacimiento: '1987-12-30', posicion: 'Delantero' },
    { id: 22, nombre: 'María', apellido: 'Gómez', fechaNacimiento: '1988-10-20', posicion: 'Mediocampista' },
    { id: 32, nombre: 'Carlos', apellido: 'Martínez', fechaNacimiento: '1995-03-07', posicion: 'Defensor' },
    { id: 42, nombre: 'Laura', apellido: 'López', fechaNacimiento: '1992-07-12', posicion: 'Portero' },
    { id: 223, nombre: 'María', apellido: 'Gómez', fechaNacimiento: '1988-10-20', posicion: 'Mediocampista' },
    { id: 33, nombre: 'Carlos', apellido: 'Martínez', fechaNacimiento: '1995-03-07', posicion: 'Defensor' },
    { id: 43, nombre: 'Laura', apellido: 'López', fechaNacimiento: '1992-07-12', posicion: 'Portero' },
    { id: 21, nombre: 'María', apellido: 'Gómez', fechaNacimiento: '1988-10-20', posicion: 'Mediocampista' },
    { id: 31, nombre: 'Carlos', apellido: 'Martínez', fechaNacimiento: '1995-03-07', posicion: 'Defensor' },
    { id: 41, nombre: 'Laura', apellido: 'López', fechaNacimiento: '1992-07-12', posicion: 'Portero' }
  ];*/

  

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
          this.players = response.data.map((player: Player) => new Player(player));
          // Inicializar el DataTable después de cargar los datos
          this.inicializarDataTable();
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de jugadores', error);
      }
    );
  }

  // Método para inicializar el DataTable
  inicializarDataTable(): void {
    // Destruir el DataTable si ya existe
    const $dataTable = $('#dataTable');
    if ($dataTable.hasClass('dataTable')) {
      $dataTable.DataTable().destroy();
    }

    $(document).ready(() => {
      $('#dataTable').DataTable({
        paging: true,
        pageLength: 25, // Establecer el número de resultados por página
        searching: true,
        ordering: true,
        columnDefs: [
            {
                targets: [0], // El índice de la columna que deseas ocultar (en este caso, Player ID)
                visible: false // Establecer visible como falso oculta la columna
            }
        ]
      });
    });
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
    this.inicializePlayer();
    this.showModal = true;
  }



  // Método para cerrar el modal de creación de equipo
  cerrarModal(): void {
    this.showModal = false;
    // Limpiar los datos del nuevo equipo al cerrar el modal si es necesario
    this.inicializePlayer();
  }

  // Método para crear un nuevo equipo
  crearJugador(): void {    
    // Crear una instancia de PlayerNEW y asignar los campos del modal
    this.player = {
      playerId: this.player.playerId !== 0 ? this.player.playerId : 0,
      ability: this.player.ability,
      abilityFootBad: this.player.abilityFootBad,
      birthdate: this.player.birthdate, // O ajusta según tus necesidades
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
    this.router.navigate(['/dashboard/calendario', this.teamId]);
  }

  inicializePlayer(){
    this.player = {
      playerId: 0, // O el valor por defecto que desees para playerId
      ability: 50,
      abilityFootBad: 50,
      birthdate: '', // O ajusta según tus necesidades
      dateCreate: new Date(), // O ajusta según tus necesidades
      dateEdit: new Date(), // O ajusta según tus necesidades
      dribbling: 50,
      finishFoot: 50,
      finishHead: 50,
      firstName: '', // Agrega el valor por defecto correspondiente
      footNatural: 1, // Valor por defecto para el combo de pie natural
      forcePlayer: 50,
      height: '', // Valor por defecto para el campo de altura
      hit: 50,
      jump: 50,
      picturePlayer: '', // Agrega el valor por defecto correspondiente
      position: 4, // Agrega el valor por defecto correspondiente
      resistance: 50,
      secondName: '', // Agrega el valor por defecto correspondiente
      speed: 50,
      weight: '', // Valor por defecto para el campo de peso
      opinion: '' // Agrega el valor por defecto correspondiente
    };
  }

  editarJugador(playerId: number): void {
    const jugadorSeleccionado = this.players.find(player => player.playerId === playerId);
    this.player = jugadorSeleccionado;
    this.showModal = true; // Suponiendo que tienes una variable que controla la visibilidad del modal de edición
  }
  
  verInfoJugador(player: Player): void {
    this.selectedPlayer = player; // Almacena el jugador seleccionado en una propiedad del componente
    this.edadSeleccionada = this.calcularEdad(player.birthdate);
    this.mostrarEdad = true;
    this.mostrarModalInfoJugador = true; // Activa el indicador para mostrar el modal

    // Aquí llamamos a la función para cargar el gráfico de radar
    this.cargarGraficoRadar();
  }

  // Método para cargar el gráfico de radar con los datos del jugador
  cargarGraficoRadar() {
    // Antes de crear el nuevo gráfico, destruye el gráfico existente si es necesario
    if (this.radarChart) {
      this.radarChart.destroy(); // Destruye el gráfico existente
    }
    const ctx = document.getElementById('radarChart') as HTMLCanvasElement;
    this.radarChart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['Resistencia', 'Regate', 'Finalización con Pie', 'Fuerza', 'Velocidad', 'Habilidad'],
        datasets: [{
          label: 'Atributos del Jugador',
          data: [
            this.selectedPlayer.resistance,
            this.selectedPlayer.dribbling,
            this.selectedPlayer.finishFoot,
            this.selectedPlayer.forcePlayer,
            this.selectedPlayer.speed,
            this.selectedPlayer.ability
          ],
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Gráfica del jugador'
          }
        },
        scales: {
          r: {
            angleLines: {
              display: true
            },
            pointLabels: {
              font: {
                size: 14
              }
            },
            min: 0, // Establece el valor mínimo del eje radial
            max: 100 // Establece el valor máximo del eje radial
          }
        }
      }
    });
  }

  // Método para cerrar el modal de información del jugador
  cerrarModalInfoJugador() {
    this.mostrarModalInfoJugador = false;
  }

  // Método para calcular la edad del jugador a partir de su fecha de nacimiento
  calcularEdad(fechaNacimientoString: string): number {
    // Convertimos la cadena de fecha de nacimiento a un objeto Date
    const fechaNacimiento = new Date(fechaNacimientoString);

    const hoy = new Date();
    const cumpleanos = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - cumpleanos.getFullYear();
    const mes = hoy.getMonth() - cumpleanos.getMonth();

    if (mes < 0 || (mes === 0 && hoy.getDate() < cumpleanos.getDate())) {
      edad--;
    }

    return edad;
  }

  getPositionText(position: string): string {
    switch (position) {
      case '1':
        return 'Portero';
      case '2':
        return 'Defensa';
      case '3':
        return 'Centrocampista';
      case '4':
        return 'Delantero';
      default:
        return 'Desconocido';
    }
  }

}
