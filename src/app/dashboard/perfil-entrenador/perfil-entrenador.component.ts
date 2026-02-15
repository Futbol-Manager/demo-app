import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { LoginService } from 'src/app/core/services/login/login.service';
import { PlayerService } from 'src/app/core/services/player/player.service';
import { User } from 'src/app/core/models/users/user.model';
import { Response } from 'src/app/core/services/models/response.model';
import { environment } from 'src/environments/environment';
import { Location } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface CoachProfile {
  playerId: number;
  nombre: string;
  apellido: string;
  fechaDeNacimiento: string;
  telefono: string;
  dni: string;
  email: string;
  picturePlayer: string;
  posicion: string;
  nacionalidad: string;
  direccion: string;
  imgDniUno?: string;
  imgDniDos?: string;
}

export interface CoachHistoryEntry {
  temporada: string;
  escudo: string;
  club: string;
  categoria: string;
  nivelEquipo: string;
  posicionTabla: number | string;
  victorias: number;
  empates: number;
  derrotas: number;
  golesAFavor: number;
  golesEnContra: number;
}

@Component({
  selector: 'app-perfil-entrenador',
  templateUrl: './perfil-entrenador.component.html',
  styleUrls: ['./perfil-entrenador.component.scss'],
})
export class PerfilEntrenadorComponent implements OnInit {
  teamId = 0;
  playerId = 0;
  usuarioActual!: User | null;
  userId = 0;

  loading = true;
  activeTab: 'personal' | 'deportivo' = 'personal';

  imageBaseUrlUser: string = environment.images + 'user/';
  imageBaseUrlPlayerDni: string = environment.images + 'playerDni/';

  profile: CoachProfile = {
    playerId: 0,
    nombre: '',
    apellido: '',
    fechaDeNacimiento: '',
    telefono: '',
    dni: '',
    email: '',
    picturePlayer: '',
    posicion: '',
    nacionalidad: '',
    direccion: '',
  };

  /* Historial deportivo */
  historial: CoachHistoryEntry[] = [];
  loadingHistorial = false;

  /* Modal DNI */
  mostrarModalDni = false;
  dniCara1: string | ArrayBuffer | null | undefined = null;
  dniCara2: string | ArrayBuffer | null | undefined = null;
  selectedFileCara1: File | null = null;
  selectedFileCara2: File | null = null;

  /* Documento upload */
  mostrarModalDoc = false;
  listaDocumentos: any[] = [];

  /* Editar perfil */
  editMode = false;
  editProfile: CoachProfile = { ...this.profile };

  /* Demo historial */
  private demoHistorial: CoachHistoryEntry[] = [
    {
      temporada: '2024-2025',
      escudo: '',
      club: 'Mi club actual',
      categoria: 'Juvenil A',
      nivelEquipo: 'División de Honor',
      posicionTabla: 2,
      victorias: 20,
      empates: 4,
      derrotas: 6,
      golesAFavor: 58,
      golesEnContra: 28,
    },
    {
      temporada: '2023-2024',
      escudo: '',
      club: 'Club anterior',
      categoria: 'Cadete A',
      nivelEquipo: 'Preferente',
      posicionTabla: 1,
      victorias: 24,
      empates: 3,
      derrotas: 3,
      golesAFavor: 72,
      golesEnContra: 18,
    },
    {
      temporada: '2022-2023',
      escudo: '',
      club: 'Otro club',
      categoria: 'Infantil B',
      nivelEquipo: '1ª División',
      posicionTabla: 4,
      victorias: 15,
      empates: 7,
      derrotas: 8,
      golesAFavor: 45,
      golesEnContra: 33,
    },
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private loginService: LoginService,
    private playerService: PlayerService,
    private snackBar: MatSnackBar,
    private location: Location,
  ) {}

  ngOnInit(): void {
    this.loginService.usuarioActual.subscribe((user) => {
      this.usuarioActual = user;
      this.userId = user!.userId;
      this.playerId = user!.playerId;
    });

    this.route.params.subscribe((params) => {
      this.teamId = +params['teamId'] || 0;
      if (params['playerId']) {
        this.playerId = +params['playerId'];
      }
    });

    this.cargarPerfil();
    this.cargarHistorial();
  }

