/* tslint:disable */
import { Injectable } from '@angular/core';
import { UserModel } from '../../models/UserModel';
import { OrgModel } from '../../models/OrgModel';

export interface Models { [name: string]: any }

@Injectable()
export class SDKModels {

  private models: Models = {
    UserModel: UserModel,
    OrgModel: OrgModel,
    
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
