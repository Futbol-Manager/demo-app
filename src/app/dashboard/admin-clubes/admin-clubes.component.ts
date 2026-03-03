import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TeamService } from 'src/app/core/services/team/team.service';
import { CrmService } from 'src/app/core/services/crm/crm.service';
import { ProspectService } from 'src/app/core/services/prospect/prospect.service';
import { Response } from 'src/app/core/services/models/response.model';
import { Location } from '@angular/common';
import { getCurrentSeasonString } from 'src/app/core/utils/season.utils';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-admin-clubes',
  templateUrl: './admin-clubes.component.html',
  styleUrls: ['./admin-clubes.component.scss']
})
export class AdminClubesComponent implements OnInit {

  imageBaseUrl: string = environment.images + 'user/';
  clubList: any[] = [];
  searchTerm: string = '';
  filterSuscripcion: string = 'all';
  temporada = getCurrentSeasonString();

  kpis = {
    totalClubes: 0,
    totalEquipos: 0,
    totalJugadores: 0,
    totalEntrenadores: 0,
    totalPadres: 0,
    suscripcionesActivas: 0
  };

  isRefreshing = false;
  lastUpdated: Date | null = null;

  clubDetalleSus: any = null;
  susDetalleClub: any = null;
  isLoadingDetalleSus = false;
  modalDetalleSuscripcion = false;

  pendingReminders: any[] = [];
  recentInteractions: any[] = [];
  atRiskClubs: any[] = [];
  isLoadingRisk = false;

  modalDeleteClub = false;
  clubToDelete: any = null;
  isDeletingClub = false;

  currentYear = new Date().getFullYear();

  // Club Plans
  clubPlans: any[] = [];
  planKpis = {
    totalActiveClubs: 0,
    familiaCount: 0,
    clubCount: 0,
    gratuitoCount: 0,
    totalRevenueCents: 0,
  };
  filterPlanType: string = 'all';
  showPlansSection = false;

  modalEditField = false;
  editType: 'teams' | 'players' | 'renew' | null = null;
  editTitle = '';
  editNumberValue: number = 0;
  editDateValue: string = '';
  option = 0;

  // Clientes prospectados
  showProspectedClients = false;
  prospectedClients: any[] = [];
  prospectedClientsTotal = 0;
  isLoadingClients = false;
  clientsSearch = '';
  clientsPage = 0;
  selectedClient: any = null;
  showClientDetailModal = false;

  constructor(
    private teamService: TeamService,
    private crmService: CrmService,
    private prospectService: ProspectService,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location
  ) { }

  ngOnInit(): void {
    this.cargarListadoClubes();
    this.cargarKPIs();
    this.cargarCrmResumen();
    this.cargarClubPlans();
    this.cargarClientesProspectados();
  }

  readonly clientsPageSize = 20;

  cargarClientesProspectados(): void {
    this.isLoadingClients = true;
    this.prospectService.getClients(this.clientsSearch, this.clientsPage, this.clientsPageSize).subscribe({
      next: (res) => {
        this.prospectedClients = res.items || [];
        this.prospectedClientsTotal = res.total || 0;
        this.isLoadingClients = false;
      },
      error: () => { this.isLoadingClients = false; }
    });
  }

  get clientsTotalPages(): number {
    return Math.ceil(this.prospectedClientsTotal / this.clientsPageSize);
  }

  clientsNextPage(): void {
    if (this.clientsPage < this.clientsTotalPages - 1) {
      this.clientsPage++;
      this.cargarClientesProspectados();
    }
  }

  clientsPrevPage(): void {
    if (this.clientsPage > 0) {
      this.clientsPage--;
      this.cargarClientesProspectados();
    }
  }

  onClientsSearchChange(): void {
    this.clientsPage = 0;
    this.cargarClientesProspectados();
  }

  openClientDetail(client: any): void {
    this.selectedClient = client;
    this.showClientDetailModal = true;
  }

  goToProspector(prospectId?: number): void {
    if (prospectId) {
      this.router.navigate(['/dashboard/admin-prospector'], { queryParams: { prospectId } });
    } else {
      this.router.navigate(['/dashboard/admin-prospector']);
    }
  }

  goBack(): void {
    this.location.back();
  }

  get filteredClubs() {
    return this.clubList.filter(club => {
      const matchName = club.nombre.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchSub = this.filterSuscripcion === 'all'
        || (this.filterSuscripcion === 'active' && club.suscripcionActiva)
        || (this.filterSuscripcion === 'inactive' && !club.suscripcionActiva);
      return matchName && matchSub;
    });
  }

