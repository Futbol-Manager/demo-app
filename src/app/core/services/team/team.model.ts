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
  