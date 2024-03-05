import { profile } from "console";

export class RegisterModel {
  profileType: ProfileTypeModel;
  firstName: string;
  secondName: string;
  birthdate: Date;
  genreType: GenreTypeModel;
  mail: string;
	password: string;
  userId: number;
  pictureUser?: string;
	dateCreate?: Date;
	dateEdit?: Date;
	validationUser?: ValidationUserModel;

  constructor(
    profileType: ProfileTypeModel,
    firstName: string,
    secondName: string,
    birthdate: Date,
    genreType: GenreTypeModel,
    mail: string,
    password: string,
    userId: number,
    pictureUser?: string,
    dateCreate?: Date,
    dateEdit?: Date,
    validationUser?: ValidationUserModel,
  ) {
    this.userId = userId;
    this.birthdate = birthdate;
    this.dateCreate = dateCreate;
    this.dateEdit = dateEdit;
    this.firstName = firstName;
    this.mail = mail;
    this.password = password;
    this.pictureUser = pictureUser;
    this.secondName = secondName;
    this.genreType = genreType;
    this.profileType = profileType;
    this.validationUser = validationUser;
  }
}

export class GenreTypeModel {
  genreId: number;
  genreName: string;

  constructor(
    genreId: number,
    genreName: string,
    ){
    this.genreId = genreId;
    this.genreName = genreName;
  }
}

export class ProfileTypeModel {
  profileId: number;
  profileName: string;

  constructor(
    profileId: number,
    profileName: string,
    ){
    this.profileId = profileId;
    this.profileName = profileName;
  }
}

export class ValidationUserModel {
  validationUserId: number;
  validationUserName: string;

  constructor(
    validationUserId: number,
    validationUserName: string,
    ){
    this.validationUserId = validationUserId;
    this.validationUserName = validationUserName;
  }
}
