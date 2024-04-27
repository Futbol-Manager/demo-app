export class RespPreEntreno {
    respPreEntrenoId: number;
    playerId: number;
    trainingSessionId: number;
    q1: string;
    q2: string;
    q3: string;
    q4: string;
    q5: string;
    q6: string;
    q7: string;
    q8: string;
    q9: string;
    q10: string;
    q11: string;
    q12: string;

    constructor(object: any) {
        this.respPreEntrenoId = object.respPreEntrenoId || 0;
        this.playerId = object.playerId || 0;
        this.trainingSessionId = object.trainingSessionId || 0;
        this.q1 = object.q1 || '';
        this.q2 = object.q2 || '';
        this.q3 = object.q3 || '';
        this.q4 = object.q4 || '';
        this.q5 = object.q5 || '';
        this.q6 = object.q6 || '';
        this.q7 = object.q7 || '';
        this.q8 = object.q8 || '';
        this.q9 = object.q9 || '';
        this.q10 = object.q10 || '';
        this.q11 = object.q11 || '';
        this.q12 = object.q12 || '';
    }
}

export class RespPostEntreno {
    respPostEntrenoId: number;
    playerId: number;
    trainingSessionId: number;
    q1: string;
    q2: string;
    q3: string;
    q4: string;
    q5: string;
    q6: string;
    q7: string;
    q8: string;
    q9: string;
    q10: string;
    q11: string;
    q12: string;

    constructor(object: any) {
        this.respPostEntrenoId = object.respPostEntrenoId || 0;
        this.playerId = object.playerId || 0;
        this.trainingSessionId = object.trainingSessionId || 0;
        this.q1 = object.q1 || '';
        this.q2 = object.q2 || '';
        this.q3 = object.q3 || '';
        this.q4 = object.q4 || '';
        this.q5 = object.q5 || '';
        this.q6 = object.q6 || '';
        this.q7 = object.q7 || '';
        this.q8 = object.q8 || '';
        this.q9 = object.q9 || '';
        this.q10 = object.q10 || '';
        this.q11 = object.q11 || '';
        this.q12 = object.q12 || '';
    }
}

export class RespPrePartido {
    respPrePartidoId: number;
    playerId: number;
    matchPreparationId: number;
    q1: string;
    q2: string;
    q3: string;
    q4: string;
    q5: string;
    q6: string;
    q7: string;
    q8: string;
    q9: string;
    q10: string;
    q11: string;
    q12: string;
    q13: string;

    constructor(object: any) {
        this.respPrePartidoId = object.respPrePartidoId || 0;
        this.playerId = object.playerId || 0;
        this.matchPreparationId = object.matchPreparationId || 0;
        this.q1 = object.q1 || '';
        this.q2 = object.q2 || '';
        this.q3 = object.q3 || '';
        this.q4 = object.q4 || '';
        this.q5 = object.q5 || '';
        this.q6 = object.q6 || '';
        this.q7 = object.q7 || '';
        this.q8 = object.q8 || '';
        this.q9 = object.q9 || '';
        this.q10 = object.q10 || '';
        this.q11 = object.q11 || '';
        this.q12 = object.q12 || '';
        this.q13 = object.q13 || '';
    }
}

export class RespPostPartido {
    respPostPartidoId: number;
    playerId: number;
    matchPreparationId: number;
    q1: string;
    q2: string;
    q3: string;
    q4: string;
    q5: string;
    q6: string;
    q7: string;
    q8: string;
    q9: string;
    q10: string;
    q11: string;
    q12: string;

    constructor(object: any) {
        this.respPostPartidoId = object.respPostPartidoId || 0;
        this.playerId = object.playerId || 0;
        this.matchPreparationId = object.matchPreparationId || 0;
        this.q1 = object.q1 || '';
        this.q2 = object.q2 || '';
        this.q3 = object.q3 || '';
        this.q4 = object.q4 || '';
        this.q5 = object.q5 || '';
        this.q6 = object.q6 || '';
        this.q7 = object.q7 || '';
        this.q8 = object.q8 || '';
        this.q9 = object.q9 || '';
        this.q10 = object.q10 || '';
        this.q11 = object.q11 || '';
        this.q12 = object.q12 || '';
    }
}