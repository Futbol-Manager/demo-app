import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ClubService } from 'src/app/core/services/club/club.service';
import { Response } from 'src/app/core/services/models/response.model';

/* =========================
   MODELOS
========================= */

interface CalendarEvent {
  equipo: string;
  hora: string;
  start: number;
  end: number;
  top: number;
  height: number;
  left: number;
  width: number;
}
interface AgendaItem {
  hora: string;
  eventos: {
    equipo: string;
    rango: string;
  }[];
}

interface ResultadoUI {
  estado: 'victoria' | 'empate' | 'derrota';
  local: string;
  visitante: string;
  marcador: string;
}

/* =========================
   COMPONENTE
========================= */

@Component({
  selector: 'app-cuadro',
  templateUrl: './cuadro.component.html',
  styleUrls: ['./cuadro.component.scss'],
})
export class CuadroComponent implements OnInit {
  /* =========================
     VARIABLES GENERALES
  ========================= */
  loadingDashboard = true;

  clubId = 0;
  temporadaStoredValue = '2025';

  horas: string[] = [];

  listTeams: string[] = [];
  listUltimos: string[] = [];
  listProximos: string[] = [];
  agendaHoy: AgendaItem[] = [];

  /* =========================
     UI DATA
  ========================= */

  entrenamientosCalendar: CalendarEvent[] = [];
  parsedResultados: ResultadoUI[] = [];

