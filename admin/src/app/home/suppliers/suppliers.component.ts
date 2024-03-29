import {Component, OnInit} from '@angular/core';
import {OrgModelApi} from "../../shared/lb-sdk/services/custom/OrgModel";
import {UserProfileService} from "../../shared/services/user-profile.service";
import {ActivatedRoute, Router} from '@angular/router';
import {Observable, combineLatest} from 'rxjs';
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
  public maxPageDisplay: number = 7;
  public currentPage: number = 1;
  public searchedSupplier: Array<any>;
  public foundSupplier: boolean = false;
  public suppliersLimitPerPage: number = 100;
  public searchSupplierText: string;

  constructor(private orgModelApi: OrgModelApi,
              private _route: ActivatedRoute,
              private _router: Router,
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
      limit: this.suppliersLimitPerPage || limit || 10,
      skip: skip || 0,
      where: {
        'isDeleted':{ neq: true}
      }
    };
    let fetchSuppliers = combineLatest(
      this.orgModelApi.getSupplierModels(this.userProfile.orgModelId, filter),
      this.orgModelApi.countSupplierModels(this.userProfile.orgModelId));
    fetchSuppliers.subscribe((data: any) => {
        this.loading = false;
        this.suppliers = data[0];
        this.totalSuppliers = data[1].count;
        this.totalPages = Math.floor(this.totalSuppliers / this.suppliersLimitPerPage);
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
    var pattern = new RegExp('.*'+this.searchSupplierText+'.*', "i"); /* case-insensitive RegExp search */
    var filterData = pattern.toString();
    let filter = {
      where: {
        and:[{ name: { "regexp": filterData }},{'isDeleted':{ neq: true}}]
      }
    };
    this.orgModelApi.getSupplierModels(this.userProfile.orgModelId, filter)
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

  goToSupplierDetailsPage(supplierId) {
    this.loading = true;
    this._router.navigate(['suppliers/edit/' + supplierId]);
  }

  keyUpEvent(event, searchSupplierText) {
    if(event.keyCode == '13' && searchSupplierText !== '') {
      this.searchSupplier();
    }
  }

}
