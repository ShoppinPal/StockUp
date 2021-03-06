import {Component, OnInit} from '@angular/core';
import {OrgModelApi} from '../../../shared/lb-sdk';
import {ActivatedRoute} from '@angular/router';
import {Observable, combineLatest} from 'rxjs';
import {ToastrService} from 'ngx-toastr';
import {UserProfileService} from '../../../shared/services/user-profile.service';

@Component({
  selector: 'app-bin-locations',
  templateUrl: './bin-locations.component.html',
  styleUrls: ['./bin-locations.component.scss']
})

export class BinLocationsComponent implements OnInit {

  public userProfile: any;
  public loading = false;
  public filter: any = {};
  public products: Array<any>;
  public totalProducts: number;
  public totalPages: number;
  public currentPage: number = 1;
  public searchSKUFocused: boolean = true;
  public searchedProduct: Array<any>;
  public foundSKU: boolean = false;
  public productsLimitPerPage: number = 10;
  public readingBarcode: any;
  public enableBarcode: boolean = true;
  public searchSKUText: string;

  constructor(private orgModelApi: OrgModelApi,
              private _route: ActivatedRoute,
              private toastr: ToastrService,
              private _userProfileService: UserProfileService) {
  }

  /**
   * @description Fetch products from resolve data and
   * load into the component view
   */
  ngOnInit() {
    this.userProfile = this._userProfileService.getProfileData();
    this._route.data.subscribe((data: any) => {
        this.products = data.products.products;
        this.totalProducts = data.products.count;
        this.totalPages = this.totalProducts / this.productsLimitPerPage;
      },
      error => {
        console.log('error', error)
      });
  }

  /**
   * @description If the scan mode is changed
   * to barcode scanning, then focus is set back to the sku
   * search bar
   */
  changeScanMode() {
    if (this.enableBarcode) {
      this.searchSKUFocused = true;
    }
    else {
      this.searchSKUFocused = false;
    }
  }

  //TODO: this code should be in a directive somewhere
  /**
   * @description Code to detect barcode scanner input and
   * calls the search sku function
   * @param searchText
   */
  barcodeSearchSKU(event) {
    if (this.enableBarcode) {
      clearTimeout(this.readingBarcode);
      this.readingBarcode = setTimeout(() => {
        this.searchSKU();
      }, 1000);
    }
  }

  /**
   * @description Code to detect barcode scanner input and
   * calls the save bin location function
   * @param product
   * @param binLocation
   */
  barcodeSaveBinLocation(product) {
    if (this.enableBarcode) {
      clearTimeout(this.readingBarcode);
      this.readingBarcode = setTimeout(() => {
        this.updateBinLocation(product)
      }, 1000);
    }
  }

  /**
   * @description Fetches all products from backend according
   * to the pagination params
   * @param limit
   * @param skip
   */
  fetchProducts(limit?: number, skip?: number) {
    if (!(limit && skip)) {
      this.searchSKUText = '';
    }
    this.searchSKUFocused = true;
    this.foundSKU = false;
    this.searchedProduct = null;
    this.loading = true;
    let filter = {
      limit: limit || 10,
      skip: skip || 0
    };
    let fetchProducts = combineLatest(
      this.orgModelApi.getProductModels(this.userProfile.orgModelId, filter),
      this.orgModelApi.countProductModels(this.userProfile.orgModelId));
    fetchProducts.subscribe((data: any) => {
        this.loading = false;
        this.products = data[0];
        this.totalProducts = data[1].count;

        this.totalPages = Math.floor(this.totalProducts / 100);
      },
      err => {
        this.loading = false;
        console.log('Couldn\'t load products', err);
      });
  };

  /**
   * @description Update the bin location of a particular sku
   * @param product
   * @param binLocation
   */
  updateBinLocation(product: any) {
    this.loading = true;
    product.error = '';
    product.info = '';
    product.success = false;
    if (!product.binLocation) {
      this.loading = false;
      this.toastr.error('Please enter bin location');
      product.error = 'Please enter bin location';
    }
    else {
      this.orgModelApi.updateBinLocation(this.userProfile.orgModelId, product.id, product.binLocation.toLowerCase())
        .subscribe((data: any) => {
            this.toastr.success('Updated bin location successfully');
            this.loading = false;
            this.foundSKU = false;
            this.searchSKUFocused = true;
            product.success = true;
            setTimeout(() => {
              product.success = false;
            }, 5000);
          },
          error => {
            this.toastr.error('Error in updating bin location');
            this.loading = false;
            product.error = error.message;
            console.log('error in updating bin location', error);
          });
    }
  }

  /**
   * @description Function to search for a particular sku
   * @param searchText
   */
  searchSKU() {
    try {
      if (this.searchSKUText === undefined || this.searchSKUText === null || this.searchSKUText === '') {
        throw new Error('SKU is a required field');
      }
      this.loading = true;
      var pattern = new RegExp('.*' + this.searchSKUText + '.*', "i");
      /* case-insensitive RegExp search */
      var filterData = pattern.toString();
      var filter: any = {
        where: {
          sku: ''
        }
      };
      if (this.enableBarcode) {
        filter.where.sku = this.searchSKUText;
      } else {
        filter.where.sku = {
          regexp: filterData
        };
      }
      this.orgModelApi.getProductModels(this.userProfile.orgModelId, filter)
        .subscribe((data: Array<any>) => {
            this.loading = false;
            if (data.length === 1) {
              this.searchedProduct = data;
              this.totalPages = 1;
              this.totalProducts = 1;
              this.searchSKUFocused = false;
              this.foundSKU = true;
            }
            else if (data.length > 1 && !this.enableBarcode) {
              this.searchedProduct = data;
              this.totalPages = 1;
              this.totalProducts = 2;
              this.searchSKUFocused = false;
              this.foundSKU = true;
              this.toastr.success('Found SKU in database');
            } else if (data.length > 1 && this.enableBarcode) {
              this.searchedProduct = data;
              this.totalPages = 1;
              this.totalProducts = 2;
              this.searchSKUFocused = false;
              this.foundSKU = true;
              this.toastr.error('Found duplicate SKU in database, please make SKUs unique before updating bin locations', 'Duplicate SKU');
            }
            else {
              this.toastr.error('Couldn\'t find SKU ' + this.searchSKUText + ' in database, try syncing products', 'SKU not found');
            }
          },
          error => {
            this.loading = false;
            console.log('Error in finding product', error);
          });
    }

    catch (error) {
      this.loading = false;
      console.error(error);
      this.toastr.error(error);
    }
  }

  /**
   * @description Function to search if enter button event is being triggered
   * @param event
   */
  keyUpEvent(event) {
    if (event.keyCode == '13' && !this.enableBarcode) {
      this.searchSKU();
    }
  }

}

