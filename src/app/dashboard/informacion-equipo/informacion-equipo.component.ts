import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { User } from 'src/app/core/models/users/user.model';
import { LoginService } from 'src/app/core/services/login/login.service';
import { Response } from 'src/app/core/services/models/response.model';
import { RegisterService } from 'src/app/core/services/register/register.service';
import { TeamNew } from 'src/app/core/services/team/team.model';
import { TeamService } from 'src/app/core/services/team/team.service';

@Component({
  selector: 'app-informacion-equipo',
  templateUrl: './informacion-equipo.component.html',
  styleUrls: ['./informacion-equipo.component.scss']
})
export class InformacionEquipoComponent implements OnInit {
  editarEquipoForm: FormGroup;
  teamNew: TeamNew = new TeamNew();
  teamId!: number;
  team: TeamNew = new TeamNew();
  teamInfo: TeamNew = new TeamNew();
  coaches: any = [];
  usuarioActual!: User | null;

  userForm: FormGroup = this.fb.group({
    mail: ['', Validators.email],
  });;

  showModal = false;

  constructor(
    private fb: FormBuilder,
    private teamService: TeamService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private registerService: RegisterService,
    private loginService: LoginService,
  ) {
    this.editarEquipoForm = this.fb.group({
      teamId: ["", Validators.required],
      categoryTypeId: ["", Validators.required],
      levelLeague: ["", Validators.required],
      name: ["", Validators.required],
      objectiveTeam: ["", Validators.required],
      trainingDays: ["", Validators.required],
      opinionTeam: ["", Validators.required],
    });
  }

  ngOnInit(): void {
    this.loginService.usuarioActual.subscribe(user => {
      this.usuarioActual = user;
    });
    this.route.params.subscribe(params => {
      // Obtener el valor de teamId de los parámetros
      this.teamId = +params['teamId'];  // El + convierte el valor a número
      this.cargarInfoEquipo();
      this.cargarInfoEntrenadores();
    });
  }

  abrirModalInvitarEntenador(){
    this.showModal = true;
  }

  cargarInfoEntrenadores(){
    this.teamService.getUserListByTeam(this.teamId.toString()).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if(response.data !== null){
          this.coaches = response.data;
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  cargarInfoEquipo(){
    this.teamService.getTeamById(this.teamId.toString()).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if(response.data !== null){
          this.team = response.data;
          this.teamInfo = {
            teamId: this.team.teamId,
            levelLeague: this.team.levelLeague,
            name: this.team.name,
            objectiveTeam: this.team.objectiveTeam,
            opinionTeam: this.team.opinionTeam,
            trainingDays: this.team.trainingDays,
            categoryType: {
              categoryTypeId: response.data.categoryTypeId,
              year: 0,
              categoryName: "",
            },
            clubId: this.team.clubId,
            userId: this.team.userId,
          };
          // Asignar los valores recuperados del equipo al formulario
          this.editarEquipoForm.patchValue({
            teamId: this.teamInfo.teamId,
            categoryTypeId: this.teamInfo.categoryType.categoryTypeId,
            levelLeague: this.teamInfo.levelLeague,
            name: this.teamInfo.name,
            objectiveTeam: this.teamInfo.objectiveTeam,
            trainingDays: this.teamInfo.trainingDays,
            opinionTeam: this.teamInfo.opinionTeam
          });
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  editarEquipo(): void {
    if(this.editarEquipoForm.valid){
      const fv = this.editarEquipoForm.value;
      this.teamNew = {
        teamId: fv.teamId,
        levelLeague: fv.levelLeague || '',
        name: fv.name || '',
        objectiveTeam: fv.objectiveTeam || '',
        opinionTeam: fv.opinionTeam || '',
        trainingDays: fv.trainingDays || '',
        categoryType: {
          categoryTypeId: fv.categoryTypeId,
          year: 0,
          categoryName: ''
        },
        clubId: fv.clubId || 0,
        userId: 0,
      };
      // Llamada al servicio para editar el equipo
      // como estamos editando el equipo, podemos mandar userId = 0
      this.teamService.createUpdateTeam('0', this.teamNew,).subscribe(
        (response) => {
          this.cargarInfoEquipo();
          const snackBarConfig = new MatSnackBarConfig();
          snackBarConfig.duration = 5000;
          snackBarConfig.horizontalPosition = 'center';
          snackBarConfig.verticalPosition = 'top';
          this.snackBar.open('Información del equipo actualizada correctamente.', 'Cerrar', snackBarConfig);
        },
        (error) => {
          console.error('Error al editar el equipo:', error);
        }
      );
    }
  }

  navegarACalendario(): void {
    // Puedes ajustar la ruta según tu estructura de rutas
    this.router.navigate(['/dashboard/calendario', this.teamId]);
  }

  cerrarModal(): void {
    this.showModal = false;
  }

  invitarEntrenador(){
    if(this.userForm.valid){
      this.registerService.inviteCoach(this.userForm.value.mail, this.teamId).pipe().subscribe(
        res => {
          if(res.data){
            this.cargarInfoEntrenadores();
          }
          this.cerrarModal();
          const snackBarConfig = new MatSnackBarConfig();
          snackBarConfig.duration = 5000;
          snackBarConfig.horizontalPosition = 'center';
          snackBarConfig.verticalPosition = 'bottom';
          this.snackBar.open('Entrenador invitado correctamente.', 'Cerrar', snackBarConfig);
        })
    }
  }

  deleteCoach(userId: number){
    this.registerService.deleteCoach(this.teamId, userId).pipe().subscribe(
      res => {
        if(res.data){
          this.cargarInfoEntrenadores();
        }
        this.cerrarModal();
        const snackBarConfig = new MatSnackBarConfig();
        snackBarConfig.duration = 5000;
        snackBarConfig.horizontalPosition = 'center';
        snackBarConfig.verticalPosition = 'bottom';
        this.snackBar.open('Entrenador eliminado correctamente.', 'Cerrar', snackBarConfig);
      })
  }

}
