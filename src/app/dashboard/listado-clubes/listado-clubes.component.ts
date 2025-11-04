import { Component, OnInit } from '@angular/core';
import { Response } from 'src/app/core/services/models/response.model';
import { Location } from '@angular/common';
import { LoginService } from 'src/app/core/services/login/login.service';
import { Router, ActivatedRoute } from '@angular/router';
import { ClubService } from 'src/app/core/services/club/club.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { User } from 'src/app/core/models/users/user.model';

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
  temporadaStoredValue = '2025';

  constructor(
    private loginService: LoginService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private clubService: ClubService,
    private teamService: TeamService) { }

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


}
