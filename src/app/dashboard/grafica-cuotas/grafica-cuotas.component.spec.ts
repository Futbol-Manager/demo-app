import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GraficaCuotasComponent } from './grafica-cuotas.component';

describe('GraficaCuotasComponent', () => {
  let component: GraficaCuotasComponent;
  let fixture: ComponentFixture<GraficaCuotasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GraficaCuotasComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GraficaCuotasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
