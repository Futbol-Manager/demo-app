import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ScoutingPlayer } from 'src/app/core/services/player/player.model';
import { PlayerService } from 'src/app/core/services/player/player.service';
import { Response } from 'src/app/core/services/models/response.model';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

@Component({
  selector: 'app-scouting-player',
  templateUrl: './scouting-player.component.html',
  styleUrls: ['./scouting-player.component.scss']
})
export class ScoutingPlayerComponent implements OnInit {

  playerId = 0;
  datosCargados = false;

  scoutingPlayer: ScoutingPlayer = new ScoutingPlayer({});

  numeros: number[] = Array.from({ length: 50 }, (_, i) => i + 1);
  
  imgUser: string = '';
  selectedFile: File | null = null;
  imagePreviewUrl: string | ArrayBuffer | null = null;
  uploadedImageUrl: string | null = null; // Almacena la URL de la imagen subida
  showPreview: boolean = false;

  showbtnupimg = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private playerService: PlayerService,
    private snackBar: MatSnackBar) { }

  ngOnInit(): void {
    // Suscribirse a los cambios en los parámetros de la URL
    this.route.params.subscribe(params => {
      // Obtener el valor de teamId de los parámetros
      this.playerId = +params['playerId'];  // El + convierte el valor a número
    });

    this.cargarForm();
  }

  // Método para redirigir a la pantalla de jugadores con el teamId
  irAPantalla(id: number): void {
    switch (id) {
      case 0:
        this.router.navigate(['/dashboard/inicio']);
        break;
    }
  }

  cargarForm() {
    this.playerService.getscoutingplayerbyplayerid(this.playerId).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.scoutingPlayer = response.data;
        } else {
          this.scoutingPlayer.playerId = this.playerId;
          console.error('No hay datos', response);
        }
        this.datosCargados = true;
      },
      (error) => {
        console.error('Error al cargar el los datos', error);
      }
    );
  }

  guardarForm() {    
    this.playerService.createUpdateScoutingPlayer(this.scoutingPlayer).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.scoutingPlayer = response.data;
          const snackBarConfig = new MatSnackBarConfig();
          snackBarConfig.duration = 3000;
          snackBarConfig.horizontalPosition = 'center';
          snackBarConfig.verticalPosition = 'bottom';
          this.snackBar.open('Datos guardados.', 'Cerrar', snackBarConfig);
        } else {
          console.error('No hay datos', response);
        }
        this.datosCargados = true;
      },
      (error) => {
        console.error('Error al cargar el los datos', error);
      }
    );
  }

  togglePrivadoPublico(value: number) {
    this.scoutingPlayer.esPublico = value === 0 ? 1 : 0;
    this.updatePrivateScoutingPlayer(this.scoutingPlayer.playerId, this.scoutingPlayer.esPublico);
    // Aquí puedes añadir cualquier otra lógica necesaria
    //console.log(`${property} actualizada a ${value}`);
  }

  updatePrivateScoutingPlayer(playerId: number, value: number) {
    let msg = 'Perfil publicado.';
    if (value === 0){
      msg = 'Perfil despublicado, ahora está privado.';
    }

    this.playerService.setPublicoPrivadoScoutingPlayerByPlayerId(playerId, value).subscribe(
      (response) => {
        const snackBarConfig = new MatSnackBarConfig();
        snackBarConfig.duration = 3000;
        snackBarConfig.horizontalPosition = 'center';
        snackBarConfig.verticalPosition = 'bottom';
        this.snackBar.open(msg, 'Cerrar', snackBarConfig);
      },
      (error) => {
        console.error('Error al crear el equipo:', error);
        // Puedes manejar el error según tus necesidades
      }
    );
  }

  

  onFileSelected(event: any) {
    if (event.target.files[0].type === 'image/png' || event.target.files[0].type === 'image/jpeg') {
      this.selectedFile = event.target.files[0];
      this.showbtnupimg = true;
      if (this.selectedFile) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.imagePreviewUrl = e.target.result;
          this.showPreview = true; // Mostrar vista previa
        };
        reader.readAsDataURL(this.selectedFile);
      }
    } else {
      this.showbtnupimg = false;
    }
  }

  onSubmit() {
    if (this.selectedFile) {
      this.playerService.createUpdateImgPerfilPlayer( this.selectedFile, this.playerId, this.scoutingPlayer.imagenPerfil)
        .subscribe(
          (response) => {
            const snackBarConfig = new MatSnackBarConfig();
            snackBarConfig.duration = 3000;
            snackBarConfig.horizontalPosition = 'center';
            snackBarConfig.verticalPosition = 'bottom';
            this.snackBar.open('Imagen del perfil actualizada.', 'Cerrar', snackBarConfig);
            this.showPreview = false;
            this.showbtnupimg = false;
            this.selectedFile = null;
            this.scoutingPlayer.imagenPerfil = response.data;
          },
          error => {
            console.error('Error al subir la imagen', error);
            // Aquí puedes manejar el error si la subida de la imagen falla
            this.showPreview = true; // Mantener la vista previa si la subida falla
          }
        );
    } else {
      console.log('Ninguna imagen seleccionada.');
    }
  }

}
