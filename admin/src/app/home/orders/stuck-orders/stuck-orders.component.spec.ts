import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { StuckOrdersComponent } from './stuck-orders.component';

describe('StuckOrdersComponent', () => {
  let component: StuckOrdersComponent;
  let fixture: ComponentFixture<StuckOrdersComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ StuckOrdersComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StuckOrdersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