  cargarListadoClubes(): void {
    localStorage.setItem('temporada', this.temporada);
    this.teamService.getClubesAdmin(this.temporada).subscribe(
      (response: Response) => {
        if (response?.data) {
          this.clubList = response.data;
          this.lastUpdated = new Date();
          this.enrichRemindersWithClubName();
        }
      }
    );
  }

  cargarKPIs(): void {
    this.teamService.getAdminKPIs().subscribe(
      (response: Response) => {
        if (response?.data) {
          this.kpis = response.data;
          this.lastUpdated = new Date();
        }
      }
    );
  }

  cargarClubPlans(): void {
    this.http.get<any>(`${environment.apiUrl}club-plan/admin/all`).subscribe({
      next: (res) => {
        if (res?.data) {
          this.planKpis = {
            totalActiveClubs: res.data.totalActiveClubs || 0,
            familiaCount: res.data.familiaCount || 0,
            clubCount: res.data.clubCount || 0,
            gratuitoCount: res.data.gratuitoCount || 0,
            totalRevenueCents: res.data.totalRevenueCents || 0,
          };
          this.clubPlans = res.data.plans || [];
        }
      },
      error: () => {}
    });
  }

  get filteredPlans(): any[] {
    return this.clubPlans.filter(plan => {
      if (this.filterPlanType === 'all') return true;
      return plan.planType === this.filterPlanType;
    });
  }

  getPlanLabel(planType: string): string {
    switch (planType) {
      case 'familia': return 'Plan Familia';
      case 'club': return 'Plan Club';
      case 'gratuito': return 'Plan Gratuito';
      default: return 'Sin plan';
    }
  }

  getPlanBadgeClass(planType: string): string {
    switch (planType) {
      case 'familia': return 'badge-familia';
      case 'club': return 'badge-club';
      case 'gratuito': return 'badge-gratuito';
      default: return 'badge-none';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'active': return 'Activo';
      case 'cancelled': return 'Cancelado';
      case 'expired': return 'Expirado';
      case 'replaced': return 'Reemplazado';
      default: return status;
    }
  }

  togglePlansSection(): void {
    this.showPlansSection = !this.showPlansSection;
  }

  refreshData(): void {
    this.isRefreshing = true;
    this.teamService.refreshAdminCache().subscribe({
      next: () => {
        let done = 0;
        const checkDone = () => { done++; if (done >= 2) { this.isRefreshing = false; this.lastUpdated = new Date(); } };
        this.teamService.getClubesAdmin(this.temporada).subscribe({
          next: (r: Response) => { if (r?.data) this.clubList = r.data; checkDone(); },
          error: () => checkDone()
        });
        this.teamService.getAdminKPIs().subscribe({
          next: (r: Response) => { if (r?.data) this.kpis = r.data; checkDone(); },
          error: () => checkDone()
        });
        this.cargarCrmResumen();
      },
      error: () => {
        this.isRefreshing = false;
      }
    });
  }

  goToClub(userId: number, clubId: number): void {
    localStorage.setItem('userId', userId.toString());
    localStorage.setItem('clubId', clubId.toString());
    this.router.navigate(['/dashboard/admin-inicio', clubId, userId]);
  }

  goToClubDetail(clubId: number): void {
    this.router.navigate(['/dashboard/admin-club-detail', clubId]);
  }

  goToClubCrm(clubId: number): void {
    this.router.navigate(['/dashboard/admin-club-detail', clubId]);
  }

  getActivityIcon(type: string): string {
    switch (type) {
      case 'LOGIN': return 'bi-box-arrow-in-right';
      case 'CREATE_TEAM': return 'bi-people-fill';
      case 'CREATE_PLAYER': return 'bi-person-plus';
      case 'CREATE_MATCH': return 'bi-trophy';
      case 'CREATE_TRAINING': return 'bi-clipboard2-check';
      case 'UPDATE': return 'bi-pencil-square';
      case 'DELETE': return 'bi-trash';
      case 'CALL': return 'bi-telephone';
      case 'EMAIL': return 'bi-envelope';
      case 'MEETING': return 'bi-camera-video';
      default: return 'bi-activity';
    }
  }

  cargarCrmResumen(): void {
    const userId = Number(localStorage.getItem('userId')) || 9;
    this.crmService.getPendingReminders(userId).subscribe({
      next: (res: any) => {
        this.pendingReminders = (res?.data || []).filter((r: any) => r.completed !== 1).slice(0, 5);
        this.enrichRemindersWithClubName();
      },
      error: () => {}
    });
    this.crmService.getRecentClubActivity().subscribe({
      next: (res: any) => { this.recentInteractions = (res?.data || []).slice(0, 8); },
      error: () => {}
    });
  }

