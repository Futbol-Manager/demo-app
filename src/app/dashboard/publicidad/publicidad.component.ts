import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { User } from 'src/app/core/models/users/user.model';
import { ClubService } from 'src/app/core/services/club/club.service';
import { LoginService } from 'src/app/core/services/login/login.service';
import { Patrocinador } from 'src/app/core/services/models/club.model';
import { PlayerService } from 'src/app/core/services/player/player.service';
import { RegisterService } from 'src/app/core/services/register/register.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { TrainingService } from 'src/app/core/services/training/training.service';
import { Response } from 'src/app/core/services/models/response.model';
import { environment } from 'src/environments/environment';
import { isDemoMode } from 'src/app/core/services/demo/demo-mode';
declare var bootstrap: any;

@Component({
  selector: 'app-publicidad',
  templateUrl: './publicidad.component.html',
  styleUrls: ['./publicidad.component.scss']
})
export class PublicidadComponent implements OnInit, OnDestroy {
  private userSub?: Subscription;

  listPatrocinadores: any[] = [];
  patrocinadorUpdate: Patrocinador = new Patrocinador({});
  showModalVerPatrocinador = false;
  usuarioActual!: User | null;
  profileId = 0;
  userId: any = 0;
  get imageBaseUrlPatro(): string {
    return isDemoMode() ? '/assets/images/patrocinadores/' : environment.images + 'patrocinadores/';
  }

  /**
   * Perfiles que ven patrocinadores. En la demo solo el jugador: al entrenador la
   * banda de logos le ocupaba la pantalla sin aportar nada a lo que viene a ver.
   */
  private get sponsorsAllowed(): boolean {
    return isDemoMode() ? this.profileId === 3 : this.profileId === 2 || this.profileId === 3;
  }

  /** El carrusel solo se pinta si hay algún logo visible que mostrar. */
  get showSponsors(): boolean {
    return this.sponsorsAllowed && this.listPatrocinadores.some((p) => p?.imagen && p?.oculto === 1);
  }

  /** URL de la imagen del patrocinador; resuelve '../nombre.png' a /assets/images/nombre.png */
  getSponsorImageSrc(p: { imagen?: string }): string {
    if (!p?.imagen) return '';
    if (p.imagen.startsWith('../')) return '/assets/images/' + p.imagen.slice(3);
    return this.imageBaseUrlPatro + p.imagen;
  }

  constructor(
    private loginService: LoginService,
    private clubService: ClubService) { }

  ngOnInit(): void {
    this.userSub = this.loginService.usuarioActual.subscribe(user => {
      this.usuarioActual = user;
      this.userId = user?.userId;
      this.profileId = this.usuarioActual!.profileType.profileId;

      //llamar a endpoint que de userId y profileId
      if (this.sponsorsAllowed) {
        this.clubService.getListPatrocinadoresByUser(this.userId, this.profileId).subscribe(
          (response: Response) => {
            if (response.data !== null) {
              this.listPatrocinadores = response.data;

              const carouselElement = document.getElementById('carouselPatrocinadores');
              if (carouselElement) {
                let num = this.listPatrocinadores.length * 1000;
                const carousel = new bootstrap.Carousel(carouselElement, {
                  interval: num, // Cambia el tiempo de transición (ms)
                  wrap: true
                });
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
    });
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }

  mostrarId(patrocinador: any): void {
    //alert(`ID del patrocinador: ${id}`);
    this.patrocinadorUpdate = patrocinador;
    this.showModalVerPatrocinador = true;
  }

  cerrarVerPatrocinador(){
    this.showModalVerPatrocinador = false;
  }

}
