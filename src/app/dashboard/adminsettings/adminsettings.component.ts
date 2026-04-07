import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';

interface DemoUser {
  id: number;
  createdAt: string;
  profile: string;
  name: string;
  surname: string;
  phone: string;
  email: string;
  birthDate: string;
  validated: boolean;
  communications: boolean;
}

@Component({
  selector: 'app-adminsettings',
  templateUrl: './adminsettings.component.html',
  styleUrls: ['./adminsettings.component.scss']
})
export class AdminsettingsComponent implements OnInit {
  tableUsers: DemoUser[] = [];

  constructor(private location: Location) {}

  ngOnInit(): void {
    this.tableUsers = [
      { id: 1, createdAt: '2024-01-15', profile: 'Club', name: 'Carlos', surname: 'Mart\u00ednez', phone: '+34 600 111 222', email: 'carlos@sphaira.demo', birthDate: '1980-05-10', validated: true, communications: true },
      { id: 2, createdAt: '2024-01-20', profile: 'Entrenador', name: 'Ana', surname: 'L\u00f3pez', phone: '+34 600 333 444', email: 'ana@sphaira.demo', birthDate: '1985-08-22', validated: true, communications: false },
      { id: 3, createdAt: '2024-02-01', profile: 'Jugador', name: 'Luis', surname: 'Garc\u00eda', phone: '+34 600 555 666', email: 'luis@sphaira.demo', birthDate: '2005-03-14', validated: true, communications: true },
      { id: 4, createdAt: '2024-02-05', profile: 'Jugador', name: 'Marta', surname: 'S\u00e1nchez', phone: '+34 600 777 888', email: 'marta@sphaira.demo', birthDate: '2006-11-30', validated: false, communications: false },
      { id: 5, createdAt: '2024-02-10', profile: 'Staff', name: 'Pedro', surname: 'Fern\u00e1ndez', phone: '+34 600 999 000', email: 'pedro@sphaira.demo', birthDate: '1978-07-18', validated: true, communications: true },
      { id: 6, createdAt: '2024-03-01', profile: 'Entrenador', name: 'Sara', surname: 'Jim\u00e9nez', phone: '+34 601 222 333', email: 'sara@sphaira.demo', birthDate: '1990-12-05', validated: true, communications: true },
      { id: 7, createdAt: '2024-03-15', profile: 'Jugador', name: 'Miguel', surname: 'Torres', phone: '+34 601 444 555', email: 'miguel@sphaira.demo', birthDate: '2004-02-28', validated: true, communications: false },
      { id: 8, createdAt: '2024-03-20', profile: 'Jugador', name: 'Elena', surname: 'Ruiz', phone: '+34 601 666 777', email: 'elena@sphaira.demo', birthDate: '2005-09-17', validated: false, communications: true },
      { id: 9, createdAt: '2024-04-01', profile: 'Admin', name: 'Admin', surname: 'Sphaira', phone: '+34 601 888 999', email: 'admin@sphairatech.com', birthDate: '1975-01-01', validated: true, communications: true },
      { id: 10, createdAt: '2024-04-10', profile: 'Club', name: 'Raquel', surname: 'Moreno', phone: '+34 602 111 222', email: 'raquel@sphaira.demo', birthDate: '1983-04-25', validated: true, communications: true },
    ];
  }

  goBack(): void {
    this.location.back();
  }
}
