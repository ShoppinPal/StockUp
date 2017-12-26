import { TestBed, inject } from '@angular/core/testing';

import { StuckOrdersResolverService } from './stuck-orders-resolver.service';

describe('StuckOrdersResolverService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [StuckOrdersResolverService]
    });
  });

  it('should be created', inject([StuckOrdersResolverService], (service: StuckOrdersResolverService) => {
    expect(service).toBeTruthy();
  }));
});
