import { Component, OnInit } from '@angular/core';
import { ErpService } from '../../../core/services/erp/erp.service';
import { ErpAiConsentService } from '../../../core/services/erp/erp-ai-consent.service';
import { ErpPurchaseInvoice, ErpSupplier, ErpAccount, ErpPurchaseInvoiceItem, ERP_INVOICE_STATUSES, ERP_INVOICE_STATUS_LABELS } from '../models/erp.models';
import { Router } from '@angular/router';

@Component({
  selector: 'app-erp-purchase-invoices',
  templateUrl: './erp-purchase-invoices.component.html',
  styleUrls: ['./erp-purchase-invoices.component.scss']
})
export class ErpPurchaseInvoicesComponent implements OnInit {
  clubId = 0; userId = 0; invoices: ErpPurchaseInvoice[] = []; suppliers: ErpSupplier[] = []; loading = true;
  statusFilter = ''; statuses = ERP_INVOICE_STATUSES;
  showForm = false; form: any = {}; formItems: ErpPurchaseInvoiceItem[] = []; saving = false;
  scanning = false; scanWarning = '';

  constructor(private erp: ErpService, private router: Router, public consent: ErpAiConsentService) {}
  ngOnInit(): void {
    this.clubId = Number(sessionStorage.getItem('clubId') || '0');
    this.userId = Number(sessionStorage.getItem('userId') || '0');
    this.loadAll();
  }

  loadAll(): void {
    this.loading = true;
    this.erp.getPurchaseInvoices(this.clubId, this.statusFilter || undefined).subscribe({ next: (r) => { this.invoices = r?.data || []; this.loading = false; }, error: () => { this.loading = false; } });
    this.erp.getSuppliers(this.clubId).subscribe(r => this.suppliers = r?.data || []);
  }

  openNew(): void {
    const today = new Date().toISOString().substring(0, 10);
    this.form = { postingDate: today, dueDate: '', supplierId: null, supplierName: '', invoiceNumber: '', notes: '', discountTotal: 0 };
    this.formItems = [{ description: '', quantity: 1, unitPrice: 0, amount: 0, taxRate: 21, taxAmount: 0 }];
    this.showForm = true;
  }

  addLine(): void { this.formItems.push({ description: '', quantity: 1, unitPrice: 0, amount: 0, taxRate: 21, taxAmount: 0 }); }
  removeLine(i: number): void { this.formItems.splice(i, 1); }

  grandTotal(): number {
    const sub = this.formItems.reduce((s, i) => s + (i.quantity * i.unitPrice), 0);
    const tax = this.formItems.reduce((s, i) => s + (i.quantity * i.unitPrice * i.taxRate / 100), 0);
    return sub + tax - (this.form.discountTotal || 0);
  }

  saveInvoice(): void {
    this.saving = true;
    const body = {
      clubId: this.clubId, postingDate: this.form.postingDate, dueDate: this.form.dueDate || null,
      supplierId: this.form.supplierId || null, supplierName: this.form.supplierName,
      invoiceNumber: this.form.invoiceNumber || null, notes: this.form.notes, discountTotal: this.form.discountTotal || 0,
      items: this.formItems.map(i => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, taxRate: i.taxRate }))
    };
    this.erp.createPurchaseInvoice(body).subscribe({ next: () => { this.saving = false; this.showForm = false; this.loadAll(); }, error: () => { this.saving = false; } });
  }

  onSupplierChange(): void {
    const s = this.suppliers.find(x => x.id == this.form.supplierId);
    this.form.supplierName = s ? s.name : '';
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
    this.erp.scanDocument(file, 'purchase_invoice', this.clubId).subscribe({
      next: (res) => {
        const d = res?.data;
        if (!d) { this.scanning = false; this.scanWarning = '⚠ No se pudo extraer información.'; return; }
        if (d.invoiceNumber) this.form.invoiceNumber = d.invoiceNumber;
        if (d.postingDate) this.form.postingDate = d.postingDate;
        if (d.dueDate) this.form.dueDate = d.dueDate;
        if (d.supplierName) this.form.supplierName = d.supplierName;
        if (d.discountTotal) this.form.discountTotal = d.discountTotal;
        if (d.notes) this.form.notes = d.notes;
        if (d.matchedSupplierId) {
          this.form.supplierId = d.matchedSupplierId;
          const s = this.suppliers.find((x: any) => x.id === d.matchedSupplierId);
          if (s) this.form.supplierName = s.name;
          this.scanWarning = 'ok:Proveedor identificado y vinculado automáticamente.';
        } else if (d.supplierName) {
          this.scanWarning = 'warn:Proveedor "' + d.supplierName + '" no encontrado. Puedes crearlo desde Proveedores.';
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
      error: () => { this.scanning = false; this.scanWarning = 'err:Error al procesar el documento.'; }
    });
  }

  scanClass(): string {
    if (this.scanWarning.startsWith('ok:')) return 'scan-ok';
    if (this.scanWarning.startsWith('err:')) return 'scan-err';
    return 'scan-warn';
  }
  scanText(): string { return this.scanWarning.replace(/^(ok:|warn:|err:)/, ''); }

  submit(inv: ErpPurchaseInvoice): void { this.erp.submitPurchaseInvoice(inv.id, this.clubId).subscribe(() => this.loadAll()); }
  cancel(inv: ErpPurchaseInvoice): void { this.erp.cancelPurchaseInvoice(inv.id, this.clubId).subscribe(() => this.loadAll()); }
  statusLabel(s: string): string { return ERP_INVOICE_STATUS_LABELS[s] || s; }
  statusClass(s: string): string { return 'st-' + s.toLowerCase(); }
  fmt(n: number): string { return (n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  goBack(): void { this.router.navigate(['/dashboard/erp']); }
}
