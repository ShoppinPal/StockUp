import { TestBed } from '@angular/core/testing';

import { GeneratedResolverService } from './generated-resolver.service';

describe('GeneratedResolverService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: GeneratedResolverService = TestBed.get(GeneratedResolverService);
    expect(service).toBeTruthy();
  });
});
