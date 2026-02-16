import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { LoginService } from 'src/app/core/services/login/login.service';
import { SidebarService } from 'src/app/core/services/sidebar/sidebar.service';
import { ClubService } from 'src/app/core/services/club/club.service';
import { User } from 'src/app/core/models/users/user.model';
import { Response } from 'src/app/core/services/models/response.model';

export interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  route?: string;
  action?: () => void;
}

export interface SidebarSection {
  id: string;
  title: string;
  items: SidebarItem[];
  visible: boolean;
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit, OnDestroy {

  collapsed = true;
  profileId = 0;
  userId = 0;
  clubId = 0;
  teamId = 0;
  playerId = 0;
  currentUrl = '';

  sections: SidebarSection[] = [];

  private subs: Subscription[] = [];

  constructor(
    private loginService: LoginService,
    private router: Router,
    public sidebarService: SidebarService,
    private clubService: ClubService
  ) {}

  get isCollapsed(): boolean {
    return this.sidebarService.collapsed;
  }

  ngOnInit(): void {
    // Primero: extraer URL y parámetros de ruta ANTES de suscripciones
    this.currentUrl = this.router.url;
    this.extractRouteParams();

    // Luego: suscribirse al usuario (BehaviorSubject se dispara inmediatamente)
    this.subs.push(
      this.loginService.usuarioActual.subscribe((user: User | null) => {
        if (user) {
          this.profileId = user.profileType?.profileId ?? 0;
          this.userId = user.userId ?? 0;
          this.playerId = user.playerId ?? 0;
          this.loadClubId();
          this.buildSections();
        }
      })
    );

    // Escuchar navegaciones futuras
    this.subs.push(
      this.router.events.pipe(
        filter(e => e instanceof NavigationEnd)
      ).subscribe((e: any) => {
        this.currentUrl = e.urlAfterRedirects || e.url;
        this.extractRouteParams();
        this.buildSections();
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  toggle(): void {
    this.sidebarService.toggle();
    this.collapsed = this.sidebarService.collapsed;
  }

  navigate(item: SidebarItem): void {
    if (item.action) {
      item.action();
    } else if (item.route) {
      this.router.navigateByUrl(item.route);
    }
  }

  isActive(item: SidebarItem): boolean {
    if (!item.route) return false;
    return this.currentUrl.startsWith(item.route);
  }

  private loadClubId(): void {
    const cached = sessionStorage.getItem('clubId');
    if (cached && Number(cached) > 0) {
      this.clubId = Number(cached);
      return;
    }

    if (this.userId > 0) {
      this.clubService.getClubByUserId(this.userId).pipe(take(1)).subscribe({
        next: (res: Response) => {
          if (res?.data && typeof res.data === 'number' && res.data > 0) {
            this.clubId = res.data;
            sessionStorage.setItem('clubId', String(this.clubId));
            this.buildSections();
          }
        },
        error: () => {}
      });
    }
  }

  private extractRouteParams(): void {
    const url = this.currentUrl;

    const teamMatch = url.match(/\/(menu-entrenador|menu-club|calendario|jugadores|estadisticas_equipo|estadisticas_jugadores|informacion_equipo|tareas|partidos-entrevistas|clasificacion-resultados|lesiones|tactical-board|debrief)\/(\d+)/);
    if (teamMatch) {
      this.teamId = +teamMatch[2];
    }

    const playerMatch = url.match(/\/(opcionesjugador|calendario|partidos-entrevistas|cuotas|documentos-jugador|perfil-entrenador)\/\d+\/(\d+)/);
    if (playerMatch) {
      const pid = +playerMatch[2];
      if (pid > 0) this.playerId = pid;
    }
  }

  private buildSections(): void {
    this.sections = [];
    const isOnClubMenu = this.currentUrl.includes('/menu-club/');
    const isOnCoachMenu = this.currentUrl.includes('/menu-entrenador/');
    const isOnPlayerMenu = this.currentUrl.includes('/opcionesjugador/');
    const isOnInicio = this.currentUrl === '/dashboard/inicio' || this.currentUrl === '/dashboard/inicio-deportes';
    const hasTeam = this.teamId > 0;
    const hasPlayer = this.playerId > 0;

    // ─── General (siempre visible) ───
    const generalItems: SidebarItem[] = [
      { id: 'home', label: 'Inicio', icon: 'bi-house-door', route: '/dashboard/inicio' },
    ];

    if (this.profileId === 2) {
      generalItems.push({ id: 'ai', label: 'Asistente IA', icon: 'bi-robot', route: '/dashboard/asistente-ia-coach' });
    } else if (this.profileId === 1) {
      generalItems.push({ id: 'ai', label: 'Asistente IA', icon: 'bi-robot', route: '/dashboard/asistente-ia' });
    }

    this.sections.push({ id: 'general', title: 'General', items: generalItems, visible: true });

    // ─── Club (profileId 1 - visible cuando NO está en menú club) ───
    if (this.profileId === 1 && !isOnClubMenu && !isOnInicio) {
      const clubItems: SidebarItem[] = [
        { id: 'dashboard', label: 'Cuadro de mandos', icon: 'bi-clipboard2-data', route: `/dashboard/cuadro-de-mandos/${this.clubId}` },
        { id: 'equipos', label: 'Equipos', icon: 'bi-people', route: '/dashboard/equipos' },
        { id: 'docs', label: 'Documentos', icon: 'bi-file-earmark-pdf', route: `/dashboard/documentos-club/${this.clubId}` },
        { id: 'cuotas', label: 'Cuotas', icon: 'bi-bank2', route: `/dashboard/new-cuotas/${this.clubId}` },
        { id: 'ropa', label: 'Ropa', icon: 'bi-backpack3', route: `/dashboard/ropa/${this.clubId}` },
        { id: 'patrocinadores', label: 'Patrocinadores', icon: 'bi-collection', route: `/dashboard/patrocinadores/${this.clubId}` },
        { id: 'notificaciones', label: 'Notificaciones', icon: 'bi-bell', route: `/dashboard/notificaciones/${this.clubId}` },
      ];
      this.sections.push({ id: 'club', title: 'Club', items: clubItems, visible: true });
    }

    // ─── Entrenador (profileId 2 - visible cuando tiene equipo Y NO está en menú entrenador) ───
    if (this.profileId === 2 && hasTeam && !isOnCoachMenu && !isOnInicio) {
      const coachItems: SidebarItem[] = [
        { id: 'calendario', label: 'Calendario', icon: 'bi-calendar-event', route: `/dashboard/calendario/${this.teamId}/0` },
        { id: 'tareas', label: 'Tareas', icon: 'bi-list-task', route: `/dashboard/tareas/${this.teamId}` },
        { id: 'jugadores', label: 'Jugadores', icon: 'bi-people', route: `/dashboard/jugadores/${this.teamId}` },
        { id: 'info-equipo', label: 'Info equipo', icon: 'bi-info-circle', route: `/dashboard/informacion_equipo/${this.teamId}` },
        { id: 'stats-equipo', label: 'Estadísticas equipo', icon: 'bi-bar-chart-line', route: `/dashboard/estadisticas_equipo/${this.teamId}` },
        { id: 'stats-jugadores', label: 'Estadísticas jugadores', icon: 'bi-graph-up', route: `/dashboard/estadisticas_jugadores/${this.teamId}` },
        { id: 'clasificacion', label: 'Clasificación', icon: 'bi-trophy', route: `/dashboard/clasificacion-resultados/${this.teamId}` },
        { id: 'galeria', label: 'Galería', icon: 'bi-images', route: `/dashboard/partidos-entrevistas/${this.teamId}/0` },
        { id: 'lesiones', label: 'Lesiones', icon: 'bi-heart-pulse', route: `/dashboard/lesiones/${this.teamId}` },
        { id: 'notificaciones', label: 'Notificaciones', icon: 'bi-bell', route: `/dashboard/notificaciones/${this.clubId}` },
        { id: 'debrief', label: 'Debrief', icon: 'bi-clipboard-pulse', route: `/dashboard/debrief/history/${this.teamId}` },
        { id: 'perfil', label: 'Mi perfil', icon: 'bi-person-badge', route: `/dashboard/perfil-entrenador/${this.teamId}/${this.playerId}` },
      ];
      this.sections.push({ id: 'coach', title: 'Entrenador', items: coachItems, visible: true });
    }

    // ─── Equipo Club (profileId 1 cuando está dentro de un equipo) ───
    if (this.profileId === 1 && hasTeam && !isOnClubMenu) {
      const teamItems: SidebarItem[] = [
        { id: 'calendario', label: 'Calendario', icon: 'bi-calendar4-week', route: `/dashboard/calendario/${this.teamId}/0` },
        { id: 'jugadores', label: 'Jugadores', icon: 'bi-people-fill', route: `/dashboard/jugadores/${this.teamId}` },
        { id: 'stats-jugadores', label: 'Estad. jugadores', icon: 'bi-graph-up', route: `/dashboard/estadisticas_jugadores/${this.teamId}` },
        { id: 'stats-equipo', label: 'Estad. equipo', icon: 'bi-bar-chart', route: `/dashboard/estadisticas_equipo/${this.teamId}` },
        { id: 'clasificacion', label: 'Clasificación', icon: 'bi-trophy', route: `/dashboard/clasificacion-resultados/${this.teamId}` },
        { id: 'galeria', label: 'Galería', icon: 'bi-collection-play', route: `/dashboard/partidos-entrevistas/${this.teamId}/0` },
        { id: 'info', label: 'Info equipo', icon: 'bi-info-circle', route: `/dashboard/informacion_equipo/${this.teamId}` },
      ];
      this.sections.push({ id: 'team', title: 'Equipo', items: teamItems, visible: true });
    }

    // ─── Jugador (profileId >= 3 - visible cuando tiene jugador Y NO está en menú jugador) ───
    if (this.profileId >= 3 && hasPlayer && !isOnPlayerMenu && !isOnInicio) {
      const playerItems: SidebarItem[] = [
        { id: 'datos', label: 'Datos personales', icon: 'bi-person', route: `/dashboard/jugadores/${this.teamId}` },
        { id: 'calendario', label: 'Calendario', icon: 'bi-calendar-event', route: `/dashboard/calendario/${this.teamId}/${this.playerId}` },
        { id: 'cuotas', label: 'Pagar cuotas', icon: 'bi-credit-card', route: `/dashboard/cuotas/${this.teamId}/${this.playerId}` },
        { id: 'documentos', label: 'Documentación', icon: 'bi-file-earmark-pdf', route: `/dashboard/documentos-jugador/${this.teamId}/${this.playerId}` },
        { id: 'galeria', label: 'Galería', icon: 'bi-images', route: `/dashboard/partidos-entrevistas/${this.teamId}/${this.playerId}` },
        { id: 'clasificacion', label: 'Clasificación', icon: 'bi-trophy', route: `/dashboard/clasificacion-resultados/${this.teamId}` },
        { id: 'patrocinadores', label: 'Patrocinadores', icon: 'bi-collection', route: '/dashboard/patrocinadores/0' },
        { id: 'notificaciones', label: 'Notificaciones', icon: 'bi-bell', route: `/dashboard/notificaciones/${this.clubId}` },
      ];
      this.sections.push({ id: 'player', title: 'Jugador', items: playerItems, visible: true });
    }

    // ─── Admin (solo userId 9) ───
    if (this.userId === 9) {
      const adminItems: SidebarItem[] = [
        { id: 'admin', label: 'Admin', icon: 'bi-shield-lock', route: '/dashboard/admin-clubes' },
        { id: 'registros', label: 'Registros', icon: 'bi-journal-text', route: '/dashboard/admin-registros' },
        { id: 'actividad', label: 'Actividad', icon: 'bi-activity', route: '/dashboard/admin-activity' },
        { id: 'charts', label: 'Gráficos', icon: 'bi-graph-up-arrow', route: '/dashboard/admin-charts' },
        { id: 'sugerencias', label: 'Sugerencias', icon: 'bi-chat-dots', route: '/dashboard/admin-sugerencias' },
      ];
      this.sections.push({ id: 'admin', title: 'Administración', items: adminItems, visible: true });
    }
  }
}
