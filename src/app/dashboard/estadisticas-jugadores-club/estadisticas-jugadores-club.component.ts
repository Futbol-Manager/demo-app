import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ClubService } from 'src/app/core/services/club/club.service';
import { Response } from 'src/app/core/services/models/response.model';
import { PlayerEstadistica } from 'src/app/core/services/player/player.model';
import * as $ from 'jquery';

@Component({
  selector: 'app-estadisticas-jugadores-club',
  templateUrl: './estadisticas-jugadores-club.component.html',
  styleUrls: ['./estadisticas-jugadores-club.component.scss'],
})
export class EstadisticasJugadoresClubComponent implements OnInit {
  clubId = 0;
  players: any[] = [];
  totalMatchs: number = 0;
  datosCargados = false;

  golesTodosAvanzadoAFavor: any[] = [];
  golesAvanzadoAFavor: any[] = [];
  loading = true;
  // PAGINACIÓN
  page = 1;
  pageSize = 25;
  pageSizes = [10, 25, 50, 100];

  totalRecords = 0;
  totalPages = 0;

  playersPaged: any[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private clubService: ClubService,
    private http: HttpClient,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    // Suscribirse a los cambios en los parámetros de la URL
    this.route.params.subscribe((params) => {
      // Obtener el valor de teamId de los parámetros
      this.clubId = +params['clubId']; // El + convierte el valor a número
      console.log('clubId:', this.clubId);
    });
    this.cargarTablaJugadores();
  }

  // Método para redirigir a la pantalla de jugadores con el teamId
  irAPantalla(id: number): void {
    switch (id) {
      case 0:
        this.router.navigate(['/dashboard/cuadro-de-mandos', this.clubId]);
        break;
    }
  }

  // Método para navegar a la pantalla de calendario
  navegarACalendario(): void {
    // Puedes ajustar la ruta según tu estructura de rutas
    this.router.navigate(['/dashboard/calendario', this.clubId, 0]);
  }

  cargarTablaJugadores() {
    this.clubService.getListPlayersOfClubByStadistics(this.clubId).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response && response.data && Array.isArray(response.data.listDto)) {
          let resp = response;
          let list = (resp.data as { listDto: PlayerEstadistica[] }).listDto;
          // Mapea los datos bajo 'data' a instancias del modelo Team
          this.players = list;
          this.page = 1;
          this.actualizarPaginacion();
          this.datosCargados = true;
        } else {
          console.error(
            'La respuesta del servicio no tiene la estructura esperada',
            response
          );
        }
        this.loading = false;
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }
  private actualizarPaginacion(): void {
    this.totalRecords = this.players.length;

    this.totalPages = Math.max(1, Math.ceil(this.totalRecords / this.pageSize));

    if (this.page > this.totalPages) {
      this.page = this.totalPages;
    }

    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;

    this.playersPaged = [...this.players.slice(start, end)];
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.actualizarPaginacion();
    }
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.actualizarPaginacion();
    }
  }
  onPageSizeChange(): void {
    this.pageSize = Number(this.pageSize);
    this.page = 1;
    this.actualizarPaginacion();
  }

  get paginationInfo(): string {
    if (this.totalRecords === 0) return '';

    const start = (this.page - 1) * this.pageSize + 1;
    const end = Math.min(this.page * this.pageSize, this.totalRecords);

    return `Mostrando ${start}–${end} de ${this.totalRecords}`;
  }

  trackByPlayer(index: number, player: any): number {
    return player.playerId;
  }

  // Método para inicializar el DataTable
  inicializarDataTable(): void {
    // Destruir el DataTable si ya existe
    const $dataTable = $('#dataTable');
    if ($dataTable.hasClass('dataTable')) {
      $dataTable.DataTable().destroy();
    }

    this.http.get('assets/dataTable/Spanish.json').subscribe((translation) => {
      $(document).ready(function () {
        $('#dataTable').DataTable({
          paging: true,
          pageLength: 25,
          searching: true,
          ordering: true,
          order: [[0, 'desc']],
          columnDefs: [
            {
              targets: [0],
              visible: false,
            },
          ],
          language: translation,
        });
      });
    });

    this.moverElementosDataTable('dataTable');
  }

  moverElementosDataTable(name: string) {
    // **Move buttons outside the table after initialization**
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        const layoutRowElements =
          this.elementRef.nativeElement.querySelectorAll(
            '.dt-layout-row:not(.dt-layout-table)'
          );
        const buttonDatatableElement =
          this.elementRef.nativeElement.querySelector('#button_datatable');

        if (layoutRowElements.length >= 2 && buttonDatatableElement) {
          const layoutRowElement = layoutRowElements[1]; // Obtener el segundo elemento
          $(layoutRowElement).appendTo(buttonDatatableElement);
          observer.disconnect(); // Detiene la observación después de encontrar los elementos
        }
      });
    });

    observer.observe(this.elementRef.nativeElement, {
      childList: true,
      subtree: true,
    });

    //esto es para agregar una clase
    const textcenter = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        const dataTableElement = document.querySelector('#' + name);

        if (dataTableElement) {
          dataTableElement.classList.add('text-center');
          textcenter.disconnect(); // Detiene la observación después de encontrar el elemento
        }
      });
    });

    textcenter.observe(document.body, { childList: true, subtree: true });

    //esto es para la parte donde pones las filas a ver
    const length = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        const layoutRowElement =
          this.elementRef.nativeElement.querySelector('.dt-length');
        const buttonDatatableElement =
          this.elementRef.nativeElement.querySelector('#dt-length');

        if (layoutRowElement && buttonDatatableElement) {
          $(layoutRowElement).appendTo(buttonDatatableElement);
          length.disconnect(); // Detiene la observación después de encontrar los elementos
        }
      });
    });

    length.observe(this.elementRef.nativeElement, {
      childList: true,
      subtree: true,
    });

    //esto es para el input del buscador
    const search = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        const layoutRowElement =
          this.elementRef.nativeElement.querySelector('.dt-search');
        const buttonDatatableElement =
          this.elementRef.nativeElement.querySelector('#dt-search');

        if (layoutRowElement && buttonDatatableElement) {
          $(layoutRowElement).appendTo(buttonDatatableElement);
          search.disconnect(); // Detiene la observación después de encontrar los elementos
        }
      });
    });

    search.observe(this.elementRef.nativeElement, {
      childList: true,
      subtree: true,
    });
  }

}
