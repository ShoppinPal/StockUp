import {Injectable} from '@angular/core';
import {Observable, of, combineLatest} from 'rxjs';
import {map} from 'rxjs/operators';
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
    let fetchData = combineLatest(
      this.orgModelApi.getIntegrationModels(this.userProfile.orgModelId),
      // this.orgModelApi.countSyncModels(this.userProfile.orgModelId),
      this.orgModelApi.getSyncModels(this.userProfile.orgModelId)
    );
    return fetchData.pipe(map((data: any) => {
      console.log('data', data);
      return {
        integration: data[0],
        syncModels: data[1].length,
        syncModelsData: data[1]
      }
    }, (err: any) => {
      console.log('err', err);
      this._router.navigate(['/']); //TODO: make a 404 page
      return of({err: err});
    }));


  }

}
