import { Component, OnInit } from '@angular/core';
import { ErpService } from '../../../core/services/erp/erp.service';
import { ErpBudget } from '../models/erp.models';
import { Router } from '@angular/router';

@Component({ selector: 'app-erp-budgets', templateUrl: './erp-budgets.component.html', styleUrls: ['./erp-budgets.component.scss'] })
export class ErpBudgetsComponent implements OnInit {
  clubId = 0; budgets: ErpBudget[] = []; loading = true;
  showForm = false; formName = ''; saving = false;

  constructor(private erp: ErpService, private router: Router) {}
  ngOnInit(): void { this.clubId = Number(sessionStorage.getItem('clubId') || '0'); this.load(); }

  load(): void { this.loading = true; this.erp.getBudgets(this.clubId).subscribe({ next: (r) => { this.budgets = r?.data || []; this.loading = false; }, error: () => { this.loading = false; } }); }

  createBudget(): void {
    if (!this.formName.trim()) return;
    this.saving = true;
    this.erp.createBudget({ clubId: this.clubId, name: this.formName, items: [] }).subscribe({ next: () => { this.saving = false; this.showForm = false; this.formName = ''; this.load(); }, error: () => { this.saving = false; } });
  }

  deleteBudget(b: ErpBudget): void {
    if (!confirm('¿Eliminar presupuesto "' + b.name + '"?')) return;
    this.erp.deleteBudget(b.id, this.clubId).subscribe(() => this.load());
  }

  statusClass(s: string): string { return 'st-' + s.toLowerCase(); }
  goBack(): void { this.router.navigate(['/dashboard/erp']); }
}
