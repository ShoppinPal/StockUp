import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { HistoricalOrdersComponent } from './historical-orders.component';

describe('DiscrepancyComponent', () => {
  let component: HistoricalOrdersComponent;
  let fixture: ComponentFixture<HistoricalOrdersComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ HistoricalOrdersComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HistoricalOrdersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
