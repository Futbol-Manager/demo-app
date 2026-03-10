import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CuotasComponent } from './cuotas.component';

describe('CuotasComponent', () => {
  let component: CuotasComponent;
  let fixture: ComponentFixture<CuotasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CuotasComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CuotasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
