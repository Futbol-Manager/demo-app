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
import { TutorialService } from 'src/app/core/services/tutorial/tutorial.service';

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
    private sanitizer: DomSanitizer,
    private tutorialService: TutorialService) { }

  ngOnInit(): void {
    if (localStorage.getItem('temporada') != null && localStorage.getItem('temporada') != undefined) {
      this.temporadaStoredValue = localStorage.getItem('temporada')!.toString();
    }

    this.route.params.subscribe(params => {
      this.clubId = +params['clubId'] || 0;
      if (!this.clubId) {
        this.clubId = Number(sessionStorage.getItem('clubId')) || Number(localStorage.getItem('clubId')) || 0;
      }
      if (this.clubId) {
        this.loadTabla();
      } else {
        this.isLoading = false;
      }
    });

    this.loginService.usuarioActual.subscribe(() => {});

    // Aviso para iniciar tutorial con voz (el clic del usuario desbloquea el audio en el navegador)
    setTimeout(() => this.tutorialService.start('historial-pagos-club', true), 600);
  }

  goBack(): void {
    this.location.back();
  }

  loadTabla() {
    this.isLoading = true;
    this.clubService.getListHistoriPagos(this.clubId, this.temporadaStoredValue).subscribe({
      next: (response: Response) => {
        if (response?.data != null && Array.isArray(response.data)) {
          this.listaPagos = response.data;
          this.listaPagosFiltrados = [...this.listaPagos];
          this.nCargos = this.listaPagos.length;
          this.formatearFechas();
          this.formatearFechasFiltro();
        } else {
          this.listaPagos = [];
          this.listaPagosFiltrados = [];
          this.nCargos = 0;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar el historial de pagos', error);
        this.listaPagos = [];
        this.listaPagosFiltrados = [];
        this.nCargos = 0;
        this.isLoading = false;
      }
    });
  }

  private formatearFechas(): void {
    this.listaPagos = this.listaPagos.map(pago => {
      const fecha = pago?.fecha;
      if (!fecha || typeof fecha !== 'string') {
        return { ...pago, fechaFormateada: fecha ?? '–' };
      }
      const partes = fecha.split('-');
      const fechaFormateada = partes.length === 3 ? `${partes[2]}-${partes[1]}-${partes[0]}` : fecha;
      return { ...pago, fechaFormateada };
    });
  }

  private formatearFechasFiltro(): void {
    this.listaPagosFiltrados = this.listaPagosFiltrados.map(pago => {
      const fecha = pago?.fecha;
      if (!fecha || typeof fecha !== 'string') {
        return { ...pago, fechaFormateada: fecha ?? '–' };
      }
      const partes = fecha.split('-');
      const fechaFormateada = partes.length === 3 ? `${partes[2]}-${partes[1]}-${partes[0]}` : fecha;
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

  isImporteNegativo(importe: any): boolean {
    if (importe == null || importe === undefined) return false;
    const s = String(importe);
    return s.includes('-') || (typeof importe === 'number' && importe < 0);
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
