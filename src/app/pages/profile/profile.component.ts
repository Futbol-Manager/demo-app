import { Component, OnInit } from '@angular/core';
import { User } from 'src/app/core/models/users/user.model';
import { LoginService } from 'src/app/core/services/login/login.service';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  usuarioActual!: User | null;
  userForm: FormGroup;

  constructor(
    private loginService: LoginService,
    private formBuilder: FormBuilder,
  ) {
    this.loginService.usuarioActual.subscribe(user => {
      this.usuarioActual = user;
    });
    this.userForm = this.formBuilder.group({
      profile: [this.usuarioActual == null ? '' : this.usuarioActual.profile],
      firstName: [this.usuarioActual == null ? '' : this.usuarioActual.firstName],
      secondName: [this.usuarioActual == null ? '' : this.usuarioActual.secondName],
      mail: [this.usuarioActual == null ? '' : this.usuarioActual.mail],
      birthdate: [this.usuarioActual == null ? '' : this.usuarioActual.birthdate],
      pictureUser: [this.usuarioActual == null ? '' : this.usuarioActual.pictureUser],
    });
  }

  ngOnInit(): void {
  }

  get mailControl() {
    return this.userForm.get('mail');
  }

  saveChanges(){
    if(this.userForm.valid){

    }
  }

}
