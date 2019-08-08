import { TestBed } from '@angular/core/testing';

import { CreateStockOrderResolverService } from './create-stock-order-resolver.service';

describe('CreateStockOrderResolverService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: CreateStockOrderResolverService = TestBed.get(CreateStockOrderResolverService);
    expect(service).toBeTruthy();
  });
});
