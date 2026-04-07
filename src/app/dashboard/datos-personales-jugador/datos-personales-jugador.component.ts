import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

interface DemoPlayer {
  // Foto
  photoUrl: string;
  // Datos b\u00e1sicos
  name: string;
  surname: string;
  sportName: string;
  dorsal: number;
  position: string;
  position2: string;
  birthDate: string;
  nationality: string;
  // Contacto
  phone: string;
  email: string;
  address: string;
  city: string;
  dni: string;
  // F\u00edsico
  height: string;
  weight: string;
  foot: string;
  // Tutor 1
  tutor1Name: string;
  tutor1Dni: string;
  tutor1Phone: string;
  tutor1Email: string;
  // Tutor 2
  tutor2Name: string;
  tutor2Dni: string;
  tutor2Phone: string;
  tutor2Email: string;
}

@Component({
  selector: 'app-datos-personales-jugador',
  templateUrl: './datos-personales-jugador.component.html',
  styleUrls: ['./datos-personales-jugador.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatosPersonalesJugadorComponent implements OnInit {
  player: DemoPlayer | null = null;
  loading = true;

  constructor(
    private location: Location,
    private router: Router,
  ) {}

  ngOnInit(): void {
    setTimeout(() => {
      this.player = {
        photoUrl: 'assets/images/jugador1.png',
        name: 'Carlos',
        surname: 'Mart\u00ednez L\u00f3pez',
        sportName: 'Carlitos',
        dorsal: 10,
        position: 'Centrocampista',
        position2: 'Extremo derecho',
        birthDate: '12/03/2005',
        nationality: 'Espa\u00f1ola',
        phone: '+34 600 111 222',
        email: 'carlos@sphaira.demo',
        address: 'Calle Gran V\u00eda 45, 3\u00ba B',
        city: 'Madrid',
        dni: '12345678A',
        height: '172 cm',
        weight: '65 kg',
        foot: 'Derecho',
        tutor1Name: 'Antonio Mart\u00ednez',
        tutor1Dni: '87654321B',
        tutor1Phone: '+34 600 999 888',
        tutor1Email: 'antonio@sphaira.demo',
        tutor2Name: 'Mar\u00eda L\u00f3pez',
        tutor2Dni: '11223344C',
        tutor2Phone: '+34 600 777 666',
        tutor2Email: 'maria@sphaira.demo',
      };
      this.loading = false;
    }, 400);
  }

  goBack(): void {
    this.location.back();
  }

  goToEdit(): void {
    this.router.navigate(['/dashboard/jugadores']);
  }

  get playerInitials(): string {
    if (!this.player) return '';
    return (this.player.name[0] + this.player.surname[0]).toUpperCase();
  }
}
