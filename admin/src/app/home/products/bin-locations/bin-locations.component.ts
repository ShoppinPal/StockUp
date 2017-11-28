import {Component, OnInit} from '@angular/core';
import {StoreConfigModelApi} from '../../../shared/lb-sdk';
import {ActivatedRoute} from '@angular/router';
import {Observable} from 'rxjs';

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
  public searchSKUFocused: boolean = false;


  constructor(private storeConfigModelApi: StoreConfigModelApi,
              private _route: ActivatedRoute) {
  }

  ngOnInit() {
    this.fetchUserProfile();
    this.fetchProducts();
  }

  fetchUserProfile() {
    this._route.data.subscribe((data: any) => {
        this.userProfile = data.user;
      },
      err => {
        console.log('Couldn\'t load user data', err);
      })
  }

  fetchProducts(limit?: number, skip?: number) {
    this.loading = true;
    this.filter = {
      limit: 10,
      skip: skip || 0
    };
    let fetchProducts = Observable.combineLatest(
      this.storeConfigModelApi.getProductModels(this.userProfile.storeConfigModelId, this.filter),
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
    this.storeConfigModelApi.updateBinLocation(this.userProfile.storeConfigModelId, product.id, binLocation)
      .subscribe((data: any) => {

          this.loading = false;
          product.success = true;
          console.log('updated bin location', data);
        },
        error => {
          this.loading = false;
          product.error = error.message;
          console.log('error in updating bin location', error);
        });

  }
}

