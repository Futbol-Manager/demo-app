import { Component, OnInit } from '@angular/core';
import { ErpService } from '../../../core/services/erp/erp.service';
import { ErpFiscalYear, ErpCostCenter } from '../models/erp.models';
import { Router } from '@angular/router';

@Component({ selector: 'app-erp-setup', templateUrl: './erp-setup.component.html', styleUrls: ['./erp-setup.component.scss'] })
export class ErpSetupComponent implements OnInit {
  clubId = 0; fiscalYears: ErpFiscalYear[] = []; costCenters: ErpCostCenter[] = []; loading = true;
  showFyForm = false; fyForm: any = {};
  private loaded = 0;

  readonly fyPresets = [
    { label: 'Año natural (Ene – Dic)',    startMM: '01', startDD: '01', endMM: '12', endDD: '31' },
    { label: 'Año fiscal (Abr – Mar)',     startMM: '04', startDD: '01', endMM: '03', endDD: '31' },
    { label: 'Temporada deportiva (Jul – Jun)', startMM: '07', startDD: '01', endMM: '06', endDD: '30' },
    { label: 'Año fiscal (Oct – Sep)',     startMM: '10', startDD: '01', endMM: '09', endDD: '30' },
  ];

  constructor(private erp: ErpService, private router: Router) {}
  ngOnInit(): void { this.clubId = Number(sessionStorage.getItem('clubId') || '0'); this.load(); }

  load(): void {
    this.loading = true; this.loaded = 0;
    this.erp.getFiscalYears(this.clubId).subscribe(r => { this.fiscalYears = r?.data || []; this.checkDone(); });
    this.erp.getCostCenters(this.clubId).subscribe(r => { this.costCenters = r?.data || []; this.checkDone(); });
  }
  private checkDone(): void { this.loaded++; if (this.loaded >= 2) this.loading = false; }

  openFyForm(): void {
    const year = new Date().getFullYear();
    this.fyForm = { name: `Año natural ${year}`, startDate: `${year}-01-01`, endDate: `${year}-12-31` };
    this.showFyForm = true;
  }

  applyPreset(preset: typeof this.fyPresets[0]): void {
    const year = new Date().getFullYear();
    const startYear = year;
    const endYear = Number(preset.endMM) < Number(preset.startMM) ? year + 1 : year;
    this.fyForm = {
      name: `${preset.label.split('(')[0].trim()} ${startYear}`,
      startDate: `${startYear}-${preset.startMM}-${preset.startDD}`,
      endDate:   `${endYear}-${preset.endMM}-${preset.endDD}`
    };
  }

  createFy(): void { this.erp.createFiscalYear({ ...this.fyForm, clubId: this.clubId }).subscribe(() => { this.showFyForm = false; this.load(); }); }
  activateFy(fy: ErpFiscalYear): void { this.erp.activateFiscalYear(fy.id, this.clubId).subscribe(() => this.load()); }
  goBack(): void { this.router.navigate(['/dashboard/erp']); }
}
