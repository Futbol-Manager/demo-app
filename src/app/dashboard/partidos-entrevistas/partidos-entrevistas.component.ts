import { HttpClient } from '@angular/common/http';
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { User } from 'src/app/core/models/users/user.model';
import { ClubService } from 'src/app/core/services/club/club.service';
import { LoginService } from 'src/app/core/services/login/login.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { Location } from '@angular/common';
import { PlayerService } from 'src/app/core/services/player/player.service';
import { Response } from 'src/app/core/services/models/response.model';
import { environment } from 'src/environments/environment';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-partidos-entrevistas',
  templateUrl: './partidos-entrevistas.component.html',
  styleUrls: ['./partidos-entrevistas.component.scss']
})
export class PartidosEntrevistasComponent implements OnInit {

  teamId = 0;
  playerId = 0;
  userId: any = 123;
  playerIdUserActual: any = 0;
  usuarioActual!: User | null;
  clubId = 0;
  showOpcionesOk = false;

  partidos: any = [];

  currentIndex = 0;
  selectedPartido: any = null;
  imageBaseUrlGaleria: string = environment.images + 'galeria/';

  postpartidoSelected = 0;
  imagenSeleccionada: string | null = null;

  mostrarModalYoutube = false;
  youtubeUrl = '';

  fotos: any[] = [];
  videos: any[] = [];
  showGalery = false;

  /** Totales globales de fotos y vídeos de todos los partidos */
  totalFotosGlobal = 0;
  totalVideosGlobal = 0;

  selectedFile!: File;
  imagePreviewUrl: string | ArrayBuffer | null = null;
  showPreview = false;
  imageBaseUrlUser: string = environment.images + 'user/';
  rotateAngle = 0;
  showbtnupimg = false;

  /** Pestaña activa: 'fotos' | 'videos' */
  activeTab: 'fotos' | 'videos' = 'fotos';

  /** Control de suscripción para vídeos */
  hasVideoSubscription = true;

  /** Modal para agregar contenido por URL */
  showUrlModal = false;
  urlModalType: 'image' | 'video' = 'image';
  urlInput = '';
  urlError = '';

  /** Modal de suscripción PRO para vídeos desde dispositivo */
  showProModal = false;

  /** Controla si se muestra el panel de subida de fotos */
  showUploadPanel = false;

  /** Controla si se muestra el panel de subida de vídeo por archivo */
  showVideoUploadPanel = false;
  selectedVideoFile!: File;
  videoPreviewUrl: string | null = null;

  @ViewChild('videoFileInput') videoFileInput!: ElementRef<HTMLInputElement>;

  /** Drag state para upload */
  isDragging = false;

  iconos: { [key: string]: string } = {
    'V': '🟢',
    'E': '🟡',
    'D': '🔴'
  };

  constructor(
    private loginService: LoginService,
    public router: Router,
    private route: ActivatedRoute,
    private teamService: TeamService,
    private http: HttpClient,
    private clubService: ClubService,
    private playerService: PlayerService,
    private location: Location,
    private sanitizer: DomSanitizer) { }

  ngOnInit(): void {
    this.loginService.usuarioActual.subscribe(user => {
      this.usuarioActual = user;
      this.userId = user?.userId;
      this.playerIdUserActual = user?.playerId;
      this.route.params.subscribe(params => {
        this.teamId = +params['teamId'];
        this.playerId = +params['playerId'];
      });
    });

    this.loadVideoSubscription();
    this.getListaPostpartidos();
  }

  /** Carga estado de suscripción de vídeo (mock - integrar con API real) */
  loadVideoSubscription(): void {
    const stored = localStorage.getItem('video_subscription');
    this.hasVideoSubscription = stored === 'true';
  }

  setTab(tab: 'fotos' | 'videos'): void {
    this.activeTab = tab;
  }

