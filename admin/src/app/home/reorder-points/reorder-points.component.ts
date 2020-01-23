import {Component, OnInit} from '@angular/core';
import {UserProfileService} from "../../shared/services/user-profile.service";
import {ToastrService} from "ngx-toastr";
import {OrgModelApi} from "../../shared/lb-sdk/services/custom/OrgModel";
import {UserModelApi} from "../../shared/lb-sdk/services/custom/UserModel";

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

  constructor(private orgModelApi: OrgModelApi,
              private userModelApi: UserModelApi,
              private toastr: ToastrService,
              private _userProfileService: UserProfileService) {
  }

  ngOnInit() {
    this.userProfile = this._userProfileService.getProfileData();
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

}