  enrichRemindersWithClubName(): void {
    if (!this.pendingReminders.length || !this.clubList.length) return;
    for (const r of this.pendingReminders) {
      if (!r.clubName) {
        const club = this.clubList.find((c: any) => c.clubId === r.clubId);
        r.clubName = club ? club.nombre : 'Club #' + r.clubId;
      }
    }
  }

  scanRiskClubs(): void {
    this.isLoadingRisk = true;
    this.atRiskClubs = [];
    this.crmService.getAtRiskClubsAI().subscribe({
      next: (res: any) => { this.atRiskClubs = res?.data || []; this.isLoadingRisk = false; },
      error: () => { this.isLoadingRisk = false; }
    });
  }

  completeReminderFromList(reminder: any, event: Event): void {
    event.stopPropagation();
    this.crmService.completeReminder(reminder.id).subscribe({
      next: () => {
        this.pendingReminders = this.pendingReminders.filter((r: any) => r.id !== reminder.id);
      },
      error: () => {}
    });
  }

  // Suscripcion modal
  abrirModalDetalleSuscripcion() {
    this.modalDetalleSuscripcion = true;
  }

  cerrarModalDetalleSuscripcion() {
    this.modalDetalleSuscripcion = false;
  }

  verDetalleSuscripcion(club: any) {
    this.clubDetalleSus = club;
    this.susDetalleClub = null;
    this.isLoadingDetalleSus = true;

    this.teamService.getSubscriptionByPlayerId(0, club.id).subscribe({
      next: (response: any) => {
        this.susDetalleClub = response?.data ?? null;
        this.isLoadingDetalleSus = false;
        this.abrirModalDetalleSuscripcion();
      },
      error: (err: any) => {
        console.error(err);
        this.isLoadingDetalleSus = false;
        this.susDetalleClub = null;
      }
    });
  }

  // Edit modal
  openEditModal(type: 'teams' | 'players' | 'renew', currentValue: any) {
    this.editType = type;

    if (type === 'teams') {
      this.editTitle = 'Editar n\u00ba equipos';
      this.editNumberValue = Number(currentValue ?? 0);
    }
    if (type === 'players') {
      this.editTitle = 'Editar n\u00ba jugadores';
      this.editNumberValue = Number(currentValue ?? 0);
    }
    if (type === 'renew') {
      this.editTitle = 'Editar proxima renovacion';
      this.editDateValue = (currentValue ?? '').toString();
    }
    this.modalEditField = true;
  }

  closeEditModal() {
    this.modalEditField = false;
    this.editType = null;
    this.editTitle = '';
  }

  saveEditField() {
    if (!this.editType) return;

    if (this.editType === 'teams' && this.susDetalleClub) {
      this.susDetalleClub.numeroEquipos = Number(this.editNumberValue ?? 0);
      this.option = 1;
    }
    if (this.editType === 'players' && this.clubDetalleSus) {
      this.clubDetalleSus.jugadores = Number(this.editNumberValue ?? 0);
      this.option = 2;
    }
    if (this.editType === 'renew' && this.susDetalleClub) {
      this.susDetalleClub.dateFinal = this.editDateValue;
      this.option = 3;
    }
    this.changeSusClubAdmin();
  }

  confirmReactivarSubscription() {
    this.option = 5;
    this.changeSusClubAdmin();
  }

  confirmCancelarSuscripcion() {
    this.option = 4;
    this.changeSusClubAdmin();
  }

  changeSusClubAdmin() {
    const body = {
      id: this.susDetalleClub.suscripcionId,
      equipos: this.susDetalleClub.numeroEquipos,
      jugadores: this.clubDetalleSus.jugadores,
      fecha: this.susDetalleClub.dateFinal
    };

    this.teamService.changeSusClubAdmin(body, this.option).subscribe({
      next: (response: any) => {
        if (this.option > 3) {
          this.cerrarModalDetalleSuscripcion();
        } else {
          this.closeEditModal();
        }
      },
      error: (err: any) => {
        console.error(err);
      }
    });
  }

  // Delete club
  confirmarEliminarClub(club: any): void {
    this.clubToDelete = club;
    this.modalDeleteClub = true;
  }

  cancelarEliminarClub(): void {
    this.modalDeleteClub = false;
    this.clubToDelete = null;
  }

  ejecutarEliminarClub(): void {
    if (!this.clubToDelete) return;
    this.isDeletingClub = true;
    this.teamService.softDeleteClub(this.clubToDelete.clubId).subscribe({
      next: () => {
        this.clubList = this.clubList.filter(c => c.clubId !== this.clubToDelete.clubId);
        this.isDeletingClub = false;
        this.modalDeleteClub = false;
        this.clubToDelete = null;
        this.cargarKPIs();
      },
      error: (err: any) => {
        console.error(err);
        this.isDeletingClub = false;
      }
    });
  }
}
