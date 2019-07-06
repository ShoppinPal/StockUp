import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {OrgModelApi} from "../../../shared/lb-sdk/services/custom/OrgModel";
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
  public loading: boolean = false;
  public mappings: any = {};

  constructor(private _route: ActivatedRoute,
              private toastr: ToastrService,
              private orgModelApi: OrgModelApi,
              private _userProfileService: UserProfileService) {
  }

  ngOnInit() {
    this.userProfile = this._userProfileService.getProfileData();
    this._route.data.subscribe((data: any) => {
        this.supplier = data.supplier.supplier;
        this.stores = data.supplier.stores;
        for (var i = 0; i < this.stores.length; i++) {
          let correspondingMapping = this.supplier.supplierStoreMappings.find(map => {
            return map.storeModelId == this.stores[i].objectId;
          });
          this.mappings[this.stores[i].objectId] =  correspondingMapping ? correspondingMapping.storeCode : '';
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
      this.orgModelApi.updateByIdSupplierModels(this.userProfile.orgModelId, this.supplier.id, this.supplier)
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

  updateSupplierStoreMappings() {
    this.loading = true;
    let mappings = [];
    for (var key in this.mappings) {
      if (this.mappings[key].length)
        mappings.push({
          supplierModelId: this.supplier.id,
          storeModelId: key,
          storeCode: this.mappings[key]
        })
    }
    this.orgModelApi.updateSupplierStoreMappings(this.userProfile.orgModelId, mappings)
      .subscribe((data: any) => {
        this.toastr.success('Updated store codes successfully');
        this.loading = false;
      },
      err => {
        this.loading = false;
        this.toastr.error('Could not update store codes');
        console.log('err', err);
      });
  }


  validateEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  }
}
