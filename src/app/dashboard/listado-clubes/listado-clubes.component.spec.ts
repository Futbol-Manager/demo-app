import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListadoClubesComponent } from './listado-clubes.component';

describe('ListadoClubesComponent', () => {
  let component: ListadoClubesComponent;
  let fixture: ComponentFixture<ListadoClubesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ListadoClubesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ListadoClubesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
