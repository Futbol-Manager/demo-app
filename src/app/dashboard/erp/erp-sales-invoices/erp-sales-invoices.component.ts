import { Component, OnInit } from '@angular/core';
import { ErpService } from '../../../core/services/erp/erp.service';
import { ErpAiConsentService } from '../../../core/services/erp/erp-ai-consent.service';
import { ErpSalesInvoice, ErpCustomer, ErpAccount, ErpSalesInvoiceItem, ERP_INVOICE_STATUSES, ERP_INVOICE_STATUS_LABELS } from '../models/erp.models';
import { Router } from '@angular/router';

@Component({
  selector: 'app-erp-sales-invoices',
  templateUrl: './erp-sales-invoices.component.html',
  styleUrls: ['./erp-sales-invoices.component.scss']
})
export class ErpSalesInvoicesComponent implements OnInit {
  clubId = 0;
  invoices: ErpSalesInvoice[] = [];
  customers: ErpCustomer[] = [];
  accounts: ErpAccount[] = [];
  loading = true;
  statusFilter = '';
  statuses = ERP_INVOICE_STATUSES;

  showForm = false;
  form: any = {};
  formItems: ErpSalesInvoiceItem[] = [];
  saving = false;
  scanning = false;
  scanWarning = '';

  // Cobro inline
  payingInvoice: ErpSalesInvoice | null = null;
  payForm: any = {};
  payingSaving = false;

  userId = 0;

  constructor(private erp: ErpService, private router: Router, public consent: ErpAiConsentService) {}

  ngOnInit(): void {
    this.clubId  = Number(sessionStorage.getItem('clubId')  || '0');
    this.userId  = Number(sessionStorage.getItem('userId')  || '0');
    this.loadAll();
  }

  loadAll(): void {
    this.loading = true;
    this.erp.getSalesInvoices(this.clubId, this.statusFilter || undefined).subscribe({
      next: (res) => { this.invoices = res?.data || []; this.loading = false; },
      error: () => { this.loading = false; }
    });
    this.erp.getCustomers(this.clubId).subscribe(res => this.customers = res?.data || []);
    this.erp.getLeafAccounts(this.clubId).subscribe(res => this.accounts = (res?.data || []).filter((a: ErpAccount) => a.rootType === 'Income'));
  }

  openNew(): void {
    const today = new Date().toISOString().substring(0, 10);
    this.form = { postingDate: today, dueDate: '', customerId: null, customerName: '', notes: '', discountTotal: 0 };
    this.formItems = [{ description: '', quantity: 1, unitPrice: 0, amount: 0, taxRate: 21, taxAmount: 0, accountId: undefined }];
    this.showForm = true;
  }

  addLine(): void { this.formItems.push({ description: '', quantity: 1, unitPrice: 0, amount: 0, taxRate: 21, taxAmount: 0 }); }
  removeLine(i: number): void { this.formItems.splice(i, 1); }

  recalc(item: ErpSalesInvoiceItem): void {
    item.amount = item.quantity * item.unitPrice;
    item.taxAmount = item.amount * item.taxRate / 100;
  }

  grandTotal(): number {
    const sub = this.formItems.reduce((s, i) => s + (i.quantity * i.unitPrice), 0);
    const tax = this.formItems.reduce((s, i) => s + (i.quantity * i.unitPrice * i.taxRate / 100), 0);
    return sub + tax - (this.form.discountTotal || 0);
  }

