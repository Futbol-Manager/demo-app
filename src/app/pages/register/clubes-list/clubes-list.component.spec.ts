import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClubesListComponent } from './clubes-list.component';

describe('ClubesListComponent', () => {
  let component: ClubesListComponent;
  let fixture: ComponentFixture<ClubesListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ClubesListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ClubesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
