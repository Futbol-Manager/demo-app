import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EstadisticasEquiposClubComponent } from './estadisticas-equipos-club.component';

describe('EstadisticasEquiposClubComponent', () => {
  let component: EstadisticasEquiposClubComponent;
  let fixture: ComponentFixture<EstadisticasEquiposClubComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EstadisticasEquiposClubComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EstadisticasEquiposClubComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
