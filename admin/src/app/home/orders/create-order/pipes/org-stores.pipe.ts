import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'orgStores'
})
export class OrgStoresPipe implements PipeTransform {

  transform(items: any[]): any {
    if (!items) {
      return items;
    }
    return items.filter(item => !item.ownerSupplierModelId);
  }

}
