import {Injectable} from '@angular/core';
import {StoreConfigModelApi} from '../../../shared/lb-sdk';
import {ActivatedRoute} from '@angular/router';
import {Observable} from 'rxjs';
import {UserProfileService} from '../../../shared/services/user-profile.service';

@Injectable()
export class SyncWithVendResolverService {

  private products: any;
  private count: number;
  private userProfile: any = this._userProfileService.getProfileData();

  constructor(private storeConfigModelApi: StoreConfigModelApi,
              private _route: ActivatedRoute,
              private _userProfileService: UserProfileService) {
  }

  resolve(): Observable<any> {
    return this.fetchSyncModels();
  }

  fetchSyncModels(){
    return this.storeConfigModelApi.getSyncModels(this.userProfile.storeConfigModelId)
      .map((data:any) => {
        return data;
      }, error => {
        console.log(error);
      });
  }

}
