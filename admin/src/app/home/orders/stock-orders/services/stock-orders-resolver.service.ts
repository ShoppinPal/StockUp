import {Injectable} from '@angular/core';
import {Observable, combineLatest} from 'rxjs';
import {map} from 'rxjs/operators';
import {UserProfileService} from '../../../../shared/services/user-profile.service';
import {OrgModelApi} from "../../../../shared/lb-sdk/services/custom/OrgModel";
import {constants} from '../../../../shared/constants/constants';
import {FileImportsResolverService} from "../../../file-imports/services/file-imports-resolver.service";

@Injectable()
export class StockOrdersResolverService {
private userProfile: any;

  constructor(private orgModelApi: OrgModelApi,
              private _userProfileService: UserProfileService,
              private _fileImportsResolverService: FileImportsResolverService) {
  }

  resolve = ():Observable<any> => {
   this.userProfile = this._userProfileService.getProfileData();
    return combineLatest(
      this.fetchGeneratedStockOrders(),
      this.fetchReceiveStockOrders(),
      this.fetchFulfillStockOrders(),
      this.fetchCompletedStockOrders(),
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
            completedOrders: data[3].completedOrders,
            completedOrdersCount: data[3].completedOrdersCount,
            suppliers: data[4],
            stores: data[5],
            orderConfigurations: data[6]
          }
        },
        err => {
          console.log('error fetching stock orders', err);
        }))
  };

  fetchGeneratedStockOrders = (limit?: number, skip?: number, reportModelId ?: string): Observable<any> => {
    limit = limit || 10;
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

    let generatedReportsFilter = {
      ...filter, ...{
        where: generatedReportsCountFilter
      }
    };

    if (reportModelId){
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

  fetchReceiveStockOrders = (limit?: number, skip?: number): Observable<any> => {
    limit = limit || 10;
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
          constants.REPORT_STATES.RECEIVING_FAILURE
        ]
      },
      deletedAt: {
        exists: false
      }
    };

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

  fetchFulfillStockOrders = (limit?: number, skip?: number): Observable<any> => {
    limit = limit || 10;
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

  fetchCompletedStockOrders = (limit?: number, skip?: number): Observable<any> => {
    limit = limit || 10;
    skip = skip || 0;
    let filter = {
      limit: limit,
      skip: skip,
      order: 'createdAt DESC',
      include: ['storeModel', 'userModel', 'supplierModel'],
    };

    let completeReportsCountFilter = {
      or: [
        {
          storeModelId: {
            inq: this.userProfile.storeModels.map(x => x.objectId)
          }
        },
        {
          deliverFromStoreModelId: {
            inq: this.userProfile.storeModels.map(x => x.objectId)
          }
        }
      ],
      state: {
        inq: [
          constants.REPORT_STATES.COMPLETE
        ]
      }
    };

    let completeReportsFilter = {
      ...filter, ...{
        where: completeReportsCountFilter
      }
    };

    let fetchOrders = combineLatest(
        this.orgModelApi.getReportModels(this.userProfile.orgModelId, completeReportsFilter),
        this.orgModelApi.countReportModels(this.userProfile.orgModelId, completeReportsCountFilter)
      );
    return fetchOrders.pipe(map((data: any) => {
        return {
          completedOrders: data[0],
          completedOrdersCount: data[1].count
        };
      },
      err => {
        console.log('Could not fetch completed stock orders', err);
        return err;
      }
    ));

  };

}
