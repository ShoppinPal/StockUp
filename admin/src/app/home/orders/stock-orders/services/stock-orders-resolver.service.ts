import {Injectable} from '@angular/core';
import {Observable, combineLatest} from 'rxjs';
import {map} from 'rxjs/operators';
import {UserProfileService} from '../../../../shared/services/user-profile.service';
import {OrgModelApi} from "../../../../shared/lb-sdk/services/custom/OrgModel";
import {constants} from '../../../../shared/constants/constants';
import {FileImportsResolverService} from "../../../file-imports/services/file-imports-resolver.service";
import {Router} from '@angular/router';
import {ToastrService} from 'ngx-toastr';

@Injectable()
export class StockOrdersResolverService {
  private userProfile: any;
  private ordersMaxLimit = 100;

  constructor(private orgModelApi: OrgModelApi,
              private _userProfileService: UserProfileService,
              private _router: Router,
              private _fileImportsResolverService: FileImportsResolverService) {
  }

  resolve = (filterSelectedDeliveredToStoreId, filterSelectedDeliveredFromStoreId): Observable<any> => {
    this.userProfile = this._userProfileService.getProfileData();
    if (this.userProfile.storeModels.length === 0 ) {
      this._router.navigate(['/reporting/historical-orders']);
      return;
    }
    return combineLatest(
      this.fetchGeneratedStockOrders(filterSelectedDeliveredToStoreId, filterSelectedDeliveredFromStoreId),
      this.fetchReceiveStockOrders(filterSelectedDeliveredToStoreId, filterSelectedDeliveredFromStoreId),
      this.fetchFulfillStockOrders(filterSelectedDeliveredToStoreId, filterSelectedDeliveredFromStoreId),
      this.orgModelApi.getSupplierModels(this.userProfile.orgModelId),
      this.orgModelApi.getStoreModels(this.userProfile.orgModelId),
      this.orgModelApi.getOrderConfigModels(this.userProfile.orgModelId, {
        order: 'createdAt desc',
        fields: ['id', 'name']
      })
    )
      .pipe(map((data: any) => {
          return {
            generatedOrders: data[0].generatedOrders,
            generatedOrdersCount: data[0].generatedOrdersCount,
            pendingGeneratedOrdersCount: data[0].pendingGeneratedOrdersCount,
            receiveOrders: data[1].receiveOrders,
            receiveOrdersCount: data[1].receiveOrdersCount,
            pendingReceiveOrdersCount: data[1].pendingReceiveOrdersCount,
            fulfillOrders: data[2].fulfillOrders,
            fulfillOrdersCount: data[2].fulfillOrdersCount,
            pendingFulfillOrdersCount: data[2].pendingFulfillOrdersCount,
            suppliers: data[3],
            stores: data[4],
            orderConfigurations: data[5]
          }
        },
        err => {
          console.log('error fetching stock orders', err);
        }))
  };

