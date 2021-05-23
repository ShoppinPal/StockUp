import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CategoryAnchorComponent } from './category-anchor.component';

describe('CategoryAnchorComponent', () => {
  let component: CategoryAnchorComponent;
  let fixture: ComponentFixture<CategoryAnchorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CategoryAnchorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CategoryAnchorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
