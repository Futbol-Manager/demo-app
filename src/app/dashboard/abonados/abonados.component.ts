import { Component, ElementRef, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { User } from 'src/app/core/models/users/user.model';
import { LoginService } from 'src/app/core/services/login/login.service';
import * as $ from 'jquery';
import 'datatables.net';
import { HttpClient } from '@angular/common/http';
import { FormBuilder } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ClubService } from 'src/app/core/services/club/club.service';
import { Response } from 'src/app/core/services/models/response.model';
import { Abonado, AbonadoPagoHistorico, AbonadoTemporada } from 'src/app/core/services/models/club.model';

@Component({
  selector: 'app-abonados',
  templateUrl: './abonados.component.html',
  styleUrls: ['./abonados.component.scss']
})
export class AbonadosComponent implements OnInit {

  datosCargados = false;
  usuarioActual!: User | null;
  clubId!: number;  // Ajusta el valor según el clubId del equipo actual
  userId!: number;
  showModalCreateUpdateAbonado = false;
  showModalUpdateAbonado = false;
  abonadoObj: Abonado = new Abonado({});
  abonadoUpdate: AbonadoTemporada = new AbonadoTemporada({});
  cuotaReadOnly = false;
  cuotaAbonado = 0;
  indexAbonado = 0;
  showModalAgregarPago = false;
  textoInfoNameAbonado = '';
  agregarPago: AbonadoPagoHistorico = new AbonadoPagoHistorico({});
  showAlert = false;
  showModalVerHistorialPagos = false;
  historyPagosAbonado: any[] = [];
  abonadoSelected = 0;


  listAT: any[] = [];
  /*{
    abonadoId: 1 , nombre: 'Pedro', apellidos: 'Gómez Pérez', email: 'pedro@mail.com', telefono: '654745856', estado: 0, cuota: '50', pagado: '0', restante: '0'
  },{
    abonadoId: 2 , nombre: 'Juan', apellidos: 'Martín Pérez', email: 'juan@mail.com', telefono: '65856985', estado: 1, cuota: '50', pagado: '20', restante: '30'
  },{
    abonadoId: 3 , nombre: 'Raúl', apellidos: 'López Salguero', email: 'raul@mail.com', telefono: '65236547', estado: 2, cuota: '50', pagado: '50', restante: '0'
  }
];*/ //lista historial cuotas de los jugadores

  constructor(
    private loginService: LoginService,
    private router: Router,
    private route: ActivatedRoute,
    private elementRef: ElementRef,
    private http: HttpClient,
    private clubService: ClubService) { }

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

    this.clubService.getListAbonadosTemporadaByClub(this.clubId).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.listAT = response.data;
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
    switch (id) {
      case 1:
        this.router.navigate(['/dashboard/inicio']);
        break;
      case 2:
        this.router.navigate(['/dashboard/contabilidad', this.clubId]);
        break;
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

    //this.moverElementosDataTable('dataTable');
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

  openModalCreateUpdateAbonado() {
    this.abonadoObj = new Abonado({});
    this.cuotaAbonado = 0;
    this.showModalCreateUpdateAbonado = true;
  }

  cerrarModalCreateUpdateAbonado() {
    this.showModalCreateUpdateAbonado = false;
  }

  createUpdateAbonado() {
    //ver que se rellena todos los campos

    this.clubService.createUpdateAbonado(this.abonadoObj, this.clubId, this.cuotaAbonado, 0).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.listAT.push(response.data);
          setTimeout(() => {
            this.inicializarDataTable();
          }, 1000);
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }

        this.cerrarModalCreateUpdateAbonado();
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  openModalUpdateAbonado(index: number) {
    this.indexAbonado = index;
    this.abonadoUpdate = this.listAT[index];
    if (this.abonadoUpdate.cuota.toString() != this.abonadoUpdate.restante) {
      this.cuotaReadOnly = true;
    } else {
      this.cuotaReadOnly = false;
    }

    this.showModalUpdateAbonado = true;
  }

  cerrarModalUpdateAbonado() {
    this.showModalUpdateAbonado = false;
  }

  updateAbonado() {
    if(this.listAT[this.indexAbonado].restante === '0'){
      this.listAT[this.indexAbonado].restante = this.abonadoUpdate.cuota;
    }
    this.showModalUpdateAbonado = false;

    this.clubService.createUpdateAbonado(this.abonadoUpdate.abonado, this.clubId, this.abonadoUpdate.cuota, this.abonadoUpdate.abonadosTemporadaId).subscribe(
      (response: Response) => {
        //guardado ok
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  cerrarModalAgregarPago() {
    this.showModalAgregarPago = false;
  }

  openModalPagoAbonado(index: number) {
    this.indexAbonado = index;
    this.agregarPago.abonadosTemporadaId = this.listAT[this.indexAbonado].abonadosTemporadaId;
    this.textoInfoNameAbonado = this.listAT[index].abonado.nombre + ' ' + this.listAT[index].abonado.apellidos;
    this.showModalAgregarPago = true;
  }

  createPagoAbonado() {
    let pagado = Number(this.listAT[this.indexAbonado].pagado) + Number(this.agregarPago.cantidad);
    this.listAT[this.indexAbonado].pagado = pagado;

    let restante = Number(this.listAT[this.indexAbonado].cuota) - pagado;
    this.clubService.createPagoAbonado(this.agregarPago, this.listAT[this.indexAbonado].cuota, pagado).subscribe(
      (response: Response) => {
        this.listAT[this.indexAbonado].restante = restante;
        this.showAlert = true;
        this.agregarPago = new AbonadoPagoHistorico({});
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  openModalHistorialPagos(index: number){
    this.abonadoSelected = index;
    this.clubService.getListPagosAbonadoHistorico(this.listAT[index].abonadosTemporadaId).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.historyPagosAbonado = response.data;
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
        this.showModalVerHistorialPagos = true;
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  cerrarModalHistorialPagos(){
    this.showModalVerHistorialPagos = false;
  }

  confirmReturnPay(pago: any) {
    //console.log(pago);
    const confirmacion = confirm('Se creará un registro para restar esta cantidad con la fecha de hoy. ¿Estás seguro?');

    if (confirmacion) {
      this.returnPay(pago);
    }
  }

  returnPay(pago: any){
    this.clubService.insertReembolsoAbonadoPagoHistorico(pago).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.listAT[this.abonadoSelected].pagado = response.data.pagado;
          this.listAT[this.abonadoSelected].restante = response.data.restante;
          if(this.listAT[this.abonadoSelected].cuota === this.listAT[this.abonadoSelected].pagado){
            this.listAT[this.abonadoSelected].estado = 2;
          }
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
        this.cerrarModalHistorialPagos();
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

}