  saveInvoice(): void {
    this.saving = true;
    const body = {
      clubId: this.clubId, postingDate: this.form.postingDate, dueDate: this.form.dueDate || null,
      customerId: this.form.customerId || null, customerName: this.form.customerName, notes: this.form.notes,
      discountTotal: this.form.discountTotal || 0,
      items: this.formItems.map(i => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, taxRate: i.taxRate, accountId: i.accountId || null }))
    };
    this.erp.createSalesInvoice(body).subscribe({
      next: () => { this.saving = false; this.showForm = false; this.loadAll(); },
      error: () => { this.saving = false; alert('Error al crear factura'); }
    });
  }

  submit(inv: ErpSalesInvoice): void {
    if (!confirm('¿Confirmar factura ' + inv.invoiceNumber + '?')) return;
    this.erp.submitSalesInvoice(inv.id, this.clubId).subscribe(() => this.loadAll());
  }

  cancel(inv: ErpSalesInvoice): void {
    if (!confirm('¿Anular factura ' + inv.invoiceNumber + '?')) return;
    this.erp.cancelSalesInvoice(inv.id, this.clubId).subscribe(() => this.loadAll());
  }

  openPay(inv: ErpSalesInvoice): void {
    const pending = Math.max(0, (inv.grandTotal || 0) - (inv.paidAmount || 0));
    this.payingInvoice = inv;
    this.payForm = {
      amount: pending,
      method: 'BankTransfer',
      date: new Date().toISOString().substring(0, 10),
      reference: ''
    };
  }

  closePay(): void { this.payingInvoice = null; }

  confirmPay(): void {
    if (!this.payingInvoice) return;
    this.payingSaving = true;
    const body = {
      clubId: this.clubId,
      paymentType: 'Receive',
      postingDate: this.payForm.date,
      partyType: 'Customer',
      partyId: this.payingInvoice.customerId || null,
      partyName: this.payingInvoice.customerName || '',
      paidAmount: this.payForm.amount,
      paymentMethod: this.payForm.method,
      referenceNumber: this.payForm.reference || null,
      referenceDocType: 'SalesInvoice',
      referenceDocId: this.payingInvoice.id,
      status: 'Draft'
    };
    this.erp.createPayment(body).subscribe({
      next: (res) => {
        const paymentId = res?.data?.id;
        this.erp.submitPayment(paymentId, this.clubId).subscribe({
          next: () => { this.payingSaving = false; this.payingInvoice = null; this.loadAll(); },
          error: () => { this.payingSaving = false; alert('Error al confirmar el cobro'); }
        });
      },
      error: () => { this.payingSaving = false; alert('Error al registrar el cobro'); }
    });
  }

  onCustomerChange(): void {
    const c = this.customers.find(x => x.id == this.form.customerId);
    this.form.customerName = c ? c.name : '';
  }

  scanWithAI(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';
    this.consent.checkAndEnsure(this.userId, this.clubId, () => this.doScan(file));
  }

  private doScan(file: File): void {
    this.scanning = true;
    this.scanWarning = '';
    if (!this.showForm) { this.openNew(); }
    this.erp.scanDocument(file, 'sales_invoice', this.clubId).subscribe({
      next: (res) => {
        const d = res?.data;
        if (!d) { this.scanning = false; this.scanWarning = '⚠ No se pudo extraer información del documento.'; return; }
        if (d.postingDate) this.form.postingDate = d.postingDate;
        if (d.dueDate) this.form.dueDate = d.dueDate;
        if (d.customerName) this.form.customerName = d.customerName;
        if (d.discountTotal) this.form.discountTotal = d.discountTotal;
        if (d.notes) this.form.notes = d.notes;
        if (d.matchedCustomerId) {
          this.form.customerId = d.matchedCustomerId;
          this.scanWarning = 'ok:Cliente identificado y vinculado automáticamente.';
        } else if (d.customerName) {
          this.scanWarning = 'warn:Cliente "' + d.customerName + '" no encontrado. Puedes crearlo desde Clientes.';
        }
        if (d.items?.length > 0) {
          this.formItems = d.items.map((item: any) => ({
            description: item.description || '',
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            amount: (item.quantity || 1) * (item.unitPrice || 0),
            taxRate: item.taxRate || 21,
            taxAmount: (item.quantity || 1) * (item.unitPrice || 0) * ((item.taxRate || 21) / 100)
          }));
        }
        if (d.warning) this.scanWarning = 'warn:' + d.warning;
        this.scanning = false;
      },
      error: () => { this.scanning = false; this.scanWarning = 'err:Error al procesar el documento. Inténtalo de nuevo.'; }
    });
  }

  scanClass(): string {
    if (this.scanWarning.startsWith('ok:')) return 'scan-ok';
    if (this.scanWarning.startsWith('err:')) return 'scan-err';
    return 'scan-warn';
  }
  scanText(): string { return this.scanWarning.replace(/^(ok:|warn:|err:)/, ''); }

  statusLabel(s: string): string { return ERP_INVOICE_STATUS_LABELS[s] || s; }
  statusClass(s: string): string { return 'st-' + s.toLowerCase(); }
  fmt(n: number): string { return (n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  goBack(): void { this.router.navigate(['/dashboard/erp']); }
}
