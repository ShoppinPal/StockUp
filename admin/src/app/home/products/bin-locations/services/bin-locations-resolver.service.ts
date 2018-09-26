import {Injectable} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {Observable} from 'rxjs';
import {UserProfileService} from '../../../../shared/services/user-profile.service';
import {OrgModelApi} from "../../../../shared/lb-sdk/services/custom/OrgModel";

@Injectable()
export class BinLocationsResolverService {

  private products: any;
  private count: number;
  private userProfile: any = this._userProfileService.getProfileData();

  constructor(private orgModelApi: OrgModelApi,
              private _route: ActivatedRoute,
              private _router: Router,
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
      this.orgModelApi.getProductModels(this.userProfile.orgModelId, filter),
      this.orgModelApi.countProductModels(this.userProfile.orgModelId)
    );
    return fetchProducts.map((data: any) => {
      // this.loading = false;
      this.products = data[0];
      this.count = data[1].count;
      return {
        products: this.products,
        count: this.count
      }
    })
      .catch((err: any) => {
        this._router.navigate(['/stores']); //TODO: make a 404 page
        return Observable.of({err: err});
      });
  };
}
