import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, ActivatedRoute } from '@angular/router';
import { User } from 'src/app/core/models/users/user.model';
import { ClubService } from 'src/app/core/services/club/club.service';
import { LoginService } from 'src/app/core/services/login/login.service';
import { RegisterService } from 'src/app/core/services/register/register.service';
import { Response } from 'src/app/core/services/models/response.model';
import * as $ from 'jquery';
import 'datatables.net';
import { RopaJugador } from 'src/app/core/services/team/club.model';

@Component({
  selector: 'app-ropa',
  templateUrl: './ropa.component.html',
  styleUrls: ['./ropa.component.scss']
})
export class RopaComponent implements OnInit {
  usuarioActual!: User | null;
  clubId!: number;  // Ajusta el valor según el clubId del equipo actual
  userId!: number;
  ropaPlayers: any[] = [];
  datosCargados = false;

  abrigoSizes: string[] = ['4', '6', '8', '10', '12', '14', '16', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

  constructor(
    private loginService: LoginService,
    private router: Router,
    private route: ActivatedRoute,
    private clubService: ClubService,
    private elementRef: ElementRef,
    private http: HttpClient) { }

  ngOnInit(): void {
    this.loginService.usuarioActual.subscribe(user => {
      this.usuarioActual = user;
      this.userId = this.usuarioActual!.userId;
      // Suscribirse a los cambios en los parámetros de la URL
      this.route.params.subscribe(params => {
        // Obtener el valor de clubId de los parámetros
        this.clubId = +params['clubId'];  // El + convierte el valor a número
        console.log('clubId:', this.clubId);
      });
    });

    this.clubService.getRopaJugadoresByClubForTemp(this.clubId.toString(), '2023').subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.ropaPlayers = response.data;
          setTimeout(() => {
            this.inicializarDataTable();
            this.datosCargados = true;
          }, 1000);
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  irAPantalla(id: number): void {
    if (id === 1) {
      this.router.navigate(['/dashboard/inicio']);
    }
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

    this.moverElementosDataTable('dataTable');
  }


  moverElementosDataTable(name: string) {
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

  updateRopaJugador(ropa: RopaJugador) {
    this.clubService.updateRopaJugadorByPk(ropa).subscribe(
      (response) => {
        //todo ok
      },
      (error) => {
        console.error('Error al crear el equipo:', error);
        // Puedes manejar el error según tus necesidades
      }
    );
  }

  togglePrendaOk(ropa: any, key: number): void {
    switch (key) {
      case 1:
        ropa.abrigoOk = ropa.abrigoOk === 0 ? 1 : 0;
        break;
      case 2:
        ropa.camisetaJuegoOk = ropa.camisetaJuegoOk === 0 ? 1 : 0;
        break;
      case 3:
        ropa.pantalonJuegoOk = ropa.pantalonJuegoOk === 0 ? 1 : 0;
        break;
      case 4:
        ropa.camisetaEntrenoOk = ropa.camisetaEntrenoOk === 0 ? 1 : 0;
        break;
      case 5:
        ropa.pantalonEntrenoOk = ropa.pantalonEntrenoOk === 0 ? 1 : 0;
        break;
      case 6:
        ropa.sudaderaEntrenoOk = ropa.sudaderaEntrenoOk === 0 ? 1 : 0;
        break;
      case 7:
        ropa.chaquetaChandalOk = ropa.chaquetaChandalOk === 0 ? 1 : 0;
        break;
      case 8:
        ropa.pantalonChandalOk = ropa.pantalonChandalOk === 0 ? 1 : 0;
        break;
      case 9:
        ropa.poloPaseoOk = ropa.poloPaseoOk === 0 ? 1 : 0;
        break;
      case 10:
        ropa.pantalonPaseoOk = ropa.pantalonPaseoOk === 0 ? 1 : 0;
        break;
      case 11:
        ropa.mediasOk = ropa.mediasOk === 0 ? 1 : 0;
        break;
      case 12:
        ropa.chubasqueroOk = ropa.chubasqueroOk === 0 ? 1 : 0;
        break;
      case 13:
        ropa.mochilaOk = ropa.mochilaOk === 0 ? 1 : 0;
        break;
    }

    if (ropa.abrigoOk === 1 && ropa.camisetaEntrenoOk === 1 && ropa.camisetaJuegoOk === 1 && ropa.chaquetaChandalOk === 1 &&
      ropa.chubasqueroOk === 1 && ropa.mediasOk === 1 && ropa.mochilaOk === 1 && ropa.pantalonChandalOk === 1 &&
      ropa.pantalonEntrenoOk === 1 && ropa.pantalonJuegoOk === 1 && ropa.pantalonPaseoOk === 1 && ropa.poloPaseoOk === 1 &&
      ropa.sudaderaEntrenoOk === 1) {      
      ropa.estado = "1";
  } else{      
    ropa.estado = "0";
  }
  
    this.updateRopaJugador(ropa);
  }

}
