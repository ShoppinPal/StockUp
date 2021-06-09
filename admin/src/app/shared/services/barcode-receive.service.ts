import { Injectable } from '@angular/core';
import {DexieService} from './dexie.service';
import Dexie from 'dexie';
import {OrgModelApi} from '../lb-sdk';

export interface BarcodeReceive {
  sku: string;
  done: boolean;
  name?: string;
  orderId: string;
  orgModelId: string;
  id?: number;
}


@Injectable()
export class BarcodeReceiveService {
  queueConsuming = false;
  receivingTable: Dexie.Table<BarcodeReceive, number | number[]>;

  constructor(
    private dexieService: DexieService,
    private orgModelApi: OrgModelApi,
  ) {
    this.receivingTable = this.dexieService.table('receiving');
    this.consumeQueue();
  }

  async addToQueue(orgModelId: string, orderId: string, sku: string) {
    if (this.dexieService.notSupported) {
      return Promise.reject('DB not Opened / Not Supported');
    } else {
      if (this.queueConsuming === false) {
        this.consumeQueue();
      }
      return this.receivingTable.add({
        orderId: orderId,
        sku: sku,
        done: false,
        orgModelId,
      })
    }
  }

  promiseSleep(secs) {
    return new Promise((resolve) => {
      setTimeout(resolve, secs * 1000);
    })
  }

  async consumeQueue() {
    try {
      console.log('Starting consumer');
      this.queueConsuming = true;
      while (this.queueConsuming) {
        const receivableItem: BarcodeReceive = await this.receivingTable
          .filter((value) => value.done === false)
          .first()
        if (!receivableItem) {
          this.queueConsuming = false;
          break;
        }
        try {
          const searchedOrderItem = await this.orgModelApi.scanBarcodeStockOrder(
            receivableItem.orgModelId,
            'receive',
            receivableItem.sku,
            receivableItem.orderId,
            true).toPromise();
          if (searchedOrderItem.received) {
            await this.receivingTable.put({
              ...receivableItem,
              done: true
            }, receivableItem.id)
          }
        } catch (e) {
          console.error(e);
          await this.promiseSleep(5);
        }
      }
    } catch (e) {
      console.error(e);
    }
    console.log('End consumer');
    this.queueConsuming = false;
  }
}
