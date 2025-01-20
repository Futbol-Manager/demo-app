import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router, ActivatedRoute } from '@angular/router';
import { ClubService } from 'src/app/core/services/club/club.service';
import { Response } from 'src/app/core/services/models/response.model';
import { HttpClient } from '@angular/common/http';
import * as XLSX from "xlsx";
import { Player } from 'src/app/core/services/player/player.model';
import { PlayerService } from 'src/app/core/services/player/player.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-info-jugadores',
  templateUrl: './info-jugadores.component.html',
  styleUrls: ['./info-jugadores.component.scss']
})
export class InfoJugadoresComponent implements OnInit {
  @ViewChild('dataTable', { static: false })
  table!: ElementRef;

  clubId = 0;
  datosCargados = false;
  teams: any[] = [];
  players: any[] = [];
  teamSelected: number = -1;
  // Propiedades existentes
  playerNameFilter: string = '';
  filteredPlayers: any[] = [];
  playerDniFilter: string = '';
  playerSearch: string = '';
  mostrarModalInfoJugador = false;

  playerIdSelected = 0;
  selectedPlayer: any; // Define selectedPlayer para mantener la información del jugador seleccionado


  //para subir las caras de los dnis
  mostrarModalDniJugador: boolean = false;
  dniCara1: string | ArrayBuffer | null | undefined = null;
  dniCara2: string | ArrayBuffer | null | undefined = null;
  selectedFileCara1: File | null = null;
  selectedFileCara2: File | null = null;
  //estas son las caras del padre o tutor 1
  dniCara3: string | ArrayBuffer | null | undefined = null;
  dniCara4: string | ArrayBuffer | null | undefined = null;
  selectedFileCara3: File | null = null;
  selectedFileCara4: File | null = null;
  //estas son  las caras de la madre o tutor 2
  dniCara5: string | ArrayBuffer | null | undefined = null;
  dniCara6: string | ArrayBuffer | null | undefined = null;
  selectedFileCara5: File | null = null;
  selectedFileCara6: File | null = null;

