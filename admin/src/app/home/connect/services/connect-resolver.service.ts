import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {UserProfileService} from "../../../shared/services/user-profile.service";
import {OrgModelApi} from "../../../shared/lb-sdk/services/custom/OrgModel";

@Injectable()
export class ConnectResolverService {

  private userProfile: any = this._userProfileService.getProfileData();

  constructor(private orgModelApi: OrgModelApi,
              private _userProfileService: UserProfileService) {
  }

  resolve(): Observable<any> {
    return this.orgModelApi.getIntegrationModels(this.userProfile.orgModelId).map((data: any) => {
        return data;
      },
      err => {
        console.log('Couldn\'t load integration model', err);
      });
  }

}
