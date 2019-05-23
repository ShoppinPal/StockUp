import {NgModule} from '@angular/core';
import {Routes, RouterModule} from '@angular/router';
import {UserResolverService} from './../../shared/services/user-resolver.service';
import {AccessService} from "../../shared/services/access.service";
import {UserDetailsComponent} from "./user-details/user-details.component";
import {UserDetailsResolverService} from "./user-details/services/user-details-resolver.service";

const routes: Routes = [
  {
    path: 'users',
    resolve: {
      user: UserResolverService,
      access: AccessService
    },
    children: [
      {
        path: 'user-details/:id',
        component: UserDetailsComponent,
        data: {
          title: 'Home > Products > User Details'
        }
        ,
        resolve: {
          user: UserDetailsResolverService
        }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UsersRoutingModule {
}
