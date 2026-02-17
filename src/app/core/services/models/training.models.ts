import { Player } from "../player/player.model";
import { Team } from "../team/team.model";

export class Training {
    trainingSessionId: number;
    daySession: string;
    objectiveSession: string;
    warmUp: string;
    addressSession: string;
    startTime: string;
    endTime: string;
    visible: number;
    infoVisible: number;
    tasks: Task[] = [];

    constructor(object: any) {
        this.trainingSessionId = object.trainingSessionId || 0;
        this.daySession = object.daySession || '';
        this.objectiveSession = object.objectiveSession || '';
        this.visible = object.visible || 0;
        this.infoVisible = object.infoVisible || 0;
        this.warmUp = object.warmUp || '';
        this.addressSession = object.addressSession || '';
        this.startTime = object.startTime || '';
        this.endTime = object.endTime || '';
    }

}

export class Task {
    taskId: number;
    description: string;
    rules: string;
    variants: string;
    slogans: string;
    worktime: string;
    space: string;
    material: string;
    work: string;
    video: string;
    collapsed: boolean;
    imagenBoard: string;
    estrategia: string;
    intencion: string;

    constructor() {
      this.taskId = 0;
      this.description = '';
      this.rules = '';
      this.variants = '';
      this.slogans = '';
      this.worktime = '';
      this.space = '';
      this.material = '';
      this.work = '';
      this.video = '';
      this.imagenBoard = '';
      this.collapsed = false; // Inicialmente, la tarea está contraída
      this.estrategia = '';
      this.intencion = '';
    }
  }

  export class AsistenciaTraining {
    asistenciaTrainingId: number;
    player: Player;
    team: Team;
    trainingSessionId: number;
    asistencia: number;
    retraso: number;
    cantidadMulta: number;
    motivo: string;

    constructor(object: any) {
      this.asistenciaTrainingId = object.asistenciaTrainingId || 0;
      this.player = object.player || new Player({});
      this.team = object.team || new Team({});
      this.trainingSessionId = object.trainingSessionId || 0;
      this.asistencia = object.asistencia || 0;
      this.retraso = object.retraso || 0;
      this.cantidadMulta = object.cantidadMulta || 0;
      this.motivo = object.motivo || '';
    }
  }
