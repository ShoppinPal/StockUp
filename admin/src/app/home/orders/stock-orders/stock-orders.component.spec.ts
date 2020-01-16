import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { StockOrdersComponent } from './stock-orders.component';

describe('StockOrdersComponent', () => {
  let component: StockOrdersComponent;
  let fixture: ComponentFixture<StockOrdersComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ StockOrdersComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StockOrdersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
