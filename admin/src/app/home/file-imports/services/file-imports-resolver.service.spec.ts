import { TestBed } from '@angular/core/testing';

import { FileImportsResolverService } from './file-imports-resolver.service';

describe('FileImportsResolverService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: FileImportsResolverService = TestBed.get(FileImportsResolverService);
    expect(service).toBeTruthy();
  });
});
