import {Injectable} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {Observable} from 'rxjs';
import {UserProfileService} from '../../../shared/services/user-profile.service';
import {OrgModelApi} from "../../../shared/lb-sdk/services/custom/OrgModel";

@Injectable()
export class SyncWithVendResolverService {

  private products: any;
  private count: number;
  private userProfile: any = this._userProfileService.getProfileData();

  constructor(private orgModelApi: OrgModelApi,
              private _route: ActivatedRoute,
              private _userProfileService: UserProfileService) {
  }

  resolve(): Observable<any> {
    return this.fetchSyncModels();
  }

  fetchSyncModels() {
    return this.orgModelApi.getSyncModels(this.userProfile.orgModelId)
      .map((data: any) => {
        return data;
      }, error => {
        console.log(error);
      });
  }

}
