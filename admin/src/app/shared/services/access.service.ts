import { Injectable } from '@angular/core';
import { Resolve , Router} from '@angular/router';
import { UserProfileService } from './user-profile.service';
import { Observable } from 'rxjs';
import 'rxjs/add/operator/catch';

@Injectable()
export class AccessService implements Resolve<any> {

  constructor(
    private _userService : UserProfileService,
    private _router: Router
  ) { }

  resolve(): Observable<any> {
    return this._userService.isUserAuthenticated()
      .catch((error: any) =>  {
        this._router.navigate(['/login']);
        return Observable.throw(error);
      });
  }
}
