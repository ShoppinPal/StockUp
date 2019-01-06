import { TestBed, inject } from '@angular/core/testing';

import { CategoriesResolverService } from './categories-resolver.service';

describe('CategoriesResolverService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CategoriesResolverService]
    });
  });

  it('should be created', inject([CategoriesResolverService], (service: CategoriesResolverService) => {
    expect(service).toBeTruthy();
  }));
});
