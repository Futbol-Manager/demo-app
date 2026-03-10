import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, lastValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  RopaCatalogoService,
  RopaCatalogoPrenda,
  RopaCatalogoTalla,
  RopaCatalogoSeleccion,
  RopaDocumentoGeneral,
} from 'src/app/core/services/ropa-catalogo/ropa-catalogo.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { getCurrentSeasonString } from 'src/app/core/utils/season.utils';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-ropa-catalogo',
  templateUrl: './ropa-catalogo.component.html',
  styleUrls: ['./ropa-catalogo.component.scss'],
})
export class RopaCatalogoComponent implements OnInit, OnDestroy, OnChanges {
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

  prendas: RopaCatalogoPrenda[] = [];
  documentos: RopaDocumentoGeneral[] = [];
  seleccionesPorPrenda: { [prendaId: number]: RopaCatalogoSeleccion[] } = {};

  equipos: Array<{ value: number; name: string }> = [];
  cargandoPrendas = false;
  cargandoDocumentos = false;
  guardando = false;
  errorModal = '';
  errorDoc = '';

  // ─── Formulario nueva/editar prenda ───────────────────────────────────────
  mostrarFormPrenda = false;
  editandoPrenda: Partial<RopaCatalogoPrenda> | null = null;
  imagenSeleccionada: File | null = null;
  imagenPreview: string | null = null;
  nuevaTalla = '';
  tallasForm: Array<{ nombre: string; orden: number }> = [];
  prendaExpandida: number | null = null;

  // ─── Modal respuestas jugadores ─────────────────────────────────────────
  modalSeleccionesAbierto = false;
  prendaEnModal: RopaCatalogoPrenda | null = null;
  cargandoSeleccionesModal = false;

  // ─── Formulario nuevo documento ───────────────────────────────────────────
  mostrarFormDocumento = false;
  docNombre = '';
  docDescripcion = '';
  docTeamId: number | null = null;
  archivoSeleccionado: File | null = null;

  // ─── Modal confirmación (estilo Sphaira) ───────────────────────────────────
  confirmacionAbierta = false;
  confirmacionTitulo = '';
  confirmacionMensaje = '';
  confirmacionTipo: 'prenda' | 'documento' | null = null;
  confirmacionId: number | null = null;
  confirmando = false;

