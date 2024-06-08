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

export class TeamConJugadores {
  teamId: number;
  levelLeague: string;
  name: string;
  trainingDays: string;
  category: string;
  jugadoresPorEquipo: string;
  userId: number;

  constructor(object: any) {
    this.teamId = (object.teamId) ? object.teamId : null;
    this.levelLeague = (object.levelLeague) ? object.levelLeague : null;
    this.name = (object.name) ? object.name : null;
    this.trainingDays = (object.trainingDays) ? object.trainingDays : null;
    this.category = (object.category) ? object.category : null;
    this.jugadoresPorEquipo = (object.jugadoresPorEquipo) ? object.jugadoresPorEquipo : null;
    this.userId = (object.userId) ? object.userId : null;

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
  clubId: number;
  userId: number;

  constructor() {
    this.teamId = 0; // O el valor por defecto que desees para teamId
    this.levelLeague = '';
    this.name = '';
    this.objectiveTeam = '';
    this.opinionTeam = '';
    this.trainingDays = '';
    this.categoryType = new CategoryType(null); // Inicializado con el constructor de CategoryType
    this.clubId = 0;
    this.userId = 0;
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

export class GolPostPartido {
  golPostPartidoId: number;
  minuto: number;
  playerId: number;
  asistencia: number;
  aFavor: number;
  category: string;
  subCategory: string;
  option: string;
  combinado: string;
  teamId: number;

  constructor(object: any) {
    this.golPostPartidoId = object.golPostPartidoId || 0;
    this.minuto = object.minuto || 0;
    this.playerId = object.playerId || 0;
    this.asistencia = object.asistencia || 0;
    this.aFavor = object.aFavor || 0;
    this.category = object.category || '';
    this.subCategory = object.subCategory || '';
    this.option = object.option || '';
    this.combinado = object.combinado || '';
    this.teamId = object.teamId || 0;
  }

}


