import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
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
import { RopaClub, RopaJugador } from 'src/app/core/services/team/club.model';
import * as XLSX from "xlsx";
import { Subject, debounceTime } from 'rxjs';


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

  abrigoSizes: string[] = ['', '4', '6', '8', '10', '12', '14', '16', '2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
  abrigoSizesMedias: string[] = ['', 'XS', 'S', 'M', 'L'];
  private abrigoSubject = new Subject<RopaJugador>();
  showModal = false;
  ropaClub: any;

  reloadPage = false;

  prendas = [
    { label: 'Camiseta de Juego', property: 'camisetaJuego', index: 5 },
    { label: 'Pantalón de Juego', property: 'pantalonJuego', index: 6 },
    { label: 'Medias', property: 'medias', index: 7 },
    { label: 'Camiseta de Juego 2º', property: 'camisetaJuegoDos', index: 8 },
    { label: 'Pantalón de Juego 2º', property: 'pantalonJuegoDos', index: 9 },
    { label: 'Medias 2º', property: 'mediasDos', index: 10 },
    { label: 'Camiseta de Entreno', property: 'camisetaEntreno', index: 11 },
    { label: 'Pantalón de Entreno', property: 'pantalonEntreno', index: 12 },
    { label: 'Medias Entreno', property: 'mediasTres', index: 13 },
    { label: 'Sudadera de Entreno', property: 'sudaderaEntreno', index: 14 },
    { label: 'Chaqueta de Chándal', property: 'chaquetaChandal', index: 15 },
    { label: 'Pantalón de Chándal', property: 'pantalonChandal', index: 16 },
    { label: 'Polo de Paseo', property: 'poloPaseo', index: 17 },
    { label: 'Pantalón de Paseo', property: 'pantalonPaseo', index: 18 },
    { label: 'Abrigo', property: 'abrigo', index: 19 },
    { label: 'Chubasquero', property: 'chubasquero', index: 20 },
    { label: 'Mochila', property: 'mochila', index: 21 }
  ];

  prendasOcultar: number[] = [0];

  ropaPrendas: RopaClub = new RopaClub({});

  constructor(
    private loginService: LoginService,
    private router: Router,
    private route: ActivatedRoute,
    private clubService: ClubService,
    private elementRef: ElementRef,
    private http: HttpClient) {
    this.abrigoSubject.pipe(
      debounceTime(500) // Tiempo de espera en milisegundos
    ).subscribe(value => {
      this.updateRopaJugador(value);
    });
  }

  ngOnInit(): void {
    this.loginService.usuarioActual.subscribe(user => {
      this.usuarioActual = user;
      this.userId = this.usuarioActual!.userId;
      // Suscribirse a los cambios en los parámetros de la URL
      this.route.params.subscribe(params => {
        // Obtener el valor de clubId de los parámetros
        this.clubId = +params['clubId'];  // El + convierte el valor a número
      });
    });

    this.clubService.getRopaClub(this.clubId.toString(), '2024').subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.ropaClub = response.data;
          this.ropaClub.clubId = this.clubId;
          this.ropaClub.temporada = '2024';
          //recuperar las prendas que han de verse y las que no
          this.ocultarColumnasRopa();
          this.clubService.getRopaJugadoresByClubForTemp(this.clubId.toString(), '2024').subscribe(
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

        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  ocultarColumnasRopa() {
    if (this.ropaClub.camisetaJuego === 1) this.prendasOcultar.push(5);
    if (this.ropaClub.pantalonJuego === 1) this.prendasOcultar.push(6);
    if (this.ropaClub.medias === 1) this.prendasOcultar.push(7);
    if (this.ropaClub.camisetaJuegoDos === 1) this.prendasOcultar.push(8);
    if (this.ropaClub.pantalonJuegoDos === 1) this.prendasOcultar.push(9);
    if (this.ropaClub.mediasDos === 1) this.prendasOcultar.push(10);
    if (this.ropaClub.camisetaEntreno === 1) this.prendasOcultar.push(11);
    if (this.ropaClub.pantalonEntreno === 1) this.prendasOcultar.push(12);
    if (this.ropaClub.mediasTres === 1) this.prendasOcultar.push(13);
    if (this.ropaClub.sudaderaEntreno === 1) this.prendasOcultar.push(14);
    if (this.ropaClub.chaquetaChandal === 1) this.prendasOcultar.push(15);
    if (this.ropaClub.pantalonChandal === 1) this.prendasOcultar.push(16);
    if (this.ropaClub.poloPaseo === 1) this.prendasOcultar.push(17);
    if (this.ropaClub.pantalonPaseo === 1) this.prendasOcultar.push(18);
    if (this.ropaClub.abrigo === 1) this.prendasOcultar.push(19);
    if (this.ropaClub.chubasquero === 1) this.prendasOcultar.push(20);
    if (this.ropaClub.mochila === 1) this.prendasOcultar.push(21);
  }

  onAbrigoChange(value: RopaJugador) {
    this.abrigoSubject.next(value);
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
      $(document).ready(() => {
        $('#dataTable').DataTable({
          paging: true,
          pageLength: 100,
          searching: true,
          ordering: true,
          order: [[0, 'desc']],
          columnDefs: [
            {
              targets: this.prendasOcultar,
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
      case 14:
        ropa.camisetaJuegoDosOk = ropa.camisetaJuegoDosOk === 0 ? 1 : 0;
        break;
      case 15:
        ropa.pantalonJuegoDosOk = ropa.pantalonJuegoDosOk === 0 ? 1 : 0;
        break;
      case 16:
        ropa.mediasDosOk = ropa.mediasDosOk === 0 ? 1 : 0;
        break;
      case 17:
        ropa.mediasTresOk = ropa.mediasTresOk === 0 ? 1 : 0;
        break;
    }

    ropa.estado = this.getStatusRopa(ropa);
    //ropa.estado = ropa.estado === 1 ? 0 : 1;

    this.reloadPage = true;
    this.updateRopaJugador(ropa);
  }

  getStatusRopa(ropa: any): string {
    let status = '1';
    if (this.ropaClub.camisetaJuego === 0) {
      if (ropa.camisetaJuegoOk === 0) status = '0';
    }
    if (this.ropaClub.pantalonJuego === 0) {
      if (ropa.pantalonJuegoOk === 0) status = '0';
    }
    if (this.ropaClub.medias === 0) {
      if (ropa.medias === 0) status = '0';
    }
    if (this.ropaClub.camisetaJuegoDos === 0) {
      if (ropa.camisetaJuegoDosOk === 0) status = '0';
    }
    if (this.ropaClub.pantalonJuegoDos === 0) {
      if (ropa.pantalonJuegoDosOk === 0) status = '0';
    }
    if (this.ropaClub.mediasDos === 0) {
      if (ropa.mediasDosOk === 0) status = '0';
    }
    if (this.ropaClub.camisetaEntreno === 0) {
      if (ropa.camisetaEntrenoOk === 0) status = '0';
    }
    if (this.ropaClub.pantalonEntreno === 0) {
      if (ropa.pantalonEntrenoOk === 0) status = '0';
    }
    if (this.ropaClub.mediasTres === 0) {
      if (ropa.mediasTresOk === 0) status = '0';
    }
    if (this.ropaClub.sudaderaEntreno === 0) {
      if (ropa.sudaderaEntrenoOk === 0) status = '0';
    }
    if (this.ropaClub.chaquetaChandal === 0) {
      if (ropa.chaquetaChandalOk === 0) status = '0';
    }
    if (this.ropaClub.pantalonChandal === 0) {
      if (ropa.pantalonChandalOk === 0) status = '0';
    }
    if (this.ropaClub.poloPaseo === 0) {
      if (ropa.poloPaseoOk === 0) status = '0';
    }
    if (this.ropaClub.pantalonPaseo === 0) {
      if (ropa.pantalonPaseoOk === 0) status = '0';
    }
    if (this.ropaClub.abrigo === 0) {
      if (ropa.abrigoOk === 0) status = '0';
    }
    if (this.ropaClub.chubasquero === 0) {
      if (ropa.chubasqueroOk === 0) status = '0';
    }
    if (this.ropaClub.mochila === 0) {
      if (ropa.mochilaOk === 0) status = '0';
    }

    return status;
  }

  @ViewChild("table1") table: ElementRef | undefined;
  exportTableToExcel(): void {
    // Comprobar si el elemento existe antes de usar su ID
    const tableElement = document.getElementById('tablaExcel');

    if (tableElement) {
      const ws: XLSX.WorkSheet = XLSX.utils.table_to_sheet(tableElement);

      // Resto del código (asegurar formato de cadena, ancho de columnas, etc.)
      // ... (puedes copiar y pegar el código de la respuesta anterior)

      // Crear y guardar libro de trabajo
      const wb: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

      // Personalizar nombre de archivo y opciones de guardado (opcional)
      const fileName = "tabla_exportada.xlsx"; // Ajustar según tus necesidades
      XLSX.writeFile(wb, fileName, { bookType: 'xlsx' });
    } else {
      console.error("¡Elemento 'tablaExcel' no encontrado!");
      // Manejar el error de forma adecuada (opcional)
      // Por ejemplo, mostrar un mensaje de alerta al usuario
    }
  }

  // Método para abrir el modal de creación de equipo
  abrirModal(): void {
    this.clubService.getRopaClub(this.clubId.toString(), '2024').subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.ropaClub = response.data;
          this.ropaClub.clubId = this.clubId;
          this.ropaClub.temporada = '2024';
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
        this.showModal = true;
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  // Método para cerrar el modal de creación de equipo
  cerrarModal(): void {
    this.showModal = false;
    if (this.reloadPage) this.router.navigate(['/dashboard/inicio']);
  }

  togglePrendaOkDesactivar(property: string, value: number) {
    this.ropaClub[property] = value === 0 ? 1 : 0;
    this.updateRopaClub(this.ropaClub);
    // Aquí puedes añadir cualquier otra lógica necesaria
    //console.log(`${property} actualizada a ${value}`);
  }

  updateRopaClub(ropa: RopaClub) {
    this.clubService.updateRopaClub(ropa).subscribe(
      (response) => {
        //todo ok
      },
      (error) => {
        console.error('Error al crear el equipo:', error);
        // Puedes manejar el error según tus necesidades
      }
    );
  }

}
