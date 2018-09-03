/* tslint:disable */
import { Injectable } from '@angular/core';
import { UserModel } from '../../models/UserModel';
import { GlobalConfigModel } from '../../models/GlobalConfigModel';
import { StoreConfigModel } from '../../models/StoreConfigModel';
import { StoreModel } from '../../models/StoreModel';
import { ReportModel } from '../../models/ReportModel';
import { StockOrderLineitemModel } from '../../models/StockOrderLineitemModel';
import { SupplierModel } from '../../models/SupplierModel';
import { Container } from '../../models/Container';
import { OrgModel } from '../../models/OrgModel';

export interface Models { [name: string]: any }

@Injectable()
export class SDKModels {

  private models: Models = {
    UserModel: UserModel,
    GlobalConfigModel: GlobalConfigModel,
    StoreConfigModel: StoreConfigModel,
    StoreModel: StoreModel,
    ReportModel: ReportModel,
    StockOrderLineitemModel: StockOrderLineitemModel,
    SupplierModel: SupplierModel,
    Container: Container,
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
