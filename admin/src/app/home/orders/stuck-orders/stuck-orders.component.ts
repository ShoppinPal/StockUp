import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {StoreConfigModelApi} from '../../../shared/lb-sdk';
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
  private self = this;

  constructor(private _route: ActivatedRoute,
              private storeConfigModelApi: StoreConfigModelApi,
              private toastr: ToastrService,
              private _userProfileService: UserProfileService) {
  }

  ngOnInit() {
    this.userProfile = this._userProfileService.getProfileData();
    this._route.data.subscribe((data: any) => {
        this.stuckOrders = data.stuckOrders;
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
    this.loading = true;
    console.log('removeSelectedOrders()', this.ordersToRemove);
    let ordersToRemove = this.ordersToRemove;
    this.storeConfigModelApi.removeStuckOrders(this.userProfile.storeConfigModelId, this.ordersToRemove)
      .subscribe((data: any) => {
        this.loading = false;
        this.stuckOrders = this.stuckOrders.filter(function (eachOrder) {
          return ordersToRemove.indexOf(eachOrder.id) < 0;
        });
        this.toastr.success('Removed '+this.ordersToRemove.length+' stuck order(s)');
      }, err => {
        this.loading = false;
        this.toastr.error('Could not remove stuck orders');
      })

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
}
