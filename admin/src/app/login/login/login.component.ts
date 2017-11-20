import {Component, OnInit} from '@angular/core';
import { Resolve , Router, ActivatedRoute} from '@angular/router';
import {BASE_URL, API_VERSION} from '../../shared/base.url';
import {LoopBackConfig}        from '../../shared/lb-sdk/lb.config';
import {UserModel, AccessToken} from '../../shared/lb-sdk/models';
import {UserModelApi} from '../../shared/lb-sdk/services';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  private user: UserModel = new UserModel();
  public loading = false;

  constructor(private userModelApi: UserModelApi, private _router: Router, private _route: ActivatedRoute) {
    LoopBackConfig.setBaseURL(BASE_URL);
    LoopBackConfig.setApiVersion(API_VERSION);
  }

  fetchInput(username: string, password: string) {
    this.user.email = username;
    this.user.password = password;
    this.signin();
  }

  private signin(): void {
    this.loading = true;
    this.userModelApi.login(this.user).subscribe((token: AccessToken) => {
      this.loading = false;
      this._router.navigate(['/stores']);
    }, err => {
      this.loading = false;
      console.log('Couldn\'t redirect to stores, something went wrong', err);
    });
  }

  ngOnInit() {
    this.getRouteData()
  }

  getRouteData() {
    this.loading = true;
    this._route.data.subscribe((data: any) => {
        if(data.user.isAuthenticated) {
          this._router.navigate(['/stores']);
        }
        else {
          this.loading = false;
        }
      },
      (error) => {
        this.loading = false;
        console.log('error in fetching user data', error);
      });
  }

}
