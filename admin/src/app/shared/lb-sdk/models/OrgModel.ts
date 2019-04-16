/* tslint:disable */
import {
  UserModel
} from '../index';

declare var Object: any;
export interface OrgModelInterface {
  "name": string;
  "id"?: any;
  "createdAt"?: Date;
  "updatedAt"?: Date;
  userModels?: UserModel[];
  storeModels?: any[];
  supplierModels?: any[];
  stockOrderLineitemModels?: any[];
  reportModels?: any[];
  productModels?: any[];
  inventoryModels?: any[];
  syncModels?: any[];
  integrationModels?: any[];
  salesModels?: any[];
  salesLineItemsModels?: any[];
  categoryModels?: any[];
}

export class OrgModel implements OrgModelInterface {
  "name": string;
  "id": any;
  "createdAt": Date;
  "updatedAt": Date;
  userModels: UserModel[];
  storeModels: any[];
  supplierModels: any[];
  stockOrderLineitemModels: any[];
  reportModels: any[];
  productModels: any[];
  inventoryModels: any[];
  syncModels: any[];
  integrationModels: any[];
  salesModels: any[];
  salesLineItemsModels: any[];
  categoryModels: any[];
  constructor(data?: OrgModelInterface) {
    Object.assign(this, data);
  }
  /**
   * The name of the model represented by this $resource,
   * i.e. `OrgModel`.
   */
  public static getModelName() {
    return "OrgModel";
  }
  /**
  * @method factory
  * @author Jonathan Casarrubias
  * @license MIT
  * This method creates an instance of OrgModel for dynamic purposes.
  **/
  public static factory(data: OrgModelInterface): OrgModel{
    return new OrgModel(data);
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
      name: 'OrgModel',
      plural: 'OrgModels',
      path: 'OrgModels',
      properties: {
        "name": {
          name: 'name',
          type: 'string'
        },
        "id": {
          name: 'id',
          type: 'any'
        },
        "createdAt": {
          name: 'createdAt',
          type: 'Date',
          default: new Date(0)
        },
        "updatedAt": {
          name: 'updatedAt',
          type: 'Date',
          default: new Date(0)
        },
      },
      relations: {
        userModels: {
          name: 'userModels',
          type: 'UserModel[]',
          model: 'UserModel'
        },
        storeModels: {
          name: 'storeModels',
          type: 'any[]',
          model: ''
        },
        supplierModels: {
          name: 'supplierModels',
          type: 'any[]',
          model: ''
        },
        stockOrderLineitemModels: {
          name: 'stockOrderLineitemModels',
          type: 'any[]',
          model: ''
        },
        reportModels: {
          name: 'reportModels',
          type: 'any[]',
          model: ''
        },
        productModels: {
          name: 'productModels',
          type: 'any[]',
          model: ''
        },
        inventoryModels: {
          name: 'inventoryModels',
          type: 'any[]',
          model: ''
        },
        syncModels: {
          name: 'syncModels',
          type: 'any[]',
          model: ''
        },
        integrationModels: {
          name: 'integrationModels',
          type: 'any[]',
          model: ''
        },
        salesModels: {
          name: 'salesModels',
          type: 'any[]',
          model: ''
        },
        salesLineItemsModels: {
          name: 'salesLineItemsModels',
          type: 'any[]',
          model: ''
        },
        categoryModels: {
          name: 'categoryModels',
          type: 'any[]',
          model: ''
        },
      }
    }
  }
}
