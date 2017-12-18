import { TestBed, inject } from '@angular/core/testing';

import { WorkerSettingsResolverService } from './worker-settings-resolver.service';

describe('WorkerSettingsResolverService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WorkerSettingsResolverService]
    });
  });

  it('should be created', inject([WorkerSettingsResolverService], (service: WorkerSettingsResolverService) => {
    expect(service).toBeTruthy();
  }));
});
