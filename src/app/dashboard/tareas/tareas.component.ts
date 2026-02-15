import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { User } from 'src/app/core/models/users/user.model';
import { LoginService } from 'src/app/core/services/login/login.service';

@Component({
  selector: 'app-tareas',
  templateUrl: './tareas.component.html',
  styleUrls: ['./tareas.component.scss']
})
export class TareasComponent implements OnInit {

  usuarioActual!: User | null;
  userId: any = 0;
  teamId = 0;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private loginService: LoginService
  ) {}

  ngOnInit(): void {
    // Suscríbete al observable del servicio para obtener el usuario actual
    this.loginService.usuarioActual.subscribe(user => {
      this.usuarioActual = user;
      this.userId = user?.userId;
      // Suscribirse a los cambios en los parámetros de la URL
      this.route.params.subscribe(params => {
        // Obtener el valor de teamId de los parámetros
        this.teamId = +params['teamId'];  // El + convierte el valor a número
        //console.log('teamId:', this.teamId);
      });
    });
  }

  irAPantalla(id: number): void {
    switch (id) {
      case 1:
        this.router.navigate(['/dashboard/menu-entrenador', this.teamId, 0]);
        break;
      case 2: // Historial usadas
        this.router.navigate(['/dashboard/tareas-historial', this.teamId]);
        break;
      case 3: // Favoritas
        this.router.navigate(['/dashboard/tareas-favoritas', this.teamId]);
        break;
      case 4: // Mis Tareas
        this.router.navigate(['/dashboard/tareas-mis', this.teamId]);
        break;
    }
  }

  openTacticalBoard(): void {
    this.router.navigate(['/dashboard/tactical-board', this.teamId]);
  }

}