  fetchGeneratedStockOrders = (filterSelectedDeliveredToStoreId?: string, filterSelectedDeliveredFromStoreId?: string, limit?: number, skip?: number, reportModelId ?: string): Observable<any> => {
    limit = this.ordersMaxLimit || limit || 10;
    skip = skip || 0;
    let filter = {
      limit: limit,
      skip: skip,
      order: 'createdAt DESC',
      include: ['storeModel', 'userModel', 'supplierModel', 'deliverFromStoreModel'],
    };

    let pendingGeneratedReportsCountFilter = {
      storeModelId: {
        inq: this.userProfile.storeModels.map(x => x.objectId)
      },
      state: {
        inq: [
          constants.REPORT_STATES.GENERATED,
          constants.REPORT_STATES.APPROVAL_IN_PROCESS,
          constants.REPORT_STATES.PROCESSING_FAILURE
        ]
      },
      deletedAt: {
        exists: false
      }
    };

    let generatedReportsCountFilter = {
      storeModelId: {
        inq: this.userProfile.storeModels.map(x => x.objectId)
      },
      state: {
        inq: [
          constants.REPORT_STATES.PROCESSING,
          constants.REPORT_STATES.GENERATED,
          constants.REPORT_STATES.APPROVAL_IN_PROCESS,
          constants.REPORT_STATES.PROCESSING_FAILURE,
          constants.REPORT_STATES.PUSHING_TO_MSD,
          constants.REPORT_STATES.ERROR_PUSHING_TO_MSD,
          constants.REPORT_STATES.SENDING_TO_SUPPLIER,
          constants.REPORT_STATES.ERROR_SENDING_TO_SUPPLIER,
          constants.REPORT_STATES.FULFILMENT_PENDING,
          constants.REPORT_STATES.FULFILMENT_IN_PROCESS,
          constants.REPORT_STATES.FULFILMENT_FAILURE
        ]
      },
      deletedAt: {
        exists: false
      }
    };

    if(typeof filterSelectedDeliveredToStoreId == 'string' && filterSelectedDeliveredToStoreId != '') {
      generatedReportsCountFilter.storeModelId.inq = [filterSelectedDeliveredToStoreId];
      pendingGeneratedReportsCountFilter.storeModelId.inq = [filterSelectedDeliveredToStoreId]
    }

    if(typeof filterSelectedDeliveredFromStoreId == 'string' && filterSelectedDeliveredFromStoreId != '') {
      generatedReportsCountFilter['deliverFromStoreModelId'] = {
        inq: [filterSelectedDeliveredFromStoreId]
      };
      pendingGeneratedReportsCountFilter['deliverFromStoreModelId'] = {
        inq: [filterSelectedDeliveredFromStoreId]
      };
    }

    console.log('generatedReportsCountFilter', generatedReportsCountFilter);
    console.log('pendingGeneratedReportsCountFilter', pendingGeneratedReportsCountFilter);

    let generatedReportsFilter = {
      ...filter, ...{
        where: generatedReportsCountFilter
      }
    };

    if (reportModelId) {
      generatedReportsFilter.where['id'] = reportModelId
    }
    let fetchOrders = combineLatest(
      this.orgModelApi.getReportModels(this.userProfile.orgModelId, generatedReportsFilter),
      this.orgModelApi.countReportModels(this.userProfile.orgModelId, generatedReportsCountFilter),
      this.orgModelApi.countReportModels(this.userProfile.orgModelId, pendingGeneratedReportsCountFilter)
    );
    return fetchOrders.pipe(map((data: any) => {
        return {
          generatedOrders: data[0],
          generatedOrdersCount: data[1].count,
          pendingGeneratedOrdersCount: data[2].count
        };
      },
      err => {
        console.log('Could not fetch generated stock orders', err);
        return err;
      }
    ));

  };

  fetchReceiveStockOrders = (filterSelectedDeliveredToStoreId?: string, filterSelectedDeliveredFromStoreId?: string, limit?: number, skip?: number): Observable<any> => {
    limit = this.ordersMaxLimit || limit || 10;
    skip = skip || 0;
    let filter = {
      limit: limit,
      skip: skip,
      order: 'createdAt DESC',
      include: ['storeModel', 'userModel', 'supplierModel'],
    };

    let pendingReceiveReportsCountFilter = {
      storeModelId: {
        inq: this.userProfile.storeModels.map(x => x.objectId)
      },
      state: {
        inq: [
          constants.REPORT_STATES.RECEIVING_PENDING,
          constants.REPORT_STATES.RECEIVING_IN_PROCESS
        ]
      },
      deletedAt: {
        exists: false
      }
    };

    let receiveReportsCountFilter = {
      storeModelId: {
        inq: this.userProfile.storeModels.map(x => x.objectId)
      },
      state: {
        inq: [
          constants.REPORT_STATES.RECEIVING_PENDING,
          constants.REPORT_STATES.RECEIVING_IN_PROCESS,
          constants.REPORT_STATES.SUBMITTING_RECEIVALS,
          constants.REPORT_STATES.RECEIVING_FAILURE
        ]
      },
      deletedAt: {
        exists: false
      }
    };

    if(typeof filterSelectedDeliveredToStoreId == 'string' && filterSelectedDeliveredToStoreId != '') {
      receiveReportsCountFilter.storeModelId.inq = [filterSelectedDeliveredToStoreId];
      pendingReceiveReportsCountFilter.storeModelId.inq = [filterSelectedDeliveredToStoreId]
    }

    if(typeof filterSelectedDeliveredFromStoreId == 'string' && filterSelectedDeliveredFromStoreId != '') {
      receiveReportsCountFilter['deliverFromStoreModelId'] = {
        inq: [filterSelectedDeliveredFromStoreId]
      };
      pendingReceiveReportsCountFilter['deliverFromStoreModelId'] = {
        inq: [filterSelectedDeliveredFromStoreId]
      };
    }

    console.log('receiveReportsCountFilter', receiveReportsCountFilter);
    console.log('pendingReceiveReportsCountFilter', pendingReceiveReportsCountFilter);

    let receiveReportsFilter = {
      ...filter, ...{
        where: receiveReportsCountFilter
      }
    };

    let fetchOrders = combineLatest(
      this.orgModelApi.getReportModels(this.userProfile.orgModelId, receiveReportsFilter),
      this.orgModelApi.countReportModels(this.userProfile.orgModelId, receiveReportsCountFilter),
      this.orgModelApi.countReportModels(this.userProfile.orgModelId, pendingReceiveReportsCountFilter)
    );
    return fetchOrders.pipe(map((data: any) => {
        return {
          receiveOrders: data[0],
          receiveOrdersCount: data[1].count,
          pendingReceiveOrdersCount: data[2].count,
        };
      },
      err => {
        console.log('Could not fetch stock orders', err);
        return err;
      }
    ));

  };

