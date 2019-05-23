import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
// import {StoreConfigModelApi} from '../../../shared/lb-sdk';
import {ToastrService} from 'ngx-toastr';
import {UserProfileService} from '../../../shared/services/user-profile.service';

@Component({
  selector: 'app-stuck-orders',
  templateUrl: './stuck-orders.component.html',
  styleUrls: ['./stuck-orders.component.scss']
})
export class StuckOrdersComponent implements OnInit {

  public userProfile: any;
  public loading = false;
  public stuckOrders: any;
  public ordersToRemove: any = [];
  public allOrdersSelected: boolean = false;
  public currentPage: number = 1;
  public totalStuckOrders: number;
  public ordersLimitPerPage: number = 10;

  constructor(private _route: ActivatedRoute,
              // private storeConfigModelApi: StoreConfigModelApi,
              private toastr: ToastrService,
              private _userProfileService: UserProfileService) {
  }

  ngOnInit() {
    this.userProfile = this._userProfileService.getProfileData();
    this._route.data.subscribe((data: any) => {
        this.stuckOrders = data.stuckOrders.stuckOrders;
        this.totalStuckOrders = data.stuckOrders.count;
        console.log(data);
      },
      error => {
        console.log('error', error)
      });
  }

  selectRow(order) {
    order.isSelected = !(!!order.isSelected);
    if (order.isSelected) {
      this.ordersToRemove.push(order.id);
    }
    else {
      this.ordersToRemove.splice(this.ordersToRemove.indexOf(order.id), 1);
    }
  }

  removeSelectedOrders() {
    // this.loading = true;
    // console.log('removeSelectedOrders()', this.ordersToRemove);
    // let ordersToRemove = this.ordersToRemove;
    // this.storeConfigModelApi.removeStuckOrders(this.userProfile.storeConfigModelId, this.ordersToRemove)
    //   .subscribe((data: any) => {
    //     this.loading = false;
    //     this.toastr.success('Removed ' + this.ordersToRemove.length + ' stuck order(s)');
    //     this.fetchStuckOrders();
    //   }, err => {
    //     this.loading = false;
    //     this.toastr.error('Could not remove stuck orders');
    //   })

  }

  selectAllOrders() {
    if (this.allOrdersSelected) {
      for (let i = 0, length = this.stuckOrders.length; i < length; i++) {
        this.stuckOrders[i].isSelected = false;
        this.ordersToRemove = [];
      }
    }
    else {
      for (let i = 0, length = this.stuckOrders.length; i < length; i++) {
        this.stuckOrders[i].isSelected = true;
        if (this.ordersToRemove.indexOf(this.stuckOrders[i].id) === -1) {
          this.ordersToRemove.push(this.stuckOrders[i].id);
        }
      }
    }
  }

  fetchStuckOrders(limit?: number, currentPage?: number) {
    // this.loading = true;
    // limit = limit || 10;
    // currentPage = currentPage || 1;
    // let skip = (currentPage-1)*limit || 0;
    // this.storeConfigModelApi.getStuckOrders(this.userProfile.storeConfigModelId, limit, skip)
    //   .subscribe((data: any) => {
    //       this.loading = false;
    //       this.stuckOrders = data.stuckOrders;
    //     },
    //     err => {
    //       this.loading = false;
    //       console.log('Could not fetch stuck orders', err);
    //       this.toastr.error('Something went wrong', 'Couldn\'t fetch more stuck orders');
    //     });

  }
}
