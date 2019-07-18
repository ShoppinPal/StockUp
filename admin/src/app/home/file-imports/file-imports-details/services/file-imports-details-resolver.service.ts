import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {Observable, combineLatest, of} from 'rxjs';
import {map} from 'rxjs/operators';
import {OrgModelApi} from "../../../../shared/lb-sdk/services/custom/OrgModel";
import {UserProfileService} from "../../../../shared/services/user-profile.service";
import {ActivatedRoute, ActivatedRouteSnapshot, Resolve} from '@angular/router';


@Injectable({
  providedIn: 'root'
})
export class FileImportsDetailsResolverService {

  private userProfile: any = this._userProfileService.getProfileData();

  constructor(private orgModelApi: OrgModelApi,
              private _router: Router,
              private _userProfileService: UserProfileService) {
  }

  resolve(route: ActivatedRouteSnapshot): Observable<any> {
    return this.fetchFileImportConfiguration(route.params.id)
      .pipe(map((data: any) => {
        return {
          orderConfiguration: data
        }
      }));
  }

  fetchFileImportConfiguration(configId) {
    return this.orgModelApi.getOrderConfigModels(this.userProfile.orgModelId, {
      where: {
        id: configId
      }
    })
      .pipe(map((data: any) => {
          return data;
        },
        err => {
          console.log('err', err);
        }));
  }

}
