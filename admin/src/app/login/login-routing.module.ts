import {NgModule} from '@angular/core';
import {Routes, RouterModule} from '@angular/router';
import {LoginComponent} from './login/login.component';
import {UserResolverService} from "../shared/services/user-resolver.service";

const routes: Routes = [{
  path: '',
  component: LoginComponent,
  resolve: {
    user: UserResolverService
  }
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LoginRoutingModule {
}
