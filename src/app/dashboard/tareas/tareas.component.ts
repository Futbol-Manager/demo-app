import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
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
  showModalTactica = false;
  readonly urlTacticalBoard = 'https://tacticalboard.sphairatech.com/';
  readonly urlTacticalBoardSafe: SafeResourceUrl;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private loginService: LoginService,
    private sanitizer: DomSanitizer
  ) {
    this.urlTacticalBoardSafe = this.sanitizer.bypassSecurityTrustResourceUrl(this.urlTacticalBoard);
  }

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
    if (id === 1) {
      this.router.navigate(['/dashboard/menu-entrenador', this.teamId, 0]);
    } else if (id === 2) {
      window.open(this.urlTacticalBoard, '_blank');
    }
  }

  openModalTactica(): void {
    this.showModalTactica = true;
  }

  cerrarModalTactica(): void {
    this.showModalTactica = false;
  }

}
