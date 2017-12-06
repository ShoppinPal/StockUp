import {Component, OnInit} from '@angular/core';
import {UserProfileService} from '../../shared/services/user-profile.service';
import {StoreConfigModelApi} from '../../shared/lb-sdk';
import {ActivatedRoute} from '@angular/router';

@Component({
  selector: 'app-sync-with-vend',
  templateUrl: './sync-with-vend.component.html',
  styleUrls: ['./sync-with-vend.component.scss']
})
export class SyncWithVendComponent implements OnInit {

  public userProfile: any;
  public loading: boolean = false;
  public syncModels: any;

  constructor(private _userProfileService: UserProfileService,
              private storeConfigModelApi: StoreConfigModelApi,
              private _route: ActivatedRoute) {
  }

  ngOnInit() {
    this.userProfile = this._userProfileService.getProfileData();
    this._route.data.subscribe((data: any) => {
        this.syncModels = data.syncModels;
      },
      error => {
        console.log('error', error)
      });
  }

  initiateSync(dataObjects) {
    this.loading = true;
    this.storeConfigModelApi.initiateSync(this.userProfile.storeConfigModelId, dataObjects)
      .subscribe((data: any) => {
          this.loading = false;
          console.log('initiated sync', data);
        },
        error => {
          this.loading = false;
          console.log('error', error);
        });
  }


}
