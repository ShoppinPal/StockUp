import {Component, OnInit} from '@angular/core';
import {UserModelApi} from '../shared/lb-sdk';
import {LoopBackConfig} from "../shared/lb-sdk/lb.config";
import {environment} from "../../environments/environment";
import {ToastrService} from 'ngx-toastr';
import Utils from '../shared/constants/utils';

@Component({
  selector: 'app-forgot-password',
  templateUrl: 'forgot-password.component.html',
  styleUrls: ['forgot-password.component.scss']
})
export class ForgotPasswordComponent implements OnInit {

  public email: string;
  public loading: boolean;
  public emailSent: boolean = false;
  public headerParaData = "The industry’s first and only open source app for automating stock replenishment."
  constructor(private userModelApi: UserModelApi,
              private toastr: ToastrService) {
    LoopBackConfig.setBaseURL(environment.BASE_URL);
    LoopBackConfig.setApiVersion(environment.API_VERSION);
  }

  ngOnInit() {
  }

  requestPasswordReset() {
    try {
      if (this.email === undefined || this.email === null || this.email === '') {
        throw new Error('Invalid email');
      }
      var emailValidationBody = [`${this.email}`]
      var validateEmail = Utils.validateEmail((emailValidationBody));
      if (!validateEmail) {
        throw new Error('Invalid email');
      }
      this.loading = true;
      this.userModelApi.resetPassword({
        email: this.email
      }).subscribe((data: any) => {
        console.log('data', data);
        this.loading = false;
        this.emailSent = true;
      }, err => {
        console.log('err', err);
        this.loading = false;
        if (err.code === 'EMAIL_NOT_FOUND') {
          this.toastr.error('This email is not registered with us. Please sign up.');
        }
        else {
          this.toastr.error('Could not sent password reset instructions to the email.', 'An error occurred');
        }
      })
    } catch(error) {
        this.toastr.error(error);
    }

  }

}
