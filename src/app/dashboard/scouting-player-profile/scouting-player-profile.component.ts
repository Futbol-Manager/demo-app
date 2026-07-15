import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild, ElementRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { LoginService } from 'src/app/core/services/login/login.service';
import { environment } from 'src/environments/environment';
import { isDemoMode } from 'src/app/core/services/demo/demo-mode';
import { getSportConfig, SportConfig } from 'src/app/core/models/sport/sport-config.model';
import { SportContextService } from 'src/app/core/services/sport/sport-context.service';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { sportPositionLabel, sportScoringPlural, sportSectionOnField } from 'src/app/core/utils/sport-ui-i18n';

@Component({
  selector: 'app-scouting-player-profile',
  templateUrl: './scouting-player-profile.component.html',
  styleUrls: ['./scouting-player-profile.component.scss']
})
export class ScoutingPlayerProfileComponent implements OnInit, OnDestroy {
  private apiBase = `${environment.apiUrl}scouting/player`;

  playerId = 0;
  form!: FormGroup;
  loading = true;
  saving = false;
  profile: any = null;
  videos: any[] = [];
  videoLoading = false;

  // Foto de perfil
  photoUploading = false;
  photoPreview: string | null = null;
  @ViewChild('photoInput') photoInput!: ElementRef<HTMLInputElement>;

  // CV upload
  cvUploading = false;
  cvFileName: string | null = null;
  cvUrl: string | null = null;
  @ViewChild('cvInput') cvInput!: ElementRef<HTMLInputElement>;

  // Modal consentimiento
  showConsentModal = false;
  consentChecked = false;

  // Vídeos
  showAddVideo = false;
  newVideoPlataforma = 'YOUTUBE';
  newVideoUrl = '';
  newVideoTitulo = '';
  videoSubscription = false;
  videoSubscriptionLoading = false;
  @ViewChild('videoFileInput') videoFileInput!: ElementRef<HTMLInputElement>;
  videoUploading = false;

  successMsg = '';
  errorMsg = '';

  /** Posiciones según el deporte activo (demo / contexto de club). */
  sportConfig: SportConfig = getSportConfig('futbol');

  get positionOptions(): string[] {
    return this.sportConfig.positions?.length ? this.sportConfig.positions : getSportConfig('futbol').positions;
  }

  private langSub?: Subscription;

  /** Título de la tarjeta de posiciones (ej. «En el Campo», «En la Cancha»). */
  get onFieldSectionTitle(): string {
    const f = this.sportConfig.fieldName;
    const art = ['Cancha', 'Pista', 'Piscina', 'Pista de hielo'].includes(f) ? 'la' : 'el';
    const fb = `En ${art} ${f}`;
    return sportSectionOnField(this.translate, this.sportConfig.key, fb);
  }

  get scoringPluralLabel(): string {
    return sportScoringPlural(this.translate, this.sportConfig.key, this.sportConfig.scoringUnitPlural);
  }

  positionLabel(pos: string): string {
    return sportPositionLabel(this.translate, this.sportConfig.key, pos);
  }

  readonly PIES = ['Derecho', 'Izquierdo', 'Ambidiestro'];

  readonly DISPONIBILIDADES = [
    { value: 'TRANSFER',      label: 'Transferencia',  icon: 'bi-arrow-left-right' },
    { value: 'LOAN',          label: 'Cesión',         icon: 'bi-clock-history' },
    { value: 'FREE_AGENT',    label: 'Agente libre',   icon: 'bi-person-check' },
    { value: 'NOT_AVAILABLE', label: 'No disponible',  icon: 'bi-slash-circle' }
  ];

