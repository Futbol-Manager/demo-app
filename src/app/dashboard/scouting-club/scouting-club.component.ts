import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { LoginService } from 'src/app/core/services/login/login.service';
import { User } from 'src/app/core/models/users/user.model';
import { environment } from 'src/environments/environment';
import { VideoStorageService } from 'src/app/core/services/video-storage/video-storage.service';

@Component({
  selector: 'app-scouting-club',
  templateUrl: './scouting-club.component.html',
  styleUrls: ['./scouting-club.component.scss']
})
export class ScoutingClubComponent implements OnInit {

  clubId = 0;
  userId = 0;
  usuarioActual: User | null = null;

  activeTab: 'watchlist' | 'search' | 'pipeline' = 'watchlist';

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

  // Player detail
  showDetailModal = false;
  detailData: any = null;
  detailLoading = false;

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
  playingVideoUrl      = '';
  playingVideoTitle    = '';

  private playerApiBase = environment.apiUrl + 'scouting/player';

  constructor(
    private loginService: LoginService,
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private videoService: VideoStorageService
  ) {}

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
    });

    this.loginService.usuarioActual.subscribe(user => {
      if (user) {
        this.usuarioActual = user;
        this.userId = user.userId ?? 0;
        if (!this.clubId) {
          this.clubId = Number(sessionStorage.getItem('clubId')) || Number(localStorage.getItem('clubId')) || 0;
        }
        this.loadConfig();
        this.loadWatchlist();
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
    this.http.delete<any>(`${this.apiBase}/${this.clubId}/watchlist/${id}`, { headers: this.headers })
      .subscribe({
        next: () => this.loadWatchlist(),
        error: () => {}
      });
  }

  addExternalPlayer(): void {
    if (!this.extName) return;
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
  comparePlayersData: any[] = [];   // detalle de cada jugador para comparar
  compareLoading = false;

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

    const requests = this.compareSelected.map(id =>
      this.http.get<any>(`${this.apiBase}/${this.clubId}/watchlist/${id}/detail`,
        { headers: this.headers }).toPromise()
    );

    try {
      const results = await Promise.all(requests);
      this.comparePlayersData = results.map(r => r?.data).filter(Boolean);
    } catch (_) {}
    this.compareLoading = false;
  }

  closeCompareModal(): void {
    this.showCompareModal = false;
    this.comparePlayersData = [];
    this.aiCompareResult = '';
    this.aiCompareError = '';
  }

  // ═══════ AI COMPARE ═══════
  aiCompareResult = '';
  aiCompareLoading = false;
  aiCompareError = '';

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
    const body = { watchlistId, clubId: this.clubId, stage: toStage, movedBy: this.userId };
    this.http.post<any>(`${this.apiBase}/${this.clubId}/pipeline`, body, { headers: this.headers })
      .subscribe({ next: () => {}, error: () => {} });
  }

  onTabChange(tab: 'search' | 'watchlist' | 'pipeline'): void {
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
    if (!playerId) { this.addLinkError = 'Este jugador no tiene perfil de scouting asociado.'; return; }

    this.addLinkSaving = true;
    this.addLinkError  = '';
    const plataforma = this.detectPlatform(this.addLinkUrl);
    const body = {
      playerId,
      tipo: 'SOCIAL_LINK',
      plataforma,
      url: this.addLinkUrl.trim(),
      titulo: this.addLinkTitle.trim() || plataforma
    };

    this.http.post<any>(`${this.playerApiBase}/${playerId}/video`, body, { headers: this.headers })
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
    this.http.delete<any>(`${this.playerApiBase}/${playerId}/video/${videoId}`, { headers: this.headers })
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
