export class User {
    idUser: number;
    firstName: string;
    surname: string;
    keyWord: string;
    mail: string;
    mobile: string;
    profile: string;
    birthdate: number;
    idGenre: number;
    idLanguageIso: string;
    pictureUser: string;
    invitedToGroup: string;
		identification: string;
		extension?: string;
		profileEditor?: boolean;
		profileStudent?: boolean;
		profileTeacher?: boolean;
		profileParent?: boolean;
		profileAdmin?: boolean;


    constructor( object: any){
        this.idUser = (object.idUser) ? object.idUser : null;
        this.firstName = (object.firstName) ? object.firstName : null;
        this.surname = (object.surname) ? object.surname : null;
        this.keyWord = (object.keyWord) ? object.keyWord : null;
        this.mail = (object.mail) ? object.mail : null;
        this.mobile = (object.mobile) ? object.mobile : null;
        this.profile = (object.profile) ? object.profile : null;
        this.extension = object.extension || '';
				this.identification = (object.identification) ? object.identification : null;
        this.birthdate = (object.birthdate) ? object.birthdate : null;
        this.idGenre = (object.idGenre) ? object.idGenre : null;
        this.idLanguageIso = (object.idLanguageIso) ? object.idLanguageIso : null;
        this.pictureUser = (object.pictureUser) ? object.pictureUser : null;
        this.invitedToGroup = (object.invitedToGroup) ? object.invitedToGroup : null;
    }
}
