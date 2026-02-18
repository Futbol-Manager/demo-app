import { Component, OnInit } from '@angular/core';
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
  private apiBase = `${environment.apiUrl}/scouting/player`;

  playerId = 0;
  form!: FormGroup;
  loading = true;
  saving = false;
  profile: any = null;
  videos: any[] = [];
  videoLoading = false;

  showAddVideo = false;
  newVideoPlataforma = 'YOUTUBE';
  newVideoUrl = '';
  newVideoTitulo = '';

  readonly POSITIONS = [
    'Portero', 'Defensa Central', 'Lateral Derecho', 'Lateral Izquierdo',
    'Carrilero Derecho', 'Carrilero Izquierdo', 'Mediocentro Defensivo',
    'Mediocentro', 'Mediocentro Ofensivo', 'Mediapunta',
    'Extremo Derecho', 'Extremo Izquierdo', 'Segundo Delantero', 'Delantero Centro'
  ];

  readonly PIES = ['Derecho', 'Izquierdo', 'Ambidiestro'];

  readonly DISPONIBILIDADES = [
    { value: 'TRANSFER', label: 'Transferencia' },
    { value: 'LOAN', label: 'Cesión' },
    { value: 'FREE_AGENT', label: 'Agente libre' },
    { value: 'NOT_AVAILABLE', label: 'No disponible' }
  ];

  readonly PLATFORMS = [
    { value: 'YOUTUBE', label: 'YouTube', icon: 'bi-youtube' },
    { value: 'INSTAGRAM', label: 'Instagram', icon: 'bi-instagram' },
    { value: 'TIKTOK', label: 'TikTok', icon: 'bi-tiktok' },
    { value: 'VIMEO', label: 'Vimeo', icon: 'bi-camera-video' }
  ];

  successMsg = '';
  errorMsg = '';

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private loginService: LoginService
  ) {}

  ngOnInit(): void {
    this.loginService.usuarioActual.subscribe(user => {
      this.playerId = user?.playerId || 0;
      this.initForm();
      if (this.playerId) this.loadProfile();
    });
  }

  private get headers(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });
  }

  initForm(): void {
    this.form = this.fb.group({
      nombre: [''], fechaDeNacimiento: [''], nacionalidad: [''],
      altura: [''], peso: [''], piernaNatural: [''],
      mailContacto: [''], telefonoContacto: [''],
      posicionPrincipal: [''], posicionesSecundarias: [''],
      ligaActual: [''], disponibilidad: [''],
      clubesAnteriores: [''], goles: [''], asistencias: [''],
      torneosImportantes: [''], premiosIndividuales: [''],
      fortalezas: [''], areasMejora: [''], descripcion: [''],
      esPublico: [false]
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
            this.form.patchValue({
              ...p,
              esPublico: p.esPublico === 1
            });
          }
          this.loading = false;
        },
        error: () => { this.loading = false; }
      });
  }

  save(): void {
    this.saving = true;
    this.successMsg = ''; this.errorMsg = '';
    const val = this.form.value;
    const body = { ...val, esPublico: val.esPublico ? 1 : 0 };
    const isNew = !this.profile;
    const req = isNew
      ? this.http.post<any>(`${this.apiBase}/${this.playerId}/profile`, body, { headers: this.headers })
      : this.http.put<any>(`${this.apiBase}/${this.playerId}/profile`, body, { headers: this.headers });

    req.subscribe({
      next: () => {
        this.successMsg = 'PLAYER_SCOUTING.SAVED';
        this.saving = false;
        this.loadProfile();
        setTimeout(() => this.successMsg = '', 3000);
      },
      error: () => { this.errorMsg = 'Error al guardar el perfil.'; this.saving = false; }
    });
  }

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
          this.newVideoUrl = ''; this.newVideoTitulo = '';
          this.loadVideos();
        }
      });
  }

  deleteVideo(videoId: number): void {
    this.http.delete<any>(`${this.apiBase}/${this.playerId}/video/${videoId}`, { headers: this.headers })
      .subscribe({ next: () => this.loadVideos() });
  }

  getPlatformIcon(platform: string): string {
    const p = this.PLATFORMS.find(x => x.value === platform);
    return p ? p.icon : 'bi-camera-video';
  }

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
}