  /* =========================
     CONSTRUCTOR
  ========================= */

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private clubService: ClubService
  ) {}

  /* =========================
     INIT
  ========================= */

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.clubId = +params['clubId'];
    });

    const temporadaLS = localStorage.getItem('temporada');
    if (temporadaLS) {
      this.temporadaStoredValue = temporadaLS;
    }

    this.cargarDatosDashboard();
  }

  /* =========================
     CARGA DE DATOS
  ========================= */

  cargarDatosDashboard(): void {
    this.loadingDashboard = true;
    this.clubService
      .getEntrenandoAhora(this.clubId, this.temporadaStoredValue)
      .subscribe({
        next: (response: Response) => {
          if (response?.data) {
            this.listTeams = response.data.teams || [];
            this.listUltimos = response.data.ultimos || [];
            this.listProximos = response.data.proximos || [];

            this.parseResultados();
            this.generarCalendarioEntrenos();
          }
          this.loadingDashboard = false;
        },
        error: (err) => {
          this.loadingDashboard = false;
          console.error('Error cargando cuadro de mando', err);
        },
      });
  }

  /* =========================
     RESULTADOS (CARD)
  ========================= */

  parseResultados(): void {
    this.parsedResultados = this.listUltimos.map((r: string) => {
      // Ejemplo: "V: Cadete Primera 2 - 1 VALENCIA"
      const estadoChar = r.charAt(0);

      const marcadorMatch = r.match(/\d+\s-\s\d+/);
      const marcador = marcadorMatch ? marcadorMatch[0] : '';

      const textoLimpio = r.replace(/^.\s*:\s*/, '');
      const partes = marcador ? textoLimpio.split(marcador) : [textoLimpio, ''];

      return {
        estado:
          estadoChar === 'V'
            ? 'victoria'
            : estadoChar === 'E'
            ? 'empate'
            : 'derrota',
        local: partes[0]?.trim() || '',
        visitante: partes[1]?.trim() || '',
        marcador,
      };
    });
  }

  /* =========================
     CALENDARIO
  ========================= */

  generarCalendarioEntrenos(): void {
    const pxPorHora = 32;
    const pxPorMinuto = pxPorHora / 60;

    const eventos: CalendarEvent[] = this.listTeams
      .map((t) => {
        const match = t.match(/(.*?) de (\d{2}:\d{2}) a (\d{2}:\d{2})/);
        if (!match) return null;

        const start = this.timeToMinutes(match[2]);
        const end = this.timeToMinutes(match[3]);

        return {
          equipo: match[1],
          hora: `${match[2]} - ${match[3]}`,
          start,
          end,
          top: 0,
          height: 0,
          left: 0,
          width: 100,
        };
      })
      .filter(Boolean) as CalendarEvent[];

    if (!eventos.length) {
      this.entrenamientosCalendar = [];
      this.horas = [];
      return;
    }

    const minStart = Math.min(...eventos.map((e) => e.start));
    const maxEnd = Math.max(...eventos.map((e) => e.end));

    const inicioDia = Math.floor(minStart / 60) * 60;
    const finDia = Math.ceil(maxEnd / 60) * 60;

    this.horas = [];
    for (let m = inicioDia; m <= finDia; m += 60) {
      const h = Math.floor(m / 60)
        .toString()
        .padStart(2, '0');
      this.horas.push(`${h}:00`);
    }

    const totalMinutos = finDia - inicioDia;
    const alturaCalendario = totalMinutos * pxPorMinuto;

    setTimeout(() => {
      const body = document.querySelector('.calendar-body') as HTMLElement;
      if (body) body.style.height = `${alturaCalendario}px`;
    });

    eventos.forEach((e) => {
      e.top = (e.start - inicioDia) * pxPorMinuto;
      e.height = (e.end - e.start) * pxPorMinuto;
    });


    eventos.sort((a, b) => a.start - b.start);
    const grupos: CalendarEvent[][] = [];

    eventos.forEach((ev) => {
      let agregado = false;
      for (const grupo of grupos) {
        if (grupo.some((e) => e.start < ev.end && ev.start < e.end)) {
          grupo.push(ev);
          agregado = true;
          break;
        }
      }
      if (!agregado) grupos.push([ev]);
    });

    grupos.forEach((grupo) => {
      const columnas: CalendarEvent[][] = [];
      grupo.forEach((ev) => {
        let colocado = false;
        for (const col of columnas) {
          if (!col.some((e) => e.start < ev.end && ev.start < e.end)) {
            col.push(ev);
            colocado = true;
            break;
          }
        }
        if (!colocado) columnas.push([ev]);
      });

      const width = 100 / columnas.length;
      columnas.forEach((col, i) => {
        col.forEach((ev) => {
          ev.width = width;
          ev.left = i * width;
        });
      });
    });

    this.entrenamientosCalendar = eventos;
    this.generarHorasDinamicas(eventos);
  }

  timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }
  generarHorasDinamicas(eventos: CalendarEvent[]): void {
    if (!eventos.length) {
      this.horas = [];
      return;
    }

    const minStart = Math.min(...eventos.map((e) => e.start));
    const maxEnd = Math.max(...eventos.map((e) => e.end));

    const inicio = Math.floor(minStart / 60) * 60;
    const fin = Math.ceil(maxEnd / 60) * 60;

    this.horas = [];

    for (let m = inicio; m <= fin; m += 60) {
      const h = Math.floor(m / 60)
        .toString()
        .padStart(2, '0');

      this.horas.push(`${h}:00`);
    }
  }

  /* =========================
     NAVEGACIÓN
  ========================= */

  irAPantalla(id: number): void {
    switch (id) {
      case 0:
        this.router.navigate(['/dashboard/inicio']);
        break;

      case 1:
        this.router.navigate([
          '/dashboard/cuadro-de-mandos/cuotas',
          this.clubId,
        ]);
        break;

      case 2:
        this.router.navigate([
          '/dashboard/cuadro-de-mandos/puntuaciones',
          this.clubId,
        ]);
        break;

      case 3:
        this.router.navigate([
          '/dashboard/cuadro-de-mandos/entrenamientos',
          this.clubId,
        ]);
        break;

      case 7:
        this.router.navigate([
          '/dashboard/cuadro-de-mandos/info-jugadores',
          this.clubId,
        ]);
        break;

      case 8:
        this.router.navigate([
          '/dashboard/cuadro-de-mandos/estadisticas-equipos-club',
          this.clubId,
        ]);
        break;

      case 9:
        this.router.navigate([
          '/dashboard/cuadro-de-mandos/estadisticas-jugadores-club',
          this.clubId,
        ]);
        break;

      default:
        console.warn('Ruta no definida para el id:', id);
        break;
    }
  }
}
