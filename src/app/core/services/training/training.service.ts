import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Response } from 'src/app/core/services/models/response.model';
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
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
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
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
    }

  }

  getTasksByTraining(trainingId: string): Observable<Response> {
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
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  createUpdateImgTask(tasksShopId: number, taskId: number, file: File, userId: number): Observable<Response> {
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
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `match/listmatchpreparationsbyteam/${teamId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  deleteTask(taskId: string): Observable<Response> {
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
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
          return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
      }
  }*/

  getAllTaskShop(): Observable<Response> {
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
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  filterTaskShopByOptions(filterTaskShop: any): Observable<Response> {
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
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getPostPartidoByPostPartido(postPartidoId: string): Observable<Response> {
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
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  // AQUI TERMINAN LOS FORMULARIOS

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
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getListGolesAvanzadoByTeamId(teamId: number): Observable<Response> {
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
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getListsAsistenciaByTeam(teamId: number): Observable<Response> {
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
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  getListsAsistenciaByTeamYPlayer(teamId: number, playerId: number): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `training/getlistasasistenciabyteamyplayer/${teamId}/${playerId}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

  updateMultaStatus(idsPk: number, pagoStatus: number): Observable<Response> {
    // Obtén el token almacenado en localStorage
    const token: string | null = localStorage.getItem('token');

    // Verifica si el token está presente
    if (token) {
      // Configura las cabeceras con el token para la solicitud HTTP
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Construye la URL para la solicitud
      const url: string = environment.apiUrl + `training/updatepagomultaasistenciabypk/${idsPk}/${pagoStatus}`;

      // Realiza la solicitud HTTP con las cabeceras configuradas
      return this.http.get<Response>(url, { headers });
    } else {
      // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
      return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
    }
  }

}
