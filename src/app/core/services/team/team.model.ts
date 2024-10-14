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
  temporada: string;

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
    this.temporada = '';
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

export class HorarioTeam {
  horarioTeamId: number;
  clubId: number;
  team: Team;
  lunes: number;
  martes: number;
  miercoles: number;
  jueves: number;
  viernes: number;
  sabado: number;
  domingo: number;
  lunesInicio: string;
  martesInicio: string;
  miercolesInicio: string;
  juevesInicio: string;
  viernesInicio: string;
  sabadoInicio: string;
  domingoInicio: string;
  lunesFin: string;
  martesFin: string;
  miercolesFin: string;
  juevesFin: string;
  viernesFin: string;
  sabadoFin: string;
  domingoFin: string;
  temporada: string;

  constructor(object: any) {
    this.horarioTeamId = object.horarioTeamId || 0;
    this.clubId = object.clubId || 0;
    this.team = object.team || new Team({});
    this.lunes = object.lunes || 0;
    this.martes = object.martes || 0;
    this.miercoles = object.miercoles || 0;
    this.jueves = object.jueves || 0;
    this.viernes = object.viernes || 0;
    this.sabado = object.sabado || 0;
    this.domingo = object.domingo || 0;
    this.lunesInicio = object.lunesInicio || '';
    this.martesInicio = object.martesInicio || '';
    this.miercolesInicio = object.miercolesInicio || '';
    this.juevesInicio = object.juevesInicio || '';
    this.viernesInicio = object.viernesInicio || '';
    this.sabadoInicio = object.sabadoInicio || '';
    this.domingoInicio = object.domingoInicio || '';
    this.lunesFin = object.lunesFin || '';
    this.martesFin = object.martesFin || '';
    this.miercolesFin = object.miercolesFin || '';
    this.juevesFin = object.juevesFin || '';
    this.viernesFin = object.viernesFin || '';
    this.sabadoFin = object.sabadoFin || '';
    this.domingoFin = object.domingoFin || '';
    this.temporada = object.temporada || '';
  }
}

export class Suscripcion {
  suscripcionId: number;
  userId: number;
  playerId: number;
  suscripcionTipo: SuscripcionTipo;
  dateCreate: string;
  dateFinal: string;
  suscripcionStripeId: string;
  valido: string;
  renueva: number;
  clienteStripeId: string;

  constructor(object: any) {
    this.suscripcionId = object.suscripcionId || 0;
    this.userId = object.userId || 0;
    this.playerId = object.playerId || 0;
    this.suscripcionTipo = object.suscripcionTipo || new SuscripcionTipo({});
    this.dateCreate = object.dateCreate || '';
    this.dateFinal = object.dateFinal || '';
    this.suscripcionStripeId = object.suscripcionStripeId || '';
    this.valido = object.valido || '';
    this.renueva = object.renueva || 0;
    this.clienteStripeId = object.clienteStripeId || '';
  }
}


export class SuscripcionTipo {
  suscripcionTiposId: number;
  codigo: string;
  descripcion: string;
  priceId: string;
  precio: string;
  tiempo: string;

  constructor(object: any) {
    this.suscripcionTiposId = object.suscripcionTiposId || 0;
    this.codigo = object.codigo || '';
    this.descripcion = object.descripcion || '';
    this.priceId = object.priceId || '';
    this.precio = object.precio || '';
    this.tiempo = object.tiempo || '';
  }
}

export class SubscriptionRequest {
  userId: number;              // ID del usuario que realiza la suscripción
  email: string;               // Email del usuario
  name: string;                // Nombre del usuario
  priceId: string;             // ID del plan de precios en Stripe
  paymentMethodId: string;     // ID del método de pago en Stripe
  suscripcion: Suscripcion; // Objeto de la suscripción

  constructor(object: any) {
    this.userId = object.userId || 0;
    this.email = object.email || '';
    this.name = object.name || '';
    this.priceId = object.priceId || '';
    this.paymentMethodId = object.paymentMethodId || '';
    this.suscripcion = object.suscripcion || new Suscripcion({});
  }
}

export class CancelSubscriptionRequest {
  subscriptionId: number;
  userId: number;
  playerId: number;
  nuevo: number;
  suscripcionStripeId: string;
  suscripcionTiposId: number;

  constructor(object: any) {
    this.subscriptionId = object.subscriptionId || 0;
    this.userId = object.userId || 0;
    this.playerId = object.playerId || 0;
    this.nuevo = object.nuevo || 0;
    this.suscripcionStripeId = object.suscripcionStripeId || '';
    this.suscripcionTiposId = object.suscripcionTiposId || 0;
  }
}



