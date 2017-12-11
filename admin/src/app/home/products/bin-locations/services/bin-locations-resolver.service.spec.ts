import { TestBed, inject } from '@angular/core/testing';

import { BinLocationsResolverService } from './bin-locations-resolver.service';

describe('BinLocationsResolverService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BinLocationsResolverService]
    });
  });

  it('should be created', inject([BinLocationsResolverService], (service: BinLocationsResolverService) => {
    expect(service).toBeTruthy();
  }));
});
