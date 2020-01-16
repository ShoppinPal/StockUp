import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {Routes, RouterModule} from '@angular/router';
import {UserResolverService} from "../../shared/services/user-resolver.service";
import {AccessService} from "../../shared/services/access.service";
import {StoresComponent} from "./stores.component";
import {StoresResolverService} from "./services/stores-resolver.service";

const routes: Routes = [
  {
    path: '',
    resolve: {
      user: UserResolverService,
      access: AccessService
    },
    children: [
      {
        path: '',
        component: StoresComponent,
        data: {
          title: 'Stores'
        },
        resolve: {
          data: StoresResolverService
        }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class StoresRoutingModule { }
