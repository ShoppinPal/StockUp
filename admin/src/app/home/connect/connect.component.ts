import {Component, OnInit} from '@angular/core';
import {OrgModelApi} from "../../shared/lb-sdk/services/custom/OrgModel";
import {ActivatedRoute} from '@angular/router';
import {UserProfileService} from "../../shared/services/user-profile.service";

@Component({
  selector: 'app-connect',
  templateUrl: './connect.component.html',
  styleUrls: ['./connect.component.scss']
})
export class ConnectComponent implements OnInit {

  constructor(private orgModelApi: OrgModelApi,
              private _route: ActivatedRoute,
              private _userProfileService: UserProfileService) {
  }

  public userProfile: any = this._userProfileService.getProfileData();
  public integration: any;
  public loading: boolean = false;

  ngOnInit() {
    this._route.data.subscribe((data: any) => {
        this.integration = data.integration;
        console.log('data.user', this.userProfile);
        console.log('data.integration', this.integration);
      },
      error => {
        console.log('error', error)
      });
  }

  private connect(integrationType: string) {
    this.loading = true;
    this.orgModelApi.fetchAuthorizationUrl(this.userProfile.orgModelId, integrationType)
      .subscribe((data: any) => {
          console.log('fetched auth url', data.authorizationUrl);
          window.location.href = data.authorizationUrl;
        },
        err => {
          this.loading = false;
          console.log('error', err);
        });
  }

  private initiateVendSync() {
    this.loading = true;
    this.orgModelApi.initiateVendSync(this.userProfile.orgModelId)
      .subscribe((data: any) => {
        console.log('vend sync', data);
        this.loading = false;
      },
      err => {
        this.loading = false;
        console.log('err', err);
      });

  }

  checkSync(dataObject) {
    // return this.syncModels.find(function (eachSyncModel) {
    //   return eachSyncModel.name === dataObject;
    // }) ? true : false;
  }

  toggleSync(dataObject) {
    // this.loading = true;
    // let filter = {};
    // if (this.checkSync(dataObject)) {
    //   let syncModel = this.syncModels.find(function (eachSyncModel) {
    //     return eachSyncModel.name === dataObject;
    //   });
    //   let syncModelIndex = this.syncModels.indexOf(syncModel);
    //   this.storeConfigModelApi.destroyByIdSyncModels(this.userProfile.storeConfigModelId, syncModel.id)
    //     .subscribe((data: any) => {
    //       this.loading = false;
    //       this.syncModels.splice(syncModelIndex, 1);
    //     }, error => {
    //       console.log('error', error);
    //       this.loading = false;
    //     })
    // }
    // else {
    //   this.storeConfigModelApi.createSyncModels(this.userProfile.storeConfigModelId, {
    //     name: dataObject,
    //     version: 0,
    //     syncInProcess: false
    //   }).subscribe((data: any) => {
    //     this.loading = false;
    //     this.syncModels.push(data);
    //   }, error => {
    //     console.log('error', error);
    //     this.loading = false;
    //   })
    }


  }
