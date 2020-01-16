import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import * as moment from 'moment';

@Component({
  selector: 'app-schedule-picker',
  templateUrl: 'schedule-picker.component.html',
  styleUrls: ['schedule-picker.component.scss']
})
export class SchedulePickerComponent implements OnInit {
  public static SCHEDULING_TYPES = {
    YEARLY: 'Yearly',
    MONTHLY: 'Monthly',
    WEEKLY: 'Weekly',
    DAILY: 'Daily',
    HOURLY: 'Hourly',
  };
  public SCHEDULING_TYPE = SchedulePickerComponent.SCHEDULING_TYPES;
  public minutesOffset = Math.abs(new Date().getTimezoneOffset() % 60);

  @Input()
  set type(val: string) {
    this.typeChange.emit(val);
    this.selectedSchedulingType = val;
  }

  get type() {
    return this.selectedSchedulingType;
  }

  @Input()
  set hour(val: string) {
    this.hourChange.emit(val);
    this.selectedSchedulingHour = val;
  }

  get hour() {
    return this.selectedSchedulingHour;
  }

  @Input()
  set day(val: string) {
    this.dayChange.emit(val);
    this.selectedSchedulingDay = val;
  }

  get day() {
    return this.selectedSchedulingDay;
  }

  @Input()
  set month(val: string) {
    this.monthChange.emit(val);
    this.selectedSchedulingMonth = val;
  }

  get month() {
    return this.selectedSchedulingMonth;
  }

  @Input()
  set week(val: string) {
    this.weekChange.emit(val);
    this.selectedSchedulingWeek = val;
  }

  get week() {
    return this.selectedSchedulingWeek;
  }

  @Output() typeChange = new EventEmitter();
  @Output() hourChange = new EventEmitter();
  @Output() dayChange = new EventEmitter();
  @Output() monthChange = new EventEmitter();
  @Output() weekChange = new EventEmitter();

  public selectedSchedulingType = '';
  public selectedSchedulingHour: any = -1;
  public selectedSchedulingDay: any = -1;
  public selectedSchedulingMonth: any = -1;
  public selectedSchedulingWeek: any = [];
  public schedulingTypes = Object.values(SchedulePickerComponent.SCHEDULING_TYPES);
  public monthNames = moment.months();
  public weekNames: object[];
  public daysInMonth = 31;

  static convertTimeToUTCandAppend(Type, Month, Week, Day, Hour) {
    const minutesOffset = -1 * new Date().getTimezoneOffset() % 60;
    let result = {
      hour: -1,
      month: -1,
      day: -1,
      weekDay: []
    };
    let date: Date;
    if (Type === this.SCHEDULING_TYPES.YEARLY) {
      date = new Date(null, Month, Day, Hour, minutesOffset);
      result.hour = date.getUTCHours();
      result.month = date.getUTCMonth() + 1;
      result.day = date.getUTCDate();
    } else if (Type === this.SCHEDULING_TYPES.MONTHLY) {
      date = new Date(null, null, Day, Hour, minutesOffset);
      result.hour = date.getUTCHours();
      result.day = date.getUTCDate();
    } else if (Type === this.SCHEDULING_TYPES.WEEKLY) {
      date = new Date();
      date.setHours(Hour);
      date.setMinutes(minutesOffset);
      const weekDays = [];
      Week.forEach(weekDay => {
        date.setDate(new Date().getDate() + (weekDay - new Date().getDay()));
        weekDays.push(date.getUTCDay());
      });
      result.hour = date.getUTCHours();
      result.weekDay = weekDays;
    } else if (Type === this.SCHEDULING_TYPES.DAILY) {
      date = new Date(null, null, null, Hour, minutesOffset);
      result.hour = date.getUTCHours();
    }
    return result;
  }

  static validateSchedulerParameters(Type, Month, Week, Day, Hour): any {
    if (Type === '') {
      return {validated: false, message: 'Frequency is Compulsory'};
    } else {
      if (Type === this.SCHEDULING_TYPES.YEARLY) {
        if (Month === -1 || Day === -1 || Hour === -1) {
          return {validated: false, message: 'Month, Hour And Day are Compulsory'};
        }
      } else if (Type === this.SCHEDULING_TYPES.MONTHLY) {
        if (Day === -1 || Hour === -1) {
          return {validated: false, message: 'Hour And Day are Compulsory'};
        }
      } else if (Type === this.SCHEDULING_TYPES.WEEKLY) {
        if (Week === [] || Hour === -1) {
          return {validated: false, message: 'Hour And Week are Compulsory'};
        }
      } else if (Type === this.SCHEDULING_TYPES.DAILY) {
        if (Hour === -1) {
          return {validated: false, message: 'Hour is Compulsory'};
        }
      }
    }
    return {validated: true, message: ''};
  }

  constructor() {
  }

  ngOnInit() {
    this.weekNames = moment.weekdays().map((name, index) => ({id: index, name}))
  }

  onMonthSelected() {
    this.daysInMonth = moment(Number(this.selectedSchedulingMonth) + 1, 'M').daysInMonth();
  }

  changedSchedulingMode() {
    this.selectedSchedulingHour = -1;
    this.selectedSchedulingDay = -1;
    this.selectedSchedulingMonth = -1;
    this.selectedSchedulingWeek = [];

    if (this.selectedSchedulingType === SchedulePickerComponent.SCHEDULING_TYPES.MONTHLY) {
      this.daysInMonth = 31;
    }
  }
}
