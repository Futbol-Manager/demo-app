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
import { environment } from 'src/environments/environment';
import { Location } from '@angular/common';
declare var bootstrap: any;

@Component({
  selector: 'app-patrocinadores',
  templateUrl: './patrocinadores.component.html',
  styleUrls: ['./patrocinadores.component.scss'],
})
export class PatrocinadoresComponent implements OnInit {
  datosCargados: boolean = false;
  usuarioActual!: User | null;
  clubId = 0;
  selectedImageFile: File | null = null;
  datosCargando = false;
  listPatrocinadores: any[] = [];
  showModalCrearPatro = false;
  showModalUpdatePatrocinador = false;
  isSaving = false;

  patrocinadorObj: Patrocinador = new Patrocinador({});
  patrocinadorUpdate: Patrocinador = new Patrocinador({});

  selectedFile!: File;
  showbtnupimg = false;
  imagePreviewUrl: string | ArrayBuffer | null = null;
  showPreview: boolean = false;
  selectedPatro = 0;
  showModalVerPatrocinador = false;
  profileId = 0;
  userId: any = 0;
  imageBaseUrl: string = environment.images + 'patrocinadores/';

  constructor(
    private loginService: LoginService,
    private router: Router,
    private teamService: TeamService,
    private clubService: ClubService,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private location: Location,
  ) {}

  ngOnInit(): void {
    this.loginService.usuarioActual.subscribe((user) => {
      this.usuarioActual = user;
      this.userId = user?.userId ?? 0;
      this.profileId = this.usuarioActual?.profileType?.profileId ?? 0;

      this.route.params.subscribe((params) => {
        const paramUserId = params['userId'];
        const paramClubId = params['clubId'];
        const urlUserId = paramUserId != null && paramUserId !== '' ? +paramUserId : null;
        if (urlUserId != null) {
          this.userId = urlUserId;
          this.clubId = 0;
        } else {
          this.clubId = paramClubId != null && paramClubId !== '' ? +paramClubId : 0;
        }
        this.loadPatrocinadores();
      });
    });
  }

  private loadPatrocinadores(): void {
    const handleResponse = (response: Response) => {
      if (response.data !== null) {
        this.listPatrocinadores = response.data;
        const carouselElement = document.getElementById('carouselPatrocinadores');
        if (carouselElement) {
          const num = this.listPatrocinadores.length * 1000;
          new bootstrap.Carousel(carouselElement, { interval: num, wrap: true });
        }
        this.datosCargados = true;
      } else {
        console.error('La respuesta del servicio no tiene la estructura esperada', response);
      }
      this.datosCargando = false;
    };

    if (this.profileId === 0 || this.profileId === 2 || this.profileId === 3) {
      this.clubService.getListPatrocinadoresByUser(this.userId, this.profileId).subscribe({
        next: handleResponse,
        error: (err) => {
          console.error('Error al cargar el listado de equipos', err);
          this.datosCargando = false;
        },
      });
    } else {
      this.clubService.getListPatrocinadoresByClub(this.clubId).subscribe({
        next: handleResponse,
        error: (err) => {
          console.error('Error al cargar el listado de equipos', err);
          this.datosCargando = false;
        },
      });
    }
  }

  irAPantalla(id: number): void {
    switch (id) {
      case 1:
        this.router.navigate(['/dashboard/inicio']);
        break;
    }
  }

  goBack(): void {
    this.location.back();
  }

  abrirModalPatrocinador() {
    this.patrocinadorObj = new Patrocinador({});
    this.showModalCrearPatro = true;
  }

  openPatrocinador(patrocinador: any, i: number) {
    this.selectedPatro = i;
    this.patrocinadorUpdate = patrocinador;

    if (this.profileId > 2) {
      this.showModalVerPatrocinador = true;
    } else {
      this.showModalUpdatePatrocinador = true;
    }
  }

