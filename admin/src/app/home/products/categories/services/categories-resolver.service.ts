import {Injectable} from '@angular/core';
import {OrgModelApi} from "../../../../shared/lb-sdk/services/custom/OrgModel";
import {Router} from '@angular/router';
import {Observable} from 'rxjs';
import {UserProfileService} from "../../../../shared/services/user-profile.service";

@Injectable()
export class CategoriesResolverService {

  private categories: any;
  private count: number;
  private userProfile: any = this._userProfileService.getProfileData();

  constructor(private orgModelApi: OrgModelApi,
              private _router: Router,
              private _userProfileService: UserProfileService) {
  }

  resolve(): Observable<any> {
    return this.fetchCategories();
  }

  fetchCategories(limit?: number, skip?: number): Observable<any> {
    let filter = {
      limit: 10,
      skip: skip || 0
    };
    let fetchCategories = Observable.combineLatest(
      this.orgModelApi.getCategoryModels(this.userProfile.orgModelId, filter),
      this.orgModelApi.countCategoryModels(this.userProfile.orgModelId)
    );
    return fetchCategories.map((data: any) => {
      this.categories = data[0];
      this.count = data[1].count;
      return {
        categories: data[0],
        count: this.count
      }
    })
      .catch((err: any) => {
        this._router.navigate(['/stores']); //TODO: make a 404 page
        return Observable.of({err: err});
      });
  }

}
