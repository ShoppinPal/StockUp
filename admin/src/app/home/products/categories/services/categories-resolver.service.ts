import {Injectable} from '@angular/core';
import {OrgModelApi} from "../../../../shared/lb-sdk/services/custom/OrgModel";
import {Router} from '@angular/router';
import {Observable, combineLatest, of} from 'rxjs';
import {map} from 'rxjs/operators';
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
    let fetchCategories = combineLatest(
      this.orgModelApi.getCategoryModels(this.userProfile.orgModelId, filter),
      this.orgModelApi.countCategoryModels(this.userProfile.orgModelId)
    );
    return fetchCategories.pipe(map((data: any) => {
      this.categories = data[0];
      this.count = data[1].count;
      return {
        categories: data[0],
        count: this.count
      }
    }, err => {
              this._router.navigate(['/stores']); //TODO: make a 404 page
        return of({err: err});
    }));
  }

}
