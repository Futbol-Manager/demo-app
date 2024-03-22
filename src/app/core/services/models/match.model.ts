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
    posPartidoId: number = 0;
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

    constructor(object: any) {
        this.posPartidoId = object.posPartidoId || 0;
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
    }
}
