import { TestBed, inject } from '@angular/core/testing';

import { StoresResolverService } from './stores-resolver.service';

describe('StoresResolverService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [StoresResolverService]
    });
  });

  it('should be created', inject([StoresResolverService], (service: StoresResolverService) => {
    expect(service).toBeTruthy();
  }));
});
