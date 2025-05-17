export class RopaJugador {
    ropaJugadorId: number;
    player: any;  // Suponiendo que PlayerEntity tiene su propia clase en Angular
    team: any;  // Suponiendo que TeamEntity tiene su propia clase en Angular
    clubId: number;
    temporada: string;
    camisetaJuego: string;
    pantalonJuego: string;
    camisetaEntreno: string;
    pantalonEntreno: string;
    sudaderaEntreno: string;
    chaquetaChandal: string;
    pantalonChandal: string;
    poloPaseo: string;
    pantalonPaseo: string;
    medias: string;
    abrigo: string;
    chubasquero: string;
    mochila: string;
    camisetaJuegoOk: number;
    pantalonJuegoOk: number;
    camisetaEntrenoOk: number;
    pantalonEntrenoOk: number;
    sudaderaEntrenoOk: number;
    chaquetaChandalOk: number;
    pantalonChandalOk: number;
    poloPaseoOk: number;
    pantalonPaseoOk: number;
    mediasOk: number;
    abrigoOk: number;
    chubasqueroOk: number;
    mochilaOk: number;
    estado: string;

    constructor(object: any) {
        this.ropaJugadorId = object.ropaJugadorId ? object.ropaJugadorId : null;
        this.player = object.player ? object.player : null;
        this.team = object.team ? object.team : null;
        this.clubId = object.clubId ? object.clubId : null;
        this.temporada = object.temporada ? object.temporada : null;
        this.camisetaJuego = object.camisetaJuego ? object.camisetaJuego : null;
        this.pantalonJuego = object.pantalonJuego ? object.pantalonJuego : null;
        this.camisetaEntreno = object.camisetaEntreno ? object.camisetaEntreno : null;
        this.pantalonEntreno = object.pantalonEntreno ? object.pantalonEntreno : null;
        this.sudaderaEntreno = object.sudaderaEntreno ? object.sudaderaEntreno : null;
        this.chaquetaChandal = object.chaquetaChandal ? object.chaquetaChandal : null;
        this.pantalonChandal = object.pantalonChandal ? object.pantalonChandal : null;
        this.poloPaseo = object.poloPaseo ? object.poloPaseo : null;
        this.pantalonPaseo = object.pantalonPaseo ? object.pantalonPaseo : null;
        this.medias = object.medias ? object.medias : null;
        this.abrigo = object.abrigo ? object.abrigo : null;
        this.chubasquero = object.chubasquero ? object.chubasquero : null;
        this.mochila = object.mochila ? object.mochila : null;
        this.camisetaJuegoOk = object.camisetaJuegoOk ? object.camisetaJuegoOk : null;
        this.pantalonJuegoOk = object.pantalonJuegoOk ? object.pantalonJuegoOk : null;
        this.camisetaEntrenoOk = object.camisetaEntrenoOk ? object.camisetaEntrenoOk : null;
        this.pantalonEntrenoOk = object.pantalonEntrenoOk ? object.pantalonEntrenoOk : null;
        this.sudaderaEntrenoOk = object.sudaderaEntrenoOk ? object.sudaderaEntrenoOk : null;
        this.chaquetaChandalOk = object.chaquetaChandalOk ? object.chaquetaChandalOk : null;
        this.pantalonChandalOk = object.pantalonChandalOk ? object.pantalonChandalOk : null;
        this.poloPaseoOk = object.poloPaseoOk ? object.poloPaseoOk : null;
        this.pantalonPaseoOk = object.pantalonPaseoOk ? object.pantalonPaseoOk : null;
        this.mediasOk = object.mediasOk ? object.mediasOk : null;
        this.abrigoOk = object.abrigoOk ? object.abrigoOk : null;
        this.chubasqueroOk = object.chubasqueroOk ? object.chubasqueroOk : null;
        this.mochilaOk = object.mochilaOk ? object.mochilaOk : null;
        this.estado = object.estado ? object.estado : null;
    }
}

export class RopaClub {
    ropaclubId: number;
    clubId: number;
    temporada: string;
    camisetaJuego: number;
    pantalonJuego: number;
    medias: number;
    camisetaJuegoDos: number;
    pantalonJuegoDos: number;
    mediasDos: number;
    camisetaEntreno: number;
    pantalonEntreno: number;
    mediasTres: number;
    sudaderaEntreno: number;
    chaquetaChandal: number;
    pantalonChandal: number;
    poloPaseo: number;
    pantalonPaseo: number;
    abrigo: number;
    chubasquero: number;
    mochila: number;

