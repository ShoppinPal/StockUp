import { Injectable } from '@angular/core';
import {OrgModelApi} from '../../../../shared/lb-sdk';
import {UserProfileService} from '../../../../shared/services/user-profile.service';
import {FileImportsResolverService} from '../../../file-imports/services/file-imports-resolver.service';
import {combineLatest, Observable} from 'rxjs';
import {map} from 'rxjs/operators';

@Injectable()
export class HistoricalOrdersResolverService {
  private userProfile: any;

  constructor(private orgModelApi: OrgModelApi,
              private _userProfileService: UserProfileService,
              private _fileImportsResolverService: FileImportsResolverService) {
  }

  resolve = (): Observable<any> => {
    this.userProfile = this._userProfileService.getProfileData();
    return combineLatest(
      this.orgModelApi.getSupplierModels(this.userProfile.orgModelId),
    ) .pipe(map((data: any) => {
        return {
          suppliers: data[0],
        }
      },
      err => {
        console.log('error fetching supplier', err);
      }))
  }
}
