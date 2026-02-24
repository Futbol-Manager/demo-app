import { Component, OnInit } from '@angular/core';
import { ErpService } from '../../../core/services/erp/erp.service';
import { ErpPayment, ErpCostCenter, ERP_PAYMENT_METHODS } from '../models/erp.models';
import { Router } from '@angular/router';

@Component({
  selector: 'app-erp-payments',
  templateUrl: './erp-payments.component.html',
  styleUrls: ['./erp-payments.component.scss']
})
export class ErpPaymentsComponent implements OnInit {
  clubId = 0; payments: ErpPayment[] = []; loading = true; typeFilter = '';
  paymentMethods = ERP_PAYMENT_METHODS;
  costCenters: ErpCostCenter[] = [];
  showForm = false; form: any = {}; saving = false;

  constructor(private erp: ErpService, private router: Router) {}
  ngOnInit(): void {
    this.clubId = Number(sessionStorage.getItem('clubId') || '0');
    this.erp.getCostCenters(this.clubId).subscribe(r => this.costCenters = r?.data || []);
    this.load();
  }

  load(): void {
    this.loading = true;
    this.erp.getPayments(this.clubId, this.typeFilter || undefined).subscribe({ next: (r) => { this.payments = r?.data || []; this.loading = false; }, error: () => { this.loading = false; } });
  }

  openNew(type: string): void {
    this.form = { paymentType: type, postingDate: new Date().toISOString().substring(0, 10), partyName: '', paidAmount: 0, paymentMethod: 'BankTransfer', costCenterId: null, referenceNumber: '', remarks: '' };
    this.showForm = true;
  }

  savePayment(): void {
    this.saving = true;
    this.erp.createPayment({ ...this.form, clubId: this.clubId }).subscribe({ next: () => { this.saving = false; this.showForm = false; this.load(); }, error: () => { this.saving = false; } });
  }

  submit(p: ErpPayment): void { this.erp.submitPayment(p.id, this.clubId).subscribe(() => this.load()); }
  cancelPay(p: ErpPayment): void { this.erp.cancelPayment(p.id, this.clubId).subscribe(() => this.load()); }
  statusClass(s: string): string { return 'st-' + s.toLowerCase(); }
  fmt(n: number): string { return (n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  ccName(id: number | null | undefined): string { return this.costCenters.find(c => c.id === id)?.name ?? '—'; }
  goBack(): void { this.router.navigate(['/dashboard/erp']); }
}