    constructor(object: any = {}) {
        this.ropaclubId = object.ropaclubId ? object.ropaclubId : 0;
        this.clubId = object.clubId ? object.clubId : 0;
        this.temporada = object.temporada ? object.temporada : '2024';
        this.camisetaJuego = object.camisetaJuego ? object.camisetaJuego : 0;
        this.pantalonJuego = object.pantalonJuego ? object.pantalonJuego : 0;
        this.camisetaEntreno = object.camisetaEntreno ? object.camisetaEntreno : 0;
        this.pantalonEntreno = object.pantalonEntreno ? object.pantalonEntreno : 0;
        this.sudaderaEntreno = object.sudaderaEntreno ? object.sudaderaEntreno : 0;
        this.chaquetaChandal = object.chaquetaChandal ? object.chaquetaChandal : 0;
        this.pantalonChandal = object.pantalonChandal ? object.pantalonChandal : 0;
        this.poloPaseo = object.poloPaseo ? object.poloPaseo : 0;
        this.pantalonPaseo = object.pantalonPaseo ? object.pantalonPaseo : 0;
        this.medias = object.medias ? object.medias : 0;
        this.abrigo = object.abrigo ? object.abrigo : 0;
        this.chubasquero = object.chubasquero ? object.chubasquero : 0;
        this.mochila = object.mochila ? object.mochila : 0;
        this.camisetaJuegoDos = object.camisetaJuegoDos ? object.camisetaJuegoDos : 0;
        this.pantalonJuegoDos = object.pantalonJuegoDos ? object.pantalonJuegoDos : 0;
        this.mediasDos = object.mediasDos ? object.mediasDos : 0;
        this.mediasTres = object.mediasTres ? object.mediasTres : 0;
    }
}


export class ClubCuotas {
    clubCuotasId: number;
    clubId: number;
    cuotaRopa: string;
    cuotaRopaDate: string;
    numCuotas: number;
    cuotaUno: string;
    cuotaDos: string;
    cuotaTres: string;
    cuotaCuatro: string;
    cuotaCinco: string;
    cuotaSeis: string;
    cuotaSiete: string;
    cuotaOcho: string;
    cuotaNueve: string;
    cuotaDiez: string;
    cuotaOnce: string;
    cuotaDoce: string;
    totalCuota: string;
    cuotaUnoDate: string;
    cuotaDosDate: string;
    cuotaTresDate: string;
    cuotaCuatroDate: string;
    cuotaCincoDate: string;
    cuotaSeisDate: string;
    cuotaSieteDate: string;
    cuotaOchoDate: string;
    cuotaNueveDate: string;
    cuotaDiezDate: string;
    cuotaOnceDate: string;
    cuotaDoceDate: string;
    cuotaUnoAlias: string;
    cuotaDosAlias: string;
    cuotaTresAlias: string;
    cuotaCuatroAlias: string;
    cuotaCincoAlias: string;
    cuotaSeisAlias: string;
    cuotaSieteAlias: string;
    cuotaOchoAlias: string;
    cuotaNueveAlias: string;
    cuotaDiezAlias: string;
    cuotaOnceAlias: string;
    cuotaDoceAlias: string;
    temporada: string;

