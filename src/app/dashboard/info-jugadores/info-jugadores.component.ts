import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router, ActivatedRoute } from '@angular/router';
import { ClubService } from 'src/app/core/services/club/club.service';
import { Response } from 'src/app/core/services/models/response.model';
import { HttpClient } from '@angular/common/http';
import * as XLSX from "xlsx";
import { Player } from 'src/app/core/services/player/player.model';

@Component({
  selector: 'app-info-jugadores',
  templateUrl: './info-jugadores.component.html',
  styleUrls: ['./info-jugadores.component.scss']
})
export class InfoJugadoresComponent implements OnInit {
  @ViewChild('dataTable', { static: false })
  table!: ElementRef;

  clubId = 0;
  datosCargados = false;
  teams: any[] = [];
  players: any[] = [];
  teamSelected: number = -1;
  // Propiedades existentes
  playerNameFilter: string = '';
  filteredPlayers: any[] = [];
  playerDniFilter: string = '';
  playerSearch: string = '';
  mostrarModalInfoJugador = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private elementRef: ElementRef,
    private dialog: MatDialog,
    private fb: FormBuilder,
    private clubService: ClubService,
    private http: HttpClient,) { }

  ngOnInit(): void {
    // Suscribirse a los cambios en los parámetros de la URL
    this.route.params.subscribe(params => {
      // Obtener el valor de teamId de los parámetros
      this.clubId = +params['clubId'];  // El + convierte el valor a número
      console.log('clubId:', this.clubId);
    });
    this.cargarListadoJugadores();
  }

  // Método para redirigir a la pantalla de jugadores con el teamId
  irAPantalla(id: number): void {
    switch (id) {
      case 0:
        this.router.navigate(['/dashboard/cuadro', this.clubId]);
        break;
    }
  }

  cargarListadoJugadores(): void {
    this.clubService.getListJugadoresByClubForTemp(this.clubId, '2024').subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response && response.data) {
          // Mapea los datos bajo 'data' a instancias del modelo Team
          this.teams = response.data.teams;
          for (let i = 0; i < this.teams.length; i++) {
            for (let a = 0; a < this.teams[i].players.length; a++) {
              this.filteredPlayers.push(this.teams[i].players[a]);
              this.players.push(this.teams[i].players[a]);
            }
          }
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
        this.datosCargados = true;
      },
      (error) => {
        console.error('Error al cargar el listado de jugadores', error);
      }
    );
  }

  loadPlayersOfTeam(): void {
    if (this.teamSelected < 0) {
      this.players = this.teams.flatMap(team => team.players); // Mostrar todos los jugadores
    } else {
      this.players = this.teams[this.teamSelected].players; // Mostrar jugadores del equipo seleccionado
    }

    this.applyNameFilter();
  }
  normalizeText(text: string): string {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  applyFilter(): void {
    const filter = this.normalizeText(this.playerSearch);
    this.filteredPlayers = this.players.filter(player => {
      return (
        (player.nombre && this.normalizeText(player.nombre).includes(filter)) ||
        (player.apellido && this.normalizeText(player.apellido).includes(filter)) ||
        (player.nameTeam && this.normalizeText(player.nameTeam).includes(filter)) ||
        (player.telefono && this.normalizeText(player.telefono).includes(filter)) ||
        (player.dni && this.normalizeText(player.dni).includes(filter)) ||
        (player.nombrePadre && this.normalizeText(player.nombrePadre).includes(filter)) ||
        (player.dniPadre && this.normalizeText(player.dniPadre).includes(filter)) ||
        (player.telefonoPadre && this.normalizeText(player.telefonoPadre).includes(filter)) ||
        (player.emailPadre && this.normalizeText(player.emailPadre).includes(filter)) ||
        (player.nombreMadre && this.normalizeText(player.nombreMadre).includes(filter)) ||
        (player.dniMadre && this.normalizeText(player.dniMadre).includes(filter)) ||
        (player.telefonoMadre && this.normalizeText(player.telefonoMadre).includes(filter)) ||
        (player.emailMadre && this.normalizeText(player.emailMadre).includes(filter))
      );
    });
  }

  // Método para filtrar jugadores por nombre
  filterPlayers(key: number): void {
    switch (key) {
      case 0:
        this.applyNameFilter();
        break;
      case 1:
        this.applyDniFilter();
        break;
    }
  }

  // Aplicar filtro por nombre a los jugadores
  applyNameFilter(): void {
    if (!this.playerNameFilter) {
      // Si el filtro está vacío, mostrar todos los jugadores
      this.filteredPlayers = this.players;
    } else {
      // Filtrar jugadores por nombre que coincida parcialmente
      this.filteredPlayers = this.players.filter(player =>
        player.nombre && player.nombre.toLowerCase().includes(this.playerNameFilter.toLowerCase())
      );
    }
  }

  // Aplicar filtro por nombre a los jugadores
  applyDniFilter(): void {
    if (!this.playerDniFilter) {
      // Si el filtro está vacío, mostrar todos los jugadores
      this.filteredPlayers = this.players;
    } else {
      // Filtrar jugadores por DNI que coincida parcialmente, y manejar los valores null
      this.filteredPlayers = this.players.filter(player =>
        player.dni && player.dni.toLowerCase().includes(this.playerDniFilter.toLowerCase())
    );
    }
  }

  exportTableToExcel(): void {
    // Comprobar si el elemento existe antes de usar su ID
    const tableElement = document.getElementById('dataTable');

    if (tableElement) {
      const ws: XLSX.WorkSheet = XLSX.utils.table_to_sheet(tableElement);

      // Resto del código (asegurar formato de cadena, ancho de columnas, etc.)
      // ... (puedes copiar y pegar el código de la respuesta anterior)

      // Crear y guardar libro de trabajo
      const wb: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

      // Personalizar nombre de archivo y opciones de guardado (opcional)
      const fileName = "tabla_exportada.xlsx"; // Ajustar según tus necesidades
      XLSX.writeFile(wb, fileName, { bookType: 'xlsx' });
    } else {
      console.error("¡Elemento 'dataTable' no encontrado!");
      // Manejar el error de forma adecuada (opcional)
      // Por ejemplo, mostrar un mensaje de alerta al usuario
    }
  }

  /*verInfoJugador(player: Player): void {
    this.selectedPlayer = player; // Almacena el jugador seleccionado en una propiedad del componente
    this.edadSeleccionada = this.fechaEnEspañol(this.selectedPlayer.fechaDeNacimiento) + ' (' + this.calcularEdad(player.fechaDeNacimiento) + ')';
    this.mostrarEdad = true;
    this.mostrarModalInfoJugador = true; // Activa el indicador para mostrar el modal

    // Aquí llamamos a la función para cargar el gráfico de radar
    this.cargarGraficoRadar();
  }*/
  
  // Método para cerrar el modal de información del jugador
  cerrarModalInfoJugador() {
    this.mostrarModalInfoJugador = false;
  }

  fechaEnEspañol(fecha: string): string {
    const partes = fecha.split('-');
    const fechaObj = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));

    const dia = fechaObj.getDate();
    const mes = fechaObj.getMonth() + 1;
    const año = fechaObj.getFullYear();

    const diaStr = dia < 10 ? '0' + dia : dia.toString();
    const mesStr = mes < 10 ? '0' + mes : mes.toString();

    return `${diaStr}/${mesStr}/${año}`;
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

}
