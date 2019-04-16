import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {UserModelApi} from '../shared/lb-sdk';
import {LoopBackConfig} from "../shared/lb-sdk/lb.config";
import {environment} from "../../environments/environment";
import {SDKToken} from "../shared/lb-sdk/models/BaseModels";
import {ToastrService} from 'ngx-toastr';

@Component({
  selector: 'app-invite-user',
  templateUrl: './invite-user.component.html',
  styleUrls: ['./invite-user.component.scss']
})
export class InviteUserComponent implements OnInit {

  private password: string;
  private loading: boolean;
  private accessToken: SDKToken;
  private name: string;

  constructor(private activatedRoute: ActivatedRoute,
              private userModelApi: UserModelApi,
              private toastr: ToastrService,
              private _router: Router){
    LoopBackConfig.setBaseURL(environment.BASE_URL);
    LoopBackConfig.setApiVersion(environment.API_VERSION);
    this.activatedRoute.queryParams.subscribe(params => {
      this.accessToken = params['accessToken'];
      this.name = params['name'];
    });
  }

  ngOnInit() {
    this.getRouteData()
  }

  getRouteData() {
    this.loading = true;
    this.activatedRoute.data.subscribe((data: any) => {
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

  setPassword() {
    this.loading = true;
    this.userModelApi.setPassword(this.password, this.accessToken)
      .flatMap((data: any) => {
        console.log('data', data);
        return this.userModelApi.login({
          email: data.user.email,
          password: this.password
        });
      })
      .subscribe((data: any) => {
          this.toastr.success('Password set successfully, let\'s log you in');
          this._router.navigate(['/orders/stock-orders']);
        },
        err => {
          this.toastr.error('Could not sign in, please contact your admin');
          this.loading = false;
          console.log('err', err);
        });

  }


}
