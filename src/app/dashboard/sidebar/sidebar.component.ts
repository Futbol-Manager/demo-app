import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { LoginService } from 'src/app/core/services/login/login.service';
import { SidebarService } from 'src/app/core/services/sidebar/sidebar.service';
import { ClubService } from 'src/app/core/services/club/club.service';
import { TrackingService } from 'src/app/core/services/tracking/tracking.service';
import { ClubSubscriptionService } from 'src/app/core/services/subscription/club-subscription.service';
import { User } from 'src/app/core/models/users/user.model';
import { Response } from 'src/app/core/services/models/response.model';
import { ClubPlanType } from 'src/app/core/models/subscription/club-subscription.model';
import { environment } from 'src/environments/environment';
import { isDemoMode } from 'src/app/core/services/demo/demo-mode';

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
  clubPlanType: ClubPlanType | null = null;
  isLoadingSubscription = false;

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
    private trackingService: TrackingService,
    private clubSubscriptionService: ClubSubscriptionService
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
    console.log('[SIDEBAR DEBUG] ngOnInit called');
    // Primero: extraer URL y parámetros de ruta ANTES de suscripciones
    this.currentUrl = this.router.url;
    this.extractRouteParams();

    // Luego: suscribirse al usuario (BehaviorSubject se dispara inmediatamente)
    this.subs.push(
      this.loginService.usuarioActual.subscribe((user: User | null) => {
        console.log('[SIDEBAR DEBUG] User subscription triggered:');
        console.log('  user:', user);
        console.log('  user?.profileType?.profileId:', user?.profileType?.profileId);
        console.log('  user?.userId:', user?.userId);
        
        if (user) {
          this.profileId = user.profileType?.profileId ?? 0;
          this.userId = user.userId ?? 0;
          this.playerId = user.playerId ?? 0;
          this.staffPermissions = user.staffPermissions ?? [];
          
          console.log('[SIDEBAR DEBUG] After setting user data:');
          console.log('  this.profileId:', this.profileId);
          console.log('  this.userId:', this.userId);
          
          // Override admin: userId=9 siempre se comporta como Coach (profileId 2)
          if (this.userId === 9 && this.profileId !== 1 && this.profileId !== 2) {
            this.profileId = 2;
            console.log('[SIDEBAR DEBUG] Applied admin override, profileId now:', this.profileId);
          }
          
          console.log('[SIDEBAR DEBUG] About to call loadClubId for profileId:', this.profileId);
          this.loadClubId();
          
          // Construir secciones inmediatamente solo si NO es usuario club
          if (this.profileId !== 1) {
            console.log('[SIDEBAR DEBUG] Non-club user, building sections immediately');
            this.isLoadingSubscription = false;
            this.buildSections();
          } else {
            console.log('[SIDEBAR DEBUG] Club user detected, loadClubId should handle the rest');
          }
        } else {
          console.log('[SIDEBAR DEBUG] No user found in subscription');
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
        // Solo reconstruir si no es club o ya terminó de cargar
        if (this.profileId !== 1 || !this.isLoadingSubscription) {
          this.buildSections();
        }
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
      // Verificar acceso para usuarios club con plan gratuito
      if (this.profileId === 1 && this.clubPlanType === 'gratuito') {
        const allowedRoutes = [
          `/dashboard/cuadro-de-mandos/${this.clubId}`,
          '/dashboard/equipos',
          `/dashboard/documentos-club/${this.clubId}`,
          `/dashboard/new-cuotas/${this.clubId}`,
          '/dashboard/asistente-ia',
          '/dashboard/inicio',
          '/dashboard/inicio-deportes'
        ];
        
        const isAllowed = allowedRoutes.some(route => item.route!.startsWith(route));
        
        if (!isAllowed) {
          console.log('[SIDEBAR DEBUG] Access denied to route:', item.route, '- redirecting to subscriptions');
          // Redirigir a página de suscripciones
          this.router.navigateByUrl('/dashboard/suscripciones');
          return;
        }
      }

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

  trackBySection(index: number, section: SidebarSection): string {
    return section.id;
  }

  trackByItem(index: number, item: SidebarItem): string {
    return item.id;
  }

  private loadClubId(): void {
    console.log('[SIDEBAR DEBUG] loadClubId called for userId:', this.userId, 'profileId:', this.profileId);
    
    // Si es usuario club, iniciar loading estado inmediatamente
    if (this.profileId === 1) {
      this.isLoadingSubscription = true;
      console.log('[SIDEBAR DEBUG] Set isLoadingSubscription = true for club user');
    }

    const cached = sessionStorage.getItem('clubId');
    console.log('[SIDEBAR DEBUG] Cached clubId:', cached);
    
    if (cached && Number(cached) > 0) {
      this.clubId = Number(cached);
      console.log('[SIDEBAR DEBUG] Using cached clubId:', this.clubId);
      this.loadClubSubscription();
      return;
    }

    if (this.userId > 0) {
      console.log('[SIDEBAR DEBUG] Getting clubId for userId:', this.userId);
      this.clubService.getClubByUserId(this.userId).pipe(take(1)).subscribe({
        next: (res: Response) => {
          console.log('[SIDEBAR DEBUG] getClubByUserId response:', res);
          if (res?.data && typeof res.data === 'number' && res.data > 0) {
            this.clubId = res.data;
            console.log('[SIDEBAR DEBUG] Got clubId:', this.clubId);
            sessionStorage.setItem('clubId', String(this.clubId));
            this.loadClubSubscription();
          } else {
            console.log('[SIDEBAR DEBUG] No valid clubId in response');
            if (this.profileId === 1) {
              this.isLoadingSubscription = false;
              this.buildSections();
            }
          }
        },
        error: (err) => {
          console.log('[SIDEBAR DEBUG] Error getting clubId:', err);
          // Si hay error obteniendo clubId, parar loading y construir menú por defecto
          if (this.profileId === 1) {
            this.isLoadingSubscription = false;
            this.buildSections();
          }
        }
      });
    } else {
      console.log('[SIDEBAR DEBUG] No userId, stopping loading');
      // Si no hay userId, parar loading y construir menú por defecto  
      if (this.profileId === 1) {
        this.isLoadingSubscription = false;
        this.buildSections();
      }
    }
  }

  private loadClubSubscription(): void {
    console.log('[SIDEBAR DEBUG] loadClubSubscription called:');
    console.log('  profileId:', this.profileId);
    console.log('  clubId:', this.clubId);
    
    if (this.profileId !== 1 || this.clubId <= 0) {
      console.log('[SIDEBAR DEBUG] Not club user or no clubId, setting to null');
      this.clubPlanType = null;
      this.isLoadingSubscription = false;
      return;
    }

    console.log('[SIDEBAR DEBUG] Starting subscription load...');
    this.isLoadingSubscription = true;
    
    this.clubSubscriptionService.getCurrentClubPlan(this.clubId).pipe(take(1)).subscribe({
      next: (result: any) => {
        console.log('[SIDEBAR DEBUG] Subscription API response:', result);
        this.clubPlanType = (result?.success && result?.plan?.planType)
          ? result.plan.planType as ClubPlanType
          : null;
        console.log('[SIDEBAR DEBUG] Set clubPlanType to:', this.clubPlanType);
        this.isLoadingSubscription = false;
        this.buildSections();
      },
      error: (err) => {
        console.log('[SIDEBAR DEBUG] Subscription API error (acceso completo por defecto):', err);
        this.clubPlanType = null;
        this.isLoadingSubscription = false;
        this.buildSections();
      }
    });
  }

  private isClubFreePlan(): boolean {
    return this.profileId === 1 && this.clubPlanType === 'gratuito';
  }

  private getClubAccessType(): 'no-subscription' | 'free-plan' | 'other-plan' {
    // En modo demo mostrar siempre el menú completo (Ropa, Patrocinadores, Notificaciones, Scouting)
    if (isDemoMode()) return 'no-subscription';

    if (this.profileId !== 1) return 'no-subscription';

    if (this.clubPlanType === null) {
      console.log('  → returning: no-subscription (planType is null)');
      return 'no-subscription';
    } else if (this.clubPlanType === 'gratuito') {
      console.log('  → returning: free-plan');
      return 'free-plan';
    } else {
      console.log('  → returning: other-plan');
      return 'other-plan';
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
    console.log('[SIDEBAR DEBUG] buildSections called:');
    console.log('  profileId:', this.profileId);
    console.log('  isLoadingSubscription:', this.isLoadingSubscription);
    console.log('  clubPlanType:', this.clubPlanType);
    
    // Si es usuario club y está cargando la suscripción, no construir el menú aún
    if (this.profileId === 1 && this.isLoadingSubscription) {
      console.log('[SIDEBAR DEBUG] Club user still loading subscription, skipping buildSections');
      return;
    }

    console.log('[SIDEBAR DEBUG] Building sections...');
    this.sections = [];
    const isOnClubMenu = this.currentUrl.includes('/menu-club/');
    const isOnCoachMenu = this.currentUrl.includes('/menu-entrenador/');
    const isOnPlayerMenu = this.currentUrl.includes('/opcionesjugador/');
    const isOnInicio = this.currentUrl === '/dashboard/inicio' || this.currentUrl === '/dashboard/inicio-deportes';
    const hasTeam = this.teamId > 0;
    const hasPlayer = this.playerId > 0;
    const isClubFreePlan = this.isClubFreePlan();
    
    console.log('[SIDEBAR DEBUG] URL analysis:');
    console.log('  currentUrl:', this.currentUrl);
    console.log('  isOnClubMenu:', isOnClubMenu);
    console.log('  isOnInicio:', isOnInicio);
    console.log('  hasTeam:', hasTeam, '(teamId:', this.teamId, ')');
    console.log('  isClubFreePlan:', isClubFreePlan);

    // ─── General (siempre visible) ─── Claves i18n SIDEBAR.*
    const generalItems: SidebarItem[] = [
      { id: 'home', label: 'SIDEBAR.HOME', icon: 'bi-house-door', route: '/dashboard/inicio' },
    ];
    if (this.profileId === 2 || this.profileId === 6 || this.profileId === 7) {
      generalItems.push({ id: 'ai', label: 'SIDEBAR.AI_ASSISTANT', icon: 'bi-robot', route: '/dashboard/asistente-ia-coach' });
    } else if (this.profileId === 1) {
      const clubAccessType = this.getClubAccessType();
      console.log('[SIDEBAR DEBUG] General section - club access type:', clubAccessType);
      
      // Para plan gratuito, NO agregar AI assistant aquí (ya está en la sección club como uno de los 5 módulos)
      if (clubAccessType !== 'free-plan') {
        generalItems.push({ id: 'ai', label: 'SIDEBAR.AI_ASSISTANT', icon: 'bi-robot', route: '/dashboard/asistente-ia' });
        console.log('[SIDEBAR DEBUG] Added AI assistant to general section');
      } else {
        console.log('[SIDEBAR DEBUG] Skipping AI assistant in general section for free plan');
      }
      
      switch (clubAccessType) {
        case 'no-subscription':
          generalItems.push({ id: 'staff', label: 'Gestión de Staff', icon: 'bi-person-badge', route: '/dashboard/staff-club' });
          break;
        case 'free-plan':
          // Plan gratuito: no agregar gestión de staff aquí
          break;
        case 'other-plan':
          // TODO: Por definir más tarde qué elementos adicionales en general
          break;
      }
    }
    console.log('[SIDEBAR DEBUG] General section final items:', generalItems.map(item => item.label));
    this.sections.push({ id: 'general', title: 'SIDEBAR.SECTION_GENERAL', items: generalItems, visible: true });

    // ─── Club (profileId 1 - visible cuando NO está en menú club) ───
    console.log('[SIDEBAR DEBUG] Club section check:');
    console.log('  profileId === 1:', this.profileId === 1);
    console.log('  !isOnClubMenu:', !isOnClubMenu);
    console.log('  !isOnInicio:', !isOnInicio);
    
    // Para plan gratuito, mostrar menú incluso en página inicio
    const clubAccessType = this.getClubAccessType();
    const showForFreePlan = clubAccessType === 'free-plan';
    const shouldShowClubSection = this.profileId === 1 && !isOnClubMenu && (!isOnInicio || showForFreePlan);
    
    console.log('  clubAccessType:', clubAccessType);
    console.log('  showForFreePlan:', showForFreePlan);
    console.log('  shouldShowClubSection:', shouldShowClubSection);
    
    if (shouldShowClubSection) {
      console.log('[SIDEBAR DEBUG] Entering club section construction');
      const clubAccessType = this.getClubAccessType();
      let clubItems: SidebarItem[] = [];

      switch (clubAccessType) {
        case 'no-subscription':
          // Sin suscripción: ven todo el menú completo
          clubItems = [
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
          break;

        case 'free-plan':
          // Plan gratuito: solo 5 módulos específicos
          clubItems = [
            { id: 'dashboard', label: 'SIDEBAR.DASHBOARD', icon: 'bi-clipboard2-data', route: `/dashboard/cuadro-de-mandos/${this.clubId}` },
            { id: 'equipos', label: 'SIDEBAR.TEAMS', icon: 'bi-people', route: '/dashboard/equipos' },
            { id: 'docs', label: 'SIDEBAR.DOCUMENTS', icon: 'bi-file-earmark-pdf', route: `/dashboard/documentos-club/${this.clubId}` },
            { id: 'cuotas', label: 'SIDEBAR.FEES', icon: 'bi-bank2', route: `/dashboard/new-cuotas/${this.clubId}` },
            { id: 'ai', label: 'SIDEBAR.AI_ASSISTANT', icon: 'bi-robot', route: '/dashboard/asistente-ia' },
          ];
          console.log('[SIDEBAR DEBUG] Free plan - created clubItems:', clubItems.map(item => item.label));
          break;

        case 'other-plan':
          // Otros tipos de suscripción: por definir más tarde
          clubItems = [
            { id: 'dashboard', label: 'SIDEBAR.DASHBOARD', icon: 'bi-clipboard2-data', route: `/dashboard/cuadro-de-mandos/${this.clubId}` },
            { id: 'equipos', label: 'SIDEBAR.TEAMS', icon: 'bi-people', route: '/dashboard/equipos' },
            { id: 'docs', label: 'SIDEBAR.DOCUMENTS', icon: 'bi-file-earmark-pdf', route: `/dashboard/documentos-club/${this.clubId}` },
            { id: 'cuotas', label: 'SIDEBAR.FEES', icon: 'bi-bank2', route: `/dashboard/new-cuotas/${this.clubId}` },
            // TODO: Definir qué elementos ver para otros tipos de suscripción
          ];
          break;
      }

      console.log('[SIDEBAR DEBUG] Adding club section with', clubItems.length, 'items:', clubItems.map(item => item.label));
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
        // Entreno Individual deshabilitado
        { id: 'perfil', label: 'SIDEBAR.MY_PROFILE', icon: 'bi-person-badge', route: `/dashboard/perfil-entrenador/${this.teamId}/${this.playerId}` },
      ];
      this.sections.push({ id: 'coach', title: 'SIDEBAR.SECTION_COACH', items: coachItems, visible: true });
    }

    // ─── Equipo Club (profileId 1 cuando está dentro de un equipo) ───
    console.log('[SIDEBAR DEBUG] Team section check:');
    console.log('  profileId === 1:', this.profileId === 1);
    console.log('  hasTeam:', hasTeam);
    console.log('  !isOnClubMenu:', !isOnClubMenu);
    console.log('  Team section condition met:', this.profileId === 1 && hasTeam && !isOnClubMenu);
    
    if (this.profileId === 1 && hasTeam && !isOnClubMenu) {
      console.log('[SIDEBAR DEBUG] Entering team section construction');
      const clubAccessType = this.getClubAccessType();
      
      switch (clubAccessType) {
        case 'no-subscription':
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
          break;
        case 'free-plan':
          // Plan gratuito: no mostrar sección de equipo (solo los 5 módulos básicos)
          break;
        case 'other-plan':
          // TODO: Por definir más tarde
          break;
      }
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
        // Entreno Individual deshabilitado
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
        // Entreno Individual deshabilitado
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

      if (staffItems.length > 0) {
        this.sections.push({ id: 'staff', title: 'Mi acceso', items: staffItems, visible: true });
      }
    }

    console.log('[SIDEBAR DEBUG] Final sections summary:');
    console.log('[SIDEBAR DEBUG] Total sections created:', this.sections.length);
    this.sections.forEach(section => {
      console.log(`  - Section "${section.id}": ${section.items.length} items`);
      section.items.forEach(item => {
        console.log(`    * ${item.label} (${item.id})`);
      });
    });
    console.log('[SIDEBAR DEBUG] END buildSections');
  }
}
