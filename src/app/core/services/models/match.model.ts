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
    }

}