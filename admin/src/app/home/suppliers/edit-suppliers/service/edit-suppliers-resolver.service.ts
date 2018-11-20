import { Injectable } from '@angular/core';
import {StoreConfigModelApi} from "../../../../shared/lb-sdk/services/custom/StoreConfigModel";
import {ActivatedRouteSnapshot} from '@angular/router';
import {Observable} from 'rxjs';
import {UserProfileService} from "../../../../shared/services/user-profile.service";

@Injectable()
export class EditSuppliersResolverService {

  private userProfile: any = this._userProfileService.getProfileData();

  constructor(private storeConfigModelApi: StoreConfigModelApi,
              private _userProfileService: UserProfileService) {
  }

  resolve(route: ActivatedRouteSnapshot): Observable<any> {
    return this.fetchSupplier(route.paramMap.get('id'));
  }

  fetchSupplier(supplierId): Observable<any> {
    let filter = {
      where: {
        id: supplierId
      }
    };

    let fetchSupplier = Observable.combineLatest(
      this.storeConfigModelApi.getSupplierModels(this.userProfile.storeConfigModelId, filter),
      this.storeConfigModelApi.getStoreModels(this.userProfile.storeConfigModelId)
    );
    return fetchSupplier.map((data: any) => {
        return {
          supplier: data[0][0],
          stores: data[1]
        }
      },
      err => {
        console.log('Couldn\'t load supplier', err);
      });
  };

}
