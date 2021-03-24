import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SalesGraphComponent } from './sales-graph.component';

describe('SalesGraphComponent', () => {
  let component: SalesGraphComponent;
  let fixture: ComponentFixture<SalesGraphComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SalesGraphComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SalesGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
