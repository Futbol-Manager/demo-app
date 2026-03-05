import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ClubService } from 'src/app/core/services/club/club.service';
import { NotificationService } from 'src/app/core/services/notification/notification.service';
import { LoginService } from 'src/app/core/services/login/login.service';
import { Response } from 'src/app/core/services/models/response.model';
import { ClubPlanType } from 'src/app/core/models/subscription/club-subscription.model';
import { getCurrentSeasonString } from 'src/app/core/utils/season.utils';
import { environment } from 'src/environments/environment';
import { isDemoMode } from 'src/app/core/services/demo/demo-mode';

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
export class CuadroComponent implements OnInit, OnDestroy {
  /* =========================
     VARIABLES GENERALES
  ========================= */
  loadingDashboard = true;

  clubId = 0;
  temporadaStoredValue = getCurrentSeasonString();

  horas: string[] = [];

  /* Línea de hora actual */
  currentTimeTop = -1;
  currentTimeLabel = '';
  private timeInterval: any = null;

  private readonly HORA_INICIO = 8;
  private readonly HORA_FIN = 23;
  private readonly PX_POR_HORA = 32;

  listTeams: string[] = [];
  listUltimos: string[] = [];
  listProximos: {
    local: string;
    visitante: string;
    dia: string;
    fecha: string;
    hora: string;
  }[] = [];

  agendaHoy: AgendaItem[] = [];

  /* =========================
     UI DATA
  ========================= */

  entrenamientosCalendar: CalendarEvent[] = [];
  parsedResultados: {
    estado: 'victoria' | 'empate' | 'derrota';
    local: string;
    visitante: string;
    marcador: string;
    fecha: string;
  }[] = [];

  /* =========================
     CONSTRUCTOR
  ========================= */

