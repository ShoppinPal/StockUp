import {Component, OnInit} from '@angular/core';
import { Resolve , Router, ActivatedRoute} from '@angular/router';
import {environment} from '../../environments/environment';
import {LoopBackConfig}        from '../shared/lb-sdk';
import {UserModel, AccessToken} from '../shared/lb-sdk';
import {UserModelApi} from '../shared/lb-sdk';

@Component({
  selector: 'app-login',
  templateUrl: 'login.component.html',
  styleUrls: ['login.component.scss']
})
export class LoginComponent implements OnInit {

  private user: UserModel = new UserModel();
  public loading = false;

  constructor(private userModelApi: UserModelApi, private _router: Router, private _route: ActivatedRoute) {
    LoopBackConfig.setBaseURL(environment.BASE_URL);
    LoopBackConfig.setApiVersion(environment.API_VERSION);
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
      this._router.navigate(['/orders/stock-orders']);
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
          this._router.navigate(['/orders/stock-orders']);
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

  enterEvent(event) {
    console.log(event.keyCode);
  }

  onKey(event,username: string, password: string) {
    if(event.keyCode == '13' && ((username !== undefined && username !== null && username !== '') && (password !== undefined && password !== null && password !== ''))) {
      this.fetchInput(username,password);
    }
  }

}
