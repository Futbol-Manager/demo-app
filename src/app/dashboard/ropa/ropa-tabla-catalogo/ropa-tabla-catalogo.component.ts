import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  RopaCatalogoService,
  RopaCatalogoPrenda,
  RopaCatalogoSeleccion,
  RopaTabla,
  JugadorTablaRopa,
} from 'src/app/core/services/ropa-catalogo/ropa-catalogo.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { getCurrentSeasonString } from 'src/app/core/utils/season.utils';
import { Response } from 'src/app/core/services/models/response.model';
import { environment } from 'src/environments/environment';

interface CeldaTabla {
  seleccionId: number | null;
  tallaId: number | null;
  estado: string;
  guardando: boolean;
}

@Component({
  selector: 'app-ropa-tabla-catalogo',
  templateUrl: './ropa-tabla-catalogo.component.html',
  styleUrls: ['./ropa-tabla-catalogo.component.scss'],
})
export class RopaTablaCartalogComponent implements OnInit, OnDestroy {
  @Input() clubId!: number;

  private destroy$ = new Subject<void>();
  temporada = getCurrentSeasonString();
  imageBaseUrlUser = environment.images + 'user/';

  equipos: Array<{ value: number; name: string }> = [];
  teamIdSeleccionado: number | null = null;
  cargandoEquipos = false;

  prendas: RopaCatalogoPrenda[] = [];
  jugadores: JugadorTablaRopa[] = [];
  cargandoTabla = false;
  errorTabla = '';

  tabla: { [playerId: number]: { [prendaId: number]: CeldaTabla } } = {};

  constructor(
    private ropaCatalogoService: RopaCatalogoService,
    private teamService: TeamService
  ) {}

  ngOnInit(): void {
    this.cargarEquipos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarEquipos(): void {
    this.cargandoEquipos = true;
    this.teamService
      .getTeamsByClubForCombo(this.clubId, this.temporada)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: Response) => {
          const equiposAPI = (res.data as Array<{ value: number; name: string }>) || [];
          this.equipos = [{ value: 0, name: 'Todos los equipos' }, ...equiposAPI];
          this.cargandoEquipos = false;
          // Comenzar siempre con "Todos los equipos"
          this.teamIdSeleccionado = 0;
          this.cargarTabla();
        },
        error: (err: any) => {
          console.error('[RopaTabla] Error cargando equipos:', err);
          this.cargandoEquipos = false;
        },
      });
  }

  onEquipoChange(): void {
    this.cargarTabla();
  }

  cargarTabla(): void {
    if (this.teamIdSeleccionado === null || this.teamIdSeleccionado === undefined) return;
    this.cargandoTabla = true;
    this.errorTabla = '';
    this.ropaCatalogoService
      .getTablaByTeam(this.clubId, this.teamIdSeleccionado, this.temporada)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: Response) => {
          if (res.status === 200) {
            const data = res.data as RopaTabla;
            this.prendas = data.prendas || [];
            this.jugadores = data.jugadores || [];
            this.construirTabla(data.selecciones || []);
          } else {
            this.errorTabla = 'Error al cargar los datos. Recarga la página.';
          }
          this.cargandoTabla = false;
        },
        error: (err: any) => {
          console.error('[RopaTabla] Error cargando tabla:', err);
          this.errorTabla = `Error (${err.status ?? 'sin conexión'}): ${err.error?.error?.msg || 'Inténtalo de nuevo'}`;
          this.cargandoTabla = false;
        },
      });
  }

  private construirTabla(selecciones: RopaCatalogoSeleccion[]): void {
    this.tabla = {};
    for (const jugador of this.jugadores) {
      this.tabla[jugador.playerId] = {};
      for (const prenda of this.prendas) {
        this.tabla[jugador.playerId][prenda.prendaId] = {
          seleccionId: null,
          tallaId: null,
          estado: 'pendiente',
          guardando: false,
        };
      }
    }
    for (const sel of selecciones) {
      if (this.tabla[sel.playerId]?.[sel.prendaId] !== undefined) {
        this.tabla[sel.playerId][sel.prendaId] = {
          seleccionId: sel.seleccionId,
          tallaId: sel.tallaId,
          estado: sel.estado || 'pendiente',
          guardando: false,
        };
      }
    }
  }

  onTallaChange(jugador: JugadorTablaRopa, prenda: RopaCatalogoPrenda, tallaId: number | null): void {
    const celda = this.tabla[jugador.playerId]?.[prenda.prendaId];
    if (!celda || !tallaId) return;
    celda.tallaId = tallaId;
    celda.estado = 'pendiente';
    this.guardarCelda(jugador.playerId, prenda.prendaId, tallaId, celda.estado);
  }

  toggleConfirmacion(jugador: JugadorTablaRopa, prenda: RopaCatalogoPrenda): void {
    const celda = this.tabla[jugador.playerId]?.[prenda.prendaId];
    if (!celda || !celda.tallaId) return;
    const nuevoEstado = celda.estado === 'confirmado' ? 'pendiente' : 'confirmado';
    celda.estado = nuevoEstado;
    this.guardarCelda(jugador.playerId, prenda.prendaId, celda.tallaId, nuevoEstado);
  }

  private guardarCelda(playerId: number, prendaId: number, tallaId: number, estado: string): void {
    const celda = this.tabla[playerId]?.[prendaId];
    if (!celda) return;
    celda.guardando = true;

    this.ropaCatalogoService
      .saveSeleccion({ playerId, prendaId, tallaId, estado })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: Response) => {
          if (res.status === 200) {
            const saved = res.data as RopaCatalogoSeleccion;
            celda.seleccionId = saved.seleccionId;
          }
          celda.guardando = false;
        },
        error: (err: any) => {
          console.error('[RopaTabla] Error guardando celda:', err);
          celda.guardando = false;
        },
      });
  }

  getNombreEquipo(teamId: number): string {
    const equipo = this.equipos.find((e) => e.value === teamId);
    return equipo ? equipo.name : '';
  }

  contarRespuestas(prendaId: number): number {
    return this.jugadores.filter(
      (j) => this.tabla[j.playerId]?.[prendaId]?.tallaId != null
    ).length;
  }

  contarConfirmados(prendaId: number): number {
    return this.jugadores.filter(
      (j) => this.tabla[j.playerId]?.[prendaId]?.estado === 'confirmado'
    ).length;
  }

  getTallaLabel(prenda: RopaCatalogoPrenda, tallaId: number | null): string {
    if (!tallaId) return '—';
    const talla = (prenda.tallas || []).find((t) => t.tallaId === tallaId);
    return talla ? talla.nombreTalla : '?';
  }
}