  /* =========================
     CARGA DATOS
  ========================= */

  cargarPerfil(): void {
    this.loading = true;

    if (this.playerId) {
      this.playerService.getPlayers(String(this.teamId)).subscribe(
        (response: any) => {
          if (response?.data) {
            const players = response.data.players || response.data;
            if (Array.isArray(players)) {
              const found = players.find((p: any) => p.playerId === this.playerId);
              if (found) {
                this.profile = {
                  playerId: found.playerId,
                  nombre: found.nombre || '',
                  apellido: found.apellido || '',
                  fechaDeNacimiento: found.fechaDeNacimiento || '',
                  telefono: found.telefono || '',
                  dni: found.dni || '',
                  email: found.email || '',
                  picturePlayer: found.picturePlayer || '',
                  posicion: found.posicion || '',
                  nacionalidad: found.nacionalidad || '',
                  direccion: found.direccion || '',
                  imgDniUno: found.imgDniUno || '',
                  imgDniDos: found.imgDniDos || '',
                };
              }
            }
          }
          this.loading = false;
        },
        () => {
          this.loading = false;
        }
      );
    } else {
      // Si no tenemos playerId, cargamos los datos del usuario actual
      this.profile = {
        playerId: 0,
        nombre: this.usuarioActual?.firstName || '',
        apellido: this.usuarioActual?.secondName || '',
        fechaDeNacimiento: '',
        telefono: this.usuarioActual?.mobile || '',
        dni: '',
        email: this.usuarioActual?.mail || '',
        picturePlayer: this.usuarioActual?.pictureUser || '',
        posicion: '',
        nacionalidad: '',
        direccion: '',
      };
      this.loading = false;
    }
  }

  cargarHistorial(): void {
    this.loadingHistorial = true;
    // TODO: Reemplazar con llamada real
    setTimeout(() => {
      this.historial = this.demoHistorial;
      this.loadingHistorial = false;
    }, 600);
  }

  /* =========================
     TABS
  ========================= */

  setTab(tab: 'personal' | 'deportivo'): void {
    this.activeTab = tab;
  }

  /* =========================
     EDITAR PERFIL
  ========================= */

  enableEdit(): void {
    this.editProfile = { ...this.profile };
    this.editMode = true;
  }

  cancelEdit(): void {
    this.editMode = false;
  }

  saveProfile(): void {
    // TODO: Llamar al servicio real para guardar los datos
    this.profile = { ...this.editProfile };
    this.editMode = false;
    this.snackBar.open('Perfil actualizado correctamente', 'Cerrar', { duration: 3000 });
  }

  /* =========================
     DNI
  ========================= */

  abrirModalDni(): void {
    this.mostrarModalDni = true;
  }

  cerrarModalDni(): void {
    this.dniCara1 = null;
    this.dniCara2 = null;
    this.mostrarModalDni = false;
  }

  onFileChangeDni(event: any, cara: string): void {
    const file = event.target.files[0];
    if (file) {
      if (file.type !== 'image/png' && file.type !== 'image/jpeg') {
        alert('Formato no válido. Solo PNG o JPEG.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        if (cara === 'cara1') {
          this.dniCara1 = e.target?.result;
          this.selectedFileCara1 = file;
        } else {
          this.dniCara2 = e.target?.result;
          this.selectedFileCara2 = file;
        }
      };
      reader.readAsDataURL(file);
    }
  }

  /* =========================
     UTILIDADES
  ========================= */

  formatFecha(fecha: string): string {
    if (!fecha) return '—';
    const iso = /^\d{4}-\d{2}-\d{2}$/;
    if (iso.test(fecha)) {
      const [y, m, d] = fecha.split('-');
      return `${d}/${m}/${y}`;
    }
    return fecha;
  }

  calcularEdad(fecha: string): number {
    if (!fecha) return 0;
    const nac = new Date(fecha);
    const hoy = new Date();
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad;
  }

  goBack(): void {
    this.location.back();
  }
}
