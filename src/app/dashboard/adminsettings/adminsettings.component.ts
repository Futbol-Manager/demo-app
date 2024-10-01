import { Component, OnInit } from '@angular/core';
import { LoginService } from 'src/app/core/services/login/login.service';
import { Response } from 'src/app/core/services/models/response.model';

@Component({
  selector: 'app-adminsettings',
  templateUrl: './adminsettings.component.html',
  styleUrls: ['./adminsettings.component.scss']
})
export class AdminsettingsComponent implements OnInit {

  tableUsers: any[] = [];
  
  constructor(
    private loginService: LoginService
  ) { }

  ngOnInit(): void {
    this.loginService.getlistallusers().subscribe(
      (response: Response) => {
        this.tableUsers = response.data;
      },
      (error) => {
        console.error('Error al crear el jugador:', error);
        // Puedes manejar el error según tus necesidades
      }
    );
  }

}
