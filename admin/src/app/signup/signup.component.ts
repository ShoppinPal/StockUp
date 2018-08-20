import {Component, OnInit} from '@angular/core';
import {Resolve, Router, ActivatedRoute} from '@angular/router';
import {UserModel} from "../shared/lb-sdk/models/UserModel";
import {UserModelApi} from "../shared/lb-sdk/services/custom/UserModel";
import {LoopBackConfig} from "../shared/lb-sdk/lb.config";
import {environment} from "../../environments/environment";

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

  private signup(email: string, password: string, confirmPassword: string): void {
    this.loading = true;

  }
}
