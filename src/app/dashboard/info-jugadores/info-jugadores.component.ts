import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router, ActivatedRoute } from '@angular/router';
import { ClubService } from 'src/app/core/services/club/club.service';
import { Response } from 'src/app/core/services/models/response.model';
import { HttpClient } from '@angular/common/http';

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

}
