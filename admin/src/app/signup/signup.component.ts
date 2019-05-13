import {Component, OnInit} from '@angular/core';
import {Resolve, Router, ActivatedRoute} from '@angular/router';
import {UserModel, AccessToken} from "../shared/lb-sdk";
import {UserModelApi} from "../shared/lb-sdk/services/custom/UserModel";
import {LoopBackConfig} from "../shared/lb-sdk/lb.config";
import {environment} from "../../environments/environment";
import {flatMap} from "rxjs/operators";

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss']
})
export class SignupComponent implements OnInit {

  private user: UserModel = new UserModel();
  public loading = false;

  constructor(private userModelApi: UserModelApi, private _router: Router, private _route: ActivatedRoute) {
    LoopBackConfig.setBaseURL(environment.BASE_URL);
    LoopBackConfig.setApiVersion(environment.API_VERSION);
  }

  ngOnInit() {
    this.getRouteData();
  }

  getRouteData() {
    this.loading = true;
    this._route.data.subscribe((data: any) => {
        if (data.user.isAuthenticated) {
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

  findExistingOrganisation(orgName) {
    console.log('wioll look for ', orgName);
  }

  private signup(): void {
    this.loading = true;
    this.userModelApi.signup(this.user).pipe(flatMap((data: any) => {
      return this.userModelApi.login(this.user);
    }))
      .subscribe((token: AccessToken) => {
        this._router.navigate(['/connect']);
      }, err => {
        this.loading = false;
      });
  }
}
