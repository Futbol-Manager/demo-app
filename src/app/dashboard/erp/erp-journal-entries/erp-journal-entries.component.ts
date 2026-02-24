import { Component, OnInit } from '@angular/core';
import { ErpService } from '../../../core/services/erp/erp.service';
import { ErpJournalEntry, ErpJournalEntryItem, ErpAccount } from '../models/erp.models';
import { Router } from '@angular/router';

@Component({ selector: 'app-erp-journal-entries', templateUrl: './erp-journal-entries.component.html', styleUrls: ['./erp-journal-entries.component.scss'] })
export class ErpJournalEntriesComponent implements OnInit {
  clubId = 0; entries: ErpJournalEntry[] = []; accounts: ErpAccount[] = []; loading = true;
  showForm = false; saving = false; statusFilter = '';
  formDate = ''; formRemarks = ''; formItems: ErpJournalEntryItem[] = [];

  constructor(private erp: ErpService, private router: Router) {}
  ngOnInit(): void {
    this.clubId = Number(sessionStorage.getItem('clubId') || '0');
    this.load();
    this.erp.getLeafAccounts(this.clubId).subscribe(r => this.accounts = r?.data || []);
  }

  load(): void {
    this.loading = true;
    this.erp.getJournalEntries(this.clubId, this.statusFilter || undefined).subscribe({ next: (r) => { this.entries = r?.data || []; this.loading = false; }, error: () => { this.loading = false; } });
  }

  openNew(): void {
    this.formDate = new Date().toISOString().substring(0, 10); this.formRemarks = '';
    this.formItems = [{ accountId: 0, debitAmount: 0, creditAmount: 0 }, { accountId: 0, debitAmount: 0, creditAmount: 0 }];
    this.showForm = true;
  }

  addLine(): void { this.formItems.push({ accountId: 0, debitAmount: 0, creditAmount: 0 }); }
  removeLine(i: number): void { if (this.formItems.length > 2) this.formItems.splice(i, 1); }

  totalDebit(): number { return this.formItems.reduce((s, i) => s + (i.debitAmount || 0), 0); }
  totalCredit(): number { return this.formItems.reduce((s, i) => s + (i.creditAmount || 0), 0); }
  isBalanced(): boolean { return Math.abs(this.totalDebit() - this.totalCredit()) < 0.01; }

  saveEntry(): void {
    if (!this.isBalanced()) return;
    this.saving = true;
    this.erp.createJournalEntry({ clubId: this.clubId, postingDate: this.formDate, remarks: this.formRemarks,
      items: this.formItems.map(i => ({ accountId: i.accountId, debitAmount: i.debitAmount, creditAmount: i.creditAmount }))
    }).subscribe({ next: () => { this.saving = false; this.showForm = false; this.load(); }, error: () => { this.saving = false; } });
  }

  post(e: ErpJournalEntry): void { this.erp.postJournalEntry(e.id, this.clubId).subscribe(() => this.load()); }
  cancelEntry(e: ErpJournalEntry): void { this.erp.cancelJournalEntry(e.id, this.clubId).subscribe(() => this.load()); }
  statusClass(s: string): string { return 'st-' + s.toLowerCase(); }
  fmt(n: number): string { return (n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  goBack(): void { this.router.navigate(['/dashboard/erp']); }
}
