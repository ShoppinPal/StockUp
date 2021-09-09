import Dexie from 'dexie';

// Declare Database
class ProductDatabase extends Dexie {
  products: Dexie.Table<any, number>;

  constructor() {
    super('ProductDatabase');

    this.version(1).stores({
      products:
        'id, productModelId, productModelName, productModelSku, orderQuantity, fulfilledQuantity, receivedQuantity',
    });
  }
}

class APIQueueDatabase extends Dexie {
  skus: Dexie.Table<any, number>;

  constructor() {
    super('APIQueueDatabase');

    this.version(1).stores({
      skus: '++id, sku',
    });
  }
}

const productDB = new ProductDatabase();

const skusDB = new APIQueueDatabase();

export { productDB, skusDB };
