import {Injectable} from '@angular/core';
import {OrgModelApi} from "../../../shared/lb-sdk/services/custom/OrgModel";
import {UserProfileService} from "../../../shared/services/user-profile.service";
import {Observable} from 'rxjs';

@Injectable()
export class StoresResolverService {

  private userProfile: any = this._userProfileService.getProfileData();

  constructor(private orgModelApi: OrgModelApi,
              private _userProfileService: UserProfileService) {
  }

  resolve(): Observable<any> {
    return this.fetchStores();
  }

  fetchStores(): Observable<any> {
    return this.orgModelApi.getStoreModels(this.userProfile.orgModelId).map((data: any) => {
        return data;
      },
      err => {
        console.log('Could not fetch stores', err);
        return err;
      });

  };

}
