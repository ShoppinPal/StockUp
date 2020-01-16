import { TestBed, inject } from '@angular/core/testing';

import { StockOrdersResolverService } from './stock-orders-resolver.service';

describe('StockOrdersResolverService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [StockOrdersResolverService]
    });
  });

  it('should be created', inject([StockOrdersResolverService], (service: StockOrdersResolverService) => {
    expect(service).toBeTruthy();
  }));
});
