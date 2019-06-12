import {CommonModule} from '@angular/common';
import {ModuleWithProviders, NgModule} from '@angular/core';
import {UserProfileService} from './services/user-profile.service';
import {AccessService} from './services/access.service';
import {UserResolverService} from './services/user-resolver.service';
import {TypeaheadModule, BsDropdownModule} from 'ngx-bootstrap';
import {LoadingModule} from 'ngx-loading';
import {FormsModule} from '@angular/forms';
import {AppAsideModule} from '@coreui/angular';
import {FileUploadModule} from 'ng2-file-upload';
import {CollapseModule} from 'ngx-bootstrap/collapse';
import {PopoverModule} from 'ngx-bootstrap/popover';
import {PaginationModule} from 'ngx-bootstrap/pagination';
import {TabsModule} from 'ngx-bootstrap/tabs';

@NgModule({
  imports: [
    AppAsideModule,
    BsDropdownModule,
    CommonModule,
    FormsModule,
    LoadingModule,
    FileUploadModule,
    TypeaheadModule,
    CollapseModule,
    FileUploadModule,
    PaginationModule,
    PopoverModule.forRoot(),
    TabsModule
  ],
  declarations: [],
  exports: [
    FormsModule,
    BsDropdownModule,
    TypeaheadModule,
    LoadingModule,
    AppAsideModule,
    CollapseModule,
    CommonModule,
    FileUploadModule,
    TypeaheadModule,
    PaginationModule,
    PopoverModule,
    TabsModule
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

