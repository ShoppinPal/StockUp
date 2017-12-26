/* tslint:disable */
import {
  UserModel,
  StoreConfigModel,
  StockOrderLineitemModel
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
  userModel?: UserModel;
  storeConfigModel?: StoreConfigModel;
  stockOrderLineitemModels?: StockOrderLineitemModel[];
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
  userModel: UserModel;
  storeConfigModel: StoreConfigModel;
  stockOrderLineitemModels: StockOrderLineitemModel[];
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
        stockOrderLineitemModels: {
          name: 'stockOrderLineitemModels',
          type: 'StockOrderLineitemModel[]',
          model: 'StockOrderLineitemModel'
        },
      }
    }
  }
}
