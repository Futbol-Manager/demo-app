import { Component, OnInit } from '@angular/core';
import { User } from 'src/app/core/models/users/user.model';
import { LoginService } from 'src/app/core/services/login/login.service';
import { Team } from 'src/app/core/services/team/team.model';
import { TeamService } from 'src/app/core/services/team/team.service';
import { Response } from 'src/app/core/services/models/response.model';

@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.scss']
})
export class InicioComponent implements OnInit {

  usuarioActual!: User | null;
  listTeam: any[] = []; // Define una variable para almacenar el listado de equipos
  

  constructor(private loginService: LoginService,
              private teamService: TeamService) { }

  ngOnInit(): void {
    // Suscríbete al observable del servicio para obtener el usuario actual
    this.loginService.usuarioActual.subscribe(user => {
      this.usuarioActual = user;
      // Carga el listado de equipos al inicializar el componente
    this.cargarListadoEquipos(user!.userId.toString());
    });
    
  }

  // Método para cargar el listado de equipos
cargarListadoEquipos(userId: string): void {
  this.teamService.getTeams(userId).subscribe(
    (response: Response) => {
      // Verifica que la propiedad 'data' exista en la respuesta
      if (response && response.data && Array.isArray(response.data)) {
        // Mapea los datos bajo 'data' a instancias del modelo Team
        this.listTeam = response.data.map((team: Team) => new Team(team));
      } else {
        console.error('La respuesta del servicio no tiene la estructura esperada', response);
      }
    },
    (error) => {
      console.error('Error al cargar el listado de equipos', error);
    }
  );
}

  cerrarSesion(): void {
    // Llama al método cerrarSesion del servicio
    this.loginService.cerrarSesion();
  }

  verPerfil(){
    
  }

  

}
