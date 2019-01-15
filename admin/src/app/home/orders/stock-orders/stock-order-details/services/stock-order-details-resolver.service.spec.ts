import { TestBed, inject } from '@angular/core/testing';

import { StockOrderDetailsResolverService } from './stock-order-details-resolver.service';

describe('StockOrderDetailsResolverService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [StockOrderDetailsResolverService]
    });
  });

  it('should be created', inject([StockOrderDetailsResolverService], (service: StockOrderDetailsResolverService) => {
    expect(service).toBeTruthy();
  }));
});
