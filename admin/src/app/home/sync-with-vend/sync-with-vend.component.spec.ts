import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SyncWithVendComponent } from './sync-with-vend.component';

describe('SyncWithVendComponent', () => {
  let component: SyncWithVendComponent;
  let fixture: ComponentFixture<SyncWithVendComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SyncWithVendComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SyncWithVendComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
