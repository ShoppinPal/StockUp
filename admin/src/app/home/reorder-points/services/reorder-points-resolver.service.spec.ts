import { TestBed } from '@angular/core/testing';

import { ReorderPointsResolverService } from './reorder-points-resolver.service';

describe('ServicesService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ReorderPointsResolverService = TestBed.get(ReorderPointsResolverService);
    expect(service).toBeTruthy();
  });
});
