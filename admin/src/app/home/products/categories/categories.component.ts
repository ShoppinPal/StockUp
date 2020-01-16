import {Component, OnInit} from '@angular/core';
import {OrgModelApi} from "../../../shared/lb-sdk/services/custom/OrgModel";
import {ActivatedRoute} from '@angular/router';
import {Observable, combineLatest} from 'rxjs';
import {ToastrService} from 'ngx-toastr';
import {UserProfileService} from '../../../shared/services/user-profile.service';
import {FileUploader} from 'ng2-file-upload';
import {LoopBackConfig, LoopBackAuth} from "../../../shared/lb-sdk";

@Component({
  selector: 'app-categories',
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.scss']
})
export class CategoriesComponent implements OnInit {

  public userProfile: any;
  public loading = false;
  public filter: any = {};
  public categories: Array<any>;
  public totalCategories: number;
  public totalPages: number;
  public currentPage: number = 1;
  public categoriesLimitPerPage: number = 10;
  public searchCategoryText: string;
  public searchCategoryFocused: boolean;
  public foundCategory: boolean;
  public searchedCategory: Array<any>;
  public uploader: FileUploader;
  public parentCategory: string = "Select...";

  constructor(private orgModelApi: OrgModelApi,
              private _route: ActivatedRoute,
              private toastr: ToastrService,
              private _userProfileService: UserProfileService,
              private auth: LoopBackAuth) {
  }

  ngOnInit() {
    this.userProfile = this._userProfileService.getProfileData();
    let minMaxUploadUrl: string = LoopBackConfig.getPath() + "/" + LoopBackConfig.getApiVersion() +
      "/OrgModels/" + this.userProfile.orgModelId + "/uploadMinMaxFile";
    this.uploader = new FileUploader({
      url: minMaxUploadUrl,
      autoUpload: false,
      authToken: this.auth.getAccessTokenId(),
      removeAfterUpload: true
    });
    this._route.data.subscribe((data: any) => {
        this.categories = data.categories.categories;
        this.totalCategories = data.categories.count;
        this.totalPages = this.totalCategories / this.categoriesLimitPerPage;
      },
      error => {
        console.log('error', error)
      });
  }

  fetchCategories(limit?: number, skip?: number, searchText?: string) {
    if (!(limit && skip)) {
      limit = 10;
      skip = 0;
    }
    this.searchCategoryFocused = true;
    this.foundCategory = false;
    this.searchedCategory = null;
    this.loading = true;
    let filter = {
      limit: limit,
      skip: skip,
      where: {}
    };
    if (searchText) {
      var pattern = new RegExp('.*'+searchText+'.*', "i"); /* case-insensitive RegExp search */
      var filterData = pattern.toString();
      filter.where = {
        name: { "regexp": filterData }
      }
    }
    let fetchCategories = combineLatest(
      this.orgModelApi.getCategoryModels(this.userProfile.orgModelId, filter),
      this.orgModelApi.countCategoryModels(this.userProfile.orgModelId));
      fetchCategories.subscribe((data: any) => {
        this.loading = false;
        this.categories = data[0];
        this.totalCategories = data[1].count;

        this.totalPages = Math.floor(this.totalCategories / 100);
      },
      err => {
        this.loading = false;
        console.log('Couldn\'t load categories', err);
      });
  };

  uploadMinMaxFile() {
    this.loading = true;
    if (this.parentCategory !== 'Max' && this.parentCategory !== 'Babyshop') {
      this.toastr.error('Please select parent category first');
      this.loading = false;
    }
    else {
      console.log('uploading file...', this.uploader);
      this.uploader.onBuildItemForm = (fileItem: any, form: any) => {
        form.append('parentCategory', this.parentCategory);
      };
      this.uploader.uploadAll();
      this.uploader.onSuccessItem = (item: any, response: any, status: number, headers: any): any => {
        this.loading = false;
        if (response && response.result) {
          this.toastr.success(response.result);
        }
        else {
          this.toastr.success('Successfully updated min/max values');
        }
      };
      this.uploader.onErrorItem = (item: any, response: any, status: number, headers: any): any => {
        this.loading = false;
        console.log('error uploading file');
        console.log('response', response);
        console.log('status', status);
        this.toastr.error(response);
      };
    }
  }

   keyUpEvent(event, limit?: number, skip?: number, searchText?: string) {
    if(event.keyCode == '13') {
      this.fetchCategories(limit, skip, searchText);
    }
  }


}