  indexSelected = 0;
  loading = true;
  imageBaseUrlUser: string = environment.images + 'user/';
  imageBaseUrlPlayerDni: string = environment.images + 'playerDni/';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private clubService: ClubService,
    private playerService: PlayerService,) { }

  ngOnInit(): void {
    // Suscribirse a los cambios en los parámetros de la URL
    this.route.params.subscribe(params => {
      // Obtener el valor de teamId de los parámetros
      this.clubId = +params['clubId'];  // El + convierte el valor a número
      console.log('clubId:', this.clubId);
    });
    this.cargarListadoJugadores();
  }

  // Método para redirigir a la pantalla de jugadores con el teamId
  irAPantalla(id: number): void {
    switch (id) {
      case 0:
        this.router.navigate(['/dashboard/cuadro-de-mandos', this.clubId]);
        break;
    }
  }

  cargarListadoJugadores(): void {
    this.clubService.getListJugadoresByClubForTemp(this.clubId, '2024').subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response && response.data) {
          // Mapea los datos bajo 'data' a instancias del modelo Team
          this.teams = response.data.teams;
          for (let i = 0; i < this.teams.length; i++) {
            for (let a = 0; a < this.teams[i].players.length; a++) {
              this.filteredPlayers.push(this.teams[i].players[a]);
              this.players.push(this.teams[i].players[a]);
            }
          }
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
        this.datosCargados = true;
        this.loading = false;
      },
      (error) => {
        console.error('Error al cargar el listado de jugadores', error);
      }
    );
  }

  loadPlayersOfTeam(): void {
    if (this.teamSelected < 0) {
      this.players = this.teams.flatMap(team => team.players); // Mostrar todos los jugadores
    } else {
      this.players = this.teams[this.teamSelected].players; // Mostrar jugadores del equipo seleccionado
    }

    this.applyNameFilter();
  }

  applyFilter(): void {
    const filter = this.normalizeText(this.playerSearch);
    this.filteredPlayers = this.players.filter(player => {
      return (
        (player.nombre && this.normalizeText(player.nombre).includes(filter)) ||
        (player.apellido && this.normalizeText(player.apellido).includes(filter)) ||
        (player.nameTeam && this.normalizeText(player.nameTeam).includes(filter)) ||
        (player.telefono && this.normalizeText(player.telefono).includes(filter)) ||
        (player.dni && this.normalizeText(player.dni).includes(filter)) ||
        (player.nombrePadre && this.normalizeText(player.nombrePadre).includes(filter)) ||
        (player.dniPadre && this.normalizeText(player.dniPadre).includes(filter)) ||
        (player.telefonoPadre && this.normalizeText(player.telefonoPadre).includes(filter)) ||
        (player.emailPadre && this.normalizeText(player.emailPadre).includes(filter)) ||
        (player.nombreMadre && this.normalizeText(player.nombreMadre).includes(filter)) ||
        (player.dniMadre && this.normalizeText(player.dniMadre).includes(filter)) ||
        (player.telefonoMadre && this.normalizeText(player.telefonoMadre).includes(filter)) ||
        (player.emailMadre && this.normalizeText(player.emailMadre).includes(filter))
      );
    });
  }

  normalizeText(text: string): string {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  // Método para filtrar jugadores por nombre
  filterPlayers(key: number): void {
    switch (key) {
      case 0:
        this.applyNameFilter();
        break;
      case 1:
        this.applyDniFilter();
        break;
    }
  }

  // Aplicar filtro por nombre a los jugadores
  applyNameFilter(): void {
    if (!this.playerNameFilter) {
      // Si el filtro está vacío, mostrar todos los jugadores
      this.filteredPlayers = this.players;
    } else {
      // Filtrar jugadores por nombre que coincida parcialmente
      this.filteredPlayers = this.players.filter(player =>
        player.nombre && player.nombre.toLowerCase().includes(this.playerNameFilter.toLowerCase())
      );
    }
  }

  // Aplicar filtro por nombre a los jugadores
  applyDniFilter(): void {
    if (!this.playerDniFilter) {
      // Si el filtro está vacío, mostrar todos los jugadores
      this.filteredPlayers = this.players;
    } else {
      // Filtrar jugadores por DNI que coincida parcialmente, y manejar los valores null
      this.filteredPlayers = this.players.filter(player =>
        player.dni && player.dni.toLowerCase().includes(this.playerDniFilter.toLowerCase())
      );
    }
  }

  exportTableToExcel(): void {
    // Comprobar si el elemento existe antes de usar su ID
    const tableElement = document.getElementById('dataTable');

    if (tableElement) {
      const ws: XLSX.WorkSheet = XLSX.utils.table_to_sheet(tableElement);

      // Resto del código (asegurar formato de cadena, ancho de columnas, etc.)
      // ... (puedes copiar y pegar el código de la respuesta anterior)

      // Crear y guardar libro de trabajo
      const wb: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

      // Personalizar nombre de archivo y opciones de guardado (opcional)
      const fileName = "tabla_exportada.xlsx"; // Ajustar según tus necesidades
      XLSX.writeFile(wb, fileName, { bookType: 'xlsx' });
    } else {
      console.error("¡Elemento 'dataTable' no encontrado!");
      // Manejar el error de forma adecuada (opcional)
      // Por ejemplo, mostrar un mensaje de alerta al usuario
    }
  }

  /*verInfoJugador(player: Player): void {
    this.selectedPlayer = player; // Almacena el jugador seleccionado en una propiedad del componente
    this.edadSeleccionada = this.fechaEnEspañol(this.selectedPlayer.fechaDeNacimiento) + ' (' + this.calcularEdad(player.fechaDeNacimiento) + ')';
    this.mostrarEdad = true;
    this.mostrarModalInfoJugador = true; // Activa el indicador para mostrar el modal

    // Aquí llamamos a la función para cargar el gráfico de radar
    this.cargarGraficoRadar();
  }*/

  // Método para cerrar el modal de información del jugador
  cerrarModalInfoJugador() {
    this.mostrarModalInfoJugador = false;
  }

  fechaEnEspañol(fecha: string): string {
    const partes = fecha.split('-');
    const fechaObj = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));

    const dia = fechaObj.getDate();
    const mes = fechaObj.getMonth() + 1;
    const año = fechaObj.getFullYear();

    const diaStr = dia < 10 ? '0' + dia : dia.toString();
    const mesStr = mes < 10 ? '0' + mes : mes.toString();

    return `${diaStr}/${mesStr}/${año}`;
  }

  // Método para calcular la edad del jugador a partir de su fecha de nacimiento
  calcularEdad(fechaNacimientoString: string): number {
    // Convertimos la cadena de fecha de nacimiento a un objeto Date
    const fechaNacimiento = new Date(fechaNacimientoString);

    const hoy = new Date();
    const cumpleanos = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - cumpleanos.getFullYear();
    const mes = hoy.getMonth() - cumpleanos.getMonth();

    if (mes < 0 || (mes === 0 && hoy.getDate() < cumpleanos.getDate())) {
      edad--;
    }

    return edad;
  }

  abrirModalDniJugador(player: any, index: number) {
    this.indexSelected = index;
    this.playerIdSelected = player.playerId;
    this.selectedPlayer = player;
    this.mostrarModalDniJugador = true;
  }

  cerrarModalDniJugador() {
    this.dniCara1 = null;
    this.dniCara2 = null;
    this.dniCara3 = null;
    this.dniCara4 = null;
    this.dniCara5 = null;
    this.dniCara6 = null;
    this.mostrarModalDniJugador = false;
  }

  onFileChange(event: any, cara: string) {
    const file = event.target.files[0];

    if (file) {
      const fileType = file.type;

      // Verifica si el tipo de archivo es PNG o JPEG
      if (fileType === 'image/png' || fileType === 'image/jpeg') {
        const reader = new FileReader();
        reader.onload = (e) => {
          switch (cara) {
            case 'cara1':
              this.dniCara1 = e.target?.result;
              this.selectedFileCara1 = file;
              break;
            case 'cara2':
              this.dniCara2 = e.target?.result;
              this.selectedFileCara2 = file;
              break;
            case 'cara3':
              this.dniCara3 = e.target?.result;
              this.selectedFileCara3 = file;
              break;
            case 'cara4':
              this.dniCara4 = e.target?.result;
              this.selectedFileCara4 = file;
              break;
            case 'cara5':
              this.dniCara5 = e.target?.result;
              this.selectedFileCara5 = file;
              break;
            case 'cara6':
              this.dniCara6 = e.target?.result;
              this.selectedFileCara6 = file;
              break;
          }
        };
        reader.readAsDataURL(file);

        setTimeout(() => {
          this.subirCaraDni(cara);
        }, 1000);
      } else {
        // Muestra un mensaje de error si el archivo no es PNG o JPEG
        alert('Formato de archivo no válido. Por favor, sube una imagen en formato PNG o JPEG.');
      }
    }
  }

  subirCaraDni(cara: string) {
    let fileToUpload = null;
    let caraOption = 0;

    switch (cara) {
      case 'cara1':
        fileToUpload = this.selectedFileCara1;
        break;
      case 'cara2':
        caraOption = 1;
        fileToUpload = this.selectedFileCara2;
        break;
      case 'cara3':
        caraOption = 2;
        fileToUpload = this.selectedFileCara3;
        break;
      case 'cara4':
        caraOption = 3;
        fileToUpload = this.selectedFileCara4;
        break;
      case 'cara5':
        caraOption = 4;
        fileToUpload = this.selectedFileCara5;
        break;
      case 'cara6':
        caraOption = 5;
        fileToUpload = this.selectedFileCara6;
        break;
    }

    if (fileToUpload) {
      const formData = new FormData();
      formData.append('file', fileToUpload);

      // Simulamos el envío de la imagen al servidor
      this.playerService.createUpdateImgDniPlayer(this.playerIdSelected, caraOption, fileToUpload)
        .subscribe(
          (response) => {
            switch (caraOption) {
              case 0:
                this.filteredPlayers[this.indexSelected].imgDniUno = response.data;
                break;
              case 1:
                this.filteredPlayers[this.indexSelected].imgDniDos = response.data;
                break;
              case 2:
                this.filteredPlayers[this.indexSelected].dniPadre1 = response.data;
                break;
              case 3:
                this.filteredPlayers[this.indexSelected].dniPadre2 = response.data;
                break;
              case 4:
                this.filteredPlayers[this.indexSelected].dniMadre1 = response.data;
                break;
              case 5:
                this.filteredPlayers[this.indexSelected].dniMadre2 = response.data;
                break;
            }

            this.snackBar.open('Imagen subida correctamente.', 'Cerrar', {
              duration: 3000,
            });
          },
          error => {
            console.error('Error al subir la imagen', error);
          }
        );

      // Aquí se realiza la llamada al backend
      // Puedes usar HttpClient para realizar la solicitud
      // Ejemplo: this.http.post(endpoint, formData).subscribe(...)
      //console.log(`Subiendo ${cara}:`, fileToUpload.name);
      // Realiza la llamada a tu servicio o API aquí
    }
  }

  descargarImagen(url: string, nombreArchivo: string) {
    //const urlImagen = 'https://appsphairatech.com/images/user/277699-imguser.png';
    const urlEnvi = environment.apiUrl;
    //console.log(urlEnvi);
    const urlBackend = urlEnvi + `commons/download-image?url=${encodeURIComponent(url)}`;

    fetch(urlBackend)
      .then(response => response.blob())
      .then(blob => {
        const a = document.createElement('a');
        const objectUrl = window.URL.createObjectURL(blob);
        a.href = objectUrl;
        a.download = nombreArchivo;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(objectUrl);
        document.body.removeChild(a);
      })
      .catch(error => {
        window.open(url, '_blank');
        //console.error('Error descargando la imagen:', error);
        //alert('No se pudo descargar la imagen. Por favor, intente de nuevo más tarde.');
      });
  }


}
