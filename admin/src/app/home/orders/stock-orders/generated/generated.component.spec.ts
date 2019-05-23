import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GeneratedComponent } from './generated.component';

describe('GeneratedComponent', () => {
  let component: GeneratedComponent;
  let fixture: ComponentFixture<GeneratedComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GeneratedComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GeneratedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
