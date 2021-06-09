import Dexie from 'dexie';
import {Injectable} from '@angular/core';

@Injectable()
export class DexieService extends Dexie {
  public notSupported = false;

  constructor() {
    super('StockUp');
    this.version(1).stores({
      receiving: '++id,orderId,sku,orgModelId,name',
    });
    this.open().catch(error => {
      console.error('Error Opening DB', error);
      this.notSupported = true;
    })
  }
}
