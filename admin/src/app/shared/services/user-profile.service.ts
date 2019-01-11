import {Injectable} from '@angular/core';
import {UserProfile} from '../models/userProfile';
import {UserModelApi} from '../lb-sdk/services';
import {Observable} from "rxjs/Observable";
import {LoopBackAuth} from '../lb-sdk/services';

@Injectable()
export class UserProfileService {

  private User: any;

  constructor(private _userModelApi: UserModelApi,
              protected auth: LoopBackAuth) {
  }

  public isUserAuthenticated(): Observable<boolean> {
    return Observable.create(observer => {
      if (this.User.isUserAuthenticated()) {
        observer.next(this.User.isUserAuthenticated());
        observer.complete();
      }
      else {
        observer.error(401);
      }
    });
  }

  public hasRole(role: string): Observable<boolean> {
    return Observable.create(observer => {
      if (this.User.hasRole(role)) {
        observer.next(true);
        observer.complete();
      }
      else {
        observer.error(401);
      }
    });
  }

  public hasAnyRole(roles: Array<string>): Observable<boolean> {
    return Observable.create(observer => {
      if (this.User.hasAnyRole(roles)) {
        observer.next(this.User.hasAnyRole(roles));
        observer.complete();
      }
      else {
        observer.error(401);
      }
    });
  }

  public isAnonymous(): Observable<boolean> {
    return Observable.create(observer => {
      if (this.User.isAnonymous()) {
        observer.next(true);
        observer.complete();
      }
      else {
        observer.error();
      }
    });
  }

  public refreshUserProfile(): Observable<any> {
    if (this.auth.getCurrentUserId()) {
      return this._userModelApi.profile(this.auth.getCurrentUserId())
        .map((user) => {
          this.User = new UserProfile(user.profileData);
          this.User.isAuthenticated = true;
          return this.User;
        })
        .catch(error => {
          this.User = new UserProfile({});
          this.User.isAuthenticated = false;
          return Observable.of(this.User);
        });
    }
    else {
      this.User = new UserProfile({});
      this.User.isAuthenticated = false;
      return Observable.of(this.User);
    }
  }

  isUserAuthorised(): boolean {
    return this.User.isAuthenticated;
  }

  public getProfileData(): Object {
    return this.User;
  }
}
