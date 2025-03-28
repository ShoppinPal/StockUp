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
import {ChartsModule} from 'ng2-charts';
import {PopoverModule} from 'ngx-bootstrap/popover';
import {PaginationModule} from 'ngx-bootstrap/pagination';
import {ModalModule} from 'ngx-bootstrap/modal';
import {TabsModule} from 'ngx-bootstrap/tabs';
import {TooltipModule} from 'ngx-bootstrap/tooltip';
import {AutoFocusDirective} from '../home/products/bin-locations/directives/auto-focus.directive';
import { DebounceKeyUpDirective } from './directives/debounce-key-up/debounce-key-up.directive';
import {CommentsComponent} from "../home/orders/shared-components/comments/comments.component";
import {NgSelectModule} from '@ng-select/ng-select';
import {DeleteOrderComponent} from "../home/orders/shared-components/delete-order/delete-order.component";
import {DeleteUserComponent} from "../home/users/shared-components/delete-user/delete-user.component";
import {SharedDataService} from "./services/shared-data.service";

@NgModule({
  imports: [
    AppAsideModule,
    BsDropdownModule,
    CommonModule,
    ChartsModule,
    FormsModule,
    LoadingModule,
    FileUploadModule,
    TypeaheadModule,
    CollapseModule,
    FileUploadModule,
    PaginationModule,
    PopoverModule.forRoot(),
    TabsModule,
    TooltipModule,
    ModalModule.forRoot(),
    NgSelectModule
  ],
  declarations: [AutoFocusDirective, DebounceKeyUpDirective, CommentsComponent, DeleteOrderComponent, DeleteUserComponent],
  entryComponents: [DeleteOrderComponent, DeleteUserComponent],
  exports: [
    FormsModule,
    BsDropdownModule,
    TypeaheadModule,
    ChartsModule,
    LoadingModule,
    CommentsComponent,
    DeleteOrderComponent,
    DeleteUserComponent,
    AppAsideModule,
    CollapseModule,
    CommonModule,
    FileUploadModule,
    TypeaheadModule,
    PaginationModule,
    PopoverModule,
    TabsModule,
    TooltipModule,
    NgSelectModule,
    AutoFocusDirective,
    DebounceKeyUpDirective,
    ModalModule
  ]
})

export class SharedModule {
  static forRoot(): ModuleWithProviders {
    return {
      ngModule: SharedModule,
      providers: [UserProfileService, AccessService, UserResolverService, SharedDataService]
    };
  }
}

