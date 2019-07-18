import { NgModule } from '@angular/core';
import {Routes, RouterModule} from '@angular/router';
import {UserResolverService} from "../../shared/services/user-resolver.service";
import {AccessService} from "../../shared/services/access.service";
import {FileImportsDetailsResolverService} from "./file-imports-details/services/file-imports-details-resolver.service";
import {FileImportsDetailsComponent} from "./file-imports-details/file-imports-details.component";

const routes: Routes = [
  {
    path: 'file-imports',
    resolve: {
      user: UserResolverService,
      access: AccessService
    },
    children: [
      {
        path: 'file-imports-details/:id',
        component: FileImportsDetailsComponent,
        data: {
          title: 'Home > File Imports > File Import Configuration'
        },
        resolve: {
          data: FileImportsDetailsResolverService
        }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FileImportsRoutingModule { }
