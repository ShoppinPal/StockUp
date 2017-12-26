import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {StoreConfigModelApi} from '../../../../shared/lb-sdk';
import {UserProfileService} from '../../../../shared/services/user-profile.service';

@Injectable()
export class StuckOrdersResolverService {

  private userProfile: any = this._userProfileService.getProfileData();

  constructor(private storeConfigModelApi: StoreConfigModelApi,
              private _userProfileService: UserProfileService) {
  }

  resolve(): Observable<any> {
    return this.fetchStuckOrders();
  }

  fetchStuckOrders(limit?: number, skip?: number): Observable<any> {
    limit = limit || 10;
    skip = skip || 0;
    return this.storeConfigModelApi.getStuckOrders(this.userProfile.storeConfigModelId, limit, skip)
      .map((data: any) => {
          console.log('reportmodels', data);
          return data;
        },
        err => {
          console.log('Could not fetch stuck orders', err);
          return err;
        });

  };

}
