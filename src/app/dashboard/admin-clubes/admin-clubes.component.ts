import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { filter, take } from 'rxjs/operators';
import { LoginService } from 'src/app/core/services/login/login.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { User } from 'src/app/core/models/users/user.model';
import { Response } from 'src/app/core/services/models/response.model';
import { PlayerService } from 'src/app/core/services/player/player.service';
import { Location } from '@angular/common';
import { getCurrentSeasonString } from 'src/app/core/utils/season.utils';

@Component({
  selector: 'app-admin-clubes',
  templateUrl: './admin-clubes.component.html',
  styleUrls: ['./admin-clubes.component.scss']
})
export class AdminClubesComponent implements OnInit {

  usuarioActual!: User;
  userId = 0;
  profileId = 0;
  clubId = 0;

  // Variables de búsqueda y datos
  clubList: any[] = [];
  searchTerm: string = '';
  temporada = getCurrentSeasonString();

  clubDetalleSus: any = null;          // club seleccionado (para mostrar nombre/id)
  susDetalleClub: any = null;          // detalle suscripción
  isLoadingDetalleSus = false;
  modalDetalleSuscripcion = false;

  // --- NUEVAS VARS: modal edición ---
  modalEditField = false;
  editType: 'teams' | 'players' | 'renew' | null = null;
  editTitle = '';

  editNumberValue: number = 0;
  editDateValue: string = ''; // formato yyyy-MM-dd (input date)
  option = 0;

  constructor(
    private loginService: LoginService,
    private teamService: TeamService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private playerservice: PlayerService
  ) { }

  ngOnInit(): void {
    //this.cargarUsuario();
    this.cargarListadoClubes();
  }

  goBack(): void {
    this.location.back();
  }

  // Getter para filtrar la lista basándose en el input de búsqueda
  get filteredClubs() {
    return this.clubList.filter(club =>
      club.nombre.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  private cargarUsuario(): void {
    this.userId = Number(localStorage.getItem('userId'));
  }

  cargarListadoClubes(): void {
    localStorage.setItem('temporada', this.temporada);

    // Hardcoding de 5 clubes para pruebas según tus columnas
    /*this.clubList = [
      { id: 210, nombre: 'Real Madrid Cantera', equipos: 12, entrenadores: 24, jugadores: 250, padres: 400, clubId: 60 },
      { id: 2, nombre: 'FC Barcelona Academy', equipos: 15, entrenadores: 30, jugadores: 310, padres: 500, clubId: 0 },
      { id: 3, nombre: 'Atlético de Madrid Base', equipos: 10, entrenadores: 18, jugadores: 190, padres: 320, clubId: 0 },
      { id: 4, nombre: 'Sevilla FC Junior', equipos: 8, entrenadores: 14, jugadores: 150, padres: 210, clubId: 0 },
      { id: 5, nombre: 'Valencia CF Mestalla', equipos: 9, entrenadores: 16, jugadores: 175, padres: 280, clubId: 0 },
    ];*/

    // Cuando conectes el servicio, usa esto:
    this.teamService.getClubesAdmin(this.temporada).subscribe(
      (response: Response) => {
        if (response?.data) {
          this.clubList = response.data;
        }
      }
    );
  }

  // Acciones de la tabla
  verDetalleClub(clubId: number) {
    console.log('Navegando al club:', clubId);
    // this.router.navigate(['/admin/club', clubId]);
  }

  goToClub(userId: number, clubId: number): void {
    console.log('Navegando al club ID:', clubId);

    localStorage.setItem('userId', userId.toString());
    localStorage.setItem('clubId', clubId.toString());
    // Ejemplo de navegación:
    this.router.navigate(['/dashboard/admin-inicio', clubId, userId]);
  }

  abrirModalDetalleSuscripcion() {
    this.modalDetalleSuscripcion = true;
  }

  cerrarModalDetalleSuscripcion() {
    this.modalDetalleSuscripcion = false;
  }

  verDetalleSuscripcion(club: any) {
    // ✅ guarda el club completo para usarlo en modal (nombre, jugadores, etc)
    this.clubDetalleSus = club;

    this.susDetalleClub = null;
    this.isLoadingDetalleSus = true;

    this.teamService.getSubscriptionByPlayerId(0, club.id).subscribe({
      next: (response: any) => {
        this.susDetalleClub = response?.data ?? null;
        this.isLoadingDetalleSus = false;
        this.abrirModalDetalleSuscripcion();
      },
      error: (err: any) => {
        console.error(err);
        this.isLoadingDetalleSus = false;
        this.susDetalleClub = null;
      }
    });
  }

  // ✅ abrir mini modal
  openEditModal(type: 'teams' | 'players' | 'renew', currentValue: any) {
    this.editType = type;

    if (type === 'teams') {
      this.editTitle = 'Editar nº equipos';
      this.editNumberValue = Number(currentValue ?? 0);
    }

    if (type === 'players') {
      this.editTitle = 'Editar nº jugadores';
      this.editNumberValue = Number(currentValue ?? 0);
    }

    if (type === 'renew') {
      this.editTitle = 'Editar próxima renovación';
      // si viene "2025-07-31" perfecto; si viene otro formato, lo dejas tal cual o conviertes
      this.editDateValue = (currentValue ?? '').toString();
    }

    this.modalEditField = true;
  }

  closeEditModal() {
    this.modalEditField = false;
    this.editType = null;
    this.editTitle = '';
  }

  // ✅ guardar cambios (de momento local + luego enchufas API)
  saveEditField() {
    console.log(this.susDetalleClub);
    if (!this.editType) return;

    // 1) Equipos -> vive en susDetalleClub.numeroEquipos
    if (this.editType === 'teams' && this.susDetalleClub) {
      this.susDetalleClub.numeroEquipos = Number(this.editNumberValue ?? 0);
      this.option = 1;
    }

    // 2) Jugadores -> viene del clubDetalleSus (la fila)
    if (this.editType === 'players' && this.clubDetalleSus) {
      this.clubDetalleSus.jugadores = Number(this.editNumberValue ?? 0);
      this.option = 2;
    }

    // 3) Renovación -> susDetalleClub.dateFinal
    if (this.editType === 'renew' && this.susDetalleClub) {
      this.susDetalleClub.dateFinal = this.editDateValue;
      this.option = 3;
    }

    this.changeSusClubAdmin();
  }

  confirmReactivarSubscription() {
    this.option = 5;
    this.changeSusClubAdmin();
  }
  confirmCancelarSuscripcion() {
    this.option = 4;
    this.changeSusClubAdmin();
  }

  changeSusClubAdmin() {
    const body = {
      id: this.susDetalleClub.suscripcionId,
      equipos: this.susDetalleClub.numeroEquipos,
      jugadores: this.clubDetalleSus.jugadores,
      fecha: this.susDetalleClub.dateFinal
    };

    this.teamService.changeSusClubAdmin(body, this.option).subscribe({
      next: (response: any) => {
        if (this.option > 3) {
          this.cerrarModalDetalleSuscripcion();
        } else {
          this.closeEditModal();
        }
      },
      error: (err: any) => {
        console.error(err);
      }
    });
  }



}