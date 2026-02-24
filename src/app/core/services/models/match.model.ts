import { PlayerId } from "../player/player.model";

export class MatchPreparation {
  matchPreparationId: number;
  abp: string;
  matchDate: string;
  matchTactics: string;
  rivalInfo: string;
  rivalName: string;
  trainingPicture: string;
  trainingText: string;
  refereeName: string;
  summoned: string;
  terreno: string;
  lugar: string;
  hora: string;
  minutos: string;
  visible: number;
  infoVisible: number;
  horaEmpieza: string;
  minutosEmpieza: string;

  // Nuevas propiedades (de la primera solicitud)
  tipoPartido: string;
  puntosFuertesRival: string;
  puntosDebilesRival: string;
  jugadoresClaveRival: string;
  estiloJuegoRival: string;
  ultimosResultadosRival: string;
  formacionesRecientesRival: string;
  patronesOfensivosRival: string;
  patronesDefensivosRival: string;
  estadisticasRival: string;
  tendenciasTacticasRival: string;
  datosIndividualesRival: string;
  abpsRival: string;

  // Nuevas propiedades (de la segunda solicitud)
  formacionInicial: string;
  planJuegoAtaque: string;
  planJuegoDefensa: string;
  transicionesOfensivas: string;
  transicionesDefensivas: string;
  abpsOfensivas: string;
  abpsDefensivas: string;
  rolesEspecificos: string;
  ajustesTacticos: string;
  convocatoria: string;
  imgClub: any;
  equipacion: string;
  siAsisten: string;

  constructor(object: any) {
    this.matchPreparationId = object.matchPreparationId || 0;
    this.abp = object.abp || '';
    this.matchDate = object.matchDate || '';
    this.matchTactics = object.matchTactics || '';
    this.rivalInfo = object.rivalInfo || '';
    this.rivalName = object.rivalName || '';
    this.trainingPicture = object.trainingPicture || '';
    this.trainingText = object.trainingText || '';
    this.refereeName = object.refereeName || '';
    this.summoned = object.summoned || '';
    this.terreno = object.terreno || '';
    this.lugar = object.lugar || '';
    this.hora = object.hora || '';
    this.minutos = object.minutos || '';
    this.visible = object.visible || 0;
    this.infoVisible = object.infoVisible || 0;
    this.horaEmpieza = object.horaEmpieza || '';
    this.minutosEmpieza = object.minutosEmpieza || '';

    // Nuevas propiedades (de la primera solicitud)
    this.tipoPartido = object.tipoPartido || '';
    this.puntosFuertesRival = object.puntosFuertesRival || '';
    this.puntosDebilesRival = object.puntosDebilesRival || '';
    this.jugadoresClaveRival = object.jugadoresClaveRival || '';
    this.estiloJuegoRival = object.estiloJuegoRival || '';
    this.ultimosResultadosRival = object.ultimosResultadosRival || '';
    this.formacionesRecientesRival = object.formacionesRecientesRival || '';
    this.patronesOfensivosRival = object.patronesOfensivosRival || '';
    this.patronesDefensivosRival = object.patronesDefensivosRival || '';
    this.estadisticasRival = object.estadisticasRival || '';
    this.tendenciasTacticasRival = object.tendenciasTacticasRival || '';
    this.datosIndividualesRival = object.datosIndividualesRival || '';
    this.abpsRival = object.abpsRival || '';

    // Nuevas propiedades (de la segunda solicitud)
    this.formacionInicial = object.formacionInicial || '';
    this.planJuegoAtaque = object.planJuegoAtaque || '';
    this.planJuegoDefensa = object.planJuegoDefensa || '';
    this.transicionesOfensivas = object.transicionesOfensivas || '';
    this.transicionesDefensivas = object.transicionesDefensivas || '';
    this.abpsOfensivas = object.abpsOfensivas || '';
    this.abpsDefensivas = object.abpsDefensivas || '';
    this.rolesEspecificos = object.rolesEspecificos || '';
    this.ajustesTacticos = object.ajustesTacticos || '';
    this.convocatoria = object.convocatoria || '';
    this.equipacion = object.equipacion || '';
    this.siAsisten = object.siAsisten || '';
  }
}

export class PostPartido {
  postPartidoId: number = 0;
  matchPreparation: MatchPreparation;
  golesAFavor: number = 0;
  golesEnContra: number = 0;
  disparosAFavor: number = 0;
  disparosEnContra: number = 0;
  faltasCometidas: number = 0;
  faltasRecibidas: number = 0;
  cornersAFavor: number = 0;
  cornersEnContra: number = 0;
  penaltisAFavor: number = 0;
  penaltisEnContra: number = 0;
  recuperaciones: number = 0;
  perdidas: number = 0;
  paradasPortero: number = 0;
  tarjetasAmarillas: number = 0;
  tarjetasRojas: number = 0;
  llegadasPeligroAFavor: number = 0;
  llegadasPeligroEnContra: number = 0;
  anotaciones: string = '';
  resultado: string;
  video: string;

