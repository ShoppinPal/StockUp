import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CompleteComponent } from './complete.component';
import {SharedModule} from "../../../../shared/shared.module";
import {CategoryAnchorModule} from '../../shared-components/category-anchor/category-anchor.module';

@NgModule({
  declarations: [CompleteComponent],
    imports: [
        CommonModule,
        SharedModule,
        CategoryAnchorModule
    ]
})
export class CompleteModule { }
