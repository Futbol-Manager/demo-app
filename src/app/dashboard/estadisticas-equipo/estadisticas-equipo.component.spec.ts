import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EstadisticasEquipoComponent } from './estadisticas-equipo.component';

describe('EstadisticasEquipoComponent', () => {
  let component: EstadisticasEquipoComponent;
  let fixture: ComponentFixture<EstadisticasEquipoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EstadisticasEquipoComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EstadisticasEquipoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
