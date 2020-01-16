import { TestBed } from '@angular/core/testing';

import { UserDetailsResolverService } from './user-details-resolver.service';

describe('UserDetailsResolverService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: UserDetailsResolverService = TestBed.get(UserDetailsResolverService);
    expect(service).toBeTruthy();
  });
});
