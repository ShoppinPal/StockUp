import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkerSettingsComponent } from './worker-settings.component';

describe('WorkerSettingsComponent', () => {
  let component: WorkerSettingsComponent;
  let fixture: ComponentFixture<WorkerSettingsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ WorkerSettingsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WorkerSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
