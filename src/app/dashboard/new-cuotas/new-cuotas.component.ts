import { Component, OnInit } from '@angular/core';
import { Response } from 'src/app/core/services/models/response.model';
import { Location } from '@angular/common';
import { LoginService } from 'src/app/core/services/login/login.service';
import { ClubCuotas } from 'src/app/core/services/team/club.model';
import { Router, ActivatedRoute } from '@angular/router';
import { ClubService } from 'src/app/core/services/club/club.service';

@Component({
  selector: 'app-new-cuotas',
  templateUrl: './new-cuotas.component.html',
  styleUrls: ['./new-cuotas.component.scss']
})
export class NewCuotasComponent implements OnInit {

  datosCargados = false;
  temporadaStoredValue = '2025';
  clubId = 0;
  showModalBanco = false;
  bancoClubData: any = {};
  listaCuotas: any[] = [];
  showModalCuotas = false;
  filtroTitulo: string = '';
  filtroObligatoria: 'todas' | 'si' | 'no' = 'todas';
  showModalCuota = false;
  cuotaSeleccionada = false;
  nuevaCuota: any = {};

  constructor(
    private loginService: LoginService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private clubService: ClubService,) { }

  ngOnInit(): void {
    this.loginService.usuarioActual.subscribe(user => {
      // Suscribirse a los cambios en los parámetros de la URL
      this.route.params.subscribe(params => {
        // Obtener el valor de clubId de los parámetros
        this.clubId = +params['clubId'];  // El + convierte el valor a número
        //console.log('clubId:', this.clubId);
      });
    });

    if (localStorage.getItem('temporada') != null && localStorage.getItem('temporada') != undefined) {
      this.temporadaStoredValue = localStorage.getItem('temporada')!.toString();
    }
  }



  goBack(): void {
    this.location.back();
  }

  openModalStripe() {

  }

  openModalBancoClub() {
    let temporada = this.temporadaStoredValue;
    this.clubService.getBancoClub(this.clubId, temporada === null ? '2025' : temporada).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.bancoClubData = response.data;
          //this.infoClub = response.data.infoClub;
          //this.clubCuotas.temporada = response.data.temporada === null ? temporada : response.data.temporada;
        }
        this.showModalBanco = true;
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  cerrarModalBancoClub() {
    this.showModalBanco = false;
  }

  modalAjustes() {

  }

  guardarBancoClubData() {
    this.clubService.updateBancoClub(this.bancoClubData).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.bancoClubData = response.data;
          alert('Datos guardados correctamente');
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  openModalCuotas() {
    let temporada = this.temporadaStoredValue;
    this.clubService.getListPagosClub(this.clubId, temporada === null ? '2025' : temporada).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.listaCuotas = response.data;
        }
        this.showModalCuotas = true;
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  cuotasFiltradas(): any[] {
    return this.listaCuotas.filter(cuota => {
      const coincideTitulo = this.filtroTitulo.trim() === '' ||
        cuota.titulo.toLowerCase().includes(this.filtroTitulo.toLowerCase());

      const coincideObligatoria =
        this.filtroObligatoria === 'todas' ||
        (this.filtroObligatoria === 'si' && cuota.obligatorio) ||
        (this.filtroObligatoria === 'no' && !cuota.obligatorio);

      return coincideTitulo && coincideObligatoria;
    });
  }

  cerrarModalCuotas() {
    this.showModalCuotas = false;
  }

  editarCuota(cuota: any) {
    this.showModalCuota = true;
    this.cuotaSeleccionada = true;
    this.nuevaCuota = cuota;
  }

  eliminarCuota(cuota: any) {

  }

  abrirModalCuota() {
    this.cuotaSeleccionada = false;
    this.nuevaCuota = {
      PagoClubId: 0, clubId: this.clubId, temporada: this.temporadaStoredValue,
      dateCreate: null, dateEdit: null, titulo: null, descripcion: null, obligatorio: 0, importe: null,
      fechaLimite: null, stripe: null
    };
    this.showModalCuota = true;
  }

  cerrarModalCuota() {
    this.showModalCuota = false;
  }

  guardarCuota() {
    if (this.nuevaCuota.titulo && this.nuevaCuota.titulo != ''
      && this.nuevaCuota.descripcion && this.nuevaCuota.descripcion != ''
      && this.nuevaCuota.importe && this.nuevaCuota.importe != ''
      && this.nuevaCuota.fechaLimite && this.nuevaCuota.fechaLimite != '') {

      // 🔁 Conversión explícita
      this.nuevaCuota.importe = String(this.nuevaCuota.importe);
      this.nuevaCuota.obligatorio = this.nuevaCuota.obligatorio ? 1 : 0;
      this.clubService.createUpdatePagoClub(this.nuevaCuota).subscribe(
        (response: Response) => {
          // Verifica que la propiedad 'data' exista en la respuesta
          if (response.data !== null) {
            if(!this.cuotaSeleccionada) this.listaCuotas.push(response.data);
            alert('Datos guardados correctamente');
            this.cerrarModalCuota();
          }
        },
        (error) => {
          console.error('Error al cargar el listado de equipos', error);
        }
      );
    } else {
      alert('Rellena todos los campos.');
    }
  }

}
