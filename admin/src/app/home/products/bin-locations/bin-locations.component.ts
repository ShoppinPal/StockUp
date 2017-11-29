import {Component, OnInit} from '@angular/core';
import {StoreConfigModelApi} from '../../../shared/lb-sdk';
import {ActivatedRoute} from '@angular/router';
import {Observable} from 'rxjs';
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

  constructor(private storeConfigModelApi: StoreConfigModelApi,
              private _route: ActivatedRoute,
              private toastr: ToastrService,
              private _userProfileService: UserProfileService) {
  }

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

  fetchProducts(limit?: number, skip?: number) {
    this.searchedProduct = null;
    this.loading = true;
    let filter = {
      limit: limit || 10,
      skip: skip || 0
    };
    let fetchProducts = Observable.combineLatest(
      this.storeConfigModelApi.getProductModels(this.userProfile.storeConfigModelId, filter),
      this.storeConfigModelApi.countProductModels(this.userProfile.storeConfigModelId));
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

  updateBinLocation(product: any, binLocation: string) {
    this.loading = true;
    product.error = '';
    product.success = false;
    if (!binLocation) {
      this.loading = false;
      this.toastr.error('Please enter bin location');
      product.error = 'Please enter bin location';
    }
    else if (product.binLocation === binLocation) {
      this.loading = false;
      this.toastr.info('No change in bin location');
      product.info = 'No change in bin location';
      setTimeout(() => {
        product.info = '';
      }, 5000);
    }
    else {
      this.storeConfigModelApi.updateBinLocation(this.userProfile.storeConfigModelId, product.id, binLocation)
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

  searchSKU(searchText: string) {
    this.loading = true;
    let filter = {
      where: {
        sku: searchText
      }
    };
    this.storeConfigModelApi.getProductModels(this.userProfile.storeConfigModelId, filter)
      .subscribe((data: Array<any>) => {
          this.loading = false;
          if (data.length === 1) {
            console.log('found this product', data[0]);
            this.searchedProduct = data;
            this.searchSKUFocused = false;
            this.totalPages = 1;
            this.totalProducts = 1;
            this.foundSKU = true;
          }
          else {
            this.toastr.error('Couldn\'t find SKU in database, try refreshing products');
          }
        },
        error => {
          this.loading = false;
          console.log('Error in finding product', error);
        });
  }
}

