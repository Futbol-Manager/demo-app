import { Component, OnInit } from '@angular/core';
import { Response } from 'src/app/core/services/models/response.model';
import { Location } from '@angular/common';
import { LoginService } from 'src/app/core/services/login/login.service';
import { ClubService } from 'src/app/core/services/club/club.service';
import { User } from 'src/app/core/models/users/user.model';
import { getCurrentSeasonString } from 'src/app/core/utils/season.utils';

@Component({
  selector: 'app-listado-clubes',
  templateUrl: './listado-clubes.component.html',
  styleUrls: ['./listado-clubes.component.scss']
})
export class ListadoClubesComponent implements OnInit {

  isLoading = true;
  filtro: string = '';
  listaClubesFiltrados: any[] = [];
  listHistoryPagos: any[] = [];
  listaClubes: any[] = [];
  ordenActual: string = '';
  ascendente: boolean = true;
  usuarioActual!: User | null;
  userIdClub = 0;
  userId = 0;
  temporadaStoredValue = getCurrentSeasonString();
  equiposClubSelected = 0;
  suscripcionSelected = 0;
  equiposDelClub = 0;

  // Props de estado del modal
  showModalVerEquipos = false;
  equiposClubEdit = 0;     // input del formulario
  private selectedClubId: number | null = null;

  constructor(
    private loginService: LoginService,
    private location: Location,
    private clubService: ClubService) { }

  ngOnInit(): void {
    if (localStorage.getItem('temporada') != null && localStorage.getItem('temporada') != undefined) {
      this.temporadaStoredValue = localStorage.getItem('temporada')!.toString();
    }

    this.loginService.usuarioActual.subscribe(user => {
      this.usuarioActual = user;
      this.userId = this.usuarioActual!.userId;

      this.loadTabla();
    });
  }

  loadTabla() {
    this.clubService.getListInfoClubesFede(this.userId, this.temporadaStoredValue).subscribe(
      (response: Response) => {
        this.listaClubes = response.data;
        this.listaClubesFiltrados = [...this.listaClubes];
        this.isLoading = false;
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  goBack(): void {
    this.location.back();
  }

  filtrarClubes() {
    const texto = this.filtro.toLowerCase();
    this.listaClubesFiltrados = this.listaClubes.filter(p =>
      (`${p.nombre}`.toLowerCase().includes(texto)));
  }

  ordenarPor(campo: string) {
    if (this.ordenActual === campo) {
      this.ascendente = !this.ascendente;
    } else {
      this.ordenActual = campo;
      this.ascendente = true;
    }

    this.listaClubesFiltrados.sort((a, b) => {
      const valA = a[campo];
      const valB = b[campo];

      // Si ambos son números, comparamos numéricamente
      if (!isNaN(valA) && !isNaN(valB)) {
        return this.ascendente ? valA - valB : valB - valA;
      }

      // Si son strings, comparamos alfabéticamente
      const strA = (valA ?? '').toString().toLowerCase();
      const strB = (valB ?? '').toString().toLowerCase();
      return this.ascendente ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }

  verEquiposClub(userId: number) {
    this.equiposClubEdit = 0;
    this.selectedClubId = userId;

    // Busca el club en tu lista para precargar datos
    const club = this.listaClubesFiltrados.find(c => c.userId === userId || c.userIdClub === userId);
    this.equiposClubSelected = club?.numEquipos ?? 0;
    this.suscripcionSelected = club.suscripcionId;
    this.equiposDelClub = club.equipos;

    this.showModalVerEquipos = true;
  }

  cerrarModalVerEquipos() {
    this.showModalVerEquipos = false;
    this.selectedClubId = 0;
    this.equiposClubEdit = 0;
  }

  cambioEquiposClub() {
    const numEquipos = this.equiposClubEdit;
    if ((this.equiposDelClub - 1) > numEquipos) {
      alert('Este club ya tiene creados ' + (this.equiposDelClub - 1) +
        ' equipos, por lo que no puede ser menor de eso. En cuyo caso, elimina primero los equipos necesarios y repite esta acción.'
      );
      return;
    };

    this.clubService.setEquiposClub(this.suscripcionSelected, numEquipos).subscribe(
      (response: Response) => {
        // 1) Actualiza en memoria (UI inmediata)
        const idx = this.listaClubesFiltrados.findIndex(c => c.suscripcionId === this.suscripcionSelected);
        if (idx > -1) {
          this.listaClubesFiltrados[idx].numEquipos = Number(numEquipos);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
    this.cerrarModalVerEquipos();
  }
}