import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'supplierStores'
})
export class SupplierStoresPipe implements PipeTransform {

  transform(items: any[]): any {
    if (!items) {
      return items;
    }
    return items.filter(item => !!item.ownerSupplierModelId);
  }

}
