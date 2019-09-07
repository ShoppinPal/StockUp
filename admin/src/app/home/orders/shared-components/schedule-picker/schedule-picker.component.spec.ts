import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SchedulePickerComponent } from './schedule-picker.component';

describe('SchedulePickerComponent', () => {
  let component: SchedulePickerComponent;
  let fixture: ComponentFixture<SchedulePickerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SchedulePickerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SchedulePickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
