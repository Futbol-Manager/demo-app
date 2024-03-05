// team.model.ts

export class Team {
    teamId: number;
    levelLeague: string;
    name: string;
    trainingDays: string;
    category: string;
  
    constructor(object: any) {
      this.teamId = (object.teamId) ? object.teamId : null;
      this.levelLeague = (object.levelLeague) ? object.levelLeague : null;
      this.name = (object.name) ? object.name : null;
      this.trainingDays = (object.trainingDays) ? object.trainingDays : null;
      this.category = (object.category) ? object.category : null;
    }
  }

// En el modelo Team
export class TeamNew {
  teamId: number;
  levelLeague: string;
  name: string;
  objectiveTeam: string;
  opinionTeam: string;
  trainingDays: string;
  categoryType: CategoryType;

  constructor() {
    this.teamId = 0; // O el valor por defecto que desees para teamId
    this.levelLeague = '';
    this.name = '';
    this.objectiveTeam = '';
    this.opinionTeam = '';
    this.trainingDays = '';
    this.categoryType = new CategoryType(null); // Inicializado con el constructor de CategoryType
  }
}

export class CategoryType {
  categoryTypeId!: number;
  year!: number;
  categoryName!: string;

  constructor(object: any | null) {
    if (object) {
      this.categoryTypeId = (object.categoryTypeId) ? object.categoryTypeId : null;
      this.year = (object.year) ? object.year : null;
      this.categoryName = (object.categoryName) ? object.categoryName : null;
    }
  }
}


  