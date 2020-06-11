import { Injectable } from '@angular/core';
import {OrgModelApi} from "../../../shared/lb-sdk/services/custom/OrgModel";
import {UserProfileService} from "../../../shared/services/user-profile.service";
import {Observable, combineLatest} from "rxjs";
import {map} from "rxjs/internal/operators";

@Injectable({
  providedIn: 'root'
})
export class ReorderPointsResolverService {

  private reorderPointsMultiplierModels: any;
  private reorderPointsMultiplierModelsCount: any;
  private userProfile: any = this._userProfileService.getProfileData();

  constructor(private orgModelApi: OrgModelApi,
              private _userProfileService: UserProfileService) {
  }

  resolve(): Observable<any> {
    return combineLatest(
      this.orgModelApi.countReorderPointsMultiplierModels(this.userProfile.orgModelId),
      this.orgModelApi.getReorderPointsMultiplierModels(this.userProfile.orgModelId)
    )
      .pipe(map((data: any) => {
          this.reorderPointsMultiplierModelsCount = data[0];
          this.reorderPointsMultiplierModels = data[1];
          return {
            reorderPointsMultiplierModels: this.reorderPointsMultiplierModels,
            reorderPointsMultiplierModelsCount: this.reorderPointsMultiplierModelsCount
          };
        },
        err => {
          console.log('error fetching reorder points multiplier models', err)
        }));
  };
}
