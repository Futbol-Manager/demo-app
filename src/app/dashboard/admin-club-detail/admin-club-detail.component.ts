import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { TeamService } from 'src/app/core/services/team/team.service';
import { CrmService } from 'src/app/core/services/crm/crm.service';
import { TrackingService } from 'src/app/core/services/tracking/tracking.service';
import { ClubSubscriptionService } from 'src/app/core/services/subscription/club-subscription.service';
import { VideoStorageService } from 'src/app/core/services/video-storage/video-storage.service';
import { Response } from 'src/app/core/services/models/response.model';
import { environment } from 'src/environments/environment';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-admin-club-detail',
  templateUrl: './admin-club-detail.component.html',
  styleUrls: ['./admin-club-detail.component.scss']
})
export class AdminClubDetailComponent implements OnInit {

  imageBaseUrl: string = environment.images + 'user/';
  clubId = 0;
  club: any = null;
  isLoading = true;
  activeTab: 'info' | 'equipos' | 'entrenadores' | 'crm' | 'sesiones' | 'suscripcion' = 'info';

  // CRM
  interactions: any[] = [];
  clubStatus: any = null;
  reminders: any[] = [];
  isLoadingCrm = false;

  // CRM forms
  showInteractionForm = false;
  newInteractionType = 'NOTE';
  newInteractionContent = '';
  isSavingInteraction = false;

  showReminderForm = false;
  newReminderTitle = '';
  newReminderDescription = '';
  newReminderDueDate = '';
  isSavingReminder = false;

  showStatusModal = false;
  selectedStatus = '';
  statusReason = '';
  isSavingStatus = false;

  // Sessions
  sessions: any[] = [];
  isLoadingSessions = false;
  expandedSessionId: number | null = null;
  sessionDetail: any = null;
  isLoadingSessionDetail = false;
  sessionDateFrom = '';
  sessionDateTo = '';

  // Suscripciones
  appPlan: any = null;
  videoPlan: any = null;
  availableVideoPlans: any[] = [];
  isLoadingSubs = false;

  // Estado del modal de edición de plan app
  showAppPlanModal = false;
  selectedAppPlanType = 'gratuito';
  selectedAppPlanPeriod = 'monthly';
  selectedAppPlanPlayerCount = 0;
  isSavingAppPlan = false;

  // Estado del modal de edición de plan vídeo
  showVideoPlanModal = false;
  selectedVideoPlanKey = 'STARTER_1TB';
  isSavingVideoPlan = false;

  readonly appPlanOptions = [
    { value: 'gratuito', label: 'Plan Gratuito', icon: 'bi-gift', color: '#6c757d' },
    { value: 'familia',  label: 'Plan Familia',  icon: 'bi-people', color: '#0d6efd' },
    { value: 'club',     label: 'Plan Club',     icon: 'bi-shield-check', color: '#198754' },
  ];

  readonly videoPlanOptions = [
    { value: 'STARTER_1TB', label: 'Starter 1 TB',  price: '29€/mes',  icon: 'bi-camera-video' },
    { value: 'PRO_5TB',     label: 'Pro 5 TB',       price: '79€/mes',  icon: 'bi-camera-video-fill' },
    { value: 'ELITE_10TB',  label: 'Elite 10 TB',    price: '149€/mes', icon: 'bi-collection-play-fill' },
  ];

  // Feedback
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';
  showToast = false;

  statusOptions = [
    { value: 'LEAD', label: 'Lead', color: 'bg-info' },
    { value: 'ACTIVE', label: 'Activo', color: 'bg-success' },
    { value: 'AT_RISK', label: 'En Riesgo', color: 'bg-warning' },
    { value: 'CHURNED', label: 'Baja', color: 'bg-danger' }
  ];

