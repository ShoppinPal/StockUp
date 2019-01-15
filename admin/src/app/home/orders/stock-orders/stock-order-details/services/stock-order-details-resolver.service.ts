import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {ActivatedRoute, ActivatedRouteSnapshot, Resolve} from '@angular/router';

import {UserProfileService} from '../../../../../shared/services/user-profile.service';
import {OrgModelApi} from "../../../../../shared/lb-sdk/services/custom/OrgModel";

@Injectable()
export class StockOrderDetailsResolverService implements Resolve<string>{

  private userProfile: any = this._userProfileService.getProfileData();

  constructor(private orgModelApi: OrgModelApi,
              private _route: ActivatedRoute,
              private _userProfileService: UserProfileService) {
  }

  resolve(route: ActivatedRouteSnapshot): Observable<any> {
    return this.fetchStockOrderDetails(route.params.id);
  }

  fetchStockOrderDetails(reportModelId): Observable<any> {
    let filter = {
      where: {
        id: reportModelId
      }
    };
    return this.orgModelApi.getReportModels(this.userProfile.orgModelId, filter).map((data: any) => {
        return data;
      },
      err => {
        console.log('Could not fetch stock orders', err);
        return err;
      });

  };

}
