import { TestBed } from '@angular/core/testing';

import { CreateOrderResolverService } from './create-order-resolver.service';

describe('CreateOrderResolverService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: CreateOrderResolverService = TestBed.get(CreateOrderResolverService);
    expect(service).toBeTruthy();
  });
});
