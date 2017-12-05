import {Component, OnInit} from '@angular/core';
import {UserProfileService} from '../../shared/services/user-profile.service';
import {StoreConfigModelApi} from '../../shared/lb-sdk';

@Component({
  selector: 'app-sync-with-vend',
  templateUrl: './sync-with-vend.component.html',
  styleUrls: ['./sync-with-vend.component.scss']
})
export class SyncWithVendComponent implements OnInit {

  public userProfile: any;
  public loading = false;

  constructor(private _userProfileService: UserProfileService,
              private storeConfigModelApi: StoreConfigModelApi) {
  }

  ngOnInit() {
    this.userProfile = this._userProfileService.getProfileData();
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
