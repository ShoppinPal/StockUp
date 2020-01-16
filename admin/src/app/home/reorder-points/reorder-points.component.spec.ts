import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ReorderPointsComponent } from './reorder-points.component';

describe('ReorderPointsComponent', () => {
  let component: ReorderPointsComponent;
  let fixture: ComponentFixture<ReorderPointsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ReorderPointsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ReorderPointsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
