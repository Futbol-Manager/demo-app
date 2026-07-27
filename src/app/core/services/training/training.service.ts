import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { EMPTY, Observable, of, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Response } from 'src/app/core/services/models/response.model';
import { DemoDataService } from '../demo/demo-data.service';
import { isDemoMode } from '../demo/demo-mode';
import { Training, Task, AsistenciaTraining } from '../models/training.models';
import { MatchPreparation, PlayerPostPartido, PostPartido } from '../models/match.model';
import { RespPostEntreno, RespPostPartido, RespPreEntreno, RespPrePartido } from '../player/respuestas.model';
import { GolPostPartido } from '../team/team.model';


@Injectable({
  providedIn: 'root'
})
export class TrainingService {

  constructor(private http: HttpClient) { }

  getTrainingSessions(teamId: string): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: DemoDataService.getDemoTrainingSessions(teamId), status: 200, error: null } as any);
    }
    const token: string | null = localStorage.getItem('token');
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `training/listtrainingbyteam/${teamId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }
  updateMatchInfoVisibility(matchPreparationId: number, visible: number): Observable<Response> {

    const token: string | null = localStorage.getItem('token');

    if (token) {
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      const url: string =
        environment.apiUrl +
        `match/updateMatchInfoVisibility/${matchPreparationId}/${visible}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }


  // Método para crear o actualizar un equipo
  createUpdateTrainingSession(teamId: string, training: Training): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `training/createupdatetrainingsession/${teamId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.post<Response>(url, training, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }

  }

  deleteTrainingSession(teamId: string, training: Training): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `training/deletetrainingsession/${teamId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.post<Response>(url, training, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }

  }

  getTasksByTraining(trainingId: string): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: DemoDataService.getDemoTasksByTraining(trainingId), status: 200, error: null } as any);
    }
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `training/listtasksbytraining/${trainingId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  // Método para crear o actualizar un equipo
  createUpdateTask(trainingId: string, task: Task, subirTarea: number, userId: number): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `training/createupdatetask/${trainingId}/${subirTarea}/${userId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.post<Response>(url, task, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  createUpdateImgTask(tasksShopId: number, taskId: number, file: File, userId: number): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response({ url: '' }) as Response);
    }
    // Verifica si el archivo está presente
    if (file) {
      // Obtén el token almacenado en localStorage
      const token: string | null = localStorage.getItem('token');
      // Verifica si el token está presente
      if (token) {
        // Configura las cabeceras con el token para la solicitud HTTP
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });

        // Construye el cuerpo de la solicitud FormData
        const formData: FormData = new FormData();
        formData.append('files', file, file.name);

        // Construye la URL para la solicitud
        const url: string = environment.apiUrl + `training/createupdateimgtask/${tasksShopId}/${taskId}/${userId}`;

        // Realiza la solicitud HTTP con las cabeceras y el cuerpo configurados
        return this.http.post<Response>(url, formData, { headers });
      } else {
        // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
        return throwError('Token no disponible');
      }
    } else {
      // Manejo de error si no se proporciona un archivo (puedes personalizar según tus necesidades)
      return throwError('Archivo no proporcionado');
    }
  }

  createUpdateImgUser(userId: string, file: File): Observable<Response> {
    // Verifica si el archivo está presente
    if (file) {
      // Obtén el token almacenado en localStorage
      const token: string | null = localStorage.getItem('token');
      // Verifica si el token está presente
      if (token) {
        // Configura las cabeceras con el token para la solicitud HTTP
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });

        // Construye el cuerpo de la solicitud FormData
        const formData: FormData = new FormData();
        formData.append('files', file, file.name);

        // Construye la URL para la solicitud
        const url: string = environment.apiUrl + `user/createupdateimguser/${userId}`;

        // Realiza la solicitud HTTP con las cabeceras y el cuerpo configurados
        return this.http.post<Response>(url, formData, { headers });
      } else {
        // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
        return throwError('Token no disponible');
      }
    } else {
      // Manejo de error si no se proporciona un archivo (puedes personalizar según tus necesidades)
      return throwError('Archivo no proporcionado');
    }
  }

  createUpdateImgPlayer(playerId: string, file: File): Observable<Response> {
    // Verifica si el archivo está presente
    if (file) {
      // Obtén el token almacenado en localStorage
      const token: string | null = localStorage.getItem('token');
      // Verifica si el token está presente
      if (token) {
        // Configura las cabeceras con el token para la solicitud HTTP
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });

        // Construye el cuerpo de la solicitud FormData
        const formData: FormData = new FormData();
        formData.append('files', file, file.name);

        // Construye la URL para la solicitud
        const url: string = environment.apiUrl + `player/createupdateimgplayer/${playerId}`;

        // Realiza la solicitud HTTP con las cabeceras y el cuerpo configurados
        return this.http.post<Response>(url, formData, { headers });
      } else {
        // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
        return throwError('Token no disponible');
      }
    } else {
      // Manejo de error si no se proporciona un archivo (puedes personalizar según tus necesidades)
      return throwError('Archivo no proporcionado');
    }
  }

  getListPrePartidoByTeam(teamId: string): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: DemoDataService.getDemoMatchPreparations(teamId), status: 200, error: null } as any);
    }
    const token: string | null = localStorage.getItem('token');
    if (token) {
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });
      const url: string = environment.apiUrl + `match/listmatchpreparationsbyteam/${teamId}`;
      return this.http.get<Response>(url, { headers });
    } else {
      return EMPTY;
    }
  }

  getPrePartido(matchpreparationId: string): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `match/getmatchpreparationbyid/${matchpreparationId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  // Método para crear o actualizar un equipo
  createUpdatePartido(teamId: string, match: MatchPreparation): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `match/createupdatematchpreparation/${teamId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.post<Response>(url, match, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  deletePartido(teamId: string, match: MatchPreparation): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `match/deletematchpreparation/${teamId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.post<Response>(url, match, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  deleteTask(taskId: string): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: true, status: 200, error: null } as any);
    }
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `training/deletetask/${taskId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.delete<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  /*deletePlayer(playerId: string): Observable<Response> {
      // Obtén el token almacenado en localStorage
      const token: string | null = localStorage.getItem('token');

      // Verifica si el token está presente
      if (token) {
          // Configura las cabeceras con el token para la solicitud HTTP
          const headers = new HttpHeaders({
              'Authorization': `Bearer ${token}`
          });

          // Construye la URL para la solicitud
          const url: string = environment.apiUrl + `player/deleteplayer/${playerId}`;

          // Realiza la solicitud HTTP con las cabeceras configuradas
          return this.http.get<Response>(url, { headers });
      } else {
          // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
          return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
      }
  }*/

  /** Catálogo de tareas de la nube (tasks_shop) de ejemplo para modo demo. */
  private demoTaskShop(): any[] {
    return [
      {
        tasksShopId: 9001, title: 'Rondo 4v2 progresivo',
        description: 'Circulación rápida del balón con dos comodines para trabajar la posesión.',
        rules: 'Máximo dos toques.', variants: 'Un toque · Tercer defensor',
        worktime: '15 min', space: '12x12 m', material: '6 conos, 2 balones',
        work: 'Técnico-táctico', estrategia: 'Posesión', intencion: 'Circulación',
      },
      {
        tasksShopId: 9002, title: 'Finalización tras centro',
        description: 'Series de centros desde banda con remate en área.',
        rules: 'Alternar bandas.', variants: 'Oposición pasiva',
        worktime: '18 min', space: 'Zona de ataque', material: '12 balones, porterías',
        work: 'Técnico', estrategia: 'Ataque', intencion: 'Finalización',
      },
      {
        tasksShopId: 9003, title: 'Juego de posición 8v8',
        description: 'Salida de balón bajo presión en medio campo.',
        rules: 'Superar líneas con control.', variants: 'Comodines exteriores',
        worktime: '25 min', space: 'Medio campo', material: 'Petos, balones',
        work: 'Táctico', estrategia: 'Construcción', intencion: 'Superar presión',
      },
      {
        tasksShopId: 9004, title: 'Transiciones defensa-ataque',
        description: 'Recuperación y salida rápida al espacio.',
        rules: 'Máximo 8 segundos para finalizar.', variants: 'Con inferioridad',
        worktime: '20 min', space: 'Campo completo reducido', material: 'Petos, balones, porterías',
        work: 'Táctico', estrategia: 'Transición', intencion: 'Contraataque',
      },
    ];
  }

  getAllTaskShop(): Observable<Response> {
    if (isDemoMode()) {
      return of(new Response({ data: this.demoTaskShop(), status: 200 }));
    }
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `training/getAllTaskShop`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  filterTaskShopByWork(work: string): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `training/filterTaskShopByWork/${work}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  filterTaskShopByOptions(filterTaskShop: any): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: DemoDataService.getDemoTaskShopCatalog(), status: 200, error: null } as any);
    }
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `training/filterTaskShopByoptions`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.post<Response>(url, filterTaskShop, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  downloadTaskShop(trainingId: string, taskShop: any): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `training/downloadTaskShop/${trainingId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.post<Response>(url, taskShop, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getPostPartidoByMatchPrepaId(matchPreparationId: string): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `match/getpostpartidobymatchPreparationId/${matchPreparationId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getPostPartidoByPostPartido(postPartidoId: string): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: DemoDataService.getDemoPostPartidoDetail(postPartidoId), status: 200, error: null } as any);
    }
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `match/getpostpartidobypostPartidoId/${postPartidoId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getTrainingSessionVisibility(trainingSessionId: number, visible: number): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = `${environment.apiUrl}training/updateTrainingSessionVisibility/${trainingSessionId}/${visible}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getMatchVisibility(matchPreparationId: number, visible: number): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = `${environment.apiUrl}match/updateMatchVisibility/${matchPreparationId}/${visible}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  createUpdatePostPartido(postPartido: PostPartido): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `match/createupdatepostpartido`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.post<Response>(url, postPartido, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  // AQUI EMPIEZAN LOS FORMULARIOS

  createFormPreEntreno(respPreEntreno: RespPreEntreno): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `training/createformulariopreentreno`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.post<Response>(url, respPreEntreno, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getFormPreTraining(trainingSessionId: number, playerId: number): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = `${environment.apiUrl}training/getformpretraining/${trainingSessionId}/${playerId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  createFormPostEntreno(respPostEntreno: RespPostEntreno): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `training/createformulariopostentreno`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.post<Response>(url, respPostEntreno, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getFormPostTraining(trainingSessionId: number, playerId: number): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `training/getformposttraining/${trainingSessionId}/${playerId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  createFormPrePartido(respPrePartido: RespPrePartido): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `match/createformularioprepartido`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.post<Response>(url, respPrePartido, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getFormPrePartido(matchPreparationId: number, playerId: number): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = `${environment.apiUrl}match/getformprepartidobymatch/${matchPreparationId}/${playerId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  createFormPostPartido(respPostPartido: RespPostPartido): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `match/createformulariopostpartido`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.post<Response>(url, respPostPartido, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getFormPostPartido(matchPreparationId: number, playerId: number): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = `${environment.apiUrl}match/getformpostpartidobymatch/${matchPreparationId}/${playerId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getListFormPreTraining(trainingSessionId: number): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = `${environment.apiUrl}training/getlistformpretraining/${trainingSessionId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getListFormPostTraining(trainingSessionId: number): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = `${environment.apiUrl}training/getlistformposttraining/${trainingSessionId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getListFormPreMatch(matchPreparationId: number): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = `${environment.apiUrl}match/getlistformprematch/${matchPreparationId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getListFormPostMatch(matchPreparationId: number): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = `${environment.apiUrl}match/getlistformpostmatch/${matchPreparationId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  // AQUI TERMINAN LOS FORMULARIOS

  saveTaskToLibrary(taskId: number, userId: number): Observable<Response> {
    const token = localStorage.getItem('token');
    if (!token) return EMPTY;
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    return this.http.post<Response>(
      environment.apiUrl + `training/task/${taskId}/to-library/${userId}`,
      {},
      { headers }
    );
  }

  getListGolesAvanzado(postPartidoId: number): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = `${environment.apiUrl}match/getlistgolesavanzado/${postPartidoId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getListGolesAvanzadoByTeamId(teamId: number): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response(DemoDataService.getDemoGolesAvanzadoByTeamId(teamId)) as Response);
    }
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = `${environment.apiUrl}match/getlistgolesavanzadobyteamid/${teamId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  createUpdateGolPostPartidoAvanzado(golPostPartido: GolPostPartido, postPartidoId: number): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `match/createupdategolpostpartidoavanzado/${postPartidoId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.post<Response>(url, golPostPartido, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  deleteGolPostPartidoAvanzado(golPostPartidoId: number, postPartidoId: number): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = `${environment.apiUrl}match/deletegolpostpartidoavanzado/${golPostPartidoId}/${postPartidoId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.delete<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getListAsistenciaByTraining(trainingSessionId: number, teamId: number, date: string): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `training/getlistasistenciabytraining/${trainingSessionId}/${teamId}/${date}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  updateAsistenciaByAsistencia(asis: AsistenciaTraining): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');
    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `training/updateasistenciajugadoresbytrainig`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.post<Response>(url, asis, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getListsAsistenciaByTeam(teamId: number): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response(DemoDataService.getDemoListAsistenciaByTeam(teamId)) as Response);
    }
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `training/getlistasasistenciabyteam/${teamId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return EMPTY; // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getListsAsistenciaByTeamYPlayer(teamId: number, playerId: number): Observable<Response> {
    if (isDemoMode()) {
      return of(DemoDataService.response(DemoDataService.getDemoListAsistenciaByPlayer()) as Response);
    }
    const token: string | null = localStorage.getItem('token');
    if (token) {
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });
      const url: string = environment.apiUrl + `training/getlistasasistenciabyteamyplayer/${teamId}/${playerId}`;
      return this.http.get<Response>(url, { headers });
    } else {
      return of({ data: null, status: 401, error: {} } as any);
    }
  }

  updateMultaStatus(idsPk: number, pagoStatus: number): Observable<Response> {
    const token: string | null = localStorage.getItem('token');
    if (token) {
      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
      const url: string = environment.apiUrl + `training/updatepagomultaasistenciabypk/${idsPk}/${pagoStatus}`;
      return this.http.get<Response>(url, { headers });
    } else {
      return EMPTY;
    }
  }

  // ═══════════════════════════════════════════
  //   COACH TASKS – History, Favorites, Own
  // ═══════════════════════════════════════════

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  getCoachTaskHistory(userId: number): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: DemoDataService.getDemoCoachTaskHistory(), status: 200, error: null } as any);
    }
    return this.http.get<Response>(
      environment.apiUrl + `training/coach-task-history/${userId}`,
      { headers: this.authHeaders() }
    );
  }

  getCoachTaskFavorites(userId: number): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: DemoDataService.getDemoCoachTaskFavorites(), status: 200, error: null } as any);
    }
    return this.http.get<Response>(
      environment.apiUrl + `training/coach-task-favorites/${userId}`,
      { headers: this.authHeaders() }
    );
  }

  addFavoriteTask(userId: number, taskId: number): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: true, status: 200, error: null } as any);
    }
    return this.http.post<Response>(
      environment.apiUrl + `training/coach-task-favorite/${userId}/${taskId}`,
      {},
      { headers: this.authHeaders() }
    );
  }

  removeFavoriteTask(userId: number, taskId: number): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: true, status: 200, error: null } as any);
    }
    return this.http.delete<Response>(
      environment.apiUrl + `training/coach-task-favorite/${userId}/${taskId}`,
      { headers: this.authHeaders() }
    );
  }

  getCoachOwnTasks(userId: number): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: DemoDataService.getDemoCoachOwnTasks(), status: 200, error: null } as any);
    }
    return this.http.get<Response>(
      environment.apiUrl + `training/coach-tasks/${userId}`,
      { headers: this.authHeaders() }
    );
  }

  createCoachTask(task: any): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: { coachTaskId: 99, ...task }, status: 200, error: null } as any);
    }
    return this.http.post<Response>(
      environment.apiUrl + 'training/coach-task',
      task,
      { headers: this.authHeaders() }
    );
  }

  updateCoachTask(task: any): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: task, status: 200, error: null } as any);
    }
    return this.http.put<Response>(
      environment.apiUrl + 'training/coach-task',
      task,
      { headers: this.authHeaders() }
    );
  }

  deleteCoachTask(coachTaskId: number, userId: number): Observable<Response> {
    if (isDemoMode()) {
      return of({ data: true, status: 200, error: null } as any);
    }
    return this.http.delete<Response>(
      environment.apiUrl + `training/coach-task/${coachTaskId}/${userId}`,
      { headers: this.authHeaders() }
    );
  }

  /** Upload image for coach task (pizarra). Returns response with data = filename. */
  uploadCoachTaskImage(coachTaskId: number, userId: number, file: File): Observable<Response> {
    if (!file) {
      return throwError(() => 'Archivo no proporcionado');
    }
    const token: string | null = localStorage.getItem('token');
    if (!token) {
      return throwError(() => 'Token no disponible');
    }
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    const formData = new FormData();
    formData.append('files', file, file.name);
    const url = environment.apiUrl + `training/coach-task-image/${coachTaskId}/${userId}`;
    return this.http.post<Response>(url, formData, { headers });
  }

}
