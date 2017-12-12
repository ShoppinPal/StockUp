import {Injectable} from '@angular/core';
import {StoreConfigModelApi} from '../../../../shared/lb-sdk';
import {ActivatedRoute} from '@angular/router';
import {Observable} from 'rxjs';
import {UserProfileService} from '../../../../shared/services/user-profile.service';

@Injectable()
export class BinLocationsResolverService {

  private products: any;
  private count: number;
  private userProfile: any = this._userProfileService.getProfileData();

  constructor(private storeConfigModelApi: StoreConfigModelApi,
              private _route: ActivatedRoute,
              private _userProfileService: UserProfileService) {
  }

  resolve(): Observable<any> {
    return this.fetchProducts();
  }

  fetchProducts(limit?: number, skip?: number): Observable<any> {
    let filter = {
      limit: 10,
      skip: skip || 0
    };
    let fetchProducts = Observable.combineLatest(
      this.storeConfigModelApi.getProductModels(this.userProfile.storeConfigModelId, filter),
      this.storeConfigModelApi.countProductModels(this.userProfile.storeConfigModelId));
    return fetchProducts.map((data: any) => {
        // this.loading = false;
        this.products = data[0];
        this.count = data[1].count;
        return {
          products: this.products,
          count: this.count
        }
      },
      err => {
        console.log('Couldn\'t load products', err);
      });
  };

}