  constructor(
    private ropaCatalogoService: RopaCatalogoService,
    private teamService: TeamService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.cargarEquipos();
    this.cargarPrendas();
    this.cargarDocumentos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['temporada'] && !changes['temporada'].firstChange && this.clubId) {
      this.cargarPrendas();
      this.cargarDocumentos();
      this.cargarEquipos();
    }
  }

  /** Etiqueta de temporada para mostrar (ej. "2025/2026"). */
  get temporadaLabel(): string {
    const y = parseInt(this.temporada, 10);
    if (isNaN(y)) return this.temporada;
    return `${y}/${y + 1}`;
  }

  // ─── CARGA ────────────────────────────────────────────────────────────────

  cargarEquipos(): void {
    this.teamService
      .getTeamsByClubForCombo(this.clubId, this.temporada)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.equipos = (res.data as any[]) || [];
        },
        error: (err: any) => console.error('[RopaCatalogo] Error cargando equipos:', err),
      });
  }

  cargarPrendas(): void {
    this.cargandoPrendas = true;
    this.ropaCatalogoService
      .getPrendasByClub(this.clubId, this.temporada)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const raw = (res.data as any[]) || [];
          this.prendas = raw.map((p: any) => this.normalizePrenda(p));
          this.cargandoPrendas = false;
        },
        error: (err) => {
          console.error('[RopaCatalogo] Error cargando prendas:', err);
          this.cargandoPrendas = false;
        },
      });
  }

  cargarDocumentos(): void {
    this.cargandoDocumentos = true;
    this.ropaCatalogoService
      .getDocumentosByClub(this.clubId, this.temporada)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.documentos = (res.data as RopaDocumentoGeneral[]) || [];
          this.cargandoDocumentos = false;
        },
        error: (err) => {
          console.error('[RopaCatalogo] Error cargando documentos:', err);
          this.cargandoDocumentos = false;
        },
      });
  }

  cargarSeleccionesPrenda(prendaId: number): void {
    this.ropaCatalogoService
      .getSeleccionesByPrenda(prendaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.seleccionesPorPrenda[prendaId] = (res.data as RopaCatalogoSeleccion[]) || [];
          this.cargandoSeleccionesModal = false;
        },
        error: (err) => {
          console.error('[RopaCatalogo] Error cargando selecciones:', err);
          this.cargandoSeleccionesModal = false;
        },
      });
  }

  // ─── PRENDAS ──────────────────────────────────────────────────────────────

  abrirFormNuevaPrenda(): void {
    this.editandoPrenda = {
      clubId: this.clubId,
      temporada: this.temporada,
      activo: 1,
      teamId: null,
    };
    this.imagenSeleccionada = null;
    this.imagenPreview = null;
    this.tallasForm = [];
    this.nuevaTalla = '';
    this.errorModal = '';
    this.mostrarFormPrenda = true;
  }

  abrirFormEditarPrenda(prenda: RopaCatalogoPrenda): void {
    this.editandoPrenda = { ...prenda };
    this.imagenSeleccionada = null;
    this.imagenPreview = this.getPrendaImageUrl(prenda) || null;
    this.tallasForm = (prenda.tallas || []).map((t) => ({ nombre: t.nombreTalla, orden: t.orden }));
    this.nuevaTalla = '';
    this.errorModal = '';
    this.mostrarFormPrenda = true;
  }

  cerrarFormPrenda(): void {
    this.mostrarFormPrenda = false;
    this.editandoPrenda = null;
  }

  onImagenSeleccionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        this.mostrarMensaje('Solo se permiten imágenes JPG, PNG o WebP', 'error');
        return;
      }
      this.imagenSeleccionada = file;
      const reader = new FileReader();
      reader.onload = (e) => (this.imagenPreview = e.target?.result as string);
      reader.readAsDataURL(file);
    }
  }

  agregarTallaForm(): void {
    const nombre = this.nuevaTalla.trim();
    if (!nombre) return;
    this.tallasForm.push({ nombre, orden: this.tallasForm.length });
    this.nuevaTalla = '';
  }

  eliminarTallaForm(index: number): void {
    this.tallasForm.splice(index, 1);
  }

  guardarPrenda(): void {
    if (!this.editandoPrenda?.nombre?.trim()) {
      this.errorModal = 'El nombre de la prenda es obligatorio.';
      return;
    }
    this.errorModal = '';
    this.guardando = true;
    const isEdicion = !!(this.editandoPrenda as RopaCatalogoPrenda).prendaId;
    const obs = isEdicion
      ? this.ropaCatalogoService.updatePrenda(this.editandoPrenda!, this.imagenSeleccionada || undefined)
      : this.ropaCatalogoService.createPrenda(this.editandoPrenda!, this.imagenSeleccionada || undefined);

    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: async (res) => {
        if (res.status === 200) {
          const prenda = res.data as RopaCatalogoPrenda;
          await this.sincronizarTallas(
            prenda.prendaId,
            isEdicion ? (this.editandoPrenda as RopaCatalogoPrenda).tallas || [] : []
          );
          this.guardando = false;
          this.cerrarFormPrenda();
          this.mostrarMensaje('Prenda guardada correctamente', 'success');
          this.cargarPrendas();
        } else {
          this.guardando = false;
          this.errorModal = 'Error al guardar la prenda. Comprueba la conexión con el servidor.';
        }
      },
      error: (err) => {
        console.error('[RopaCatalogo] Error guardando prenda:', err);
        this.guardando = false;
        this.errorModal = `Error al guardar (${err.status ?? 'sin conexión'}): ${err.error?.error?.msg || err.message || 'Inténtalo de nuevo'}`;
      },
    });
  }

  private async sincronizarTallas(prendaId: number, tallasExistentes: RopaCatalogoTalla[]): Promise<void> {
    const nombresNuevos = this.tallasForm.map((t) => t.nombre.trim().toLowerCase());
    const nombresExistentes = tallasExistentes.map((t) => t.nombreTalla.trim().toLowerCase());

    const tallasAEliminar = tallasExistentes.filter(
      (t) => !nombresNuevos.includes(t.nombreTalla.trim().toLowerCase())
    );
    const tallasAañadir = this.tallasForm.filter(
      (t) => !nombresExistentes.includes(t.nombre.trim().toLowerCase())
    );

    const promesas: Promise<void>[] = [];

    tallasAEliminar.forEach((t) => {
      promesas.push(
        lastValueFrom(this.ropaCatalogoService.deleteTalla(t.tallaId)).then(() => {}).catch(() => {})
      );
    });

    tallasAañadir.forEach((t, idx) => {
      promesas.push(
        lastValueFrom(
          this.ropaCatalogoService.addTalla({ prendaId, nombreTalla: t.nombre, orden: idx })
        ).then(() => {}).catch(() => {})
      );
    });

    await Promise.all(promesas);
  }

  eliminarPrenda(prendaId: number): void {
    this.confirmacionTitulo = 'Eliminar prenda';
    this.confirmacionMensaje = '¿Estás seguro de que quieres eliminar esta prenda? Esta acción no se puede deshacer.';
    this.confirmacionTipo = 'prenda';
    this.confirmacionId = prendaId;
    this.confirmacionAbierta = true;
  }

  eliminarDocumento(documentoId: number): void {
    this.confirmacionTitulo = 'Eliminar documento';
    this.confirmacionMensaje = '¿Estás seguro de que quieres eliminar este documento?';
    this.confirmacionTipo = 'documento';
    this.confirmacionId = documentoId;
    this.confirmacionAbierta = true;
  }

  cerrarConfirmacion(): void {
    if (!this.confirmando) {
      this.confirmacionAbierta = false;
      this.confirmacionTipo = null;
      this.confirmacionId = null;
    }
  }

  confirmarEliminacion(): void {
    if (this.confirmacionTipo === 'prenda' && this.confirmacionId != null) {
      this.confirmando = true;
      this.ropaCatalogoService
        .deletePrenda(this.confirmacionId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.mostrarMensaje('Prenda eliminada correctamente', 'success');
            this.confirmacionAbierta = false;
            this.confirmacionTipo = null;
            this.confirmacionId = null;
            this.confirmando = false;
            this.cargarPrendas();
          },
          error: (err) => {
            console.error('[RopaCatalogo] Error eliminando prenda:', err);
            this.mostrarMensaje('No se pudo eliminar la prenda. Inténtalo de nuevo.', 'error');
            this.confirmando = false;
          },
        });
    } else if (this.confirmacionTipo === 'documento' && this.confirmacionId != null) {
      this.confirmando = true;
      this.ropaCatalogoService
        .deleteDocumento(this.confirmacionId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.mostrarMensaje('Documento eliminado correctamente', 'success');
            this.confirmacionAbierta = false;
            this.confirmacionTipo = null;
            this.confirmacionId = null;
            this.confirmando = false;
            this.cargarDocumentos();
          },
          error: (err) => {
            console.error('[RopaCatalogo] Error eliminando documento:', err);
            this.mostrarMensaje('No se pudo eliminar el documento. Inténtalo de nuevo.', 'error');
            this.confirmando = false;
          },
        });
    }
  }

  private mostrarMensaje(mensaje: string, tipo: 'success' | 'error'): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 3200,
      panelClass: tipo === 'success' ? 'sphaira-snackbar-success' : 'sphaira-snackbar-error',
    });
  }

  toggleSeleccionesPrenda(prendaId: number): void {
    if (this.prendaExpandida === prendaId) {
      this.prendaExpandida = null;
    } else {
      this.prendaExpandida = prendaId;
      if (!this.seleccionesPorPrenda[prendaId]) {
        this.cargarSeleccionesPrenda(prendaId);
      }
    }
  }

  abrirModalSelecciones(prenda: RopaCatalogoPrenda): void {
    this.prendaEnModal = prenda;
    this.modalSeleccionesAbierto = true;
    if (!this.seleccionesPorPrenda[prenda.prendaId]) {
      this.cargandoSeleccionesModal = true;
      this.cargarSeleccionesPrenda(prenda.prendaId);
    }
  }

  cerrarModalSelecciones(): void {
    this.modalSeleccionesAbierto = false;
    this.prendaEnModal = null;
  }

  // ─── DOCUMENTOS ───────────────────────────────────────────────────────────

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.archivoSeleccionado = input.files[0];
    }
  }

  subirDocumento(): void {
    if (!this.docNombre.trim()) {
      this.errorDoc = 'El nombre del documento es obligatorio.';
      return;
    }
    if (!this.archivoSeleccionado) {
      this.errorDoc = 'Selecciona un archivo para subir.';
      return;
    }
    this.errorDoc = '';
    this.guardando = true;
    const dto: Partial<RopaDocumentoGeneral> = {
      clubId: this.clubId,
      teamId: this.docTeamId,
      nombre: this.docNombre,
      descripcion: this.docDescripcion,
      temporada: this.temporada,
    };
    this.ropaCatalogoService
      .uploadDocumento(dto, this.archivoSeleccionado)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.guardando = false;
          if (res.status === 200) {
            this.mostrarMensaje('Documento subido correctamente', 'success');
            this.resetFormDocumento();
            this.cargarDocumentos();
          } else {
            this.errorDoc = 'Error al subir el documento. Inténtalo de nuevo.';
          }
        },
        error: (err) => {
          console.error('[RopaCatalogo] Error subiendo documento:', err);
          this.guardando = false;
          this.errorDoc = `Error (${err.status ?? 'sin conexión'}): ${err.error?.error?.msg || err.message || 'Inténtalo de nuevo'}`;
        },
      });
  }


  private resetFormDocumento(): void {
    this.mostrarFormDocumento = false;
    this.docNombre = '';
    this.docDescripcion = '';
    this.docTeamId = null;
    this.archivoSeleccionado = null;
  }

  // ─── UTILS ────────────────────────────────────────────────────────────────

  getDocumentoIcono(tipoMime: string): string {
    if (!tipoMime) return 'fa-file';
    if (tipoMime.includes('pdf')) return 'fa-file-pdf';
    if (tipoMime.includes('word') || tipoMime.includes('docx')) return 'fa-file-word';
    if (tipoMime.includes('image')) return 'fa-file-image';
    return 'fa-file-alt';
  }

  contarSelecciones(prendaId: number): number {
    return this.seleccionesPorPrenda[prendaId]?.length || 0;
  }

  /** Normaliza una prenda del API (camelCase o snake_case) para tener siempre imagenUrl e imagenNombre */
  private normalizePrenda(p: any): RopaCatalogoPrenda {
    const imagenUrl = p?.imagenUrl ?? p?.imagen_url ?? '';
    const imagenNombre = p?.imagenNombre ?? p?.imagen_nombre ?? '';
    return {
      ...p,
      imagenUrl: imagenUrl || '',
      imagenNombre: imagenNombre || '',
    } as RopaCatalogoPrenda;
  }

  /** URL de la imagen de la prenda: usa imagenUrl del API o la construye desde environment.images + imagenNombre */
  getPrendaImageUrl(prenda: RopaCatalogoPrenda | null | undefined): string | null {
    if (!prenda) return null;
    const url = (prenda as any).imagenUrl ?? (prenda as any).imagen_url;
    if (url && typeof url === 'string' && url.trim()) return url.trim();
    const nombre = (prenda as any).imagenNombre ?? (prenda as any).imagen_nombre;
    if (nombre && typeof nombre === 'string' && nombre.trim()) {
      const base = (environment as { images?: string }).images ?? 'https://appsphairatech.com/images/';
      const baseClean = base.replace(/\/$/, '');
      return `${baseClean}/ropa-catalogo/${nombre.trim()}`;
    }
    return null;
  }
}
