import { TestBed } from '@angular/core/testing';

import { CompleteResolverService } from './complete-resolver.service';

describe('CompleteResolverService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: CompleteResolverService = TestBed.get(CompleteResolverService);
    expect(service).toBeTruthy();
  });
});
