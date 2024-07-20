import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EstadisticasJugadoresClubComponent } from './estadisticas-jugadores-club.component';

describe('EstadisticasJugadoresClubComponent', () => {
  let component: EstadisticasJugadoresClubComponent;
  let fixture: ComponentFixture<EstadisticasJugadoresClubComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EstadisticasJugadoresClubComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EstadisticasJugadoresClubComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
