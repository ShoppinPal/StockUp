/* tslint:disable */
import {
  UserModel,
  StoreModel,
  ReportModel,
  SupplierModel
} from '../index';

declare var Object: any;
export interface StoreConfigModelInterface {
  "objectId"?: any;
  "name"?: string;
  "owner_email"?: string;
  "posVendor": string;
  "posUrl"?: string;
  "username"?: string;
  "password"?: string;
  "productImportRules": any;
  "transactionFee"?: number;
  "customPayerEmailMessage"?: string;
  "promos"?: Array<any>;
  "categoryMapping"?: string;
  "showCategories"?: any;
  "tagToCategoryMappingPrefix"?: string;
  "refreshToken"?: string;
  "wepayAccessToken"?: string;
  "wepayAccountId"?: string;
  "wepayAccountState"?: any;
  "suppliers"?: Array<any>;
  "usesWorkersV2"?: any;
  "userId"?: any;
  userModel?: UserModel;
  storeModels?: StoreModel[];
  reportModels?: ReportModel[];
  supplierModels?: SupplierModel[];
  productModels?: any[];
  syncModels?: any[];
  inventoryModels?: any[];
}

export class StoreConfigModel implements StoreConfigModelInterface {
  "objectId": any;
  "name": string;
  "owner_email": string;
  "posVendor": string;
  "posUrl": string;
  "username": string;
  "password": string;
  "productImportRules": any;
  "transactionFee": number;
  "customPayerEmailMessage": string;
  "promos": Array<any>;
  "categoryMapping": string;
  "showCategories": any;
  "tagToCategoryMappingPrefix": string;
  "refreshToken": string;
  "wepayAccessToken": string;
  "wepayAccountId": string;
  "wepayAccountState": any;
  "suppliers": Array<any>;
  "usesWorkersV2": any;
  "userId": any;
  userModel: UserModel;
  storeModels: StoreModel[];
  reportModels: ReportModel[];
  supplierModels: SupplierModel[];
  productModels: any[];
  syncModels: any[];
  inventoryModels: any[];
  constructor(data?: StoreConfigModelInterface) {
    Object.assign(this, data);
  }
  /**
   * The name of the model represented by this $resource,
   * i.e. `StoreConfigModel`.
   */
  public static getModelName() {
    return "StoreConfigModel";
  }
  /**
  * @method factory
  * @author Jonathan Casarrubias
  * @license MIT
  * This method creates an instance of StoreConfigModel for dynamic purposes.
  **/
  public static factory(data: StoreConfigModelInterface): StoreConfigModel{
    return new StoreConfigModel(data);
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
      name: 'StoreConfigModel',
      plural: 'StoreConfigModels',
      path: 'StoreConfigModels',
      properties: {
        "objectId": {
          name: 'objectId',
          type: 'any'
        },
        "name": {
          name: 'name',
          type: 'string'
        },
        "owner_email": {
          name: 'owner_email',
          type: 'string'
        },
        "posVendor": {
          name: 'posVendor',
          type: 'string'
        },
        "posUrl": {
          name: 'posUrl',
          type: 'string'
        },
        "username": {
          name: 'username',
          type: 'string'
        },
        "password": {
          name: 'password',
          type: 'string'
        },
        "productImportRules": {
          name: 'productImportRules',
          type: 'any'
        },
        "transactionFee": {
          name: 'transactionFee',
          type: 'number'
        },
        "customPayerEmailMessage": {
          name: 'customPayerEmailMessage',
          type: 'string'
        },
        "promos": {
          name: 'promos',
          type: 'Array&lt;any&gt;'
        },
        "categoryMapping": {
          name: 'categoryMapping',
          type: 'string'
        },
        "showCategories": {
          name: 'showCategories',
          type: 'any'
        },
        "tagToCategoryMappingPrefix": {
          name: 'tagToCategoryMappingPrefix',
          type: 'string'
        },
        "refreshToken": {
          name: 'refreshToken',
          type: 'string'
        },
        "wepayAccessToken": {
          name: 'wepayAccessToken',
          type: 'string'
        },
        "wepayAccountId": {
          name: 'wepayAccountId',
          type: 'string'
        },
        "wepayAccountState": {
          name: 'wepayAccountState',
          type: 'any'
        },
        "suppliers": {
          name: 'suppliers',
          type: 'Array&lt;any&gt;'
        },
        "usesWorkersV2": {
          name: 'usesWorkersV2',
          type: 'any'
        },
        "userId": {
          name: 'userId',
          type: 'any'
        },
      },
      relations: {
        userModel: {
          name: 'userModel',
          type: 'UserModel',
          model: 'UserModel'
        },
        storeModels: {
          name: 'storeModels',
          type: 'StoreModel[]',
          model: 'StoreModel'
        },
        reportModels: {
          name: 'reportModels',
          type: 'ReportModel[]',
          model: 'ReportModel'
        },
        supplierModels: {
          name: 'supplierModels',
          type: 'SupplierModel[]',
          model: 'SupplierModel'
        },
        productModels: {
          name: 'productModels',
          type: 'any[]',
          model: ''
        },
        syncModels: {
          name: 'syncModels',
          type: 'any[]',
          model: ''
        },
        inventoryModels: {
          name: 'inventoryModels',
          type: 'any[]',
          model: ''
        },
      }
    }
  }
}
