import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AbonadosComponent } from './abonados.component';

describe('AbonadosComponent', () => {
  let component: AbonadosComponent;
  let fixture: ComponentFixture<AbonadosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AbonadosComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AbonadosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
