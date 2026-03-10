import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ValidationUserComponent } from './validation-user.component';

describe('ValidationUserComponent', () => {
  let component: ValidationUserComponent;
  let fixture: ComponentFixture<ValidationUserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ValidationUserComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ValidationUserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
