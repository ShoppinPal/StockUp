/* tslint:disable */
import {
  UserModel,
  StoreConfigModel,
  StoreModel,
  StockOrderLineitemModel,
  OrgModel
} from '../index';

declare var Object: any;
export interface ReportModelInterface {
  "id"?: any;
  "name"?: string;
  "created": Date;
  "state": string;
  "supplier"?: any;
  "outlet": any;
  "totalRows"?: number;
  "workerTaskId"?: string;
  "workerStatus"?: string;
  "vendConsignmentId"?: string;
  "vendConsignment"?: any;
  "userModelToReportModelId"?: any;
  "storeConfigModelId"?: any;
  "storeModelId"?: any;
  "orgModelId"?: any;
  "categoryModelId"?: any;
  userModel?: UserModel;
  storeConfigModel?: StoreConfigModel;
  storeModel?: StoreModel;
  stockOrderLineitemModels?: StockOrderLineitemModel[];
  orgModel?: OrgModel;
  categoryModel?: any;
}

export class ReportModel implements ReportModelInterface {
  "id": any;
  "name": string;
  "created": Date;
  "state": string;
  "supplier": any;
  "outlet": any;
  "totalRows": number;
  "workerTaskId": string;
  "workerStatus": string;
  "vendConsignmentId": string;
  "vendConsignment": any;
  "userModelToReportModelId": any;
  "storeConfigModelId": any;
  "storeModelId": any;
  "orgModelId": any;
  "categoryModelId": any;
  userModel: UserModel;
  storeConfigModel: StoreConfigModel;
  storeModel: StoreModel;
  stockOrderLineitemModels: StockOrderLineitemModel[];
  orgModel: OrgModel;
  categoryModel: any;
  constructor(data?: ReportModelInterface) {
    Object.assign(this, data);
  }
  /**
   * The name of the model represented by this $resource,
   * i.e. `ReportModel`.
   */
  public static getModelName() {
    return "ReportModel";
  }
  /**
  * @method factory
  * @author Jonathan Casarrubias
  * @license MIT
  * This method creates an instance of ReportModel for dynamic purposes.
  **/
  public static factory(data: ReportModelInterface): ReportModel{
    return new ReportModel(data);
  }
  /**
  * @method getModelDefinition
  * @author Julien Ledun
  * @license MIT
  * This method returns an object that represents some of the model
  * definitions.
  **/
  public static getModelDefinition() {
    return {
      name: 'ReportModel',
      plural: 'ReportModels',
      path: 'ReportModels',
      properties: {
        "id": {
          name: 'id',
          type: 'any'
        },
        "name": {
          name: 'name',
          type: 'string'
        },
        "created": {
          name: 'created',
          type: 'Date'
        },
        "state": {
          name: 'state',
          type: 'string'
        },
        "supplier": {
          name: 'supplier',
          type: 'any'
        },
        "outlet": {
          name: 'outlet',
          type: 'any'
        },
        "totalRows": {
          name: 'totalRows',
          type: 'number'
        },
        "workerTaskId": {
          name: 'workerTaskId',
          type: 'string'
        },
        "workerStatus": {
          name: 'workerStatus',
          type: 'string'
        },
        "vendConsignmentId": {
          name: 'vendConsignmentId',
          type: 'string'
        },
        "vendConsignment": {
          name: 'vendConsignment',
          type: 'any'
        },
        "userModelToReportModelId": {
          name: 'userModelToReportModelId',
          type: 'any'
        },
        "storeConfigModelId": {
          name: 'storeConfigModelId',
          type: 'any'
        },
        "storeModelId": {
          name: 'storeModelId',
          type: 'any'
        },
        "orgModelId": {
          name: 'orgModelId',
          type: 'any'
        },
        "categoryModelId": {
          name: 'categoryModelId',
          type: 'any'
        },
      },
      relations: {
        userModel: {
          name: 'userModel',
          type: 'UserModel',
          model: 'UserModel'
        },
        storeConfigModel: {
          name: 'storeConfigModel',
          type: 'StoreConfigModel',
          model: 'StoreConfigModel'
        },
        storeModel: {
          name: 'storeModel',
          type: 'StoreModel',
          model: 'StoreModel'
        },
        stockOrderLineitemModels: {
          name: 'stockOrderLineitemModels',
          type: 'StockOrderLineitemModel[]',
          model: 'StockOrderLineitemModel'
        },
        orgModel: {
          name: 'orgModel',
          type: 'OrgModel',
          model: 'OrgModel'
        },
        categoryModel: {
          name: 'categoryModel',
          type: 'any',
          model: ''
        },
      }
    }
  }
}
