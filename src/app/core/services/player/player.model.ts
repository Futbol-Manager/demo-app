// player.model.ts
export class Player {
    playerId: number;
    ability: number;
    abilityFootBad: number;
    birthdate: string;
    dateCreate: Date;
    dateEdit: Date;
    dribbling: number;
    finishFoot: number;
    finishHead: number;
    firstName: string;
    footNatural: number;
    forcePlayer: number;
    height: string;
    hit: number;
    jump: number;
    picturePlayer: string;
    position: string;
    resistance: number;
    secondName: string;
    speed: number;
    weight: string;
    opinion: string;
  
    constructor(object: any) {
      this.playerId = object.playerId || 0;
      this.ability = object.ability || 0;
      this.abilityFootBad = object.abilityFootBad || 0;
      this.birthdate = object.birthdate || '';
      this.dateCreate = new Date(object.dateCreate) || null;
      this.dateEdit = new Date(object.dateEdit) || null;
      this.dribbling = object.dribbling || 0;
      this.finishFoot = object.finishFoot || 0;
      this.finishHead = object.finishHead || 0;
      this.firstName = object.firstName || '';
      this.footNatural = object.footNatural || 0;
      this.forcePlayer = object.forcePlayer || 0;
      this.height = object.height || '';
      this.hit = object.hit || 0;
      this.jump = object.jump || 0;
      this.picturePlayer = object.picturePlayer || '';
      this.position = object.position || '';
      this.resistance = object.resistance || 0;
      this.secondName = object.secondName || '';
      this.speed = object.speed || 0;
      this.weight = object.weight || '';
      this.opinion = object.opinion || '';
    }
  }

  export class PlayerNEW {
      playerId: number = 0;
      ability: number = 0;
      abilityFootBad: number = 0;
      birthdate: string = '';
      dateCreate: Date = new Date();
      dateEdit: Date = new Date();
      dribbling: number = 0;
      finishFoot: number = 0;
      finishHead: number = 0;
      firstName: string = '';
      footNatural: number = 0;
      forcePlayer: number = 0;
      height: string = '';
      hit: number = 0;
      jump: number = 0;
      picturePlayer: string = '';
      position: string = '';
      resistance: number = 0;
      secondName: string = '';
      speed: number = 0;
      weight: string = '';
      opinion: string = '';
  }
  