  readonly PLATFORMS = [
    { value: 'YOUTUBE',   label: 'YouTube',   icon: 'bi-youtube' },
    { value: 'INSTAGRAM', label: 'Instagram', icon: 'bi-instagram' },
    { value: 'TIKTOK',    label: 'TikTok',    icon: 'bi-tiktok' },
    { value: 'VIMEO',     label: 'Vimeo',     icon: 'bi-camera-video' }
  ];

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private loginService: LoginService,
    private sportContextService: SportContextService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const s = this.sportContextService.getSport() || 'futbol';
    this.sportConfig = getSportConfig(s);
    this.langSub = this.translate.onLangChange.subscribe(() => this.cdr.markForCheck());
    const routePlayerId = +this.route.snapshot.paramMap.get('playerId')!;
    this.loginService.usuarioActual.pipe(take(1)).subscribe(user => {
      this.playerId = routePlayerId || user?.playerId || 0;
      this.initForm();
      if (this.playerId) {
        this.loadProfile();
        const sessionId = this.route.snapshot.queryParamMap.get('session_id');
        if (sessionId && !isDemoMode()) {
          this.verifyVideoCheckout(sessionId);
        } else {
          this.checkVideoSubscription();
        }
      } else {
        this.loading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }

  private get headers(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });
  }

  private get uploadHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  initForm(): void {
    this.form = this.fb.group({
      nombre: [''], fechaDeNacimiento: [''], nacionalidad: [''],
      paisResidencia: [''], provinciaResidencia: [''],
      altura: [''], peso: [''], piernaNatural: [''],
      mailContacto: [''], telefonoContacto: [''],
      posicionPrincipal: [''], posicionesSecundarias: [''],
      equipoActual: [''], ligaActual: [''], disponibilidad: [''],
      clubesAnteriores: [''], goles: [''], asistencias: [''],
      torneosImportantes: [''], premiosIndividuales: [''],
      convocatoriasSelecciones: [''],
      fortalezas: [''], areasMejora: [''], descripcion: [''],
      esPublico: [false],
      consentimientoDatos: [false]
    });
  }

  loadProfile(): void {
    if (isDemoMode()) {
      this.profile = this.getDemoProfile();
      this.videos = this.getDemoVideos();
      const p = this.profile;
      this.photoPreview = p.imagenPerfil || null;
      this.cvUrl = p.cvUrl || null;
      this.cvFileName = p.cvUrl ? this.extractFileName(p.cvUrl) : null;
      this.form.patchValue({
        ...p,
        esPublico: p.esPublico === 1,
        consentimientoDatos: p.consentimientoDatos === 1
      });
      this.loading = false;
      return;
    }
    this.loading = true;
    this.http.get<any>(`${this.apiBase}/${this.playerId}/profile`, { headers: this.headers })
      .subscribe({
        next: res => {
          const p = res?.data?.profile;
          this.profile = p;
          this.videos = res?.data?.videos || [];
          if (p) {
            this.photoPreview = p.imagenPerfil || null;
            this.cvUrl = p.cvUrl || null;
            this.cvFileName = p.cvUrl ? this.extractFileName(p.cvUrl) : null;
            this.form.patchValue({
              ...p,
              esPublico: p.esPublico === 1,
              consentimientoDatos: p.consentimientoDatos === 1
            });
          }
          this.loading = false;
        },
        error: () => { this.loading = false; }
      });
  }

  private getDemoProfile(): any {
    return {
      nombre: 'Alejandro García Ruiz',
      fechaDeNacimiento: '2001-03-15',
      nacionalidad: 'Española',
      paisResidencia: 'España',
      provinciaResidencia: 'Madrid',
      altura: 181,
      peso: 76,
      piernaNatural: 'Derecho',
      mailContacto: 'alejandro.garcia@demo.com',
      telefonoContacto: '+34 612 345 678',
      posicionPrincipal: 'Mediocentro',
      posicionesSecundarias: 'Mediocentro Ofensivo, Mediapunta',
      equipoActual: 'Sphaira FC',
      ligaActual: 'Tercera RFEF',
      disponibilidad: 'TRANSFER',
      clubesAnteriores: 'Atlético Norte B, Escuela Sur FC',
      goles: 8,
      asistencias: 12,
      torneosImportantes: 'Copa Autonómica 2024, Torneo de Primavera 2023',
      premiosIndividuales: 'Mejor centrocampista Liga Regional 2023',
      convocatoriasSelecciones: 'Sub-21 España (3 veces)',
      fortalezas: 'Visión de juego, pase largo, liderazgo',
      areasMejora: 'Velocidad en sprints cortos',
      descripcion: 'Mediocentro completo con gran capacidad de distribución y lectura del juego. Referente en el vestuario.',
      esPublico: 1,
      consentimientoDatos: 1,
      imagenPerfil: null,
      cvUrl: null,
    };
  }

