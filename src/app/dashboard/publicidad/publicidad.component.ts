import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, ActivatedRoute } from '@angular/router';
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
declare var bootstrap: any;

@Component({
  selector: 'app-publicidad',
  templateUrl: './publicidad.component.html',
  styleUrls: ['./publicidad.component.scss']
})
export class PublicidadComponent implements OnInit {
  
  listPatrocinadores: any[] = [];
  patrocinadorUpdate: Patrocinador = new Patrocinador({});
  showModalVerPatrocinador = false;
  usuarioActual!: User | null;
  profileId = 0;
  userId: any = 0;
  imageBaseUrlPatro: string = environment.images + 'patrocinadores/';

  constructor(
    private loginService: LoginService,
    private clubService: ClubService) { }

  ngOnInit(): void {
    this.loginService.usuarioActual.subscribe(user => {
      this.usuarioActual = user;
      this.userId = user?.userId;
      this.profileId = this.usuarioActual!.profileType.profileId;

      //llamar a endpoint que de userId y profileId
      if(this.profileId == 2 || this.profileId == 3){        
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

  mostrarId(patrocinador: any): void {
    //alert(`ID del patrocinador: ${id}`);
    this.patrocinadorUpdate = patrocinador;
    this.showModalVerPatrocinador = true;
  }

  cerrarVerPatrocinador(){
    this.showModalVerPatrocinador = false;
  }

}
