import {Component, OnInit} from '@angular/core';
import {StoreConfigModelApi} from "../../shared/lb-sdk/services/custom/StoreConfigModel";
import {UserProfileService} from "../../shared/services/user-profile.service";
import {ActivatedRoute} from '@angular/router';
import {Observable} from 'rxjs';
import {ToastrService} from 'ngx-toastr';

@Component({
  selector: 'app-suppliers',
  templateUrl: './suppliers.component.html',
  styleUrls: ['./suppliers.component.scss']
})
export class SuppliersComponent implements OnInit {

  public userProfile: any;
  public loading = false;
  public filter: any = {};
  public suppliers: Array<any>;
  public totalSuppliers: number;
  public totalPages: number;
  public currentPage: number = 1;
  public searchedSupplier: Array<any>;
  public foundSupplier: boolean = false;
  public suppliersLimitPerPage: number = 10;
  public searchSupplierText: string;

  constructor(private storeConfigModelApi: StoreConfigModelApi,
              private _route: ActivatedRoute,
              private toastr: ToastrService,
              private _userProfileService: UserProfileService) {
  }

  /**
   * @description Fetch suppliers from resolve data and
   * load into the component view
   */
  ngOnInit() {
    this.userProfile = this._userProfileService.getProfileData();
    this._route.data.subscribe((data: any) => {
        this.suppliers = data.suppliers.suppliers;
        this.totalSuppliers = data.suppliers.count;
        this.totalPages = this.totalSuppliers / this.suppliersLimitPerPage;
      },
      error => {
        console.log('error', error)
      });
  }


  /**
   * @description Fetches all suppliers from backend according
   * to the pagination params
   * @param limit
   * @param skip
   */
  fetchSuppliers(limit?: number, skip?: number) {
    if (!(limit && skip)) {
      this.searchSupplierText = '';
    }
    this.foundSupplier = false;
    this.searchedSupplier = null;
    this.loading = true;
    let filter = {
      limit: limit || 10,
      skip: skip || 0
    };
    let fetchSuppliers = Observable.combineLatest(
      this.storeConfigModelApi.getSupplierModels(this.userProfile.storeConfigModelId, filter),
      this.storeConfigModelApi.countSupplierModels(this.userProfile.storeConfigModelId));
    fetchSuppliers.subscribe((data: any) => {
        this.loading = false;
        this.suppliers = data[0];
        this.totalSuppliers = data[1].count;
        this.totalPages = Math.floor(this.totalSuppliers / 100);
      },
      err => {
        this.loading = false;
        console.log('Couldn\'t load suppliers', err);
      });
  };

  /**
   * @description Function to search for a particular supplier
   * @param searchText
   */
  searchSupplier() {
    this.loading = true;
    let filter = {
      where: {
        name: {
          like: this.searchSupplierText
        }
      }
    };
    this.storeConfigModelApi.getSupplierModels(this.userProfile.storeConfigModelId, filter)
      .subscribe((data: Array<any>) => {
          this.loading = false;
          if (data.length) {
            this.searchedSupplier = data;
            this.totalPages = 1;
            this.totalSuppliers = 1;
            this.foundSupplier = true;
          }
          else {
            this.toastr.error('Couldn\'t find Supplier ' + this.searchSupplierText + ' in database, try syncing suppliers', 'Supplier not found');
            this.searchSupplierText = '';
          }
        },
        error => {
          this.loading = false;
          console.log('Error in finding supplier', error);
        });
  }

}
