import {CommonModule} from '@angular/common';
import {ModuleWithProviders, NgModule} from '@angular/core';
import {UserProfileService} from './services/user-profile.service';
import {AccessService} from './services/access.service';
import {UserResolverService} from './services/user-resolver.service';
import {TypeaheadModule} from 'ngx-bootstrap';
import {AsideToggleDirective} from '../directives';
import {LoadingModule} from 'ngx-loading';
import {FormsModule} from '@angular/forms';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    LoadingModule
  ],
  declarations: [AsideToggleDirective],
  exports: [
    AsideToggleDirective,
    FormsModule,
    TypeaheadModule,
    LoadingModule
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

