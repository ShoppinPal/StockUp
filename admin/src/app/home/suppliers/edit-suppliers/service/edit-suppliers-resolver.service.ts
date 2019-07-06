import { Injectable } from '@angular/core';
import {OrgModelApi} from "../../../../shared/lb-sdk/services/custom/OrgModel";
import {ActivatedRouteSnapshot} from '@angular/router';
import {Observable, combineLatest} from 'rxjs';
import {map} from 'rxjs/operators';
import {UserProfileService} from "../../../../shared/services/user-profile.service";

@Injectable()
export class EditSuppliersResolverService {

  private userProfile: any = this._userProfileService.getProfileData();

  constructor(private orgModelApi: OrgModelApi,
              private _userProfileService: UserProfileService) {
  }

  resolve(route: ActivatedRouteSnapshot): Observable<any> {
    return this.fetchSupplier(route.paramMap.get('id'));
  }

  fetchSupplier(supplierId): Observable<any> {
    let filter = {
      where: {
        id: supplierId
      },
      include: {
        relation: 'supplierStoreMappings',
        scope: {
          where: {
            supplierModelId: supplierId
          }
        }
      }
    };

    let fetchSupplier = combineLatest(
      this.orgModelApi.getSupplierModels(this.userProfile.orgModelId, filter),
      this.orgModelApi.getStoreModels(this.userProfile.orgModelId)
    );
    return fetchSupplier.pipe(map((data: any) => {
        return {
          supplier: data[0][0],
          stores: data[1]
        }
      },
      err => {
        console.log('Couldn\'t load supplier', err);
      }));
  };

}
