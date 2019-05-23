import { Injectable } from '@angular/core';
import {OrgModelApi} from "../../../shared/lb-sdk/services/custom/OrgModel";
import {ActivatedRoute} from '@angular/router';
import {Observable, combineLatest} from 'rxjs';
import {map} from 'rxjs/operators';
import {UserProfileService} from "../../../shared/services/user-profile.service";

@Injectable()
export class SuppliersResolverService {

  private suppliers: any;
  private count: number;
  private userProfile: any = this._userProfileService.getProfileData();

  constructor(private orgModelApi: OrgModelApi,
              private _route: ActivatedRoute,
              private _userProfileService: UserProfileService) {
  }

  resolve(): Observable<any> {
    return this.fetchSuppliers();
  }

  fetchSuppliers(limit?: number, skip?: number): Observable<any> {
    let filter = {
      limit: 10,
      skip: skip || 0
    };
    let fetchSuppliers = combineLatest(
      this.orgModelApi.getSupplierModels(this.userProfile.storeConfigModelId, filter),
      this.orgModelApi.countSupplierModels(this.userProfile.storeConfigModelId));
    return fetchSuppliers.pipe(map((data: any) => {
        // this.loading = false;
        this.suppliers = data[0];
        this.count = data[1].count;
        return {
          suppliers: this.suppliers,
          count: this.count
        }
      },
      err => {
        console.log('Couldn\'t load suppliers', err);
      }));
  };

}
