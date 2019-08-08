import { Injectable } from '@angular/core';
import {OrgModelApi} from '../../../../../shared/lb-sdk/services/custom/OrgModel';
import {UserProfileService} from '../../../../../shared/services/user-profile.service';
import {combineLatest, Observable} from 'rxjs/index';
import {map} from 'rxjs/operators';

@Injectable()
export class CreateStockOrderResolverService {
  private userProfile: any;

  constructor(private orgModelApi: OrgModelApi,
              private _userProfileService: UserProfileService){}

  resolve = (): Observable<any> => {
    this.userProfile = this._userProfileService.getProfileData();
    return combineLatest(
      this.orgModelApi.getSupplierModels(this.userProfile.orgModelId),
      this.orgModelApi.getStoreModels(this.userProfile.orgModelId, {
        where: {
          isWarehouse: true
        }
      }),
      this.orgModelApi.getOrderConfigModels(this.userProfile.orgModelId, {
        order: 'createdAt desc',
        fields: ['id', 'name']
      })
    )
      .pipe(map((data: any) => {
          return {
            suppliers: data[0],
            warehouses: data[1],
            orderConfigurations: data[2]
          }
        },
        err => {
          console.log('error fetching stock orders', err);
        }))
  };
}
