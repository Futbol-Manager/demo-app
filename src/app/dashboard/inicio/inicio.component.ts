import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {filter, take} from 'rxjs/operators';

import {LoginService} from 'src/app/core/services/login/login.service';
import {TeamService} from 'src/app/core/services/team/team.service';
import {User} from 'src/app/core/models/users/user.model';
import {Response} from 'src/app/core/services/models/response.model';

@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.scss']
})
export class InicioComponent implements OnInit {

  // =========================
  // Estado base
  // =========================
  usuarioActual!: User;
  userId = 0;
  profileId = 0;
  clubId = 0;

  clubOk = false;
  clubLoading = true;

  datosCargando = true;
  datosNoCargados = false;

  isAndroid = false;
  isiOS = false;
  showAlertAndroid = true;

  // =========================
  // Cache keys
  // =========================
  private readonly CLUB_OK_KEY = 'clubOkResolved';
  private readonly CLUB_ID_KEY = 'clubId';

  constructor(
    private loginService: LoginService,
    private teamService: TeamService,
    private router: Router
  ) {
  }

  // =========================
  // Ciclo de vida
  // =========================
  ngOnInit(): void {
    this.detectarPlataforma();
    this.inicializarDesdeCache();
    this.cargarUsuario();
  }

  // =========================
  // Plataforma

  // =========================
  irAPantalla(id: number): void {

    // ⛔ BLOQUEO ABSOLUTO
    if (!this.clubId) {
      console.warn('Intento de navegación sin clubId');
      return;
    }

    switch (id) {
      case 2:
        this.router.navigate(['/dashboard/ropa', this.clubId]);
        break;
      case 3:
        this.router.navigate(['/dashboard/cuadro-de-mandos', this.clubId]);
        break;
      case 4:
        this.router.navigate(['/dashboard/patrocinadores', this.clubId]);
        break;
      case 6:
        this.router.navigate(['/dashboard/documentos-club', this.clubId]);
        break;
      case 7:
        this.router.navigate(['/dashboard/new-cuotas', this.clubId]);
        break;
      case 9:
        this.router.navigate(['/dashboard/equipos']);
        break;
    }
  }

  // =========================
  // Cache inicial (evita skeleton innecesario)

  cerrarAlertaAndroid(): void {
    this.showAlertAndroid = false;
  }

  // =========================
  // Usuario (una sola vez)

  // =========================
  private detectarPlataforma(): void {
    const ua = navigator.userAgent || navigator.vendor;
    this.isAndroid = /android/i.test(ua);
    this.isiOS = /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window);
  }

  // =========================
  // Club (CRÍTICO)

  // =========================
  private inicializarDesdeCache(): void {
    const cachedClubOk = sessionStorage.getItem(this.CLUB_OK_KEY);
    const cachedClubId = sessionStorage.getItem(this.CLUB_ID_KEY);

    if (cachedClubOk !== null && cachedClubId !== null) {
      this.clubOk = cachedClubOk === 'true';
      this.clubId = Number(cachedClubId);
      this.clubLoading = false;
    }
  }

  // =========================
  // Suscripción

  // =========================
  private cargarUsuario(): void {
    this.loginService.usuarioActual
      .pipe(
        filter(Boolean),
        take(1)
      )
      .subscribe(user => {
        this.usuarioActual = user!;
        this.profileId = user!.profileType.profileId;
        this.userId = user!.userId;

        // Si ya tenemos clubId desde cache, no repetir llamadas
        if (this.clubId > 0) {
          this.verificarSuscripcion();
        } else {
          this.cargarClubId();
        }
      });
  }

  // =========================
  // Navegación (SEGURA)

  // =========================
  private cargarClubId(): void {
    this.teamService.getTeamByClub(this.userId.toString(), '2025')
      .pipe(take(1))
      .subscribe({
        next: (response: Response) => {
          this.clubId = response.data?.club?.clubId ?? 0;

          if (!this.clubId) {
            console.error('ClubId inválido');
            this.clubLoading = false;
            this.datosCargando = false;
            return;
          }

          // Cachear SIEMPRE
          sessionStorage.setItem(this.CLUB_ID_KEY, String(this.clubId));

          this.verificarSuscripcion();
        },
        error: () => {
          this.clubLoading = false;
          this.datosCargando = false;
        }
      });
  }

  // =========================
  private verificarSuscripcion(): void {
    this.teamService.getEstadoSuscripcion(this.userId, this.profileId)
      .pipe(take(1))
      .subscribe({
        next: (response: Response) => {

          if (response.data === 999) {
            this.clubOk = true;
          } else if (response.data < 1) {
            this.datosNoCargados = true;
          }

          sessionStorage.setItem(this.CLUB_OK_KEY, String(this.clubOk));

          this.clubLoading = false;
          this.datosCargando = false;
        },
        error: () => {
          this.clubLoading = false;
          this.datosCargando = false;
        }
      });
  }
}
