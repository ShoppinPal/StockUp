import {CommonModule} from '@angular/common';
import {ModuleWithProviders, NgModule} from '@angular/core';
import {UserProfileService} from './services/user-profile.service';
import {AccessService} from './services/access.service';
import {UserResolverService} from './services/user-resolver.service';
import {TypeaheadModule} from 'ngx-bootstrap';
import {AsideToggleDirective} from '../directives';

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [AsideToggleDirective],
  exports: [
    AsideToggleDirective,
    TypeaheadModule
  ]
})

export class SharedModule {
  static forRoot(): ModuleWithProviders {
    return {
      ngModule: SharedModule,
      providers: [UserProfileService, AccessService, UserResolverService]
    };
  }
}

