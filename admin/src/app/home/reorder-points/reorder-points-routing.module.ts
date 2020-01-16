import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {Routes, RouterModule} from '@angular/router';
import {UserResolverService} from "../../shared/services/user-resolver.service";
import {AccessService} from "../../shared/services/access.service";
import {ReorderPointsComponent} from "./reorder-points.component";

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
        component: ReorderPointsComponent,
        data: {
          title: 'Reorder Points'
        }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ReorderPointsRoutingModule { }
