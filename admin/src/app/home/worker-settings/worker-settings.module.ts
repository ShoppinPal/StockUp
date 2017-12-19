import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {LoadingModule} from 'ngx-loading';
import {WorkerSettingsComponent} from './worker-settings.component';
import {WorkerSettingsResolverService} from "./services/worker-settings-resolver.service";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    LoadingModule
  ],
  declarations: [WorkerSettingsComponent],
  providers: [WorkerSettingsResolverService]
})
export class WorkerSettingsModule {
}
