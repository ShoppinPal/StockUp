import {Component, OnInit} from '@angular/core';
import {constants} from "../../../shared/constants/constants";
import {ContainerApi, OrgModelApi} from "../../../shared/lb-sdk/services/custom";
import {UserProfileService} from "../../../shared/services/user-profile.service";
import {FileImportsResolverService} from "../services/file-imports-resolver.service";
import {ActivatedRoute} from "@angular/router";
import {ToastrService} from "ngx-toastr";

@Component({
  selector: 'app-file-imports-details',
  templateUrl: './file-imports-details.component.html',
  styleUrls: ['./file-imports-details.component.scss']
})
export class FileImportsDetailsComponent implements OnInit {

  public userProfile: any;
  public loading = false;
  public mappingName: string;
  public mappings: any = {};
  public reportStates: any;
  public orderStatus: string;
  public orderConfiguration: any;
  public groupBy: string;

  constructor(private orgModelApi: OrgModelApi,
              private containerApi: ContainerApi,
              private _route: ActivatedRoute,
              private toastr: ToastrService,
              private _userProfileService: UserProfileService,
              private _fileImportsResolverService: FileImportsResolverService) {
  }

  ngOnInit() {
    this.userProfile = this._userProfileService.getProfileData();
    this.reportStates = constants.REPORT_STATES;
    this._route.data.subscribe((data: any) => {
        console.log('data', data);
        this.orderConfiguration = data.data.orderConfiguration[0];
      },
      error => {
        console.log('error', error)
      });
  }

  saveOrderConfiguration() {
    this.loading = true;
    this.orgModelApi.updateByIdOrderConfigModels(this.userProfile.orgModelId, this.orderConfiguration.id, this.orderConfiguration)
      .subscribe((data: any) => {
        this.loading = false;
        this.toastr.success('Updated mapping successfully');
      }, err => {
        this.loading = false;
        this.toastr.error('Error updating mapping');
      })
  }

}
