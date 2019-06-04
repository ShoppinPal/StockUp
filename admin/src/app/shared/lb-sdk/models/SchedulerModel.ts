/* tslint:disable */
import {
  OrgModel,
  UserModel
} from '../index';

declare var Object: any;
export interface SchedulerModelInterface {
  "month"?: any;
  "day"?: any;
  "hour"?: any;
  "weekDay"?: any;
  "jobType": string;
  "active"?: boolean;
  "deleted"?: boolean;
  "lastGoodRun"?: Date;
  "data": any;
  "id"?: any;
  "orgModelId"?: any;
  "userModelId"?: any;
  "deletedByUserModelId"?: any;
  orgModel?: OrgModel;
  userModel?: UserModel;
  deletedByUserModel?: UserModel;
}

export class SchedulerModel implements SchedulerModelInterface {
  "month": any;
  "day": any;
  "hour": any;
  "weekDay": any;
  "jobType": string;
  "active": boolean;
  "deleted": boolean;
  "lastGoodRun": Date;
  "data": any;
  "id": any;
  "orgModelId": any;
  "userModelId": any;
  "deletedByUserModelId": any;
  orgModel: OrgModel;
  userModel: UserModel;
  deletedByUserModel: UserModel;
  constructor(data?: SchedulerModelInterface) {
    Object.assign(this, data);
  }
  /**
   * The name of the model represented by this $resource,
   * i.e. `SchedulerModel`.
   */
  public static getModelName() {
    return "SchedulerModel";
  }
  /**
  * @method factory
  * @author Jonathan Casarrubias
  * @license MIT
  * This method creates an instance of SchedulerModel for dynamic purposes.
  **/
  public static factory(data: SchedulerModelInterface): SchedulerModel{
    return new SchedulerModel(data);
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
      name: 'SchedulerModel',
      plural: 'SchedulerModels',
      path: 'SchedulerModels',
      idName: 'id',
      properties: {
        "month": {
          name: 'month',
          type: 'any'
        },
        "day": {
          name: 'day',
          type: 'any'
        },
        "hour": {
          name: 'hour',
          type: 'any'
        },
        "weekDay": {
          name: 'weekDay',
          type: 'any'
        },
        "jobType": {
          name: 'jobType',
          type: 'string'
        },
        "active": {
          name: 'active',
          type: 'boolean',
          default: true
        },
        "deleted": {
          name: 'deleted',
          type: 'boolean',
          default: false
        },
        "lastGoodRun": {
          name: 'lastGoodRun',
          type: 'Date',
          default: new Date(0)
        },
        "data": {
          name: 'data',
          type: 'any'
        },
        "id": {
          name: 'id',
          type: 'any'
        },
        "orgModelId": {
          name: 'orgModelId',
          type: 'any'
        },
        "userModelId": {
          name: 'userModelId',
          type: 'any'
        },
        "deletedByUserModelId": {
          name: 'deletedByUserModelId',
          type: 'any'
        },
      },
      relations: {
        orgModel: {
          name: 'orgModel',
          type: 'OrgModel',
          model: 'OrgModel',
          relationType: 'belongsTo',
                  keyFrom: 'orgModelId',
          keyTo: 'id'
        },
        userModel: {
          name: 'userModel',
          type: 'UserModel',
          model: 'UserModel',
          relationType: 'belongsTo',
                  keyFrom: 'userModelId',
          keyTo: 'id'
        },
        deletedByUserModel: {
          name: 'deletedByUserModel',
          type: 'UserModel',
          model: 'UserModel',
          relationType: 'belongsTo',
                  keyFrom: 'deletedByUserModelId',
          keyTo: 'id'
        },
      }
    }
  }
}