  confirmDeletePatrocinador(id: number, index: number, nombre: string) {
    const confirmacion = confirm(
      'AVISO: Vas a eliminar para siempre este patrocinador de nombre: ' +
        nombre +
        '. ¿Estás seguro?',
    );

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
          console.error(
            'La respuesta del servicio no tiene la estructura esperada',
            response,
          );
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      },
    );
  }

  toggleChaneOculto(value: number, id: number) {
    const nuevoValor = value === 0 ? 1 : 0;
    this.clubService.avtivePatrocinadorById(id, nuevoValor).subscribe(
      (response: Response) => {
        if (response.data !== null) {
        } else {
          console.error(
            'La respuesta del servicio no tiene la estructura esperada',
            response,
          );
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      },
    );
  }

  cerrarModalCrearPatro() {
    this.showModalCrearPatro = false;
  }

  createUpdatePatrocinador(opcion: number) {
    if (this.isSaving) return;

    let patrocinador =
      opcion === 2
        ? { ...this.patrocinadorUpdate }
        : { ...this.patrocinadorObj };

    patrocinador.clubId = this.clubId;
    if (this.profileId === 0) {
      patrocinador.federacionId = this.userId;
    }

    if (
      patrocinador.nombre &&
      patrocinador.beneficios &&
      patrocinador.descripcion &&
      patrocinador.mail &&
      patrocinador.telefono &&
      patrocinador.web
    ) {
      this.isSaving = true;

      this.clubService.createUpdatePatrocinador(patrocinador).subscribe({
        next: (response: any) => {
          if (!response?.data) {
            this.isSaving = false;
            return;
          }

          const patrocinadorCreado = response.data;
          const patrocinadorId = patrocinadorCreado.patrocinadorId;

          // 👉 Si hay imagen, la subimos
          if (this.selectedImageFile) {
            this.clubService
              .subirImgPatrocinador(patrocinadorId, this.selectedImageFile)
              .subscribe({
                next: (imgResponse: any) => {
                  patrocinadorCreado.imagen = imgResponse.data;
                  this.finalizarGuardado(opcion, patrocinadorCreado);
                },
                error: (err) => {
                  console.error('Error al subir imagen', err);
                  this.isSaving = false;
                },
              });
          } else {
            this.finalizarGuardado(opcion, patrocinadorCreado);
          }
        },
        error: (err) => {
          console.error('Error al guardar patrocinador', err);
          this.isSaving = false;
        },
      });
    } else {
      alert('Por favor, rellena todos los campos.');
    }
  }

  finalizarGuardado(opcion: number, patrocinador: any) {
    if (opcion === 2) {
      this.listPatrocinadores[this.selectedPatro] = patrocinador;
    } else {
      this.listPatrocinadores = [...this.listPatrocinadores, patrocinador];
    }

    this.isSaving = false;

    opcion === 2 ? this.cerrarPatrocinador() : this.cerrarModalCrearPatro();

    this.selectedImageFile = null;
    this.showPreview = false;
    this.imagePreviewUrl = null;
  }

  cerrarVerPatrocinador() {
    this.showModalVerPatrocinador = false;
  }

  cerrarPatrocinador() {
    this.patrocinadorUpdate = new Patrocinador({});
    this.showModalUpdatePatrocinador = false;
  }

  onFileSelected(event: any) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (file.type === 'image/png' || file.type === 'image/jpeg') {
      this.selectedImageFile = file;

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreviewUrl = e.target.result;
        this.showPreview = true;
      };
      reader.readAsDataURL(file);
    } else {
      this.selectedImageFile = null;
      alert('Solo JPG o PNG');
    }
  }

  onSubmit(patrocinadorId: number) {
    // Verifica si se ha seleccionado un archivo
    if (this.selectedFile) {
      //console.log('Imagen seleccionada:', this.selectedFile);

      this.clubService
        .subirImgPatrocinador(patrocinadorId, this.selectedFile)
        .subscribe(
          (response) => {
            this.patrocinadorUpdate.imagen = response.data;
            this.cerrarPatrocinador();
          },
          (error) => {
            console.error('Error al subir la imagen', error);
            // Aquí puedes manejar el error si la subida de la imagen falla
          },
        );
    } else {
      console.log('Ninguna imagen seleccionada.');
    }
  }
  fixHttps() {
    if (!this.patrocinadorObj.web) return;

    let url = this.patrocinadorObj.web.trim();

    if (!/^https:\/\//i.test(url)) {
      url = 'https://' + url.replace(/^http?:\/\//i, '');
    }

    this.patrocinadorObj.web = url;
  }

  mostrarId(patrocinador: any): void {
    //alert(`ID del patrocinador: ${id}`);
    this.patrocinadorUpdate = patrocinador;
    this.showModalVerPatrocinador = true;
  }
}
