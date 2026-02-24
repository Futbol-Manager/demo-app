import { Component, OnInit } from '@angular/core';
import { filter, take } from 'rxjs/operators';
import { ErpService } from '../../../core/services/erp/erp.service';
import { LoginService } from '../../../core/services/login/login.service';
import { TeamService } from '../../../core/services/team/team.service';
import { ErpDashboardKpis, ErpFiscalYear, ErpIncomeByCCReport, ErpIncomeByCCRow } from '../models/erp.models';

@Component({
  selector: 'app-erp-dashboard',
  templateUrl: './erp-dashboard.component.html',
  styleUrls: ['./erp-dashboard.component.scss']
})
export class ErpDashboardComponent implements OnInit {

  clubId = 0;
  kpis: ErpDashboardKpis | null = null;
  incomeByCc: ErpIncomeByCCReport | null = null;
  loadingIncomeByCc = false;
  showIncomeByCcDetail = false;
  loading = true;
  erpInitialized = false;
  errorMsg = '';
  fromDate = '';
  toDate = '';
  activeFiscalYear: ErpFiscalYear | null = null;

  constructor(
    private erp: ErpService,
    private loginService: LoginService,
    private teamService: TeamService
  ) {}

  ngOnInit(): void {
    this.resolveClubId();
  }

  private setDefaultDates(): void {
    const year = new Date().getFullYear();
    this.fromDate = `${year}-01-01`;
    this.toDate = `${year}-12-31`;
  }

  private resolveClubId(): void {
    const cached = Number(sessionStorage.getItem('clubId') || '0');
    if (cached > 0) {
      this.clubId = cached;
      this.checkAndLoad();
      return;
    }
    this.loginService.usuarioActual
      .pipe(filter(Boolean), take(1))
      .subscribe((user: any) => {
        const userId = user.userId;
        const temporada = localStorage.getItem('temporada') || '';
        this.teamService.getTeamByClub(userId.toString(), temporada)
          .pipe(take(1))
          .subscribe({
            next: (res: any) => {
              this.clubId = res?.data?.club?.clubId ?? 0;
              if (this.clubId > 0) {
                sessionStorage.setItem('clubId', String(this.clubId));
                this.checkAndLoad();
              } else {
                this.errorMsg = 'No se encontró el club asociado a tu cuenta.';
                this.loading = false;
              }
            },
            error: () => {
              this.errorMsg = 'Error al obtener los datos del club.';
              this.loading = false;
            }
          });
      });
  }

  checkAndLoad(): void {
    this.loading = true;
    this.errorMsg = '';
    this.erp.getAccounts(this.clubId).subscribe({
      next: (res) => {
        if (res?.data && res.data.length > 0) {
          this.erpInitialized = true;
          this.loadFiscalYearThenKpis();
        } else {
          this.erpInitialized = false;
          this.loading = false;
        }
      },
      error: () => { this.erpInitialized = false; this.loading = false; }
    });
  }

  private loadFiscalYearThenKpis(): void {
    this.erp.getFiscalYears(this.clubId).subscribe({
      next: (res) => {
        const years: ErpFiscalYear[] = res?.data || [];
        this.activeFiscalYear = years.find(fy => fy.isActive) || null;
        if (this.activeFiscalYear) {
          this.fromDate = this.activeFiscalYear.startDate.substring(0, 10);
          this.toDate   = this.activeFiscalYear.endDate.substring(0, 10);
        } else {
          this.setDefaultDates();
        }
        this.loadKpis();
      },
      error: () => { this.setDefaultDates(); this.loadKpis(); }
    });
  }

  initializeErp(): void {
    if (!this.clubId) {
      this.errorMsg = 'No se puede inicializar: clubId no disponible.';
      return;
    }
    this.loading = true;
    this.errorMsg = '';
    this.erp.initErp(this.clubId).subscribe({
      next: () => {
        this.erpInitialized = true;
        this.loadFiscalYearThenKpis();
      },
      error: (err) => {
        this.errorMsg = 'Error al inicializar el ERP: ' + (err?.error?.error?.msg || err?.message || 'Error desconocido');
        this.loading = false;
      }
    });
  }

  loadKpis(): void {
    this.erp.getDashboardKpis(this.clubId, this.fromDate, this.toDate).subscribe({
      next: (res) => {
        this.kpis = res?.data || null;
        this.loading = false;
        this.loadIncomeByCc();
      },
      error: () => { this.loading = false; }
    });
  }

  loadIncomeByCc(): void {
    this.loadingIncomeByCc = true;
    this.erp.getIncomeByCostCenter(this.clubId, this.fromDate, this.toDate).subscribe({
      next: (res) => {
        this.incomeByCc = res?.data || null;
        this.loadingIncomeByCc = false;
      },
      error: () => { this.loadingIncomeByCc = false; }
    });
  }

  resetToFiscalYear(): void {
    if (this.activeFiscalYear) {
      this.fromDate = this.activeFiscalYear.startDate.substring(0, 10);
      this.toDate   = this.activeFiscalYear.endDate.substring(0, 10);
    } else {
      this.setDefaultDates();
    }
    this.loadKpis();
  }

  onDateChange(): void {
    if (this.fromDate && this.toDate) {
      this.loadKpis();
    }
  }

  maxIncomeByCc(): number {
    if (!this.incomeByCc?.rows?.length) return 1;
    return Math.max(...this.incomeByCc.rows.map(r => r.totalIncome));
  }

  fmt(n: number): string {
    return (n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  }
}
