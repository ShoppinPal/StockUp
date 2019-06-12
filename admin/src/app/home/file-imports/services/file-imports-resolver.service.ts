import {Injectable} from '@angular/core';
import {OrgModelApi} from "../../../shared/lb-sdk/services/custom/OrgModel";
import {UserProfileService} from "../../../shared/services/user-profile.service";
import {Observable, combineLatest} from "rxjs";
import {map} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class FileImportsResolverService {

  private importableHeaders: any;
  private orderConfigurations: any;
  private userProfile: any = this._userProfileService.getProfileData();

  constructor(private orgModelApi: OrgModelApi,
              private _userProfileService: UserProfileService) {
  }

  resolve(): Observable<any> {

    return combineLatest(
      this.orgModelApi.fetchFileImportHeaders(this.userProfile.orgModelId),
      this.orgModelApi.getOrderConfigModels(this.userProfile.orgModelId)
    )
      .pipe(map((data: any) => {
          this.importableHeaders = data[0];
          this.orderConfigurations = data[1];
          return {
            importableHeaders: this.importableHeaders,
            orderConfigurations: this.orderConfigurations
          };
        },
        err => {
          console.log('error fetching headers', err)
        }));
  };

}
