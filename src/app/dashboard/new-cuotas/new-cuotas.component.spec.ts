import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewCuotasComponent } from './new-cuotas.component';

describe('NewCuotasComponent', () => {
  let component: NewCuotasComponent;
  let fixture: ComponentFixture<NewCuotasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NewCuotasComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NewCuotasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
