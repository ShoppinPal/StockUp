import {NgModule} from '@angular/core';
import {Routes, RouterModule} from '@angular/router';
import {LoginComponent} from './login/login.component';

const routes: Routes = [{
  path: '',
  component: LoginComponent
  // resolve: {
  //   org: DataResolverService
  // },
  // children: [
  //   {
  //     path: '',
  //     redirectTo: 'details',
  //     pathMatch: 'full'
  //   },
  //   {
  //     path: 'details',
  //     component: ProfileDetailsComponent,
  //     resolve: {
  //       user: UserResolverService
  //     }
  //   },
  //   {
  //     path: 'edit',
  //     component: EditProfileComponent
  //   }
  // ]
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LoginRoutingModule {
}
