import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { LoginService } from 'src/app/core/services/login/login.service';
import { ProfileComponent } from 'src/app/pages/profile/profile.component';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {

  constructor(
    private router: Router,
    private loginService: LoginService,
    private dialog: MatDialog) { }

  ngOnInit(): void {
  }

  goInicio(){
    this.router.navigate(['/dashboard/inicio']);
  }

  logOut(): void {
    // Llama al método cerrarSesion del servicio
    this.loginService.cerrarSesion();
  }

  profile(){
    this.dialog.open(ProfileComponent, {

    })
  }

}
