import { TestBed } from '@angular/core/testing';

import { FileImportsDetailsResolverService } from './file-imports-details-resolver.service';

describe('FileImportsDetailsResolverService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: FileImportsDetailsResolverService = TestBed.get(FileImportsDetailsResolverService);
    expect(service).toBeTruthy();
  });
});
