import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { filter, distinctUntilChanged } from 'rxjs';
import { ClubService } from 'src/app/core/services/club/club.service';
import { LoginService } from 'src/app/core/services/login/login.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { Response } from 'src/app/core/services/models/response.model';
import { User } from 'src/app/core/models/users/user.model';

@Component({
  selector: 'app-inicio-deportes',
  templateUrl: './inicio-deportes.component.html',
  styleUrls: ['./inicio-deportes.component.scss']
})
export class InicioDeportesComponent implements OnInit {

  datosCargados: boolean = false;
  usuarioActual!: User | null;
  listTeam: any[] = []; // Define una variable para almacenar el listado de equipos
  listHijos: any[] = []; // Define una variable para almacenar el listado de hijos
  showModal = false;
  clubList: any[] = [];
  clubId: number = 0;
  pictureClub = '';
  noPicture = false;
  showModalSubirJugadores = false;
  fileName: string | null = null;
  showUploadButton: boolean = false;
  selectedFile: File | null = null;
  userId = 0;
  profileId = 0;
  datosNoCargados = false;
  datosCargando = true;
  numEquipos = 0;

  constructor(
    private loginService: LoginService,
    private router: Router,
    private teamService: TeamService,
    private clubService: ClubService,
    private fb: FormBuilder,) { }

  ngOnInit(): void {
    let datosYaCargados = false; // Bandera para evitar múltiples cargas

    this.loginService.usuarioActual
      .pipe(
        filter(user => !!user), // Solo procede si `user` tiene un valor
        distinctUntilChanged() // Asegura que el valor de `user` haya cambiado
      )
      .subscribe(user => {
        if (datosYaCargados) return; // Evita múltiples ejecuciones si ya cargó
        this.usuarioActual = user;
        this.profileId = this.usuarioActual!.profileType.profileId;
        this.userId = this.usuarioActual!.userId;

        this.checkSuscripcion();
      });
  }

  // Método para redirigir a la pantalla de jugadores con el teamId
  irAPantalla(id: number): void {
    if (id === 1) {
      this.router.navigate(['/dashboard/inicio']);
    } else if (id === 2) {
      this.router.navigate(['/dashboard/inicio-baloncesto']);
    }
  }

  checkSuscripcion() {
    //acceder a un endpoint que revisa la sus, si es null, ver si está dentro de la semana que se creo la cuenta
    //si ya paso la semana, se revisara luego la fecha de renovacion, si no paso aun, pues no hacer nada, si paso
    //revisar en stripe el estado, porque si esta bien, hay que actualizar la fecha y si esta mal, actualizar a F el valido y la fecha, si esta mal
    // avisar por un alert
    this.teamService.getEstadoSuscripcion(this.userId, this.profileId).subscribe(
      (response: Response) => {
        this.numEquipos = response.data;
        if (response.data < 1) {
          //significa que NO es valido el acceso
          this.datosNoCargados = true;
        } else {
          this.datosCargados = true;
        }
        this.datosCargando = false;
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

}
