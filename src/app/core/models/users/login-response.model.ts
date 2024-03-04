import { User } from './user.model';

export class LoginResponse {
  constructor(
    public data: LoginResponseModel,
    public error: ErrorModel,
    public status: number
  ) {}
}

export interface ErrorModel{
    code: number,
    msg: string
}

interface LoginResponseModel{
	ok:         boolean;
	tokenAcces: string;
	tokenType:  string;
	userDTO:    User;
}
