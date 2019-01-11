/* tslint:disable */
import {
  OrgModel
} from '../index';

declare var Object: any;
export interface IntegrationModelInterface {
  "type": string;
  "domain_prefix"?: string;
  "token_type"?: string;
  "id"?: any;
  "orgModelId"?: any;
  "createdAt"?: Date;
  "updatedAt"?: Date;
  orgModel?: OrgModel;
}

export class IntegrationModel implements IntegrationModelInterface {
  "type": string;
  "domain_prefix": string;
  "token_type": string;
  "id": any;
  "orgModelId": any;
  "createdAt": Date;
  "updatedAt": Date;
  orgModel: OrgModel;
  constructor(data?: IntegrationModelInterface) {
    Object.assign(this, data);
  }
  /**
   * The name of the model represented by this $resource,
   * i.e. `IntegrationModel`.
   */
  public static getModelName() {
    return "IntegrationModel";
  }
  /**
  * @method factory
  * @author Jonathan Casarrubias
  * @license MIT
  * This method creates an instance of IntegrationModel for dynamic purposes.
  **/
  public static factory(data: IntegrationModelInterface): IntegrationModel{
    return new IntegrationModel(data);
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
      name: 'IntegrationModel',
      plural: 'IntegrationModels',
      path: 'IntegrationModels',
      properties: {
        "type": {
          name: 'type',
          type: 'string'
        },
        "domain_prefix": {
          name: 'domain_prefix',
          type: 'string'
        },
        "token_type": {
          name: 'token_type',
          type: 'string',
          default: 'Bearer'
        },
        "id": {
          name: 'id',
          type: 'any'
        },
        "orgModelId": {
          name: 'orgModelId',
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
        orgModel: {
          name: 'orgModel',
          type: 'OrgModel',
          model: 'OrgModel'
        },
      }
    }
  }
}
