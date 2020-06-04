import {Component, OnInit} from '@angular/core';
import {UserProfileService} from "../../shared/services/user-profile.service";
import {ToastrService} from "ngx-toastr";
import {OrgModelApi} from "../../shared/lb-sdk/services/custom/OrgModel";
import {UserModelApi} from "../../shared/lb-sdk/services/custom/UserModel";
import {FileUploader} from 'ng2-file-upload';
import {LoopBackConfig, LoopBackAuth} from "../../shared/lb-sdk";

@Component({
  selector: 'app-reorder-points',
  templateUrl: './reorder-points.component.html',
  styleUrls: ['./reorder-points.component.scss']
})
export class ReorderPointsComponent implements OnInit {

  public userProfile: any;
  public loading: boolean = false;
  public salesDateRange: number;
  public stockUpReorderPoints: boolean;
  public uploader: FileUploader;
  public multiplier: number;

  constructor(private orgModelApi: OrgModelApi,
              private userModelApi: UserModelApi,
              private toastr: ToastrService,
              private _userProfileService: UserProfileService,
              private auth: LoopBackAuth) {
  }

  ngOnInit() {
    this.userProfile = this._userProfileService.getProfileData();

    /**
     * Reorder points multiplier file upload
     * @type {string}
     */
    let reorderPointsMultiplerUrl: string = LoopBackConfig.getPath() + "/" + LoopBackConfig.getApiVersion() +
      "/OrgModels/" + this.userProfile.orgModelId + "/uploadReorderPointsMultiplier";
    this.uploader = new FileUploader({
      url: reorderPointsMultiplerUrl,
      autoUpload: false,
      authToken: this.auth.getAccessTokenId(),
      removeAfterUpload: true
    });


    this.userModelApi.getOrgModel(this.userProfile.userId)
      .subscribe((data: any) => {
          this.salesDateRange = data.salesDateRangeInDays;
          this.stockUpReorderPoints = data.stockUpReorderPoints;
        }
        , err => {
          console.log('Could not fetch org details');
        });
  }

  saveReorderPointSettings() {
    this.loading = true;
    this.orgModelApi.updateOrgSettings(this.userProfile.orgModelId, {
      salesDateRangeInDays: this.salesDateRange,
      stockUpReorderPoints: this.stockUpReorderPoints
    })
      .subscribe(data => {
        this.loading = false;
        this.toastr.success('Saved settings successfully');
      }, err => {
        this.loading = false;
        console.log(err);
        this.toastr.error('Error saving settings');
      });
  }

  uploadMinMaxFile() {
    this.loading = true;
    console.log('uploading file...', this.uploader);
    this.uploader.onBuildItemForm = (fileItem: any, form: any) => {
      form.append('multiplier', this.multiplier);
    };
    this.uploader.uploadAll();
    this.uploader.onSuccessItem = (item: any, response: any, status: number, headers: any): any => {
      this.loading = false;
      if (response && response.result) {
        this.toastr.success(response.result);
      }
      else {
        this.toastr.success('Successfully updated multiplier with SKUs');
      }
    };
    this.uploader.onErrorItem = (item: any, response: any, status: number, headers: any): any => {
      this.loading = false;
      console.log('error uploading file');
      console.log('response', response);
      console.log('status', status);
      this.toastr.error(response);
    };
  }

  downloadSampleMultiplierFile() {
    this.loading = true;
    this.orgModelApi.downloadSampleReorderPointsMultiplierFile(this.userProfile.orgModelId).subscribe((data) => {
      const link = document.createElement('a');
      link.href = data;
      link.download = 'Stockup Reorder Points Multiplier Sample';
      link.click();
      this.loading = false;
    }, err => {
      this.loading = false;
      this.toastr.error('Error downloading file');
      console.log(err);
    })
  }


}
