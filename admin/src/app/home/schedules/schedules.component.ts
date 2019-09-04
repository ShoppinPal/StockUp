import { Component, OnInit } from '@angular/core';
import {SchedulerModel} from '../../shared/lb-sdk/models';
import {OrgModelApi, SchedulerModelApi} from '../../shared/lb-sdk/services/custom';
import {UserProfileService} from '../../shared/services/user-profile.service';
import * as moment from 'moment';
import {ToastrService} from "ngx-toastr";
import {combineLatest} from "rxjs";

@Component({
  selector: 'app-schedules',
  templateUrl: './schedules.component.html',
  styleUrls: ['./schedules.component.scss']
})
export class SchedulesComponent implements OnInit {
  public schedules: SchedulerModel[];
  public loading = false;
  public userProfile: any;
  public limitPerPage: any = 10;
  public maxPageDisplay: any = 7;
  public currentPageNumber: number = 1;
  public totalItems: number;

  constructor(
      private _orgModelService: OrgModelApi,
      private _userProfileService: UserProfileService,
      private _toastr: ToastrService
  ) { }

  ngOnInit() {
    this.userProfile = this._userProfileService.getProfileData();
    this.getAllSchedules();
  }

  getAllSchedules(limit?: number, skip?: number) {
    this.loading = true;
    const filters = {
      limit: limit || this.limitPerPage,
      skip: skip || 0,
      where: {
        deleted: false
      }
    };
    const countFilter = {
      deleted: false
    };
    const getSchedules = combineLatest(
      this._orgModelService.getSchedulerModels(this.userProfile.orgModelId, filters),
      this._orgModelService.countSchedulerModels(this.userProfile.orgModelId, countFilter)
    );
    getSchedules
        .subscribe(([schedules, {count}]) => {
          this.schedules = schedules;
          this.totalItems = count;
          this.loading = false;
        }, e => {
          console.error(e);
          this._toastr.error(e.message);
          this.loading = false;
        })
  }

  updateScheduleActive(schedule: SchedulerModel) {
    this.loading = true;
    this._orgModelService.updateByIdSchedulerModels(
      this.userProfile.orgModelId,
      schedule.id,
      {
        active: schedule.active
      }
      ).subscribe(data => {
        this._toastr.success('Row Updated');
        this.currentPageNumber = 1;
        this.loading = false;
    }, err => {
        this._toastr.error('Error Updating Row');
        console.error(err);
        this.loading = false;
    });
  }
  
  deleteSchedule(schedule: SchedulerModel){
    this.loading = true;
    this._orgModelService.updateByIdSchedulerModels(
      this.userProfile.orgModelId,
      schedule.id,
      {
        active: false,
        deleted: true,
        deletedByUserModelId: this.userProfile.userId
      }
    ).subscribe(data => {
      this._toastr.success('Row Updated');
      this.currentPageNumber = 1;
      this.loading = false;
      this.getAllSchedules();
    }, err => {
      this._toastr.error('Error Updating Row');
      console.error(err);
      this.loading = false
    })
  }

  getFormattedJobType(jobType: string) {
    return jobType
        .split('-')
        .join(' ')
  }

  getLocalFormattedTime(date: Date) {
    if (date) {
      return moment(date).format('MMMM Do YYYY, h:mm:ss a');
    } else {
      return 'Never'
    }
  }

  getFormattedFrequency(schedule: any) {
    let frequencyText = 'Hourly';
    if (schedule.hour) {
      frequencyText = 'Daily';
    }
    if (schedule.day) {
      frequencyText = 'Monthly';
    }
    if (schedule.month) {
      frequencyText = 'Yearly';
    }
    if(schedule.weekDay) {
      frequencyText = 'Weekly'
    }
    return frequencyText;
  }
}
