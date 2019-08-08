import { Component, OnInit } from '@angular/core';
import {Observable} from 'rxjs';
import {FileUploader} from 'ng2-file-upload';
import {UserProfileService} from '../../../../shared/services/user-profile.service';
import {LoopBackAuth, LoopBackConfig} from '../../../../shared/lb-sdk';
import {map, mergeMap} from 'rxjs/operators';
import {TypeaheadMatch} from 'ngx-bootstrap';
import {OrgModelApi} from '../../../../shared/lb-sdk/services/custom/OrgModel';
import {ToastrService} from 'ngx-toastr';
import {ActivatedRoute, Router} from '@angular/router';

@Component({
  selector: 'app-create-stock-order',
  templateUrl: './create-stock-order.component.html',
  styleUrls: ['./create-stock-order.component.scss']
})
export class CreateStockOrderComponent implements OnInit {

  public userProfile: any;
  public loading = false;

  public orderName: string;
  public stores: Array<any> = [];
  public warehouses: Array<any> = [];
  public suppliers: Array<any> = [];

  public selectedStoreId: string = "";
  public selectedWarehouseId: string = "Select...";
  public selectedSupplierId: string = "";
  public searchCategoryText: string;
  public typeaheadLoading: boolean;
  public typeaheadNoResults: boolean;
  public categoriesList: Observable<any>;
  public categoriesListLimit: number = 7;
  public selectedCategoryId: string;
  public uploader: FileUploader;
  public createSales: boolean = true;
  public userStores;
  public orderConfigurations: any;
  public selectedOrderConfigurationId;

  constructor(
    private _userProfileService: UserProfileService,
    private orgModelApi: OrgModelApi,
    private _router: Router,
    private _route: ActivatedRoute,
    private auth: LoopBackAuth,
    private toastr: ToastrService,
  ) { }

  ngOnInit() {
    this.userProfile = this._userProfileService.getProfileData();
    this.userStores = this.userProfile.storeModels.map(x => x.objectId);
    this._route.data.subscribe((data: any) => {
        this.warehouses = data.stockOrders.warehouses;
        this.stores = this.userProfile.storeModels.filter(x => x.isWarehouse !== true);
        this.suppliers = data.stockOrders.suppliers;
        this.orderConfigurations = data.stockOrders.orderConfigurations;
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

  generateStockOrderMSD() {
    this.loading = true;
    this.orgModelApi.generateStockOrderMSD(
      this.userProfile.orgModelId,
      this.selectedStoreId,
      this.selectedWarehouseId,
      this.selectedCategoryId
    ).subscribe(reportModelData => {
      this.loading = false;
      this.toastr.info('Generating stock order');
      console.log(reportModelData);
      this._router.navigate(['orders', 'stock-orders'])
    }, error => {
      this.loading = false;
      this.toastr.error('Error in generating order');
    });
  };

  generateStockOrderVend() {
    if (this.uploader.queue.length) {
      console.log('uploading file...', this.uploader);
      this.uploader.onBuildItemForm = (fileItem: any, form: any)=> {
        form.append('orderConfigModelId', this.selectedOrderConfigurationId);
      };
      this.uploader.uploadAll();
      this.uploader.onSuccessItem = (item: any, response: any, status: number, headers: any): any => {
        this.loading = false;
        this.toastr.info('Importing stock order from file...');
        this._router.navigate(['stock-orders'])
      };
      this.uploader.onErrorItem = (item: any, response: any, status: number, headers: any): any => {
        this.loading = false;
        console.log('Error uploading file');
        console.log('response', response);
        console.log('status', status);
        this.toastr.error('Error importing stock order from file');
      };
    } else if (this.selectedSupplierId) {
      this.loading = true;

      this.orgModelApi.generateStockOrderVend(
        this.userProfile.orgModelId,
        this.selectedStoreId,
        this.selectedSupplierId,
        this.orderName || '',
        this.selectedWarehouseId
      ).subscribe(reportModelData => {
        this.loading = false;
        this.toastr.info('Generating stock order');
        console.log(reportModelData);
        this._router.navigate(['orders', 'stock-orders'])
      }, error => {
        this.loading = false;
        this.toastr.error('Error in generating order');
      })
    } else {
      this.toastr.error('Select a supplier or upload a file to generate order from');
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
