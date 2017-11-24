import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BinLocationsComponent } from './bin-locations.component';

describe('BinLocationsComponent', () => {
  let component: BinLocationsComponent;
  let fixture: ComponentFixture<BinLocationsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BinLocationsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BinLocationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
