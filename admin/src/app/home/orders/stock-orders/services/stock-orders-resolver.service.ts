import {Injectable} from '@angular/core';
import {Observable, combineLatest} from 'rxjs';
import {map} from 'rxjs/operators';
import {UserProfileService} from '../../../../shared/services/user-profile.service';
import {OrgModelApi} from "../../../../shared/lb-sdk/services/custom/OrgModel";
import {constants} from '../../../../shared/constants/constants';

@Injectable()
export class StockOrdersResolverService {

  private userProfile: any = this._userProfileService.getProfileData();

  constructor(private orgModelApi: OrgModelApi,
              private _userProfileService: UserProfileService) {
  }

  resolve(): Observable<any> {
    return this.fetchStockOrders();
  }

  fetchStockOrders(limit?: number, skip?: number): Observable<any> {
    limit = limit || 10;
    skip = skip || 0;
    let filter = {
      limit: limit,
      skip: skip,
      order: 'createdAt DESC',
      include: ['storeModel', 'userModel', 'supplierModel'],
    };

    let generatedReportsCountFilter = {
      storeModelId: {
        inq: this.userProfile.storeModels.map(x => x.objectId)
      },
      state: {
        inq: [constants.REPORT_STATES.EXECUTING, constants.REPORT_STATES.GENERATED, constants.REPORT_STATES.PUSHING_TO_VEND]
      }
    };

    let generatedReportsFilter = {
      ...filter, ...{
        where: generatedReportsCountFilter
      }
    };

    let receiveReportsCountFilter = {
      storeModelId: {
        inq: this.userProfile.storeModels.map(x => x.objectId)
      },
      state: {
        inq: [constants.REPORT_STATES.RECEIVE]
      }
    };
    let receiveReportsFilter = {
      ...filter, ...{
        where: receiveReportsCountFilter
      }
    };

    let fulfillReportsCountFilter = {
      or: [
        {
          supplierModelId: {
            neq: null
          }
        },
        {
          deliverFromStoreModelId: {
            inq: this.userProfile.storeModels.map(x => x.objectId)
          }
        }
      ],
      state: {
        inq: [constants.REPORT_STATES.FULFILL]
      }
    };
    let fulfillReportsFilter = {
      ...filter, ...{
        where: fulfillReportsCountFilter
      }
    };

    let fetchOrders = combineLatest(
      this.orgModelApi.getReportModels(this.userProfile.orgModelId, generatedReportsFilter),
      this.orgModelApi.countReportModels(this.userProfile.orgModelId, generatedReportsCountFilter),
      this.orgModelApi.getReportModels(this.userProfile.orgModelId, receiveReportsFilter),
      this.orgModelApi.countReportModels(this.userProfile.orgModelId, receiveReportsCountFilter),
      this.orgModelApi.getReportModels(this.userProfile.orgModelId, fulfillReportsFilter),
      this.orgModelApi.countReportModels(this.userProfile.orgModelId, fulfillReportsCountFilter),
      this.orgModelApi.getSupplierModels(this.userProfile.orgModelId)
    );
    return fetchOrders.pipe(map((data: any) => {
        return {
          generatedOrders: data[0],
          generatedOrdersCount: data[1].count,
          receiveOrders: data[2],
          receiveOrdersCount: data[3].count,
          fulfillOrders: data[4],
          fulfillOrdersCount: data[5].count,
          suppliers: data[6]
        };
      },
      err => {
        console.log('Could not fetch stock orders', err);
        return err;
      }));

  };

}
