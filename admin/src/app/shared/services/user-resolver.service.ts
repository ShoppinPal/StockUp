import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { UserProfileService } from './user-profile.service'
import { Observable } from 'rxjs';

/**
 *
 *
 * @export
 * @class UserResolverService
 * @implements {Resolve<any>}
 */
@Injectable()
export class UserResolverService implements Resolve<any> {

  constructor(
    private _userService: UserProfileService
  ) { }

  resolve(): Observable<any> {
    return this._userService.refreshUserProfile();
  }
}