  getListaPostpartidos() {
    this.playerService.getListPlayersByTeamForGalery(this.teamId).subscribe(
      (response: Response) => {
        if (response && response.data && Array.isArray(response.data)) {
          this.partidos = response.data;
          this.calcularTotalesGlobales();
          
          // Seleccionar automáticamente el primer partido si existe
          if (this.partidos.length > 0) {
            this.seleccionarPartido(this.partidos[0]);
          }
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  /** Calcula los totales globales de fotos y vídeos de todos los partidos */
  calcularTotalesGlobales(): void {
    this.totalFotosGlobal = 0;
    this.totalVideosGlobal = 0;
    for (const partido of this.partidos) {
      this.totalFotosGlobal += partido.totalFotos || 0;
      this.totalVideosGlobal += partido.totalVideos || 0;
    }
  }

  goBack(): void {
    this.location.back();
  }

  next() {
    if (this.currentIndex + 4 < this.partidos.length) {
      this.currentIndex += 4;
    }
  }

  prev() {
    if (this.currentIndex - 4 >= 0) {
      this.currentIndex -= 4;
    }
  }

  getVisibleItems() {
    return this.partidos.slice(this.currentIndex, this.currentIndex + 4);
  }

  seleccionarPartido(partido: any) {
    this.postpartidoSelected = partido.id;
    this.playerService.getListGaleriaPartidos(partido.id).subscribe(
      (response: Response) => {
        this.selectedPartido = response.data;
        if (this.selectedPartido) {
          this.fotos = [];
          this.videos = [];
          for (let index = 0; index < this.selectedPartido.length; index++) {
            if (this.selectedPartido[index].tipo === 0) {
              this.fotos.push(this.selectedPartido[index]);
            } else {
              this.videos.push(this.selectedPartido[index]);
            }
          }
        }
        this.showGalery = true;
      },
      (error) => {
        console.error('Error al cargar la galería', error);
      }
    );
  }

  eliminarImagen(galeriaPartidoId: number, index: number, tipo: number) {
    if (confirm('¿Seguro que quieres eliminar este elemento?')) {
      this.playerService.getDeleteGaleriaPartidos(galeriaPartidoId).subscribe(
        (response: Response) => {
          this.selectedPartido = response.data;
          if (tipo === 0) {
            this.fotos = this.fotos.filter(img => img.galeriaPartidoId !== galeriaPartidoId);
          } else {
            this.videos = this.videos.filter(v => v.galeriaPartidoId !== galeriaPartidoId);
          }
        },
        (error) => {
          console.error('Error al eliminar', error);
        }
      );
    }
  }

  // ─── Upload de imagen por archivo ───────────────────────────

  onSubmit() {
    if (this.selectedFile) {
      this.playerService.uploadImgGaleria(this.selectedFile, this.postpartidoSelected, this.teamId, this.playerId).subscribe(
        (response: Response) => {
          this.fotos.push(response.data);
          this.resetUpload();
          this.showUploadPanel = false;
        },
        (error) => {
          console.error('Error al subir imagen', error);
        }
      );
    }
  }

  resetUpload(): void {
    this.selectedFile = null as any;
    this.imagePreviewUrl = null;
    this.showPreview = false;
    this.showbtnupimg = false;
    this.rotateAngle = 0;
  }

  rotateImage() {
    if (!this.imagePreviewUrl) return;
    if (typeof this.imagePreviewUrl !== 'string') return;

    const img = new Image();
    img.src = this.imagePreviewUrl;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      this.rotateAngle = (this.rotateAngle + 90) % 360;

      if (this.rotateAngle === 90 || this.rotateAngle === 270) {
        canvas.width = img.height;
        canvas.height = img.width;
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((this.rotateAngle * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      this.imagePreviewUrl = canvas.toDataURL('image/jpeg');
      canvas.toBlob((blob) => {
        if (blob) {
          this.selectedFile = new File([blob], 'rotated-image.jpg', { type: 'image/jpeg' });
        }
      }, 'image/jpeg');
    };
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file && (file.type === 'image/png' || file.type === 'image/jpeg')) {
      this.selectedFile = file;
      this.showbtnupimg = true;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const result = e.target.result;
        if (typeof result === 'string') {
          this.imagePreviewUrl = result;
          this.showPreview = true;
        }
      };
      reader.readAsDataURL(file);
    } else {
      this.showbtnupimg = false;
    }
  }

  // ─── Drag & Drop ────────────────────────────────────────────

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'image/png' || file.type === 'image/jpeg') {
        this.selectedFile = file;
        this.showbtnupimg = true;
        const reader = new FileReader();
        reader.onload = (e: any) => {
          if (typeof e.target.result === 'string') {
            this.imagePreviewUrl = e.target.result;
            this.showPreview = true;
          }
        };
        reader.readAsDataURL(file);
      }
    }
  }

  // ─── Upload de vídeo por archivo (PRO) ─────────────────────

  openProModal(): void {
    this.showProModal = true;
  }

  closeProModal(): void {
    this.showProModal = false;
  }

  goToSubscription(): void {
    this.showProModal = false;
    this.router.navigate(['/dashboard/suscripcion']);
  }

  triggerVideoFileUpload(): void {
    this.showVideoUploadPanel = true;
    this.videoPreviewUrl = null;
    this.selectedVideoFile = null as any;
    setTimeout(() => {
      if (this.videoFileInput) {
        this.videoFileInput.nativeElement.click();
      }
    }, 100);
  }

  onVideoFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && (file.type === 'video/mp4' || file.type === 'video/quicktime' || file.type === 'video/webm')) {
      if (file.size > 100 * 1024 * 1024) {
        alert('El vídeo supera el tamaño máximo de 100MB');
        return;
      }
      this.selectedVideoFile = file;
      this.videoPreviewUrl = URL.createObjectURL(file);
    }
  }

  onSubmitVideo(): void {
    if (this.selectedVideoFile) {
      this.playerService.uploadImgGaleria(this.selectedVideoFile, this.postpartidoSelected, this.teamId, this.playerId).subscribe(
        (response: Response) => {
          this.videos.push(response.data);
          this.resetVideoUpload();
        },
        (error) => {
          console.error('Error al subir vídeo', error);
          alert('Error al subir el vídeo. Inténtalo de nuevo.');
        }
      );
    }
  }

  resetVideoUpload(): void {
    if (this.videoPreviewUrl) {
      URL.revokeObjectURL(this.videoPreviewUrl);
    }
    this.selectedVideoFile = null as any;
    this.videoPreviewUrl = null;
    this.showVideoUploadPanel = false;
    if (this.videoFileInput) {
      this.videoFileInput.nativeElement.value = '';
    }
  }

  getVideoFileUrl(video: any): string {
    return this.imageBaseUrlGaleria + video.urlImg;
  }

  // ─── Modal URL (imagen o vídeo por URL) ─────────────────────

  openUrlModal(type: 'image' | 'video'): void {
    this.urlModalType = type;
    this.urlInput = '';
    this.urlError = '';
    this.showUrlModal = true;
  }

  closeUrlModal(): void {
    this.showUrlModal = false;
    this.urlInput = '';
    this.urlError = '';
  }

  submitUrl(): void {
    const url = this.urlInput.trim();
    if (!url) {
      this.urlError = 'Introduce una URL válida';
      return;
    }

    if (this.urlModalType === 'video') {
      this.addVideoByUrl(url);
    } else {
      this.addImageByUrl(url);
    }
  }

  /** Agrega una imagen por URL (la guarda como vídeo YouTube con tipo especial o la sube al backend) */
  addImageByUrl(url: string): void {
    if (!this.isValidUrl(url)) {
      this.urlError = 'La URL no es válida. Introduce una URL completa (https://...)';
      return;
    }
    this.closeUrlModal();
    // Por ahora simula que es una imagen externa
    this.fotos.push({
      galeriaPartidoId: Date.now(),
      urlImg: url,
      tipo: 0,
      playerId: this.playerId,
      isExternal: true
    });
  }

  /** Agrega un vídeo por URL de YouTube */
  addVideoByUrl(url: string): void {
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      this.urlError = 'No se pudo procesar la URL. Pega un enlace válido de YouTube (ej: https://www.youtube.com/watch?v=xxxxx)';
      return;
    }

    this.playerService.setVideoYouTubeGaleria(this.postpartidoSelected, this.teamId, this.playerId, videoId).subscribe(
      (response: Response) => {
        this.videos.push(response.data);
        this.closeUrlModal();
      },
      (error) => {
        console.error('Error al agregar vídeo', error);
        this.urlError = 'Error al guardar el vídeo. Inténtalo de nuevo.';
      }
    );
  }

  // ─── Parseo multi-plataforma de vídeo ───────────────────────

  /** Extrae el ID del vídeo de YouTube desde múltiples formatos de URL */
  extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?.*v=)([^&?\s#]+)/,       // youtube.com/watch?v=ID
      /(?:youtu\.be\/)([^&?\s#]+)/,                      // youtu.be/ID
      /(?:youtube\.com\/embed\/)([^&?\s#/]+)/,           // youtube.com/embed/ID
      /(?:youtube\.com\/shorts\/)([^&?\s#/]+)/,          // youtube.com/shorts/ID
      /(?:youtube\.com\/live\/)([^&?\s#/]+)/,            // youtube.com/live/ID
      /(?:youtube\.com\/v\/)([^&?\s#/]+)/,               // youtube.com/v/ID
      /(?:youtube-nocookie\.com\/embed\/)([^&?\s#/]+)/,  // youtube-nocookie.com/embed/ID
    ];

    for (const regex of patterns) {
      const match = url.match(regex);
      if (match && match[1]) return match[1];
    }

    return null;
  }

  /** Devuelve la URL embed sanitizada para YouTube */
  getEmbedUrl(video: any): SafeResourceUrl {
    const link = video.link || '';
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${link}`);
  }

  /** Devuelve el nombre de la plataforma */
  getVideoPlatform(video: any): string {
    return 'YouTube';
  }

  isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // ─── Modales ────────────────────────────────────────────────

  abrirModal(url: string) {
    this.imagenSeleccionada = url;
  }

  cerrarModal() {
    this.imagenSeleccionada = null;
  }

  abrirModalYoutube() {
    this.openUrlModal('video');
  }

  cerrarModalYoutube() {
    this.mostrarModalYoutube = false;
    this.youtubeUrl = '';
  }

  agregarVideoYoutube() {
    if (!this.youtubeUrl.includes('youtube.com') && !this.youtubeUrl.includes('youtu.be')) {
      alert('Introduce un enlace válido de YouTube');
      return;
    }
    const videoId = this.extraerIdYoutube(this.youtubeUrl);
    if (!videoId) {
      alert('No se pudo extraer el ID del video.');
      return;
    }
    this.playerService.setVideoYouTubeGaleria(this.postpartidoSelected, this.teamId, this.playerId, videoId).subscribe(
      (response: Response) => {
        this.videos.push(response.data);
        this.cerrarModalYoutube();
      },
      (error) => {
        console.error('Error al cargar el vídeo', error);
      }
    );
  }

  extraerIdYoutube(url: string): string | null {
    const regex = /(?:youtube\.com\/.*v=|youtu\.be\/)([^&?]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  getYouTubeEmbedUrl(videoId: string): SafeResourceUrl {
    const url = `https://www.youtube.com/embed/${videoId}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  /** Devuelve la URL de la imagen (local o externa) */
  getImageUrl(foto: any): string {
    if (foto.isExternal) return foto.urlImg;
    return this.imageBaseUrlGaleria + foto.urlImg;
  }
}
