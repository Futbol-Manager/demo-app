import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { LoginService } from 'src/app/core/services/login/login.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-scouting-player-profile',
  templateUrl: './scouting-player-profile.component.html',
  styleUrls: ['./scouting-player-profile.component.scss']
})
export class ScoutingPlayerProfileComponent implements OnInit {
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

  readonly POSITIONS = [
    'Portero', 'Defensa Central', 'Lateral Derecho', 'Lateral Izquierdo',
    'Carrilero Derecho', 'Carrilero Izquierdo', 'Mediocentro Defensivo',
    'Mediocentro', 'Mediocentro Ofensivo', 'Mediapunta',
    'Extremo Derecho', 'Extremo Izquierdo', 'Segundo Delantero', 'Delantero Centro'
  ];

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
    private loginService: LoginService
  ) {}

  ngOnInit(): void {
    const routePlayerId = +this.route.snapshot.paramMap.get('playerId')!;
    this.loginService.usuarioActual.subscribe(user => {
      this.playerId = routePlayerId || user?.playerId || 0;
      this.initForm();
      if (this.playerId) {
        this.loadProfile();
        this.checkVideoSubscription();
      } else {
        this.loading = false;
      }
    });
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

  save(): void {
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
    this.cvUrl = null;
    this.cvFileName = null;
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

  triggerVideoFileUpload(): void {
    this.videoFileInput?.nativeElement.click();
  }

  onVideoFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.videoUploading = true;
    const fd = new FormData();
    fd.append('file', file);
    this.http.post<any>(`${this.apiBase}/${this.playerId}/video/upload`, fd, { headers: this.uploadHeaders })
      .subscribe({
        next: () => { this.videoUploading = false; this.loadVideos(); },
        error: () => { this.videoUploading = false; }
      });
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
