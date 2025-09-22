import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router, ActivatedRoute } from '@angular/router';
import { LoginService } from 'src/app/core/services/login/login.service';
import { PlayerService } from 'src/app/core/services/player/player.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { TrainingService } from 'src/app/core/services/training/training.service';
import { Response } from 'src/app/core/services/models/response.model';
import { ClubService } from 'src/app/core/services/club/club.service';
import { User } from 'src/app/core/models/users/user.model';

@Component({
  selector: 'app-inicio-federacion',
  templateUrl: './inicio-federacion.component.html',
  styleUrls: ['./inicio-federacion.component.scss']
})
export class InicioFederacionComponent implements OnInit {
  noPicture = false;
  pictureClub = '';
  listClubes: any[] = [];         // listado filtrado que se muestra
  allClubes: any[] = [];          // listado original completo
  usuarioActual!: User | null;
  userIdClub = 0;
  userId = 0;
  temporadaStoredValue = '2025';
  temporada = '2025';
  busqueda: string = '';          // texto del input de búsqueda
  mailAdd = '';
  loading = true;

  constructor(
    private router: Router,
    private clubService: ClubService,
    private loginService: LoginService) { }

  ngOnInit(): void {
    this.loginService.usuarioActual.subscribe(user => {
      this.usuarioActual = user;
      this.userId = this.usuarioActual!.userId;

      this.loadClubes();
    });
  }

  loadClubes() {
    this.clubService.getListClubes(this.userId, this.temporadaStoredValue).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.allClubes = response.data;   // guardamos todos
          this.listClubes = [...this.allClubes]; // iniciamos listado mostrado
          this.loading = false;
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  copyLink() {
    const link = 'https://appsphairatech.com/registro';
    navigator.clipboard.writeText(link)
      .then(() => {
        console.log('Enlace copiado al portapapeles:', link);
        // Opcional: puedes usar un toast o alert para avisar al usuario
        alert('¡Link copiado! Compartelo con el club deseado. La contraseña es ADDFEDESPHAIRA25-' + this.userId);
      })
      .catch(err => {
        console.error('Error al copiar el enlace:', err);
        alert('No se pudo copiar el enlace. Intenta de nuevo.');
      });
  }

  filtrarClubes(): void {
    const termino = this.busqueda.toLowerCase().trim();
    if (!termino) {
      this.listClubes = [...this.allClubes]; // si no hay texto, mostramos todo
    } else {
      this.listClubes = this.allClubes.filter(club =>
        club.name.toLowerCase().includes(termino) ||
        club.userIdClub.toString().includes(termino)
      );
    }
  }

  // Método para redirigir a la pantalla de jugadores con el teamId
  irAPantalla(id: number): void {
    switch (id) {
      case 1:
        this.router.navigate(['/dashboard/info-jugadores-federacion']);
        break;
      case 2:
        this.router.navigate(['/dashboard/cuadro-de-mandos/puntuaciones', 0]);
        break;
      case 3:
        this.router.navigate(['/dashboard/cuadro-de-mandos/entrenamientos', 0]);
        break;
    }
  }

  // Método para navegar a la pantalla de calendario
  navegarAClub(userIdClub: number): void {
    localStorage.setItem('userIdClub', userIdClub.toString());
    this.router.navigate(['/dashboard/inicio']);
  }

  cargarListadoEquiposForClub(): void {
    localStorage.setItem('temporada', this.temporada);
    this.temporadaStoredValue = this.temporada;

    this.clubService.getListClubes(this.userId, this.temporadaStoredValue).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.listClubes = response.data;
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  setNewClubInFederacion(): void {
    if (this.mailAdd == '' || !this.mailAdd.toLowerCase().includes('@')) {
      alert('Por favor introduce un email válido y del club existente en Spaira para agregarlo a la federación.');
      return;
    }

    localStorage.setItem('temporada', this.temporada);
    this.temporadaStoredValue = this.temporada;

    this.clubService.setNewClubInFederacion(this.userId, this.mailAdd, this.temporadaStoredValue).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data) {
          alert('Club agregado ✅');
          this.loadClubes();
        } else {
          alert('Ese mail no existe o no hay ningún club registrado. ❌');
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

}
