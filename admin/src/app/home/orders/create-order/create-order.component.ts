import {Component, OnInit} from '@angular/core';
import {OrgModelApi} from "../../../shared/lb-sdk/services/custom/OrgModel";
import {ActivatedRoute, Router} from '@angular/router';
import {Observable} from 'rxjs';
import {map, mergeMap} from 'rxjs/operators';
import {ToastrService} from 'ngx-toastr';
import {UserProfileService} from "../../../shared/services/user-profile.service";
import {TypeaheadMatch} from 'ngx-bootstrap';
import {FileUploader} from 'ng2-file-upload';
import {LoopBackConfig, LoopBackAuth} from "../../../shared/lb-sdk";
import {constants} from '../../../shared/constants/constants';
import {EventSourceService} from '../../../shared/services/event-source.service';
import {SchedulePickerComponent} from "../shared-components/schedule-picker/schedule-picker.component";


@Component({
  selector: 'app-create-order',
  templateUrl: './create-order.component.html',
  styleUrls: ['./create-order.component.scss']
})
export class CreateOrderComponent implements OnInit {

  public userProfile: any;
  public loading = false;
  public filter: any = {};
  public orderName: string;
  public stores: Array<any> = [];
  public suppliers: Array<any> = [];
  public selectedStoreId: string = "";
  public selectedWarehouseId: string = "Select...";
  public selectedSupplierId: string = "";
  public searchCategoryText: string;
  public typeaheadLoading: boolean;
  public categoriesList: Observable<any>;
  public categoriesListLimit: number = 7;
  public selectedCategoryId: string = '';
  public maxPageDisplay: number = 7;
  public uploader: FileUploader;
  public createSales: boolean = true;
  public userStores;
  public orderConfigurations: any;
  public selectedOrderConfigurationId;
  public REPORT_STATES = constants.REPORT_STATES;


  public scheduleAutoGeneration: boolean = false;
  public selectedSchedulingType: string = '';
  public selectedSchedulingHour: any = -1;
  public selectedSchedulingDay: any = -1;
  public selectedSchedulingMonth: any = -1;
  public selectedSchedulingWeek: any = [];

  constructor(private orgModelApi: OrgModelApi,
              private _route: ActivatedRoute,
              private _router: Router,
              private toastr: ToastrService,
              private _userProfileService: UserProfileService,
              private auth: LoopBackAuth,
              private _eventSourceService: EventSourceService) {
  }

  ngOnInit() {
    this.userProfile = this._userProfileService.getProfileData();
    this.userStores = this.userProfile.storeModels;
    this._route.data.subscribe((data: any) => {
        this.stores = data.resolverData.stores;
        this.suppliers = data.resolverData.suppliers;
        this.orderConfigurations = data.resolverData.orderConfigurations;
        if (this.orderConfigurations && this.orderConfigurations.length > 0) {
          this.selectedOrderConfigurationId = this.orderConfigurations[0].id;
        }
      },
      error => {
        console.log('error', error)
      });

    let orderUploadUrl: string = LoopBackConfig.getPath() + "/" + LoopBackConfig.getApiVersion() +
      "/OrgModels/" + this.userProfile.orgModelId + "/importVendOrderFromFile";
    this.uploader = new FileUploader({
      url: orderUploadUrl,
      autoUpload: false,
      authToken: this.auth.getAccessTokenId(),
      removeAfterUpload: true
    });

    this.categoriesList = Observable.create((observer: any) => {
      // Runs on every search
      observer.next(this.searchCategoryText);
    })
      .pipe(mergeMap((token: string) => this.searchCategory(token)));
  }

  getFormattedSchedulingData() {
    let schedulingData: any = {};
    if (this.scheduleAutoGeneration) {
      const validationResult = SchedulePickerComponent.validateSchedulerParameters(
        this.selectedSchedulingType,
        this.selectedSchedulingMonth,
        this.selectedSchedulingWeek,
        this.selectedSchedulingDay,
        this.selectedSchedulingHour
      );
      if (!validationResult.validated) {
        this.toastr.error(validationResult.message);
        return;
      }
      schedulingData = SchedulePickerComponent.convertTimeToUTCandAppend(
        this.selectedSchedulingType,
        this.selectedSchedulingMonth,
        this.selectedSchedulingWeek,
        this.selectedSchedulingDay,
        this.selectedSchedulingHour);
    }
    return schedulingData;
  }


