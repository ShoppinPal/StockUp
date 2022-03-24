import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportOrdersComponent } from './import-orders.component';

describe('ImportOrdersComponent', () => {
  let component: ImportOrdersComponent;
  let fixture: ComponentFixture<ImportOrdersComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ImportOrdersComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ImportOrdersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
