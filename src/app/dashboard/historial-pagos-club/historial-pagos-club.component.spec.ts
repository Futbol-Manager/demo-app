import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HistorialPagosClubComponent } from './historial-pagos-club.component';

describe('HistorialPagosClubComponent', () => {
  let component: HistorialPagosClubComponent;
  let fixture: ComponentFixture<HistorialPagosClubComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ HistorialPagosClubComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HistorialPagosClubComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