  generateStockOrderMSD() {
    this.loading = true;
    const schedulingData = this.getFormattedSchedulingData();
    this.orgModelApi.generateStockOrderMSD(
      this.userProfile.orgModelId,
      this.selectedStoreId,
      this.selectedWarehouseId,
      this.selectedCategoryId,
      this.scheduleAutoGeneration,
      this.selectedSchedulingType,
      schedulingData.day >= 0 ? schedulingData.day : null,
      schedulingData.month >= 0 ? schedulingData.month : null,
      schedulingData.hour >= 0 ? schedulingData.hour : null,
      schedulingData.weekDay.length > 0 ? schedulingData.weekDay : null,
    ).subscribe(reportModelData => {
      this.loading = false;
      this.toastr.info('Generating stock order');
      console.log(reportModelData);
      this._router.navigate(['/orders/stock-orders']);
    }, error => {
      this.loading = false;
      this.toastr.error('Error in generating order');
    });
  };

  generateStockOrderVend() {
    if (this.uploader.queue.length) {
      console.log('uploading file...', this.uploader);
      this.toastr.info('Importing stock order from file...');
      this.uploader.onBuildItemForm = (fileItem: any, form: any)=> {
        form.append('orderConfigModelId', this.selectedOrderConfigurationId);
      };
      this.uploader.uploadAll();
      this.uploader.onSuccessItem = (item: any, response: any, status: number, headers: any): any => {
        this.loading = false;
        this._router.navigate(['/orders/stock-orders']);
        // this.waitForFileImportWorker();
      };
      this.uploader.onErrorItem = (item: any, response: any, status: number, headers: any): any => {
        this.loading = false;
        console.log('Error uploading file');
        console.log('response', response);
        console.log('status', status);
        this.toastr.error('Error importing stock order from file');
      };
    } else if (this.selectedStoreId) {
      this.loading = true;
      let deliverFromStore = this.stores.find(x => x.objectId === this.selectedWarehouseId);
      if (!deliverFromStore.ownerSupplierModelId) {
        this.toastr.error('Store transfers are not supported yet');
        this.loading = false;
      }
      else {
        this.selectedSupplierId = deliverFromStore.ownerSupplierModelId;
        const schedulingData = this.getFormattedSchedulingData();
        this.orgModelApi.generateStockOrderVend(
          this.userProfile.orgModelId,
          this.selectedStoreId,
          this.selectedSupplierId,
          this.orderName || '',
          this.selectedWarehouseId,
          this.scheduleAutoGeneration,
          this.selectedSchedulingType,
          schedulingData.day >= 0 ? schedulingData.day : null,
          schedulingData.month >= 0 ? schedulingData.month : null,
          schedulingData.hour >= 0 ? schedulingData.hour : null,
          schedulingData.weekDay && schedulingData.weekDay.length > 0 ? schedulingData.weekDay : null,
        ).subscribe(reportModelData => {
          this.loading = false;
          this.toastr.info('Generating stock order');
          console.log(reportModelData);
          this._router.navigate(['/orders/stock-orders']);
        }, error => {
          this.loading = false;
          this.toastr.error('Error in generating order');
        })
      }
    } else {
      this.toastr.error('Select a store to deliver from or upload a file to generate order from');
      return;
    }
  };

  searchCategory(searchToken) {
    return this.orgModelApi.getCategoryModels(this.userProfile.orgModelId, {
      where: {
        name: {
          regexp: '/.*' + searchToken + '.*/i'
        }
      },
      limit: this.categoriesListLimit,
      fields: ['name', 'id']
    })
      .pipe(map((data: any) => {
          return data;
        },
        err => {
          console.log('err', err);
        }));
  }

  public typeaheadOnSelect(e: TypeaheadMatch): void {
    this.selectedCategoryId = e.item.id;
  }

}
