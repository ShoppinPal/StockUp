import { TestBed } from '@angular/core/testing';

import { FulfillResolverService } from './fulfill-resolver.service';

describe('FulfillResolverService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: FulfillResolverService = TestBed.get(FulfillResolverService);
    expect(service).toBeTruthy();
  });
});
