import {NgModule} from '@angular/core';
import {Routes, RouterModule} from '@angular/router';
import {InviteUserComponent} from './invite-user.component';
import {UserResolverService} from "../shared/services/user-resolver.service";

const routes: Routes = [{
  path: '',
  component: InviteUserComponent,
  resolve: {
    user: UserResolverService
  }
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InviteUserRoutingModule {
}
