import { Component, OnInit } from '@angular/core';
import { ErpService } from '../../../core/services/erp/erp.service';
import { ErpFiscalYear, ErpCostCenter } from '../models/erp.models';
import { Router } from '@angular/router';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { getSeasons, getCurrentSeasonString } from '../../../core/utils/season.utils';

@Component({ selector: 'app-erp-setup', templateUrl: './erp-setup.component.html', styleUrls: ['./erp-setup.component.scss'] })
export class ErpSetupComponent implements OnInit {
  clubId = 0; fiscalYears: ErpFiscalYear[] = []; costCenters: ErpCostCenter[] = []; loading = true;
  showFyForm = false; fyForm: any = {};
  selectedPresetIndex: number | null = null;
  showCcForm = false; ccName = ''; ccSaving = false;
  editingCcId: number | null = null; editingCcName = '';
  generatingCc = false;
  syncing = false;
  syncingPagos = false;
  syncResult: { created: number; updated: number; skipped: number; total: number } | null = null;
  syncPagosResult: { created: number; updated: number; skipped: number; total: number } | null = null;

  // Temporada seleccionada para la sección de centros de coste
  seasons = getSeasons();
  ccTemporada = getCurrentSeasonString();

  private loaded = 0;

  readonly ccSuggestions = [
    'Primer equipo', 'Cantera / Academia', 'Administración',
    'Instalaciones', 'Marketing', 'Médico / Fisioterapia'
  ];

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
    this.loadCostCenters();
  }
  private checkDone(): void { this.loaded++; if (this.loaded >= 2) this.loading = false; }

  loadCostCenters(): void {
    this.erp.getCostCenters(this.clubId, this.ccTemporada).subscribe(r => {
      this.costCenters = r?.data || [];
      this.checkDone();
    });
  }

  onTemporadaChange(): void {
    this.loaded = 1; // fiscal years already loaded
    this.loadCostCenters();
  }

  openFyForm(): void {
    const year = new Date().getFullYear();
    this.fyForm = { name: `Año natural ${year}`, startDate: `${year}-01-01`, endDate: `${year}-12-31` };
    this.selectedPresetIndex = null;
    this.showFyForm = true;
  }

  applyPreset(preset: typeof this.fyPresets[0], index: number): void {
    const year = new Date().getFullYear();
    const startYear = year;
    const endYear = Number(preset.endMM) < Number(preset.startMM) ? year + 1 : year;
    this.selectedPresetIndex = index;
    this.fyForm = {
      name: `${preset.label.split('(')[0].trim()} ${startYear}`,
      startDate: `${startYear}-${preset.startMM}-${preset.startDD}`,
      endDate:   `${endYear}-${preset.endMM}-${preset.endDD}`
    };
  }

  createFy(): void { this.erp.createFiscalYear({ ...this.fyForm, clubId: this.clubId }).subscribe(() => { this.showFyForm = false; this.load(); }); }
  activateFy(fy: ErpFiscalYear): void { this.erp.activateFiscalYear(fy.id, this.clubId).subscribe(() => this.load()); }

  openCcForm(): void { this.ccName = ''; this.showCcForm = true; }
  applyCcSuggestion(name: string): void { this.ccName = name; }
  createCc(): void {
    if (!this.ccName.trim()) return;
    this.ccSaving = true;
    this.erp.createCostCenter({ clubId: this.clubId, name: this.ccName.trim(), isGroup: false }).subscribe({
      next: () => { this.showCcForm = false; this.ccSaving = false; this.load(); },
      error: () => { this.ccSaving = false; }
    });
  }
  startEditCc(cc: ErpCostCenter): void { this.editingCcId = cc.id; this.editingCcName = cc.name; }
  cancelEditCc(): void { this.editingCcId = null; this.editingCcName = ''; }
  saveEditCc(cc: ErpCostCenter): void {
    if (!this.editingCcName.trim()) return;
    this.erp.updateCostCenter(cc.id, this.clubId, { name: this.editingCcName.trim() }).subscribe(() => {
      this.editingCcId = null;
      this.load();
    });
  }

  deleteCc(cc: ErpCostCenter): void {
    if (!confirm(`¿Eliminar "${cc.name}"?`)) return;
    this.erp.deleteCostCenter(cc.id, this.clubId).subscribe(() => this.load());
  }

  generateFromTeams(): void {
    this.generatingCc = true;
    this.erp.generateCostCentersFromTeams(this.clubId, this.ccTemporada).subscribe({
      next: (res) => { this.costCenters = res?.data || []; this.generatingCc = false; },
      error: () => { this.generatingCc = false; }
    });
  }

  syncCuotas(): void {
    this.syncing = true;
    this.syncResult = null;
    this.erp.syncCuotas(this.clubId, this.ccTemporada).subscribe({
      next: (res) => { this.syncResult = res?.data || null; this.syncing = false; },
      error: () => { this.syncing = false; }
    });
  }

  syncPagosClub(): void {
    this.syncingPagos = true;
    this.syncPagosResult = null;
    this.erp.syncPagosClub(this.clubId, this.ccTemporada).subscribe({
      next: (res) => { this.syncPagosResult = res?.data || null; this.syncingPagos = false; },
      error: () => { this.syncingPagos = false; }
    });
  }

  dropCc(event: CdkDragDrop<ErpCostCenter[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    moveItemInArray(this.costCenters, event.previousIndex, event.currentIndex);
    const items = this.costCenters.map((cc, i) => ({ id: cc.id, sortOrder: i }));
    this.erp.reorderCostCenters(this.clubId, items).subscribe();
  }

  goBack(): void { this.router.navigate(['/dashboard/erp']); }
}