  private getDemoVideos(): any[] {
    return [
      { videoId: 1, titulo: 'Highlights Temporada 2024/25', plataforma: 'YOUTUBE', url: 'https://youtube.com/watch?v=demo1' },
      { videoId: 2, titulo: 'Goles Copa Autonómica', plataforma: 'YOUTUBE', url: 'https://youtube.com/watch?v=demo2' },
    ];
  }

  save(): void {
    if (isDemoMode()) {
      this.successMsg = 'Perfil guardado correctamente. (Demo)';
      setTimeout(() => this.successMsg = '', 4000);
      return;
    }
    this.saving = true;
    this.successMsg = '';
    this.errorMsg = '';
    const val = this.form.value;
    const body = {
      ...val,
      esPublico: val.esPublico ? 1 : 0,
      consentimientoDatos: val.consentimientoDatos ? 1 : 0
    };
    const isNew = !this.profile;
    const req = isNew
      ? this.http.post<any>(`${this.apiBase}/${this.playerId}/profile`, body, { headers: this.headers })
      : this.http.put<any>(`${this.apiBase}/${this.playerId}/profile`, body, { headers: this.headers });

    req.subscribe({
      next: () => {
        this.successMsg = 'Perfil guardado correctamente.';
        this.saving = false;
        this.loadProfile();
        setTimeout(() => this.successMsg = '', 4000);
      },
      error: () => { this.errorMsg = 'Error al guardar el perfil.'; this.saving = false; }
    });
  }

  // ── Visibilidad pública con consentimiento ──────────────────

