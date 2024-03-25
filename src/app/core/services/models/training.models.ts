export class Training {
    trainingSessionId: number;
    daySession: string;
    objectiveSession: string;
    warmUp: string;
    tasks: Task[] = []; // Agrega la propiedad tareas de tipo array de Tarea

    constructor(object: any) {
        this.trainingSessionId = object.trainingSessionId || 0;
        this.daySession = object.daySession || '';
        this.objectiveSession = object.objectiveSession || '';
        this.warmUp = object.warmUp || '';
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
      this.collapsed = false; // Inicialmente, la tarea está contraída
    }
  }
  