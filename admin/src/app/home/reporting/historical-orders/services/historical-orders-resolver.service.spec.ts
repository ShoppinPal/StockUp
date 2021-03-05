import { TestBed } from '@angular/core/testing';

import { HistoricalOrdersResolverService } from './historical-orders-resolver.service';

describe('DiscrepancyResolverService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: HistoricalOrdersResolverService = TestBed.get(HistoricalOrdersResolverService);
    expect(service).toBeTruthy();
  });
});
