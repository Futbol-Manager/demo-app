import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpcionesjugadorComponent } from './opcionesjugador.component';

describe('OpcionesjugadorComponent', () => {
  let component: OpcionesjugadorComponent;
  let fixture: ComponentFixture<OpcionesjugadorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OpcionesjugadorComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OpcionesjugadorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
