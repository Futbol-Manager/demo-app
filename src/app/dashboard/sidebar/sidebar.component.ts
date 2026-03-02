import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { LoginService } from 'src/app/core/services/login/login.service';
import { SidebarService } from 'src/app/core/services/sidebar/sidebar.service';
import { ClubService } from 'src/app/core/services/club/club.service';
import { TrackingService } from 'src/app/core/services/tracking/tracking.service';
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
  hoverExpanded = false;
  profileId = 0;
  userId = 0;
  clubId = 0;
  teamId = 0;
  playerId = 0;
  currentUrl = '';
  staffPermissions: string[] = [];

  sections: SidebarSection[] = [];

  private subs: Subscription[] = [];

  private readonly MODULE_LABELS: Record<string, string> = {
    'inicio':                    'Inicio / Dashboard',
    'asistente-ia':              'Asistente IA',
    'asistente-ia-coach':        'Asistente IA (entrenador)',
    'scouting-club':             'Scouting',
    'club-videos':               'Vídeos Scouting',
    'video-analysis':            'Análisis de Vídeo',
    'equipos':                   'Equipos',
    'cuadro-de-mandos':          'Cuadro de mandos',
    'documentos-club':           'Documentos',
    'new-cuotas':                'Cuotas',
    'ropa':                      'Ropa / Equipación',
    'patrocinadores':            'Patrocinadores',
    'notificaciones':            'Notificaciones',
    'calendario':                'Calendario',
    'tareas':                    'Tareas',
    'tareas-catalog':            'Nube de Tareas',
    'jugadores':                 'Jugadores',
    'informacion_equipo':        'Información del equipo',
    'estadisticas_equipo':       'Estadísticas del equipo',
    'estadisticas_jugadores':    'Estadísticas de jugadores',
    'clasificacion-resultados':  'Clasificación y resultados',
    'partidos-entrevistas':      'Galería / Partidos',
    'lesiones':                  'Lesiones',
    'debrief':                   'Debrief',
    'perfil-entrenador':         'Perfil entrenador',
    'tactical-board':            'Pizarra táctica',
    'staff-club':                'Gestión de Staff',
  };

  constructor(
    private loginService: LoginService,
    private router: Router,
    public sidebarService: SidebarService,
    private clubService: ClubService,
    private trackingService: TrackingService
  ) {}

  get isCollapsed(): boolean {
    return this.sidebarService.collapsed;
  }

  /** Sidebar visualmente colapsada (colapso real o hover no activo) */
  get isEffectivelyCollapsed(): boolean {
    return this.collapsed && !this.hoverExpanded;
  }

  onMouseEnter(): void {
    if (this.collapsed) {
      this.hoverExpanded = true;
    }
  }

  onMouseLeave(): void {
    this.hoverExpanded = false;
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
          this.staffPermissions = user.staffPermissions ?? [];
          // Override admin: userId=9 siempre se comporta como Coach (profileId 2)
          if (this.userId === 9 && this.profileId !== 1 && this.profileId !== 2) {
            this.profileId = 2;
          }
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
      this.trackModuleNavigation(item.route, item.label);
      this.router.navigateByUrl(item.route);
    }
  }

  private trackModuleNavigation(route: string, label: string): void {
    const segment = route.split('/').find(s => s && !s.match(/^\d+$/) && s !== 'dashboard');
    const moduleName = (segment && this.MODULE_LABELS[segment]) ? this.MODULE_LABELS[segment] : label;
    this.trackingService.trackActivity('MODULE', 'Módulo visitado: ' + moduleName);
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

    const teamMatch = url.match(/\/(menu-entrenador|menu-fisio|menu-club|calendario|jugadores|estadisticas_equipo|estadisticas_jugadores|informacion_equipo|tareas|tareas-catalog|tareas-favoritas|tareas-historial|tareas-mis|partidos-entrevistas|clasificacion-resultados|lesiones|tactical-board|debrief)\/(\d+)/);
    if (teamMatch) {
      this.teamId = +teamMatch[2];
      // Persist last known teamId so teamless routes (e.g. individual-training) can read it
      if (this.teamId > 0) {
        sessionStorage.setItem('it_lastTeamId', String(this.teamId));
      }
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

    // ─── General (siempre visible) ─── Claves i18n SIDEBAR.*
    const generalItems: SidebarItem[] = [
      { id: 'home', label: 'SIDEBAR.HOME', icon: 'bi-house-door', route: '/dashboard/inicio' },
    ];
    if (this.profileId === 2 || this.profileId === 6 || this.profileId === 7) {
      generalItems.push({ id: 'ai', label: 'SIDEBAR.AI_ASSISTANT', icon: 'bi-robot', route: '/dashboard/asistente-ia-coach' });
    } else if (this.profileId === 1) {
      generalItems.push({ id: 'ai', label: 'SIDEBAR.AI_ASSISTANT', icon: 'bi-robot', route: '/dashboard/asistente-ia' });
      generalItems.push({ id: 'staff', label: 'Gestión de Staff', icon: 'bi-person-badge', route: '/dashboard/staff-club' });
    }
    this.sections.push({ id: 'general', title: 'SIDEBAR.SECTION_GENERAL', items: generalItems, visible: true });

    // ─── Club (profileId 1 - visible cuando NO está en menú club) ───
    if (this.profileId === 1 && !isOnClubMenu && !isOnInicio) {
      const clubItems: SidebarItem[] = [
        { id: 'dashboard', label: 'SIDEBAR.DASHBOARD', icon: 'bi-clipboard2-data', route: `/dashboard/cuadro-de-mandos/${this.clubId}` },
        { id: 'equipos', label: 'SIDEBAR.TEAMS', icon: 'bi-people', route: '/dashboard/equipos' },
        { id: 'docs', label: 'SIDEBAR.DOCUMENTS', icon: 'bi-file-earmark-pdf', route: `/dashboard/documentos-club/${this.clubId}` },
        { id: 'cuotas', label: 'SIDEBAR.FEES', icon: 'bi-bank2', route: `/dashboard/new-cuotas/${this.clubId}` },
        { id: 'ropa', label: 'SIDEBAR.CLOTHING', icon: 'bi-backpack3', route: `/dashboard/ropa/${this.clubId}` },
        { id: 'patrocinadores', label: 'SIDEBAR.SPONSORS', icon: 'bi-collection', route: `/dashboard/patrocinadores/${this.clubId}` },
        { id: 'scouting', label: 'SIDEBAR.SCOUTING', icon: 'bi-binoculars', route: `/dashboard/scouting-club/${this.clubId}` },
        { id: 'videos', label: 'SIDEBAR.SCOUTING_VIDEOS', icon: 'bi-collection-play', route: `/dashboard/club-videos/${this.clubId}` },
        { id: 'video-analysis', label: 'SIDEBAR.VIDEO_ANALYSIS', icon: 'bi-camera-reels', route: '/dashboard/video-analysis' },
        { id: 'staff', label: 'Gestión de Staff', icon: 'bi-person-badge', route: '/dashboard/staff-club' },
        { id: 'notificaciones', label: 'SIDEBAR.NOTIFICATIONS', icon: 'bi-bell', route: `/dashboard/notificaciones/${this.clubId}` },
      ];
      this.sections.push({ id: 'club', title: 'SIDEBAR.SECTION_CLUB', items: clubItems, visible: true });
    }

    // ─── Entrenador (profileId 2) ───
    if (this.profileId === 2 && hasTeam && !isOnCoachMenu && !isOnInicio) {
      const coachItems: SidebarItem[] = [
        { id: 'calendario', label: 'SIDEBAR.CALENDAR', icon: 'bi-calendar-event', route: `/dashboard/calendario/${this.teamId}/0` },
        { id: 'tareas', label: 'SIDEBAR.TASKS', icon: 'bi-list-task', route: `/dashboard/tareas/${this.teamId}` },
        { id: 'tareas-catalog', label: 'SIDEBAR.TASK_CATALOG', icon: 'bi-cloud', route: `/dashboard/tareas-catalog/${this.teamId}` },
        { id: 'jugadores', label: 'SIDEBAR.PLAYERS', icon: 'bi-people', route: `/dashboard/jugadores/${this.teamId}` },
        { id: 'info-equipo', label: 'SIDEBAR.INFO_TEAM', icon: 'bi-info-circle', route: `/dashboard/informacion_equipo/${this.teamId}` },
        { id: 'stats-equipo', label: 'SIDEBAR.STATS_TEAM', icon: 'bi-bar-chart-line', route: `/dashboard/estadisticas_equipo/${this.teamId}` },
        { id: 'stats-jugadores', label: 'SIDEBAR.STATS_PLAYERS', icon: 'bi-graph-up', route: `/dashboard/estadisticas_jugadores/${this.teamId}` },
        { id: 'clasificacion', label: 'SIDEBAR.STANDINGS', icon: 'bi-trophy', route: `/dashboard/clasificacion-resultados/${this.teamId}` },
        { id: 'galeria', label: 'SIDEBAR.GALLERY', icon: 'bi-images', route: `/dashboard/partidos-entrevistas/${this.teamId}/0` },
        { id: 'lesiones', label: 'SIDEBAR.INJURIES', icon: 'bi-heart-pulse', route: `/dashboard/lesiones/${this.teamId}` },
        { id: 'notificaciones', label: 'SIDEBAR.NOTIFICATIONS', icon: 'bi-bell', route: `/dashboard/notificaciones/${this.clubId}` },
        { id: 'debrief', label: 'SIDEBAR.DEBRIEF', icon: 'bi-clipboard-pulse', route: `/dashboard/debrief/history/${this.teamId}` },
        { id: 'video-analysis', label: 'SIDEBAR.VIDEO_ANALYSIS', icon: 'bi-camera-reels', route: '/dashboard/video-analysis' },
        { id: 'individual-training', label: 'Entreno Individual', icon: 'bi-person-walking', route: '/dashboard/individual-training' },
        { id: 'perfil', label: 'SIDEBAR.MY_PROFILE', icon: 'bi-person-badge', route: `/dashboard/perfil-entrenador/${this.teamId}/${this.playerId}` },
      ];
      this.sections.push({ id: 'coach', title: 'SIDEBAR.SECTION_COACH', items: coachItems, visible: true });
    }

    // ─── Equipo Club (profileId 1 cuando está dentro de un equipo) ───
    if (this.profileId === 1 && hasTeam && !isOnClubMenu) {
      const teamItems: SidebarItem[] = [
        { id: 'calendario', label: 'SIDEBAR.CALENDAR', icon: 'bi-calendar4-week', route: `/dashboard/calendario/${this.teamId}/0` },
        { id: 'jugadores', label: 'SIDEBAR.PLAYERS', icon: 'bi-people-fill', route: `/dashboard/jugadores/${this.teamId}` },
        { id: 'stats-jugadores', label: 'SIDEBAR.STATS_PLAYERS_SHORT', icon: 'bi-graph-up', route: `/dashboard/estadisticas_jugadores/${this.teamId}` },
        { id: 'stats-equipo', label: 'SIDEBAR.STATS_TEAM_SHORT', icon: 'bi-bar-chart', route: `/dashboard/estadisticas_equipo/${this.teamId}` },
        { id: 'clasificacion', label: 'SIDEBAR.STANDINGS', icon: 'bi-trophy', route: `/dashboard/clasificacion-resultados/${this.teamId}` },
        { id: 'galeria', label: 'SIDEBAR.GALLERY', icon: 'bi-collection-play', route: `/dashboard/partidos-entrevistas/${this.teamId}/0` },
        { id: 'info', label: 'SIDEBAR.INFO_TEAM', icon: 'bi-info-circle', route: `/dashboard/informacion_equipo/${this.teamId}` },
      ];
      this.sections.push({ id: 'team', title: 'SIDEBAR.SECTION_TEAM', items: teamItems, visible: true });
    }

    // ─── Jugador (profileId 3, 4, 5) ───
    if (this.profileId >= 3 && this.profileId <= 5 && hasPlayer && !isOnPlayerMenu && !isOnInicio) {
      const playerItems: SidebarItem[] = [
        { id: 'datos', label: 'SIDEBAR.PERSONAL_DATA', icon: 'bi-person', route: `/dashboard/jugadores/${this.teamId}` },
        { id: 'calendario', label: 'SIDEBAR.CALENDAR', icon: 'bi-calendar-event', route: `/dashboard/calendario/${this.teamId}/${this.playerId}` },
        { id: 'cuotas', label: 'SIDEBAR.PAY_FEES', icon: 'bi-credit-card', route: `/dashboard/cuotas/${this.teamId}/${this.playerId}` },
        { id: 'documentos', label: 'SIDEBAR.DOCUMENTATION', icon: 'bi-file-earmark-pdf', route: `/dashboard/documentos-jugador/${this.teamId}/${this.playerId}` },
        { id: 'galeria', label: 'SIDEBAR.GALLERY', icon: 'bi-images', route: `/dashboard/partidos-entrevistas/${this.teamId}/${this.playerId}` },
        { id: 'clasificacion', label: 'SIDEBAR.STANDINGS', icon: 'bi-trophy', route: `/dashboard/clasificacion-resultados/${this.teamId}` },
        { id: 'patrocinadores', label: 'SIDEBAR.SPONSORS', icon: 'bi-collection', route: '/dashboard/patrocinadores/0' },
        { id: 'notificaciones', label: 'SIDEBAR.NOTIFICATIONS', icon: 'bi-bell', route: `/dashboard/notificaciones/${this.clubId}` },
      ];
      this.sections.push({ id: 'player', title: 'SIDEBAR.SECTION_PLAYER', items: playerItems, visible: true });
    }

    // ─── Fisioterapeuta / Nutricionista (profileId 6 o 7) ───
    const isOnFisioMenu = this.currentUrl.includes('/menu-fisio/');
    if ((this.profileId === 6 || this.profileId === 7) && hasTeam && !isOnFisioMenu && !isOnInicio) {
      const sectionTitle = this.profileId === 6 ? 'Fisioterapeuta' : 'Nutricionista';
      const fisioItems: SidebarItem[] = [
        { id: 'lesiones', label: 'Lesiones', icon: 'bi-heart-pulse', route: `/dashboard/lesiones/${this.teamId}` },
        { id: 'jugadores', label: 'Jugadores', icon: 'bi-people', route: `/dashboard/jugadores/${this.teamId}` },
        { id: 'calendario', label: 'Calendario', icon: 'bi-calendar-event', route: `/dashboard/calendario/${this.teamId}/0` },
        { id: 'individual-training', label: 'Entreno Individual', icon: 'bi-person-walking', route: '/dashboard/individual-training' },
        { id: 'stats-jugadores', label: 'Estadísticas jugadores', icon: 'bi-graph-up', route: `/dashboard/estadisticas_jugadores/${this.teamId}` },
        { id: 'stats-equipo', label: 'Estadísticas equipo', icon: 'bi-bar-chart-line', route: `/dashboard/estadisticas_equipo/${this.teamId}` },
        { id: 'clasificacion', label: 'Clasificación', icon: 'bi-trophy', route: `/dashboard/clasificacion-resultados/${this.teamId}` },
        { id: 'documentos', label: 'Documentos', icon: 'bi-file-earmark-pdf', route: `/dashboard/documentos-entrenador/${this.clubId}` },
        { id: 'notificaciones', label: 'Notificaciones', icon: 'bi-bell', route: `/dashboard/notificaciones/${this.clubId}` },
        { id: 'perfil', label: 'Mi perfil', icon: 'bi-person-badge', route: `/dashboard/perfil-entrenador/${this.teamId}/${this.playerId}` },
      ];
      this.sections.push({ id: 'fisio', title: sectionTitle, items: fisioItems, visible: true });
    }

    // ─── Staff (profileId 4) ─── muestra solo los módulos autorizados
    if (this.profileId === 4) {
      const perms = this.staffPermissions;
      const has = (key: string) => perms.includes(key);
      const hasDashboard = perms.some(p => p.startsWith('DASHBOARD_'));
      const staffItems: SidebarItem[] = [];

      if (hasDashboard) {
        staffItems.push({ id: 'dashboard', label: 'Cuadro de mando', icon: 'bi-grid-1x2-fill', route: `/dashboard/cuadro-de-mandos/${this.clubId}` });
      }
      if (has('TEAMS'))         staffItems.push({ id: 'equipos',        label: 'Equipos',               icon: 'bi-people',           route: '/dashboard/equipos' });
      if (has('DOCUMENTS'))     staffItems.push({ id: 'docs',           label: 'Documentos',            icon: 'bi-file-earmark-pdf', route: `/dashboard/documentos-club/${this.clubId}` });
      if (has('PAYMENTS'))      staffItems.push({ id: 'cuotas',         label: 'Pagos',                 icon: 'bi-bank2',            route: `/dashboard/new-cuotas/${this.clubId}` });
      if (has('CLOTHING'))      staffItems.push({ id: 'ropa',           label: 'Ropa',                  icon: 'bi-backpack3',        route: `/dashboard/ropa/${this.clubId}` });
      if (has('SPONSORS'))      staffItems.push({ id: 'patrocinadores', label: 'Patrocinadores',        icon: 'bi-collection',       route: `/dashboard/patrocinadores/${this.clubId}` });
      if (has('NOTIFICATIONS')) staffItems.push({ id: 'notificaciones', label: 'Notificaciones',        icon: 'bi-bell',             route: `/dashboard/notificaciones/${this.clubId}` });
      if (has('VIDEO_LIBRARY')) staffItems.push({ id: 'videos',         label: 'Biblioteca de Vídeos', icon: 'bi-collection-play',  route: `/dashboard/club-videos/${this.clubId}` });
      if (has('SCOUTING'))      staffItems.push({ id: 'scouting',       label: 'Scouting',              icon: 'bi-binoculars',       route: `/dashboard/scouting-club/${this.clubId}` });
      if (has('AI_ASSISTANT'))  staffItems.push({ id: 'ai',             label: 'Asistente de IA',       icon: 'bi-robot',            route: '/dashboard/asistente-ia' });
      if (has('VIDEO_ANALYSIS'))staffItems.push({ id: 'video-analysis', label: 'Análisis de vídeo',    icon: 'bi-camera-reels',     route: '/dashboard/video-analysis' });
      if (has('ERP'))           staffItems.push({ id: 'erp',            label: 'Gestión / ERP',         icon: 'bi-gear',             route: '/dashboard/erp' });

      if (staffItems.length > 0) {
        this.sections.push({ id: 'staff', title: 'Mi acceso', items: staffItems, visible: true });
      }
    }

    // ─── Admin (solo userId 9) ───
    if (this.userId === 9) {
      const adminItems: SidebarItem[] = [
        { id: 'admin', label: 'SIDEBAR.ADMIN', icon: 'bi-shield-lock', route: '/dashboard/admin-clubes' },
        { id: 'registros', label: 'SIDEBAR.REGISTERS', icon: 'bi-journal-text', route: '/dashboard/admin-registros' },
        { id: 'actividad', label: 'SIDEBAR.ACTIVITY', icon: 'bi-activity', route: '/dashboard/admin-activity' },
        { id: 'charts', label: 'SIDEBAR.CHARTS', icon: 'bi-graph-up-arrow', route: '/dashboard/admin-charts' },
        { id: 'sugerencias', label: 'SIDEBAR.SUGGESTIONS', icon: 'bi-chat-dots', route: '/dashboard/admin-sugerencias' },
        { id: 'prospector', label: 'Prospector', icon: 'bi-bullseye', route: '/dashboard/admin-prospector' },
        { id: 'rrss', label: 'Redes Sociales', icon: 'bi-calendar3', route: '/dashboard/rrss' },
      ];
      this.sections.push({ id: 'admin', title: 'SIDEBAR.SECTION_ADMIN', items: adminItems, visible: true });
    }
  }
}
