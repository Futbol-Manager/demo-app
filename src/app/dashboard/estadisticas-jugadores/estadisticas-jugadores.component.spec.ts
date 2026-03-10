import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EstadisticasJugadoresComponent } from './estadisticas-jugadores.component';

describe('EstadisticasJugadoresComponent', () => {
  let component: EstadisticasJugadoresComponent;
  let fixture: ComponentFixture<EstadisticasJugadoresComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EstadisticasJugadoresComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EstadisticasJugadoresComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
