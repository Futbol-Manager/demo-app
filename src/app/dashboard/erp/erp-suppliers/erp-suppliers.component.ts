import { Component, OnInit } from '@angular/core';
import { ErpService } from '../../../core/services/erp/erp.service';
import { ErpAiConsentService } from '../../../core/services/erp/erp-ai-consent.service';
import { ErpSupplier, ERP_SUPPLIER_CATEGORIES } from '../models/erp.models';
import { Router } from '@angular/router';

@Component({ selector: 'app-erp-suppliers', templateUrl: './erp-suppliers.component.html', styleUrls: ['./erp-suppliers.component.scss'] })
export class ErpSuppliersComponent implements OnInit {
  clubId = 0; userId = 0; suppliers: ErpSupplier[] = []; loading = true;
  showForm = false; form: any = {}; saving = false; editId: number | null = null;
  scanning = false; scanWarning = '';
  categories = ERP_SUPPLIER_CATEGORIES;

  constructor(private erp: ErpService, private router: Router, public consent: ErpAiConsentService) {}
  ngOnInit(): void {
    this.clubId = Number(sessionStorage.getItem('clubId') || '0');
    this.userId = Number(sessionStorage.getItem('userId') || '0');
    this.load();
  }

  load(): void { this.loading = true; this.erp.getSuppliers(this.clubId).subscribe({ next: (r) => { this.suppliers = r?.data || []; this.loading = false; }, error: () => { this.loading = false; } }); }
  openNew(): void { this.editId = null; this.form = { name: '', category: 'Otros', taxId: '', email: '', phone: '', address: '', paymentTermsDays: 30, notes: '' }; this.showForm = true; }
  edit(s: ErpSupplier): void { this.editId = s.id; this.form = { ...s }; this.showForm = true; }

  save(): void {
    this.saving = true;
    const obs = this.editId ? this.erp.updateSupplier(this.editId, this.clubId, this.form) : this.erp.createSupplier({ ...this.form, clubId: this.clubId });
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
    this.erp.scanDocument(file, 'supplier', this.clubId).subscribe({
      next: (res) => {
        const d = res?.data;
        if (!d) { this.scanning = false; this.scanWarning = 'err:No se pudo extraer información del documento.'; return; }
        if (d.supplierName) this.form.name = d.supplierName;
        if (d.supplierTaxId) this.form.taxId = d.supplierTaxId;
        if (d.supplierEmail) this.form.email = d.supplierEmail;
        if (d.supplierPhone) this.form.phone = d.supplierPhone;
        if (d.supplierAddress) this.form.address = d.supplierAddress;
        if (d.notes) this.form.notes = d.notes;
        if (d.supplierExists) {
          this.scanWarning = 'warn:Este proveedor ya existe en el sistema. Revisa los datos antes de guardar para evitar duplicados.';
        } else if (d.supplierName) {
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
