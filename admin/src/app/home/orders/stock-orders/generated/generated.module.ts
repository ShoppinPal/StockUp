import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeneratedComponent } from './generated.component';
import {SharedModule} from '../../../../shared/shared.module';

@NgModule({
  declarations: [GeneratedComponent],
  imports: [
    CommonModule,
    SharedModule
  ]
})
export class GeneratedModule { }
