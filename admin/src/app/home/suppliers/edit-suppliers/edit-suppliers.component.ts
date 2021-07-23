import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {OrgModelApi} from "../../../shared/lb-sdk/services/custom/OrgModel";
import {UserProfileService} from "../../../shared/services/user-profile.service";
import {ToastrService} from 'ngx-toastr';
import {constants} from '../../../shared/constants/constants';
import {combineLatest} from "rxjs";
import Utils from '../../../shared/constants/utils';

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
  public reportStates: any;
  public storeLocationId: any;
  public validEmailCounter: number = 0;
  public invalidEmailCounter: number = 0;

  constructor(private _route: ActivatedRoute,
              private toastr: ToastrService,
              private orgModelApi: OrgModelApi,
              private _userProfileService: UserProfileService) {
  }

  ngOnInit() {
    this.userProfile = this._userProfileService.getProfileData();
    this._route.data.subscribe((data: any) => {
        this.supplier = data.supplier.supplier;
        this.supplier.email = Array.isArray(data.supplier.supplier.email)
          ? data.supplier.supplier.email.join(',')
          : data.supplier.supplier.email;
        this.stores = data.supplier.stores;
        for (var i = 0; i < this.stores.length; i++) {
          let correspondingMapping = this.supplier.supplierStoreMappings.find(map => {
            return map.storeModelId == this.stores[i].objectId;
          });
          this.mappings[this.stores[i].objectId] = correspondingMapping ? correspondingMapping.storeCode : '';
          if (this.stores[i].ownerSupplierModelId === this.supplier.id) {
            this.storeLocationId = this.stores[i].objectId;
          }
        }

      },
      error => {
        console.log('error', error)
      });
    this.reportStates = constants.REPORT_STATES
  }

  updateSupplierDetails() {
    this.loading = true;
    this.emailValidation();
    if (this.supplier.email && this.invalidEmailCounter > 0) {
      this.loading = false;
      this.toastr.error('Invalid supplier email(s)');
    }
    else {
      combineLatest(
        this.orgModelApi.updateByIdSupplierModels(this.userProfile.orgModelId, this.supplier.id, {
          ...this.supplier,
          email: this.supplier.email.split(',').map(email => email.trim()),
        }),
        this.orgModelApi.assignStoreToSupplier(this.userProfile.orgModelId, this.storeLocationId, this.supplier.id)
      )
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

  emailValidation() {
    this.validEmailCounter = 0;
    this.invalidEmailCounter = 0;
    const toEmailArray = this.supplier.email.split(',');
    if (toEmailArray.length === 1 && toEmailArray[0] === ' '){
      return;
    }
    if (toEmailArray.length) {
      toEmailArray.forEach(eachEmail => {
        if (Utils.validateEmail(eachEmail.trim())) {
          this.validEmailCounter++;
        } else {
          this.invalidEmailCounter++;
        }
      })
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
    this.orgModelApi.editSupplierStoreMappings(this.userProfile.orgModelId, mappings)
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
}
