import { TestBed, inject } from '@angular/core/testing';

import { SyncWithVendResolverService } from './sync-with-vend-resolver.service';

describe('SyncWithVendResolverService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SyncWithVendResolverService]
    });
  });

  it('should be created', inject([SyncWithVendResolverService], (service: SyncWithVendResolverService) => {
    expect(service).toBeTruthy();
  }));
});
