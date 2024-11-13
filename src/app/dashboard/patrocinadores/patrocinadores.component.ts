import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { filter, distinctUntilChanged } from 'rxjs';
import { User } from 'src/app/core/models/users/user.model';
import { ClubService } from 'src/app/core/services/club/club.service';
import { LoginService } from 'src/app/core/services/login/login.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { Response } from 'src/app/core/services/models/response.model';
import { Patrocinador } from 'src/app/core/services/models/club.model';
declare var bootstrap: any;

@Component({
  selector: 'app-patrocinadores',
  templateUrl: './patrocinadores.component.html',
  styleUrls: ['./patrocinadores.component.scss']
})
export class PatrocinadoresComponent implements OnInit {

  datosCargados: boolean = false;
  usuarioActual!: User | null;
  clubId = 0;

  datosCargando = false;
  listPatrocinadores: any[] = [];
  showModalCrearPatro = false;
  showModalUpdatePatrocinador = false;

  patrocinadorObj: Patrocinador = new Patrocinador({});
  patrocinadorUpdate: Patrocinador = new Patrocinador({});

  selectedFile!: File;
  showbtnupimg = false;
  imagePreviewUrl: string | ArrayBuffer | null = null;
  showPreview: boolean = false;
  selectedPatro = 0;
  showModalVerPatrocinador = false;

  constructor(
    private loginService: LoginService,
    private router: Router,
    private teamService: TeamService,
    private clubService: ClubService,
    private fb: FormBuilder,
    private route: ActivatedRoute,) { }

  ngOnInit(): void {
    // Suscribirse a los cambios en los parámetros de la URL
    this.route.params.subscribe(params => {
      // Obtener el valor de teamId de los parámetros
      this.clubId = +params['clubId'];  // El + convierte el valor a número
      console.log('clubId:', this.clubId);
    });

    this.clubService.getListPatrocinadoresByClub(this.clubId).subscribe(
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
          this.datosCargados = true;
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
        this.datosCargando = false;
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  abrirModalPatrocinador() {
    this.patrocinadorObj = new Patrocinador({});
    this.showModalCrearPatro = true;
  }

  openPatrocinador(patrocinador: any, i: number) {
    this.selectedPatro = i;
    this.patrocinadorUpdate = patrocinador;
    this.showModalUpdatePatrocinador = true;
  }

  confirmDeletePatrocinador(id: number, index: number, nombre: string) {
    const confirmacion = confirm('AVISO: Vas a eliminar para siempre este patrocinador de nombre: ' + nombre + '. ¿Estás seguro?');

    if (confirmacion) {
      this.deletePatrocinador(id, index);
    }
  }

  deletePatrocinador(id: number, index: number) {
    this.clubService.deletePatrocinadorById(id).subscribe(
      (response: Response) => {
        if (response.data !== null) {
          this.listPatrocinadores.splice(index);
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  toggleChaneOculto(value: number, id: number) {
    const nuevoValor = value === 0 ? 1 : 0;
    this.clubService.avtivePatrocinadorById(id, nuevoValor).subscribe(
      (response: Response) => {
        if (response.data !== null) {
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  cerrarModalCrearPatro() {
    this.showModalCrearPatro = false;
  }

  createUpdatePatrocinador(opcion: number) {
    this.patrocinadorObj.clubId = this.clubId;

    if(opcion === 2){
      this.patrocinadorObj = this.patrocinadorUpdate;
    }
    
    if(this.patrocinadorObj.nombre !== '' && this.patrocinadorObj.beneficios !== '' && this.patrocinadorObj.descripcion !== '' && this.patrocinadorObj.mail !== ''
      && this.patrocinadorObj.telefono !== '' && this.patrocinadorObj.web !== '') {
        this.clubService.createUpdatePatrocinador(this.patrocinadorObj).subscribe(
          (response: Response) => {
            if (response.data !== null) {
              if(opcion === 2){
                this.listPatrocinadores[this.selectedPatro] = this.patrocinadorUpdate;
                this.cerrarPatrocinador();
              } else {
                this.listPatrocinadores.push(response.data);
                this.cerrarModalCrearPatro();
              }
            } else {
              console.error('La respuesta del servicio no tiene la estructura esperada', response);
            }
          },
          (error) => {
            console.error('Error al cargar el listado de equipos', error);
          }
        );
      } else {
        alert('Por favor, rellena todos los campos.');
      }
  }

  cerrarVerPatrocinador(){
    this.showModalVerPatrocinador = false;
  }

  cerrarPatrocinador() {
    this.patrocinadorUpdate = new Patrocinador({});
    this.showModalUpdatePatrocinador = false;
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

  onSubmit(patrocinadorId: number) {
    // Verifica si se ha seleccionado un archivo
    if (this.selectedFile) {
      //console.log('Imagen seleccionada:', this.selectedFile);

      this.clubService.subirImgPatrocinador(patrocinadorId, this.selectedFile)
        .subscribe(
          (response) => {
            this.cerrarPatrocinador();
          },
          error => {
            console.error('Error al subir la imagen', error);
            // Aquí puedes manejar el error si la subida de la imagen falla
          }
        );
    } else {
      console.log('Ninguna imagen seleccionada.');
    }
  }

  mostrarId(patrocinador: any): void {
    //alert(`ID del patrocinador: ${id}`);
    this.patrocinadorUpdate = patrocinador;
    this.showModalVerPatrocinador = true;
  }

}
