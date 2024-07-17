import { Component, OnInit, ElementRef } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router, ActivatedRoute } from '@angular/router';
import { ClubService } from 'src/app/core/services/club/club.service';
import { Response } from 'src/app/core/services/models/response.model';
import * as $ from 'jquery';
import 'datatables.net';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-info-jugadores',
  templateUrl: './info-jugadores.component.html',
  styleUrls: ['./info-jugadores.component.scss']
})
export class InfoJugadoresComponent implements OnInit {

  clubId = 0;
  datosCargados = false;
  teams: any[] = [];
  players: any[] = [];
  teamSelected: number = -1;

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
          /*for (let i = 0; i < this.teams.length; i++) {
            for (let a = 0; a < this.teams[i].players.length; a++) {
              this.players.push(this.teams[i].players[a]);              
            }            
          }*/
          this.inicializarDataTable();
          this.datosCargados = true;
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
        this.datosCargados = true;
      },
      (error) => {
        console.error('Error al cargar el listado de jugadores', error);
      }
    );
  }// Método para inicializar el DataTable
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
          pageLength: 100,
          searching: true,
          ordering: true,
          order: [[0, 'desc']],
          columnDefs: [
            {
              targets: [0],
              visible: false
            }
          ],
          language: translation
        });
      });
    });

    this.moverElementosDataTable();
  }


  moverElementosDataTable() {
    // **Move buttons outside the table after initialization**
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        const layoutRowElements = this.elementRef.nativeElement.querySelectorAll('.dt-layout-row:not(.dt-layout-table)');
        const buttonDatatableElement = this.elementRef.nativeElement.querySelector('#button_datatable');

        if (layoutRowElements.length >= 2 && buttonDatatableElement) {
          const layoutRowElement = layoutRowElements[1]; // Obtener el segundo elemento
          $(layoutRowElement).appendTo(buttonDatatableElement);
          observer.disconnect(); // Detiene la observación después de encontrar los elementos
        }
      });
    });

    observer.observe(this.elementRef.nativeElement, { childList: true, subtree: true });

    //esto es para agregar una clase
    const textcenter = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        const dataTableElement = document.querySelector('#dataTable');

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
        const layoutRowElement = this.elementRef.nativeElement.querySelector('.dt-length');
        const buttonDatatableElement = this.elementRef.nativeElement.querySelector('#dt-length');

        if (layoutRowElement && buttonDatatableElement) {
          $(layoutRowElement).appendTo(buttonDatatableElement);
          length.disconnect(); // Detiene la observación después de encontrar los elementos
        }
      });
    });

    length.observe(this.elementRef.nativeElement, { childList: true, subtree: true });

    //esto es para el input del buscador
    const search = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        const layoutRowElement = this.elementRef.nativeElement.querySelector('.dt-search');
        const buttonDatatableElement = this.elementRef.nativeElement.querySelector('#dt-search');

        if (layoutRowElement && buttonDatatableElement) {
          $(layoutRowElement).appendTo(buttonDatatableElement);
          search.disconnect(); // Detiene la observación después de encontrar los elementos
        }
      });
    });

    search.observe(this.elementRef.nativeElement, { childList: true, subtree: true });
  }

  loadPlayersOfTeam(){
    if(this.teamSelected < 0) {
      this.players = [];
      for (let b = 0; b < this.teams.length; b++) {
        this.players.push(this.teams[b].players);
      }
    } else {
      this.players.push(this.teams[this.teamSelected].players);
    }
  }

}
