import Dexie from "dexie";

// Declare Database
class ProductDatabase extends Dexie {
  products: Dexie.Table<any, number>;

  constructor() {
    super("ProductDatabase");

    this.version(1).stores({
      products:
        "id, productModelId, productModelName, productModelSku, orderQuantity, fulfilledQuantity, receivedQuantity",
    });
  }
}

const productDB = new ProductDatabase();

export { productDB };
