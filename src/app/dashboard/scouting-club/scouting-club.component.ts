import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { forkJoin } from 'rxjs';
import { LoginService } from 'src/app/core/services/login/login.service';
import { User } from 'src/app/core/models/users/user.model';
import { environment } from 'src/environments/environment';
import { isDemoMode } from 'src/app/core/services/demo/demo-mode';
import { VideoStorageService } from 'src/app/core/services/video-storage/video-storage.service';
import { DemoDataService } from 'src/app/core/services/demo/demo-data.service';
import { TutorialService } from 'src/app/core/services/tutorial/tutorial.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-scouting-club',
  templateUrl: './scouting-club.component.html',
  styleUrls: ['./scouting-club.component.scss']
})
export class ScoutingClubComponent implements OnInit, OnDestroy {

  clubId = 0;
  userId = 0;
  usuarioActual: User | null = null;

  activeTab: 'watchlist' | 'pipeline' = 'watchlist';

  // Config
  config: any = null;
  pipelineEnabled = false;
  reportsEnabled = false;
  compareEnabled = false;
  showConfigModal = false;

  // Search
  searchQuery = '';
  searchPositions: string[] = [];        // multi-select
  searchFoot = '';
  searchAgeMin: number | null = null;
  searchAgeMax: number | null = null;
  searchHeightMin: number | null = null; // nuevo
  searchHeightMax: number | null = null; // nuevo
  searchNationality = '';                // nuevo
  searchLeague = '';                     // nuevo
  searchAvailability = '';              // nuevo: TRANSFER | LOAN | FREE
  searchOnlyWithVideo = false;           // nuevo
  showAdvancedFilters = false;           // desplegable filtros avanzados
  searchResults: any[] = [];
  searchLoading = false;
  hasSearched = false;

  // Watchlist
  watchlist: any[] = [];
  watchlistLoading = true;
  watchlistFilter = '';
  watchlistSearch = '';

  // Pipeline
  pipelineData: any = null;
  pipelineLoading = false;
  pipelineStages = ['IDENTIFIED', 'OBSERVED', 'EVALUATED', 'SHORTLISTED', 'CONTACTED'];
  showDiscarded = false;

  // Player detail (watchlist)
  showDetailModal = false;
  detailData: any = null;
  detailLoading = false;

  // Public profile (search results)
  showPublicProfileModal = false;
  publicProfile: any = null;
  publicProfileVideos: any[] = [];
  publicProfileLoading = false;

  // Evaluation form
  showEvalForm = false;
  evalMode: 'create' | 'edit' = 'create';
  editingEvalId: number | null = null;
  evalWatchlistId = 0;
  evalPlayerName = '';
  evalOverall = 3;
  evalTechnical = 5;
  evalTactical = 5;
  evalPhysical = 5;
  evalMental = 5;
  evalPotential = 5;
  evalAttitude = 5;
  evalNotes = '';
  evalContext = '';
  evalDate = '';
  evalSaving = false;

  // AI Report
  aiReport = '';
  aiReportLoading = false;

  // Add external
  showAddExternal = false;
  extName = '';
  extPosition = '';
  extTeam = '';
  extAge: number | null = null;
  extNotes = '';

  positions = [
    'Portero',
    'Defensa Central',
    'Lateral Derecho',
    'Lateral Izquierdo',
    'Carrilero Derecho',
    'Carrilero Izquierdo',
    'Mediocentro Defensivo',
    'Mediocentro',
    'Mediocentro Ofensivo',
    'Mediapunta',
    'Extremo Derecho',
    'Extremo Izquierdo',
    'Segundo Delantero',
    'Delantero Centro'
  ];

  feet = ['Derecho', 'Izquierdo', 'Ambidiestro'];

  availabilityOptions = [
    { value: 'TRANSFER', label: 'Transferencia' },
    { value: 'LOAN', label: 'Cesión' },
    { value: 'FREE', label: 'Agente libre' },
  ];

  private apiBase = environment.apiUrl + 'scouting/club';

  // ═══════ VÍDEOS ═══════
  playerVideos: any[]  = [];       // links sociales (PlayerVideoEntity)
  clubVideos: any[]    = [];       // uploads B2 (ClubVideoEntity)
  videosLoading        = false;
  hasPlanForVideos     = false;
  showAddLinkForm      = false;
  addLinkUrl           = '';
  addLinkTitle         = '';
  addLinkSaving        = false;
  addLinkError         = '';
  showVideoUploadModal = false;
  showPlansModal       = false;
  playingVideoUrl      = '';
  playingVideoTitle    = '';

  private playerApiBase = environment.apiUrl + 'scouting/player';
  private tutorialSub?: Subscription;

  constructor(
    private loginService: LoginService,
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private videoService: VideoStorageService,
    private sanitizer: DomSanitizer,
    private location: Location,
    private tutorialService: TutorialService
  ) {}

  goBack(): void { this.location.back(); }

  /**
   * Converts AI-generated text (markdown-like) into styled HTML.
   * Handles: section headers (emoji + caps), bullet lists, bold (**text**), paragraphs.
   */
  formatAiText(text: string): SafeHtml {
    if (!text) return this.sanitizer.bypassSecurityTrustHtml('');

    const lines = text.split('\n');
    let html = '';
    let inList = false;

    for (const rawLine of lines) {
      // Escape HTML entities to prevent XSS on the raw text content
      const line = rawLine
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      const trimmed = line.trim();

      // Section header: starts with an emoji or a numbered section like "1. RESUMEN EJECUTIVO"
      const isHeader =
        /^[\u{1F300}-\u{1FAFF}✅⚠️📊🏆💡🎯📈🔢🎖️]/u.test(trimmed) ||
        /^\d+\.\s+[A-ZÁÉÍÓÚÜÑ\s]{4,}$/.test(trimmed);

      // Bullet point: starts with -, •, * or indented versions
      const isBullet = /^\s*[-•*]\s+/.test(rawLine);

      // Apply bold formatting (**text**)
      const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

      if (trimmed === '') {
        if (inList) { html += '</ul>'; inList = false; }
        html += '<div class="ai-spacer"></div>';
      } else if (isHeader) {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<div class="ai-section-header">${formatted}</div>`;
      } else if (isBullet) {
        if (!inList) { html += '<ul class="ai-list">'; inList = true; }
        const content = formatted.replace(/^\s*[-•*]\s+/, '');
        html += `<li>${content}</li>`;
      } else {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<p class="ai-para">${formatted}</p>`;
      }
    }

    if (inList) html += '</ul>';

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private get headers(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.clubId = +params['clubId'] || 0;
      if (!this.clubId) {
        this.clubId = Number(sessionStorage.getItem('clubId')) || Number(localStorage.getItem('clubId')) || 0;
      }
      if (this.clubId) {
        this.loadConfigAndWatchlist();
      }
    });

