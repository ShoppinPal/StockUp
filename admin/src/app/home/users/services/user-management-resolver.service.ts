import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {Observable} from 'rxjs';
import {OrgModelApi} from "../../../shared/lb-sdk/services/custom/OrgModel";
import {UserProfileService} from "../../../shared/services/user-profile.service";

@Injectable()
export class UserManagementResolverService {

  private users: any;
  private count: number;
  private userProfile: any = this._userProfileService.getProfileData();

  constructor(private orgModelApi: OrgModelApi,
              private _router: Router,
              private _userProfileService: UserProfileService) {
  }

  resolve(): Observable<any> {
    return this.fetchUsers();
  }

  fetchUsers(limit?: number, skip?: number): Observable<any> {
    let filter = {
      limit: 10,
      skip: skip || 0,
      include: 'roles'
    };
    let fetchUsers = Observable.combineLatest(
      this.orgModelApi.getUserModels(this.userProfile.orgModelId, filter),
      this.orgModelApi.countUserModels(this.userProfile.orgModelId));
    return fetchUsers.map((data: any) => {
        this.users = data[0];
        this.count = data[1].count;
        return {
          users: this.users,
          count: this.count
        }
      })
      .catch(err => {
        this._router.navigate(['/stores']); //TODO: make a 404 page
        return Observable.of(err);
      });
  };

}
