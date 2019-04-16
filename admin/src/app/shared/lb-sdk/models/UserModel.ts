/* tslint:disable */
import {
  OrgModel
} from '../index';

declare var Object: any;
export interface UserModelInterface {
  "id"?: any;
  "emailVerified"?: boolean;
  "realm"?: string;
  "username"?: string;
  "challenges"?: any;
  "email": string;
  "status"?: string;
  "created"?: Date;
  "lastUpdated"?: Date;
  "createdAt"?: Date;
  "updatedAt"?: Date;
  "memberId"?: any;
  "storeConfigModelIs"?: any;
  "storeConfigModelId"?: any;
  "orgModelId"?: any;
  "password"?: string;
  accessTokens?: any[];
  roles?: any[];
  teamModels?: any[];
  globalConfigModels?: any;
  storeConfigModel?: any;
  storeModels?: any[];
  reportModels?: any[];
  stockOrderLineitemModels?: any[];
  supplierModels?: any[];
  orgModel?: OrgModel;
  roleMappings?: any[];
}

export class UserModel implements UserModelInterface {
  "id": any;
  "emailVerified": boolean;
  "realm": string;
  "username": string;
  "challenges": any;
  "email": string;
  "status": string;
  "created": Date;
  "lastUpdated": Date;
  "createdAt": Date;
  "updatedAt": Date;
  "memberId": any;
  "storeConfigModelIs": any;
  "storeConfigModelId": any;
  "orgModelId": any;
  "password": string;
  accessTokens: any[];
  roles: any[];
  teamModels: any[];
  globalConfigModels: any;
  storeConfigModel: any;
  storeModels: any[];
  reportModels: any[];
  stockOrderLineitemModels: any[];
  supplierModels: any[];
  orgModel: OrgModel;
  roleMappings: any[];
  constructor(data?: UserModelInterface) {
    Object.assign(this, data);
  }
  /**
   * The name of the model represented by this $resource,
   * i.e. `UserModel`.
   */
  public static getModelName() {
    return "UserModel";
  }
  /**
  * @method factory
  * @author Jonathan Casarrubias
  * @license MIT
  * This method creates an instance of UserModel for dynamic purposes.
  **/
  public static factory(data: UserModelInterface): UserModel{
    return new UserModel(data);
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
      name: 'UserModel',
      plural: 'UserModels',
      path: 'UserModels',
      properties: {
        "id": {
          name: 'id',
          type: 'any'
        },
        "emailVerified": {
          name: 'emailVerified',
          type: 'boolean',
          default: false
        },
        "realm": {
          name: 'realm',
          type: 'string'
        },
        "username": {
          name: 'username',
          type: 'string'
        },
        "credentials": {
          name: 'credentials',
          type: 'any'
        },
        "challenges": {
          name: 'challenges',
          type: 'any'
        },
        "email": {
          name: 'email',
          type: 'string'
        },
        "status": {
          name: 'status',
          type: 'string'
        },
        "created": {
          name: 'created',
          type: 'Date'
        },
        "lastUpdated": {
          name: 'lastUpdated',
          type: 'Date'
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
        "memberId": {
          name: 'memberId',
          type: 'any'
        },
        "storeConfigModelIs": {
          name: 'storeConfigModelIs',
          type: 'any'
        },
        "storeConfigModelId": {
          name: 'storeConfigModelId',
          type: 'any'
        },
        "orgModelId": {
          name: 'orgModelId',
          type: 'any'
        },
        "password": {
          name: 'password',
          type: 'string'
        },
      },
      relations: {
        accessTokens: {
          name: 'accessTokens',
          type: 'any[]',
          model: ''
        },
        roles: {
          name: 'roles',
          type: 'any[]',
          model: ''
        },
        teamModels: {
          name: 'teamModels',
          type: 'any[]',
          model: ''
        },
        globalConfigModels: {
          name: 'globalConfigModels',
          type: 'any',
          model: ''
        },
        storeConfigModel: {
          name: 'storeConfigModel',
          type: 'any',
          model: ''
        },
        storeModels: {
          name: 'storeModels',
          type: 'any[]',
          model: ''
        },
        reportModels: {
          name: 'reportModels',
          type: 'any[]',
          model: ''
        },
        stockOrderLineitemModels: {
          name: 'stockOrderLineitemModels',
          type: 'any[]',
          model: ''
        },
        supplierModels: {
          name: 'supplierModels',
          type: 'any[]',
          model: ''
        },
        orgModel: {
          name: 'orgModel',
          type: 'OrgModel',
          model: 'OrgModel'
        },
        roleMappings: {
          name: 'roleMappings',
          type: 'any[]',
          model: ''
        },
      }
    }
  }
}
