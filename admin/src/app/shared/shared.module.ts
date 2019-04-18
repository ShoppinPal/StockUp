import {CommonModule} from '@angular/common';
import {ModuleWithProviders, NgModule} from '@angular/core';
import {UserProfileService} from './services/user-profile.service';
import {AccessService} from './services/access.service';
import {UserResolverService} from './services/user-resolver.service';
import {TypeaheadModule} from 'ngx-bootstrap';
import {LoadingModule} from 'ngx-loading';
import {FormsModule} from '@angular/forms';
import {AppAsideModule} from '@coreui/angular';
import {FileUploadModule} from 'ng2-file-upload';

@NgModule({
  imports: [
    AppAsideModule,
    CommonModule,
    FormsModule,
    LoadingModule,
    FileUploadModule,
    TypeaheadModule
  ],
  declarations: [],
  exports: [
    FormsModule,
    TypeaheadModule,
    LoadingModule,
    AppAsideModule,
    TypeaheadModule,
    FileUploadModule
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