  interactionTypes = [
    { value: 'CALL', label: 'Llamada', icon: 'bi-telephone' },
    { value: 'EMAIL', label: 'Email', icon: 'bi-envelope' },
    { value: 'MEETING', label: 'Reunion', icon: 'bi-camera-video' },
    { value: 'NOTE', label: 'Nota', icon: 'bi-sticky' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private teamService: TeamService,
    private crmService: CrmService,
    private trackingService: TrackingService,
    private clubSubscriptionService: ClubSubscriptionService,
    private videoStorageService: VideoStorageService
  ) { }

  ngOnInit(): void {
    this.clubId = Number(this.route.snapshot.paramMap.get('clubId'));
    this.loadClubDetail();
  }

  goBack(): void {
    this.location.back();
  }

  get equiposPorTemporada(): { temporada: string, equipos: any[] }[] {
    if (!this.club?.equipos || this.club.equipos.length === 0) return [];
    const grouped: { [key: string]: any[] } = {};
    for (const team of this.club.equipos) {
      const temp = team.temporada || 'Sin temporada';
      if (!grouped[temp]) grouped[temp] = [];
      grouped[temp].push(team);
    }
    return Object.keys(grouped)
      .sort((a, b) => b.localeCompare(a))
      .map(temp => ({ temporada: temp, equipos: grouped[temp] }));
  }

  setTab(tab: 'info' | 'equipos' | 'entrenadores' | 'crm' | 'sesiones' | 'suscripcion'): void {
    this.activeTab = tab;
    if (tab === 'crm') this.loadCrmData();
    if (tab === 'sesiones') this.loadSessions();
    if (tab === 'suscripcion') this.loadSubscriptions();
  }

  loadClubDetail(): void {
    this.isLoading = true;
    this.teamService.getClubDetailAdmin(this.clubId).subscribe({
      next: (response: Response) => {
        if (response?.data) {
          this.club = response.data;
        }
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('[CRM] Error loading club detail:', err);
        this.isLoading = false;
      }
    });
  }

  loadCrmData(): void {
    this.isLoadingCrm = true;

    this.crmService.getInteractions(this.clubId).subscribe({
      next: (res: Response) => {
        this.interactions = res?.data || [];
        this.isLoadingCrm = false;
      },
      error: (err: any) => {
        console.error('[CRM] Error loading interactions:', err);
        this.interactions = [];
        this.isLoadingCrm = false;
      }
    });

    this.crmService.getClubStatus(this.clubId).subscribe({
      next: (res: Response) => { this.clubStatus = res?.data || null; },
      error: (err: any) => {
        console.error('[CRM] Error loading status:', err);
        this.clubStatus = null;
      }
    });

    this.crmService.getReminders(this.clubId).subscribe({
      next: (res: Response) => { this.reminders = res?.data || []; },
      error: (err: any) => {
        console.error('[CRM] Error loading reminders:', err);
        this.reminders = [];
      }
    });
  }

  // Interactions
  getInteractionIcon(type: string): string {
    return this.interactionTypes.find(t => t.value === type)?.icon || 'bi-sticky';
  }

  getInteractionLabel(type: string): string {
    return this.interactionTypes.find(t => t.value === type)?.label || type;
  }

  toggleInteractionForm(): void {
    this.showInteractionForm = !this.showInteractionForm;
    if (!this.showInteractionForm) {
      this.newInteractionContent = '';
      this.newInteractionType = 'NOTE';
    }
  }

  saveInteraction(): void {
    if (!this.newInteractionContent.trim()) return;
    this.isSavingInteraction = true;
    const userId = Number(localStorage.getItem('userId')) || 9;
    this.crmService.createInteraction(userId, {
      clubId: this.clubId,
      type: this.newInteractionType,
      content: this.newInteractionContent
    }).subscribe({
      next: (res: Response) => {
        this.isSavingInteraction = false;
        if (res?.data) {
          this.interactions.unshift(res.data);
        }
        this.toggleInteractionForm();
        this.showNotification('Interaccion guardada correctamente', 'success');
      },
      error: (err: any) => {
        this.isSavingInteraction = false;
        console.error('[CRM] Error saving interaction:', err);
        this.showNotification('Error al guardar la interaccion', 'error');
      }
    });
  }

  // Status
  getStatusBadge(status: string): string {
    return this.statusOptions.find(s => s.value === status)?.color || 'bg-secondary';
  }

  getStatusLabel(status: string): string {
    return this.statusOptions.find(s => s.value === status)?.label || status;
  }

  openStatusModal(): void {
    this.selectedStatus = this.clubStatus?.status || 'ACTIVE';
    this.statusReason = '';
    this.showStatusModal = true;
  }

  closeStatusModal(): void {
    this.showStatusModal = false;
  }

  saveStatus(): void {
    this.isSavingStatus = true;
    this.crmService.updateClubStatus(this.clubId, this.selectedStatus, this.statusReason).subscribe({
      next: (res: Response) => {
        this.isSavingStatus = false;
        this.clubStatus = res?.data || null;
        this.closeStatusModal();
        this.showNotification('Estado actualizado correctamente', 'success');
      },
      error: (err: any) => {
        this.isSavingStatus = false;
        console.error('[CRM] Error saving status:', err);
        this.showNotification('Error al actualizar el estado', 'error');
      }
    });
  }

  // Reminders
  toggleReminderForm(): void {
    this.showReminderForm = !this.showReminderForm;
    if (!this.showReminderForm) {
      this.newReminderTitle = '';
      this.newReminderDescription = '';
      this.newReminderDueDate = '';
    }
  }

  saveReminder(): void {
    if (!this.newReminderTitle.trim() || !this.newReminderDueDate) return;
    this.isSavingReminder = true;
    const userId = Number(localStorage.getItem('userId')) || 9;
    this.crmService.createReminder(userId, {
      clubId: this.clubId,
      title: this.newReminderTitle,
      description: this.newReminderDescription,
      dueDate: this.newReminderDueDate
    }).subscribe({
      next: (res: Response) => {
        this.isSavingReminder = false;
        if (res?.data) {
          this.reminders.push(res.data);
          this.reminders.sort((a: any, b: any) =>
            new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
          );
        }
        this.toggleReminderForm();
        this.showNotification('Recordatorio guardado correctamente', 'success');
      },
      error: (err: any) => {
        this.isSavingReminder = false;
        console.error('[CRM] Error saving reminder:', err);
        this.showNotification('Error al guardar el recordatorio', 'error');
      }
    });
  }

  completeReminder(reminder: any): void {
    this.crmService.completeReminder(reminder.id).subscribe({
      next: () => {
        reminder.completed = 1;
        this.showNotification('Recordatorio completado', 'success');
      },
      error: (err: any) => {
        console.error('[CRM] Error completing reminder:', err);
        this.showNotification('Error al completar el recordatorio', 'error');
      }
    });
  }

  isOverdue(dueDate: string): boolean {
    return new Date(dueDate) < new Date() && !this.isToday(dueDate);
  }

  isToday(dueDate: string): boolean {
    const today = new Date();
    const due = new Date(dueDate);
    return due.toDateString() === today.toDateString();
  }

  goToClubDashboard(): void {
    if (this.club) {
      localStorage.setItem('userId', this.club.userId.toString());
      localStorage.setItem('clubId', this.club.clubId.toString());
      this.router.navigate(['/dashboard/admin-inicio', this.club.clubId, this.club.userId]);
    }
  }

  // Sessions
  loadSessions(): void {
    this.isLoadingSessions = true;
    this.trackingService.getSessionsByClub(this.clubId).subscribe({
      next: (res: Response) => {
        this.sessions = res?.data || [];
        this.isLoadingSessions = false;
      },
      error: (err: any) => {
        console.error('[Sessions] Error loading sessions:', err);
        this.sessions = [];
        this.isLoadingSessions = false;
      }
    });
  }

  toggleSessionDetail(sessionId: number): void {
    if (this.expandedSessionId === sessionId) {
      this.expandedSessionId = null;
      this.sessionDetail = null;
      return;
    }
    this.expandedSessionId = sessionId;
    this.isLoadingSessionDetail = true;
    this.trackingService.getSessionDetail(sessionId).subscribe({
      next: (res: Response) => {
        this.sessionDetail = res?.data || null;
        if (this.sessionDetail?.eventsJson) {
          try {
            this.sessionDetail.eventsParsed = JSON.parse(this.sessionDetail.eventsJson);
          } catch (e) {
            this.sessionDetail.eventsParsed = [];
          }
        }
        this.isLoadingSessionDetail = false;
      },
      error: (err: any) => {
        console.error('[Sessions] Error loading session detail:', err);
        this.sessionDetail = null;
        this.isLoadingSessionDetail = false;
      }
    });
  }

  getProfileLabel(profileType: number): string {
    const profiles: {[key: number]: string} = {
      1: 'Club', 2: 'Entrenador', 3: 'Jugador', 4: 'Padre/Madre'
    };
    return profiles[profileType] || 'Perfil #' + profileType;
  }

  getEventIcon(action: string): string {
    const icons: {[key: string]: string} = {
      'NAV': 'bi-arrow-right-circle',
      'CLK': 'bi-cursor',
      'FRM': 'bi-ui-checks',
      'ERR': 'bi-exclamation-triangle'
    };
    return icons[action] || 'bi-circle';
  }

  getEventLabel(action: string): string {
    const labels: {[key: string]: string} = {
      'NAV': 'Navegacion',
      'CLK': 'Click',
      'FRM': 'Formulario',
      'ERR': 'Error'
    };
    return labels[action] || action;
  }

  getEventColor(action: string): string {
    const colors: {[key: string]: string} = {
      'NAV': 'text-primary',
      'CLK': 'text-success',
      'FRM': 'text-info',
      'ERR': 'text-danger'
    };
    return colors[action] || 'text-secondary';
  }

  formatDuration(seconds: number | null): string {
    if (!seconds) return '-';
    if (seconds < 60) return seconds + 's';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return mins + 'm ' + secs + 's';
    const hrs = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return hrs + 'h ' + remainMins + 'm';
  }

  // ── Suscripciones ──────────────────────────────────────────────────────────

  loadSubscriptions(): void {
    this.isLoadingSubs = true;
    forkJoin({
      app: this.clubSubscriptionService.getCurrentSubscription(this.clubId),
      video: this.videoStorageService.getPlan(this.clubId)
    }).subscribe({
      next: ({ app, video }) => {
        this.appPlan = app || null;
        // getPlan devuelve Response completo: { status, data: { hasPlan, planKey, ... }, error }
        const videoData = video?.data ?? video;
        if (videoData?.hasPlan) {
          this.videoPlan = videoData;
        } else {
          this.videoPlan = null;
        }
        this.availableVideoPlans = videoData?.plans || [];
        this.isLoadingSubs = false;
      },
      error: () => { this.isLoadingSubs = false; }
    });
  }

  // ── App Plan ──────────────────────────────────────────────────────────────

  openAppPlanModal(): void {
    this.selectedAppPlanType   = this.appPlan?.planType   || 'gratuito';
    this.selectedAppPlanPeriod = this.appPlan?.period     || 'monthly';
    this.selectedAppPlanPlayerCount = this.appPlan?.playerCount || 0;
    this.showAppPlanModal = true;
  }

  saveAppPlan(): void {
    this.isSavingAppPlan = true;
    this.clubSubscriptionService.adminSetPlan(
      this.clubId,
      this.selectedAppPlanType,
      this.selectedAppPlanPeriod,
      this.selectedAppPlanPlayerCount
    ).subscribe({
      next: () => {
        this.isSavingAppPlan = false;
        this.showAppPlanModal = false;
        this.loadSubscriptions();
        this.showNotification('Plan de la app actualizado correctamente', 'success');
      },
      error: (err: any) => {
        this.isSavingAppPlan = false;
        console.error('[Subs] Error guardando plan app:', err);
        this.showNotification('Error al actualizar el plan: ' + (err?.error?.message || err?.status || ''), 'error');
      }
    });
  }

  cancelAppPlan(): void {
    if (!confirm('¿Seguro que quieres cancelar el plan activo de este club?')) return;
    this.clubSubscriptionService.adminCancelPlan(this.clubId).subscribe({
      next: () => {
        this.loadSubscriptions();
        this.showNotification('Plan cancelado correctamente', 'success');
      },
      error: () => this.showNotification('Error al cancelar el plan', 'error')
    });
  }

  // ── Video Plan ────────────────────────────────────────────────────────────

  openVideoPlanModal(): void {
    this.selectedVideoPlanKey = this.videoPlan?.planKey || 'STARTER_1TB';
    this.showVideoPlanModal = true;
  }

  saveVideoPlan(): void {
    this.isSavingVideoPlan = true;
    this.videoStorageService.setVideoPlanAdmin(this.clubId, this.selectedVideoPlanKey).subscribe({
      next: () => {
        this.isSavingVideoPlan = false;
        this.showVideoPlanModal = false;
        this.loadSubscriptions();
        this.showNotification('Plan de vídeo actualizado correctamente', 'success');
      },
      error: (err: any) => {
        this.isSavingVideoPlan = false;
        console.error('[Subs] Error guardando plan vídeo:', err);
        this.showNotification('Error al actualizar el plan de vídeo: ' + (err?.error?.message || err?.status || ''), 'error');
      }
    });
  }

  cancelVideoPlan(): void {
    if (!confirm('¿Seguro que quieres cancelar el plan de vídeo de este club?')) return;
    this.videoStorageService.cancelVideoPlanAdmin(this.clubId).subscribe({
      next: () => {
        this.loadSubscriptions();
        this.showNotification('Plan de vídeo cancelado correctamente', 'success');
      },
      error: () => this.showNotification('Error al cancelar el plan de vídeo', 'error')
    });
  }

  getAppPlanLabel(type: string): string {
    return this.appPlanOptions.find(p => p.value === type)?.label || type;
  }

  getAppPlanIcon(type: string): string {
    return this.appPlanOptions.find(p => p.value === type)?.icon || 'bi-box';
  }

  getAppPlanColor(type: string): string {
    return this.appPlanOptions.find(p => p.value === type)?.color || '#6c757d';
  }

  getVideoPlanLabel(key: string): string {
    return this.videoPlanOptions.find(p => p.value === key)?.label || key;
  }

  // ──────────────────────────────────────────────────────────────────────────

  showNotification(message: string, type: 'success' | 'error'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => { this.showToast = false; }, 3500);
  }
}
