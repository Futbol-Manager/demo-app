import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { ErpService } from '../../../core/services/erp/erp.service';
import { Router } from '@angular/router';
import { PdfExportService } from '../../../core/services/pdf-export/pdf-export.service';

@Component({
  selector: 'app-erp-reports',
  templateUrl: './erp-reports.component.html',
  styleUrls: ['./erp-reports.component.scss']
})
export class ErpReportsComponent implements OnInit {

  @ViewChild('reportContent') reportContentRef!: ElementRef<HTMLElement>;

  clubId = 0;
  reportType = 'profit-loss';
  fromDate = '';
  toDate = '';
  asOfDate = '';
  reportData: any = null;
  loading = false;
  isExporting = false;
  today = new Date();

  readonly reportTypeLabels: Record<string, string> = {
    'profit-loss': 'Cuenta de resultados',
    'balance-sheet': 'Balance de situación',
    'trial-balance': 'Balance de sumas y saldos',
    'general-ledger': 'Libro mayor'
  };

  constructor(
    private erp: ErpService,
    private router: Router,
    private pdfExport: PdfExportService
  ) {}

  ngOnInit(): void {
    this.clubId = Number(sessionStorage.getItem('clubId') || '0');
    const year = new Date().getFullYear();
    this.fromDate = `${year}-01-01`;
    this.toDate = `${year}-12-31`;
    this.asOfDate = new Date().toISOString().substring(0, 10);
  }

  generate(): void {
    this.loading = true;
    this.reportData = null;

    const handlers = {
      next: (r: any) => { this.reportData = r?.data; this.loading = false; },
      error: () => { this.loading = false; }
    };

    switch (this.reportType) {
      case 'profit-loss':
        this.erp.getProfitLoss(this.clubId, this.fromDate, this.toDate).subscribe(handlers);
        break;
      case 'balance-sheet':
        this.erp.getBalanceSheet(this.clubId, this.asOfDate).subscribe(handlers);
        break;
      case 'trial-balance':
        this.erp.getTrialBalance(this.clubId, this.fromDate, this.toDate).subscribe(handlers);
        break;
      case 'general-ledger':
        this.erp.getGeneralLedger(this.clubId, this.fromDate, this.toDate).subscribe(handlers);
        break;
    }
  }

  async exportPdf(): Promise<void> {
    if (!this.reportContentRef || !this.reportData) return;
    this.isExporting = true;

    const title = this.reportTypeLabels[this.reportType] || 'Informe Financiero';
    const period = this.reportType === 'balance-sheet'
      ? `A fecha: ${this.formatDateDisplay(this.asOfDate)}`
      : `${this.formatDateDisplay(this.fromDate)} – ${this.formatDateDisplay(this.toDate)}`;

    const fileName = `informe-${this.reportType}-${new Date().getFullYear()}`;

    try {
      await this.pdfExport.exportReport(this.reportContentRef.nativeElement, {
        fileName,
        title,
        subtitle: period,
        type: 'financial'
      });
    } finally {
      this.isExporting = false;
    }
  }

  private formatDateDisplay(iso: string): string {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  fmt(n: number): string {
    return (n || 0).toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  get reportLabel(): string {
    return this.reportTypeLabels[this.reportType] || '';
  }

  get periodLabel(): string {
    if (this.reportType === 'balance-sheet') {
      return `A fecha ${this.formatDateDisplay(this.asOfDate)}`;
    }
    return `${this.formatDateDisplay(this.fromDate)} – ${this.formatDateDisplay(this.toDate)}`;
  }

  goBack(): void {
    this.router.navigate(['/dashboard/erp']);
  }
}
