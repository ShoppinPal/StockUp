import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {LoadingModule} from 'ngx-loading';
import {WorkerSettingsComponent} from './worker-settings.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    LoadingModule
  ],
  declarations: [WorkerSettingsComponent],
})
export class WorkerSettingsModule {
}
