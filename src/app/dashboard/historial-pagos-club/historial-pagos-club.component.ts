import { Component, OnInit } from '@angular/core';
import { Response } from 'src/app/core/services/models/response.model';
import { Location } from '@angular/common';
import { LoginService } from 'src/app/core/services/login/login.service';
import { ClubCuotas } from 'src/app/core/services/team/club.model';
import { Router, ActivatedRoute } from '@angular/router';
import { ClubService } from 'src/app/core/services/club/club.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { CuotasClub } from 'src/app/core/services/models/club.model';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-historial-pagos-club',
  templateUrl: './historial-pagos-club.component.html',
  styleUrls: ['./historial-pagos-club.component.scss']
})
export class HistorialPagosClubComponent implements OnInit {

  datosCargados = false;
  temporadaStoredValue = '2025';
  clubId = 0;
  showModalBanco = false;
  listaPagos: any[] = [];
  listaPlayersFiltrados: any[] = [];
  isLoading = true;
  listaPlayers: any[] = [];
  nCargos = 0;

  constructor(
    private loginService: LoginService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private clubService: ClubService,
    private sanitizer: DomSanitizer) { }

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

    this.loadTabla();
  }

  goBack(): void {
    this.location.back();
  }

  loadTabla() {
    this.clubService.getListHistoriPagos(this.clubId, this.temporadaStoredValue).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.listaPagos = response.data;
          this.nCargos = this.listaPagos.length;
          this.formatearFechas();
        }
        this.isLoading = false;
        //this.datosCargados = true;
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  private formatearFechas(): void {
    this.listaPagos = this.listaPagos.map(pago => {
      const partes = pago.fecha.split('-'); // yyyy-MM-dd
      const fechaFormateada = `${partes[2]}-${partes[1]}-${partes[0]}`;
      return { ...pago, fechaFormateada };
    });
  }

  descripcionConLink(descripcion: string | null | undefined): SafeHtml {
    if (!descripcion) {
      return '';
    }

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    let urlEncontrada: string | null = null;

    // Busca la primera URL en el texto
    const textoSinUrl = descripcion.replace(urlRegex, (url) => {
      urlEncontrada = url;
      return ''; // quitamos la URL del texto
    });

    // Si había una URL, convertimos TODO el texto en <a>
    if (urlEncontrada) {
      return this.sanitizer.bypassSecurityTrustHtml(
        `<a href="${urlEncontrada}" target="_blank" rel="noopener noreferrer">${textoSinUrl.trim()}</a>`
      );
    }

    // Si no había URL, devolvemos el texto normal
    return descripcion;
  }




}
