import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FulfillComponent } from './fulfill.component';

describe('FulfillComponent', () => {
  let component: FulfillComponent;
  let fixture: ComponentFixture<FulfillComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FulfillComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FulfillComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
