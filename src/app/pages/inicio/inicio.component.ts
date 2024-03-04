import { Component, OnInit } from '@angular/core';
import { User } from 'src/app/core/models/users/user.model';
import { LoginService } from 'src/app/core/services/login/login.service';

@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.scss']
})
export class InicioComponent implements OnInit {

  usuarioActual!: User | null;

  constructor(private loginService: LoginService) { }

  ngOnInit(): void {
    // Suscríbete al observable del servicio para obtener el usuario actual
    this.loginService.usuarioActual.subscribe(user => {
      this.usuarioActual = user;
    });
  }

  cerrarSesion(): void {
    // Llama al método cerrarSesion del servicio
    this.loginService.cerrarSesion();
  }

  verPerfil(){
    
  }

  

}
