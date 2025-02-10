import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
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

  partidos: any = [
    /*{ id: 1, imgEquipo: 'https://appsphairatech.com/images/user/2108952-imguser.png', name: 'Seseña FC', resultado: '2-1', letra: 'V' },
    { id: 2, imgEquipo: 'https://appsphairatech.com/images/user/277699-imguser.png', name: 'Real Betis', resultado: '1-0', letra: 'D' },
    { id: 3, imgEquipo: 'https://appsphairatech.com/images/user/676343-imguser.png', name: 'Salamanca', resultado: '3-2', letra: 'E' },
    { id: 4, imgEquipo: 'https://appsphairatech.com/images/user/7672259-imguser.jpg', name: 'Sevilla CF', resultado: '0-0', letra: 'V' },
    { id: 5, imgEquipo: 'https://appsphairatech.com/images/user/755157-imguser.jpg', name: 'Getafe City', resultado: '4-1', letra: 'D' },
    { id: 6, imgEquipo: 'https://appsphairatech.com/images/user/676343-imguser.png', name: 'Murcia FC', resultado: '2-2', letra: 'E' }*/
  ];

  /*galerias: any = {
    1: [{ urlImg: 'https://appsphairatech.com/images/user/5889498-imgplayer.jpeg', playerId: 123 }, { urlImg: 'https://appsphairatech.com/images/user/1531104-imgplayer.jpeg', userId: 456 }],
    2: [{ urlImg: 'https://appsphairatech.com/images/user/5889498-imgplayer.jpeg', playerId: 789 }],
    3: [{ urlImg: 'https://appsphairatech.com/images/user/5889498-imgplayer.jpeg', playerId: 123 }],
    4: [],
    5: [],
    6: []
  };*/

  currentIndex = 0;
  selectedPartido: any = null;
  imageBaseUrlGaleria: string = environment.images + 'galeria/';

  postpartidoSelected = 0;
  imagenSeleccionada: string | null = null;

  mostrarModalYoutube = false;
  youtubeUrl = '';

  constructor(
    private loginService: LoginService,
    private router: Router,
    private route: ActivatedRoute,
    private teamService: TeamService,
    private http: HttpClient,
    private clubService: ClubService,
    private playerService: PlayerService,
    private location: Location,
    private sanitizer: DomSanitizer) { }

  ngOnInit(): void {
    // Suscríbete al observable del servicio para obtener el usuario actual
    this.loginService.usuarioActual.subscribe(user => {
      this.usuarioActual = user;
      this.userId = user?.userId;
      this.playerIdUserActual = user?.playerId;
      // Suscribirse a los cambios en los parámetros de la URL
      this.route.params.subscribe(params => {
        // Obtener el valor de teamId de los parámetros
        this.teamId = +params['teamId'];  // El + convierte el valor a número
        this.playerId = +params['playerId'];  // El + convierte el valor a número
        //console.log('teamId:', this.teamId);
      });
    });

    this.getListaPostpartidos();
  }

  getListaPostpartidos() {
    this.playerService.getListPlayersByTeamForGalery(this.teamId).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response && response.data && Array.isArray(response.data)) {
          // Mapea los datos bajo 'data' a instancias del modelo Team
          this.partidos = response.data;
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
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
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  eliminarImagen(galeriaPartidoId: number, index: number) {
    if (confirm('¿Seguro que quieres eliminar esta imagen?')) {
      this.playerService.getDeleteGaleriaPartidos(galeriaPartidoId).subscribe(
        (response: Response) => {
          this.selectedPartido = response.data;
        },
        (error) => {
          console.error('Error al cargar el listado de equipos', error);
        }
      );
      this.selectedPartido.splice(index, 1);
    }
  }

  subirImagen(event: any) {
    const file = event.target.files[0];
    if (file && this.postpartidoSelected != 0) {
      this.playerService.uploadImgGaleria(file, this.postpartidoSelected, this.teamId, this.playerId).subscribe(
        (response: Response) => {
          this.selectedPartido.push(response.data);
        },
        (error) => {
          console.error('Error al cargar el listado de equipos', error);
        }
      );
    }
  }

  abrirModal(url: string) {
    this.imagenSeleccionada = url;
  }

  cerrarModal() {
    this.imagenSeleccionada = null;
  }

  abrirModalYoutube() {
    this.mostrarModalYoutube = true;
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

    // Agregar video a la galería
    /*this.selectedPartido.push({
      urlImg: videoId, // Solo guardamos el ID del video
      tipo: 1, // Indica que es un video
      playerId: this.playerId // ID del usuario actual (para permisos)
    });*/

    this.playerService.setVideoYouTubeGaleria(this.postpartidoSelected, this.teamId, this.playerId, videoId).subscribe(
      (response: Response) => {
        this.selectedPartido.push(response.data);
        this.cerrarModalYoutube();
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  // Extrae el ID del video de YouTube desde cualquier enlace
  extraerIdYoutube(url: string): string | null {
    const regex = /(?:youtube\.com\/.*v=|youtu\.be\/)([^&?]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  // Devuelve la URL embebida de YouTube
  /*getYouTubeEmbedUrl(videoId: string): string {
    return `https://www.youtube.com/embed/${videoId}`;
  }*/

  getYouTubeEmbedUrl(videoId: string): SafeResourceUrl {
    const url = `https://www.youtube.com/embed/${videoId}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }


}
