/* tslint:disable */
import { Injectable } from '@angular/core';
import { UserModel } from '../../models/UserModel';
import { Container } from '../../models/Container';
import { OrgModel } from '../../models/OrgModel';
import { SchedulerModel } from '../../models/SchedulerModel';

export interface Models { [name: string]: any }

@Injectable()
export class SDKModels {

  private models: Models = {
    UserModel: UserModel,
    Container: Container,
    OrgModel: OrgModel,
    SchedulerModel: SchedulerModel,
    
  };

  public get(modelName: string): any {
    return this.models[modelName];
  }

  public getAll(): Models {
    return this.models;
  }

  public getModelNames(): string[] {
    return Object.keys(this.models);
  }
}
