import {Injectable} from '@angular/core';
import {Observable, combineLatest} from 'rxjs';
import {map} from 'rxjs/operators';
import {UserProfileService} from '../../../../shared/services/user-profile.service';
import {OrgModelApi} from "../../../../shared/lb-sdk/services/custom/OrgModel";


@Injectable({
  providedIn: 'root'
})
export class CreateOrderResolverService {

  private userProfile: any;

  constructor(private orgModelApi: OrgModelApi,
              private _userProfileService: UserProfileService) {

  }

  resolve(): Observable<any> {
    this.userProfile = this._userProfileService.getProfileData();
    return combineLatest(
      this.orgModelApi.getSupplierModels(this.userProfile.orgModelId),
      this.orgModelApi.getStoreModels(this.userProfile.orgModelId),
      this.orgModelApi.getOrderConfigModels(this.userProfile.orgModelId, {
        order: 'createdAt desc',
        fields: ['id', 'name']
      })
    )
      .pipe(map((data: any) => {
          return {
            suppliers: data[0],
            stores: data[1],
            orderConfigurations: data[2]
          }
        },
        err => {
          console.log('error fetching stock orders', err);
        }))
  };

}
