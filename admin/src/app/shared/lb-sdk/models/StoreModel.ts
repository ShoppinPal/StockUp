/* tslint:disable */
import {
  UserModel,
  StoreConfigModel,
  GeoPoint
} from '../index';

declare var Object: any;
export interface StoreModelInterface {
  "objectId"?: any;
  "name": string;
  "isWarehouse": boolean;
  "phone"?: string;
  "addressLine1"?: string;
  "addressLine2"?: string;
  "city"?: string;
  "state"?: string;
  "postalCode"?: string;
  "country": string;
  "location"?: GeoPoint;
  "hours"?: Array<any>;
  "api_id": string;
  "registerId"?: string;
  "tax_rate"?: number;
  "hideOutOfStockProducts"?: boolean;
  "defaultPaymentType"?: any;
  "userModelToStoreModelId"?: any;
  "storeConfigModelToStoreModelId"?: any;
  userModel?: UserModel;
  storeConfigModel?: StoreConfigModel;
}

export class StoreModel implements StoreModelInterface {
  "objectId": any;
  "name": string;
  "isWarehouse": boolean;
  "phone": string;
  "addressLine1": string;
  "addressLine2": string;
  "city": string;
  "state": string;
  "postalCode": string;
  "country": string;
  "location": GeoPoint;
  "hours": Array<any>;
  "api_id": string;
  "registerId": string;
  "tax_rate": number;
  "hideOutOfStockProducts": boolean;
  "defaultPaymentType": any;
  "userModelToStoreModelId": any;
  "storeConfigModelToStoreModelId": any;
  userModel: UserModel;
  storeConfigModel: StoreConfigModel;
  constructor(data?: StoreModelInterface) {
    Object.assign(this, data);
  }
  /**
   * The name of the model represented by this $resource,
   * i.e. `StoreModel`.
   */
  public static getModelName() {
    return "StoreModel";
  }
  /**
  * @method factory
  * @author Jonathan Casarrubias
  * @license MIT
  * This method creates an instance of StoreModel for dynamic purposes.
  **/
  public static factory(data: StoreModelInterface): StoreModel{
    return new StoreModel(data);
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
      name: 'StoreModel',
      plural: 'StoreModels',
      path: 'StoreModels',
      properties: {
        "objectId": {
          name: 'objectId',
          type: 'any'
        },
        "name": {
          name: 'name',
          type: 'string'
        },
        "isWarehouse": {
          name: 'isWarehouse',
          type: 'boolean',
          default: false
        },
        "phone": {
          name: 'phone',
          type: 'string'
        },
        "addressLine1": {
          name: 'addressLine1',
          type: 'string'
        },
        "addressLine2": {
          name: 'addressLine2',
          type: 'string'
        },
        "city": {
          name: 'city',
          type: 'string'
        },
        "state": {
          name: 'state',
          type: 'string'
        },
        "postalCode": {
          name: 'postalCode',
          type: 'string'
        },
        "country": {
          name: 'country',
          type: 'string'
        },
        "location": {
          name: 'location',
          type: 'GeoPoint'
        },
        "hours": {
          name: 'hours',
          type: 'Array&lt;any&gt;'
        },
        "api_id": {
          name: 'api_id',
          type: 'string'
        },
        "registerId": {
          name: 'registerId',
          type: 'string'
        },
        "tax_rate": {
          name: 'tax_rate',
          type: 'number'
        },
        "hideOutOfStockProducts": {
          name: 'hideOutOfStockProducts',
          type: 'boolean'
        },
        "defaultPaymentType": {
          name: 'defaultPaymentType',
          type: 'any'
        },
        "userModelToStoreModelId": {
          name: 'userModelToStoreModelId',
          type: 'any'
        },
        "storeConfigModelToStoreModelId": {
          name: 'storeConfigModelToStoreModelId',
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
      }
    }
  }
}
