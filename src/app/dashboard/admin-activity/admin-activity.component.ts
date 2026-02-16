import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { CrmService } from 'src/app/core/services/crm/crm.service';

@Component({
  selector: 'app-admin-activity',
  templateUrl: './admin-activity.component.html',
  styleUrls: ['./admin-activity.component.scss']
})
export class AdminActivityComponent implements OnInit {

  activities: any[] = [];
  isLoading = false;
  isRefreshing = false;
  lastUpdated: Date | null = null;

  currentPage = 0;
  totalPages = 0;
  totalItems = 0;
  pageSize = 100;

  searchTerm = '';
  filterType = 'all';

  currentYear = new Date().getFullYear();

  actionTypes: string[] = [];

  constructor(
    private crmService: CrmService,
    private router: Router,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.loadPage(0);
  }

  goBack(): void {
    this.location.back();
  }

  loadPage(page: number, forceRefresh = false): void {
    this.isLoading = true;
    this.crmService.getClubActivityPaginated(page, this.pageSize, forceRefresh).subscribe({
      next: (res: any) => {
        const data = res?.data;
        if (data) {
          this.activities = data.items || [];
          this.currentPage = data.currentPage ?? 0;
          this.totalPages = data.totalPages ?? 0;
          this.totalItems = data.totalItems ?? 0;
          this.pageSize = data.pageSize ?? 100;
          this.extractActionTypes();
        }
        this.isLoading = false;
        this.lastUpdated = new Date();
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  refreshData(): void {
    this.isRefreshing = true;
    this.crmService.clearActivityCache();
    this.crmService.getClubActivityPaginated(this.currentPage, this.pageSize, true).subscribe({
      next: (res: any) => {
        const data = res?.data;
        if (data) {
          this.activities = data.items || [];
          this.currentPage = data.currentPage ?? 0;
          this.totalPages = data.totalPages ?? 0;
          this.totalItems = data.totalItems ?? 0;
          this.extractActionTypes();
        }
        this.isRefreshing = false;
        this.lastUpdated = new Date();
      },
      error: () => {
        this.isRefreshing = false;
      }
    });
  }

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages) return;
    this.loadPage(page);
  }

  get filteredActivities(): any[] {
    return this.activities.filter(a => {
      const matchSearch = !this.searchTerm ||
        (a.clubName || '').toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (a.description || '').toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchType = this.filterType === 'all' || a.actionType === this.filterType;
      return matchSearch && matchType;
    });
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const start = Math.max(0, this.currentPage - 2);
    const end = Math.min(this.totalPages - 1, this.currentPage + 2);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
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
      case 'VIEW': return 'bi-eye';
      case 'EXPORT': return 'bi-download';
      default: return 'bi-activity';
    }
  }

  getActivityLabel(type: string): string {
    switch (type) {
      case 'LOGIN': return 'Inicio de sesion';
      case 'CREATE_TEAM': return 'Crear equipo';
      case 'CREATE_PLAYER': return 'Crear jugador';
      case 'CREATE_MATCH': return 'Crear partido';
      case 'CREATE_TRAINING': return 'Crear entrenamiento';
      case 'UPDATE': return 'Actualizar';
      case 'DELETE': return 'Eliminar';
      case 'CALL': return 'Llamada';
      case 'EMAIL': return 'Email';
      case 'MEETING': return 'Reunion';
      case 'VIEW': return 'Visualizar';
      case 'EXPORT': return 'Exportar';
      default: return type || 'Otro';
    }
  }

  getActivityBadgeClass(type: string): string {
    switch (type) {
      case 'LOGIN': return 'badge-login';
      case 'CREATE_TEAM':
      case 'CREATE_PLAYER':
      case 'CREATE_MATCH':
      case 'CREATE_TRAINING': return 'badge-create';
      case 'UPDATE': return 'badge-update';
      case 'DELETE': return 'badge-delete';
      default: return 'badge-other';
    }
  }

  goToClub(clubId: number): void {
    this.router.navigate(['/dashboard/admin-club-detail', clubId]);
  }

  private extractActionTypes(): void {
    const types = new Set<string>();
    this.activities.forEach(a => { if (a.actionType) types.add(a.actionType); });
    this.actionTypes = Array.from(types).sort();
  }
}
