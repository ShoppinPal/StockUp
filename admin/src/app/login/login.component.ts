import {Component, OnInit} from '@angular/core';
import { Resolve , Router, ActivatedRoute} from '@angular/router';
import {environment} from '../../environments/environment';
import {LoopBackConfig}        from '../shared/lb-sdk';
import {UserModel, AccessToken} from '../shared/lb-sdk';
import {UserModelApi} from '../shared/lb-sdk';
import { FormGroup,  FormBuilder,  Validators } from '@angular/forms';
import {ToastrService} from 'ngx-toastr';
import Utils from '../shared/constants/utils';


@Component({
  selector: 'app-login',
  templateUrl: 'login.component.html',
  styleUrls: ['login.component.scss']
})
export class LoginComponent implements OnInit {

  private user: UserModel = new UserModel();
  public loading = false;
  public headerParaData = "The industry’s first and only open source app for automating stock replenishment."
  public brandonFeedback = "With StockUp we improved accuracy of order fulfilment by 29% and dropped turn around time by half! Our staff was able to receive shipments quickly and restock with such efficiency that our customer service ratings improved month over month for the entire first year of use, as team members were able to get with customers at unprecedented levels. We have been able to stay lean with insights into our ordering and buying while still providing what our customers want. The team at StockUp is easy to work with and understands the substance of business logistics.";
  public avatarBrandon = 'https://ca.slack-edge.com/T0TM5STB3-U0UGXH61Z-a3aa17546847-512';
  public brandonName = 'Brandon Lehman,'
  public brandonDesignation = 'IT & OPS HEAD'
  angForm: FormGroup;
  public innerWidth;

  constructor(private userModelApi: UserModelApi, private _router: Router, private _route: ActivatedRoute, private fb: FormBuilder, private toastr: ToastrService) {
    LoopBackConfig.setBaseURL(environment.BASE_URL);
    LoopBackConfig.setApiVersion(environment.API_VERSION);
    this.createForm();
  }

  createForm() {
    this.angForm = this.fb.group({
       name: ['', Validators.required ]
    });
  }

  fetchInput(username: string, password: string) {
    this.user.email = username.toLowerCase();
    this.user.password = password;
    this.signin();
  }

  private signin(): void {
    try {
      if(this.user.email == undefined || this.user.email == null || this.user.email == '' ){
        throw new Error('Invalid email');
      }
      var emailValidationBody = [`${this.user.email}`]
      var validateEmail = Utils.validateEmail((emailValidationBody));
      if(!validateEmail) {
        throw new Error('Invalid email');
      }
      if(this.user.password == undefined || this.user.password == null || this.user.password == '' ){
        throw new Error('Invalid password');
      }
      var validatePassword = Utils.validatePassword((this.user.password).trim());
      if(!validatePassword) {
        throw new Error('Minimum 6 characters required in password');
      }
      this.loading = true;
      this.userModelApi.login(this.user).subscribe((token: AccessToken) => {
        this.loading = false;
        setTimeout(() => {
          this.toastr.success('Loading dashboard', 'Successfully Logged In', {
            onActivateTick: true
          });
        });
        this._router.navigate(['/orders/stock-orders']);
      }, err => {
        if(err.status == 401) {
          this.toastr.error('Username or password is incorrect');
        } else {
          this.toastr.error('Something went wrong');
        }
        this.loading = false;
        console.log('Couldn\'t redirect to stores, something went wrong', err);
      });
    } catch(error) {
        // console.log("error : ",error);
        this.toastr.error(error);
    }
  }

  ngOnInit() {
    this.getRouteData()
    this.innerWidth = window.innerWidth;
    // console.log(this.innerWidth);
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

  onKey(event,username: string, password: string) {
    if(event.keyCode == '13' && ((username !== undefined && username !== null && username !== '') && (password !== undefined && password !== null && password !== ''))) {
      this.fetchInput(username,password);
    }
  }

}