  private staffPermissions: string[] = [];
  private profileId = 0;
  private clubPlanType: ClubPlanType | null = null;
  private readonly CLUB_PLAN_TYPE_KEY = 'clubPlanType';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private clubService: ClubService,
    private notification: NotificationService,
    private loginService: LoginService,
  ) {}

  /** Para staff (profileId=4) comprueba el permiso; para el resto siempre true */
  hasPermission(key: string): boolean {
    const user: any = this.loginService['usuarioAutenticado']?.getValue?.();
    const profileId = user?.profileType?.profileId ?? -1;
    if (profileId !== 4) return true;
    const perms: string[] = user?.staffPermissions ?? [];
    return perms.includes(key);
  }

  /* =========================
     INIT
  ========================= */

  ngOnInit(): void {
    this.loadAccessContext();

    this.route.params.subscribe((params) => {
      this.clubId = +params['clubId'];
    });

    const temporadaLS = localStorage.getItem('temporada');
    if (temporadaLS) {
      this.temporadaStoredValue = temporadaLS;
    }

    this.cargarDatosDashboard();
    this.updateCurrentTimeLine();
    this.timeInterval = setInterval(() => this.updateCurrentTimeLine(), 60000);
  }

  ngOnDestroy(): void {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
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
            console.log(response);
            this.listTeams = response.data.teams || [];
            this.listUltimos = response.data.ultimos || [];
            this.listProximos = (response.data.proximos || []).map(
              (p: string) => this.parseProximo(p),
            );

            this.parseResultados();
            this.generarCalendarioEntrenos();
          }
          this.loadingDashboard = false;
        },
        error: () => {
          this.loadingDashboard = false;
          this.notification.error('CUADROMANDO.LOAD_ERROR');
        },
      });
  }
  parseProximo(raw: string): {
    local: string;
    visitante: string;
    dia: string;
    fecha: string;
    hora: string;
  } {
    const [teamsPart, datePart] = raw.split(' el ');
    const [local, visitante] = teamsPart.split(' - ');

    const match = datePart?.match(
      /(.*?) (\d{1,2}) de (.*?) de (\d{4}) de (\d{2}:\d{2})/,
    );

    if (!match) {
      return {
        local: local?.trim() || '',
        visitante: visitante?.trim() || '',
        dia: '',
        fecha: '',
        hora: '',
      };
    }

    const [, diaSemana, dia, mes, anio, hora] = match;

    return {
      local: local.trim(),
      visitante: visitante?.trim() || '',
      dia: diaSemana,
      fecha: `${dia} ${mes} ${anio}`,
      hora,
    };
  }

  /* =========================
     RESULTADOS (CARD)
  ========================= */

  parseResultados(): void {
    this.parsedResultados = this.listUltimos.map((r: string) => {
      // Estado
      const estadoChar = r.charAt(0);

      // Marcador
      const marcadorMatch = r.match(/\d+\s-\s\d+/);
      const marcador = marcadorMatch ? marcadorMatch[0] : '';

      // Fecha (solo número + mes + año, sin el día de la semana)
      // Ej: "el Domingo 7 de septiembre de 2025"
      const fechaMatch = r.match(
        /el\s+\w+\s+(\d+)\s+de\s+(\w+)\s+de\s+(\d{4})/,
      );
      let fecha = '';
      if (fechaMatch) {
        const [, dia, mes, anio] = fechaMatch;
        fecha = `${dia} ${mes.substring(0, 3).toUpperCase()} ${anio}`;
      }

      // Limpiar texto base
      const textoSinPrefijo = r.replace(/^.\s*:\s*/, '');
      const textoSinFecha = textoSinPrefijo.replace(/el\s+.*$/, '');

      const partes = marcador
        ? textoSinFecha.split(marcador)
        : [textoSinFecha, ''];

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
        fecha,
      };
    });
  }

  /* =========================
     CALENDARIO
  ========================= */

  generarCalendarioEntrenos(): void {
    const pxPorMinuto = this.PX_POR_HORA / 60;
    const inicioDia = this.HORA_INICIO * 60;
    const finDia = this.HORA_FIN * 60;

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

    // Horas fijas de 08:00 a 23:00
    this.horas = [];
    for (let m = inicioDia; m <= finDia; m += 60) {
      const h = Math.floor(m / 60).toString().padStart(2, '0');
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
    this.updateCurrentTimeLine();
  }

  timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  updateCurrentTimeLine(): void {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const inicioDia = this.HORA_INICIO * 60;
    const finDia = this.HORA_FIN * 60;
    const pxPorMinuto = this.PX_POR_HORA / 60;

    if (currentMinutes >= inicioDia && currentMinutes <= finDia) {
      this.currentTimeTop = (currentMinutes - inicioDia) * pxPorMinuto;
      const hh = now.getHours().toString().padStart(2, '0');
      const mm = now.getMinutes().toString().padStart(2, '0');
      this.currentTimeLabel = `${hh}:${mm}`;
    } else {
      this.currentTimeTop = -1;
    }
  }

  /* =========================
     NAVEGACIÓN
  ========================= */

  irAPantalla(id: number): void {
    if (this.isClubFreePlan() && this.isRestrictedDashboardOption(id)) {
      this.router.navigate(['/dashboard/suscripcion-club']);
      return;
    }

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

      case 10:
        this.router.navigate([
          '/dashboard/cuadro-de-mandos/calendario-club',
          this.clubId,
        ]);
        break;

      case 11:
        this.router.navigate([
          '/dashboard/cuadro-de-mandos/lesiones-club',
          this.clubId,
        ]);
        break;

      case 12:
        this.router.navigate([
          '/dashboard/cuadro-de-mandos/info-entrenadores',
          this.clubId,
        ]);
        break;

      default:
        console.warn('Ruta no definida para el id:', id);
        break;
    }
  }

  onRestrictedDashboardCardClick(): void {
    if (this.isClubFreePlan()) {
      this.router.navigate(['/dashboard/suscripcion-club']);
    }
  }

  showSubscriptionUpgradeCta(): boolean {
    return this.isClubFreePlan();
  }

  irASuscripcionClub(): void {
    this.router.navigate(['/dashboard/suscripcion-club']);
  }

  private loadAccessContext(): void {
    const user: any = this.loginService['usuarioAutenticado']?.getValue?.();
    this.profileId = user?.profileType?.profileId ?? -1;

    const cachedPlan = localStorage.getItem(this.CLUB_PLAN_TYPE_KEY) as ClubPlanType | null;
    this.clubPlanType = cachedPlan;
  }

  private isClubFreePlan(): boolean {
    if (isDemoMode()) return false; // En demo todas las opciones disponibles
    if (this.profileId !== 1) return false;
    if (this.clubPlanType === 'gratuito') return true;

    const cachedPlan = localStorage.getItem(this.CLUB_PLAN_TYPE_KEY) as ClubPlanType | null;
    if (cachedPlan === 'gratuito') {
      this.clubPlanType = cachedPlan;
      return true;
    }

    return false;
  }

  private isRestrictedDashboardOption(id: number): boolean {
    return [7, 8, 10, 11].includes(id);
  }
}
