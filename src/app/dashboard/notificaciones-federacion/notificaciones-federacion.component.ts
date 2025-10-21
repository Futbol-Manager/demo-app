import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { User } from 'src/app/core/models/users/user.model';
import { ClubService } from 'src/app/core/services/club/club.service';
import { LoginService } from 'src/app/core/services/login/login.service';
import { CorreoEnviado, CorreoEnviadoFede } from 'src/app/core/services/models/club.model';
import { Response } from 'src/app/core/services/models/response.model';
import { TeamService } from 'src/app/core/services/team/team.service';
import { Location } from '@angular/common';
import { PlayerService } from 'src/app/core/services/player/player.service';
declare var $: any; // Declaración para usar jQuery

@Component({
  selector: 'app-notificaciones-federacion',
  templateUrl: './notificaciones-federacion.component.html',
  styleUrls: ['./notificaciones-federacion.component.scss']
})
export class NotificacionesFederacionComponent implements OnInit {

  datosCargados = false;
  usuarioActual!: User | null;
  clubId = 0;  // Ajusta el valor según el clubId del equipo actual
  userId!: number;
  correoSelected = {
    destinatarios: '',
    asunto: '',
    body: '',
    remitente: '',
    destinatario: '',
    fechaCreate: ''
  };
  correosEnviadosSinFiltro: any = [];
  correosRecibidosSinFiltro: any = [];
  correosSinFiltro: any = [];

  correos = [...this.correosSinFiltro]; // Inicialmente, muestra todos los correos

  showModal = false;
  showBtn = true;
  showModalNew = false;

  listTeamsForCombo = [
    { name: 'Cadete A', value: 1 },
    { name: 'Juvenil B', value: 2 },
    { name: 'Senior C', value: 3 },
    { name: 'Femenino', value: 4 },
  ];
  listPlayersForCombo = [
    { name: 'Javier Martín', value: 1 },
    { name: 'César Núnez', value: 2 },
    { name: 'Alex Palet', value: 3 },
    { name: 'Ana Rosa Quintana', value: 4 },
  ];
  //listClubsForCombo: any[] = [];
  correoNew: CorreoEnviadoFede = new CorreoEnviadoFede({});
  /*correoNew = {
    destinatarios: '0',
    asunto: '',
    body: '',
    correoEnviadoId: 0,
    clubId: 0,
    teamId: 0,
    userId: 0,
    fechaCreate: ''
  };*/
  isSending: boolean = false;

  temporadaStoredValue = '2025';
  opciones = 0;

  listClubsForCombo = [
    { name: 'Seseña CF', value: 60 },
  ];

  //correoNew = { destinatarios: [] as number[] };
  filtroClub = '';
  mostrarDropdown = false;

  filtroPlayer = '';
  mostrarDropdownPlayer = false;

  selectedClub = '';
  selectedPlayer = '';
  selectedTeam = '';
  listAllPlayersForCombo = [
    { name: 'Javier Martín', value: 1 },
  ];

  constructor(
    private loginService: LoginService,
    private router: Router,
    private route: ActivatedRoute,
    private teamService: TeamService,
    private http: HttpClient,
    private clubService: ClubService,
    private location: Location,
    private playerService: PlayerService) { }

