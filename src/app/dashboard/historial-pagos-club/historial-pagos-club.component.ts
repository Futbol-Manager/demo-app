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
import { getCurrentSeasonString } from 'src/app/core/utils/season.utils';

@Component({
  selector: 'app-historial-pagos-club',
  templateUrl: './historial-pagos-club.component.html',
  styleUrls: ['./historial-pagos-club.component.scss']
})
export class HistorialPagosClubComponent implements OnInit {

  datosCargados = false;
  temporadaStoredValue = getCurrentSeasonString();
  clubId = 0;
  showModalBanco = false;
  listaPagos: any[] = [];
  listaPlayersFiltrados: any[] = [];
  isLoading = true;
  listaPlayers: any[] = [];
  nCargos = 0;

  filtro: string = '';
  listaPagosFiltrados: any[] = [];
  ordenActual: string = '';
  ascendente: boolean = true;

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
          this.listaPagosFiltrados = [...this.listaPagos];
          this.nCargos = this.listaPagos.length;
          this.formatearFechas();
          this.formatearFechasFiltro();
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

  private formatearFechasFiltro(): void {
    this.listaPagosFiltrados = this.listaPagosFiltrados.map(pago => {
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

  filtrarClubes() {
    const texto = this.filtro.toLowerCase();

    this.listaPagosFiltrados = this.listaPagos.filter(p =>
    (p.name?.toLowerCase().includes(texto) ||
      p.descripcionPago?.toLowerCase().includes(texto) ||
      p.titulo?.toLowerCase().includes(texto) ||
      p.importe?.toString().includes(texto) ||
      p.metodo?.toLowerCase().includes(texto) ||
      p.tipo?.toLowerCase().includes(texto) ||
      p.fechaFormateada?.includes(texto))
    );
  }

  ordenarPor(campo: string) {
    if (this.ordenActual === campo) {
      this.ascendente = !this.ascendente;
    } else {
      this.ordenActual = campo;
      this.ascendente = true;
    }

    this.listaPagosFiltrados.sort((a, b) => {
      const valA = a[campo];
      const valB = b[campo];

      // Si ambos son números, comparamos numéricamente
      if (!isNaN(valA) && !isNaN(valB)) {
        return this.ascendente ? valA - valB : valB - valA;
      }

      // Si son strings, comparamos alfabéticamente
      const strA = (valA ?? '').toString().toLowerCase();
      const strB = (valB ?? '').toString().toLowerCase();
      return this.ascendente ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }

  exportarExcel() {
    const table = document.getElementById('dataTable') as HTMLTableElement | null;
    if (!table) return;

    // Clonamos para no tocar el DOM real (por si quieres limpiar algo antes)
    const tableClone = table.cloneNode(true) as HTMLElement;

    // Documento HTML que Excel entiende como hoja de cálculo
    const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <title>Export</title>
      </head>
      <body>
        ${tableClone.outerHTML}
      </body>
    </html>
  `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    const fecha = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    a.href = url;
    a.download = `cargos_${fecha}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

}
