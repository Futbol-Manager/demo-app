import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PartidosEntrevistasComponent } from './partidos-entrevistas.component';

describe('PartidosEntrevistasComponent', () => {
  let component: PartidosEntrevistasComponent;
  let fixture: ComponentFixture<PartidosEntrevistasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PartidosEntrevistasComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PartidosEntrevistasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
