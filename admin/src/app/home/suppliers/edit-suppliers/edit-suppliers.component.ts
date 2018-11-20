import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {StoreConfigModelApi} from "../../../shared/lb-sdk/services/custom/StoreConfigModel";
import {UserProfileService} from "../../../shared/services/user-profile.service";
import {ToastrService} from 'ngx-toastr';

@Component({
  selector: 'app-edit-suppliers',
  templateUrl: './edit-suppliers.component.html',
  styleUrls: ['./edit-suppliers.component.scss']
})
export class EditSuppliersComponent implements OnInit {

  public supplier: any;
  public stores: Array<any>;
  public userProfile: any;
  public loading:boolean = false;

  constructor(private _route: ActivatedRoute,
              private toastr: ToastrService,
              private storeConfigModelApi: StoreConfigModelApi,
              private _userProfileService: UserProfileService) {
  }

  ngOnInit() {
    this.userProfile = this._userProfileService.getProfileData();
    this._route.data.subscribe((data: any) => {
        this.supplier = data.supplier.supplier;
        this.stores = data.supplier.stores;
        for (var i = 0; i < this.stores.length; i++) {
          if (!this.supplier.storeIds) {
            this.supplier.storeIds = {};
          }
          if (!this.supplier.storeIds[this.stores[i].objectId]) {
            this.supplier.storeIds[this.stores[i].objectId] = '';
          }
        }
      },
      error => {
        console.log('error', error)
      });
  }

  updateSupplierDetails() {
    this.loading = true;
    if (this.supplier.email && !this.validateEmail(this.supplier.email)) {
      this.loading = false;
      this.toastr.error('Invalid supplier email');
    }
    else {
      this.storeConfigModelApi.updateByIdSupplierModels(this.userProfile.storeConfigModelId, this.supplier.id, this.supplier)
        .subscribe((data: any)=> {
            this.loading = false;
            this.toastr.success('Updated Supplier Info successfully');
          },
          error => {
            this.toastr.error('Error in updating supplier info');
            this.loading = false;
            console.log('Error in updating supplier info', error);
          });
    }
  }



  validateEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  }
}