  constructor(object: any) {
    this.postPartidoId = object.postPartidoId || 0;
    this.matchPreparation = object.matchPreparation || new MatchPreparation({});
    this.golesAFavor = object.golesAFavor || 0;
    this.golesEnContra = object.golesEnContra || 0;
    this.disparosAFavor = object.disparosAFavor || 0;
    this.disparosEnContra = object.disparosEnContra || 0;
    this.faltasCometidas = object.faltasCometidas || 0;
    this.faltasRecibidas = object.faltasRecibidas || 0;
    this.cornersAFavor = object.cornersAFavor || 0;
    this.cornersEnContra = object.cornersEnContra || 0;
    this.penaltisAFavor = object.penaltisAFavor || 0;
    this.penaltisEnContra = object.penaltisEnContra || 0;
    this.recuperaciones = object.recuperaciones || 0;
    this.perdidas = object.perdidas || 0;
    this.paradasPortero = object.paradasPortero || 0;
    this.tarjetasAmarillas = object.tarjetasAmarillas || 0;
    this.tarjetasRojas = object.tarjetasRojas || 0;
    this.llegadasPeligroAFavor = object.llegadasPeligroAFavor || 0;
    this.llegadasPeligroEnContra = object.llegadasPeligroEnContra || 0;
    this.anotaciones = object.anotaciones || '';
    this.resultado = object.resultado || '';
    this.video = object.video || '';
  }
}

export class PlayerPostPartido {
  playerPostPartidoId: number = 0;
  postPartido: PostPartidoId;
  player: PlayerId;
  minutos: number = 0;
  goles: number = 0;
  golesPenalti: number = 0;
  golesFalta: number = 0;
  faltasCometidas: number = 0;
  faltasRecibidas: number = 0;
  recuperaciones: number = 0;
  perdidas: number = 0;
  tarjetasAmarillas: number = 0;
  tarjetasRojas: number = 0;
  disparosTotales: number = 0;
  disparosPuerta: number = 0;
  paradasPortero: number = 0;
  anotaciones: string = '';
  penaltisCometidos: number = 0;
  penaltisRecibidos: number = 0;
  asistencias: number = 0;
  penaltisFallados: number = 0;

  constructor(object: any) {
    this.playerPostPartidoId = object.playerPostPartidoId || 0;
    this.postPartido = object.postPartido || new PostPartidoId({});
    this.player = object.player || new PlayerId({});
    this.minutos = object.minutos || 0;
    this.goles = object.goles || 0;
    this.golesPenalti = object.golesPenalti || 0;
    this.golesFalta = object.golesFalta || 0;
    this.faltasCometidas = object.faltasCometidas || 0;
    this.faltasRecibidas = object.faltasRecibidas || 0;
    this.recuperaciones = object.recuperaciones || 0;
    this.perdidas = object.perdidas || 0;
    this.tarjetasAmarillas = object.tarjetasAmarillas || 0;
    this.tarjetasRojas = object.tarjetasRojas || 0;
    this.disparosTotales = object.disparosTotales || 0;
    this.disparosPuerta = object.disparosPuerta || 0;
    this.paradasPortero = object.paradasPortero || 0;
    this.anotaciones = object.anotaciones || '';
    this.penaltisCometidos = object.penaltisCometidos || 0;
    this.penaltisRecibidos = object.penaltisRecibidos || 0;
    this.asistencias = object.asistencias || 0;
    this.penaltisFallados = object.penaltisFallados || 0;
  }
}

export class PostPartidoId {
  postPartidoId: number = 0;

  constructor(object: any) {
    this.postPartidoId = object.postPartidoId || 0;
  }
}

export class ConvocatoriaUI {
  id: number;
  playerId: number;
  nombre: string;
  img: string;
  posicion_x: any;
  posicion_y: any;
  confirmacion: number;
  posicion_slot?: number;
  dorsal?: number | null;
  numero?: number | null;

  constructor(object: any) {
    this.id = object.id || 0;
    this.playerId = object.playerId || 0;
    this.nombre = object.nombre || '';
    this.img = object.img || '';
    this.posicion_x = object.posicion_x || null;
    this.posicion_y = object.posicion_y || null;
    this.confirmacion = object.confirmacion || 0;
    this.posicion_slot = object.posicion_slot ?? null;
    this.dorsal = object.dorsal ?? null;
    this.numero = object.numero ?? null;
  }
}
