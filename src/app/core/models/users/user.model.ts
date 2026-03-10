import { PlayerId } from "../../services/player/player.model";
import { GenreTypeModel, ProfileTypeModel } from "./register.model";

export class User {
    userId: number;
    birthdate: number;
    firstName: string;
    secondName: string;
    password: string;
    mail: string;
    profile: string;
    pictureUser: string;
    idGenre: number;
    profileType: ProfileTypeModel;
    idValidation: number;
    dateCreate: number;
    nameSon: string;
    playerId: number;
    playerIds: number[]; // Añadir playerIds como un array de números
    mobile: string;
    parentesco: number; //0 tutor, 1 padre y 2 madre
    staffPermissions: string[];

    constructor( object: any){
        this.userId = (object.userId) ? object.userId : null;
        this.firstName = (object.firstName) ? object.firstName : null;
        this.secondName = (object.secondName) ? object.secondName : null;
        this.password = (object.password) ? object.password : null;
        this.mail = (object.mail) ? object.mail : null;
        this.profile = (object.profile) ? object.profile : null;
        this.birthdate = (object.birthdate) ? object.birthdate : null;
        this.pictureUser = (object.pictureUser) ? object.pictureUser : null;
        this.idGenre = (object.idGenre) ? object.idGenre : null;
        this.profileType = (object.profileType) ? object.profileType : null;
        this.idValidation = (object.idValidation) ? object.idValidation : null;
        this.dateCreate = (object.dateCreate) ? object.dateCreate : null;
        this.nameSon = (object.nameSon) ? object.nameSon : null;
        this.playerId = (object.playerId) ? object.playerId : null;
        this.playerIds = object.playerIds ?? [];
        this.mobile = (object.mobile) ? object.mobile : null;
        this.parentesco = (object.parentesco) ? object.parentesco : null;
        this.staffPermissions = object.staffPermissions ?? [];
    }
}
