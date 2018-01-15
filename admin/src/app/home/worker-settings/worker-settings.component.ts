import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {StoreConfigModelApi} from "../../shared/lb-sdk/services/custom/StoreConfigModel";
import {UserProfileService} from "../../shared/services/user-profile.service";
import {ToastrService} from 'ngx-toastr';

@Component({
  selector: 'app-worker-settings',
  templateUrl: './worker-settings.component.html',
  styleUrls: ['./worker-settings.component.scss']
})
export class WorkerSettingsComponent implements OnInit {

  public usesWorkerV2: any;
  public userProfile: any = this._userProfileService.getProfileData();
  public loading: boolean = false;

  constructor(private _route: ActivatedRoute,
              private _storeConfigModelApi: StoreConfigModelApi,
              private toastr: ToastrService,
              private _userProfileService: UserProfileService) {
  }

  ngOnInit() {
    this._route.data.subscribe((data: any) => {
        this.usesWorkerV2 = data.workerSettings;
      },
      error => {
        console.log('Could not fetch worker settings', error);
      });
  }

  toggleWorker(workerName) {
    this.loading = true;
    this._storeConfigModelApi.updateWorkerSettings(this.userProfile.storeConfigModelId, workerName)
      .subscribe((data: any) => {
        this.loading = false;
        this.toastr.success('Changed worker', workerName);
      }, err => {
        this.loading = false;
        this.toastr.error('Could not change the worker', workerName);
        console.log('Could not toggle the worker', workerName);
      })

  }

}
