import { PlayerPostPartido } from "../models/match.model";

// player.model.ts
export class Player2 {
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
  position: number;
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
    this.position = object.position || 0;
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
  position: number = 0;
  resistance: number = 0;
  secondName: string = '';
  speed: number = 0;
  weight: string = '';
  opinion: string = '';
}

export class Player {
  playerId: number;
  nombre: string;
  apellido: string;
  posicion: string;
  fechaDeNacimiento: string;
  altura: string;
  peso: string;
  piernaNatural: string;
  habilidadConBalon: string;
  habilidadConBalonControlDeBalon: string;
  habilidadConBalonRegate: string;
  pase: string;
  paseCorto: string;
  paseLargo: string;
  centros: string;
  tiro: string;
  tiroPotenciaDeTiro: string;
  tiroDefinicion: string;
  tiroTirosLejanos: string;
  tiroVoleas: string;
  tiroPrecisionFalta: string;
  tiroPenaltis: string;
  tiroCabezazo: string;
  defensa: string;
  defensaMarcaje: string;
  defensaEntradas: string;
  defensaRobos: string;
  fisico: string;
  fisicoAceleracion: string;
  fisicoVelocidad: string;
  fisicoAgilidad: string;
  fisicoResistencia: string;
  fisicoFuerza: string;
  fisicoEquilibrio: string;
  fisicoSalto: string;
  mentalidad: string;
  mentalidadAgresividad: string;
  mentalidadAnticipacion: string;
  mentalidadInterceptacion: string;
  mentalidadVision: string;
  mentalidadCompostura: string;
  portero: string;
  porteroColocacion: string;
  porteroEstirada: string;
  porteroParadas: string;
  porteroSaques: string;
  porteroReflejos: string;
  especialidades: string;
  opinionDelEntrenador: string;
  picturePlayer: string;
  verify: number;
  telefono: string;
  telefonoPadre: string;
  telefonoMadre: string;
  emailPadre: string;
  emailMadre: string;
  nick: string;
  numero: string;
  dni: string;
  nombrePadre: string;
  dniPadre: string;
  nombreMadre: string;
  dniMadre: string;
  posicionDos: string;
  email: string;
  nacionalidad: string;
  direccion: string;
  municipio: string;
  imgDniUno: string;
  imgDniDos: string;
  dniPadre1: string;
  dniPadre2: string;
  dniMadre1: string;
  dniMadre2: string;

  constructor(object: any) {
    this.playerId = object.playerId || 0;
    this.nombre = object.nombre || '';
    this.apellido = object.apellido || '';
    this.posicion = object.posicion || 'Sin definir';
    this.fechaDeNacimiento = object.fechaDeNacimiento || '';
    this.altura = object.altura || '';
    this.peso = object.peso || '';
    this.piernaNatural = object.piernaNatural || '';
    this.habilidadConBalon = object.habilidadConBalon || '';
    this.habilidadConBalonControlDeBalon = object.habilidadConBalonControlDeBalon || '';
    this.habilidadConBalonRegate = object.habilidadConBalonRegate || '';
    this.pase = object.pase || '';
    this.paseCorto = object.paseCorto || '';
    this.paseLargo = object.paseLargo || '';
    this.centros = object.centros || '';
    this.tiro = object.tiro || '';
    this.tiroPotenciaDeTiro = object.tiroPotenciaDeTiro || '';
    this.tiroDefinicion = object.tiroDefinicion || '';
    this.tiroTirosLejanos = object.tiroTirosLejanos || '';
    this.tiroVoleas = object.tiroVoleas || '';
    this.tiroPrecisionFalta = object.tiroPrecisionFalta || '';
    this.tiroPenaltis = object.tiroPenaltis || '';
    this.tiroCabezazo = object.tiroCabezazo || '';
    this.defensa = object.defensa || '';
    this.defensaMarcaje = object.defensaMarcaje || '';
    this.defensaEntradas = object.defensaEntradas || '';
    this.defensaRobos = object.defensaRobos || '';
    this.fisico = object.fisico || '';
    this.fisicoAceleracion = object.fisicoAceleracion || '';
    this.fisicoVelocidad = object.fisicoVelocidad || '';
    this.fisicoAgilidad = object.fisicoAgilidad || '';
    this.fisicoResistencia = object.fisicoResistencia || '';
    this.fisicoFuerza = object.fisicoFuerza || '';
    this.fisicoEquilibrio = object.fisicoEquilibrio || '';
    this.fisicoSalto = object.fisicoSalto || '';
    this.mentalidad = object.mentalidad || '';
    this.mentalidadAgresividad = object.mentalidadAgresividad || '';
    this.mentalidadAnticipacion = object.mentalidadAnticipacion || '';
    this.mentalidadInterceptacion = object.mentalidadInterceptacion || '';
    this.mentalidadVision = object.mentalidadVision || '';
    this.mentalidadCompostura = object.mentalidadCompostura || '';
    this.portero = object.portero || '';
    this.porteroColocacion = object.porteroColocacion || '';
    this.porteroEstirada = object.porteroEstirada || '';
    this.porteroParadas = object.porteroParadas || '';
    this.porteroSaques = object.porteroSaques || '';
    this.porteroReflejos = object.porteroReflejos || '';
    this.especialidades = object.especialidades || '';
    this.opinionDelEntrenador = object.opinionDelEntrenador || '';
    this.picturePlayer = object.picturePlayer || '';
    this.verify = object.verify || 0;
    this.telefono = object.telefono || '';
    this.telefonoPadre = object.telefonoPadre || '';
    this.telefonoMadre = object.telefonoMadre || '';
    this.emailPadre = object.emailPadre || '';
    this.emailMadre = object.emailMadre || '';
    this.nick = object.nick || '';
    this.numero = object.numero || '';
    this.dni = object.dni || '';
    this.nombrePadre = object.nombrePadre || '';
    this.dniPadre = object.dniPadre || '';
    this.nombreMadre = object.nombreMadre || '';
    this.dniMadre = object.dniMadre || '';
    this.posicionDos = object.posicionDos || '';
    this.email = object.email || '';
    this.nacionalidad = object.nacionalidad || '';
    this.direccion = object.direccion || '';
    this.municipio = object.municipio || '';
    this.imgDniUno = object.imgDniUno || '';
    this.imgDniDos = object.imgDniDos || '';
    this.dniPadre1 = object.dniPadre1 || '';
    this.dniPadre2 = object.dniPadre2 || '';
    this.dniMadre1 = object.dniMadre1 || '';
    this.dniMadre2 = object.dniMadre2 || '';
  }
}

