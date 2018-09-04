import {Component, OnInit} from '@angular/core';
import {OrgModelApi} from "../../shared/lb-sdk/services/custom/OrgModel";
import {ActivatedRoute} from '@angular/router';

@Component({
  selector: 'app-connect',
  templateUrl: './connect.component.html',
  styleUrls: ['./connect.component.scss']
})
export class ConnectComponent implements OnInit {

  constructor(private orgModelApi: OrgModelApi,
              private _route: ActivatedRoute) {
  }

  public userProfile: any;
  public loading: boolean = false;

  ngOnInit() {
    this._route.data.subscribe((data: any) => {
        this.userProfile = data.user;
        console.log('data.user', data.user);
      },
      error => {
        console.log('error', error)
      });
  }

  private connect(integrationType: string) {
    this.loading = true;
    this.orgModelApi.fetchAuthorizationUrl(this.userProfile.orgModelId, integrationType)
      .subscribe((authUrl: string) => {
          console.log('fetched auth url', authUrl);
          this.loading = false;
        },
        err => {
          this.loading = false;
          console.log('error', err);
        });
  }


}
