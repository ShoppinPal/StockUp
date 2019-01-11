import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {UserProfileService} from "../../../shared/services/user-profile.service";
import {OrgModelApi} from "../../../shared/lb-sdk/services/custom/OrgModel";
import {Router} from '@angular/router';

@Injectable()
export class ConnectResolverService {

  private userProfile: any = this._userProfileService.getProfileData();

  constructor(private orgModelApi: OrgModelApi,
              private _userProfileService: UserProfileService,
              private _router: Router) {
  }

  resolve(): Observable<any> {
    let fetchData = Observable.combineLatest(
      this.orgModelApi.getIntegrationModels(this.userProfile.orgModelId),
      this.orgModelApi.countSyncModels(this.userProfile.orgModelId)
    );
    return fetchData.map((data: any) => {
      console.log('data', data);
      return {
        integration: data[0],
        syncModels: data[1].count
      }
    })
      .catch((err: any) => {
        console.log('err', err);
        this._router.navigate(['/']); //TODO: make a 404 page
        return Observable.of({err: err});
      });


  }

}
