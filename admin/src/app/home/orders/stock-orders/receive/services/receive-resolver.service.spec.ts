import { TestBed } from '@angular/core/testing';

import { ReceiveResolverService } from './receive-resolver.service';

describe('ReceiveResolverService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ReceiveResolverService = TestBed.get(ReceiveResolverService);
    expect(service).toBeTruthy();
  });
});
