import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EstadisticasEntrenadoresClubComponent } from './estadisticas-entrenadores-club.component';

describe('EstadisticasEntrenadoresClubComponent', () => {
  let component: EstadisticasEntrenadoresClubComponent;
  let fixture: ComponentFixture<EstadisticasEntrenadoresClubComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EstadisticasEntrenadoresClubComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EstadisticasEntrenadoresClubComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
