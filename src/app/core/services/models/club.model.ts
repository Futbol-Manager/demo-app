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


export class Abonado {
    abonadoId: number;
    nombre: string;
    apellidos: string;
    imgPerfil: string;
    fechaDeNacimiento: string;
    estado: number;
    dni: string;
    mail: string
    telefono: string
    genero: string

    constructor(object: any) {
        this.abonadoId = object.abonadoId || 0;
        this.nombre = object.nombre || '';
        this.apellidos = object.apellidos || '';
        this.imgPerfil = object.imgPerfil || '';
        this.fechaDeNacimiento = object.fechaDeNacimiento || '';
        this.estado = object.estado || 0;
        this.dni = object.dni || '';
        this.mail = object.mail || '';
        this.telefono = object.telefono || '';
        this.genero = object.genero || '';
    }
}

export class AbonadoTemporada {
    abonadosTemporadaId: number;
    clubId: number;
    abonado: Abonado;
    temporada: string;
    cuota: number;
    pagado: string;
    restante: string;
    estado: number;
    fechaCreate: string
    fechaBaja: string

    constructor(object: any) {
        this.abonadosTemporadaId = object.abonadosTemporadaId || 0;
        this.clubId = object.clubId || 0;
        this.abonado = object.abonado || Abonado;
        this.temporada = object.temporada || '';
        this.cuota = object.cuota || 0;
        this.pagado = object.pagado || '';
        this.restante = object.restante || '';
        this.estado = object.estado || 0;
        this.fechaCreate = object.fechaCreate || '';
        this.fechaBaja = object.fechaBaja || '';
    }
}

export class AbonadoPagoHistorico {
    abonadoPagoHistoricoId: number;
    abonadosTemporadaId: number;
    tipo: string;
    metodo: number;
    cantidad: string;
    fechaPago: string;
    fechaCreate: string;
    comentario: string;

    constructor(object: any) {
        this.abonadoPagoHistoricoId = object.abonadoPagoHistoricoId || 0;
        this.abonadosTemporadaId = object.abonadosTemporadaId || 0;
        this.tipo = object.tipo || '';
        this.metodo = object.metodo || 0;
        this.cantidad = object.cantidad || '';
        this.fechaPago = object.fechaPago || '';
        this.fechaCreate = object.fechaCreate || '';
        this.comentario = object.comentario || '';
    }
}

export class Patrocinador {
    patrocinadorId: number;
    clubId: number;
    nombre: string;
    descripcion: string;
    imagen: string;
    fechaCreate: string;
    estado: number;
    oculto: number;
    web: string;
    beneficios: string;
    telefono: string;
    mail: string;

    constructor(object: any) {
        this.patrocinadorId = object.patrocinadorId || 0;
        this.clubId = object.clubId || 0;
        this.nombre = object.nombre || '';
        this.descripcion = object.descripcion || '';
        this.imagen = object.imagen || '';
        this.fechaCreate = object.fechaCreate || '';
        this.estado = object.estado || 0;
        this.oculto = object.oculto || 0;
        this.web = object.web || '';
        this.beneficios = object.beneficios || '';
        this.telefono = object.telefono || '';
        this.mail = object.mail || '';
    }
}


export class CorreoEnviado {
    correoEnviadoId: number;
    clubId: number;
    teamId: number;
    userId: number;
    destinatarios: string;
    asunto: string;
    body: string;
    fechaCreate: string;
    remitente: string;
    destinatario: string;
    temporada: string;

    constructor(object: any) {
        this.correoEnviadoId = object.correoEnviadoId || 0;
        this.clubId = object.clubId || 0;
        this.teamId = object.teamId || 0;
        this.userId = object.userId || 0;
        this.asunto = object.asunto || '';
        this.destinatarios = object.destinatarios || '0';
        this.body = object.body || '';
        this.fechaCreate = object.fechaCreate || '';
        this.remitente = object.remitente || '';
        this.destinatario = object.destinatario || '';
        this.temporada = object.temporada || '';
    }
}