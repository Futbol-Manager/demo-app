import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { Subscription } from 'rxjs';
import { PlayerService } from 'src/app/core/services/player/player.service';
import { LoginService } from 'src/app/core/services/login/login.service';
import { RopaCatalogoService, RopaCatalogoPrenda, RopaCatalogoSeleccion } from 'src/app/core/services/ropa-catalogo/ropa-catalogo.service';
import { getCurrentSeasonString } from 'src/app/core/utils/season.utils';

@Component({
  selector: 'app-ropa-jugador',
  templateUrl: './ropa-jugador.component.html',
  styleUrls: ['./ropa-jugador.component.scss']
})
export class RopaJugadorComponent implements OnInit, OnDestroy {
  private subs: Subscription[] = [];

  teamId = 0;
  playerId = 0;
  clubId = 0;
  temporada = getCurrentSeasonString();

  prendas: RopaCatalogoPrenda[] = [];
  selecciones: { [prendaId: number]: RopaCatalogoSeleccion } = {};
  cargando = true;
  error = '';
  guardando: { [prendaId: number]: boolean } = {};

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private playerService: PlayerService,
    private loginService: LoginService,
    private ropaCatalogoService: RopaCatalogoService,
  ) {}

  ngOnInit(): void {
    if (localStorage.getItem('temporada')) {
      this.temporada = localStorage.getItem('temporada')!;
    }

    this.subs.push(
      this.route.params.subscribe(params => {
        this.teamId = +params['teamId'];
        this.playerId = +params['playerId'];
        this.cargarDatos();
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  goBack(): void {
    this.location.back();
  }

  private cargarDatos(): void {
    this.cargando = true;
    this.error = '';

    // Obtenemos el clubId del equipo a través de los jugadores del equipo
    this.playerService.getPlayers(this.teamId.toString()).subscribe({
      next: (res: any) => {
        this.clubId = res?.data?.clubId ?? 0;
        if (!this.clubId) {
          this.error = 'No se pudo obtener el equipo. Inténtalo de nuevo.';
          this.cargando = false;
          return;
        }
        this.cargarPrendas();
      },
      error: () => {
        this.error = 'Error al cargar los datos del equipo.';
        this.cargando = false;
      }
    });
  }

  private cargarPrendas(): void {
    this.ropaCatalogoService.getPrendasByTeam(this.clubId, this.teamId, this.temporada).subscribe({
      next: (res: any) => {
        this.prendas = (res?.data as RopaCatalogoPrenda[]) || [];
        this.cargarSelecciones();
      },
      error: () => {
        this.error = 'Error al cargar el catálogo de ropa.';
        this.cargando = false;
      }
    });
  }

  private cargarSelecciones(): void {
    this.ropaCatalogoService.getSeleccionesPlayer(this.playerId, this.temporada).subscribe({
      next: (res: any) => {
        const sels: RopaCatalogoSeleccion[] = (res?.data as RopaCatalogoSeleccion[]) || [];
        this.selecciones = {};
        for (const s of sels) {
          this.selecciones[s.prendaId] = s;
        }
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
      }
    });
  }

  getTallaSeleccionada(prendaId: number): number {
    return this.selecciones[prendaId]?.tallaId ?? 0;
  }

  onTallaChange(prenda: RopaCatalogoPrenda, tallaId: number): void {
    const sel = this.selecciones[prenda.prendaId];
    const seleccion: Partial<RopaCatalogoSeleccion> = {
      seleccionId: sel?.seleccionId,
      playerId: this.playerId,
      prendaId: prenda.prendaId,
      tallaId: tallaId || undefined,
      estado: sel?.estado || 'pendiente',
    };

    this.guardando[prenda.prendaId] = true;
    this.ropaCatalogoService.saveSeleccion(seleccion).subscribe({
      next: (res: any) => {
        if (res?.data) {
          this.selecciones[prenda.prendaId] = res.data;
        } else {
          this.selecciones[prenda.prendaId] = { ...seleccion, tallaId: tallaId } as RopaCatalogoSeleccion;
        }
        this.guardando[prenda.prendaId] = false;
      },
      error: () => {
        this.guardando[prenda.prendaId] = false;
      }
    });
  }

  getEstadoBadgeClass(prendaId: number): string {
    const estado = this.selecciones[prendaId]?.estado;
    if (estado === 'entregada') return 'badge bg-success';
    if (estado === 'confirmado') return 'badge bg-primary';
    return 'badge bg-secondary';
  }

  getEstadoLabel(prendaId: number): string {
    return this.selecciones[prendaId]?.estado || 'pendiente';
  }
}
