import { Injectable } from '@angular/core';
import { APIQueueDatabase } from './indexdb.service';
import { OrgModelApi } from '../lb-sdk';
import { ToastrService } from 'ngx-toastr';

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
  receivingTable: any;

  constructor(
    private dexieService: APIQueueDatabase,
    private orgModelApi: OrgModelApi,
    private toastr: ToastrService
  ) {
    this.receivingTable = this.dexieService.table('skus');
    this.consumeQueue();
  }

  async addToQueue(orgModelId: string, orderId: string, sku: string) {
    if (!this.queueConsuming) {
      this.consumeQueue();
    }
    return this.receivingTable.add({
      orderId: orderId,
      sku: sku,
      done: false,
      orgModelId,
    });
  }

  promiseSleep(secs: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, secs * 1000);
    });
  }

  async consumeQueue() {
    try {
      // console.log("Starting consumer");

      this.queueConsuming = true;

      // 1. Running until queue is empty
      while (this.queueConsuming) {
        const receivableItem: BarcodeReceive = await this.receivingTable
          .filter((value) => value.done === false)
          .first();

        if (!receivableItem) {
          this.queueConsuming = false;
          break;
        }

        try {
          await this.addScannedProductToRecieved(receivableItem);

          // After calling out the successful request => Remove item from indexDB
          this.receivingTable.delete(receivableItem.id);
        } catch (e) {
          console.error(e);
          this.toastr.error('Error Updating Row');
          this.receivingTable.delete(receivableItem.id);
          await this.promiseSleep(5);
        }
      }
    } catch (e) {
      console.error(e);
    }
    // console.log("End consumer");

    this.queueConsuming = false;
  }

  addScannedProductToRecieved = async (receivableItem: any): Promise<any> => {
    return this.orgModelApi
      .scanBarcodeStockOrder(
        receivableItem.orgModelId,
        'receive',
        receivableItem.sku,
        receivableItem.orderId,
        true
      )
  }
}