    constructor(object: any) {
        this.clubCuotasId = object.clubCuotasId ? object.clubCuotasId : null;
        this.clubId = object.clubId ? object.clubId : null;this.cuotaRopa = object.cuotaRopa ? object.cuotaRopa : null;
        this.cuotaRopa = object.cuotaRopa ? object.cuotaRopa : null;
        this.cuotaRopaDate = object.cuotaRopaDate ? object.cuotaRopaDate : null;
        this.numCuotas = object.numCuotas ? object.numCuotas : 1;
        this.cuotaUno = object.cuotaUno ? object.cuotaUno : null;
        this.cuotaDos = object.cuotaDos ? object.cuotaDos : null;
        this.cuotaTres = object.cuotaTres ? object.cuotaTres : null;
        this.cuotaCuatro = object.cuotaCuatro ? object.cuotaCuatro : null;
        this.cuotaCinco = object.cuotaCinco ? object.cuotaCinco : null;
        this.cuotaSeis = object.cuotaSeis ? object.cuotaSeis : null;
        this.cuotaSiete = object.cuotaSiete ? object.cuotaSiete : null;
        this.cuotaOcho = object.cuotaOcho ? object.cuotaOcho : null;
        this.cuotaNueve = object.cuotaNueve ? object.cuotaNueve : null;
        this.cuotaDiez = object.cuotaDiez ? object.cuotaDiez : null;
        this.cuotaOnce = object.cuotaOnce ? object.cuotaOnce : null;
        this.cuotaDoce = object.cuotaDoce ? object.cuotaDoce : null;
        this.totalCuota = object.totalCuota ? object.totalCuota : null;
        this.cuotaUnoDate = object.cuotaUnoDate ? object.cuotaUnoDate : null;
        this.cuotaDosDate = object.cuotaDosDate ? object.cuotaDosDate : null;
        this.cuotaTresDate = object.cuotaTresDate ? object.cuotaTresDate : null;
        this.cuotaCuatroDate = object.cuotaCuatroDate ? object.cuotaCuatroDate : null;
        this.cuotaCincoDate = object.cuotaCincoDate ? object.cuotaCincoDate : null;
        this.cuotaSeisDate = object.cuotaSeisDate ? object.cuotaSeisDate : null;
        this.cuotaSieteDate = object.cuotaSieteDate ? object.cuotaSieteDate : null;
        this.cuotaOchoDate = object.cuotaOchoDate ? object.cuotaOchoDate : null;
        this.cuotaNueveDate = object.cuotaNueveDate ? object.cuotaNueveDate : null;
        this.cuotaDiezDate = object.cuotaDiezDate ? object.cuotaDiezDate : null;
        this.cuotaOnceDate = object.cuotaOnceDate ? object.cuotaOnceDate : null;
        this.cuotaDoceDate = object.cuotaDoceDate ? object.cuotaDoceDate : null;
        this.cuotaUnoAlias = object.cuotaUnoAlias ? object.cuotaUnoAlias : null;
        this.cuotaDosAlias = object.cuotaDosAlias ? object.cuotaDosAlias : null;
        this.cuotaTresAlias = object.cuotaTresAlias ? object.cuotaTresAlias : null;
        this.cuotaCuatroAlias = object.cuotaCuatroAlias ? object.cuotaCuatroAlias : null;
        this.cuotaCincoAlias = object.cuotaCincoAlias ? object.cuotaCincoAlias : null;
        this.cuotaSeisAlias = object.cuotaSeisAlias ? object.cuotaSeisAlias : null;
        this.cuotaSieteAlias = object.cuotaSieteAlias ? object.cuotaSieteAlias : null;
        this.cuotaOchoAlias = object.cuotaOchoAlias ? object.cuotaOchoAlias : null;
        this.cuotaNueveAlias = object.cuotaNueveAlias ? object.cuotaNueveAlias : null;
        this.cuotaDiezAlias = object.cuotaDiezAlias ? object.cuotaDiezAlias : null;
        this.cuotaOnceAlias = object.cuotaOnceAlias ? object.cuotaOnceAlias : null;
        this.cuotaDoceAlias = object.cuotaDoceAlias ? object.cuotaDoceAlias : null;
        this.temporada = object.temporada ? object.temporada : null;
    }
}


export class PlayerCuotas {
    playerCuotasId: number;
    playerId: number;
    cuotaRopa: string;
    cuotaRopaDate: string;
    numCuotas: number;
    cuotaUno: string;
    cuotaDos: string;
    cuotaTres: string;
    cuotaCuatro: string;
    cuotaCinco: string;
    cuotaSeis: string;
    cuotaSiete: string;
    cuotaOcho: string;
    cuotaNueve: string;
    cuotaDiez: string;
    cuotaOnce: string;
    cuotaDoce: string;
    totalCuota: string;
    cuotaUnoDate: string;
    cuotaDosDate: string;
    cuotaTresDate: string;
    cuotaCuatroDate: string;
    cuotaCincoDate: string;
    cuotaSeisDate: string;
    cuotaSieteDate: string;
    cuotaOchoDate: string;
    cuotaNueveDate: string;
    cuotaDiezDate: string;
    cuotaOnceDate: string;
    cuotaDoceDate: string;
    temporada: string;

