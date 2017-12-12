/* tslint:disable */
import {
  UserModel,
  StoreConfigModel
} from '../index';

declare var Object: any;
export interface SupplierModelInterface {
  "name": string;
  "apiId": string;
  "id"?: any;
  "userId"?: any;
  "storeConfigModelToSupplierModelId"?: any;
  "storeConfigModelId"?: any;
  userModel?: UserModel;
  storeConfigModel?: StoreConfigModel;
  productModels?: any[];
}

export class SupplierModel implements SupplierModelInterface {
  "name": string;
  "apiId": string;
  "id": any;
  "userId": any;
  "storeConfigModelToSupplierModelId": any;
  "storeConfigModelId": any;
  userModel: UserModel;
  storeConfigModel: StoreConfigModel;
  productModels: any[];
  constructor(data?: SupplierModelInterface) {
    Object.assign(this, data);
  }
  /**
   * The name of the model represented by this $resource,
   * i.e. `SupplierModel`.
   */
  public static getModelName() {
    return "SupplierModel";
  }
  /**
  * @method factory
  * @author Jonathan Casarrubias
  * @license MIT
  * This method creates an instance of SupplierModel for dynamic purposes.
  **/
  public static factory(data: SupplierModelInterface): SupplierModel{
    return new SupplierModel(data);
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
      name: 'SupplierModel',
      plural: 'SupplierModels',
      path: 'SupplierModels',
      properties: {
        "name": {
          name: 'name',
          type: 'string'
        },
        "apiId": {
          name: 'apiId',
          type: 'string'
        },
        "id": {
          name: 'id',
          type: 'any'
        },
        "userId": {
          name: 'userId',
          type: 'any'
        },
        "storeConfigModelToSupplierModelId": {
          name: 'storeConfigModelToSupplierModelId',
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
        productModels: {
          name: 'productModels',
          type: 'any[]',
          model: ''
        },
      }
    }
  }
}
