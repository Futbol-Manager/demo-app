import { Component, OnInit } from '@angular/core';
import { ErpService } from '../../../core/services/erp/erp.service';
import { ErpAiConsentService } from '../../../core/services/erp/erp-ai-consent.service';
import { ErpCustomer, ERP_CUSTOMER_TYPES, ERP_CUSTOMER_TYPE_LABELS } from '../models/erp.models';
import { Router } from '@angular/router';

@Component({ selector: 'app-erp-customers', templateUrl: './erp-customers.component.html', styleUrls: ['./erp-customers.component.scss'] })
export class ErpCustomersComponent implements OnInit {
  clubId = 0; userId = 0; customers: ErpCustomer[] = []; loading = true;
  showForm = false; form: any = {}; saving = false; editId: number | null = null;
  scanning = false; scanWarning = '';
  customerTypes = ERP_CUSTOMER_TYPES;
  typeLabels = ERP_CUSTOMER_TYPE_LABELS;
  typeLabel(t: string): string { return this.typeLabels[t] || t; }

  constructor(private erp: ErpService, private router: Router, public consent: ErpAiConsentService) {}
  ngOnInit(): void {
    this.clubId = Number(sessionStorage.getItem('clubId') || '0');
    this.userId = Number(sessionStorage.getItem('userId') || '0');
    this.load();
  }

  load(): void { this.loading = true; this.erp.getCustomers(this.clubId).subscribe({ next: (r) => { this.customers = r?.data || []; this.loading = false; }, error: () => { this.loading = false; } }); }

  openNew(): void { this.editId = null; this.form = { name: '', customerType: 'Other', taxId: '', email: '', phone: '', address: '', paymentTermsDays: 30, notes: '' }; this.showForm = true; }
  edit(c: ErpCustomer): void { this.editId = c.id; this.form = { ...c }; this.showForm = true; }

  save(): void {
    this.saving = true;
    const obs = this.editId ? this.erp.updateCustomer(this.editId, this.clubId, this.form) : this.erp.createCustomer({ ...this.form, clubId: this.clubId });
    obs.subscribe({ next: () => { this.saving = false; this.showForm = false; this.load(); }, error: () => { this.saving = false; } });
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
    this.erp.scanDocument(file, 'customer', this.clubId).subscribe({
      next: (res) => {
        const d = res?.data;
        if (!d) { this.scanning = false; this.scanWarning = 'err:No se pudo extraer información del documento.'; return; }
        if (d.customerName) this.form.name = d.customerName;
        if (d.customerTaxId) this.form.taxId = d.customerTaxId;
        if (d.customerEmail) this.form.email = d.customerEmail;
        if (d.customerPhone) this.form.phone = d.customerPhone;
        if (d.customerAddress) this.form.address = d.customerAddress;
        if (d.notes) this.form.notes = d.notes;
        if (d.customerExists) {
          this.scanWarning = 'warn:Este cliente ya existe en el sistema. Revisa los datos antes de guardar para evitar duplicados.';
        } else if (d.customerName) {
          this.scanWarning = 'ok:Datos extraídos correctamente. Revisa y completa los campos que falten.';
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

  goBack(): void { this.router.navigate(['/dashboard/erp']); }
}