  onTogglePublic(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked && !this.form.get('consentimientoDatos')?.value) {
      // Detener el toggle hasta que acepte el consentimiento
      (event.target as HTMLInputElement).checked = false;
      this.form.get('esPublico')?.setValue(false);
      this.showConsentModal = true;
    }
  }

  acceptConsent(): void {
    this.consentChecked = true;
    this.form.get('consentimientoDatos')?.setValue(true);
    this.form.get('esPublico')?.setValue(true);
    this.showConsentModal = false;
  }

  // ── Foto de perfil ──────────────────────────────────────────

  triggerPhotoUpload(): void {
    this.photoInput?.nativeElement.click();
  }

  onPhotoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => this.photoPreview = e.target?.result as string;
    reader.readAsDataURL(file);
    this.uploadPhoto(file);
  }

  uploadPhoto(file: File): void {
    this.photoUploading = true;
    const fd = new FormData();
    fd.append('file', file);
    this.http.post<any>(`${this.apiBase}/${this.playerId}/photo`, fd, { headers: this.uploadHeaders })
      .subscribe({
        next: res => {
          this.photoPreview = res?.data || this.photoPreview;
          this.photoUploading = false;
        },
        error: () => { this.photoUploading = false; }
      });
  }

  // ── CV (PDF / Word) ─────────────────────────────────────────

  triggerCvUpload(): void {
    this.cvInput?.nativeElement.click();
  }

  onCvSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.cvFileName = file.name;
    this.uploadCv(file);
  }

  uploadCv(file: File): void {
    this.cvUploading = true;
    const fd = new FormData();
    fd.append('file', file);
    this.http.post<any>(`${this.apiBase}/${this.playerId}/cv`, fd, { headers: this.uploadHeaders })
      .subscribe({
        next: res => {
          this.cvUrl = res?.data || null;
          this.cvUploading = false;
        },
        error: () => { this.cvUploading = false; }
      });
  }

  removeCv(): void {
    if (!this.cvUrl && !this.cvFileName) return;
    if (isDemoMode()) {
      this.cvUrl = null;
      this.cvFileName = null;
      return;
    }
    const prevUrl = this.cvUrl;
    const prevName = this.cvFileName;
    this.cvUploading = true;
    this.http.delete<any>(`${this.apiBase}/${this.playerId}/cv`, { headers: this.headers })
      .subscribe({
        next: () => {
          this.cvUrl = null;
          this.cvFileName = null;
          this.cvUploading = false;
        },
        error: () => {
          this.cvUrl = prevUrl;
          this.cvFileName = prevName;
          this.cvUploading = false;
        }
      });
  }

  // ── Posiciones ──────────────────────────────────────────────

  isPositionSelected(pos: string): boolean {
    const val = this.form.get('posicionPrincipal')?.value || '';
    return val.split(',').map((s: string) => s.trim()).includes(pos);
  }

  togglePosition(pos: string): void {
    const ctrl = this.form.get('posicionPrincipal');
    const current: string[] = (ctrl?.value || '').split(',').map((s: string) => s.trim()).filter((s: string) => s);
    const idx = current.indexOf(pos);
    if (idx >= 0) current.splice(idx, 1); else current.push(pos);
    ctrl?.setValue(current.join(', '));
  }

  // ── Vídeos ──────────────────────────────────────────────────

  loadVideos(): void {
    this.videoLoading = true;
    this.http.get<any>(`${this.apiBase}/${this.playerId}/videos`, { headers: this.headers })
      .subscribe({
        next: res => { this.videos = res?.data || []; this.videoLoading = false; },
        error: () => { this.videoLoading = false; }
      });
  }

  addVideo(): void {
    if (!this.newVideoUrl.trim()) return;
    const body = { tipo: 'SOCIAL_LINK', plataforma: this.newVideoPlataforma, url: this.newVideoUrl.trim(), titulo: this.newVideoTitulo };
    this.http.post<any>(`${this.apiBase}/${this.playerId}/video`, body, { headers: this.headers })
      .subscribe({
        next: () => {
          this.showAddVideo = false;
          this.newVideoUrl = '';
          this.newVideoTitulo = '';
          this.loadVideos();
        }
      });
  }

  deleteVideo(videoId: number): void {
    this.http.delete<any>(`${this.apiBase}/${this.playerId}/video/${videoId}`, { headers: this.headers })
      .subscribe({ next: () => this.loadVideos() });
  }

  checkVideoSubscription(): void {
    if (isDemoMode()) {
      this.videoSubscription = true;
      this.videoSubscriptionLoading = false;
      return;
    }
    this.videoSubscriptionLoading = true;
    this.http.get<any>(`${this.apiBase}/${this.playerId}/video-subscription`, { headers: this.headers })
      .subscribe({
        next: res => {
          this.videoSubscription = res?.data?.active === true;
          this.videoSubscriptionLoading = false;
        },
        error: () => { this.videoSubscription = false; this.videoSubscriptionLoading = false; }
      });
  }

  /** Inicia la suscripción de vídeo (2,99 €/mes) vía Stripe Checkout. */
  subscribeVideo(): void {
    if (this.videoSubscriptionLoading) return;
    if (isDemoMode()) {
      this.videoSubscription = true;
      return;
    }
    this.videoSubscriptionLoading = true;
    const returnUrl = window.location.origin + window.location.pathname;
    const body = { successUrl: returnUrl, cancelUrl: returnUrl };
    this.http.post<any>(`${this.apiBase}/${this.playerId}/video-subscription/checkout`, body, { headers: this.headers })
      .subscribe({
        next: res => {
          if (res?.data?.alreadyActive) {
            this.videoSubscription = true;
            this.videoSubscriptionLoading = false;
            return;
          }
          const url = res?.data?.checkoutUrl;
          if (url) { window.location.href = url; }
          else { this.videoSubscriptionLoading = false; }
        },
        error: () => { this.videoSubscriptionLoading = false; }
      });
  }

  /** Verifica la sesión de Checkout al volver del pago y activa la suscripción. */
  private verifyVideoCheckout(sessionId: string): void {
    this.videoSubscriptionLoading = true;
    this.http.post<any>(`${this.apiBase}/${this.playerId}/video-subscription/verify`, { sessionId }, { headers: this.headers })
      .subscribe({
        next: res => {
          this.videoSubscription = res?.data?.active === true;
          this.videoSubscriptionLoading = false;
        },
        error: () => { this.videoSubscriptionLoading = false; this.checkVideoSubscription(); }
      });
  }

  triggerVideoFileUpload(): void {
    this.videoFileInput?.nativeElement.click();
  }

  /**
   * Subida directa a Backblaze B2 mediante URL prefirmada:
   * 1) pedimos la URL PUT, 2) subimos a B2, 3) confirmamos el registro en BD.
   */
  onVideoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (isDemoMode()) {
      this.videoUploading = false;
      if (input) input.value = '';
      return;
    }
    this.videoUploading = true;

    const contentType = file.type || 'video/mp4';
    const urlBody = { filename: file.name, contentType, sizeBytes: file.size };

    this.http.post<any>(`${this.apiBase}/${this.playerId}/video/upload-url`, urlBody, { headers: this.headers })
      .subscribe({
        next: res => {
          const uploadUrl = res?.data?.uploadUrl;
          const fileKey = res?.data?.fileKey;
          if (!uploadUrl || !fileKey) { this.finishVideoUpload(input); return; }
          const putHeaders = new HttpHeaders({ 'Content-Type': contentType });
          this.http.put(uploadUrl, file, { headers: putHeaders, responseType: 'text' })
            .subscribe({
              next: () => this.confirmVideoUpload(input, fileKey, file, contentType),
              error: () => this.finishVideoUpload(input)
            });
        },
        error: () => this.finishVideoUpload(input)
      });
  }

  private confirmVideoUpload(input: HTMLInputElement, fileKey: string, file: File, contentType: string): void {
    const title = file.name.replace(/\.[^/.]+$/, '');
    const body = { fileKey, title, description: '', sizeBytes: file.size, contentType };
    this.http.post<any>(`${this.apiBase}/${this.playerId}/video/confirm`, body, { headers: this.headers })
      .subscribe({
        next: () => { this.finishVideoUpload(input); this.loadVideos(); },
        error: () => this.finishVideoUpload(input)
      });
  }

  private finishVideoUpload(input: HTMLInputElement): void {
    this.videoUploading = false;
    if (input) input.value = '';
  }

  /** Abre un vídeo: los DIRECT (subidos) requieren URL prefirmada; el resto es enlace directo. */
  openVideo(v: any): void {
    if (v?.plataforma === 'DIRECT') {
      const videoId = v.videoId ?? v.playerVideoId;
      this.http.get<any>(`${this.apiBase}/${this.playerId}/video/${videoId}/playback`, { headers: this.headers })
        .subscribe({
          next: res => { const url = res?.data?.url; if (url) window.open(url, '_blank'); }
        });
    } else if (v?.url) {
      window.open(v.url, '_blank');
    }
  }

  isDirectVideo(v: any): boolean {
    return v?.plataforma === 'DIRECT';
  }

  getPlatformIcon(platform: string): string {
    const p = this.PLATFORMS.find(x => x.value === platform);
    return p ? p.icon : 'bi-camera-video';
  }

  getPlatformLabel(platform: string): string {
    const p = this.PLATFORMS.find(x => x.value === platform);
    return p ? p.label : platform;
  }

  // ── Helpers ─────────────────────────────────────────────────

  private extractFileName(url: string): string {
    return url.split('/').pop() || 'curriculum.pdf';
  }

  isCvPdf(): boolean {
    return !!this.cvFileName && this.cvFileName.toLowerCase().endsWith('.pdf');
  }

  getDisponibilidadLabel(value: string): string {
    const d = this.DISPONIBILIDADES.find(x => x.value === value);
    return d ? d.label : value;
  }

  getDisponibilidadIcon(value: string): string {
    const d = this.DISPONIBILIDADES.find(x => x.value === value);
    return d ? d.icon : 'bi-question';
  }
}
