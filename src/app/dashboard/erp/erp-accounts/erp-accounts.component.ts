import { Component, OnInit } from '@angular/core';
import { ErpService } from '../../../core/services/erp/erp.service';
import { ErpAccount } from '../models/erp.models';
import { Router } from '@angular/router';

@Component({
  selector: 'app-erp-accounts',
  templateUrl: './erp-accounts.component.html',
  styleUrls: ['./erp-accounts.component.scss']
})
export class ErpAccountsComponent implements OnInit {
  clubId = 0;
  accounts: ErpAccount[] = [];
  tree: ErpAccount[] = [];
  loading = true;

  constructor(private erp: ErpService, private router: Router) {}

  ngOnInit(): void {
    this.clubId = Number(sessionStorage.getItem('clubId') || '0');
    this.load();
  }

  load(): void {
    this.loading = true;
    this.erp.getAccounts(this.clubId).subscribe({
      next: (res) => {
        this.accounts = res?.data || [];
        this.tree = this.buildTree(this.accounts);
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  buildTree(flat: ErpAccount[]): ErpAccount[] {
    const map = new Map<number, ErpAccount>();
    const roots: ErpAccount[] = [];
    for (const a of flat) {
      a.children = [];
      map.set(a.id, a);
    }
    for (const a of flat) {
      if (a.parentId && map.has(a.parentId)) {
        map.get(a.parentId)!.children!.push(a);
      } else {
        roots.push(a);
      }
    }
    return roots;
  }

  goBack(): void {
    this.router.navigate(['/dashboard/erp']);
  }

  rootTypeLabel(rt: string): string {
    const labels: Record<string, string> = { Asset: 'Activo', Liability: 'Pasivo', Equity: 'Patrimonio', Income: 'Ingreso', Expense: 'Gasto' };
    return labels[rt] || rt;
  }

  rootTypeClass(rt: string): string {
    return 'rt-' + rt.toLowerCase();
  }
}