  ngOnInit(): void {
    this.loginService.usuarioActual.subscribe(user => {
      this.usuarioActual = user;
      this.userId = this.usuarioActual!.userId;
    });

    if (localStorage.getItem('temporada') != null && localStorage.getItem('temporada') != undefined) {
      this.temporadaStoredValue = localStorage.getItem('temporada')!.toString();
    }

    /*this.clubService.getListCorreos(this.userId).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.correosEnviadosSinFiltro = response.data.enviados;
          this.correosRecibidosSinFiltro = response.data.recibidos;
          this.correos = response.data.recibidos;
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
        this.initSummernote();
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );*/

    this.teamService.getOpcionesFederacionCombo(this.temporadaStoredValue, this.userId).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.listClubsForCombo = response.data;
          // ✅ Todos seleccionados al inicio
          this.correoNew.destinatarios = this.listClubsForCombo.map(c => c.value as number);
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  goBack(): void {
    this.location.back();
  }

  /**
   * Inicializa el editor Summernote
   */
  private initSummernote(): void {
    $('#summernote').summernote({
      placeholder: 'Escribe tu mensaje aquí...',
      tabsize: 2,
      height: 400,
      callbacks: {
        onChange: (contents: string) => {
          this.correoSelected.body = contents; // Actualiza el contenido en tiempo real
        }
      }
    });
  }

  /**
   * Destruye el editor Summernote
   */
  private destroySummernote(): void {
    if ($('#summernote').data('summernote')) {
      $('#summernote').summernote('destroy');
    }
  }

  /**
   * Inicializa el editor Summernote
   */
  private initSummernoteNew(): void {
    $('#summernoteNew').summernote({
      placeholder: 'Escribe tu mensaje aquí...',
      tabsize: 2,
      height: 400,
      callbacks: {
        onChange: (contents: string) => {
          this.correoSelected.body = contents; // Actualiza el contenido en tiempo real
        }
      }
    });
  }

  /**
   * Destruye el editor Summernote
   */
  private destroySummernoteNew(): void {
    if ($('#summernoteNew').data('summernoteNew')) {
      $('#summernoteNew').summernote('destroy');
    }
  }

  ngOnDestroy(): void {
    this.destroySummernote(); // Limpia Summernote al destruir el componente
  }

  destinatariosString(destinatarios: string[]): string {
    let correos = '';
    for (let index = 0; index < destinatarios.length; index++) {
      correos += destinatarios[index] + '; ';
    }
    return correos;
  }

  irAPantalla(id: number): void {
    switch (id) {
      case 1:
        this.router.navigate(['/dashboard/inicio']);
        break;
    }
  }

  mostrarEnviados() {
    this.showBtn = false;
    console.log('Mostrando enviados');
    this.correos = this.correosEnviadosSinFiltro;
  }

  mostrarRecibidos() {
    this.showBtn = true;
    console.log('Mostrando recibidos');
    this.correos = this.correosRecibidosSinFiltro;
  }

  filtrarCorreos(tipo: string) {
    console.log(`Filtrando correos: ${tipo}`);
  }

  /**
   * Abre el correo y carga el contenido en Summernote
   * @param correo - Objeto del correo seleccionado
   */
  openCorreo(correo: any, index: number): void {
    //alert('Correo abierto con ID:' + correo.enviadosId);
    // Aquí puedes agregar la lógica para abrir o mostrar el correo.
    this.correoSelected = correo; // Asigna el correo seleccionado  
    const base = this.correoSelected.body;

    // Espera a que el modal y el Summernote estén completamente cargados
    setTimeout(() => {
      if ($('#summernote').data('summernote')) {
        $('#summernote').summernote('reset'); // Resetea Summernote si ya estaba inicializado
      }
      console.log(base); // Verifica que el contenido esté correctamente decodificado

      // Verifica si el contenido es base64 antes de decodificar
      let decodedBody: string;
      if (this.isBase64(base || '')) {
        decodedBody = this.decodeBase64(base || ''); // Decodifica el contenido si es base64
        console.log("Decodificado:", decodedBody);
      } else {
        decodedBody = base; // Si no es base64, usa directamente el contenido
        console.log("Ya está decodificado:", decodedBody);
      }
      $('#summernote').summernote('code', decodedBody); // Carga el contenido decodificado 

      this.showModal = true;
    }, 1000); // Ajusta el tiempo si es necesario para dar suficiente tiempo a la inicialización

    if (correo.leido == 0) {
      this.clubService.openCorreoRecibido(correo.correoRecibidoId).subscribe(
        (response: Response) => {
          // Verifica que la propiedad 'data' exista en la respuesta
          if (response.data !== null) {
            this.correos[index].leido = 1;
          } else {
            console.error('La respuesta del servicio no tiene la estructura esperada', response);
          }
        },
        (error) => {
          console.error('Error al cargar el listado de equipos', error);
        }
      );
    }
  }

  /**
   * Decodifica el contenido en Base64 y lo carga en Summernote
   * @param base64String - Contenido codificado en Base64
   * @returns Contenido decodificado
   */
  private decodeBase64(base64String: string): string {
    try {
      return atob(base64String);
    } catch (error) {
      console.error('Error al decodificar Base64:', error);
      return ''; // Devuelve un string vacío en caso de error
    }
  }

  mostrarTodos() {
    this.correos = [...this.correosRecibidosSinFiltro];
  }

  mostrarLeidos() {
    this.correos = [...this.correosRecibidosSinFiltro];
    this.correos = this.correos.filter(correo => correo.leido === 1);
  }

  mostrarNoLeidos() {
    this.correos = [...this.correosRecibidosSinFiltro];
    this.correos = this.correos.filter(correo => correo.leido === 0);
  }

  cerrarModal() {
    this.showModal = false;
    this.destroySummernote(); // Destruye Summernote al cerrar el modal
    this.correoSelected = {
      destinatarios: '',
      asunto: '',
      body: '',
      remitente: '',
      destinatario: '',
      fechaCreate: ''
    }; // Limpia la selección si es necesario
  }

  // Método para codificar en Base64 antes de guardar
  guardarCorreo(): void {
    console.log(this.opciones);
    console.log(this.selectedClub);
    console.log(this.selectedTeam);
    console.log(this.selectedPlayer);
    if (this.opciones > 3 && this.opciones < 7) {
      this.correoNew.destinatarios = [Number(this.selectedClub)];
    }
    if (this.opciones == 6) {
      this.correoNew.destinatario = this.selectedPlayer;
    }
    console.log(this.correoNew.destinatarios);
    if (this.correoNew.asunto != '' && this.correoSelected.body != '') {
      this.isSending = true;
      const contenidoHTML = this.correoSelected.body;
      // Codifica el contenido en Base64
      const contenidoBase64 = btoa(unescape(encodeURIComponent(contenidoHTML)));

      this.correoNew.body = contenidoBase64;
      this.correoNew.clubId = this.clubId;
      //this.correoNew.teamId = parseInt(this.correoNew.destinatarios);
      this.correoNew.userId = this.userId;
      this.correoNew.correoEnviadoId = 0;
      this.correoNew.temporada = this.temporadaStoredValue;
      this.correoNew.opciones = this.opciones;


      //console.log('Contenido en Base64:', contenidoBase64);

      this.clubService.createCorreoFede(this.correoNew).subscribe(
        (response: Response) => {
          // Verifica que la propiedad 'data' exista en la respuesta
          if (response.data !== 0) {
            this.correoNew = response.data;

            // guardar el correo
            //agregarlo al listado de enviados
            if (this.correosEnviadosSinFiltro == null) {
              this.correosEnviadosSinFiltro = [];
            }
            this.correosEnviadosSinFiltro.unshift(this.correoNew);
          } else {
            console.error('La respuesta del servicio no tiene la estructura esperada', response);
          }
          this.cerrarEnviando();
        },
        (error) => {
          console.error('Error al cargar el listado de equipos', error);
        }
      );
    } else {
      alert('Por favor, rellena todos los campos.');
    }

  }

  cerrarEnviando() {
    this.cerrarModalNew();
    this.isSending = false; // Oculta el spinner después de enviar
    this.resetSummerNote();
  }

  newCorreo() {
    this.destroySummernoteNew();
    this.initSummernoteNew();
    this.showModalNew = true;
  }

  cerrarModalNew() {
    this.showModalNew = false;
    this.correoNew = {
      destinatarios: [],
      asunto: '',
      body: '',
      correoEnviadoId: 0,
      clubId: this.clubId,
      teamId: 0,
      userId: this.userId,
      fechaCreate: '',
      remitente: '',
      destinatario: '',
      temporada: this.temporadaStoredValue,
      opciones: 0
    }; // Limpia la selección si es necesario
    this.resetSummerNote();
  }

  isBase64(str: string): boolean {
    if (!str || typeof str !== 'string') {
      return false; // No es válido si no es una cadena
    }

    // Base64 típico: letras, números, '+', '/', '=' y longitud múltiplo de 4
    const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

    // Validamos el patrón y verificamos que no contenga etiquetas HTML
    return base64Regex.test(str) && !str.includes('<');
  }

  resetSummerNote() {
    // Limpiar el contenido de Summernote
    setTimeout(() => {
      if ($('#summernoteNew').data('summernote')) {
        $('#summernoteNew').summernote('reset'); // Opción para resetear completamente
        // $('#summernoteNew').summernote('code', ''); // Alternativa para limpiar solo el contenido
      }
    }, 0); // Asegúrate de dar tiempo al DOM para que realice el reset si es necesario
  }

  enviarCorreo() {
    this.isSending = true;
    // Lógica para enviar el correo
    setTimeout(() => {
      this.isSending = false; // Oculta el spinner después de enviar
      this.cerrarModalNew();
    }, 3000); // Simulación de envío
  }


  deleteCorreo(correo: any, index: number): void {
    if (confirm('¿Estás seguro de que deseas eliminar este correo?')) {
      if (this.showBtn) {
        this.deleteCorreoOK(correo.correoRecibidoId, 1, index);
      } else {
        this.deleteCorreoOK(correo.correoEnviadoId, 0, index);
      }
    }
  }

  deleteCorreoOK(id: number, option: number, index: number) {
    this.clubService.deleteCorreo(id, option).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== 0) {
          this.correos.splice(index, 1);
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
        this.resetSummerNote();
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  changeOptions() {
    const num = Number(this.opciones);
    switch (num) {
      case 7:
        this.correoNew.destinatarios = [];
        this.clubService.getListPlayersForFedeCombo(this.userId, this.temporadaStoredValue).subscribe(
          (response: Response) => {
            // Verifica que la propiedad 'data' exista en la respuesta
            if (response.data !== null) {
              // Mapea los datos bajo 'data' a instancias del modelo Team
              this.listAllPlayersForCombo = response.data;
            } else {
              console.error('La respuesta del servicio no tiene la estructura esperada', response);
            }
          },
          (error) => {
            console.error('Error al cargar el listado de jugadores', error);
          }
        );
        break;
    }
  }

  toggleClub(id: number) {
    const idx = this.correoNew.destinatarios.indexOf(id);
    if (idx > -1) {
      this.correoNew.destinatarios.splice(idx, 1);
    } else {
      this.correoNew.destinatarios.push(id);
    }
  }

  ocultarDropdownConRetraso() {
    // Espera un poco antes de cerrar para que se registre el click
    setTimeout(() => (this.mostrarDropdown = false), 150);
  }

  toggleDropdownPlayer() {
    this.mostrarDropdownPlayer = !this.mostrarDropdownPlayer;
    // tras clicar la flecha, volvemos a enfocar el input para no disparar blur
    setTimeout(() => document.getElementById('PlayerInput')?.focus(), 0);
  }

  ocultarDropdownConRetrasoPlayer() {
    setTimeout(() => {
      this.mostrarDropdownPlayer = false;
    }, 150);
  }

  obtenerNombreClub(id: number) {
    const club = this.listClubsForCombo.find(c => c.value === id);
    return club ? club.name : '';
  }

  obtenerNombrePlayer(id: number) {
    const player = this.listAllPlayersForCombo.find(c => c.value === id);
    return player ? player.name : '';
  }

  loadTeams() {
    this.teamService.getTeamsByClubForCombo2(Number(this.selectedClub), this.temporadaStoredValue, 0).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.listTeamsForCombo = response.data;
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  loadPlayers() {
    this.playerService.getPlayers(this.selectedTeam).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          let players = [];
          for (let index = 0; index < response.data.players.length; index++) {
            const element = {
              name: response.data.players[index].nombre +
                ' ' + response.data.players[index].apellido, value: response.data.players[index].playerId
            };
            players.push(element);
          }
          this.listPlayersForCombo = players;
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

}
