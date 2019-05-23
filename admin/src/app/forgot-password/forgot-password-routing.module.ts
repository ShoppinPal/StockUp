import {NgModule} from '@angular/core';
import {Routes, RouterModule} from '@angular/router';
import {ForgotPasswordComponent} from './forgot-password.component';
import {UserResolverService} from "../shared/services/user-resolver.service";
const routes: Routes = [{
  path: '',
  component: ForgotPasswordComponent,
  resolve: {
    user: UserResolverService
  }
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})

export class ForgotPasswordRoutingModule { }
