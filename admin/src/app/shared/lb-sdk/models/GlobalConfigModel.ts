/* tslint:disable */
import {
  UserModel
} from '../index';

declare var Object: any;
export interface GlobalConfigModelInterface {
  "objectId"?: any;
  "vendClientId"?: string;
  "vendClientSecret"?: string;
  "vendTokenService"?: string;
  "userModelToGlobalConfigModelId"?: any;
  userModel?: UserModel;
}

export class GlobalConfigModel implements GlobalConfigModelInterface {
  "objectId": any;
  "vendClientId": string;
  "vendClientSecret": string;
  "vendTokenService": string;
  "userModelToGlobalConfigModelId": any;
  userModel: UserModel;
  constructor(data?: GlobalConfigModelInterface) {
    Object.assign(this, data);
  }
  /**
   * The name of the model represented by this $resource,
   * i.e. `GlobalConfigModel`.
   */
  public static getModelName() {
    return "GlobalConfigModel";
  }
  /**
  * @method factory
  * @author Jonathan Casarrubias
  * @license MIT
  * This method creates an instance of GlobalConfigModel for dynamic purposes.
  **/
  public static factory(data: GlobalConfigModelInterface): GlobalConfigModel{
    return new GlobalConfigModel(data);
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
      name: 'GlobalConfigModel',
      plural: 'GlobalConfigModels',
      path: 'GlobalConfigModels',
      properties: {
        "objectId": {
          name: 'objectId',
          type: 'any'
        },
        "vendClientId": {
          name: 'vendClientId',
          type: 'string'
        },
        "vendClientSecret": {
          name: 'vendClientSecret',
          type: 'string'
        },
        "vendTokenService": {
          name: 'vendTokenService',
          type: 'string'
        },
        "userModelToGlobalConfigModelId": {
          name: 'userModelToGlobalConfigModelId',
          type: 'any'
        },
      },
      relations: {
        userModel: {
          name: 'userModel',
          type: 'UserModel',
          model: 'UserModel'
        },
      }
    }
  }
}
