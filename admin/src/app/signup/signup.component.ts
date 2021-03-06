import {Component, OnInit} from '@angular/core';
import {Resolve, Router, ActivatedRoute} from '@angular/router';
import {UserModel, AccessToken} from "../shared/lb-sdk";
import {UserModelApi} from "../shared/lb-sdk/services/custom/UserModel";
import {LoopBackConfig} from "../shared/lb-sdk/lb.config";
import {environment} from "../../environments/environment";
import {flatMap} from "rxjs/operators";
import {ToastrService} from 'ngx-toastr';
import Utils from '../shared/constants/utils';


@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss']
})
export class SignupComponent implements OnInit {

  private user: UserModel = new UserModel();
  public loading = false;
  confirmPassword = '';
  orgName = ''
  public headerParaData = "The industry’s first and only open source app for automating stock replenishment."
  public innerWidth;

  constructor(private userModelApi: UserModelApi, private _router: Router, private _route: ActivatedRoute, private toastr: ToastrService) {
    LoopBackConfig.setBaseURL(environment.BASE_URL);
    LoopBackConfig.setApiVersion(environment.API_VERSION);
  }

  ngOnInit() {
    this.getRouteData();
    this.innerWidth = window.innerWidth;
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
    try {
      if (this.orgName === undefined || this.orgName === null || this.orgName === '') {
        throw new Error('Invalid organisation name');
      }
      if (this.user.email === undefined || this.user.email === null || this.user.email === '') {
        throw new Error('Invalid email');
      }
      this.orgName = this.orgName.toLowerCase();
      this.user.email = this.user.email.toLowerCase();
      var emailValidationBody = [`${this.user.email}`]
      var validateEmail = Utils.validateEmail((emailValidationBody));
      if (!validateEmail) {
        throw new Error('Invalid email');
      }
      if (this.user.password === undefined || this.user.password === null || this.user.password === '') {
        throw new Error('Invalid password');
      }
      if (this.confirmPassword === undefined || this.confirmPassword === null || this.confirmPassword === '') {
        throw new Error('Invalid confirm password');
      }
      var validatePassword = Utils.validatePassword((this.user.password).trim());
      if (!validatePassword) {
        throw new Error('Minimum 6 characters required in password');
      }
      if (this.user.password !== this.confirmPassword) {
        throw new Error('New password and confirm password must match');
      }
      this.loading = true;
      this.user.orgName = this.orgName;
      this.userModelApi.signup(this.user).pipe(flatMap((data: any) => {
        return this.userModelApi.login(this.user);
      }))
        .subscribe((token: AccessToken) => {
          this._router.navigate(['/connect']);
        }, err => {
          this.loading = false;
        });
    } catch(error) {
        this.toastr.error(error);
    }
  }

  onKey(event) {
    if(event.keyCode === '13' && (this.user.password !== undefined && this.user.password !== null && this.confirmPassword !== undefined && this.confirmPassword !== null)) {
      this.signup();
    }
  }
}
