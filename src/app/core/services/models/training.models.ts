export class Training {
    trainingSessionId: number;
    daySession: string;
    objectiveSession: string;
    warmUp: string;

    constructor(object: any) {
        this.trainingSessionId = object.trainingSessionId || 0;
        this.daySession = object.daySession || '';
        this.objectiveSession = object.objectiveSession || '';
        this.warmUp = object.warmUp || '';
    }

}