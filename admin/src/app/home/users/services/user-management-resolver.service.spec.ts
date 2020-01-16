import { TestBed, inject } from '@angular/core/testing';

import { UserManagementResolverService } from './user-management-resolver.service';

describe('UsersResolverService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UserManagementResolverService]
    });
  });

  it('should be created', inject([UserManagementResolverService], (service: UserManagementResolverService) => {
    expect(service).toBeTruthy();
  }));
});
