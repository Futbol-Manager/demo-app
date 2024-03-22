import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Response } from 'src/app/core/services/models/response.model';
import { Training, Task } from '../models/training.models';
import { MatchPreparation, PostPartido } from '../models/match.model';


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
    createUpdateTask(trainingId: string, task: Task): Observable<Response> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');
        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `training/createupdatetask/${trainingId}`;

            // Realiza la solicitud HTTP con las cabeceras configuradas
            return this.http.post<Response>(url, task, { headers });
        } else {
            // Manejo de error si el token no está presente (puedes personalizar según tus necesidades)
            return new Observable(); // Puedes devolver un Observable vacío o manejar el error de otra manera
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

    getPostPartido(postPartidoId: string): Observable<Response> {
        // Obtén el token almacenado en localStorage
        const token: string | null = localStorage.getItem('token');

        // Verifica si el token está presente
        if (token) {
            // Configura las cabeceras con el token para la solicitud HTTP
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${token}`
            });

            // Construye la URL para la solicitud
            const url: string = environment.apiUrl + `match/getpostpartidobyid/${postPartidoId}`;

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

}
