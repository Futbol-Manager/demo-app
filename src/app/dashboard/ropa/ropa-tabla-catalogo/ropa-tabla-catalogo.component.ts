import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
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
import { TranslateService } from '@ngx-translate/core';

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
export class RopaTablaCartalogComponent implements OnInit, OnDestroy, OnChanges {
  @Input() clubId!: number;
  /** Temporada seleccionada (año de inicio, ej. "2025"). Si no se pasa, se usa la actual. */
  @Input() set temporada(value: string) {
    this._temporada = value != null && value !== '' ? value : getCurrentSeasonString();
  }
  get temporada(): string {
    return this._temporada;
  }
  private _temporada = getCurrentSeasonString();

  private destroy$ = new Subject<void>();
  imageBaseUrlUser = environment.images + 'user/';

  equipos: Array<{ value: number; name: string }> = [];
  teamIdSeleccionado: number | null = null;
  cargandoEquipos = false;

  prendas: RopaCatalogoPrenda[] = [];
  jugadores: JugadorTablaRopa[] = [];
  cargandoTabla = false;
  errorTabla = '';

  /** Filtro por nombre/apellido/nick de jugador (solo afecta la lista mostrada, no los totales del equipo) */
  filtroNombreJugador = '';

  tabla: { [playerId: number]: { [prendaId: number]: CeldaTabla } } = {};

  constructor(
    private ropaCatalogoService: RopaCatalogoService,
    private teamService: TeamService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.cargarEquipos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['temporada'] && !changes['temporada'].firstChange && this.clubId) {
      this.cargarEquipos(); // recarga equipos y tabla con la nueva temporada
    }
  }

  cargarEquipos(): void {
    this.cargandoEquipos = true;
    this.teamService
      .getTeamsByClubForCombo(this.clubId, this.temporada)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: Response) => {
          const raw = (res.data as Array<{ value?: number; name?: string; teamId?: number }>) || [];
          this.equipos = [
            { value: 0, name: this.translate.instant('ROPA.ALL_TEAMS') },
            ...raw.map((e: any) => ({ value: Number(e.value ?? e.teamId ?? 0), name: String(e.name ?? '') })),
          ];
          this.cargandoEquipos = false;
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
    const id = this.teamIdSeleccionado != null ? Number(this.teamIdSeleccionado) : 0;
    this.teamIdSeleccionado = id;
    this.cargarTabla();
  }

  cargarTabla(): void {
    const teamId = this.teamIdSeleccionado != null ? Number(this.teamIdSeleccionado) : 0;
    this.cargandoTabla = true;
    this.errorTabla = '';
    this.ropaCatalogoService
      .getTablaByTeam(this.clubId, teamId, this.temporada)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: Response) => {
          if (res.status === 200) {
            const data = res.data as RopaTabla;
            const rawPrendas = data.prendas || [];
            this.prendas = rawPrendas.map((p: any) => this.normalizePrenda(p));
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

  /** Jugadores visibles aplicando el filtro por nombre (nombre, apellido o nick). */
  get jugadoresFiltrados(): JugadorTablaRopa[] {
    const q = (this.filtroNombreJugador || '').trim().toLowerCase();
    if (!q) return this.jugadores;
    return this.jugadores.filter((j) => {
      const nombre = (j.nombre || '').toLowerCase();
      const apellido = (j.apellido || '').toLowerCase();
      const nick = (j.nick || '').toLowerCase();
      return nombre.includes(q) || apellido.includes(q) || nick.includes(q);
    });
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

  /**
   * Nombre de equipo a mostrar en la columna "Equipo" para un jugador.
   * 1) teamName del DTO (backend); 2) si viene teamId, se resuelve desde el combo de equipos; 3) fallback al equipo seleccionado.
   */
  getNombreEquipoJugador(jugador: JugadorTablaRopa): string {
    const dtoName = jugador.teamName ?? (jugador as any).teamName;
    if (dtoName != null && String(dtoName).trim()) {
      return String(dtoName).trim();
    }
    const tid = jugador.teamId ?? (jugador as any).teamId;
    if (tid != null && tid !== 0) {
      const fromCombo = this.getNombreEquipo(Number(tid));
      if (fromCombo) return fromCombo;
    }
    if (this.teamIdSeleccionado != null && this.teamIdSeleccionado !== 0) {
      return this.getNombreEquipo(this.teamIdSeleccionado);
    }
    return '';
  }

  /** Clase CSS del badge de equipo (colores Sphaira) según teamId; "Sin equipo" o vacío → estilo empty. */
  getEquipoBadgeClass(jugador: JugadorTablaRopa): string {
    const name = this.getNombreEquipoJugador(jugador);
    if (!name || name.trim() === '' || name.trim().toLowerCase() === 'sin equipo') {
      return 'equipo-badge equipo-badge--empty';
    }
    const tid = jugador.teamId ?? (jugador as any).teamId;
    if (tid == null || tid === 0) return 'equipo-badge equipo-badge--empty';
    const idx = Math.abs(Number(tid)) % 4;
    const variants = ['equipo-badge--green', 'equipo-badge--navy', 'equipo-badge--teal', 'equipo-badge--warm'];
    return `equipo-badge ${variants[idx]}`;
  }

  getTallaLabel(prenda: RopaCatalogoPrenda, tallaId: number | null): string {
    if (!tallaId) return '—';
    const talla = (prenda.tallas || []).find((t) => t.tallaId === tallaId);
    return talla ? talla.nombreTalla : '?';
  }

  private normalizePrenda(p: any): RopaCatalogoPrenda {
    const imagenUrl = p?.imagenUrl ?? p?.imagen_url ?? '';
    const imagenNombre = p?.imagenNombre ?? p?.imagen_nombre ?? '';
    return { ...p, imagenUrl: imagenUrl || '', imagenNombre: imagenNombre || '' } as RopaCatalogoPrenda;
  }

  /** URL de la imagen de la prenda: usa imagenUrl del API o la construye desde environment.images + imagenNombre */
  getPrendaImageUrl(prenda: RopaCatalogoPrenda | null | undefined): string | null {
    if (!prenda) return null;
    const url = (prenda as any).imagenUrl ?? (prenda as any).imagen_url;
    if (url && typeof url === 'string' && url.trim()) return url.trim();
    const nombre = (prenda as any).imagenNombre ?? (prenda as any).imagen_nombre;
    if (nombre && typeof nombre === 'string' && nombre.trim()) {
      const base = (environment as { images?: string }).images ?? 'https://appsphairatech.com/images/';
      return base.replace(/\/$/, '') + '/ropa-catalogo/' + nombre.trim();
    }
    return null;
  }
}
