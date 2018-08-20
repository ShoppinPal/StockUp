import {NgModule} from '@angular/core';
import {Routes, RouterModule} from '@angular/router';
import {UserResolverService} from './shared/services/user-resolver.service';

// Import Containers
import {
  FullLayoutComponent
} from './containers';

export const routes: Routes = [
  {
    path: '',
    component: FullLayoutComponent,
    loadChildren: './home/home.module#HomeModule',
    resolve: {
      user: UserResolverService
    }
  },
  {
    path: 'login',
    loadChildren: './login/login.module#LoginModule'
  },
  {
    path: 'signup',
    loadChildren: './signup/signup.module#SignupModule'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
