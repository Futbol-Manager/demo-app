import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ClubService } from 'src/app/core/services/club/club.service';
import { Response } from 'src/app/core/services/models/response.model';

@Component({
  selector: 'app-estadisticas-equipos-club',
  templateUrl: './estadisticas-equipos-club.component.html',
  styleUrls: ['./estadisticas-equipos-club.component.scss']
})
export class EstadisticasEquiposClubComponent implements OnInit {
  clubId = 0;
  resumenes: any[] = [];
  resumentotales: any[] = [];
  datosCargados = false;
  partidos: any[] = [];
  partidosTeamSelected: any[] = [];
  
  playerSearch: string = '';
  filteredPlayers: any[] = [];
  mostarTabla = false;
  loading = true;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private clubService: ClubService,
    private http: HttpClient,
    private elementRef: ElementRef) { }

  ngOnInit(): void {
    // Suscribirse a los cambios en los parámetros de la URL
    this.route.params.subscribe(params => {
      // Obtener el valor de teamId de los parámetros
      this.clubId = +params['clubId'];  // El + convierte el valor a número
      console.log('clubId:', this.clubId);
    });
    this.getListaPostpartidos();
  }

  // Método para redirigir a la pantalla de jugadores con el teamId
  irAPantalla(id: number): void {
    switch (id) {
      case 0:
        this.router.navigate(['/dashboard/cuadro-de-mandos', this.clubId]);
        break;
    }
  }

  getListaPostpartidos() {
    this.clubService.getListTeamsOfClubByStadistics(this.clubId).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response && response.data && Array.isArray(response.data)) {
          // Mapea los datos bajo 'data' a instancias del modelo Team
          this.resumenes = response.data; 
          for (let index = 0; index < this.resumenes.length; index++) {
            if(!this.resumenes[index].nameTeam.includes("Sin equipo")){
              this.datosResumentTotales(this.resumenes[index]);
            }
          }
          this.datosCargados = true;
          this.loading = false;
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }
  
  datosResumentTotales(team: any) {
    let vic = 0;
    let emp = 0;
    let der = 0;
    let gf = 0;
    let gc = 0;
    let dg = 0;
    let pun = 0;

    // Obtener los primeros 5 resultados que realmente son los ultimos
    this.partidos = team.partidos;
    const ultimosResultados = this.partidos.slice(0, 5).map(partido => partido.resultado).reverse();

    for (let partido of team.partidos) {
      // Aquí dentro del bucle, puedes acceder a cada elemento de la lista como "partido"
      switch (partido.resultado) {
        case 'V':
          vic++;
          pun = pun + 3;
          break;
        case 'E':
          emp++;
          pun = pun + 1;
          break;
        case 'D':
          der++;
          break;
      }

      gf = gf + partido.golesAFavor;
      gc = gc + partido.golesEnContra;
      dg = gf - gc;
    }

    const resumen = {
      teamId: team.teamId,
      equipo: team.nameTeam,
      partidos: team.partidos.length,
      victorias: vic,
      empates: emp,
      derrotas: der,
      gf: gf,
      gc: gc,
      dg: dg,
      puntos: pun,
      ultimos: ultimosResultados //['Ganado', 'Empatado', 'Perdido', 'Ganado', 'Ganado']
    };

    this.resumentotales.push(resumen);
  }

  verTablaequipo(index: number){
    //console.log(this.resumenes[index].teamId);
    //console.log(this.resumenes[index].partidos);
    this.partidosTeamSelected = this.resumenes[index].partidos;
    this.filteredPlayers = this.partidosTeamSelected;
    this.mostarTabla = true;
  }

  applyFilter(): void {
    const filter = this.normalizeText(this.playerSearch);
    this.filteredPlayers = this.partidosTeamSelected.filter(partido => {
      return (
        (partido.matchPreparation.rivalName && this.normalizeText(partido.matchPreparation.rivalName).includes(filter)) ||
        (partido.resultado && this.normalizeText(partido.resultado).includes(filter))
      );
    });
  }
  
  normalizeText(text: string): string {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
  

  exportTableToExcel(){

  }

  openInfoPostPartido(value: number){

  }

  getIcono(resultado: string): string {
    const iconos: { [key: string]: string } = {
      'V': '🟢',
      'E': '🟡',
      'D': '🔴'
    };
    return iconos[resultado] || '❓';
  }
  
}
