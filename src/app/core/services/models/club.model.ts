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
    cuotaConRopa: string;
    cuotaSinRopa: string;
    fraccionado: number;
    pagoConUno: string;
    pagoConDos: string;
    pagoConTres: string;
    pagoSinUno: string;
    pagoSinDos: string;
    pagoSinTres: string;
    banco: string;
    asunto: string;
    estado: string;
    teamId: number;
    restante: string;

    constructor(object: any) {
        this.cuotasClubId = object.cuotasClubId || 0;
        this.clubId = object.clubId || 0;
        this.cuotaConRopa = object.cuotaConRopa || '';
        this.cuotaSinRopa = object.cuotaSinRopa || '';
        this.fraccionado = object.fraccionado || 0;
        this.pagoConUno = object.pagoConUno || '';
        this.pagoConDos = object.pagoConDos || '';
        this.pagoConTres = object.pagoConTres || '';
        this.pagoSinUno = object.pagoSinUno || '';
        this.pagoSinDos = object.pagoSinDos || '';
        this.pagoSinTres = object.pagoSinTres || '';
        this.banco = object.banco || '';
        this.asunto = object.asunto || '';
        this.estado = object.estado || '';
        this.teamId = object.teamId || 0;
        this.restante = object.restante || '';
    }

}