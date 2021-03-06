import { NgModule } from '@angular/core';
import {Routes, RouterModule} from '@angular/router';
import {UserResolverService} from "../../shared/services/user-resolver.service";
import {AccessService} from "../../shared/services/access.service";
import {FileImportsDetailsResolverService} from "./file-imports-details/services/file-imports-details-resolver.service";
import {FileImportsDetailsComponent} from "./file-imports-details/file-imports-details.component";
import {FileImportsComponent} from './file-imports.component'; 
import {FileImportsResolverService} from "./services/file-imports-resolver.service";

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
        component: FileImportsComponent,
        data: {
          title: 'File Imports'
        },
        resolve: {
          data: FileImportsResolverService
        }
      },
      {
        path: 'file-imports-details/:id',
        component: FileImportsDetailsComponent,
        data: {
          title: 'File Import Configuration'
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
