import {Component, OnInit, TemplateRef} from '@angular/core';
import {UserProfileService} from "../../shared/services/user-profile.service";
import {ToastrService} from "ngx-toastr";
import {OrgModelApi} from "../../shared/lb-sdk/services/custom/OrgModel";
import {UserModelApi} from "../../shared/lb-sdk/services/custom/UserModel";
import {FileUploader} from 'ng2-file-upload';
import {LoopBackConfig, LoopBackAuth} from "../../shared/lb-sdk";
import {ActivatedRoute} from "@angular/router";
import {combineLatest} from "rxjs";
import {BsModalService, BsModalRef, ModalOptions} from "ngx-bootstrap";
import {FileChangeEvent} from "@angular/compiler-cli/src/perform_watch";

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
  public reorderPointsMultiplier: number;
  public multiplierName: string;
  public reorderPointsMultiplierModels: Array<any>;
  public reorderPointsMultiplierModelsCount: number;
  public totalPages: number;
  public rowsLimitPerPage: number = 100;
  public foundReorderPointsMultiplier = false;
  public searchedReorderPointsMultiplier: Array<any> = null;
  public searchedReorderPointsMultiplierText: string;
  public bsModalRef: BsModalRef;
  public deleteMultiplierId: any = null;
  public recalculateReorderPointsEveryTime: boolean;

  constructor(private orgModelApi: OrgModelApi,
              private userModelApi: UserModelApi,
              private _route: ActivatedRoute,
              private toastr: ToastrService,
              private modalService: BsModalService,
              private _userProfileService: UserProfileService,
              private auth: LoopBackAuth) {
  }

  ngOnInit() {
    this.userProfile = this._userProfileService.getProfileData();

    /**
     * Reorder points multiplier file upload
     * @type {string}
     */
    let reorderPointsMultiplierUrl: string = LoopBackConfig.getPath() + "/" + LoopBackConfig.getApiVersion() +
      "/OrgModels/" + this.userProfile.orgModelId + "/uploadReorderPointsMultiplierFile";
    this.uploader = new FileUploader({
      url: reorderPointsMultiplierUrl,
      autoUpload: false,
      authToken: this.auth.getAccessTokenId(),
      removeAfterUpload: false
    });


    /**
     * Route data
     */
    this._route.data.subscribe((data: any) => {
        this.reorderPointsMultiplierModels = data.data.reorderPointsMultiplierModels;
        this.reorderPointsMultiplierModelsCount = data.data.reorderPointsMultiplierModelsCount;
        this.totalPages = this.reorderPointsMultiplierModelsCount / this.rowsLimitPerPage;
      },
      error => {
        console.log('error', error)
      });

    /**
     * Get org model data
     */
    this.userModelApi.getOrgModel(this.userProfile.userId)
      .subscribe((data: any) => {
          this.salesDateRange = data.salesDateRangeInDays;
          this.stockUpReorderPoints = data.stockUpReorderPoints;
          this.recalculateReorderPointsEveryTime = data.recalculateReorderPointsEveryTime;
        }
        , err => {
          console.log('Could not fetch org details');
        });
  }

  saveReorderPointSettings() {
    this.loading = true;
    this.orgModelApi.updateOrgSettings(this.userProfile.orgModelId, {
      salesDateRangeInDays: this.salesDateRange,
      stockUpReorderPoints: this.stockUpReorderPoints,
      recalculateReorderPointsEveryTime: this.recalculateReorderPointsEveryTime
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

  /**
   * Upload a multiplier file
   */
  uploadMultiplierFile(multiplierForm) {
    if (!this.multiplierName) {
      this.toastr.error('Enter a name for this multiplier setting');
      return;
    }
    else if (this.reorderPointsMultiplier == null) {
      this.toastr.error('Enter a value for multiplier');
      return;
    }
    else if (!this.uploader.queue.length) {
      this.toastr.error('Upload a file first');
      return;
    }
    this.loading = true;
    console.log('uploading file...', this.uploader);
    this.uploader.onBuildItemForm = (fileItem: any, form: any) => {
      form.append('name', this.multiplierName);
      form.append('multiplier', this.reorderPointsMultiplier);
    };
    this.uploader.uploadAll();
    this.uploader.onSuccessItem = (item: any, response: any, status: number, headers: any): any => {
      this.fetchReorderPointsMultipliers(100, 0);
      this.loading = false;
      this.uploader.clearQueue();
      multiplierForm.resetForm();
      let fileElement: HTMLInputElement = document.getElementById('multiplierFile') as HTMLInputElement;
      fileElement.value = '';
      if (response && response.result) {
        this.toastr.success(response.result);
      }
      else {
        this.toastr.success('Successfully updated multiplier with SKUs');
      }
    };
    this.uploader.onErrorItem = (item: any, response: any, status: number, headers: any): any => {
      this.loading = false;
      let error = JSON.parse(response);
      let errorMessage;
      if (error.error && error.error.message) {
        errorMessage = error.error.message;
      }
      this.toastr.error(errorMessage, 'Error uploading file');
    };
  }

  validateFileFormat(fileEvent: any) {
    const file = fileEvent.target.files[0];
    if (file.type !== 'text/csv') {
      this.toastr.error('Only csv files are supported');
      let fileElement: HTMLInputElement = document.getElementById('multiplierFile') as HTMLInputElement;
      fileElement.value = '';
      this.uploader.clearQueue();
    }
  }

  /**
   * Allow downloading a sample file for reorder-points
   * multiplication
   */
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

  downloadMultiplierFile(multiplierId) {
    this.loading = true;
    this.orgModelApi.downloadReorderPointsMultiplierFile(this.userProfile.orgModelId, multiplierId).subscribe((data) => {
      const link = document.createElement('a');
      link.href = data;
      link.click();
      this.loading = false;
    }, err => {
      this.loading = false;
      this.toastr.error('Error downloading file');
      console.log(err);
    })
  }


  fetchReorderPointsMultipliers(limit?: number, skip?: number, searchText?: string) {
    if (!(limit && skip)) {
      limit = 10;
      skip = 0;
    }
    // this.searchCategoryFocused = true;
    this.foundReorderPointsMultiplier = false;
    this.searchedReorderPointsMultiplier = null;
    this.loading = true;
    let filter = {
      limit: limit,
      skip: skip,
      where: {}
    };
    if (searchText) {
      var pattern = new RegExp('.*' + searchText + '.*', "i");
      /* case-insensitive RegExp search */
      var filterData = pattern.toString();
      filter.where = {
        name: {"regexp": filterData}
      }
    }
    let fetchReorderPointsMultipliers = combineLatest(
      this.orgModelApi.getReorderPointsMultiplierModels(this.userProfile.orgModelId, filter),
      this.orgModelApi.countReorderPointsMultiplierModels(this.userProfile.orgModelId));
    fetchReorderPointsMultipliers.subscribe((data: any) => {
        this.loading = false;
        this.reorderPointsMultiplierModels = data[0];
        this.reorderPointsMultiplierModelsCount = data[1].count;
        this.totalPages = Math.floor(this.reorderPointsMultiplierModelsCount / this.rowsLimitPerPage);
      },
      err => {
        this.loading = false;
        this.toastr.error('Error loading multipliers');
        console.log('Couldn\'t load reorder point multipliers', err);
      });
  };

  onKeyPress(event, searchText) {
    console.log('key press');
    if (event.keyCode == '13') {
      this.fetchReorderPointsMultipliers(100, 0, searchText);
    }
  }

  updateReorderPointsMultiplier(multiplier) {
    this.loading = true;
    this.orgModelApi.updateByIdReorderPointsMultiplierModels(this.userProfile.orgModelId, multiplier.id, multiplier)
      .subscribe((data: any) => {
          console.log('updated', data);
          this.loading = false;
          this.toastr.success('Updated multiplier details successfully');
        },
        err => {
          console.log('error', err);
          this.fetchReorderPointsMultipliers(100, 0);
          this.loading = false;
          let errorMessage = 'Some error occurred';
          console.log('error', err);
          if (err.message) {
            errorMessage = err.message;
          }
          this.toastr.error(errorMessage, 'Error updating multiplier details');
          // this.toastr.error('Error updating multiplier details');
        });
  }

  deleteReorderPointsMultiplier(multiplierId) {
    this.loading = true;
    this.orgModelApi.destroyByIdReorderPointsMultiplierModels(this.userProfile.orgModelId, multiplierId)
      .subscribe((data: any) => {
          this.deleteMultiplierId = null;
          this.loading = false;
          this.fetchReorderPointsMultipliers(100, 0);
          this.toastr.success('Deleted multiplier details successfully');
          this.bsModalRef.hide();
        },
        err => {
          console.log('error', err);
          this.loading = false;
          this.toastr.error('Error deleting multiplier details');
        });
  }

  openDeleteModal(deleteMultiplierTemplate: TemplateRef<any>, multiplier) {
    console.log('multiplierId', multiplier.id);
    this.deleteMultiplierId = multiplier.id;
    this.bsModalRef = this.modalService.show(deleteMultiplierTemplate);
  }

}
