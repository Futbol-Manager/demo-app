import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PuntuacionEquipsComponent } from './puntuacion-equips.component';

describe('PuntuacionEquipsComponent', () => {
  let component: PuntuacionEquipsComponent;
  let fixture: ComponentFixture<PuntuacionEquipsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PuntuacionEquipsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PuntuacionEquipsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
