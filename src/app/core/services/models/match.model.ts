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
    }
}

export class PostPartidoId {
    postPartidoId: number = 0;

    constructor(object: any) {
        this.postPartidoId = object.postPartidoId || 0;
    }
}
