import {NgModule} from '@angular/core';
import {Routes, RouterModule} from '@angular/router';
import {UserResolverService} from './../../shared/services/user-resolver.service';
import {AccessService} from '../../shared/services/access.service';
import {UserDetailsComponent} from './user-details/user-details.component';
import {UserDetailsResolverService} from './user-details/services/user-details-resolver.service';
import {UsersComponent} from './users.component';
import {UserManagementResolverService} from './services/user-management-resolver.service';

const routes: Routes = [
  {
    path: '',
    resolve: {
      user: UserResolverService,
      access: AccessService
    },
    data: {
      title: 'Users'
    },
    children: [
      {
        path: '',
        component: UsersComponent,
        data: {
          title: '',
        },
        resolve: {
          users: UserManagementResolverService,
        }
      },
      {
        path: 'user-details/:id',
        component: UserDetailsComponent,
        data: {
          title: 'User Details'
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