export class PlayerId {
  playerId: number;
  nombre: string;
  apellido: string;
  info: PlayerPostPartido | undefined;
  collapsed: boolean;

  constructor(object: any) {
    this.playerId = object.playerId || 0;
    this.nombre = object.nombre || '';
    this.apellido = object.apellido || '';
    this.collapsed = false; // Inicialmente, la tarea está contraída
  }
}

export class PlayerEstadistica {
  playerId: number;
  nombre: string;
  posicion: string;
  fecha: string;
  partidosJugados: string;
  minTotales: string;
  mediaMinPorPartido: string;
  goles: string;
  asistencias: string;
  golesAsistencias: string;
  golesPenalti: string;
  golesFalta: string;
  tarAmarilla: string;
  tarRojas: string;
  penaltisFallados: string;
  mediaGolesPorPartido: string;
  MediaAsistPorPartido: string;
  MediaGolesAsistenciasPorPartido: string;

  constructor(object: any) {
    this.playerId = object.playerId || 0;
    this.nombre = object.nombre || '';
    this.posicion = object.posicion || '';
    this.fecha = object.fecha || '';
    this.partidosJugados = object.partidosJugados || '';
    this.minTotales = object.minTotales || '';
    this.mediaMinPorPartido = object.mediaMinPorPartido || '';
    this.goles = object.goles || '';
    this.asistencias = object.asistencias || '';
    this.golesAsistencias = object.golesAsistencias || '';
    this.golesPenalti = object.golesPenalti || '';
    this.golesFalta = object.golesFalta || '';
    this.tarAmarilla = object.tarAmarilla || '';
    this.tarRojas = object.tarRojas || '';
    this.penaltisFallados = object.penaltisFallados || '';
    this.mediaGolesPorPartido = object.mediaGolesPorPartido || '';
    this.MediaAsistPorPartido = object.MediaAsistPorPartido || '';
    this.MediaGolesAsistenciasPorPartido = object.MediaGolesAsistenciasPorPartido || '';
  }
}

export class NotificatePlayerUI {
  players: Player[] = [];
  rival: string = '';
  noConvocados: string[] = [];
  convocados: string[] = [];
  lugar: string = '';
  fechaPartido: string = '';
  horaQuedada: string = '';
  horaPartido: string = '';
  tipoPartido: string = '';
  local: number = 0; // 0 para local, 1 para visitante

  constructor(object: any) {
    this.players = object.players || [];
    this.rival = object.rival || '';
    this.noConvocados = object.noConvocados || [];
    this.convocados = object.convocados || [];
    this.lugar = object.lugar || '';
    this.fechaPartido = object.fechaPartido || '';
    this.horaQuedada = object.horaQuedada || '';
    this.horaPartido = object.horaPartido || '';
    this.tipoPartido = object.tipoPartido || '';
    this.local = object.local || 0;
  }
}

