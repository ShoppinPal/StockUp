import { TestBed, inject } from '@angular/core/testing';

import { EditSuppliersResolverService } from './edit-suppliers-resolver.service';

describe('EditSuppliersResolverService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EditSuppliersResolverService]
    });
  });

  it('should be created', inject([EditSuppliersResolverService], (service: EditSuppliersResolverService) => {
    expect(service).toBeTruthy();
  }));
});
