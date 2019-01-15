import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {UserProfileService} from '../../../../shared/services/user-profile.service';
import {OrgModelApi} from "../../../../shared/lb-sdk/services/custom/OrgModel";

@Injectable()
export class StockOrdersResolverService {

  private userProfile: any = this._userProfileService.getProfileData();

  constructor(private orgModelApi: OrgModelApi,
              private _userProfileService: UserProfileService) {
  }

  resolve(): Observable<any> {
    return this.fetchStockOrders();
  }

  fetchStockOrders(limit?: number, skip?: number): Observable<any> {
    limit = limit || 10;
    skip = skip || 0;
    let filter = {
      limit: limit,
      skip: skip,
      order: 'created DESC',
      include: 'storeModel',
      where: {
        transferOrderNumber: {
          exists: false
        }
      }
    };
    let fetchOrders = Observable.combineLatest(
      this.orgModelApi.getReportModels(this.userProfile.orgModelId, filter),
      this.orgModelApi.countReportModels(this.userProfile.orgModelId),
      this.orgModelApi.getStoreModels(this.userProfile.orgModelId)
    );
    return fetchOrders.map((data: any) => {
        return {
          orders: data[0],
          count: data[1].count,
          stores: data[2]
        };
      },
      err => {
        console.log('Could not fetch stock orders', err);
        return err;
      });

  };

}