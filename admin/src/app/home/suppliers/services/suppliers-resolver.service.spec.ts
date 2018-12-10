import { TestBed, inject } from '@angular/core/testing';

import { SuppliersResolverService } from './suppliers-resolver.service';

describe('SuppliersResolverService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SuppliersResolverService]
    });
  });

  it('should be created', inject([SuppliersResolverService], (service: SuppliersResolverService) => {
    expect(service).toBeTruthy();
  }));
});
