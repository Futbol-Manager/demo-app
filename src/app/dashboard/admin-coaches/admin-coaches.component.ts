import { Component, OnInit } from '@angular/core';
import { CoachSubscriptionService } from 'src/app/core/services/stripe/coach-subscription.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-admin-coaches',
  templateUrl: './admin-coaches.component.html',
  styleUrls: ['./admin-coaches.component.scss']
})
export class AdminCoachesComponent implements OnInit {

  coaches: any[] = [];
  filteredCoaches: any[] = [];
  isLoading = true;

  searchTerm = '';
  filterStatus: 'ALL' | 'ACTIVE' | 'NONE' | 'EXPIRED' = 'ALL';
  filterType: 'ALL' | 'club' | 'standalone' = 'ALL';
  filterProfile: 'ALL' | '2' | '6' | '7' = 'ALL';

  // KPIs
  kpis = { total: 0, active: 0, standalone: 0, withClub: 0, totalRevenue: 0 };

  // Detail modal
  selectedCoach: any = null;
  modalOpen = false;
  invoices: any[] = [];
  invoiceSummary: any = null;
  loadingInvoices = false;

  constructor(
    private coachSubscriptionService: CoachSubscriptionService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadCoaches();
  }

  loadCoaches(): void {
    this.isLoading = true;
    this.coachSubscriptionService.getAdminCoaches().subscribe({
      next: (res: any) => {
        this.coaches = res?.data ?? [];
        this.calculateKPIs();
        this.applyFilter();
        this.isLoading = false;
      },
      error: () => {
        this.toastr.error('Error al cargar los entrenadores');
        this.isLoading = false;
      }
    });
  }

  calculateKPIs(): void {
    this.kpis.total     = this.coaches.length;
    this.kpis.active    = this.coaches.filter(c => c.subscriptionStatus === 'ACTIVE').length;
    this.kpis.standalone = this.coaches.filter(c => !c.belongsToClub).length;
    this.kpis.withClub  = this.coaches.filter(c => c.belongsToClub).length;
  }

  applyFilter(): void {
    this.filteredCoaches = this.coaches.filter(c => {
      const matchSearch = !this.searchTerm ||
        `${c.firstName} ${c.secondName} ${c.mail}`.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchStatus = this.filterStatus === 'ALL' || c.subscriptionStatus === this.filterStatus;
      const matchType   = this.filterType === 'ALL' ||
        (this.filterType === 'club' && c.belongsToClub) ||
        (this.filterType === 'standalone' && !c.belongsToClub);
      const matchProfile = this.filterProfile === 'ALL' || String(c.profileId) === this.filterProfile;
      return matchSearch && matchStatus && matchType && matchProfile;
    });
  }

  openDetail(coach: any): void {
    this.selectedCoach = coach;
    this.modalOpen = true;
    this.invoices = [];
    this.invoiceSummary = null;

    if (!coach.belongsToClub && coach.stripeCustomerId) {
      this.loadingInvoices = true;
      this.coachSubscriptionService.getCoachInvoices(coach.userId).subscribe({
        next: (res: any) => {
          const data = res?.data;
          this.invoices = data?.invoices ?? [];
          this.invoiceSummary = {
            totalPaid: data?.totalPaid ?? 0,
            currency: data?.currency ?? 'eur'
          };
          this.loadingInvoices = false;
        },
        error: () => { this.loadingInvoices = false; }
      });
    }
  }

  closeDetail(): void {
    this.modalOpen = false;
    this.selectedCoach = null;
    this.invoices = [];
    this.invoiceSummary = null;
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'ACTIVE':  return 'Activa';
      case 'EXPIRED': return 'Vencida';
      case 'TRIAL':   return 'Prueba';
      default:        return 'Sin suscripción';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'ACTIVE':  return 'badge-active';
      case 'EXPIRED': return 'badge-expired';
      case 'TRIAL':   return 'badge-trial';
      default:        return 'badge-none';
    }
  }

  getProfileLabel(profileId: number): string {
    switch (profileId) {
      case 2:  return 'Entrenador';
      case 6:  return 'Fisioterapeuta';
      case 7:  return 'Nutricionista';
      default: return 'Staff';
    }
  }

  getProfileClass(profileId: number): string {
    switch (profileId) {
      case 2:  return 'profile-coach';
      case 6:  return 'profile-fisio';
      case 7:  return 'profile-nutri';
      default: return '';
    }
  }

  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency', currency: (currency || 'EUR').toUpperCase()
    }).format(amount);
  }

  formatDate(timestamp: number | null): string {
    if (!timestamp) return '—';
    return new Date(timestamp * 1000).toLocaleDateString('es-ES');
  }
}
