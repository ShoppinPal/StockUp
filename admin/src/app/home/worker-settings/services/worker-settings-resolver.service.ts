import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {UserProfileService} from '../../../shared/services/user-profile.service';
import {StoreConfigModelApi} from '../../../shared/lb-sdk';

@Injectable()
export class WorkerSettingsResolverService {

  private userProfile: any = this._userProfileService.getProfileData();

  constructor(private _userProfileService: UserProfileService,
              private _storeConfigModelApi: StoreConfigModelApi) {
  }

  resolve(): Observable<any> {
    return this.fetchWorkerSettings();
  }

  fetchWorkerSettings(): Observable<any> {
    return this._storeConfigModelApi.getWorkerSettings(this.userProfile.storeConfigModelId)
      .map((data: any)=> {
          return data;
        },
        err => {
          console.log('Could not find worker status', err);
        });
  }

}
