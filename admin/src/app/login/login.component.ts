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
  public headerParaData = "The industry’s first and only open source app for automating stock replenishment."
  public brandonFeedback = "With StockUp we improved accuracy of order fulfilment by 29% and dropped turn around time by half! Our staff was able to receive shipments quickly and restock with such efficiency that our customer service ratings improved month over month for the entire first year of use, as team members were able to get with customers at unprecedented levels. We have been able to stay lean with insights into our ordering and buying while still providing what our customers want. The team at StockUp is easy to work with and understands the substance of business logistics.";
  public avatarBrandon = 'https://ca.slack-edge.com/T0TM5STB3-U0UGXH61Z-a3aa17546847-512';
  public brandonName = 'Brandon Lehman,'
  public brandonDesignation = 'IT & OPS HEAD'
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
