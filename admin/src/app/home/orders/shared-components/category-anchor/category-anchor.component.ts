import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {OrgModelApi} from '../../../../shared/lb-sdk';
import {UserProfileService} from '../../../../shared/services/user-profile.service';

@Component({
  selector: 'app-category-anchor',
  templateUrl: './category-anchor.component.html',
  styleUrls: ['./category-anchor.component.scss']
})
export class CategoryAnchorComponent implements OnInit {
  @Input('reportModelId') reportModelId;
  @Input('label') label: string;
  @Output('labelChange') labelChange: EventEmitter<string> = new EventEmitter<string>();
  @Input('addProductClosed')
  set addProductClosed(value) {
    if (value === false) {
      this.loadCategories();
    }
  }
  userProfile: any;
  categoryLabels = [];
  constructor(
    private orgModelApi: OrgModelApi,
    private _userProfileService: UserProfileService,
  ) { }

  ngOnInit() {
    this.loadCategories();
  }

  loadCategories() {
    this.userProfile = this._userProfileService.getProfileData();
    this.orgModelApi.getReportAnchors(this.userProfile.orgModelId, this.reportModelId)
      .subscribe(data => {
      this.categoryLabels = data.filter(anchor  => anchor._id !== '');
    }, error => {
      console.error(error);
    })
  }

  labelSelected(label) {
    this.labelChange.emit(label);
    this.label = label;
  }

}
