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