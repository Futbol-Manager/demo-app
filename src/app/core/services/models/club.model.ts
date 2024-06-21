export class Club {
    clubId: number;
    name: string;
    identification: string;
    userId: string;
    foundationDate: string;

    constructor(object: any) {
        this.clubId = object.clubId || 0;
        this.name = object.name || '';
        this.identification = object.identification || '';
        this.userId = object.userId || 0;
        this.foundationDate = object.foundationDate || '';
    }

}

export class CuotasClub {
    cuotasClubId: number;
    clubId: number;
    banco: string;
    asunto: string;
    temporada: string;
    bizum: string;
    stripeId: string
    urlStripe: string

    constructor(object: any) {
        this.cuotasClubId = object.cuotasClubId || 0;
        this.clubId = object.clubId || 0;
        this.banco = object.banco || '';
        this.asunto = object.asunto || '';
        this.temporada = object.temporada || '';
        this.bizum = object.bizum || '';
        this.stripeId = object.stripeId || '';
        this.urlStripe = object.urlStripe || '';
    }

}

export class HistoryCuotasClub {
    historyCuotasClubId: number;
    clubId: number;
    teamId: string;
    playerId: string;
    temporada: string;
    estado: string;
    fraccionado: string;
    pagoConRopa: string;
    pagoUno: string;
    datePagoUno: string;
    pagoDos: string;
    datePagoDos: string;
    pagoTres: string;
    datePagoTres: string;
    totalPagado: string;
    totalCuota: string;
    stripeId: string;
    urlStripe: string;
    pagoRopa: string;
	datePagoRopa: string;

    constructor(object: any) {
        this.historyCuotasClubId = object.historyCuotasClubId || 0;
        this.clubId = object.clubId || 0;
        this.teamId = object.teamId || 0;
        this.playerId = object.playerId || 0;
        this.temporada = object.temporada || '';
        this.estado = object.estado || '';
        this.fraccionado = object.fraccionado || 0;
        this.pagoConRopa = object.pagoConRopa || 0;
        this.pagoUno = object.pagoUno || '';
        this.datePagoUno = object.datePagoUno || '';
        this.pagoDos = object.pagoDos || '';
        this.datePagoDos = object.datePagoDos || '';
        this.pagoTres = object.pagoTres || '';
        this.totalPagado = object.totalPagado || '';
        this.datePagoTres = object.datePagoTres || '';
        this.totalCuota = object.totalCuota || '';
        this.stripeId = object.stripeId || '';
        this.urlStripe = object.urlStripe || '';
        this.pagoRopa = object.pagoRopa || '';
        this.datePagoRopa = object.datePagoRopa || '';
    }
}


export class PaymentRequest {
    amount: number;
    paymentMethodId: string;

    constructor(object: any) {
        this.paymentMethodId = object.paymentMethodId || '';
        this.amount = object.amount || 0;
    }
}

export class HistorialPagosPlayer {
    historyPagosPlayerId: number;
    clubId: number;
    teamId: number;
    temporada: string;
    cantidad: string;
    fecha: string;
    metodo: string;
    comentario: string;

    constructor(object: any) {
        this.historyPagosPlayerId = object.historyPagosPlayerId ? object.historyPagosPlayerId : 0;
        this.clubId = object.clubId ? object.clubId : 0;
        this.teamId = object.teamId ? object.teamId : 0;
        this.temporada = object.temporada ? object.temporada : '';
        this.cantidad = object.cantidad ? object.cantidad : '';
        this.fecha = object.fecha ? object.fecha : '';
        this.metodo = object.metodo ? object.metodo : '';
        this.comentario = object.comentario ? object.comentario : '';
    }

}