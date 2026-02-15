import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { User } from 'src/app/core/models/users/user.model';
import { LoginService } from 'src/app/core/services/login/login.service';
import { ClubService } from 'src/app/core/services/club/club.service';
import { Response } from 'src/app/core/services/models/response.model';
import { Abonado, AbonadoPagoHistorico, AbonadoTemporada } from 'src/app/core/services/models/club.model';
import * as XLSX from "xlsx";
import { environment } from 'src/environments/environment';
import { Location } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';

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
  selectedFile!: File;
  showbtnupimg = false;
  imagePreviewUrl: string | ArrayBuffer | null = null;
  showPreview: boolean = false;

  listAT: any[] = [];
  imageBaseUrl: string = environment.images;
  imageBaseUrlAbonado: string = environment.images + 'abonado/';
  /*{
    abonadoId: 1 , nombre: 'Pedro', apellidos: 'Gómez Pérez', email: 'pedro@mail.com', telefono: '654745856', estado: 0, cuota: '50', pagado: '0', restante: '0'
  },{
    abonadoId: 2 , nombre: 'Juan', apellidos: 'Martín Pérez', email: 'juan@mail.com', telefono: '65856985', estado: 1, cuota: '50', pagado: '20', restante: '30'
  },{
    abonadoId: 3 , nombre: 'Raúl', apellidos: 'López Salguero', email: 'raul@mail.com', telefono: '65236547', estado: 2, cuota: '50', pagado: '50', restante: '0'
  }
];*/ //lista historial cuotas de los jugadores

  // Search & filter
  searchTerm = '';
  filteredList: any[] = [];

  // Sorting
  sortColumn = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Pagination
  currentPage = 1;
  pageSize = 50;
  pageSizeOptions = [25, 50, 100, 200];

  constructor(
    private loginService: LoginService,
    private router: Router,
    private route: ActivatedRoute,
    private clubService: ClubService,
    private location: Location,
    private translate: TranslateService) { }

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
          this.filteredList = [...this.listAT];
          this.datosCargados = true;
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  goBack(): void {
    this.location.back();
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

  // Search & filter methods
  applyFilter(): void {
    const term = this.searchTerm.toLowerCase().trim();
    this.filteredList = this.listAT.filter(at =>
      (at.abonado?.nombre?.toLowerCase().includes(term)) ||
      (at.abonado?.apellidos?.toLowerCase().includes(term)) ||
      (at.abonado?.mail?.toLowerCase().includes(term)) ||
      (at.abonado?.telefono?.includes(term))
    );
    this.sortData();
    this.currentPage = 1;
  }

  sortBy(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.sortData();
  }

  private sortData(): void {
    if (!this.sortColumn) return;
    const col = this.sortColumn;
    this.filteredList.sort((a, b) => {
      let valA = col.startsWith('abonado.') ? a.abonado?.[col.split('.')[1]] : a[col];
      let valB = col.startsWith('abonado.') ? b.abonado?.[col.split('.')[1]] : b[col];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  get paginatedList(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredList.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredList.length / this.pageSize);
  }

  get pages(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const p: number[] = [];
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    for (let i = start; i <= end; i++) p.push(i);
    return p;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) this.currentPage = page;
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
          this.filteredList = [...this.listAT];
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
    if (this.listAT[this.indexAbonado].restante === '0') {
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

  openModalHistorialPagos(index: number) {
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

  cerrarModalHistorialPagos() {
    this.showModalVerHistorialPagos = false;
  }

  confirmReturnPay(pago: any) {
    //console.log(pago);
    const confirmacion = confirm(this.translate.instant('SUBS.ALERTS.CONFIRM_REFUND'));

    if (confirmacion) {
      this.returnPay(pago);
    }
  }

  returnPay(pago: any) {
    this.clubService.insertReembolsoAbonadoPagoHistorico(pago).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.listAT[this.abonadoSelected].pagado = response.data.pagado;
          this.listAT[this.abonadoSelected].restante = response.data.restante;
          if (this.listAT[this.abonadoSelected].cuota === this.listAT[this.abonadoSelected].pagado) {
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

  onFileSelected(event: any) {
    if (event.target.files[0].type === 'image/png' || event.target.files[0].type === 'image/jpeg') {
      this.selectedFile = event.target.files[0];
      this.showbtnupimg = true;
      if (this.selectedFile) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.imagePreviewUrl = e.target.result;
          this.showPreview = true; // Mostrar vista previa
        };
        reader.readAsDataURL(this.selectedFile);
      }
    } else {
      this.showbtnupimg = false;
    }
  }

  onSubmit(playerId: number) {
    // Verifica si se ha seleccionado un archivo
    if (this.selectedFile) {
      //console.log('Imagen seleccionada:', this.selectedFile);

      this.clubService.subirImgAbonado(playerId.toString(), this.selectedFile)
        .subscribe(
          (response) => {
            this.cerrarModalUpdateAbonado();
          },
          error => {
            console.error('Error al subir la imagen', error);
            // Aquí puedes manejar el error si la subida de la imagen falla
          }
        );
    } else {
      console.log('Ninguna imagen seleccionada.');
    }
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

}
