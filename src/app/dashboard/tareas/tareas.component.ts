import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { User } from 'src/app/core/models/users/user.model';
import { LoginService } from 'src/app/core/services/login/login.service';
import { TaskStorageService } from 'src/app/core/services/training/task-storage.service';
import { TutorialService } from 'src/app/core/services/tutorial/tutorial.service';

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
    private loginService: LoginService,
    private taskStorage: TaskStorageService,
    private tutorialService: TutorialService
  ) {}

  ngOnInit(): void {
    setTimeout(() => this.tutorialService.start('tareas', true), 600);

    this.loginService.usuarioActual.subscribe(user => {
      this.usuarioActual = user;
      this.userId = user?.userId;
      if (this.userId) {
        this.taskStorage.loadFromBackend(this.userId);
      }
      this.route.params.subscribe(params => {
        this.teamId = +params['teamId'];
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
      case 5: // Nube de Tareas
        this.router.navigate(['/dashboard/tareas-catalog', this.teamId]);
        break;
    }
  }

  openTacticalBoard(): void {
    this.router.navigate(['/dashboard/tactical-board', this.teamId]);
  }

}
