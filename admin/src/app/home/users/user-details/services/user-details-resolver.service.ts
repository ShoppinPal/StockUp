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
export class UserDetailsResolverService {

  private userProfile: any = this._userProfileService.getProfileData();

  constructor(private orgModelApi: OrgModelApi,
              private _router: Router,
              private _userProfileService: UserProfileService) {
  }

  resolve(route: ActivatedRouteSnapshot): Observable<any> {
    return combineLatest(
      this.fetchUser(route.params.id),
      this.fetchStores()
    ).pipe(map((data: any) => {
        return {
          user: data[0],
          stores: data[1]
        }
    }));
  }

  fetchUser(userId) {
    return this.orgModelApi.userProfile(this.userProfile.orgModelId, userId)
      .pipe(map((data: any) => {
          return { ...data, id: data.userId };
        },
        err => {
          console.log('err', err);
        }));
  }

  fetchStores() {
    return this.orgModelApi.getStoreModels(this.userProfile.orgModelId)
      .pipe(map((data: any) => {
        return data;
      }, err => {
        console.log(err);
      }))
  }


}