  fetchFulfillStockOrders = (filterSelectedDeliveredToStoreId?: string, filterSelectedDeliveredFromStoreId?: string, limit?: number, skip?: number): Observable<any> => {
    limit = this.ordersMaxLimit || limit || 10;
    skip = skip || 0;
    let filter = {
      limit: limit,
      skip: skip,
      order: 'createdAt DESC',
      include: ['storeModel', 'userModel', 'supplierModel'],
    };

    let pendingFulfillReportsCountFilter = {
      deliverFromStoreModelId: {
        inq: this.userProfile.storeModels.map(x => x.objectId)
      },
      state: {
        inq: [
          constants.REPORT_STATES.FULFILMENT_PENDING,
          constants.REPORT_STATES.FULFILMENT_IN_PROCESS
        ]
      },
      deletedAt: {
        exists: false
      }
    };

    let fulfillReportsCountFilter = {
      deliverFromStoreModelId: {
        inq: this.userProfile.storeModels.map(x => x.objectId)
      },
      state: {
        inq: [
          constants.REPORT_STATES.FULFILMENT_PENDING,
          constants.REPORT_STATES.FULFILMENT_IN_PROCESS,
          constants.REPORT_STATES.FULFILMENT_FAILURE,
          constants.REPORT_STATES.RECEIVING_PENDING,
          constants.REPORT_STATES.RECEIVING_IN_PROCESS,
          constants.REPORT_STATES.RECEIVING_FAILURE
        ]
      },
      deletedAt: {
        exists: false
      }
    };

    if(typeof filterSelectedDeliveredToStoreId == 'string' && filterSelectedDeliveredToStoreId != '') {
      fulfillReportsCountFilter['storeModelId'] = {
        inq: [filterSelectedDeliveredFromStoreId]
      };
      pendingFulfillReportsCountFilter['storeModelId'] = {
        inq: [filterSelectedDeliveredFromStoreId]
      };
    }

    if(typeof filterSelectedDeliveredFromStoreId == 'string' && filterSelectedDeliveredFromStoreId != '') {
      fulfillReportsCountFilter.deliverFromStoreModelId.inq = [filterSelectedDeliveredFromStoreId];
      pendingFulfillReportsCountFilter.deliverFromStoreModelId.inq = [filterSelectedDeliveredFromStoreId]
    }

    console.log('receiveReportsCountFilter', fulfillReportsCountFilter);
    console.log('pendingReceiveReportsCountFilter', pendingFulfillReportsCountFilter);

    let fulfillReportsFilter = {
      ...filter, ...{
        where: fulfillReportsCountFilter
      }
    };

    let fetchOrders = combineLatest(
      this.orgModelApi.getReportModels(this.userProfile.orgModelId, fulfillReportsFilter),
      this.orgModelApi.countReportModels(this.userProfile.orgModelId, fulfillReportsCountFilter),
      this.orgModelApi.countReportModels(this.userProfile.orgModelId, pendingFulfillReportsCountFilter)
    );
    return fetchOrders.pipe(map((data: any) => {
        return {
          fulfillOrders: data[0],
          fulfillOrdersCount: data[1].count,
          pendingFulfillOrdersCount: data[2].count
        };
      },
      err => {
        console.log('Could not fetch fulfill stock orders', err);
        return err;
      }
    ));

  };

}
