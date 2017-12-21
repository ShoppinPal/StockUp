import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {StoreConfigModelApi} from '../../../../shared/lb-sdk';
import {UserProfileService} from '../../../../shared/services/user-profile.service';
import {constants} from '../../../../shared/constants/constants';

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
    let date = new Date();
    let previousDate = new Date(date.setDate(date.getDate() - 1)).toISOString();
    console.log('prev date', previousDate);
    let filter = {
      limit: 10,
      skip: skip || 0,
      where: {
        // state: constants.REPORT_STATES.REPORT_EMPTY,
        // created: new Date("2017-12-13T14:53:43.694+0000")
        created: {
          lt: "2017-12-20"
        }

      }
    };

    return this.storeConfigModelApi.getReportModels(this.userProfile.storeConfigModelId, filter)
      .map((data: any) => {
          console.log('reportmodels', data);
          return data;
        },
        err => {
          console.log('Could not fetch stuck orders', err);
          return err;
        });


    // let fetchStuckOrders = Observable.combineLatest(
    //   this.storeConfigModelApi.getProductModels(this.userProfile.storeConfigModelId, filter),
    //   this.storeConfigModelApi.countProductModels(this.userProfile.storeConfigModelId));
    // return fetchProducts.map((data: any) => {
    //     // this.loading = false;
    //     this.products = data[0];
    //     this.count = data[1].count;
    //     return {
    //       products: this.products,
    //       count: this.count
    //     }
    //   },
    //   err => {
    //     console.log('Couldn\'t load products', err);
    //   });
  };

}