    constructor(object: any) {
        this.playerCuotasId = object.playerCuotasId ? object.playerCuotasId : 0;
        this.playerId = object.playerId ? object.playerId : null;this.cuotaRopa = object.cuotaRopa ? object.cuotaRopa : null;
        this.cuotaRopa = object.cuotaRopa ? object.cuotaRopa : null;
        this.cuotaRopaDate = object.cuotaRopaDate ? object.cuotaRopaDate : null;
        this.numCuotas = object.numCuotas ? object.numCuotas : 1;
        this.cuotaUno = object.cuotaUno ? object.cuotaUno : null;
        this.cuotaDos = object.cuotaDos ? object.cuotaDos : null;
        this.cuotaTres = object.cuotaTres ? object.cuotaTres : null;
        this.cuotaCuatro = object.cuotaCuatro ? object.cuotaCuatro : null;
        this.cuotaCinco = object.cuotaCinco ? object.cuotaCinco : null;
        this.cuotaSeis = object.cuotaSeis ? object.cuotaSeis : null;
        this.cuotaSiete = object.cuotaSiete ? object.cuotaSiete : null;
        this.cuotaOcho = object.cuotaOcho ? object.cuotaOcho : null;
        this.cuotaNueve = object.cuotaNueve ? object.cuotaNueve : null;
        this.cuotaDiez = object.cuotaDiez ? object.cuotaDiez : null;
        this.cuotaOnce = object.cuotaOnce ? object.cuotaOnce : null;
        this.cuotaDoce = object.cuotaDoce ? object.cuotaDoce : null;
        this.totalCuota = object.totalCuota ? object.totalCuota : null;
        this.cuotaUnoDate = object.cuotaUnoDate ? object.cuotaUnoDate : null;
        this.cuotaDosDate = object.cuotaDosDate ? object.cuotaDosDate : null;
        this.cuotaTresDate = object.cuotaTresDate ? object.cuotaTresDate : null;
        this.cuotaCuatroDate = object.cuotaCuatroDate ? object.cuotaCuatroDate : null;
        this.cuotaCincoDate = object.cuotaCincoDate ? object.cuotaCincoDate : null;
        this.cuotaSeisDate = object.cuotaSeisDate ? object.cuotaSeisDate : null;
        this.cuotaSieteDate = object.cuotaSieteDate ? object.cuotaSieteDate : null;
        this.cuotaOchoDate = object.cuotaOchoDate ? object.cuotaOchoDate : null;
        this.cuotaNueveDate = object.cuotaNueveDate ? object.cuotaNueveDate : null;
        this.cuotaDiezDate = object.cuotaDiezDate ? object.cuotaDiezDate : null;
        this.cuotaOnceDate = object.cuotaOnceDate ? object.cuotaOnceDate : null;
        this.cuotaDoceDate = object.cuotaDoceDate ? object.cuotaDoceDate : null;
        this.temporada = object.temporada ? object.temporada : null;
    }
}


export class HostoryPagosPlayer {
    historyPagosPlayerId: number;
    clubId: number;
    playerId: number;
    temporada: string;
    cantidad: string;
    fecha: string;
    metodo: string;
    comentario: string;
    estado: number;

    constructor(object: any) {
        this.historyPagosPlayerId = object.historyPagosPlayerId ? object.historyPagosPlayerId : 0;
        this.clubId = object.clubId ? object.clubId : 0;
        this.playerId = object.playerId ? object.playerId : 0;
        this.temporada = object.temporada ? object.temporada : '2024';
        this.cantidad = object.cantidad ? object.cantidad : null;
        this.fecha = object.fecha ? object.fecha : null;
        this.metodo = object.metodo ? object.metodo : 'Efectivo';
        this.comentario = object.comentario ? object.comentario : null;
        this.estado = object.estado ? object.estado : 0;
    }
}

export class TotalesCuotas {
    cuotaClub: string;
    cuotaRopa: string;
    pagado: string;
    restante: string;

    constructor(object: any) {
        this.cuotaClub = object.cuotaClub ? object.cuotaClub : '';
        this.cuotaRopa = object.cuotaRopa ? object.cuotaRopa : '';
        this.pagado = object.pagado ? object.pagado : '';
        this.restante = object.restante ? object.restante : '';
    }
}