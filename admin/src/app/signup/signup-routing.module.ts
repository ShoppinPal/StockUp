import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {SignupComponent} from "./signup.component";
import {UserResolverService} from "../shared/services/user-resolver.service";

const routes: Routes = [{
  path: '',
  component: SignupComponent,
  resolve: {
    user: UserResolverService
  }
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SignupRoutingModule { }
