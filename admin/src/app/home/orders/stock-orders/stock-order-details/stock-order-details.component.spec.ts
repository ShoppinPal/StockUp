import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { StockOrderDetailsComponent } from './stock-order-details.component';

describe('StockOrderDetailsComponent', () => {
  let component: StockOrderDetailsComponent;
  let fixture: ComponentFixture<StockOrderDetailsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ StockOrderDetailsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StockOrderDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
