import { Component, OnInit } from '@angular/core';
import { ErpService } from '../../../core/services/erp/erp.service';
import { Router } from '@angular/router';

@Component({ selector: 'app-erp-reports', templateUrl: './erp-reports.component.html', styleUrls: ['./erp-reports.component.scss'] })
export class ErpReportsComponent implements OnInit {
  clubId = 0; reportType = 'profit-loss'; fromDate = ''; toDate = ''; asOfDate = '';
  reportData: any = null; loading = false;

  constructor(private erp: ErpService, private router: Router) {}
  ngOnInit(): void {
    this.clubId = Number(sessionStorage.getItem('clubId') || '0');
    const year = new Date().getFullYear();
    this.fromDate = `${year}-01-01`; this.toDate = `${year}-12-31`;
    this.asOfDate = new Date().toISOString().substring(0, 10);
  }

  generate(): void {
    this.loading = true; this.reportData = null;
    switch (this.reportType) {
      case 'profit-loss': this.erp.getProfitLoss(this.clubId, this.fromDate, this.toDate).subscribe({ next: r => { this.reportData = r?.data; this.loading = false; }, error: () => this.loading = false }); break;
      case 'balance-sheet': this.erp.getBalanceSheet(this.clubId, this.asOfDate).subscribe({ next: r => { this.reportData = r?.data; this.loading = false; }, error: () => this.loading = false }); break;
      case 'trial-balance': this.erp.getTrialBalance(this.clubId, this.fromDate, this.toDate).subscribe({ next: r => { this.reportData = r?.data; this.loading = false; }, error: () => this.loading = false }); break;
      case 'general-ledger': this.erp.getGeneralLedger(this.clubId, this.fromDate, this.toDate).subscribe({ next: r => { this.reportData = r?.data; this.loading = false; }, error: () => this.loading = false }); break;
    }
  }

  fmt(n: number): string { return (n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  goBack(): void { this.router.navigate(['/dashboard/erp']); }
}
