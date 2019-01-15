/* tslint:disable */
import {
  UserModel,
  ReportModel,
  OrgModel
} from '../index';

declare var Object: any;
export interface StockOrderLineitemModelInterface {
  "id"?: any;
  "productId"?: string;
  "sku": string;
  "name"?: string;
  "quantityOnHand"?: number;
  "caseQuantity"?: number;
  "desiredStockLevel"?: number;
  "orderQuantity"?: number;
  "fulfilledQuantity"?: number;
  "receivedQuantity"?: number;
  "boxNumber"?: number;
  "type"?: string;
  "comments"?: any;
  "state"?: string;
  "updatedAt"?: Date;
  "vendConsignmentProductId"?: string;
  "vendConsignmentProduct"?: any;
  "supplyPrice"?: number;
  "userId"?: any;
  "reportId"?: any;
  "reportModelId"?: any;
  "productModelId"?: any;
  "orgModelId"?: any;
  userModel?: UserModel;
  reportModel?: ReportModel;
  productModel?: any;
  orgModel?: OrgModel;
}

export class StockOrderLineitemModel implements StockOrderLineitemModelInterface {
  "id": any;
  "productId": string;
  "sku": string;
  "name": string;
  "quantityOnHand": number;
  "caseQuantity": number;
  "desiredStockLevel": number;
  "orderQuantity": number;
  "fulfilledQuantity": number;
  "receivedQuantity": number;
  "boxNumber": number;
  "type": string;
  "comments": any;
  "state": string;
  "updatedAt": Date;
  "vendConsignmentProductId": string;
  "vendConsignmentProduct": any;
  "supplyPrice": number;
  "userId": any;
  "reportId": any;
  "reportModelId": any;
  "productModelId": any;
  "orgModelId": any;
  userModel: UserModel;
  reportModel: ReportModel;
  productModel: any;
  orgModel: OrgModel;
  constructor(data?: StockOrderLineitemModelInterface) {
    Object.assign(this, data);
  }
  /**
   * The name of the model represented by this $resource,
   * i.e. `StockOrderLineitemModel`.
   */
  public static getModelName() {
    return "StockOrderLineitemModel";
  }
  /**
  * @method factory
  * @author Jonathan Casarrubias
  * @license MIT
  * This method creates an instance of StockOrderLineitemModel for dynamic purposes.
  **/
  public static factory(data: StockOrderLineitemModelInterface): StockOrderLineitemModel{
    return new StockOrderLineitemModel(data);
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
      name: 'StockOrderLineitemModel',
      plural: 'StockOrderLineitemModels',
      path: 'StockOrderLineitemModels',
      properties: {
        "id": {
          name: 'id',
          type: 'any'
        },
        "productId": {
          name: 'productId',
          type: 'string'
        },
        "sku": {
          name: 'sku',
          type: 'string'
        },
        "name": {
          name: 'name',
          type: 'string'
        },
        "quantityOnHand": {
          name: 'quantityOnHand',
          type: 'number'
        },
        "caseQuantity": {
          name: 'caseQuantity',
          type: 'number'
        },
        "desiredStockLevel": {
          name: 'desiredStockLevel',
          type: 'number'
        },
        "orderQuantity": {
          name: 'orderQuantity',
          type: 'number'
        },
        "fulfilledQuantity": {
          name: 'fulfilledQuantity',
          type: 'number'
        },
        "receivedQuantity": {
          name: 'receivedQuantity',
          type: 'number'
        },
        "boxNumber": {
          name: 'boxNumber',
          type: 'number'
        },
        "type": {
          name: 'type',
          type: 'string'
        },
        "comments": {
          name: 'comments',
          type: 'any'
        },
        "state": {
          name: 'state',
          type: 'string'
        },
        "updatedAt": {
          name: 'updatedAt',
          type: 'Date'
        },
        "vendConsignmentProductId": {
          name: 'vendConsignmentProductId',
          type: 'string'
        },
        "vendConsignmentProduct": {
          name: 'vendConsignmentProduct',
          type: 'any'
        },
        "supplyPrice": {
          name: 'supplyPrice',
          type: 'number'
        },
        "userId": {
          name: 'userId',
          type: 'any'
        },
        "reportId": {
          name: 'reportId',
          type: 'any'
        },
        "reportModelId": {
          name: 'reportModelId',
          type: 'any'
        },
        "productModelId": {
          name: 'productModelId',
          type: 'any'
        },
        "orgModelId": {
          name: 'orgModelId',
          type: 'any'
        },
      },
      relations: {
        userModel: {
          name: 'userModel',
          type: 'UserModel',
          model: 'UserModel'
        },
        reportModel: {
          name: 'reportModel',
          type: 'ReportModel',
          model: 'ReportModel'
        },
        productModel: {
          name: 'productModel',
          type: 'any',
          model: ''
        },
        orgModel: {
          name: 'orgModel',
          type: 'OrgModel',
          model: 'OrgModel'
        },
      }
    }
  }
}