    this.loginService.usuarioActual.subscribe(user => {
      if (user) {
        this.usuarioActual = user;
        this.userId = user.userId ?? 0;
      }
    });

    this.tutorialSub = this.tutorialService.currentStep$.subscribe(payload => {
      const stepId = payload?.step?.id;
      if (stepId === 'scout-pipeline') {
        this.activeTab = 'pipeline';
      } else if (stepId === 'scout-tabla' || stepId === 'scout-watchlist-header' || stepId === 'scout-tabs') {
        this.activeTab = 'watchlist';
      }
    });
  }

  ngOnDestroy(): void {
    this.tutorialSub?.unsubscribe();
  }

  /** Carga config y watchlist en paralelo para abrir más rápido */
  private loadConfigAndWatchlist(): void {
    this.watchlistLoading = true;
    if (isDemoMode()) {
      this.config = DemoDataService.getDemoScoutingConfig();
      this.pipelineEnabled = this.config?.pipelineEnabled === 1;
      this.reportsEnabled = this.config?.reportsEnabled === 1;
      this.compareEnabled = this.config?.compareEnabled === 1;
      this.watchlist = DemoDataService.getDemoScoutingWatchlist();
      this.watchlistLoading = false;
      return;
    }
    const config$ = this.http.get<any>(`${this.apiBase}/${this.clubId}/config`, { headers: this.headers });
    const watchlist$ = this.http.get<any>(`${this.apiBase}/${this.clubId}/watchlist`, { headers: this.headers });
    forkJoin({ config: config$, watchlist: watchlist$ }).subscribe({
      next: res => {
        const cfg = res.config?.data;
        this.config = cfg;
        this.pipelineEnabled = cfg?.pipelineEnabled === 1;
        this.reportsEnabled = cfg?.reportsEnabled === 1;
        this.compareEnabled = cfg?.compareEnabled === 1;
        this.watchlist = res.watchlist?.data || [];
        this.watchlistLoading = false;
      },
      error: () => {
        this.watchlist = [];
        this.watchlistLoading = false;
      }
    });
  }

  // ═══════ CONFIG ═══════
  loadConfig(): void {
    this.http.get<any>(`${this.apiBase}/${this.clubId}/config`, { headers: this.headers })
      .subscribe({
        next: res => {
          this.config = res?.data;
          this.pipelineEnabled = this.config?.pipelineEnabled === 1;
          this.reportsEnabled = this.config?.reportsEnabled === 1;
          this.compareEnabled = this.config?.compareEnabled === 1;
        },
        error: () => {}
      });
  }

  saveConfig(): void {
    if (isDemoMode()) {
      this.showConfigModal = false;
      if (this.activeTab === 'pipeline' && !this.pipelineEnabled) {
        this.activeTab = 'watchlist';
      }
      return;
    }
    const body = {
      clubId: this.clubId,
      pipelineEnabled: this.pipelineEnabled ? 1 : 0,
      reportsEnabled: this.reportsEnabled ? 1 : 0,
      compareEnabled: this.compareEnabled ? 1 : 0
    };
    this.http.put<any>(`${this.apiBase}/${this.clubId}/config`, body, { headers: this.headers })
      .subscribe({
        next: () => {
          this.showConfigModal = false;
          if (this.activeTab === 'pipeline' && !this.pipelineEnabled) {
            this.activeTab = 'watchlist';
          }
        },
        error: () => {}
      });
  }

  // ═══════ SEARCH ═══════
  searchPlayers(): void {
    this.searchLoading = true;
    this.hasSearched = true;
    const params: any = {};
    if (this.searchQuery) params.name = this.searchQuery;
    if (this.searchPositions.length > 0) params.position = this.searchPositions.join(',');
    if (this.searchFoot) params.foot = this.searchFoot;
    if (this.searchAgeMin) params.ageMin = this.searchAgeMin;
    if (this.searchAgeMax) params.ageMax = this.searchAgeMax;
    if (this.searchHeightMin) params.heightMin = this.searchHeightMin;
    if (this.searchHeightMax) params.heightMax = this.searchHeightMax;
    if (this.searchNationality) params.nationality = this.searchNationality;
    if (this.searchLeague) params.league = this.searchLeague;
    if (this.searchAvailability) params.availability = this.searchAvailability;
    if (this.searchOnlyWithVideo) params.hasVideo = true;

    const queryString = Object.keys(params).map(k => `${k}=${encodeURIComponent(params[k])}`).join('&');
    this.http.get<any>(`${this.apiBase}/search?${queryString}`, { headers: this.headers })
      .subscribe({
        next: res => {
          this.searchResults = res?.data || [];
          this.searchLoading = false;
        },
        error: () => { this.searchLoading = false; }
      });
  }

  togglePosition(pos: string): void {
    const idx = this.searchPositions.indexOf(pos);
    if (idx >= 0) {
      this.searchPositions.splice(idx, 1);
    } else {
      this.searchPositions.push(pos);
    }
  }

  isPositionSelected(pos: string): boolean {
    return this.searchPositions.includes(pos);
  }

  get activeFiltersCount(): number {
    let count = 0;
    if (this.searchPositions.length > 0) count++;
    if (this.searchFoot) count++;
    if (this.searchAgeMin || this.searchAgeMax) count++;
    if (this.searchHeightMin || this.searchHeightMax) count++;
    if (this.searchNationality) count++;
    if (this.searchLeague) count++;
    if (this.searchAvailability) count++;
    if (this.searchOnlyWithVideo) count++;
    return count;
  }

  clearFilters(): void {
    this.searchPositions = [];
    this.searchFoot = '';
    this.searchAgeMin = null;
    this.searchAgeMax = null;
    this.searchHeightMin = null;
    this.searchHeightMax = null;
    this.searchNationality = '';
    this.searchLeague = '';
    this.searchAvailability = '';
    this.searchOnlyWithVideo = false;
  }

  // ═══════ PUBLIC PROFILE (desde búsqueda) ═══════

  openPublicProfile(player: any): void {
    const playerId = player.playerId || player.id;
    if (!playerId) return;
    this.publicProfile = null;
    this.publicProfileVideos = [];
    this.publicProfileLoading = true;
    this.showPublicProfileModal = true;
    this.http.get<any>(`${this.playerApiBase}/${playerId}/profile`, { headers: this.headers })
      .subscribe({
        next: res => {
          this.publicProfile = res?.data?.profile || null;
          this.publicProfileVideos = res?.data?.videos || [];
          this.publicProfileLoading = false;
        },
        error: () => { this.publicProfileLoading = false; }
      });
  }

  addToWatchlist(player: any): void {
    const body = {
      clubId: this.clubId,
      playerId: player.playerId,
      scoutingPlayerId: player.scoutingPlayerId || player.playerId,
      addedBy: this.userId,
      status: 'IDENTIFIED'
    };
    this.http.post<any>(`${this.apiBase}/${this.clubId}/watchlist`, body, { headers: this.headers })
      .subscribe({
        next: res => {
          if (res?.status === 200) {
            alert('Jugador añadido a tu lista');
            this.loadWatchlist();
          } else {
            alert('Este jugador ya está en tu lista');
          }
        },
        error: () => alert('Error al añadir')
      });
  }

  // ═══════ WATCHLIST ═══════
  loadWatchlist(): void {
    if (isDemoMode()) {
      this.watchlist = DemoDataService.getDemoScoutingWatchlist();
      this.watchlistLoading = false;
      return;
    }
    this.watchlistLoading = true;
    this.http.get<any>(`${this.apiBase}/${this.clubId}/watchlist`, { headers: this.headers })
      .subscribe({
        next: res => {
          this.watchlist = res?.data || [];
          this.watchlistLoading = false;
        },
        error: () => { this.watchlistLoading = false; }
      });
  }

  get filteredWatchlist(): any[] {
    let list = this.watchlist;
    if (this.watchlistFilter) {
      list = list.filter((item: any) => item?.watchlist?.status === this.watchlistFilter);
    }
    if (this.watchlistSearch) {
      const q = this.watchlistSearch.toLowerCase();
      list = list.filter((item: any) => {
        const name = item?.scoutingProfile?.nombre || item?.watchlist?.externalPlayerName || '';
        return name.toLowerCase().includes(q);
      });
    }
    return list;
  }

  removeFromWatchlist(id: number): void {
    if (!confirm('¿Eliminar este jugador de tu lista?')) return;
    if (isDemoMode()) {
      this.watchlist = this.watchlist.filter((i: any) => i?.watchlist?.id !== id);
      if (this.detailData?.watchlist?.id === id) {
        this.showDetailModal = false;
        this.detailData = null;
      }
      return;
    }
    this.http.delete<any>(`${this.apiBase}/${this.clubId}/watchlist/${id}`, { headers: this.headers })
      .subscribe({
        next: () => this.loadWatchlist(),
        error: () => {}
      });
  }

  addExternalPlayer(): void {
    if (!this.extName) return;
    if (isDemoMode()) {
      const newId = Math.max(0, ...this.watchlist.map((i: any) => i?.watchlist?.id || 0)) + 1;
      this.watchlist = [...this.watchlist, {
        watchlist: {
          id: newId,
          status: 'IDENTIFIED',
          externalPlayerName: this.extName,
          externalPlayerPosition: this.extPosition || '',
          externalPlayerTeam: this.extTeam || '',
          externalPlayerAge: this.extAge ?? null,
        },
        scoutingProfile: null,
        evaluations: [],
      }];
      this.showAddExternal = false;
      this.extName = ''; this.extPosition = ''; this.extTeam = ''; this.extAge = null; this.extNotes = '';
      return;
    }
    const body: any = {
      clubId: this.clubId,
      addedBy: this.userId,
      externalPlayerName: this.extName,
      status: 'IDENTIFIED'
    };
    if (this.extPosition) body.externalPlayerPosition = this.extPosition;
    if (this.extTeam) body.externalPlayerTeam = this.extTeam;
    if (this.extAge) body.externalPlayerAge = this.extAge;
    if (this.extNotes) body.notes = this.extNotes;

    this.http.post<any>(`${this.apiBase}/${this.clubId}/watchlist`, body, { headers: this.headers })
      .subscribe({
        next: () => {
          this.showAddExternal = false;
          this.extName = ''; this.extPosition = ''; this.extTeam = ''; this.extAge = null; this.extNotes = '';
          this.loadWatchlist();
        },
        error: () => {}
      });
  }

  // ═══════ DETAIL ═══════
  openDetail(watchlistId: number): void {
    this.showDetailModal    = true;
    this.detailLoading      = true;
    this.playerVideos       = [];
    this.clubVideos         = [];
    this.showAddLinkForm    = false;
    this.addLinkUrl         = '';
    this.addLinkTitle       = '';
    this.showVideoUploadModal = false;
    this.showEditDataPanel  = false;
    this.editDataError      = '';
    this.editDataSuccess    = false;
    if (isDemoMode()) {
      const item = this.watchlist.find((i: any) => i?.watchlist?.id === watchlistId);
      this.detailData = item || null;
      this.detailLoading = false;
      this.videosLoading = false;
      return;
    }
    this.http.get<any>(`${this.apiBase}/${this.clubId}/watchlist/${watchlistId}/detail`, { headers: this.headers })
      .subscribe({
        next: res => {
          this.detailData = res?.data;
          this.detailLoading = false;
          this.loadPlayerVideos();
        },
        error: () => { this.detailLoading = false; }
      });
  }

  getPlayerName(data: any): string {
    return data?.scoutingProfile?.nombre || data?.watchlist?.externalPlayerName || 'Jugador';
  }

  // Detail editing
  editingPlayerName = false;
  editPlayerNameValue = '';
  editingPlayerPhoto = false;
  editPlayerPhotoValue = '';
  editPlayerPhotoPreview = '';
  editPlayerPhotoFile: File | null = null;
  savingPlayerEdit = false;

  // ═══════ COMPARE ═══════
  compareMode = false;
  compareSelected: number[] = [];   // watchlist IDs seleccionados
  showCompareModal = false;
  comparePlayersData: any[] = [];
  compareLoading = false;
  aiCompareSaved = false;
  aiCompareSavedAt: string | null = null;

  toggleCompareMode(): void {
    this.compareMode = !this.compareMode;
    if (!this.compareMode) {
      this.compareSelected = [];
    }
  }

  toggleSelectForCompare(watchlistId: number, event: MouseEvent): void {
    event.stopPropagation();
    const idx = this.compareSelected.indexOf(watchlistId);
    if (idx >= 0) {
      this.compareSelected.splice(idx, 1);
    } else {
      if (this.compareSelected.length >= 4) return; // máximo 4 jugadores
      this.compareSelected.push(watchlistId);
    }
  }

  isSelectedForCompare(watchlistId: number): boolean {
    return this.compareSelected.includes(watchlistId);
  }

  async openCompareModal(): Promise<void> {
    if (this.compareSelected.length < 2) return;
    this.compareLoading = true;
    this.showCompareModal = true;
    this.comparePlayersData = [];
    this.aiCompareResult = '';
    this.aiCompareSaved = false;
    this.aiCompareSavedAt = null;

    const requests = this.compareSelected.map(id =>
      this.http.get<any>(`${this.apiBase}/${this.clubId}/watchlist/${id}/detail`,
        { headers: this.headers }).toPromise()
    );

    try {
      const results = await Promise.all(requests);
      this.comparePlayersData = results.map(r => r?.data).filter(Boolean);
      // Load auto-saved report if it exists for this pair of players
      const saved = this.loadSavedCompareReport();
      if (saved) {
        this.aiCompareResult = saved.report;
        this.aiCompareSaved = true;
        this.aiCompareSavedAt = saved.savedAt;
      }
    } catch (_) {}
    this.compareLoading = false;
  }

  closeCompareModal(): void {
    this.showCompareModal = false;
    this.comparePlayersData = [];
    this.aiCompareResult = '';
    this.aiCompareError = '';
    this.aiCompareSaved = false;
    this.aiCompareSavedAt = null;
  }

  // ═══════ AI COMPARE ═══════
  aiCompareResult = '';
  aiCompareLoading = false;
  aiCompareError = '';

  private compareStorageKey(): string {
    const ids = [...this.compareSelected].sort().join('_');
    return `sph_ai_compare_${this.clubId}_${ids}`;
  }

  private saveCompareReport(report: string): void {
    const payload = {
      report,
      playerNames: this.comparePlayersData.map(p => this.getPlayerName(p)),
      savedAt: new Date().toISOString()
    };
    try {
      localStorage.setItem(this.compareStorageKey(), JSON.stringify(payload));
      this.aiCompareSaved = true;
      this.aiCompareSavedAt = payload.savedAt;
    } catch (_) {}
  }

  private loadSavedCompareReport(): { report: string; playerNames: string[]; savedAt: string } | null {
    try {
      const raw = localStorage.getItem(this.compareStorageKey());
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }

  clearSavedCompareReport(): void {
    localStorage.removeItem(this.compareStorageKey());
    this.aiCompareResult = '';
    this.aiCompareError = '';
    this.aiCompareSaved = false;
    this.aiCompareSavedAt = null;
  }

  generateAiComparison(): void {
    if (this.compareSelected.length < 2) return;
    this.aiCompareLoading = true;
    this.aiCompareResult = '';
    this.aiCompareError = '';
    const body = { watchlistIds: this.compareSelected, userId: this.userId };
    this.http.post<any>(`${this.apiBase}/${this.clubId}/compare`, body, { headers: this.headers })
      .subscribe({
        next: res => {
          this.aiCompareResult = res?.data?.comparison || '';
          this.aiCompareLoading = false;
          if (!this.aiCompareResult) {
            this.aiCompareError = 'La IA no pudo generar la comparativa. Inténtalo de nuevo.';
          } else {
            this.saveCompareReport(this.aiCompareResult);
            setTimeout(() => {
              const el = document.getElementById('ai-compare-result');
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
          }
        },
        error: err => {
          this.aiCompareLoading = false;
          this.aiCompareError = err?.error?.error?.msg || 'Error al generar la comparativa con IA.';
        }
      });
  }

  downloadComparisonPdf(): void {
    const playerNames = this.comparePlayersData.map(p => this.getPlayerName(p)).join(' vs ');
    const savedDate = this.aiCompareSavedAt
      ? new Date(this.aiCompareSavedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

    // Convert raw text to styled HTML for PDF
    const bodyHtml = this.buildPdfHtml(this.aiCompareResult);

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Comparativa IA — ${playerNames}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1e293b; padding: 32px 40px; line-height: 1.7; }
    .pdf-header { border-bottom: 3px solid #002c40; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
    .pdf-title { font-size: 20px; font-weight: 800; color: #002c40; }
    .pdf-subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
    .pdf-date { font-size: 11px; color: #94a3b8; text-align: right; }
    .pdf-badge { display: inline-flex; align-items: center; gap: 6px; background: #002c40; color: #fff; border-radius: 20px; padding: 3px 12px; font-size: 11px; font-weight: 700; margin-bottom: 16px; }
    .ai-section-header { font-size: 13.5px; font-weight: 800; color: #002c40; margin: 20px 0 8px; padding: 6px 0 6px 10px; border-left: 3px solid #31b270; background: #f0fdf4; border-radius: 0 4px 4px 0; }
    .ai-para { margin: 0 0 10px; font-size: 13px; color: #1e293b; }
    .ai-list { margin: 4px 0 12px 20px; padding: 0; }
    .ai-list li { margin-bottom: 5px; font-size: 13px; color: #1e293b; }
    strong { font-weight: 700; }
    .pdf-footer { border-top: 1px solid #e2e8f0; margin-top: 32px; padding-top: 10px; font-size: 10px; color: #94a3b8; text-align: center; }
    @media print { body { padding: 16px 20px; } @page { margin: 1.5cm; } }
  </style>
</head>
<body>
  <div class="pdf-header">
    <div>
      <div class="pdf-title">Comparativa de Jugadores</div>
      <div class="pdf-subtitle">${playerNames}</div>
    </div>
    <div class="pdf-date">Generado el ${savedDate}</div>
  </div>
  <div class="pdf-badge">⚡ Análisis generado por IA · Sphaira Tech</div>
  ${bodyHtml}
  <div class="pdf-footer">Sphaira Tech · Informe generado automáticamente por inteligencia artificial · Solo uso interno</div>
  <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; }<\/script>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=800,height=700');
    if (!printWindow) {
      alert('Activa las ventanas emergentes para descargar el PDF.');
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
  }

  private buildPdfHtml(text: string): string {
    if (!text) return '';
    const lines = text.split('\n');
    let html = '';
    let inList = false;

    for (const rawLine of lines) {
      const line = rawLine.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const trimmed = line.trim();
      const isHeader = /^[\u{1F300}-\u{1FAFF}✅⚠️📊🏆💡🎯📈🔢🎖️]/u.test(trimmed) || /^\d+\.\s+[A-ZÁÉÍÓÚÜÑ\s]{4,}$/.test(trimmed);
      const isBullet = /^\s*[-•*]\s+/.test(rawLine);
      const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

      if (trimmed === '') {
        if (inList) { html += '</ul>'; inList = false; }
        html += '<div style="height:6px"></div>';
      } else if (isHeader) {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<div class="ai-section-header">${formatted}</div>`;
      } else if (isBullet) {
        if (!inList) { html += '<ul class="ai-list">'; inList = true; }
        html += `<li>${formatted.replace(/^\s*[-•*]\s+/, '')}</li>`;
      } else {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<p class="ai-para">${formatted}</p>`;
      }
    }
    if (inList) html += '</ul>';
    return html;
  }

  getCompareScore(player: any, field: string): number {
    const evals: any[] = player?.evaluations || [];
    if (!evals.length) return 0;
    const sum = evals.reduce((acc: number, e: any) => acc + (e[field] || 0), 0);
    return Math.round((sum / evals.length) * 10) / 10;
  }

  getCompareOverall(player: any): number {
    const evals: any[] = player?.evaluations || [];
    if (!evals.length) return 0;
    const sum = evals.reduce((acc: number, e: any) => acc + (e.overallRating || 0), 0);
    return Math.round((sum / evals.length) * 10) / 10;
  }

  compareScoreBarWidth(val: number, max: number = 10): string {
    return `${Math.round((val / max) * 100)}%`;
  }

  compareScoreColor(val: number): string {
    if (val === 0) return '#ccc';
    if (val < 4)  return '#E53E3E';
    if (val < 6)  return '#ED8936';
    if (val < 8)  return '#3182CE';
    return '#31b270';
  }

  // Edit player data panel
  showEditDataPanel = false;
  editDataName = '';
  editDataPosition = '';
  editDataTeam = '';
  editDataAge: number | null = null;
  editDataBirthdate = '';
  editDataNationality = '';
  editDataLeague = '';
  editDataFoot = '';
  editDataNotes = '';
  savingEditData = false;
  editDataError = '';
  editDataSuccess = false;

  // ═══════ AI REPORT ═══════
  aiReportError = '';

  generateAiReport(watchlistId: number): void {
    if (!watchlistId) return;
    this.aiReportLoading = true;
    this.aiReport = '';
    this.aiReportError = '';
    const body = { userId: this.userId };
    this.http.post<any>(`${this.apiBase}/${this.clubId}/watchlist/${watchlistId}/report`, body, { headers: this.headers })
      .subscribe({
        next: res => {
          this.aiReport = res?.data?.report || '';
          this.aiReportLoading = false;
          if (!this.aiReport) {
            this.aiReportError = 'No se pudo obtener el informe. Inténtalo de nuevo.';
          }
        },
        error: (err) => {
          this.aiReportLoading = false;
          const msg = err?.error?.error?.msg || err?.error?.message || '';
          this.aiReportError = msg || 'Error al generar el informe. Comprueba que el jugador tenga al menos una evaluación.';
        }
      });
  }

  // ═══════ PLAYER EDITING (from detail modal) ═══════
  startEditName(): void {
    this.editPlayerNameValue = this.getPlayerName(this.detailData);
    this.editingPlayerName = true;
  }

  savePlayerName(): void {
    if (!this.editPlayerNameValue.trim()) return;
    this.savingPlayerEdit = true;
    const watchlistId = this.detailData?.watchlist?.id;
    const isExternal = !this.detailData?.scoutingProfile;

    if (isExternal) {
      this.http.patch<any>(`${this.apiBase}/${this.clubId}/watchlist/${watchlistId}`,
        { externalPlayerName: this.editPlayerNameValue.trim() }, { headers: this.headers })
        .subscribe({
          next: () => {
            this.detailData.watchlist.externalPlayerName = this.editPlayerNameValue.trim();
            const item = this.watchlist.find((i: any) => i?.watchlist?.id === watchlistId);
            if (item) item.watchlist.externalPlayerName = this.editPlayerNameValue.trim();
            this.editingPlayerName = false;
            this.savingPlayerEdit = false;
          },
          error: () => { this.savingPlayerEdit = false; }
        });
    } else {
      const playerId = this.detailData?.scoutingProfile?.playerId;
      const apiPlayer = this.apiBase.replace('scouting/club', 'scouting/player');
      this.http.post<any>(`${apiPlayer}/${playerId}/profile`,
        { nombre: this.editPlayerNameValue.trim() }, { headers: this.headers })
        .subscribe({
          next: () => {
            this.detailData.scoutingProfile.nombre = this.editPlayerNameValue.trim();
            this.editingPlayerName = false;
            this.savingPlayerEdit = false;
          },
          error: () => { this.savingPlayerEdit = false; }
        });
    }
  }

  startEditPhoto(): void {
    this.editPlayerPhotoPreview = this.getPlayerPhoto(this.detailData);
    this.editPlayerPhotoFile = null;
    this.editingPlayerPhoto = true;
  }

  onPhotoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.editPlayerPhotoFile = input.files[0];
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.editPlayerPhotoPreview = e.target.result;
      };
      reader.readAsDataURL(input.files[0]);
    }
  }

  savePlayerPhoto(): void {
    if (!this.editPlayerPhotoFile) {
      this.editingPlayerPhoto = false;
      return;
    }
    this.savingPlayerEdit = true;
    const watchlistId = this.detailData?.watchlist?.id;
    const isExternal = !this.detailData?.scoutingProfile;

    const formData = new FormData();
    formData.append('file', this.editPlayerPhotoFile);

    if (isExternal) {
      this.http.post<any>(`${this.apiBase}/${this.clubId}/watchlist/${watchlistId}/photo`,
        formData, { headers: this.headers.delete('Content-Type') })
        .subscribe({
          next: (res) => {
            const photoUrl = res?.data || this.editPlayerPhotoPreview;
            this.detailData.watchlist.externalPlayerPhoto = photoUrl;
            const item = this.watchlist.find((i: any) => i?.watchlist?.id === watchlistId);
            if (item) item.watchlist.externalPlayerPhoto = photoUrl;
            this.editingPlayerPhoto = false;
            this.editPlayerPhotoFile = null;
            this.savingPlayerEdit = false;
          },
          error: () => { this.savingPlayerEdit = false; }
        });
    } else {
      const playerId = this.detailData?.scoutingProfile?.playerId;
      const apiPlayer = this.apiBase.replace('scouting/club', 'scouting/player');
      this.http.post<any>(`${apiPlayer}/${playerId}/photo`,
        formData, { headers: this.headers.delete('Content-Type') })
        .subscribe({
          next: (res) => {
            const photoUrl = res?.data || this.editPlayerPhotoPreview;
            this.detailData.scoutingProfile.imagenPerfil = photoUrl;
            this.editingPlayerPhoto = false;
            this.editPlayerPhotoFile = null;
            this.savingPlayerEdit = false;
          },
          error: () => { this.savingPlayerEdit = false; }
        });
    }
  }

  getPlayerPhoto(data: any): string {
    return data?.scoutingProfile?.imagenPerfil || data?.watchlist?.externalPlayerPhoto || '';
  }

  getPlayerAge(data: any): string | number {
    if (data?.scoutingProfile?.fechaDeNacimiento) {
      try {
        const year = parseInt(data.scoutingProfile.fechaDeNacimiento.substring(0, 4), 10);
        return new Date().getFullYear() - year;
      } catch { return data?.scoutingProfile?.edad || ''; }
    }
    return data?.scoutingProfile?.edad || data?.watchlist?.externalPlayerAge || '';
  }

  copyReport(): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(this.aiReport).then(() => {
        const prev = this.aiReport;
        this.aiReport = prev;
      });
    }
  }

  // ═══════ EVALUATION ═══════
  openEvalForm(watchlistId: number, playerName: string): void {
    this.evalMode = 'create';
    this.editingEvalId = null;
    this.evalWatchlistId = watchlistId;
    this.evalPlayerName = playerName;
    this.evalOverall = 3;
    this.evalTechnical = 5; this.evalTactical = 5; this.evalPhysical = 5;
    this.evalMental = 5; this.evalPotential = 5; this.evalAttitude = 5;
    this.evalNotes = ''; this.evalContext = '';
    this.evalDate = new Date().toISOString().substring(0, 10);
    this.showEvalForm = true;
  }

  openEditEvalForm(ev: any, playerName: string): void {
    this.evalMode = 'edit';
    this.editingEvalId = ev.id;
    this.evalWatchlistId = ev.watchlistId || this.detailData?.watchlist?.id;
    this.evalPlayerName = playerName;
    this.evalOverall = ev.overallRating || 3;
    this.evalTechnical = ev.technicalScore || 5;
    this.evalTactical = ev.tacticalScore || 5;
    this.evalPhysical = ev.physicalScore || 5;
    this.evalMental = ev.mentalScore || 5;
    this.evalPotential = ev.potentialScore || 5;
    this.evalAttitude = ev.attitudeScore || 5;
    this.evalNotes = ev.notes || '';
    this.evalContext = ev.observationContext || '';
    const rawDate = ev.evaluationDate;
    if (rawDate) {
      if (typeof rawDate === 'number') {
        this.evalDate = new Date(rawDate).toISOString().substring(0, 10);
      } else {
        this.evalDate = String(rawDate).substring(0, 10);
      }
    } else {
      this.evalDate = new Date().toISOString().substring(0, 10);
    }
    this.showEvalForm = true;
  }

  deleteEvaluation(evalId: number): void {
    if (!confirm('¿Eliminar esta evaluación?')) return;
    this.http.delete<any>(`${this.apiBase}/${this.clubId}/evaluation/${evalId}`, { headers: this.headers })
      .subscribe({
        next: () => {
          if (this.detailData?.watchlist?.id) {
            this.openDetail(this.detailData.watchlist.id);
          }
        },
        error: () => {}
      });
  }

  saveEvaluation(): void {
    this.evalSaving = true;
    const body = {
      watchlistId: this.evalWatchlistId,
      clubId: this.clubId,
      evaluatorUserId: this.userId,
      overallRating: this.evalOverall,
      technicalScore: this.evalTechnical,
      tacticalScore: this.evalTactical,
      physicalScore: this.evalPhysical,
      mentalScore: this.evalMental,
      potentialScore: this.evalPotential,
      attitudeScore: this.evalAttitude,
      notes: this.evalNotes,
      observationContext: this.evalContext,
      evaluationDate: this.evalDate
    };

    const req$ = this.evalMode === 'edit' && this.editingEvalId
      ? this.http.put<any>(`${this.apiBase}/${this.clubId}/evaluation/${this.editingEvalId}`, body, { headers: this.headers })
      : this.http.post<any>(`${this.apiBase}/${this.clubId}/evaluation`, body, { headers: this.headers });

    req$.subscribe({
      next: () => {
        this.evalSaving = false;
        this.showEvalForm = false;
        if (this.detailData?.watchlist?.id) {
          this.openDetail(this.detailData.watchlist.id);
        }
        this.loadWatchlist();
      },
      error: (err) => {
        this.evalSaving = false;
        const msg = err?.error?.error?.msg || err?.message || 'Error al guardar la evaluación';
        alert(msg);
      }
    });
  }

  // ═══════ PIPELINE ═══════
  loadPipeline(): void {
    if (isDemoMode()) {
      this.pipelineData = DemoDataService.getDemoScoutingPipeline();
      this.pipelineLoading = false;
      return;
    }
    this.pipelineLoading = true;
    this.http.get<any>(`${this.apiBase}/${this.clubId}/pipeline`, { headers: this.headers })
      .subscribe({
        next: res => {
          this.pipelineData = res?.data;
          this.pipelineLoading = false;
        },
        error: () => { this.pipelineLoading = false; }
      });
  }

  getPipelineStageItems(stage: string): any[] {
    return this.pipelineData?.[stage] || [];
  }

  moveInPipeline(watchlistId: number, toStage: string): void {
    const body = {
      watchlistId: watchlistId,
      clubId: this.clubId,
      stage: toStage,
      movedBy: this.userId
    };
    this.http.post<any>(`${this.apiBase}/${this.clubId}/pipeline`, body, { headers: this.headers })
      .subscribe({
        next: () => this.loadPipeline(),
        error: () => {}
      });
  }

  changeStatus(item: any, event: Event): void {
    const newStatus = (event.target as HTMLSelectElement).value;
    const watchlistId = item?.watchlist?.id;
    if (!watchlistId || !newStatus) return;
    item.watchlist.status = newStatus;
    if (this.detailData?.watchlist?.id === watchlistId) {
      this.detailData.watchlist.status = newStatus;
    }
    this.moveInPipelineQuiet(watchlistId, newStatus);
  }

  changeDetailStatus(event: Event): void {
    const newStatus = (event.target as HTMLSelectElement).value;
    const watchlistId = this.detailData?.watchlist?.id;
    if (!watchlistId || !newStatus) return;
    this.detailData.watchlist.status = newStatus;
    const item = this.watchlist.find((i: any) => i?.watchlist?.id === watchlistId);
    if (item) item.watchlist.status = newStatus;
    this.moveInPipelineQuiet(watchlistId, newStatus);
  }

  private moveInPipelineQuiet(watchlistId: number, toStage: string): void {
    if (isDemoMode()) {
      const item = this.watchlist.find((i: any) => i?.watchlist?.id === watchlistId);
      if (item?.watchlist) item.watchlist.status = toStage;
      return;
    }
    const body = { watchlistId, clubId: this.clubId, stage: toStage, movedBy: this.userId };
    this.http.post<any>(`${this.apiBase}/${this.clubId}/pipeline`, body, { headers: this.headers })
      .subscribe({ next: () => {}, error: () => {} });
  }

  onTabChange(tab: 'watchlist' | 'pipeline'): void {
    this.activeTab = tab;
    if (tab === 'watchlist') this.loadWatchlist();
    if (tab === 'pipeline') this.loadPipeline();
  }

  // ═══════ HELPERS ═══════
  stageLabel(stage: string): string {
    const labels: any = {
      'IDENTIFIED': 'Identificado', 'OBSERVED': 'Observado', 'EVALUATED': 'Evaluado',
      'SHORTLISTED': 'Preseleccionado', 'CONTACTED': 'Contactado', 'DISCARDED': 'Descartado'
    };
    return labels[stage] || stage;
  }

  stageColor(stage: string): string {
    const colors: any = {
      'IDENTIFIED': '#3182CE', 'OBSERVED': '#ED8936', 'EVALUATED': '#31b270',
      'SHORTLISTED': '#8B5CF6', 'CONTACTED': '#002c40', 'DISCARDED': '#E53E3E'
    };
    return colors[stage] || '#999';
  }

  stageIcon(stage: string): string {
    const icons: any = {
      'IDENTIFIED': 'bi-eye', 'OBSERVED': 'bi-binoculars', 'EVALUATED': 'bi-clipboard-check',
      'SHORTLISTED': 'bi-star', 'CONTACTED': 'bi-telephone'
    };
    return icons[stage] || 'bi-circle';
  }

  getStageIndex(stage: string): number {
    return this.pipelineStages.indexOf(stage);
  }

  getDiscardedItems(): any[] {
    return this.pipelineData?.['DISCARDED'] || [];
  }

  restoreFromDiscarded(watchlistId: number): void {
    this.moveInPipeline(watchlistId, 'IDENTIFIED');
  }

  scoreColor(val: number): string {
    if (val <= 3) return '#E53E3E';
    if (val <= 5) return '#ED8936';
    if (val <= 7) return '#3182CE';
    return '#31b270';
  }

  // ═══════ VÍDEOS DEL JUGADOR ═══════

  loadPlayerVideos(): void {
    const playerId = this.detailData?.scoutingProfile?.id || this.detailData?.watchlist?.playerId;
    const watchlistId = this.detailData?.watchlist?.id;
    this.playerVideos       = [];
    this.clubVideos         = [];
    this.videosLoading      = true;
    this.videosLoadedCount  = 0;

    // 1. Links sociales (siempre disponibles)
    if (playerId) {
      this.http.get<any>(`${this.playerApiBase}/${playerId}/videos`, { headers: this.headers })
        .subscribe({
          next: (res) => { this.playerVideos = res?.data || []; this.checkVideosLoaded(); },
          error: ()    => { this.checkVideosLoaded(); }
        });
    } else if (watchlistId) {
      // Jugador externo: usar endpoint de watchlist
      this.http.get<any>(`${this.apiBase}/${this.clubId}/watchlist/${watchlistId}/videos`, { headers: this.headers })
        .subscribe({
          next: (res) => { this.playerVideos = res?.data || []; this.checkVideosLoaded(); },
          error: ()    => { this.checkVideosLoaded(); }
        });
    } else {
      this.checkVideosLoaded();
    }

    // 2. Vídeos subidos (requiere plan)
    if (watchlistId) {
      this.videoService.listVideos(this.clubId, watchlistId).subscribe({
        next: (res) => { this.clubVideos = res?.data || []; this.checkVideosLoaded(); },
        error: ()   => { this.checkVideosLoaded(); }
      });
    } else {
      this.checkVideosLoaded();
    }

    // 3. Comprobar si el club tiene plan activo
    this.videoService.getPlan(this.clubId).subscribe({
      next: (res) => { this.hasPlanForVideos = res?.data?.hasPlan && res?.data?.status === 'ACTIVE'; },
      error: ()   => { this.hasPlanForVideos = false; }
    });
  }

  private videosLoadedCount = 0;
  private checkVideosLoaded(): void {
    this.videosLoadedCount++;
    if (this.videosLoadedCount >= 2) {
      this.videosLoading = false;
      this.videosLoadedCount = 0;
    }
  }

  addSocialLink(): void {
    if (!this.addLinkUrl.trim()) return;
    const playerId = this.detailData?.scoutingProfile?.id || this.detailData?.watchlist?.playerId;
    const watchlistId = this.detailData?.watchlist?.id;

    if (!playerId && !watchlistId) { this.addLinkError = 'No se puede identificar al jugador.'; return; }

    this.addLinkSaving = true;
    this.addLinkError  = '';
    const plataforma = this.detectPlatform(this.addLinkUrl);
    const body = {
      playerId: playerId || 0,
      tipo: 'SOCIAL_LINK',
      plataforma,
      url: this.addLinkUrl.trim(),
      titulo: this.addLinkTitle.trim() || plataforma
    };

    const url = playerId
      ? `${this.playerApiBase}/${playerId}/video`
      : `${this.apiBase}/${this.clubId}/watchlist/${watchlistId}/video`;

    this.http.post<any>(url, body, { headers: this.headers })
      .subscribe({
        next: () => {
          this.addLinkUrl     = '';
          this.addLinkTitle   = '';
          this.showAddLinkForm = false;
          this.addLinkSaving  = false;
          this.loadPlayerVideos();
        },
        error: (err) => {
          this.addLinkSaving = false;
          this.addLinkError  = err?.error?.error?.msg || 'Error al guardar el enlace.';
        }
      });
  }

  deleteSocialLink(videoId: number): void {
    if (!confirm('¿Eliminar este enlace?')) return;
    const playerId = this.detailData?.scoutingProfile?.id || this.detailData?.watchlist?.playerId;
    const watchlistId = this.detailData?.watchlist?.id;
    const url = playerId
      ? `${this.playerApiBase}/${playerId}/video/${videoId}`
      : `${this.apiBase}/${this.clubId}/watchlist/${watchlistId}/video/${videoId}`;
    this.http.delete<any>(url, { headers: this.headers })
      .subscribe({ next: () => this.loadPlayerVideos(), error: () => {} });
  }

  deleteClubVideo(videoId: number): void {
    if (!confirm('¿Eliminar este vídeo? Se liberará el espacio de almacenamiento.')) return;
    this.videoService.deleteVideo(this.clubId, videoId)
      .subscribe({ next: () => this.loadPlayerVideos(), error: () => {} });
  }

  onPlayerVideoUploaded(video: any): void {
    this.showVideoUploadModal = false;
    this.loadPlayerVideos();
  }

  openVideoPlayer(url: string, title: string): void {
    this.playingVideoUrl   = url;
    this.playingVideoTitle = title;
  }

  closeVideoPlayer(): void {
    this.playingVideoUrl   = '';
    this.playingVideoTitle = '';
  }

  getClubVideoUrl(videoId: number): void {
    this.videoService.getVideoUrl(this.clubId, videoId).subscribe({
      next: (res) => {
        const url = res?.data?.url;
        if (url) {
          const v = this.clubVideos.find(cv => cv.id === videoId);
          this.openVideoPlayer(url, v?.title || 'Vídeo');
        }
      },
      error: () => {}
    });
  }

  detectPlatform(url: string): string {
    if (!url) return 'DIRECT';
    const u = url.toLowerCase();
    if (u.includes('youtu'))    return 'YOUTUBE';
    if (u.includes('instagram') || u.includes('instagr.am')) return 'INSTAGRAM';
    if (u.includes('tiktok'))   return 'TIKTOK';
    if (u.includes('vimeo'))    return 'VIMEO';
    if (u.includes('twitter') || u.includes('x.com')) return 'TWITTER';
    if (u.includes('facebook') || u.includes('fb.watch')) return 'FACEBOOK';
    return 'DIRECT';
  }

  platformIcon(plataforma: string): string {
    const m: Record<string, string> = {
      YOUTUBE: 'bi-youtube', INSTAGRAM: 'bi-instagram', TIKTOK: 'bi-tiktok',
      VIMEO: 'bi-vimeo', TWITTER: 'bi-twitter-x', FACEBOOK: 'bi-facebook',
      UPLOAD: 'bi-cloud-upload-fill', DIRECT: 'bi-play-circle'
    };
    return m[plataforma] || 'bi-play-circle';
  }

  platformColor(plataforma: string): string {
    const m: Record<string, string> = {
      YOUTUBE: '#FF0000', INSTAGRAM: '#E1306C', TIKTOK: '#000000',
      VIMEO: '#1AB7EA', TWITTER: '#1DA1F2', FACEBOOK: '#1877F2',
      UPLOAD: '#002c40', DIRECT: '#666'
    };
    return m[plataforma] || '#666';
  }

  getPlayerNameForUpload(): string {
    return this.detailData?.scoutingProfile?.nombre
      || this.detailData?.watchlist?.externalPlayerName
      || 'Jugador';
  }

  get detailWatchlistId(): number {
    return this.detailData?.watchlist?.id || 0;
  }

  // ═══════ EDIT PLAYER DATA PANEL ═══════
  openEditDataPanel(): void {
    const sp = this.detailData?.scoutingProfile;
    const wl = this.detailData?.watchlist;
    this.editDataName        = sp?.nombre || wl?.externalPlayerName || '';
    this.editDataPosition    = sp?.posicionPrincipal || sp?.posicion || wl?.externalPlayerPosition || '';
    this.editDataTeam        = sp?.equipoActual || wl?.externalPlayerTeam || '';
    this.editDataAge         = wl?.externalPlayerAge || null;
    this.editDataBirthdate   = sp?.fechaDeNacimiento || '';
    this.editDataNationality = sp?.nacionalidad || '';
    this.editDataLeague      = sp?.ligaActual || '';
    this.editDataFoot        = sp?.piernaNatural || sp?.pierna || '';
    this.editDataNotes       = wl?.notes || '';
    this.editDataError       = '';
    this.editDataSuccess     = false;
    this.showEditDataPanel   = true;
  }

  saveEditData(): void {
    this.savingEditData  = true;
    this.editDataError   = '';
    this.editDataSuccess = false;
    const watchlistId = this.detailData?.watchlist?.id;
    const isExternal  = !this.detailData?.scoutingProfile;

    if (isExternal) {
      const body: any = {};
      if (this.editDataName.trim())         body.externalPlayerName     = this.editDataName.trim();
      if (this.editDataPosition.trim())     body.externalPlayerPosition = this.editDataPosition.trim();
      if (this.editDataTeam.trim())         body.externalPlayerTeam     = this.editDataTeam.trim();
      if (this.editDataAge != null)         body.externalPlayerAge      = this.editDataAge;
      body.notes = this.editDataNotes || '';

      this.http.patch<any>(`${this.apiBase}/${this.clubId}/watchlist/${watchlistId}`, body, { headers: this.headers })
        .subscribe({
          next: () => {
            this.savingEditData  = false;
            this.editDataSuccess = true;
            // Update local data immediately so the UI reflects changes without reload
            const wl = this.detailData.watchlist;
            if (body.externalPlayerName)     wl.externalPlayerName     = body.externalPlayerName;
            if (body.externalPlayerPosition) wl.externalPlayerPosition = body.externalPlayerPosition;
            if (body.externalPlayerTeam)     wl.externalPlayerTeam     = body.externalPlayerTeam;
            if (body.externalPlayerAge)      wl.externalPlayerAge      = body.externalPlayerAge;
            wl.notes = body.notes;
            // Also update the watchlist row
            const listItem = this.watchlist.find((i: any) => i?.watchlist?.id === watchlistId);
            if (listItem) {
              if (body.externalPlayerName) listItem.watchlist.externalPlayerName = body.externalPlayerName;
            }
            setTimeout(() => {
              this.showEditDataPanel = false;
              this.editDataSuccess   = false;
            }, 1200);
            this.loadWatchlist();
          },
          error: (err) => {
            this.savingEditData = false;
            this.editDataError  = err?.error?.error?.msg || 'Error al guardar. Comprueba la conexión con el servidor.';
          }
        });
    } else {
      // For scouting profile players, use watchlist.scoutingPlayerId (that's what found the profile)
      const scoutingPlayerId = this.detailData?.watchlist?.scoutingPlayerId;
      if (!scoutingPlayerId) {
        this.savingEditData = false;
        this.editDataError  = 'No se pudo identificar el perfil de scouting del jugador.';
        return;
      }
      const body: any = {};
      if (this.editDataName.trim())        body.nombre            = this.editDataName.trim();
      if (this.editDataPosition.trim())    body.posicionPrincipal = this.editDataPosition.trim();
      if (this.editDataTeam.trim())        body.equipoActual      = this.editDataTeam.trim();
      if (this.editDataBirthdate.trim())   body.fechaDeNacimiento = this.editDataBirthdate.trim();
      if (this.editDataNationality.trim()) body.nacionalidad      = this.editDataNationality.trim();
      if (this.editDataLeague.trim())      body.ligaActual        = this.editDataLeague.trim();
      if (this.editDataFoot)               body.piernaNatural     = this.editDataFoot;

      const apiPlayer = this.apiBase.replace('scouting/club', 'scouting/player');
      this.http.put<any>(`${apiPlayer}/${scoutingPlayerId}/profile`, body, { headers: this.headers })
        .subscribe({
          next: () => {
            this.savingEditData  = false;
            this.editDataSuccess = true;
            // Update local data immediately
            const sp = this.detailData.scoutingProfile;
            if (body.nombre)            sp.nombre            = body.nombre;
            if (body.posicionPrincipal) sp.posicionPrincipal = body.posicionPrincipal;
            if (body.equipoActual)      sp.equipoActual      = body.equipoActual;
            if (body.fechaDeNacimiento) sp.fechaDeNacimiento = body.fechaDeNacimiento;
            if (body.nacionalidad)      sp.nacionalidad      = body.nacionalidad;
            if (body.ligaActual)        sp.ligaActual        = body.ligaActual;
            if (body.piernaNatural)     sp.piernaNatural     = body.piernaNatural;
            setTimeout(() => {
              this.showEditDataPanel = false;
              this.editDataSuccess   = false;
            }, 1200);
          },
          error: (err) => {
            this.savingEditData = false;
            this.editDataError  = err?.error?.error?.msg || 'Error al guardar. Comprueba la conexión con el servidor.';
          }
        });
    }
  }
}
